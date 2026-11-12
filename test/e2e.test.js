'use strict';
/* Наскрізний тест API: ролі, права, етапи заходу, пропозиції, конфлікти редагування. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3200 + Math.floor(Math.random() * 500), BASE = 'http://127.0.0.1:' + PORT;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'il-'));
let proc, code = '';

class Client {
  constructor() { this.jar = {}; }
  async call(method, url, body, headers) {
    const res = await fetch(BASE + url, { method, headers: Object.assign({ 'X-IL': '1', 'Content-Type': 'application/json', Cookie: Object.entries(this.jar).map(([k, v]) => k + '=' + v).join('; ') }, headers), body: (body === undefined || method === 'GET') ? undefined : JSON.stringify(body) });
    (res.headers.getSetCookie() || []).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/Max-Age=0/.test(c)) delete this.jar[k]; else this.jar[k] = v; });
    let data = null; try { data = await res.json(); } catch (_) {}
    return { status: res.status, data };
  }
}

test.before(async () => {
  proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(__dirname, '..', 'server', 'index.js')], { env: Object.assign({}, process.env, { PORT, DATA_DIR: dir, HOST: '127.0.0.1' }) });
  await new Promise((res, rej) => { proc.stdout.on('data', d => { const s = String(d); const m = s.match(/configuration code|налаштування: (\w+)/); const c = s.match(/налаштування: (\w+)/); if (c) code = c[1]; if (/http:\/\/localhost/.test(s)) res(); }); proc.on('error', rej); setTimeout(() => rej(new Error('server start timeout')), 8000); });
});
test.after(() => { proc.kill(); fs.rmSync(dir, { recursive: true, force: true }); });

const admin = new Client(), fac = new Client(), p1 = new Client(), p2 = new Client(), anon = new Client();

test('CSRF-захист і перший запуск', async () => {
  const r = await fetch(BASE + '/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
  assert.equal((await anon.call('GET', '/api/me')).data.needsSetup, true);
  assert.equal((await anon.call('POST', '/api/setup', { code: 'wrong', username: 'boss', password: 'longpassword1' })).status, 403);
  const s = await admin.call('POST', '/api/setup', { code, username: 'boss', name: 'Boss', password: 'longpassword1' });
  assert.equal(s.status, 200); assert.equal(s.data.staff.role, 'admin');
  assert.equal((await anon.call('POST', '/api/setup', { code, username: 'x1x', password: 'longpassword1' })).status, 409);
});

test('учасник не має доступу до панелі фасилітатора', async () => {
  const j = await p1.call('POST', '/api/join', { nick: 'Оля', lang: 'uk' }); assert.equal(j.status, 200);
  for (const [m, u] of [['GET', '/api/state?full=1'], ['PUT', '/api/staff/session'], ['GET', '/api/staff/suggestions'], ['POST', '/api/staff/content'], ['GET', '/api/admin/users'], ['GET', '/api/admin/export']]) {
    const r = await p1.call(m, u, {}); assert.ok(r.status === 401 || r.status === 403, m + ' ' + u + ' -> ' + r.status);
  }
  assert.equal((await p1.call('GET', '/api/me')).data.staff, null);
});

test('вхід фасилітатора, створення акаунтів і ролі', async () => {
  assert.equal((await anon.call('POST', '/api/staff/login', { username: 'boss', password: 'bad' })).status, 401);
  assert.equal((await admin.call('POST', '/api/admin/users', { username: 'maria', name: 'Марія', password: 'short' })).status, 400);
  assert.equal((await admin.call('POST', '/api/admin/users', { username: 'maria', name: 'Марія', password: 'longpassword2' })).status, 200);
  assert.equal((await fac.call('POST', '/api/staff/login', { username: 'maria', password: 'longpassword2' })).status, 200);
  assert.equal((await fac.call('GET', '/api/admin/users')).status, 403);
  assert.equal((await fac.call('GET', '/api/state?full=1')).status, 200);
  const me = (await admin.call('GET', '/api/admin/users')).data.items.find(u => u.username === 'boss');
  assert.equal((await admin.call('PATCH', '/api/admin/users/' + me.id, { disabled: true })).status, 409);
});

test('хід заходу: етапи, відповіді, приватність до розкриття', async () => {
  await p2.call('POST', '/api/join', { nick: 'Ion', lang: 'ro' });
  assert.equal((await p1.call('POST', '/api/answer', { round: 1, debateId: 't1', choice: 'A', reason: 'one two three four five six seven eight nine ten' })).status, 409);
  assert.equal((await fac.call('PUT', '/api/staff/session', { stage: 'debate1', debateId: 't1' })).status, 200);
  assert.equal((await p1.call('POST', '/api/answer', { round: 1, debateId: 't1', choice: 'A', reason: 'занадто коротко' })).status, 400);
  const long = 'one two three four five six seven eight nine ten eleven';
  assert.equal((await p1.call('POST', '/api/answer', { round: 1, debateId: 't1', choice: 'A', reason: long })).status, 200);
  assert.equal((await p2.call('POST', '/api/answer', { round: 1, debateId: 't1', choice: 'B', reason: long + ' secret' })).status, 200);
  const s2 = (await p2.call('GET', '/api/state')).data;
  assert.equal(s2.answers.length, 1, 'до розкриття учасник бачить лише свою відповідь');
  assert.equal(s2.counts['1_t1'].A, 1);
  await fac.call('PUT', '/api/staff/session', { revealed: true });
  assert.equal((await p2.call('GET', '/api/state')).data.answers.length, 2);
  assert.equal((await p2.call('POST', '/api/answer', { round: 1, debateId: 't1', choice: 'A', reason: long })).status, 409);
});

test('станції, голосування, відгук (приватний)', async () => {
  await fac.call('PUT', '/api/staff/session', { stage: 'stations' });
  assert.equal((await p1.call('POST', '/api/entry', { kind: 'problem', theme: 't1', text: 'a b c d e f' })).status, 200);
  const sol = await p1.call('POST', '/api/entry', { kind: 'solution', theme: 't1', cardId: 't1c1', text: 'we can organise a weekly language cafe for everyone', help: 'FNT' });
  assert.equal(sol.status, 200);
  await fac.call('PUT', '/api/staff/session', { stage: 'finale' });
  assert.equal((await p2.call('POST', '/api/vote', { entryId: sol.data.id })).status, 200);
  assert.equal((await p2.call('POST', '/api/entry', { kind: 'feedback', rating: 5, text: 'privat' })).status, 200);
  const s1 = (await p1.call('GET', '/api/state')).data;
  assert.equal(s1.voteCounts[sol.data.id], 1);
  assert.ok(!s1.entries.some(e => e.kind === 'feedback'), 'чужий відгук не видно учасникам');
  const full = (await fac.call('GET', '/api/state?full=1')).data;
  assert.ok(full.entries.some(e => e.kind === 'feedback'));
});

test('контент: редагування фасилітатором, конфлікти версій, модерація пропозицій', async () => {
  const items = (await anon.call('GET', '/api/content')).data.items;
  const g = items.find(i => i.id === 'g_health');
  assert.ok(g && g.title.ro && g.title.uk && g.title.en);
  assert.equal((await p1.call('PUT', '/api/staff/content/g_health', { baseVersion: g.version, title: { uk: 'x' } })).status, 401);
  const ok = await fac.call('PUT', '/api/staff/content/g_health', { baseVersion: g.version, title: g.title, body: g.body, cat: 'health', links: g.links, verified: true });
  assert.equal(ok.status, 200);
  const stale = await admin.call('PUT', '/api/staff/content/g_health', { baseVersion: g.version, title: g.title, body: g.body });
  assert.equal(stale.status, 409); assert.ok(stale.data.current);
  assert.equal((await fac.call('PUT', '/api/staff/content/g_health', { baseVersion: ok.data.version, title: { uk: 'x' }, links: [{ url: 'javascript:alert(1)' }] })).status, 400);

  const sg = await p1.call('POST', '/api/suggestions', { itemId: 'g_health', kind: 'guide', lang: 'uk', title: 'Медична допомога (виправлено)', body: 'Новий текст', note: 'джерело' });
  assert.equal(sg.status, 200);
  assert.equal((await anon.call('POST', '/api/suggestions', { kind: 'guide', title: 'x', body: 'y' })).status, 401);
  assert.equal((await fac.call('GET', '/api/staff/suggestions')).data.items.length, 1);
  assert.equal((await p1.call('POST', '/api/staff/suggestions/' + sg.data.id + '/approve', {})).status, 401);
  assert.equal((await fac.call('POST', '/api/staff/suggestions/' + sg.data.id + '/approve', {})).status, 200);
  const after = (await anon.call('GET', '/api/content')).data.items.find(i => i.id === 'g_health');
  assert.equal(after.title.uk, 'Медична допомога (виправлено)');
  assert.ok(after.title.ro, 'інші мови збережено');

  const nw = await p2.call('POST', '/api/suggestions', { kind: 'guide', cat: 'work', lang: 'ro', title: 'Titlu nou', body: 'text' });
  assert.equal((await fac.call('POST', '/api/staff/suggestions/' + nw.data.id + '/reject', { reason: 'дубль' })).status, 200);
});

test('XSS-подібні дані зберігаються як текст; ліміти і вихід', async () => {
  const c = await fac.call('POST', '/api/staff/content', { kind: 'event', title: { uk: '<img src=x onerror=alert(1)>' }, body: {}, date: { uk: 'завтра' }, place: {} });
  assert.equal(c.status, 200);
  assert.equal((await fac.call('DELETE', '/api/staff/content/' + c.data.id)).status, 200);
  assert.equal((await fac.call('POST', '/api/staff/logout', {})).status, 200);
  assert.equal((await fac.call('GET', '/api/state?full=1')).status, 403);
  const exp = await admin.call('GET', '/api/admin/export'); assert.equal(exp.status, 200); assert.ok(exp.data.content.length > 20);
});

test('статичні файли і SPA-запасний маршрут', async () => {
  const r = await fetch(BASE + '/'); assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal((await fetch(BASE + '/app.js')).status, 200);
  assert.equal((await fetch(BASE + '/..%2fserver%2fdb.js')).status, 404);
  assert.equal((await fetch(BASE + '/some/path')).status, 200);
});
