'use strict';
/* Integration Lab: сервер без зовнішніх залежностей (потрібен Node.js 22.13+).
   Ролі: admin (керує фасилітаторами), facilitator (проводить захід, редагує контент),
   participant (приєднується за імʼям, без пароля). Усі права перевіряються тут, на сервері. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { q, tx, kvGet, kvSet, audit, ensureSeed, defaultSess } = require('./db');
const auth = require('./auth');

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = path.join(__dirname, '..', 'public');
const MAX_BODY = 200 * 1024;
const STAGES = ['welcome', 'debate1', 'stations', 'debate2', 'finale'];
const THEME_IDS = ['t1', 't2', 't3', 't4', 't5', 't6'];
const LANGS = ['uk', 'ro', 'en'];
const KINDS = ['guide', 'contact', 'about', 'vol', 'event', 'article'];
const CATS = ['status', 'work', 'study', 'language', 'health', 'family', 'money', 'safety', 'return', 'other'];
const PUBLIC_ENTRY_KINDS = ['icebreaker', 'problem', 'solution'];

class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
const bad = (m, extra) => new HttpError(400, m, extra);
const wc = s => (String(s || '').trim().match(/\S+/g) || []).length;
const rid = () => crypto.randomBytes(5).toString('hex');
const str = (v, max, name) => { if (v == null) return ''; if (typeof v !== 'string') throw bad('invalid ' + name); const s = v.trim(); if (s.length > max) throw bad(name + ' too long'); return s; };

/* ---------- ліміти запитів (у памʼяті; достатньо для одного інстансу) ---------- */
const buckets = new Map();
function hit(key, limit, windowMs) {
  const now = Date.now(); let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++; return b.n <= limit;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 60000).unref();
const limit = (key, n, ms) => { if (!hit(key, n, ms)) throw new HttpError(429, 'too many requests'); };

/* ---------- ревізії та SSE ---------- */
const rev = { a: Date.now(), c: Date.now(), s: Date.now() };
const clients = new Set();
let bumpTimer = null;
function bump(...ks) {
  ks.forEach(k => { rev[k] = Math.max(rev[k] + 1, Date.now()); });
  if (bumpTimer) return;
  bumpTimer = setTimeout(() => {
    bumpTimer = null;
    const msg = 'data: ' + JSON.stringify(rev) + '\n\n';
    for (const r of clients) { try { r.write(msg); } catch (_) { clients.delete(r); } }
  }, 150);
}
setInterval(() => { for (const r of clients) { try { r.write(': ka\n\n'); } catch (_) { clients.delete(r); } } }, 25000).unref();

/* ---------- допоміжне: сесія заходу й активність ---------- */
const getSess = () => Object.assign(defaultSess('s1'), kvGet('sess', {}));
const setSess = s => kvSet('sess', s);

function loadActivity(sid) {
  const nicks = {};
  q.all('SELECT id,nick FROM participants').forEach(p => { nicks[p.id] = p.nick; });
  const A = [], E = [], V = [];
  q.all('SELECT uid,kind,key,data,ts FROM activity WHERE sid=? ORDER BY ts', sid).forEach(r => {
    const d = JSON.parse(r.data), base = { uid: r.uid, nick: nicks[r.uid] || '', key: r.key, ts: r.ts };
    if (r.kind === 'answer') A.push(Object.assign(d, base));
    else if (r.kind === 'entry') E.push(Object.assign(d, base, { id: r.uid + '~' + r.key }));
    else V.push({ uid: r.uid, entryId: r.key, ts: r.ts });
  });
  return { answers: A, entries: E, votes: V };
}

function participantSnapshot(p) {
  const sess = getSess(), act = loadActivity(sess.sid), round = sess.stage === 'debate2' ? 2 : 1;
  const counts = {};
  act.answers.forEach(a => { const k = a.round + '_' + a.debateId; (counts[k] = counts[k] || { A: 0, B: 0 })[a.choice]++; });
  const answers = act.answers.filter(a => a.uid === p.id || (sess.revealed && a.debateId === sess.debateId && a.round === round));
  const entries = act.entries.filter(e => PUBLIC_ENTRY_KINDS.includes(e.kind) || e.uid === p.id);
  const voteCounts = {};
  act.votes.forEach(v => { voteCounts[v.entryId] = (voteCounts[v.entryId] || 0) + 1; });
  return { rev: rev.a, sess, me: { id: p.id, nick: p.nick }, answers, entries, counts, voteCounts, myVotes: act.votes.filter(v => v.uid === p.id).map(v => v.entryId) };
}

function staffSnapshot(sid) {
  const sess = getSess(); sid = sid || sess.sid;
  const act = loadActivity(sid);
  const total = q.get('SELECT COUNT(*) n FROM participants').n;
  const voteCounts = {}; act.votes.forEach(v => { voteCounts[v.entryId] = (voteCounts[v.entryId] || 0) + 1; });
  return { rev: rev.a, sess, sid, answers: act.answers, entries: act.entries, votes: act.votes, voteCounts, joined: total };
}

/* ---------- контент ---------- */
function itemOut(r) { const d = JSON.parse(r.data); return Object.assign(d, { id: r.id, kind: r.kind, order: r.ord, version: r.version, updated_at: r.updated_at, updated_by: r.updated_by }); }
const listContent = () => q.all('SELECT * FROM content WHERE deleted=0 ORDER BY kind, ord, id').map(itemOut);
function cleanLoc(v, max, name) {
  const o = {}; if (v == null) return o;
  if (typeof v !== 'object' || Array.isArray(v)) throw bad('invalid ' + name);
  LANGS.forEach(l => { if (v[l] != null) o[l] = str(v[l], max, name + '.' + l); });
  return o;
}
function cleanLinks(v) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > 12) throw bad('invalid links');
  return v.map(l => {
    const url = str(l && l.url, 500, 'url'); if (!/^https?:\/\/[^\s<>"']+$/i.test(url)) throw bad('invalid url');
    return { label: str(l.label, 100, 'label') || url, url };
  });
}
function cleanItem(b, kind) {
  const d = { title: cleanLoc(b.title, 200, 'title'), body: cleanLoc(b.body, 9000, 'body') };
  if (!LANGS.some(l => d.title[l])) throw bad('title required');
  if (kind === 'event' || kind === 'article') { d.date = cleanLoc(b.date, 80, 'date'); }
  if (kind === 'event') { d.place = cleanLoc(b.place, 160, 'place'); }
  if (kind === 'guide') { d.cat = CATS.includes(b.cat) ? b.cat : 'other'; }
  if (kind === 'contact') { d.phone = str(b.phone, 40, 'phone'); if (d.phone && !/^[+\d\s().-]+$/.test(d.phone)) throw bad('invalid phone'); }
  d.links = cleanLinks(b.links);
  if (b.checked != null) { const c = str(b.checked, 10, 'checked'); if (c && !/^\d{4}-\d{2}-\d{2}$/.test(c)) throw bad('invalid date'); d.checked = c; }
  return d;
}
function nextOrder(kind) {
  const r = q.get('SELECT MIN(ord) lo, MAX(ord) hi FROM content WHERE kind=?', kind);
  if (r.lo == null) return 10;
  return (kind === 'event' || kind === 'article') ? r.lo - 10 : r.hi + 10;
}

/* ---------- обробники ---------- */
const routes = [];
const R = (method, pattern, role, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), role, fn });

/* публічні */
R('GET', '/api/me', 'public', ctx => ({
  staff: ctx.staff ? { id: ctx.staff.id, username: ctx.staff.username, name: ctx.staff.name, role: ctx.staff.role } : null,
  participant: ctx.part ? { id: ctx.part.id, nick: ctx.part.nick } : null,
  needsSetup: auth.needsSetup()
}));
R('GET', '/api/health', 'public', () => ({ ok: true }));
R('GET', '/api/content', 'public', () => ({ rev: rev.c, items: listContent() }));
R('GET', '/api/session', 'public', () => ({ rev: rev.s, sess: getSess() }));

R('POST', '/api/join', 'public', ctx => {
  limit('join:' + ctx.ip, 40, 3600000);
  const nick = str(ctx.body.nick, 40, 'nick'), lang = LANGS.includes(ctx.body.lang) ? ctx.body.lang : 'uk';
  if (ctx.part) { q.run('UPDATE participants SET nick=?, lang=? WHERE id=?', nick, lang, ctx.part.id); bump('a'); return { participant: { id: ctx.part.id, nick } }; }
  const { id, token } = auth.createParticipant(nick, lang);
  ctx.setCookie(auth.PCOOKIE, token, 60 * 86400);
  bump('a');
  return { participant: { id, nick } };
});
R('POST', '/api/leave', 'public', ctx => { ctx.clearCookie(auth.PCOOKIE); return { ok: true }; });

R('POST', '/api/staff/login', 'public', ctx => {
  const username = str(ctx.body.username, 60, 'username'), password = typeof ctx.body.password === 'string' ? ctx.body.password : '';
  limit('login:ip:' + ctx.ip, 20, 900000); limit('login:u:' + username.toLowerCase(), 8, 900000);
  const u = auth.verifyLogin(username, password);
  if (!u) throw new HttpError(401, 'invalid credentials');
  const token = auth.createStaffSession(u.id);
  ctx.setCookie(auth.SCOOKIE, token, auth.STAFF_TTL / 1000);
  audit(u.username, 'login', ctx.ip);
  return { staff: { id: u.id, username: u.username, name: u.name, role: u.role } };
});
R('POST', '/api/staff/logout', 'public', ctx => { if (ctx.staffToken) auth.destroyStaffSession(ctx.staffToken); ctx.clearCookie(auth.SCOOKIE); return { ok: true }; });
R('POST', '/api/setup', 'public', ctx => {
  limit('setup:' + ctx.ip, 10, 900000);
  const u = auth.setupAdmin(ctx.body);
  const token = auth.createStaffSession(u.id);
  ctx.setCookie(auth.SCOOKIE, token, auth.STAFF_TTL / 1000);
  audit(u.username, 'setup', 'first admin');
  return { staff: { id: u.id, username: u.username, name: u.name, role: u.role } };
});

R('GET', '/api/stream', 'public', ctx => {
  const res = ctx.res;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 3000\ndata: ' + JSON.stringify(rev) + '\n\n');
  clients.add(res); ctx.req.on('close', () => clients.delete(res));
  return undefined; /* відповідь залишається відкритою */
});

/* учасник (або фасилітатор, що приєднався як учасник) */
R('GET', '/api/state', 'public', ctx => {
  if (ctx.query.full === '1') { if (!ctx.staff) throw new HttpError(403, 'staff only'); return staffSnapshot(ctx.query.sid); }
  if (!ctx.part) return { rev: rev.a, sess: getSess(), me: null };
  return participantSnapshot(ctx.part);
});
R('POST', '/api/answer', 'participant', ctx => {
  limit('w:' + ctx.part.id, 90, 60000);
  const sess = getSess(), b = ctx.body, round = sess.stage === 'debate1' ? 1 : sess.stage === 'debate2' ? 2 : 0;
  if (!round) throw new HttpError(409, 'debate is not open');
  if (sess.revealed) throw new HttpError(409, 'reasons are already revealed');
  if (b.round !== round || b.debateId !== sess.debateId) throw new HttpError(409, 'wrong question');
  if (b.choice !== 'A' && b.choice !== 'B') throw bad('invalid choice');
  const reason = str(b.reason, 1500, 'reason');
  if (wc(reason) < sess.minWords) throw bad('reason too short');
  const data = { round, debateId: sess.debateId, choice: b.choice, reason, words: wc(reason), lang: LANGS.includes(b.lang) ? b.lang : 'uk' };
  q.run('INSERT INTO activity(sid,uid,kind,key,data,ts) VALUES(?,?,?,?,?,?) ON CONFLICT(sid,uid,kind,key) DO UPDATE SET data=excluded.data, ts=excluded.ts', sess.sid, ctx.part.id, 'answer', round + '_' + sess.debateId, JSON.stringify(data), Date.now());
  bump('a'); return { ok: true };
});
R('POST', '/api/entry', 'participant', ctx => {
  limit('w:' + ctx.part.id, 90, 60000);
  const sess = getSess(), b = ctx.body, kind = b.kind, lang = LANGS.includes(b.lang) ? b.lang : 'uk';
  const count = q.get("SELECT COUNT(*) n FROM activity WHERE sid=? AND uid=? AND kind='entry'", sess.sid, ctx.part.id).n;
  if (count >= 80) throw new HttpError(429, 'entry limit reached');
  let data, key = rid();
  if (kind === 'icebreaker') {
    if (sess.stage !== 'welcome') throw new HttpError(409, 'not open');
    const text = str(b.text, 500, 'text'); if (wc(text) < 3) throw bad('too short');
    data = { kind, text, lang };
  } else if (kind === 'problem' || kind === 'solution') {
    if (sess.stage !== 'stations') throw new HttpError(409, 'stations are closed');
    if (!THEME_IDS.includes(b.theme) || !sess.open.includes(b.theme)) throw new HttpError(409, 'theme is closed');
    if (kind === 'problem') {
      const text = str(b.text, 500, 'text'); if (wc(text) < 5) throw bad('too short');
      data = { kind, theme: b.theme, text, lang };
    } else {
      const text = str(b.text, 800, 'text'); if (wc(text) < sess.solWords) throw bad('too short');
      const cardId = str(b.cardId, 80, 'cardId');
      if (cardId.includes('~')) {
        const [u, k] = cardId.split('~'); const e = q.get("SELECT data FROM activity WHERE sid=? AND uid=? AND kind='entry' AND key=?", sess.sid, u, k);
        if (!e || JSON.parse(e.data).kind !== 'problem') throw bad('unknown problem');
      } else if (!/^t[1-6]c[1-2]$/.test(cardId)) throw bad('unknown problem');
      data = { kind, theme: b.theme, cardId, text, help: str(b.help, 120, 'help'), lang };
    }
  } else if (kind === 'feedback') {
    if (sess.stage !== 'finale') throw new HttpError(409, 'not open');
    const rating = +b.rating; if (!(rating >= 1 && rating <= 5)) throw bad('invalid rating');
    key = 'feedback';
    if (q.get("SELECT 1 x FROM activity WHERE sid=? AND uid=? AND kind='entry' AND key='feedback'", sess.sid, ctx.part.id)) throw new HttpError(409, 'already sent');
    data = { kind, rating, text: str(b.text, 500, 'text'), lang };
  } else throw bad('unknown kind');
  q.run('INSERT INTO activity(sid,uid,kind,key,data,ts) VALUES(?,?,?,?,?,?)', sess.sid, ctx.part.id, 'entry', key, JSON.stringify(data), Date.now());
  bump('a'); return { ok: true, id: ctx.part.id + '~' + key };
});
R('POST', '/api/vote', 'participant', ctx => {
  limit('w:' + ctx.part.id, 90, 60000);
  const sess = getSess(); if (sess.stage !== 'finale') throw new HttpError(409, 'voting is closed');
  const entryId = str(ctx.body.entryId, 80, 'entryId'), [u, k] = entryId.split('~');
  const e = u && k && q.get("SELECT data FROM activity WHERE sid=? AND uid=? AND kind='entry' AND key=?", sess.sid, u, k);
  if (!e || JSON.parse(e.data).kind !== 'solution') throw bad('unknown solution');
  const has = q.get("SELECT 1 x FROM activity WHERE sid=? AND uid=? AND kind='vote' AND key=?", sess.sid, ctx.part.id, entryId);
  if (has) q.run("DELETE FROM activity WHERE sid=? AND uid=? AND kind='vote' AND key=?", sess.sid, ctx.part.id, entryId);
  else {
    const n = q.get("SELECT COUNT(*) n FROM activity WHERE sid=? AND uid=? AND kind='vote'", sess.sid, ctx.part.id).n;
    if (n >= 3) throw new HttpError(409, 'no votes left');
    q.run("INSERT INTO activity(sid,uid,kind,key,data,ts) VALUES(?,?,'vote',?,'{}',?)", sess.sid, ctx.part.id, entryId, Date.now());
  }
  bump('a'); return { ok: true };
});

/* пропозиції змін до сторінок з інформацією (учасник пропонує, фасилітатор схвалює) */
R('POST', '/api/suggestions', 'participant', ctx => {
  limit('sug:' + ctx.part.id, 10, 3600000);
  const b = ctx.body, kind = b.kind;
  if (!KINDS.includes(kind)) throw bad('invalid kind');
  const lang = LANGS.includes(b.lang) ? b.lang : 'uk';
  if (q.get("SELECT COUNT(*) n FROM suggestions WHERE participant_id=? AND status='pending'", ctx.part.id).n >= 5) throw new HttpError(429, 'too many pending suggestions');
  let itemId = b.itemId ? str(b.itemId, 60, 'itemId') : null;
  if (itemId && !q.get('SELECT 1 x FROM content WHERE id=? AND deleted=0', itemId)) throw bad('unknown item');
  const d = { title: str(b.title, 200, 'title'), body: str(b.body, 9000, 'body'), links: cleanLinks(b.links) };
  if (!d.title && !d.body && !d.links.length) throw bad('empty suggestion');
  if (!itemId && !d.title) throw bad('title required');
  if (b.cat && CATS.includes(b.cat)) d.cat = b.cat;
  if (b.phone) d.phone = str(b.phone, 40, 'phone');
  if (b.date) d.date = str(b.date, 80, 'date');
  if (b.place) d.place = str(b.place, 160, 'place');
  const id = 'sg_' + rid();
  q.run('INSERT INTO suggestions(id,item_id,kind,lang,data,note,participant_id,nick,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)', id, itemId, kind, lang, JSON.stringify(d), str(b.note, 500, 'note'), ctx.part.id, ctx.part.nick, 'pending', Date.now());
  bump('c'); return { ok: true, id };
});
R('GET', '/api/suggestions/mine', 'participant', ctx => ({
  items: q.all('SELECT id,item_id,kind,lang,data,note,status,reason,created_at FROM suggestions WHERE participant_id=? ORDER BY created_at DESC LIMIT 50', ctx.part.id).map(r => Object.assign({}, r, { data: JSON.parse(r.data) }))
}));

/* ---------- фасилітатор ---------- */
R('PUT', '/api/staff/session', 'staff', ctx => {
  const b = ctx.body, s = getSess();
  if (b.stage != null) { if (!STAGES.includes(b.stage)) throw bad('invalid stage'); s.stage = b.stage; }
  if (b.debateId != null) { const id = str(b.debateId, 40, 'debateId'); if (!/^[\w-]+$/.test(id)) throw bad('invalid debateId'); s.debateId = id; }
  if (b.revealed != null) s.revealed = !!b.revealed;
  if (b.minWords != null) s.minWords = Math.max(1, Math.min(60, +b.minWords || 10));
  if (b.solWords != null) s.solWords = Math.max(1, Math.min(60, +b.solWords || 8));
  if (b.open != null) { if (!Array.isArray(b.open)) throw bad('invalid open'); s.open = b.open.filter(x => THEME_IDS.includes(x)); }
  if (b.custom != null) {
    if (!Array.isArray(b.custom) || b.custom.length > 30) throw bad('invalid custom');
    s.custom = b.custom.map(c => ({ id: str(c.id, 40, 'id'), q: cleanLoc(c.q, 200, 'q'), a: cleanLoc(c.a, 60, 'a'), b: cleanLoc(c.b, 60, 'b') }));
  }
  setSess(s); bump('a', 's'); audit(ctx.staff.username, 'session', JSON.stringify(Object.keys(b)));
  return { sess: s };
});
R('POST', '/api/staff/session/new', 'staff', ctx => {
  const sid = 's' + rid(), label = str(ctx.body.label, 80, 'label');
  tx(() => { q.run('INSERT INTO sessions(sid,label,created_at) VALUES(?,?,?)', sid, label, Date.now()); const s = getSess(); setSess(Object.assign(defaultSess(sid), { custom: s.custom, minWords: s.minWords, solWords: s.solWords })); });
  bump('a', 's'); audit(ctx.staff.username, 'new-session', sid); return { sid };
});
R('GET', '/api/staff/sessions', 'staff', () => ({
  items: q.all("SELECT s.sid, s.label, s.created_at, (SELECT COUNT(DISTINCT uid) FROM activity a WHERE a.sid=s.sid) AS people, (SELECT COUNT(*) FROM activity a WHERE a.sid=s.sid) AS items FROM sessions s ORDER BY s.created_at DESC")
}));
R('DELETE', '/api/staff/activity', 'staff', ctx => {
  const b = ctx.body, kind = b.kind === 'answers' ? 'answer' : b.kind === 'entries' ? 'entry' : null;
  if (!kind) throw bad('invalid kind');
  const sid = str(b.sid, 40, 'sid') || getSess().sid, uid = str(b.uid, 60, 'uid'), key = str(b.key, 80, 'key');
  tx(() => {
    q.run('DELETE FROM activity WHERE sid=? AND uid=? AND kind=? AND key=?', sid, uid, kind, key);
    if (kind === 'entry') q.run("DELETE FROM activity WHERE sid=? AND kind='vote' AND key=?", sid, uid + '~' + key);
  });
  bump('a'); audit(ctx.staff.username, 'moderate-delete', kind + ' ' + uid + '/' + key); return { ok: true };
});
R('GET', '/api/staff/participants', 'staff', () => ({ items: q.all('SELECT id,nick,lang,created_at,last_seen FROM participants ORDER BY last_seen DESC LIMIT 500') }));

/* контент */
R('POST', '/api/staff/content', 'staff', ctx => {
  const kind = ctx.body.kind; if (!KINDS.includes(kind)) throw bad('invalid kind');
  const d = cleanItem(ctx.body, kind); if (!d.checked) d.checked = new Date().toISOString().slice(0, 10);
  const id = kind[0] + '_' + rid();
  q.run('INSERT INTO content(id,kind,ord,data,version,deleted,updated_at,updated_by) VALUES(?,?,?,?,1,0,?,?)', id, kind, nextOrder(kind), JSON.stringify(d), Date.now(), ctx.staff.username);
  bump('c'); audit(ctx.staff.username, 'content-create', id); return { id };
});
R('PUT', '/api/staff/content/:id', 'staff', ctx => {
  const row = q.get('SELECT * FROM content WHERE id=? AND deleted=0', ctx.params.id); if (!row) throw new HttpError(404, 'not found');
  if (+ctx.body.baseVersion !== row.version) throw new HttpError(409, 'version conflict', { current: itemOut(row) });
  const d = cleanItem(ctx.body, row.kind);
  if (ctx.body.verified) d.checked = new Date().toISOString().slice(0, 10);
  else if (!d.checked) d.checked = JSON.parse(row.data).checked || '';
  const r = q.run('UPDATE content SET data=?, version=version+1, updated_at=?, updated_by=? WHERE id=? AND version=?', JSON.stringify(d), Date.now(), ctx.staff.username, row.id, row.version);
  if (!r.changes) throw new HttpError(409, 'version conflict');
  bump('c'); audit(ctx.staff.username, 'content-update', row.id); return { ok: true, version: row.version + 1 };
});
R('DELETE', '/api/staff/content/:id', 'staff', ctx => {
  const r = q.run('UPDATE content SET deleted=1, version=version+1, updated_at=?, updated_by=? WHERE id=? AND deleted=0', Date.now(), ctx.staff.username, ctx.params.id);
  if (!r.changes) throw new HttpError(404, 'not found');
  bump('c'); audit(ctx.staff.username, 'content-delete', ctx.params.id); return { ok: true };
});
R('POST', '/api/staff/content/:id/swap', 'staff', ctx => {
  const a = q.get('SELECT id,ord,kind FROM content WHERE id=? AND deleted=0', ctx.params.id), b = q.get('SELECT id,ord,kind FROM content WHERE id=? AND deleted=0', str(ctx.body.with, 60, 'with'));
  if (!a || !b || a.kind !== b.kind) throw bad('cannot swap');
  let oa = a.ord, ob = b.ord; if (oa === ob) ob = oa + 0.5;
  tx(() => { q.run('UPDATE content SET ord=?, version=version+1 WHERE id=?', ob, a.id); q.run('UPDATE content SET ord=?, version=version+1 WHERE id=?', oa, b.id); });
  bump('c'); return { ok: true };
});

/* черга пропозицій */
const sugOut = r => Object.assign({}, r, { data: JSON.parse(r.data) });
R('GET', '/api/staff/suggestions', 'staff', ctx => {
  const st = ['pending', 'approved', 'rejected'].includes(ctx.query.status) ? ctx.query.status : 'pending';
  return { items: q.all('SELECT * FROM suggestions WHERE status=? ORDER BY created_at DESC LIMIT 200', st).map(sugOut), pending: q.get("SELECT COUNT(*) n FROM suggestions WHERE status='pending'").n };
});
R('POST', '/api/staff/suggestions/:id/approve', 'staff', ctx => {
  const s = q.get("SELECT * FROM suggestions WHERE id=? AND status='pending'", ctx.params.id); if (!s) throw new HttpError(404, 'not found');
  const d = JSON.parse(s.data), now = Date.now(), today = new Date().toISOString().slice(0, 10);
  tx(() => {
    if (s.item_id) {
      const row = q.get('SELECT * FROM content WHERE id=? AND deleted=0', s.item_id); if (!row) throw bad('item was removed');
      const cur = JSON.parse(row.data), set = (f, v) => { if (v) cur[f] = Object.assign({}, cur[f] || {}, { [s.lang]: v }); };
      set('title', d.title); set('body', d.body); set('date', d.date); set('place', d.place);
      if (d.links && d.links.length) cur.links = (cur.links || []).concat(d.links.filter(n => !(cur.links || []).some(o => o.url === n.url))).slice(0, 12);
      if (d.phone) cur.phone = d.phone;
      cur.checked = today;
      q.run('UPDATE content SET data=?, version=version+1, updated_at=?, updated_by=? WHERE id=?', JSON.stringify(cur), now, ctx.staff.username + ' (від ' + (s.nick || 'учасника') + ')', row.id);
    } else {
      const item = { title: { [s.lang]: d.title }, body: d.body ? { [s.lang]: d.body } : {}, links: d.links || [], checked: today };
      if (s.kind === 'guide') item.cat = d.cat || 'other';
      if (s.kind === 'contact') item.phone = d.phone || '';
      if (d.date) item.date = { [s.lang]: d.date };
      if (d.place) item.place = { [s.lang]: d.place };
      q.run('INSERT INTO content(id,kind,ord,data,version,deleted,updated_at,updated_by) VALUES(?,?,?,?,1,0,?,?)', s.kind[0] + '_' + rid(), s.kind, nextOrder(s.kind), JSON.stringify(item), now, ctx.staff.username + ' (від ' + (s.nick || 'учасника') + ')');
    }
    q.run("UPDATE suggestions SET status='approved', decided_by=?, decided_at=? WHERE id=?", ctx.staff.username, now, s.id);
  });
  bump('c'); audit(ctx.staff.username, 'suggestion-approve', s.id); return { ok: true };
});
R('POST', '/api/staff/suggestions/:id/reject', 'staff', ctx => {
  const r = q.run("UPDATE suggestions SET status='rejected', reason=?, decided_by=?, decided_at=? WHERE id=? AND status='pending'", str(ctx.body.reason, 300, 'reason'), ctx.staff.username, Date.now(), ctx.params.id);
  if (!r.changes) throw new HttpError(404, 'not found');
  bump('c'); audit(ctx.staff.username, 'suggestion-reject', ctx.params.id); return { ok: true };
});

R('POST', '/api/staff/password', 'staff', ctx => {
  limit('pw:' + ctx.staff.id, 10, 900000);
  auth.changeOwnPassword(ctx.staff.id, ctx.body.oldPassword, ctx.body.newPassword, ctx.staffToken);
  audit(ctx.staff.username, 'password-change', ''); return { ok: true };
});

/* ---------- адміністратор ---------- */
R('GET', '/api/admin/users', 'admin', () => ({ items: auth.listUsers() }));
R('POST', '/api/admin/users', 'admin', ctx => { const u = auth.createUser(ctx.body); audit(ctx.staff.username, 'user-create', u.username); return { user: u }; });
R('PATCH', '/api/admin/users/:id', 'admin', ctx => { const u = auth.updateUser(+ctx.params.id, ctx.body, ctx.staff.id); audit(ctx.staff.username, 'user-update', u.username); return { user: u }; });
R('DELETE', '/api/admin/users/:id', 'admin', ctx => { auth.deleteUser(+ctx.params.id, ctx.staff.id); audit(ctx.staff.username, 'user-delete', ctx.params.id); return { ok: true }; });
R('GET', '/api/admin/audit', 'admin', () => ({ items: q.all('SELECT ts,actor,action,detail FROM audit ORDER BY id DESC LIMIT 200') }));
R('GET', '/api/admin/export', 'admin', ctx => {
  const dump = {
    exported_at: new Date().toISOString(),
    sessions: q.all('SELECT * FROM sessions'),
    participants: q.all('SELECT id,nick,lang,created_at FROM participants'),
    activity: q.all('SELECT * FROM activity').map(r => Object.assign(r, { data: JSON.parse(r.data) })),
    content: q.all('SELECT * FROM content').map(r => Object.assign(r, { data: JSON.parse(r.data) })),
    suggestions: q.all('SELECT * FROM suggestions').map(sugOut),
    session_state: getSess()
  };
  ctx.res.setHeader('Content-Disposition', 'attachment; filename="integration-lab-backup-' + new Date().toISOString().slice(0, 10) + '.json"');
  return dump;
});

/* ---------- HTTP-каркас ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const SEC = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
const gz = new Map();
function sendStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname); if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return false;
  let st; try { st = fs.statSync(file); } catch (_) { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file), etag = 'W/"' + st.size + '-' + Math.floor(st.mtimeMs) + '"';
  const h = Object.assign({ 'Content-Type': MIME[ext] || 'application/octet-stream', ETag: etag, 'Cache-Control': 'no-cache' }, SEC);
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); res.end(); return true; }
  let buf = fs.readFileSync(file);
  if (/gzip/.test(req.headers['accept-encoding'] || '') && /\.(html|js|css|svg|json|webmanifest)$/.test(ext) && buf.length > 1024) {
    let c = gz.get(file + etag); if (!c) { c = zlib.gzipSync(buf); gz.set(file + etag, c); }
    buf = c; h['Content-Encoding'] = 'gzip'; h.Vary = 'Accept-Encoding';
  }
  h['Content-Length'] = buf.length; res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : buf); return true;
}
const readBody = req => new Promise((resolve, reject) => {
  let n = 0; const ch = [];
  req.on('data', c => { n += c.length; if (n > MAX_BODY) { reject(new HttpError(413, 'payload too large')); req.destroy(); } else ch.push(c); });
  req.on('end', () => { if (!n) return resolve({}); try { const j = JSON.parse(Buffer.concat(ch).toString('utf8')); resolve(j && typeof j === 'object' ? j : {}); } catch (_) { reject(bad('invalid json')); } });
  req.on('error', reject);
});
function json(res, status, obj, extra) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) }, SEC, extra || {}));
  res.end(body);
}
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), pathname = url.pathname;
  const ip = (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
  try {
    if (!pathname.startsWith('/api/')) {
      if ((req.method === 'GET' || req.method === 'HEAD') && sendStatic(req, res, pathname)) return;
      if (req.method === 'GET' && !path.extname(pathname)) { sendStatic(req, res, '/'); return; }
      return json(res, 404, { error: 'not found' });
    }
    const route = routes.find(r => r.method === req.method && r.re.test(pathname));
    if (!route) return json(res, 404, { error: 'not found' });
    const params = route.re.exec(pathname).groups || {};
    /* захист від CSRF: зміни лише зі своїм заголовком і тим самим origin */
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.headers['x-il'] !== '1') throw new HttpError(403, 'forbidden');
      const o = req.headers.origin; if (o) { let ok = false; try { ok = new URL(o).host === req.headers.host; } catch (_) {} if (!ok) throw new HttpError(403, 'forbidden'); }
    }
    const cookies = auth.parseCookies(req.headers.cookie);
    const staffToken = cookies[auth.SCOOKIE] || '', staff = auth.staffFromToken(staffToken), part = auth.participantFromToken(cookies[auth.PCOOKIE] || '');
    const secure = process.env.COOKIE_SECURE === '1' || (process.env.COOKIE_SECURE !== '0' && (req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https')));
    const out = [];
    const ctx = { req, res, ip, url, params, query: Object.fromEntries(url.searchParams), staff, staffToken, part, body: {},
      setCookie: (n, v, maxAge) => out.push(`${n}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAge)}${secure ? '; Secure' : ''}`),
      clearCookie: n => out.push(`${n}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`) };
    if (route.role === 'staff' && !staff) throw new HttpError(401, 'login required');
    if (route.role === 'admin' && (!staff || staff.role !== 'admin')) throw new HttpError(staff ? 403 : 401, staff ? 'admin only' : 'login required');
    if (route.role === 'participant' && !part) throw new HttpError(401, 'join required');
    if (req.method !== 'GET' && req.method !== 'HEAD') ctx.body = await readBody(req);
    const result = route.fn(ctx);
    if (result === undefined) return; /* SSE */
    json(res, 200, result, out.length ? { 'Set-Cookie': out } : {});
  } catch (e) {
    if (e && e.status) return json(res, e.status, Object.assign({ error: e.message }, e.extra || {}));
    console.error('[error]', req.method, req.url, e);
    json(res, 500, { error: 'server error' });
  }
});
server.keepAliveTimeout = 65000;

ensureSeed();
auth.bootstrap();
server.listen(PORT, HOST, () => console.log(`Integration Lab: http://localhost:${PORT}`));
function shutdown() { console.log('shutting down'); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
module.exports = { server };
