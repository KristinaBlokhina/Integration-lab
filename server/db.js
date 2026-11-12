'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { seedItems } = require('./seed');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'lab.sqlite'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('admin','facilitator')),
  pass TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login INTEGER
);
CREATE TABLE IF NOT EXISTS staff_sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS participants(
  id TEXT PRIMARY KEY,
  nick TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL UNIQUE,
  lang TEXT NOT NULL DEFAULT 'uk',
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(
  sid TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS activity(
  sid TEXT NOT NULL,
  uid TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('answer','entry','vote')),
  key TEXT NOT NULL,
  data TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY(sid, uid, kind, key)
);
CREATE INDEX IF NOT EXISTS activity_sid ON activity(sid, kind);
CREATE TABLE IF NOT EXISTS content(
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  ord REAL NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  deleted INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS suggestions(
  id TEXT PRIMARY KEY,
  item_id TEXT,
  kind TEXT NOT NULL,
  lang TEXT NOT NULL,
  data TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  participant_id TEXT NOT NULL,
  nick TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  decided_by TEXT,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS sug_status ON suggestions(status, created_at);
CREATE TABLE IF NOT EXISTS audit(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
`);

const q = {
  get: (sql, ...p) => db.prepare(sql).get(...p),
  all: (sql, ...p) => db.prepare(sql).all(...p),
  run: (sql, ...p) => db.prepare(sql).run(...p)
};
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
}
const kvGet = (k, d) => { const r = q.get('SELECT v FROM kv WHERE k=?', k); if (!r) return d; try { return JSON.parse(r.v); } catch (_) { return d; } };
const kvSet = (k, v) => q.run('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', k, JSON.stringify(v));
const audit = (actor, action, detail) => q.run('INSERT INTO audit(ts,actor,action,detail) VALUES(?,?,?,?)', Date.now(), actor || '-', action, String(detail || '').slice(0, 300));

/* Перший запуск: стартовий контент і перша сесія заходу. */
function ensureSeed() {
  if (!kvGet('seeded', false)) {
    tx(() => {
      const now = Date.now();
      seedItems().forEach(it => {
        const { id, kind, order, ...data } = it;
        q.run('INSERT OR IGNORE INTO content(id,kind,ord,data,version,deleted,updated_at,updated_by) VALUES(?,?,?,?,1,0,?,?)', id, kind, order, JSON.stringify(data), now, 'seed');
      });
      kvSet('seeded', true);
    });
  }
  if (!q.get('SELECT sid FROM sessions LIMIT 1')) {
    q.run('INSERT INTO sessions(sid,label,created_at) VALUES(?,?,?)', 's1', '', Date.now());
  }
  if (!kvGet('sess', null)) kvSet('sess', defaultSess('s1'));
}
const defaultSess = sid => ({ sid, stage: 'welcome', debateId: 't1', revealed: false, minWords: 10, solWords: 8, open: ['t1', 't2', 't3', 't4', 't5', 't6'], custom: [] });

module.exports = { db, q, tx, kvGet, kvSet, audit, ensureSeed, defaultSess, DATA_DIR };
