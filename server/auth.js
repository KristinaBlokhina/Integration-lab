'use strict';
const crypto = require('node:crypto');
const { q, tx } = require('./db');

const SCOOKIE = 'il_staff', PCOOKIE = 'il_part';
const STAFF_TTL = 7 * 86400 * 1000;
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return 'scrypt$' + salt.toString('base64') + '$' + h.toString('base64');
}
function checkPassword(pw, stored) {
  const [alg, s, h] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const got = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64), want = Buffer.from(h, 'base64');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const DUMMY = hashPassword('dummy-password-for-timing');

const fail = (m, status = 400) => { const e = new Error(m); e.status = status; throw e; };
function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) fail('password must be at least 10 characters');
  if (pw.length > 200) fail('password too long');
}
function validateUsername(u) {
  if (typeof u !== 'string' || !/^[A-Za-z0-9._@-]{3,60}$/.test(u)) fail('username: 3-60 chars, letters, digits, . _ - @');
}
const publicUser = u => ({ id: u.id, username: u.username, name: u.name, role: u.role, disabled: !!u.disabled, last_login: u.last_login, created_at: u.created_at });

let setupCode = null;
const needsSetup = () => q.get('SELECT COUNT(*) n FROM users').n === 0;

/* Перший адміністратор: або з ADMIN_USERNAME/ADMIN_PASSWORD, або через /setup із одноразовим кодом з консолі. */
function bootstrap() {
  if (!needsSetup()) return;
  const u = process.env.ADMIN_USERNAME, p = process.env.ADMIN_PASSWORD;
  if (u && p) {
    validateUsername(u); validatePassword(p);
    q.run('INSERT INTO users(username,name,role,pass,created_at) VALUES(?,?,?,?,?)', u, u, 'admin', hashPassword(p), Date.now());
    console.log('Створено адміністратора з ADMIN_USERNAME/ADMIN_PASSWORD. Приберіть пароль зі змінних середовища.');
    return;
  }
  setupCode = crypto.randomBytes(5).toString('hex');
  console.log('\n=== ПЕРШИЙ ЗАПУСК ===\nВідкрийте сайт, перейдіть до «Вхід для фасилітатора» і створіть адміністратора.\nОдноразовий код налаштування: ' + setupCode + '\n=====================\n');
}
function setupAdmin(b) {
  if (!needsSetup()) fail('already configured', 409);
  const code = String(b.code || '');
  if (!setupCode || code.length !== setupCode.length || !crypto.timingSafeEqual(Buffer.from(code), Buffer.from(setupCode))) fail('invalid setup code', 403);
  validateUsername(b.username); validatePassword(b.password);
  const name = String(b.name || b.username).trim().slice(0, 80);
  const r = q.run('INSERT INTO users(username,name,role,pass,created_at,last_login) VALUES(?,?,?,?,?,?)', b.username, name, 'admin', hashPassword(b.password), Date.now(), Date.now());
  setupCode = null;
  return publicUser(q.get('SELECT * FROM users WHERE id=?', r.lastInsertRowid));
}

function verifyLogin(username, password) {
  const u = q.get('SELECT * FROM users WHERE username=?', String(username));
  const ok = checkPassword(String(password), u ? u.pass : DUMMY);
  if (!u || !ok || u.disabled) return null;
  q.run('UPDATE users SET last_login=? WHERE id=?', Date.now(), u.id);
  return u;
}
function createStaffSession(userId) {
  const token = newToken();
  q.run('DELETE FROM staff_sessions WHERE expires < ?', Date.now());
  q.run('INSERT INTO staff_sessions(token,user_id,expires) VALUES(?,?,?)', sha(token), userId, Date.now() + STAFF_TTL);
  return token;
}
function destroyStaffSession(token) { q.run('DELETE FROM staff_sessions WHERE token=?', sha(token)); }
function staffFromToken(token) {
  if (!token) return null;
  const r = q.get('SELECT u.*, s.expires FROM staff_sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?', sha(token));
  if (!r || r.expires < Date.now() || r.disabled) return null;
  return r;
}
function createParticipant(nick, lang) {
  const id = 'p_' + crypto.randomBytes(6).toString('hex'), token = newToken(), now = Date.now();
  q.run('INSERT INTO participants(id,nick,token,lang,created_at,last_seen) VALUES(?,?,?,?,?,?)', id, nick, sha(token), lang, now, now);
  return { id, token };
}
function participantFromToken(token) {
  if (!token) return null;
  const p = q.get('SELECT id,nick,lang,last_seen FROM participants WHERE token=?', sha(token));
  if (p && Date.now() - p.last_seen > 60000) q.run('UPDATE participants SET last_seen=? WHERE id=?', Date.now(), p.id);
  return p || null;
}
function parseCookies(h) {
  const o = {}; String(h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return o;
}

/* керування користувачами */
const listUsers = () => q.all('SELECT * FROM users ORDER BY created_at').map(publicUser);
function createUser(b) {
  validateUsername(b.username); validatePassword(b.password);
  const role = b.role === 'admin' ? 'admin' : 'facilitator';
  if (q.get('SELECT 1 x FROM users WHERE username=?', b.username)) fail('username already exists', 409);
  const r = q.run('INSERT INTO users(username,name,role,pass,created_at) VALUES(?,?,?,?,?)', b.username, String(b.name || b.username).trim().slice(0, 80), role, hashPassword(b.password), Date.now());
  return publicUser(q.get('SELECT * FROM users WHERE id=?', r.lastInsertRowid));
}
function activeAdmins(exceptId) { return q.get("SELECT COUNT(*) n FROM users WHERE role='admin' AND disabled=0 AND id<>?", exceptId || 0).n; }
function updateUser(id, b, selfId) {
  const u = q.get('SELECT * FROM users WHERE id=?', id); if (!u) fail('not found', 404);
  const role = b.role ? (b.role === 'admin' ? 'admin' : 'facilitator') : u.role;
  const disabled = b.disabled != null ? (b.disabled ? 1 : 0) : u.disabled;
  if ((role !== 'admin' || disabled) && u.role === 'admin' && !u.disabled && activeAdmins(u.id) === 0) fail('cannot remove the last active admin', 409);
  if (id === selfId && disabled) fail('cannot disable yourself', 409);
  let pass = u.pass;
  if (b.password) { validatePassword(b.password); pass = hashPassword(b.password); }
  tx(() => {
    q.run('UPDATE users SET name=?, role=?, disabled=?, pass=? WHERE id=?', b.name != null ? String(b.name).trim().slice(0, 80) : u.name, role, disabled, pass, id);
    if (b.password || disabled || role !== u.role) q.run('DELETE FROM staff_sessions WHERE user_id=?', id);
  });
  return publicUser(q.get('SELECT * FROM users WHERE id=?', id));
}
function deleteUser(id, selfId) {
  const u = q.get('SELECT * FROM users WHERE id=?', id); if (!u) fail('not found', 404);
  if (id === selfId) fail('cannot delete yourself', 409);
  if (u.role === 'admin' && !u.disabled && activeAdmins(u.id) === 0) fail('cannot remove the last active admin', 409);
  q.run('DELETE FROM users WHERE id=?', id);
}
function changeOwnPassword(id, oldPw, newPw, keepToken) {
  const u = q.get('SELECT * FROM users WHERE id=?', id);
  if (!checkPassword(String(oldPw || ''), u.pass)) fail('wrong current password', 403);
  validatePassword(newPw);
  tx(() => { q.run('UPDATE users SET pass=? WHERE id=?', hashPassword(newPw), id); q.run('DELETE FROM staff_sessions WHERE user_id=? AND token<>?', id, sha(keepToken)); });
}

module.exports = { SCOOKIE, PCOOKIE, STAFF_TTL, needsSetup, bootstrap, setupAdmin, verifyLogin, createStaffSession, destroyStaffSession, staffFromToken, createParticipant, participantFromToken, parseCookies, listUsers, createUser, updateUser, deleteUser, changeOwnPassword, hashPassword, validatePassword };
