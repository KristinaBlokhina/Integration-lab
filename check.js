'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_DIR = path.join(__dirname, 'data_test');

console.log('=== ПЕРЕВІРКА СЕРВЕРА ===\n');
console.log('Node.js:', process.versions.node);
if (parseInt(process.versions.node.split('.')[0]) < 22) {
  console.error('ПОТРІБЕН Node.js 22+ (у вас ' + process.versions.node + ')');
  process.exit(1);
}

if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });

console.log('Запуск сервера на порту ' + PORT + '...');
const proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(__dirname, 'server', 'index.js')], {
  env: { ...process.env, PORT, DATA_DIR: TEST_DIR, HOST: '127.0.0.1' },
  stdio: 'pipe'
});

let logs = '';
proc.stdout.on('data', d => { logs += d.toString(); process.stdout.write('[server] ' + d); });
proc.stderr.on('data', d => { logs += d.toString(); process.stderr.write('[server-err] ' + d); });
proc.on('exit', code => console.log('Сервер завершився з кодом:', code));

setTimeout(async () => {
  console.log('\n=== ПЕРЕВІРКА HTTP ===');
  const endpoints = [
    ['/api/health', 'GET'],
    ['/api/content', 'GET'],
    ['/api/state', 'GET'],
    ['/', 'GET'],
    ['/styles.css', 'GET'],
    ['/app.js', 'GET']
  ];
  
  let allOk = true;
  for (const [url, method] of endpoints) {
    try {
      const res = await fetch(BASE + url, { method });
      const text = await res.text();
      if (res.ok) {
        console.log('OK  ' + method + ' ' + url + ' -> ' + res.status);
      } else {
        console.log('FAIL ' + method + ' ' + url + ' -> ' + res.status + ' | ' + text.slice(0, 200));
        allOk = false;
      }
    } catch (e) {
      console.log('ERR  ' + method + ' ' + url + ' -> ' + e.message);
      allOk = false;
    }
  }

  console.log('\n=== БАЗА ДАНИХ ===');
  const dbFile = path.join(TEST_DIR, 'lab.sqlite');
  if (fs.existsSync(dbFile)) {
    console.log('OK  База створена: ' + dbFile + ' (' + fs.statSync(dbFile).size + ' байт)');
  } else {
    console.log('FAIL База НЕ створена за шляхом: ' + dbFile);
    allOk = false;
  }

  console.log('\n=== РЕЗУЛЬТАТ ===');
  if (allOk) {
    console.log('ВСЕ ПРАЦЮЄ!');
  } else {
    console.log('Є ПОМИЛКИ. Дивіться логи вище.');
  }

  proc.kill();
  setTimeout(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    process.exit(allOk ? 0 : 1);
  }, 500);
}, 3000);