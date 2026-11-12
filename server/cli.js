'use strict';
/* Службові команди (на випадок, якщо втрачено пароль адміністратора):
   node server/cli.js create-admin <логін> <пароль>
   node server/cli.js reset-password <логін> <новий пароль>
   node server/cli.js list-users */
const { q } = require('./db');
const auth = require('./auth');
const [cmd, a, b] = process.argv.slice(2);
try {
  if (cmd === 'create-admin') {
    const u = auth.createUser({ username: a, password: b, role: 'admin', name: a });
    console.log('Створено адміністратора', u.username);
  } else if (cmd === 'reset-password') {
    const u = q.get('SELECT id FROM users WHERE username=?', a); if (!u) throw new Error('користувача не знайдено');
    auth.updateUser(u.id, { password: b, disabled: 0 }, 0);
    console.log('Пароль змінено, усі сеанси завершено.');
  } else if (cmd === 'list-users') {
    auth.listUsers().forEach(u => console.log(u.id, u.username, u.role, u.disabled ? '(вимкнено)' : ''));
  } else console.log('Команди: create-admin <логін> <пароль> | reset-password <логін> <пароль> | list-users');
} catch (e) { console.error('Помилка:', e.message); process.exit(1); }
