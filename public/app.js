'use strict';
/* Integration Lab: клієнт. Усі дані й права живуть на сервері (див. server/index.js).
   Тут лише відображення: учасник бачить сторінки учасника, фасилітатор після входу ще й панель керування. */
const $app = document.getElementById('app');
const LANGS = ['uk', 'ro', 'en'];
const CATS = ['status', 'work', 'study', 'language', 'health', 'family', 'money', 'safety', 'return', 'other'];

/* ---------- допоміжне ---------- */
const LS = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const wc = s => (String(s || '').trim().match(/\S+/g) || []).length;
const clone = o => JSON.parse(JSON.stringify(o));
function detectLang(){ const l = (navigator.language || 'en').slice(0, 2); return (l === 'uk' || l === 'ru') ? 'uk' : (l === 'ro' ? 'ro' : 'en'); }
let lang = LS.get('il_lang') || detectLang();
if (!I18N[lang]) lang = 'en';
const t = (k, v) => String((I18N[lang] && I18N[lang][k] != null) ? I18N[lang][k] : (I18N.en[k] != null ? I18N.en[k] : k))
  .replace(/\{(\w+)\}/g, (m, n) => (v && v[n] != null) ? v[n] : m);
const loc = o => !o ? '' : (o[lang] || o.uk || o.en || o.ro || Object.values(o).find(Boolean) || '');
const fmtDate = ts => { try{ return new Date(ts).toLocaleString(lang === 'uk' ? 'uk-UA' : lang === 'ro' ? 'ro-RO' : 'en-GB', { dateStyle:'short', timeStyle:'short' }); }catch(e){ return ''; } };

async function api(method, url, body){
  const opt = { method:method, headers:{ 'X-IL':'1' }, credentials:'same-origin' };
  if (body !== undefined){ opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let res;
  try{ res = await fetch(url, opt); }catch(e){ const er = new Error('offline'); er.status = 0; throw er; }
  let data = null; try{ data = await res.json(); }catch(e){}
  if (!res.ok){ const er = new Error((data && data.error) || ('http ' + res.status)); er.status = res.status; er.data = data || {}; throw er; }
  return data;
}
function errText(e){
  const m = (e && e.message) || '';
  if (e && e.status === 0) return t('offline');
  if (m === 'invalid credentials') return t('bad_cred');
  if (e.status === 429) return t('err_rate');
  if (e.status === 401) return t('err_staff');
  if (e.status === 409 && m !== 'version conflict') return t('err_closed');
  if (e.status >= 500) return t('err_gen');
  return m || t('err_gen');
}

/* ---------- стан ---------- */
const DEF = { sid:'s1', stage:'welcome', debateId:'t1', revealed:false, minWords:10, solWords:8, open:THEMES.map(x => x.id), custom:[] };
const VIEWS = ['activity', 'guide', 'project', 'facilitator', 'login'];
const S = {
  me:{ staff:null, participant:null }, needsSetup:false, loaded:false, err:'', ok:'', offline:!navigator.onLine,
  view:'activity', sub:'about', tab:'control', gcat:'all', q:'',
  sess:Object.assign({}, DEF), answers:[], entries:[], counts:{}, voteCounts:{}, myVotes:[],
  full:null, repData:null, repSid:'', sessions:[],
  content:[], mySug:[], sugQ:{ status:'pending', items:[] }, pendingSug:0, users:[], audit:[],
  confirmNew:false, copied:false, copiedLink:false, copiedJ:false, rm:'', openAcc:{}, edit:null, sug:null,
  ui:{ pick:null, editing:false, theme:null, card:null, fbRate:0, flash:'' }
};
const drafts = {};
const uid = () => S.me.participant ? S.me.participant.id : null;
const isStaff = () => !!S.me.staff;
const isAdmin = () => isStaff() && S.me.staff.role === 'admin';
const joined = () => !!S.me.participant;

/* Який набір даних зараз показуємо: звіт іншої сесії, живі дані фасилітатора або дані учасника. */
function D(){
  if (S.view === 'facilitator' && S.tab === 'report' && S.repData) return S.repData;
  if (S.view === 'facilitator' && S.full) return S.full;
  return { answers:S.answers, entries:S.entries, voteCounts:S.voteCounts };
}
const allDebates = () => THEMES.map(x => ({ id:x.id, q:x.q, a:x.a, b:x.b, name:x.name }))
  .concat((S.sess.custom || []).map(c => ({ id:c.id, q:c.q, a:c.a, b:c.b, name:{ en:t('custom') }, custom:true })));
const getDebate = id => allDebates().find(d => d.id === id) || null;
const round = () => S.sess.stage === 'debate2' ? 2 : 1;
const ans = () => D().answers;
const dAns = (r, id) => D().answers.filter(a => a.round === r && a.debateId === id).sort((a, b) => a.ts - b.ts);
const ents = k => D().entries.filter(e => !k || e.kind === k).sort((a, b) => a.ts - b.ts);
const votesFor = id => D().voteCounts[id] || 0;
const myVotes = () => S.myVotes;
const nm = x => x.nick || t('anon');
const participantsN = () => new Set([].concat(D().answers, D().entries).map(x => x.uid).concat((D().votes || []).map(v => v.uid))).size;
const nAnswered = (r, id) => { if (S.view === 'facilitator') return dAns(r, id).length; const c = S.counts[r + '_' + id]; return c ? c.A + c.B : dAns(r, id).length; };
const cardsFor = tid => {
  const th = THEMES.find(x => x.id === tid);
  const base = th ? th.cards.map(c => ({ id:c.id, text:loc(c.t), mine:false })) : [];
  const own = ents('problem').filter(e => e.theme === tid).map(e => ({ id:e.id, text:e.text, mine:true, nick:e.nick }));
  return base.concat(own);
};

/* ---------- завантаження даних ---------- */
async function loadMe(){
  const m = await api('GET', '/api/me');
  S.me.staff = m.staff; S.me.participant = m.participant; S.needsSetup = !!m.needsSetup;
}
async function loadContent(){
  try{ const d = await api('GET', '/api/content'); S.content = d.items; S.offline = false; }catch(e){ if (e.status === 0) S.offline = true; }
  render();
}
let prevStage = null;
async function refreshState(){
  try{
    if (S.view === 'facilitator' && isStaff()){
      const d = await api('GET', '/api/state?full=1');
      S.full = d; S.sess = d.sess;
    } else {
      const d = await api('GET', '/api/state');
      S.sess = d.sess;
      if (d.me){
        S.me.participant = d.me; S.answers = d.answers; S.entries = d.entries; S.counts = d.counts || {}; S.voteCounts = d.voteCounts || {}; S.myVotes = d.myVotes || [];
      } else { S.me.participant = null; S.answers = []; S.entries = []; S.counts = {}; S.voteCounts = {}; S.myVotes = []; }
    }
    S.offline = false;
  }catch(e){
    if (e.status === 0) S.offline = true;
    if (e.status === 401 || e.status === 403){ S.me.staff = null; S.full = null; }
  }
  if (prevStage && prevStage !== S.sess.stage){ S.ui.pick = null; S.ui.editing = false; S.ui.flash = ''; }
  prevStage = S.sess.stage; S.loaded = true; render();
}
async function loadMine(){ if (!joined()) { S.mySug = []; return; } try{ S.mySug = (await api('GET', '/api/suggestions/mine')).items; }catch(e){} render(); }
async function loadQueue(){
  if (!isStaff()) return;
  try{
    const d = await api('GET', '/api/staff/suggestions?status=' + S.sugQ.status);
    S.sugQ.items = d.items; S.pendingSug = d.pending;
  }catch(e){}
  render();
}
async function loadUsers(){ if (!isAdmin()) return; try{ S.users = (await api('GET', '/api/admin/users')).items; S.audit = (await api('GET', '/api/admin/audit')).items; }catch(e){} render(); }
async function loadSessions(){ if (!isStaff()) return; try{ S.sessions = (await api('GET', '/api/staff/sessions')).items; }catch(e){} render(); }
function onView(){
  if (S.view === 'facilitator' && isStaff()){ refreshState(); loadQueue(); if (S.tab === 'team') loadUsers(); if (S.tab === 'report') loadSessions(); }
  else { refreshState(); if (S.view === 'guide' || S.view === 'project') loadMine(); }
}

/* ---------- живе оновлення (SSE) ---------- */
let last = null, es = null, pollT = 0;
function connect(){
  if (!window.EventSource) { setInterval(() => { refreshState(); loadContent(); }, 8000); return; }
  es = new EventSource('/api/stream');
  es.onmessage = ev => {
    let r; try{ r = JSON.parse(ev.data); }catch(e){ return; }
    const first = !last;
    if (first || r.a !== last.a || r.s !== last.s) refreshState();
    if (first || r.c !== last.c){ loadContent(); if (isStaff()) loadQueue(); if (joined()) loadMine(); }
    last = r; S.offline = false;
  };
  es.onerror = () => { S.offline = !navigator.onLine; render(); };
}
window.addEventListener('online', () => { S.offline = false; refreshState(); loadContent(); });
window.addEventListener('offline', () => { S.offline = true; render(); });

/* ---------- маршрутизація й каркас ---------- */
function routeFromHash(){
  let h = ''; try{ h = (location.hash || '').replace('#', ''); }catch(e){}
  S.view = VIEWS.indexOf(h) >= 0 ? h : 'activity';
  if (S.view === 'facilitator' && !isStaff()) S.view = 'login';
  if (S.view === 'login' && isStaff()) S.view = 'facilitator';
}
function go(v){ try{ if (location.hash === '#' + v) { routeFromHash(); onView(); render(); } else location.hash = v; }catch(e){ S.view = v; render(); } }
let raf = 0;
function render(){ if (raf) return; raf = requestAnimationFrame(() => { raf = 0; draw(); }); }
async function guard(fn){
  try{ S.err = ''; S.ok = ''; await fn(); }
  catch(e){
    S.err = errText(e);
    if (e.status === 401 && isStaff() && S.view !== 'login'){ S.me.staff = null; routeFromHash(); }
    if (e.status === 409 || e.status === 401) refreshState();
  }
  render();
}
function bodyView(){
  if (!S.loaded) return '<p class="muted">' + t('loading') + '</p>';
  if (S.view === 'login') return loginView();
  if (S.view === 'guide') return guideView();
  if (S.view === 'project') return projectView();
  if (S.view === 'facilitator' && isStaff()) return facView();
  return partView();
}
function draw(){
  const ae = document.activeElement;
  const fid = ae && ae.id, s0 = ae && ae.selectionStart, s1 = ae && ae.selectionEnd;
  const sy = window.scrollY;
  document.title = 'Integration Lab';
  document.documentElement.lang = lang;
  $app.innerHTML = (S.offline ? '<div class="offline">' + esc(t('offline')) + '</div>' : '') +
    '<div class="wrap' + (S.view === 'facilitator' ? ' fac' : '') + '">' + header() + nav() + banners() + bodyView() + footer() + '</div>';
  $app.querySelectorAll('input[id],textarea[id],select[data-draft]').forEach(el => {
    if (drafts[el.id] == null) return;
    if (el.type === 'checkbox') el.checked = !!drafts[el.id]; else el.value = drafts[el.id];
  });
  refreshCounters();
  if (fid){ const el = document.getElementById(fid); if (el){ el.focus({ preventScroll:true }); try{ if (s0 != null) el.setSelectionRange(s0, s1); }catch(e){} } }
  if (Math.abs(window.scrollY - sy) > 2) window.scrollTo(0, sy);
}
function refreshCounters(){
  $app.querySelectorAll('[data-wc]').forEach(el => {
    const n = wc(drafts[el.dataset.wc]), min = +el.dataset.min;
    el.textContent = t('words', { c:n, n:min }); el.classList.toggle('ok', n >= min);
  });
  $app.querySelectorAll('[data-need]').forEach(el => { el.disabled = wc(drafts[el.dataset.need]) < +el.dataset.min || el.dataset.needpick === '1'; });
}

/* ---------- спільні шматки ---------- */
const MARK = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 4C15 7 15 17 16 28" stroke="var(--a)" stroke-width="4" stroke-linecap="round"/><path d="M28 4C17 7 17 17 16 28" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/></svg>';
const seg = (act, v, label, on) => '<button data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (!!on) + '">' + esc(label) + '</button>';
const card = h => '<div class="card stack">' + h + '</div>';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
function header(){
  return '<div class="top"><div class="brand">' + MARK + '<div><b>Integration Lab</b><span>' + esc(t('sub')) + '</span></div></div><div class="tools"><div class="seg" role="group" aria-label="Language">' +
    ['uk', 'ro', 'en'].map(l => seg('lang', l, l.toUpperCase(), lang === l)).join('') + '</div></div></div>';
}
function nav(){
  const items = [['activity', 'nav_act'], ['guide', 'nav_guide'], ['project', 'nav_proj']];
  if (isStaff()) items.push(['facilitator', 'nav_fac']);
  return '<nav class="nav" aria-label="Sections">' + items.map(x => '<button data-act="go" data-v="' + x[0] + '"' + (S.view === x[0] ? ' aria-current="page"' : '') + '>' + esc(t(x[1])) + (x[0] === 'facilitator' && S.pendingSug ? '<span class="badge">' + S.pendingSug + '</span>' : '') + '</button>').join('') + '</nav>';
}
function banners(){
  let h = '';
  if (S.err) h += '<div class="banner" role="alert">' + esc(S.err) + '</div>';
  if (S.ok) h += '<div class="banner okmsg" role="status">' + esc(S.ok) + '</div>';
  return h;
}
function footer(){
  const left = isStaff() ? '<span class="muted">' + esc(S.me.staff.name || S.me.staff.username) + '</span> <button class="linkbtn" data-act="logout">' + t('staff_logout') + '</button>'
    : '<button class="linkbtn" data-act="go" data-v="login">' + t('staff_login') + '</button>';
  const right = joined() ? '<button class="linkbtn" data-act="leave">' + t('leave_btn') + '</button>' : '';
  return '<div class="foot"><div>' + left + '</div><div>' + right + '</div></div>';
}
function rail(clickable){
  const st = STAGES, i = st.indexOf(S.sess.stage);
  return '<ol class="rail">' + st.map((s, k) => {
    const inner = '<span class="bar"></span><span class="lbl">' + esc(t('st_' + s)) + '</span>';
    return '<li class="' + (k < i ? 'done' : k === i ? 'on' : '') + '">' + (clickable ? '<button data-act="stage" data-v="' + s + '">' + inner + '</button>' : '<div>' + inner + '</div>') + '</li>';
  }).join('') + '</ol>';
}
function tally(list){
  const a = list.filter(x => x.choice === 'A').length, b = list.filter(x => x.choice === 'B').length, n = a + b;
  const pa = n ? Math.round(a / n * 100) : 0;
  return '<div class="tally" role="img" aria-label="A ' + a + ', B ' + b + '"><div class="a" style="width:' + pa + '%">A · ' + a + '</div><div class="b" style="width:' + (n ? 100 - pa : 0) + '%">B · ' + b + '</div></div>';
}
/* Текст учасника + посилання «відкрити в Google Translate», щоб українці й румуни розуміли одне одного. */
function tx(text){
  const s = String(text == null ? '' : text);
  const link = s ? ' <a class="tl" target="_blank" rel="noopener noreferrer" title="' + esc(t('tr_link')) + '" href="https://translate.google.com/?sl=auto&tl=' + lang + '&op=translate&text=' + encodeURIComponent(s.slice(0, 1500)) + '">↗</a>' : '';
  return esc(s) + link;
}
function reasons(d, list){
  const col = side => '<div class="stack"><span class="chip ' + side + '">' + side + ' · ' + esc(loc(d[side.toLowerCase()])) + '</span>' +
    (list.filter(x => x.choice === side).map(x => '<div class="quote ' + side + '"><div class="who">' + esc(nm(x)) + '</div>' + tx(x.reason) + '</div>').join('') || '<p class="muted small">' + t('empty') + '</p>') + '</div>';
  return '<div class="cols">' + col('A') + col('B') + '</div>';
}
const cardText = id => { for (const th of THEMES){ const c = th.cards.find(x => x.id === id); if (c) return loc(c.t); } const e = D().entries.find(x => x.id === id); return e ? e.text : ''; };

/* ---------- учасник ---------- */
function partView(){
  if (!joined()) return joinView();
  const st = S.sess.stage;
  return rail(false) + (st === 'welcome' ? welcomeView() : st === 'stations' ? stationsView() : st === 'finale' ? finaleView() : debateView());
}
function joinView(){
  return card('<h2>' + t('join_t') + '</h2><p class="muted">' + t('join_p') + '</p><div><label for="nick">' + t('nick') + '</label><input type="text" id="nick" maxlength="40" placeholder="' + esc(t('nickph')) + '" autocomplete="nickname"></div><div><button class="btn" data-act="join">' + t('start') + '</button></div>');
}
function welcomeView(){
  const wall = ents('icebreaker').slice().reverse().map(e => '<div class="quote"><div class="who">' + esc(nm(e)) + '</div>' + tx(e.text) + '</div>').join('');
  return '<div class="stack">' + card('<div class="eyebrow">' + t('w_t') + '</div><h2>' + esc(t('w_prompt')) + '</h2><textarea id="ice" placeholder="' + esc(t('w_ph')) + '"></textarea><div class="row"><button class="btn" data-act="sendIce" data-need="ice" data-min="3">' + t('send') + '</button><span class="small muted">' + esc(S.ui.flash) + '</span></div>') +
    (wall ? '<div class="eyebrow">' + t('w_list') + '</div><div class="stack">' + wall + '</div>' : '') + '</div>';
}
function debateView(){
  const d = getDebate(S.sess.debateId), r = round();
  if (!d) return card('<p>' + t('noq') + '</p>');
  const min = S.sess.minWords, list = dAns(r, d.id), mine = list.find(a => a.uid === uid());
  const head = '<div><div class="eyebrow">' + t(r === 1 ? 'd_t1' : 'd_t2') + '</div><h2>' + esc(loc(d.q)) + '</h2>' + (r === 2 ? '<p class="muted">' + t('d2_p') + '</p>' : '') + '</div>';
  if (S.sess.revealed){
    const r1 = r === 2 ? dAns(1, d.id).find(a => a.uid === uid()) : null;
    const shift = (r1 && mine) ? '<p><span class="small muted">' + t('before') + '</span> <span class="chip ' + r1.choice + '">' + r1.choice + '</span> &nbsp;<span class="small muted">' + t('now') + '</span> <span class="chip ' + mine.choice + '">' + mine.choice + '</span> &nbsp;<b>' + t(r1.choice === mine.choice ? 'same' : 'changed') + '</b></p>' : '';
    return card(head + tally(list) + shift + '<h3>' + t('reveal_t') + '</h3>' + reasons(d, list));
  }
  if (mine && !S.ui.editing){
    return card(head + '<div class="quote ' + mine.choice + '"><span class="chip ' + mine.choice + '">' + mine.choice + ' · ' + esc(loc(d[mine.choice.toLowerCase()])) + '</span><p>' + tx(mine.reason) + '</p></div><p class="muted">' + t('waiting') + '</p><div class="row"><span class="chip">' + t('answered', { n:nAnswered(r, d.id) }) + '</span><button class="btn ghost sm" data-act="editAns">' + t('edit') + '</button></div>');
  }
  const p = S.ui.pick;
  const ch = side => '<button class="choice ' + side + (p && p !== side ? ' dim' : '') + '" data-act="pickSide" data-v="' + side + '" aria-pressed="' + (p === side) + '"><small>' + side + '</small>' + esc(loc(d[side.toLowerCase()])) + '</button>';
  return card(head + '<div><label>' + t('pick') + '</label><div class="choices">' + ch('A') + ch('B') + '</div></div><div><label for="reason">' + t('reason', { n:min }) + '</label><textarea id="reason" placeholder="' + esc(t('reasonph')) + '"></textarea><span class="counter" data-wc="reason" data-min="' + min + '"></span></div><div><button class="btn" id="subAns" data-act="submitAns" data-need="reason" data-min="' + min + '"' + (p ? '' : ' data-needpick="1"') + '>' + t('submit') + '</button></div>');
}
function stationsView(){
  const open = S.sess.open || [], sel = S.ui.theme, th = THEMES.find(x => x.id === sel);
  let h = '<div><h2>' + t('s_t') + '</h2><p class="muted">' + t('s_p') + '</p></div><div class="themes">' +
    THEMES.map((x, i) => '<button class="theme" data-act="pickTheme" data-v="' + x.id + '" aria-pressed="' + (sel === x.id) + '"' + (open.indexOf(x.id) < 0 ? ' disabled' : '') + '><span class="n">' + ROMAN[i] + (open.indexOf(x.id) < 0 ? ' · ' + esc(t('s_closed')) : '') + '</span><br><b>' + esc(loc(x.name)) + '</b></button>').join('') + '</div>';
  if (th && open.indexOf(th.id) >= 0){
    const cards = cardsFor(th.id), cid = S.ui.card;
    h += '<h3>' + t('s_problems') + '</h3><div class="stack">' + cards.map(c => '<button class="theme" data-act="pickCard" data-v="' + esc(c.id) + '" aria-pressed="' + (cid === c.id) + '">' + tx(c.text) + (c.mine ? '<br><span class="small muted">' + esc(c.nick || t('anon')) + '</span>' : '') + '</button>').join('') + '</div>' +
      card('<label for="prob">' + t('s_add') + '</label><textarea id="prob" style="min-height:70px"></textarea><div><button class="btn ghost sm" data-act="sendProb" data-need="prob" data-min="5">' + t('add') + '</button></div>');
    if (cid && cards.some(c => c.id === cid)){
      const sols = ents('solution').filter(e => e.cardId === cid), n = S.sess.solWords;
      h += card('<h3>' + esc(cardText(cid)) + '</h3><div><label for="sol">' + t('s_sol') + '</label><textarea id="sol"></textarea><span class="counter" data-wc="sol" data-min="' + n + '"></span></div><div><label for="help">' + t('s_help') + '</label><input type="text" id="help" maxlength="120"></div><div><button class="btn" data-act="sendSol" data-need="sol" data-min="' + n + '">' + t('send') + '</button></div>') +
        '<h3>' + t('s_list') + '</h3><div class="stack">' + (sols.slice().reverse().map(e => '<div class="sol"><div class="who small muted"><b>' + esc(nm(e)) + '</b></div>' + tx(e.text) + (e.help ? '<div class="help">' + tx(e.help) + '</div>' : '') + '</div>').join('') || '<p class="muted">' + t('s_none') + '</p>') + '</div>';
    } else h += '<p class="muted">' + t('s_pick') + '</p>';
  }
  return '<div class="stack">' + h + '</div>';
}
function finaleView(){
  const sols = ents('solution').map(e => ({ e:e, v:votesFor(e.id) })).sort((a, b) => b.v - a.v || a.e.ts - b.e.ts);
  const mine = new Set(myVotes()), left = 3 - mine.size;
  const fb = ents('feedback').some(e => e.uid === uid());
  const list = sols.map(x => '<div class="sol stack"><span class="small muted">' + tx(cardText(x.e.cardId)) + '</span><div>' + tx(x.e.text) + '</div>' + (x.e.help ? '<div class="help">' + tx(x.e.help) + '</div>' : '') +
    '<div class="row"><button class="btn sm' + (mine.has(x.e.id) ? '' : ' ghost') + '" data-act="vote" data-v="' + esc(x.e.id) + '"' + (!mine.has(x.e.id) && left <= 0 ? ' disabled' : '') + '>' + t(mine.has(x.e.id) ? 'voted' : 'vote') + '</button><span class="chip">' + x.v + '</span></div></div>').join('');
  const rate = '<div class="rate" role="group">' + [1, 2, 3, 4, 5].map(n => '<button data-act="rate" data-v="' + n + '" aria-pressed="' + (S.ui.fbRate === n) + '">' + n + '</button>').join('') + '</div>';
  return '<div class="stack"><div><h2>' + t('f_t') + '</h2><p class="muted">' + t('f_p', { n:Math.max(left, 0) }) + '</p></div><div class="stack">' + (list || '<p class="muted">' + t('s_none') + '</p>') + '</div>' +
    (fb ? card('<p>' + t('thanks') + '</p>') : card('<h3>' + t('fb_t') + '</h3><div><label>' + t('fb_rate') + '</label>' + rate + '</div><div><label for="take">' + t('fb_take') + '</label><textarea id="take" style="min-height:70px"></textarea></div><div><button class="btn" data-act="sendFb">' + t('send') + '</button></div>')) + '</div>';
}

/* ---------- вхід фасилітатора ---------- */
function loginView(){
  if (S.needsSetup){
    return '<div class="narrow">' + card('<h2>' + t('setup_t') + '</h2><p class="muted">' + t('setup_p') + '</p>' +
      '<div><label for="s_code">' + t('setup_code') + '</label><input type="text" id="s_code" autocomplete="off"></div>' +
      '<div><label for="s_user">' + t('username') + '</label><input type="text" id="s_user" autocomplete="username"></div>' +
      '<div><label for="s_name">' + t('setup_name') + '</label><input type="text" id="s_name" autocomplete="name"></div>' +
      '<div><label for="s_pass">' + t('password') + '</label><input type="password" id="s_pass" autocomplete="new-password"><span class="small muted">' + t('pw_hint') + '</span></div>' +
      '<div class="row"><button class="btn" data-act="setup">' + t('setup_btn') + '</button></div>') + '</div>';
  }
  return '<div class="narrow">' + card('<h2>' + t('login_t') + '</h2><p class="muted">' + t('login_p') + '</p>' +
    '<div><label for="l_user">' + t('username') + '</label><input type="text" id="l_user" autocomplete="username" autocapitalize="off"></div>' +
    '<div><label for="l_pass">' + t('password') + '</label><input type="password" id="l_pass" autocomplete="current-password"></div>' +
    '<div class="row"><button class="btn" data-act="login">' + t('signin') + '</button><button class="btn ghost" data-act="go" data-v="activity">' + t('back') + '</button></div>') + '</div>';
}

/* ---------- фасилітатор ---------- */
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
function stat(l, v){ return '<div><b>' + v + '</b><span>' + esc(l) + '</span></div>'; }
function facView(){
  const tabs = [['control', t('tab_c')], ['live', t('tab_l')], ['report', t('tab_r')], ['sug', t('tab_s') + (S.pendingSug ? '<span class="badge">' + S.pendingSug + '</span>' : '')]];
  if (isAdmin()) tabs.push(['team', t('tab_t')]);
  tabs.push(['acct', t('tab_a')]);
  const bar = tabs.map(x => '<button class="btn sm' + (S.tab === x[0] ? '' : ' ghost') + '" data-act="tab" data-v="' + x[0] + '">' + (x[0] === 'sug' ? x[1] : esc(x[1])) + '</button>').join('');
  const body = S.tab === 'live' ? facLive() : S.tab === 'report' ? facReport() : S.tab === 'sug' ? facSug() : S.tab === 'team' && isAdmin() ? facTeam() : S.tab === 'acct' ? facAcct() : facControl();
  const stats = S.full ? '<div class="card" style="margin-bottom:14px"><div class="stat">' + stat(t('partic'), participantsN()) + stat(t('answers'), ans().length) + stat(t('sols'), ents('solution').length) + '</div></div>' : '';
  return rail(true) + stats + '<div class="tabs">' + bar + '</div>' + body;
}
function facControl(){
  const st = S.sess.stage, isD = st === 'debate1' || st === 'debate2', d = getDebate(S.sess.debateId);
  const opts = allDebates().map(x => '<option value="' + esc(x.id) + '"' + (x.id === S.sess.debateId ? ' selected' : '') + '>' + esc(trunc(loc(x.q), 72)) + '</option>').join('');
  let left = '<div class="card stack"><h3>' + t('join_link') + '</h3><div class="row"><input type="text" readonly id="joinlink" value="' + esc(location.origin + '/#activity') + '" style="flex:1;min-width:200px"><button class="btn sm" data-act="copyLink">' + t(S.copiedLink ? 'copied' : 'copy_link') + '</button></div></div>';
  left += '<div class="card stack"><h3>' + t('question') + '</h3><div><select id="fq" aria-label="' + esc(t('question')) + '">' + opts + '</select></div>' +
    '<div class="row"><div style="width:130px"><label for="minw">' + t('minwords') + '</label><input type="number" id="minw" min="1" max="60" value="' + S.sess.minWords + '"></div>' +
    '<button class="btn" data-act="reveal" style="align-self:flex-end">' + t(S.sess.revealed ? 'hide' : 'reveal') + '</button></div></div>';
  left += '<div class="card stack"><h3>' + t('stations_state') + '</h3>' + THEMES.map((x, i) => {
    const on = (S.sess.open || []).indexOf(x.id) >= 0;
    return '<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="small" style="min-width:0"><b>' + ROMAN[i] + '</b> ' + esc(loc(x.name)) + '</span><button class="btn sm' + (on ? '' : ' ghost') + '" data-act="toggleOpen" data-v="' + x.id + '">' + t(on ? 'open' : 'close') + '</button></div>';
  }).join('') + '</div>';
  left += '<div class="card stack"><h3>' + t('addq') + '</h3><div><label for="fqt">' + t('qtext') + '</label><input type="text" id="fqt" maxlength="160"></div><div><label for="fqa">' + t('opta') + '</label><input type="text" id="fqa" maxlength="60"></div><div><label for="fqb">' + t('optb') + '</label><input type="text" id="fqb" maxlength="60"></div><div><button class="btn sm" data-act="addQ">' + t('add') + '</button></div></div>';
  left += '<div class="card stack">' + (S.confirmNew ? '<p class="small">' + t('newses_c') + '</p><div><label for="slabel">' + t('sess_label') + '</label><input type="text" id="slabel" maxlength="80"></div><div class="row"><button class="btn danger sm" data-act="newSession">' + t('yes') + '</button><button class="btn ghost sm" data-act="cancelNew">' + t('cancel') + '</button></div>' : '<button class="btn ghost sm" data-act="askNew">' + t('newses') + '</button>') + '</div>';
  let right = '';
  if (isD && d){
    const r = round(), list = dAns(r, d.id);
    right = card('<div class="eyebrow">' + t(r === 1 ? 'd_t1' : 'd_t2') + '</div><h2>' + esc(loc(d.q)) + '</h2>' + tally(list) + '<span class="chip">' + t('answered', { n:list.length }) + '</span>' + (S.sess.revealed ? reasons(d, list) : ''));
  } else if (st === 'welcome'){
    right = card('<h3>' + t('w_list') + '</h3>' + (ents('icebreaker').slice(-6).reverse().map(e => '<div class="quote"><div class="who">' + esc(nm(e)) + '</div>' + tx(e.text) + '</div>').join('') || '<p class="muted">' + t('empty') + '</p>'));
  } else if (st === 'stations'){
    right = card('<h3>' + t('s_t') + '</h3>' + THEMES.map((x, i) => '<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="small" style="min-width:0"><b>' + ROMAN[i] + '</b> ' + esc(loc(x.name)) + '</span><span class="chip">' + ents('solution').filter(e => e.theme === x.id).length + '</span></div>').join(''));
  } else {
    right = card('<h3>' + t('f_t') + '</h3>' + topSols(5).map(x => '<div class="sol">' + tx(x.e.text) + '<div class="help">' + x.v + ' · ' + esc(nm(x.e)) + '</div></div>').join('') + (ents('feedback').length ? '<p class="small muted">' + esc(t('fb_rate')) + ' ' + avgRating() + '</p>' : ''));
  }
  return '<div class="grid"><div class="stack">' + left + '</div><div class="stack">' + right + '</div></div>';
}
const topSols = n => ents('solution').map(e => ({ e:e, v:votesFor(e.id) })).sort((a, b) => b.v - a.v || a.e.ts - b.e.ts).slice(0, n);
const avgRating = () => { const f = ents('feedback').filter(e => e.rating); return f.length ? (f.reduce((s, e) => s + e.rating, 0) / f.length).toFixed(1) : '–'; };
function shiftCount(id){
  const a1 = dAns(1, id), a2 = dAns(2, id);
  return a2.filter(a => { const p = a1.find(x => x.uid === a.uid); return p && p.choice !== a.choice; }).length;
}
function reportText(){
  const L = ['Integration Lab · ' + t('sub'), t('report_t') + ' · ' + new Date().toLocaleDateString(lang === 'uk' ? 'uk-UA' : lang === 'ro' ? 'ro-RO' : 'en-GB'), '', t('partic') + ': ' + participantsN(), t('answers') + ': ' + ans().length, t('sols') + ': ' + ents('solution').length, ''];
  allDebates().forEach(d => {
    const a1 = dAns(1, d.id), a2 = dAns(2, d.id); if (!a1.length && !a2.length) return;
    const c = l => 'A ' + l.filter(x => x.choice === 'A').length + ' / B ' + l.filter(x => x.choice === 'B').length;
    L.push(loc(d.q), '  A: ' + loc(d.a) + ' | B: ' + loc(d.b), '  ' + t('before') + ': ' + c(a1), '  ' + t('now') + ': ' + c(a2) + (a2.length ? ' · ' + t('shift') + ': ' + shiftCount(d.id) : ''), '');
  });
  const ts = topSols(5).filter(x => x.v > 0);
  if (ts.length){ L.push(t('s_list') + ':'); ts.forEach((x, i) => L.push((i + 1) + '. ' + x.e.text + ' (' + x.v + ')')); L.push(''); }
  if (ents('feedback').length) L.push(t('fb_rate') + ' ' + avgRating() + ' (' + ents('feedback').length + ')');
  return L.join('\n');
}
function csvText(){
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [['type', 'round', 'question_or_theme', 'side', 'text', 'help', 'name', 'language', 'words', 'votes', 'time']];
  ans().forEach(a => { const d = getDebate(a.debateId); rows.push(['answer', a.round, d ? loc(d.q) : a.debateId, a.choice, a.reason, '', a.nick, a.lang, a.words, '', new Date(a.ts).toISOString()]); });
  ents().forEach(e => { const th = THEMES.find(x => x.id === e.theme); rows.push([e.kind, '', th ? loc(th.name) : '', e.rating || '', e.text, e.help || '', e.nick, e.lang, wc(e.text), e.kind === 'solution' ? votesFor(e.id) : '', new Date(e.ts).toISOString()]); });
  return '﻿' + rows.map(r => r.map(q).join(',')).join('\n');
}
function download(name, text, type){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type:type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function rmBtn(key){
  const on = S.rm === key;
  return '<button class="btn sm ' + (on ? 'danger' : 'ghost') + '" data-act="' + (on ? 'rmDo' : 'rmAsk') + '" data-v="' + esc(key) + '">' + t(on ? 'rm_yes' : 'rm') + '</button>';
}
function facLive(){
  const d = getDebate(S.sess.debateId); if (!d) return card('<p>' + t('noq') + '</p>');
  const r = round(), list = dAns(r, d.id), prev = r === 2 ? dAns(1, d.id) : [];
  const rows = list.map(a => {
    const p = prev.find(x => x.uid === a.uid);
    return '<tr><td>' + esc(nm(a)) + '</td><td><span class="chip ' + a.choice + '">' + a.choice + '</span></td><td>' + a.words + '</td><td class="reason">' + tx(a.reason) + '</td>' +
      (r === 2 ? '<td>' + (p ? '<span class="chip ' + p.choice + '">' + p.choice + '</span>' + (p.choice !== a.choice ? ' ↔' : '') : '–') + '</td>' : '') +
      '<td>' + rmBtn('a|' + a.uid + '|' + a.key) + '</td></tr>';
  }).join('');
  const er = ents().slice().reverse().map(e => '<tr><td>' + esc(nm(e)) + '</td><td><span class="chip">' + esc(e.kind) + '</span></td><td class="reason">' + tx(e.text || (e.rating ? '★ ' + e.rating : '')) + (e.help ? '<div class="orig">' + tx(e.help) + '</div>' : '') + '</td><td>' + rmBtn('e|' + e.uid + '|' + e.key) + '</td></tr>').join('');
  return '<div class="stack">' + card('<div class="eyebrow">' + t('live_for') + '</div><h2>' + esc(loc(d.q)) + '</h2>' + tally(list) + (r === 2 ? '<p><b>' + t('shift') + ':</b> ' + shiftCount(d.id) + '</p>' : '') +
    '<div class="scroll"><table><thead><tr><th>' + t('nickc') + '</th><th>' + t('choice') + '</th><th>' + t('wordsc') + '</th><th>' + t('reasonc') + '</th>' + (r === 2 ? '<th>' + t('before_c') + '</th>' : '') + '<th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="muted">' + t('empty') + '</td></tr>') + '</tbody></table></div>') +
    card('<h3>' + t('sols') + '</h3><div class="scroll"><table><thead><tr><th>' + t('nickc') + '</th><th></th><th>' + t('reasonc') + '</th><th></th></tr></thead><tbody>' + (er || '<tr><td colspan="4" class="muted">' + t('empty') + '</td></tr>') + '</tbody></table></div>') + '</div>';
}
function facReport(){
  const cur = S.sess.sid;
  const sel = S.sessions.length > 1 ? '<div><label for="repsel">' + t('rep_sess') + '</label><select id="repsel" data-chg="repSess">' + S.sessions.map((s, i) => '<option value="' + esc(s.sid) + '"' + ((S.repSid || cur) === s.sid ? ' selected' : '') + '>' + esc((s.sid === cur ? t('rep_current') + ' · ' : '') + fmtDate(s.created_at) + (s.label ? ' · ' + s.label : '') + ' (' + s.people + ')') + '</option>').join('') + '</select></div>' : '';
  return card('<h3>' + t('report_t') + '</h3>' + sel + '<pre class="report">' + esc(reportText()) + '</pre><div class="row"><button class="btn" data-act="copy">' + t(S.copied ? 'copied' : 'copy') + '</button><button class="btn ghost" data-act="csv">' + t('csv') + '</button>' +
    (isAdmin() ? '<a class="btn ghost" style="text-decoration:none" href="/api/admin/export" download>' + t('backup') + '</a>' : '') + '</div>');
}
function facSug(){
  const st = S.sugQ.status;
  const chips = ['pending', 'approved', 'rejected'].map(s => '<button class="chipbtn" data-act="sugFilter" data-v="' + s + '" aria-pressed="' + (st === s) + '">' + t('st_' + s) + '</button>').join('');
  const items = S.sugQ.items.map(s => {
    const it = s.item_id ? S.content.find(x => x.id === s.item_id) : null, d = s.data;
    const cur = it ? ((it.title && it.title[s.lang]) || '') + (it.body && it.body[s.lang] ? '\n\n' + it.body[s.lang] : '') : '';
    const prop = (d.title || '') + (d.body ? '\n\n' + d.body : '') + (d.links && d.links.length ? '\n\n' + d.links.map(l => l.label + ' | ' + l.url).join('\n') : '');
    return card('<div class="row"><span class="chip">' + esc(s.kind) + ' · ' + s.lang.toUpperCase() + '</span><span class="chip status-' + s.status + '">' + t('st_' + s.status) + '</span><span class="small muted">' + t('sg_by', { n:esc(s.nick || t('anon')) }) + ' · ' + fmtDate(s.created_at) + '</span></div>' +
      '<h3>' + t(s.item_id ? 'sg_changeto' : 'sg_newitem') + (it ? ': ' + esc(loc(it.title)) : '') + '</h3>' +
      '<div class="diff">' + (s.item_id ? '<div><b>' + t('sg_cur') + '</b>\n' + esc(cur || '–') + '</div>' : '') + '<div><b>' + t('sg_prop') + '</b>\n' + esc(prop) + '</div></div>' +
      (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') + (s.reason ? '<p class="small muted">' + esc(s.reason) + '</p>' : '') +
      (s.status === 'pending' ? '<div class="row"><button class="btn sm" data-act="sugApprove" data-v="' + esc(s.id) + '">' + t('approve') + '</button><input type="text" id="rj_' + esc(s.id) + '" placeholder="' + esc(t('sg_reason')) + '" style="flex:1;min-width:140px" maxlength="300"><button class="btn danger sm" data-act="sugReject" data-v="' + esc(s.id) + '">' + t('reject') + '</button></div>' : ''));
  }).join('');
  return '<div class="stack"><div class="chips">' + chips + '</div>' + (items || '<p class="muted">' + t('sg_none') + '</p>') + '</div>';
}
function facTeam(){
  const rows = S.users.map(u => {
    const me = u.id === S.me.staff.id;
    return '<tr><td><b>' + esc(u.name || u.username) + '</b> ' + (me ? '<span class="small muted">' + t('tm_you') + '</span>' : '') + '<div class="small muted">' + esc(u.username) + (u.disabled ? ' · ' + t('tm_off') : '') + '</div></td>' +
      '<td><select data-chg="userRole" data-id="' + u.id + '" aria-label="' + esc(t('tm_role')) + '"' + (me ? ' disabled' : '') + '><option value="facilitator"' + (u.role === 'facilitator' ? ' selected' : '') + '>' + t('tm_fac') + '</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>' + t('tm_admin') + '</option></select></td>' +
      '<td class="small">' + (u.last_login ? fmtDate(u.last_login) : '–') + '</td>' +
      '<td><div class="table-actions">' + (me ? '' : '<button class="btn ghost sm" data-act="userToggle" data-v="' + u.id + '">' + t(u.disabled ? 'tm_enable' : 'tm_disable') + '</button>' + rmBtn('u|' + u.id)) + '</div>' +
      '<div class="row" style="margin-top:6px"><input type="password" id="pw_' + u.id + '" placeholder="' + esc(t('tm_new_pw')) + '" autocomplete="new-password" style="width:150px"><button class="btn ghost sm" data-act="userReset" data-v="' + u.id + '">' + t('tm_reset') + '</button></div></td></tr>';
  }).join('');
  const aud = S.audit.slice(0, 30).map(a => '<tr><td class="small">' + fmtDate(a.ts) + '</td><td>' + esc(a.actor) + '</td><td>' + esc(a.action) + '</td><td class="small muted">' + esc(a.detail) + '</td></tr>').join('');
  return '<div class="stack">' + card('<h3>' + t('team_t') + '</h3><div class="scroll"><table><thead><tr><th>' + t('tm_name') + '</th><th>' + t('tm_role') + '</th><th>' + t('tm_last') + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>') +
    card('<h3>' + t('tm_add') + '</h3><div class="cols"><div><label for="u_user">' + t('username') + '</label><input type="text" id="u_user" autocomplete="off" autocapitalize="off"></div><div><label for="u_name">' + t('tm_name') + '</label><input type="text" id="u_name" autocomplete="off"></div></div>' +
      '<div class="cols"><div><label for="u_pass">' + t('password') + '</label><input type="password" id="u_pass" autocomplete="new-password"><span class="small muted">' + t('pw_hint') + '</span></div><div><label for="u_role">' + t('tm_role') + '</label><select id="u_role" data-draft="1"><option value="facilitator">' + t('tm_fac') + '</option><option value="admin">' + t('tm_admin') + '</option></select></div></div>' +
      '<div><button class="btn" data-act="userAdd">' + t('add') + '</button></div>') +
    card('<h3>' + t('audit_t') + '</h3><div class="scroll"><table><tbody>' + aud + '</tbody></table></div>') + '</div>';
}
function facAcct(){
  return '<div class="narrow">' + card('<h3>' + t('acc_t') + '</h3><p class="muted">' + esc(S.me.staff.name || '') + ' · ' + esc(S.me.staff.username) + ' · ' + t(S.me.staff.role === 'admin' ? 'tm_admin' : 'tm_fac') + '</p>' +
    '<div><label for="a_old">' + t('pw_old') + '</label><input type="password" id="a_old" autocomplete="current-password"></div>' +
    '<div><label for="a_new">' + t('pw_new') + '</label><input type="password" id="a_new" autocomplete="new-password"><span class="small muted">' + t('pw_hint') + '</span></div>' +
    '<div><button class="btn" data-act="pwChange">' + t('pw_save') + '</button></div>') + '</div>';
}

/* ---------- сторінки з інформацією ---------- */
const KIND_OF_SUB = { about:'about', vol:'vol', events:'event', articles:'article' };
const contentItems = kind => S.content.filter(x => x.kind === kind);
const findItem = id => S.content.find(x => x.id === id) || null;
function md(s){
  let out = '', ul = false;
  String(s || '').split('\n').forEach(l => {
    const m = l.match(/^\s*[-•]\s+(.*)$/);
    if (m){ if (!ul){ out += '<ul>'; ul = true; } out += '<li>' + esc(m[1]) + '</li>'; }
    else { if (ul){ out += '</ul>'; ul = false; } if (l.trim()) out += '<p>' + esc(l) + '</p>'; }
  });
  return '<div class="md">' + out + (ul ? '</ul>' : '') + '</div>';
}
function linksHtml(links){
  const ok = (links || []).filter(l => l && /^https?:\/\//i.test(l.url || ''));
  return ok.length ? '<div class="links">' + ok.map(l => '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label || l.url) + ' ↗</a>').join('') + '</div>' : '';
}
function stamp(it){
  const p = [];
  if (it.checked) p.push(t('verified', { d:esc(it.checked) }));
  if (it.updated_by && it.updated_by !== 'seed') p.push(t('upd_by', { n:esc(it.updated_by) }));
  return p.length ? '<div class="stamp">' + p.join(' · ') + '</div>' : '';
}
function tools(kind, it, idx, n){
  if (isStaff()){
    const k = it.id;
    return '<div class="edtools"><button class="btn ghost sm" data-act="editStart" data-v="' + esc(k) + '">' + t('edit') + '</button>' +
      '<button class="btn ghost sm" aria-label="' + esc(t('up')) + '" data-act="itemSwap" data-v="' + esc(k) + '|' + (idx > 0 ? esc(it._prev || '') : '') + '"' + (idx === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button class="btn ghost sm" aria-label="' + esc(t('down')) + '" data-act="itemSwap" data-v="' + esc(k) + '|' + (idx < n - 1 ? esc(it._next || '') : '') + '"' + (idx === n - 1 ? ' disabled' : '') + '>↓</button>' +
      rmBtn('c|' + k) + '</div>';
  }
  return '<div class="edtools"><button class="btn ghost sm" data-act="sgOpen" data-v="' + esc(it.id) + '">' + t('sg_btn') + '</button></div>';
}
function annotate(list){ list.forEach((x, i) => { x._prev = i > 0 ? list[i - 1].id : ''; x._next = i < list.length - 1 ? list[i + 1].id : ''; }); return list; }

/* форма редагування для фасилітатора: усі три мови в одній формі */
function editForm(){
  const e = S.edit, kind = e.kind, showDate = kind === 'event' || kind === 'article', showPlace = kind === 'event', l = e.lang;
  const tabs = '<div class="ltabs" role="group" aria-label="' + esc(t('ed_lang')) + '">' + LANGS.map(x => '<button class="chipbtn" data-act="editLang" data-v="' + x + '" aria-pressed="' + (l === x) + '">' + x.toUpperCase() + (drafts['et_' + x] ? ' ✓' : '') + '</button>').join('') + '</div>';
  return '<div class="card stack">' + (e.conflict ? '<div class="banner" role="alert">' + t('ed_conflict') + '<div class="row" style="margin-top:8px"><button class="btn sm" data-act="editSave" data-force="1">' + t('ed_overwrite') + '</button><button class="btn ghost sm" data-act="editCancel">' + t('ed_discard') + '</button></div></div>' : '') +
    '<div><label>' + t('ed_lang') + '</label>' + tabs + '<p class="small muted" style="margin-top:6px">' + t('ed_hint') + '</p></div>' +
    '<div><label for="et_' + l + '">' + t('f_title') + ' (' + l.toUpperCase() + ')</label><input type="text" id="et_' + l + '" maxlength="200"></div>' +
    (showDate ? '<div><label for="ed_' + l + '">' + t('f_date') + '</label><input type="text" id="ed_' + l + '" maxlength="80"></div>' : '') +
    (showPlace ? '<div><label for="ep_' + l + '">' + t('f_place') + '</label><input type="text" id="ep_' + l + '" maxlength="160"></div>' : '') +
    '<div><label for="eb_' + l + '">' + t('f_body') + ' (' + l.toUpperCase() + ')</label><textarea id="eb_' + l + '" style="min-height:220px" maxlength="9000"></textarea></div>' +
    (kind === 'guide' ? '<div><label for="ecat">' + t('f_cat') + '</label><select id="ecat" data-draft="1">' + CATS.map(c => '<option value="' + c + '">' + esc(t('cat_' + c)) + '</option>').join('') + '</select></div>' : '') +
    (kind === 'contact' ? '<div><label for="ephone">' + t('f_phone') + '</label><input type="text" id="ephone" maxlength="40"></div>' : '') +
    '<div><label for="el">' + t('f_links') + '</label><textarea id="el" style="min-height:70px"></textarea></div>' +
    '<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="everified" data-draft="1"> ' + t('f_verified') + '</label>' +
    '<div class="row"><button class="btn" data-act="editSave">' + t('save') + '</button><button class="btn ghost" data-act="editCancel">' + t('cancel') + '</button></div></div>';
}
/* форма пропозиції для учасника */
function sugForm(){
  const s = S.sug;
  return '<div class="card stack"><h3>' + t('sg_t') + '</h3><p class="muted small">' + t('sg_p') + '</p>' +
    (joined() ? '' : '<div><label for="sgname">' + t('sg_name') + '</label><input type="text" id="sgname" maxlength="40" autocomplete="nickname"></div>') +
    '<div><label for="sgt">' + t('f_title') + '</label><input type="text" id="sgt" maxlength="200"></div>' +
    (s.kind === 'event' || s.kind === 'article' ? '<div><label for="sgd">' + t('f_date') + '</label><input type="text" id="sgd" maxlength="80"></div>' : '') +
    (s.kind === 'event' ? '<div><label for="sgpl">' + t('f_place') + '</label><input type="text" id="sgpl" maxlength="160"></div>' : '') +
    '<div><label for="sgb">' + t('f_body') + '</label><textarea id="sgb" style="min-height:160px" maxlength="9000"></textarea></div>' +
    (!s.itemId && s.kind === 'guide' ? '<div><label for="sgc">' + t('f_cat') + '</label><select id="sgc" data-draft="1">' + CATS.map(c => '<option value="' + c + '">' + esc(t('cat_' + c)) + '</option>').join('') + '</select></div>' : '') +
    '<div><label for="sgl">' + t('f_links') + '</label><textarea id="sgl" style="min-height:60px"></textarea></div>' +
    '<div><label for="sgn">' + t('sg_note') + '</label><input type="text" id="sgn" maxlength="500"></div>' +
    '<div class="row"><button class="btn" data-act="sgSend">' + t('sg_send') + '</button><button class="btn ghost" data-act="sgClose">' + t('cancel') + '</button></div></div>';
}
function mySugHtml(){
  if (!S.mySug.length) return '';
  return '<div class="stack"><h3>' + t('sg_mine') + '</h3>' + S.mySug.map(s => '<div class="sol"><span class="chip status-' + s.status + '">' + t('st_' + s.status) + '</span> <b>' + esc(s.data.title || (findItem(s.item_id) ? loc(findItem(s.item_id).title) : '')) + '</b>' + (s.reason ? '<div class="help">' + esc(s.reason) + '</div>' : '') + '</div>').join('') + '</div>';
}
function addBtn(kind){
  if (isStaff()){
    if (S.edit && S.edit.isNew) return '';
    return '<div><button class="btn" data-act="itemAdd" data-v="' + kind + '">' + t(kind === 'event' ? 'add_event' : kind === 'article' ? 'add_article' : 'add_item') + '</button></div>';
  }
  if (S.sug && !S.sug.itemId) return '';
  return '<div><button class="btn ghost" data-act="sgOpen" data-v="new:' + kind + '">' + t('sg_new_btn') + '</button></div>';
}
const editingHere = id => S.edit && !S.edit.isNew && S.edit.id === id;
const sugHere = id => S.sug && S.sug.itemId === id;
const hay = it => [it.title, it.body].map(o => LANGS.map(l => (o && o[l]) || '').join(' ')).join(' ').toLowerCase();
function contactHtml(c){
  const tel = c.phone ? '<a class="tel" href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>' : '';
  return '<div class="contact"><b>' + esc(loc(c.title)) + '</b>' + tel + '<div class="small muted">' + esc(loc(c.body)) + '</div>' + linksHtml(c.links) + (isStaff() ? tools('contact', c, 0, 1).replace(/<button[^>]*itemSwap[^>]*>[^<]*<\/button>/g, '') : '') + '</div>';
}
function guideView(){
  const all = annotate(contentItems('guide').slice()), q = S.q.trim().toLowerCase();
  const cats = CATS.filter(c => all.some(i => i.cat === c));
  const items = all.filter(i => (S.gcat === 'all' || i.cat === S.gcat) && (!q || hay(i).indexOf(q) >= 0));
  const chips = '<div class="chips" role="group" aria-label="' + esc(t('f_cat')) + '">' + ['all'].concat(cats).map(c => '<button class="chipbtn" data-act="gcat" data-v="' + c + '" aria-pressed="' + (S.gcat === c) + '">' + esc(t('cat_' + c)) + '</button>').join('') + '</div>';
  const contacts = contentItems('contact');
  const cblock = (!q && contacts.length) ? '<div class="stack"><h3>' + t('contacts_t') + '</h3><div class="contacts">' + contacts.map(contactHtml).join('') + '</div>' + (isStaff() ? (S.edit && S.edit.kind === 'contact' ? '' : '<div><button class="btn ghost sm" data-act="itemAdd" data-v="contact">' + t('add_item') + '</button></div>') : '') + (S.edit && S.edit.kind === 'contact' ? editForm() : '') + '</div>' : '';
  const list = items.map((it, idx) => {
    if (editingHere(it.id)) return editForm();
    const open = S.openAcc[it.id] === undefined ? (!!q) : S.openAcc[it.id];
    return '<div class="acc"><button class="hd" data-act="acc" data-v="' + esc(it.id) + '" aria-expanded="' + open + '"><span>' + esc(loc(it.title)) + '</span><span aria-hidden="true">' + (open ? '−' : '+') + '</span></button>' +
      (open ? '<div class="bd">' + md(loc(it.body)) + linksHtml(it.links) + stamp(it) + tools('guide', it, S.gcat === 'all' && !q ? all.indexOf(it) : idx, S.gcat === 'all' && !q ? all.length : items.length) + (sugHere(it.id) ? sugForm() : '') + '</div>' : '') + '</div>';
  }).join('');
  return '<div class="stack"><div><h2>' + t('g_t') + '</h2><p class="muted">' + t('g_p') + '</p></div>' + cblock +
    '<input type="search" id="gq" placeholder="' + esc(t('search_ph')) + '" aria-label="' + esc(t('search_ph')) + '">' + chips +
    (list || '<p class="muted">' + t('no_results') + '</p>') +
    (S.edit && S.edit.isNew && S.edit.kind === 'guide' ? editForm() : '') + (S.sug && !S.sug.itemId && S.sug.kind === 'guide' ? sugForm() : '') + addBtn('guide') + mySugHtml() + '<p class="src">' + t('g_note') + '</p></div>';
}
function itemBody(it){
  const meta = [esc(loc(it.date)), esc(loc(it.place))].filter(x => x).join(' · ');
  return (meta ? '<div class="meta">' + meta + '</div>' : '') + '<h3>' + esc(loc(it.title)) + '</h3>' + md(loc(it.body)) + linksHtml(it.links) + stamp(it);
}
function projectView(){
  const subs = [['about', 'p_about'], ['vol', 'p_vol'], ['events', 'p_events'], ['articles', 'p_articles']];
  const kind = KIND_OF_SUB[S.sub] || 'about', items = annotate(contentItems(kind).slice());
  const list = items.map((it, i) => editingHere(it.id) ? editForm() : card(itemBody(it) + tools(kind, it, i, items.length) + (sugHere(it.id) ? sugForm() : ''))).join('');
  const empty = (!items.length && !(S.edit && S.edit.isNew)) ? '<p class="muted">' + t(kind === 'article' ? 'no_articles' : 'noitems') + '</p>' : '';
  return '<div class="stack"><div><h2>' + t('proj_t') + '</h2><p class="muted">' + t('proj_p') + '</p></div><div class="subnav">' +
    subs.map(x => '<button class="btn sm' + (S.sub === x[0] ? '' : ' ghost') + '" data-act="sub" data-v="' + x[0] + '">' + esc(t(x[1])) + '</button>').join('') + '</div>' +
    '<div class="stack">' + list + (S.edit && S.edit.isNew && S.edit.kind === kind ? editForm() : '') + (S.sug && !S.sug.itemId && S.sug.kind === kind ? sugForm() : '') + empty + '</div>' + addBtn(kind) + (kind === 'vol' ? '<p class="note">' + t('ask_help') + '</p>' : '') + mySugHtml() + '</div>';
}

/* ---------- редагування контенту ---------- */
function parseLinks(txt){
  return String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const i = l.lastIndexOf('|'), label = i >= 0 ? l.slice(0, i).trim() : '', url = (i >= 0 ? l.slice(i + 1) : l).trim();
    return { label:label || url, url:url };
  }).filter(x => /^https?:\/\//i.test(x.url));
}
const linksText = links => (links || []).map(l => (l.label || '') + ' | ' + l.url).join('\n');
function editStart(id, kind){
  const it = id ? findItem(id) : null;
  S.edit = { kind:it ? it.kind : kind, id:id || null, isNew:!it, version:it ? it.version : 0, lang:lang, conflict:false };
  LANGS.forEach(l => { drafts['et_' + l] = it && it.title ? (it.title[l] || '') : ''; drafts['eb_' + l] = it && it.body ? (it.body[l] || '') : ''; drafts['ed_' + l] = it && it.date ? (it.date[l] || '') : ''; drafts['ep_' + l] = it && it.place ? (it.place[l] || '') : ''; });
  drafts.el = it ? linksText(it.links) : ''; drafts.ecat = it && it.cat ? it.cat : (S.gcat !== 'all' ? S.gcat : 'other'); drafts.ephone = it && it.phone ? it.phone : ''; drafts.everified = false;
}
const editStop = () => { S.edit = null; };
async function saveItem(force){
  const e = S.edit; if (!e) return;
  const L = f => { const o = {}; LANGS.forEach(l => { const v = (drafts[f + '_' + l] || '').trim(); if (v) o[l] = v; }); return o; };
  const body = { kind:e.kind, title:L('et'), body:L('eb'), date:L('ed'), place:L('ep'), links:parseLinks(drafts.el), cat:drafts.ecat, phone:drafts.ephone || '', verified:!!drafts.everified, baseVersion:e.version };
  if (!Object.keys(body.title).length) { S.err = t('f_title') + '?'; return; }
  try{
    if (e.isNew) await api('POST', '/api/staff/content', body); else await api('PUT', '/api/staff/content/' + encodeURIComponent(e.id), body);
    editStop(); await loadContent();
  }catch(er){
    if (er.status === 409 && er.data && er.data.current){ e.conflict = true; e.version = er.data.current.version; S.err = ''; }
    else throw er;
  }
}

/* ---------- дії ---------- */
const ACT = {
  lang(d){ lang = d.v; LS.set('il_lang', lang); },
  go(d){ S.err = ''; S.ok = ''; editStop(); S.sug = null; go(d.v); },
  async join(){
    const nick = (drafts.nick || '').trim();
    return guard(async () => { await api('POST', '/api/join', { nick:nick, lang:lang }); drafts.nick = ''; await refreshState(); });
  },
  async leave(){ return guard(async () => { await api('POST', '/api/leave', {}); S.me.participant = null; S.answers = []; S.entries = []; S.myVotes = []; S.mySug = []; S.ui = { pick:null, editing:false, theme:null, card:null, fbRate:0, flash:'' }; }); },
  pickSide(d){ S.ui.pick = d.v; },
  submitAns(){
    const dd = getDebate(S.sess.debateId); if (!dd || !S.ui.pick) return;
    const reason = (drafts.reason || '').trim(); if (wc(reason) < S.sess.minWords) return;
    return guard(async () => { await api('POST', '/api/answer', { round:round(), debateId:dd.id, choice:S.ui.pick, reason:reason, lang:lang }); S.ui.editing = false; drafts.reason = ''; S.ui.pick = null; await refreshState(); });
  },
  editAns(){ const dd = getDebate(S.sess.debateId), m = dd && dAns(round(), dd.id).find(a => a.uid === uid()); if (m){ S.ui.editing = true; S.ui.pick = m.choice; drafts.reason = m.reason; } },
  sendIce(){ const x = (drafts.ice || '').trim(); if (wc(x) < 3) return; return guard(async () => { await api('POST', '/api/entry', { kind:'icebreaker', text:x, lang:lang }); drafts.ice = ''; S.ui.flash = t('sent'); await refreshState(); }); },
  pickTheme(d){ S.ui.theme = d.v; S.ui.card = null; },
  pickCard(d){ S.ui.card = d.v; },
  sendProb(){ const x = (drafts.prob || '').trim(); if (wc(x) < 5) return; return guard(async () => { await api('POST', '/api/entry', { kind:'problem', theme:S.ui.theme, text:x, lang:lang }); drafts.prob = ''; await refreshState(); }); },
  sendSol(){ const x = (drafts.sol || '').trim(); if (wc(x) < S.sess.solWords) return; const h = (drafts.help || '').trim(); return guard(async () => { await api('POST', '/api/entry', { kind:'solution', theme:S.ui.theme, cardId:S.ui.card, text:x, help:h, lang:lang }); drafts.sol = ''; drafts.help = ''; await refreshState(); }); },
  vote(d){ return guard(async () => { await api('POST', '/api/vote', { entryId:d.v }); await refreshState(); }); },
  rate(d){ S.ui.fbRate = +d.v; },
  sendFb(){ if (!S.ui.fbRate) return; const x = (drafts.take || '').trim(); return guard(async () => { await api('POST', '/api/entry', { kind:'feedback', rating:S.ui.fbRate, text:x, lang:lang }); drafts.take = ''; await refreshState(); }); },

  /* вхід і вихід */
  login(){
    const u = (drafts.l_user || '').trim(), p = drafts.l_pass || '';
    return guard(async () => { const r = await api('POST', '/api/staff/login', { username:u, password:p }); S.me.staff = r.staff; drafts.l_pass = ''; go('facilitator'); });
  },
  setup(){
    return guard(async () => { const r = await api('POST', '/api/setup', { code:(drafts.s_code || '').trim(), username:(drafts.s_user || '').trim(), name:(drafts.s_name || '').trim(), password:drafts.s_pass || '' }); S.me.staff = r.staff; S.needsSetup = false; drafts.s_pass = ''; go('facilitator'); });
  },
  logout(){ return guard(async () => { await api('POST', '/api/staff/logout', {}); S.me.staff = null; S.full = null; S.pendingSug = 0; editStop(); go('activity'); }); },
  pwChange(){ return guard(async () => { await api('POST', '/api/staff/password', { oldPassword:drafts.a_old || '', newPassword:drafts.a_new || '' }); drafts.a_old = drafts.a_new = ''; S.ok = t('pw_ok'); }); },

  /* керування заходом */
  stage(d){ return setSess({ stage:d.v, revealed:(d.v === 'debate1' || d.v === 'debate2') ? false : S.sess.revealed }); },
  reveal(){ return setSess({ revealed:!S.sess.revealed }); },
  toggleOpen(d){ const o = (S.sess.open || []).slice(), i = o.indexOf(d.v); if (i < 0) o.push(d.v); else o.splice(i, 1); return setSess({ open:o }); },
  tab(d){ S.tab = d.v; S.err = ''; S.ok = ''; if (d.v === 'sug') loadQueue(); if (d.v === 'team') loadUsers(); if (d.v === 'report'){ loadSessions(); S.repSid = ''; S.repData = null; } },
  askNew(){ S.confirmNew = true; },
  cancelNew(){ S.confirmNew = false; },
  newSession(){ S.confirmNew = false; const label = (drafts.slabel || '').trim(); drafts.slabel = ''; return guard(async () => { await api('POST', '/api/staff/session/new', { label:label }); await refreshState(); }); },
  addQ(){
    const q = (drafts.fqt || '').trim(), a = (drafts.fqa || '').trim(), b = (drafts.fqb || '').trim(); if (!q || !a || !b) return;
    const id = 'c' + Date.now().toString(36); drafts.fqt = drafts.fqa = drafts.fqb = '';
    const o = k => { const x = {}; x[lang] = k; return x; };
    return setSess({ custom:(S.sess.custom || []).concat([{ id:id, q:o(q), a:o(a), b:o(b) }]), debateId:id, revealed:false });
  },
  copy(){ const done = () => { S.copied = true; render(); setTimeout(() => { S.copied = false; render(); }, 1800); }; try{ navigator.clipboard.writeText(reportText()).then(done, () => {}); }catch(e){} },
  copyLink(){ const done = () => { S.copiedLink = true; render(); setTimeout(() => { S.copiedLink = false; render(); }, 1800); }; try{ navigator.clipboard.writeText(location.origin + '/#activity').then(done, () => {}); }catch(e){} },
  csv(){ download('integration-lab.csv', csvText(), 'text/csv;charset=utf-8'); },
  rmAsk(d){ S.rm = d.v; },
  rmDo(d){
    const p = String(d.v).split('|'); S.rm = '';
    if (p[0] === 'a') return guard(async () => { await api('DELETE', '/api/staff/activity', { kind:'answers', uid:p[1], key:p[2] }); await refreshState(); });
    if (p[0] === 'e') return guard(async () => { await api('DELETE', '/api/staff/activity', { kind:'entries', uid:p[1], key:p[2] }); await refreshState(); });
    if (p[0] === 'c') return guard(async () => { await api('DELETE', '/api/staff/content/' + encodeURIComponent(p[1])); await loadContent(); });
    if (p[0] === 'u') return guard(async () => { await api('DELETE', '/api/admin/users/' + p[1]); await loadUsers(); });
  },

  /* контент */
  acc(d){ const q = S.q.trim(), cur = S.openAcc[d.v]; S.openAcc[d.v] = cur === undefined ? !q : !cur; },
  gcat(d){ S.gcat = d.v; },
  sub(d){ editStop(); S.sug = null; S.sub = d.v; },
  editStart(d){ S.sug = null; editStart(d.v); },
  editCancel(){ editStop(); },
  editLang(d){ if (S.edit) S.edit.lang = d.v; },
  editSave(d){ return guard(() => saveItem(d && d.force)); },
  itemAdd(d){ S.sug = null; editStart(null, d.v); },
  itemSwap(d){ const p = d.v.split('|'); if (!p[1]) return; return guard(async () => { await api('POST', '/api/staff/content/' + encodeURIComponent(p[0]) + '/swap', { with:p[1] }); await loadContent(); }); },

  /* пропозиції від учасників */
  sgOpen(d){
    editStop();
    if (d.v.indexOf('new:') === 0){ S.sug = { itemId:null, kind:d.v.slice(4) }; ['sgt', 'sgb', 'sgl', 'sgn', 'sgd', 'sgpl'].forEach(k => { drafts[k] = ''; }); drafts.sgc = S.gcat !== 'all' ? S.gcat : 'other'; return; }
    const it = findItem(d.v); if (!it) return;
    S.sug = { itemId:it.id, kind:it.kind };
    drafts.sgt = loc(it.title); drafts.sgb = loc(it.body); drafts.sgl = linksText(it.links); drafts.sgn = ''; drafts.sgd = loc(it.date); drafts.sgpl = loc(it.place);
    S.openAcc[it.id] = true;
  },
  sgClose(){ S.sug = null; },
  sgSend(){
    const s = S.sug; if (!s) return;
    return guard(async () => {
      if (!joined()){ await api('POST', '/api/join', { nick:(drafts.sgname || '').trim(), lang:lang }); await refreshState(); }
      await api('POST', '/api/suggestions', { itemId:s.itemId, kind:s.kind, lang:lang, title:drafts.sgt || '', body:drafts.sgb || '', links:parseLinks(drafts.sgl), note:drafts.sgn || '', cat:drafts.sgc, date:drafts.sgd || '', place:drafts.sgpl || '' });
      S.sug = null; S.ok = t('sg_sent'); await loadMine();
    });
  },
  sugFilter(d){ S.sugQ.status = d.v; loadQueue(); },
  sugApprove(d){ return guard(async () => { await api('POST', '/api/staff/suggestions/' + d.v + '/approve', {}); await loadContent(); await loadQueue(); }); },
  sugReject(d){ const r = (drafts['rj_' + d.v] || '').trim(); return guard(async () => { await api('POST', '/api/staff/suggestions/' + d.v + '/reject', { reason:r }); await loadQueue(); }); },

  /* команда */
  userAdd(){
    return guard(async () => { await api('POST', '/api/admin/users', { username:(drafts.u_user || '').trim(), name:(drafts.u_name || '').trim(), password:drafts.u_pass || '', role:drafts.u_role || 'facilitator' }); drafts.u_user = drafts.u_name = drafts.u_pass = ''; await loadUsers(); });
  },
  userToggle(d){ const u = S.users.find(x => String(x.id) === d.v); if (!u) return; return guard(async () => { await api('PATCH', '/api/admin/users/' + d.v, { disabled:!u.disabled }); await loadUsers(); }); },
  userReset(d){ const p = drafts['pw_' + d.v] || ''; return guard(async () => { await api('PATCH', '/api/admin/users/' + d.v, { password:p }); drafts['pw_' + d.v] = ''; S.ok = t('pw_ok'); await loadUsers(); }); },
  userRole(d){ return guard(async () => { await api('PATCH', '/api/admin/users/' + d.id, { role:d.v }); await loadUsers(); }); },
  async repSess(d){
    S.repSid = d.v;
    if (d.v === S.sess.sid){ S.repData = null; return; }
    try{ S.repData = await api('GET', '/api/state?full=1&sid=' + encodeURIComponent(d.v)); }catch(e){ S.err = errText(e); }
  }
};
async function setSess(patch){
  S.sess = Object.assign({}, S.sess, patch); render();
  await guard(async () => { await api('PUT', '/api/staff/session', patch); await refreshState(); });
}

/* ---------- події ---------- */
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  if (el.tagName === 'A') return;
  const r = f(el.dataset);
  if (r && r.then) r.then(render); else render();
});
$app.addEventListener('input', e => {
  const el = e.target;
  if (!el.id) return;
  if (el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'password' || el.type === 'search' || el.type === 'number'){
    drafts[el.id] = el.value; S.ui.flash = '';
    if (el.id === 'gq'){ S.q = el.value; render(); return; }
    refreshCounters();
  }
});
$app.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.draft) drafts[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.chg){ const f = ACT[el.dataset.chg]; if (f){ const r = f(Object.assign({}, el.dataset, { v:el.value })); if (r && r.then) r.then(render); else render(); } return; }
  if (el.id === 'fq') setSess({ debateId:el.value, revealed:false });
  if (el.id === 'minw') setSess({ minWords:Math.max(1, Math.min(60, +el.value || 10)) });
});
$app.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  const id = e.target.id;
  if (id === 'l_user' || id === 'l_pass') { e.preventDefault(); ACT.login(); }
  else if (id === 's_pass') { e.preventDefault(); ACT.setup(); }
  else if (id === 'nick') { e.preventDefault(); ACT.join(); }
});
window.addEventListener('hashchange', () => { routeFromHash(); onView(); render(); });

/* ---------- запуск ---------- */
async function boot(){
  render();
  try{ await loadMe(); }catch(e){ if (e.status === 0) S.offline = true; }
  routeFromHash();
  await Promise.all([loadContent(), refreshState()]);
  onView();
  connect();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(() => {});
}
boot();
