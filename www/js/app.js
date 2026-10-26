/* Give Me the Bible Crosswords — main application */
(function () {
  'use strict';
  const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
  const THEMES = window.THEMES, CATS = window.THEME_CATS;
  const EDITIONS = {
    news: { list: window.PUZZLES_NEWS || [], prefix: 'n', name: 'Newspaper grid', short: 'Newspaper', help: 'Classic blocked grid: every letter is part of an across and a down answer.' },
    open: { list: window.PUZZLES || [], prefix: 'p', name: 'Open grid', short: 'Open', help: 'Free-form grid: every answer comes from the theme’s passages.' }
  };
  const $ = (s, el) => (el || document).querySelector(s);
  const screen = $('#screen');
  const modalRoot = $('#modal-root');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- icons ----------
  const sv = (d, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const I = {
    exit: sv('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16l-4-4 4-4"/><path d="M5 12h11"/>'),
    back: sv('<path d="M15 18l-6-6 6-6"/>'),
    hint: sv('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>'),
    save: sv('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3"/><path d="M8 21v-7h8v7"/>'),
    list: sv('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    more: sv('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', 2.6),
    plus: sv('<path d="M12 5v14M5 12h14"/>', 2.4), minus: sv('<path d="M5 12h14"/>', 2.4),
    prev: sv('<path d="M15 18l-6-6 6-6"/>', 2.4), next: sv('<path d="M9 18l6-6-6-6"/>', 2.4),
    book: sv('<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h6M8 13h4"/>'),
    close: sv('<path d="M6 6l12 12M18 6 6 18"/>', 2.4),
    user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    print: sv('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
    marker: sv('<path d="m9 11 6-6 4 4-6 6"/><path d="M9 11 5 15v4h4l4-4"/><path d="M3 21h18"/>')
  };

  // ---------- storage & profiles ----------
  const G = {
    get(k, d) { try { const v = localStorage.getItem('bc.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bc.' + k, JSON.stringify(v)); return true; } catch (e) { toast('Could not save: storage is full or unavailable.'); return false; } },
    del(k) { try { localStorage.removeItem('bc.' + k); } catch (e) { /* ignore */ } }
  };
  const PER_PROFILE = ['settings', 'saves', 'done', 'randomOpts', 'randomCount', 'readerPos', 'libcat', 'libstyle', 'zoom.m', 'zoom.d', 'zoom.mn', 'zoom.mo', 'zoom.dn', 'zoom.do', 'hl', 'hlLast'];
  (function migrate() {
    if (G.get('profiles')) return;
    const id = 'u' + Date.now().toString(36);
    G.set('profiles', [{ id, name: 'Player 1', created: Date.now() }]);
    G.set('profile', id);
    PER_PROFILE.forEach((k) => { const v = G.get(k); if (v !== undefined) { G.set('u.' + id + '.' + k, v); G.del(k); } });
  })();
  let pid = G.get('profile');
  if (!G.get('profiles').some((p) => p.id === pid)) { pid = G.get('profiles')[0].id; G.set('profile', pid); }
  const profiles = () => G.get('profiles', []);
  const profileName = () => (profiles().find((p) => p.id === pid) || { name: 'Player' }).name;
  const store = {
    get(k, d) { return G.get('u.' + pid + '.' + k, d); },
    set(k, v) { return G.set('u.' + pid + '.' + k, v); },
    del(k) { G.del('u.' + pid + '.' + k); }
  };

  const defaults = { theme: 'light', size: 'normal', letterHints: 'off', maskVerse: true, autoCheck: true, skipFilled: true, keyboard: 'auto', v: 2 };
  let settings = {};
  function loadSettings() {
    const s = store.get('settings', {});
    if (!s.v || s.v < 2) { s.autoCheck = true; s.v = 2; }
    settings = Object.assign({}, defaults, s);
  }
  loadSettings();
  function saveSettings() { store.set('settings', settings); }
  function applyLook() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.size = settings.size;
    const touch = settings.keyboard === 'on' || (settings.keyboard === 'auto' && window.matchMedia('(pointer: coarse)').matches);
    document.body.classList.toggle('touch', touch);
  }
  applyLook();

  const saves = () => store.get('saves', {});
  function putSave(s) { const all = saves(); all[s.key] = s; store.set('saves', all); }
  function dropSave(key) { const all = saves(); delete all[key]; store.set('saves', all); }
  const records = () => store.get('done', []);
  const sig = (p) => { let h = 2166136261; const s = p.rows.join(''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

  // ---------- KJV (lazy) ----------
  let kjvReady = null, bible = null;
  function loadKJV() {
    if (kjvReady) return kjvReady;
    kjvReady = new Promise((res, rej) => {
      if (window.KJV) return res();
      const s = document.createElement('script'); s.src = 'data/kjv.js'; s.onload = () => res(); s.onerror = () => rej(new Error('KJV failed to load'));
      document.head.appendChild(s);
    }).then(() => { bible = bible || new CWEngine.Bible(window.KJV_BOOKS, window.KJV); return bible; });
    return kjvReady;
  }
  const refStr = (r) => BOOKS[r[0]] + ' ' + r[1] + ':' + r[2] + (r[3] && r[3] !== r[2] ? '–' + r[3] : '');
  const vref = (id) => BOOKS[bible.vb[id]] + ' ' + bible.vc[id] + ':' + bible.vv[id];

  // ---------- platform ----------
  function exitApp() {
    confirmBox('Exit Give Me the Bible Crosswords?', 'Your puzzle progress is saved automatically.', 'Exit', () => {
      if (game) game.persist();
      if (window.desktop && window.desktop.exit) window.desktop.exit();
      else if (window.Android && window.Android.exit) window.Android.exit();
      else if (window.iOS) { home(); toast('Progress saved. Swipe up from the bottom of the screen to close the app.'); } // Apple does not allow apps to close themselves
      else { window.close(); setTimeout(() => toast('Close this browser tab to exit.'), 300); }
    });
  }
  function doPrint() {
    if (window.desktop && window.desktop.print) window.desktop.print();
    else if (window.Android && window.Android.print) window.Android.print();
    else if (window.iOS) window.iOS.print();
    else window.print();
  }

  // ---------- UI helpers ----------
  function bar(title, sub, opts) {
    opts = opts || {};
    return '<header class="bar">' +
      (opts.back ? '<button class="btn icon" data-act="back" aria-label="Back">' + I.back + '</button>' : '') +
      '<div style="flex:1;min-width:0"><h1>' + esc(title) + '</h1>' + (opts.subHtml ? '<div class="sub">' + opts.subHtml + '</div>' : sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>' +
      (opts.extra || '') +
      '<button class="btn" data-act="exit" aria-label="Exit app">' + I.exit + '<span class="lbl">Exit</span></button>' +
      '</header>';
  }
  function wireBar(onBack) {
    screen.querySelectorAll('[data-act="exit"]').forEach((b) => (b.onclick = exitApp));
    const bb = screen.querySelector('[data-act="back"]'); if (bb) bb.onclick = onBack;
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function modal(html, onMount) {
    const sc = document.createElement('div'); sc.className = 'scrim';
    sc.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    modalRoot.appendChild(sc);
    const close = () => sc.remove();
    sc.addEventListener('click', (e) => { if (e.target === sc) close(); });
    sc.querySelectorAll('[data-close]').forEach((b) => (b.onclick = close));
    if (onMount) onMount(sc, close);
    const f = sc.querySelector('input[type="text"]') || sc.querySelector('.actions .btn.primary') || sc.querySelector('button'); if (f) f.focus();
    return close;
  }
  function confirmBox(title, text, okLabel, onOk) {
    modal('<h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>' + esc(okLabel) + '</button></div>',
      (sc, close) => { sc.querySelector('[data-ok]').onclick = () => { close(); onOk(); }; });
  }
  function promptBox(title, label, value, okLabel, onOk) {
    modal('<h2>' + esc(title) + '</h2><div class="field"><label for="pb">' + esc(label) + '</label><input type="text" id="pb" maxlength="40" value="' + esc(value || '') + '"></div>' +
      '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>' + esc(okLabel) + '</button></div>',
    (sc, close) => {
      const inp = sc.querySelector('#pb'); const ok = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } close(); onOk(v); };
      sc.querySelector('[data-ok]').onclick = ok; inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
      setTimeout(() => { inp.focus(); inp.select(); }, 30);
    });
  }
  function busy(msg, onCancel) {
    const d = document.createElement('div'); d.className = 'loading';
    d.innerHTML = '<div>' + esc(msg) + (onCancel ? '<br><button class="btn" style="margin-top:12px">Cancel</button>' : '') + '</div>';
    document.body.appendChild(d);
    if (onCancel) d.querySelector('button').onclick = () => { d.remove(); onCancel(); };
    return () => d.remove();
  }
  function menu(anchor, items) {
    closePops();
    const m = document.createElement('div'); m.className = 'pop'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : '<button role="menuitem" data-i="' + i + '">' + esc(it[0]) + '</button>').join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = Math.min(r.bottom + 6, window.innerHeight - m.offsetHeight - 8) + 'px';
    m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    m.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; m.remove(); items[+b.dataset.i][1](); };
    setTimeout(() => document.addEventListener('pointerdown', closePopsOutside, { capture: true }), 0);
  }
  function closePops() { document.querySelectorAll('.pop').forEach((p) => p.remove()); document.removeEventListener('pointerdown', closePopsOutside, { capture: true }); }
  function closePopsOutside(e) { if (!e.target.closest('.pop')) closePops(); }
  const fmtTime = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  // ---------- navigation ----------
  let current = null; const history = [];
  function go(view, args, replace) {
    if (game && view !== 'puzzle') { game.stop(); }
    if (current && !replace) history.push(current);
    current = { view, args };
    closePops();
    VIEWS[view](args || {});
  }
  function back() {
    const prev = history.pop();
    if (!prev) return go('title', {}, true);
    if (game && prev.view !== 'puzzle') game.stop();
    current = prev; VIEWS[prev.view](prev.args || {});
  }
  function home() { history.length = 0; current = null; go('title', {}, true); }

  // ---------- views ----------
  const VERSES = [['Psalms', 119, 105, 'Thy word is a lamp unto my feet, and a light unto my path.'], ['Psalms', 46, 10, 'Be still, and know that I am God.'], ['Proverbs', 3, 5, 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.'], ['Isaiah', 40, 31, 'But they that wait upon the LORD shall renew their strength.'], ['Joshua', 1, 9, 'Be strong and of a good courage; be not afraid.'], ['Lamentations', 3, 23, 'They are new every morning: great is thy faithfulness.'], ['Matthew', 11, 28, 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.'], ['2 Timothy', 2, 15, 'Study to shew thyself approved unto God.']];
  const VIEWS = {};

  VIEWS.title = function () {
    const svs = Object.values(saves()).filter((s) => !s.done).sort((a, b) => b.updated - a.updated);
    const recent = svs[0];
    const done = records().length;
    const hl = store.get('hl', { folders: [], items: [] });
    const vd = VERSES[Math.floor(Date.now() / 86400000) % VERSES.length];
    const tiles = (words, goldAt) => '<div class="srow">' + words.split(' ').map((w, wi) => w.split('').map((c, k) => '<span class="st' + (goldAt && goldAt[0] === wi && goldAt[1] === k ? ' gold' : '') + '">' + c + '</span>').join('')).join('<span class="ssp"></span>') + '</div>';
    const markHtml = tiles('GIVE ME') + tiles('THE BIBLE', [1, 0]);
    screen.innerHTML =
      '<div class="title-screen"><div class="title-card">' +
      '<div class="title-mark" aria-hidden="true">' + markHtml + '</div>' +
      '<h1><small>Give Me the</small>Bible Crosswords</h1><p class="tag">King James Version</p>' +
      '<div class="who">' + I.user + '<span>Playing as <b>' + esc(profileName()) + '</b></span><button class="btn quiet" data-go="profiles">Switch player</button></div>' +
      '<nav class="menu-list">' +
      (recent ? '<button class="btn primary" data-go="continue"><span>Continue puzzle<small>' + esc(recent.title) + ' – ' + Math.round((recent.pct || 0) * 100) + '% filled</small></span></button>' : '') +
      '<button class="btn ' + (recent ? '' : 'primary') + '" data-go="library"><span>Puzzle library<small>200 themes from Genesis to Revelation, in two grid styles</small></span></button>' +
      '<button class="btn" data-go="random"><span>New random puzzle<small>A fresh crossword every time</small></span></button>' +
      '<button class="btn" data-go="saved"><span>Saved puzzles<small>' + plural(svs.length, 'puzzle') + ' in progress</small></span></button>' +
      '<button class="btn" data-go="record"><span>Completed puzzles<small>' + done + ' finished</small></span></button>' +
      '<button class="btn" data-go="bible"><span>Read the Bible<small>The complete King James Bible</small></span></button>' +
      '<button class="btn" data-go="highlights"><span>My highlights<small>' + plural(hl.items.length, 'verse') + ' saved in ' + plural(hl.folders.length, 'folder') + '</small></span></button>' +
      '<button class="btn" data-go="settings"><span>Settings<small>Letter hints, text size, colours, reset</small></span></button>' +
      '</nav>' +
      '<div class="title-foot">' +
      '<button class="btn" data-act="exit">' + I.exit + '<span class="lbl">Exit</span></button></div>' +
      '<div class="verse-of-day">“' + esc(vd[3]) + '”<cite>' + vd[0] + ' ' + vd[1] + ':' + vd[2] + '</cite></div>' +
      '</div></div>';
    wireBar();
    screen.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => {
      const g = b.dataset.go;
      if (g === 'continue') openSave(recent.key); else go(g);
    }));
  };

  // ----- profiles -----
  VIEWS.profiles = function () {
    const list = profiles();
    const stat = (id) => { const d = G.get('u.' + id + '.done', []); const s = Object.keys(G.get('u.' + id + '.saves', {})).length; return plural(d.length, 'puzzle') + ' completed, ' + s + ' in progress'; };
    screen.innerHTML = bar('Players', plural(list.length, 'player') + ' on this device', { back: true }) +
      '<div class="scroll"><div class="wrap" style="max-width:720px">' +
      '<p class="cat-sub">Each player has their own saved puzzles, completed record, highlights and settings.</p>' +
      '<div class="plist" style="grid-template-columns:1fr">' + list.map((p) =>
        '<div class="pitem" style="grid-template-columns:40px 1fr auto">' + '<span class="pnum">' + I.user + '</span>' +
        '<span><b>' + esc(p.name) + (p.id === pid ? ' <span class="badge">Playing now</span>' : '') + '</b><span class="d">' + stat(p.id) + '</span></span>' +
        '<span class="row-actions">' + (p.id !== pid ? '<button class="btn primary" data-play="' + p.id + '">Play as ' + esc(p.name) + '</button>' : '') +
        '<button class="btn icon" data-menu="' + p.id + '" aria-label="More for ' + esc(p.name) + '">' + I.more + '</button></span></div>').join('') + '</div>' +
      '<p style="margin-top:16px"><button class="btn primary" id="addp">' + I.plus + '<span>Add a player</span></button></p>' +
      '</div></div>';
    wireBar(back);
    $('#addp').onclick = () => promptBox('Add a player', 'Name', '', 'Add player', (name) => {
      const id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      const l = profiles(); l.push({ id, name, created: Date.now() }); G.set('profiles', l);
      switchProfile(id); toast('Welcome, ' + name + '!');
    });
    screen.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => { switchProfile(b.dataset.play); toast('Now playing as ' + profileName()); }));
    screen.querySelectorAll('[data-menu]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.menu; const p = profiles().find((x) => x.id === id);
      menu(b, [
        ['Rename', () => promptBox('Rename player', 'Name', p.name, 'Save', (name) => { const l = profiles(); l.find((x) => x.id === id).name = name; G.set('profiles', l); VIEWS.profiles(); })],
        ['Delete player', () => {
          if (profiles().length === 1) { toast('Add another player before deleting the only one.'); return; }
          confirmBox('Delete ' + p.name + '?', 'This removes their saved puzzles, completed record, highlights and settings from this device.', 'Delete player', () => {
            const l = profiles().filter((x) => x.id !== id); G.set('profiles', l);
            PER_PROFILE.forEach((k) => G.del('u.' + id + '.' + k));
            if (id === pid) switchProfile(l[0].id); else VIEWS.profiles();
          });
        }]
      ]);
    }));
  };
  function switchProfile(id) {
    if (game) { game.persist(); game.stop(); game = null; }
    pid = id; G.set('profile', id); loadSettings(); applyLook();
    history.length = 0; current = null; go('title', {}, true);
  }

  // ----- library -----
  VIEWS.library = function (args) {
    const cat = args.cat || store.get('libcat', 'law');
    const style = store.get('libstyle', 'news'); const ed = EDITIONS[style];
    const svs = saves(); const doneSet = new Set(records().map((r) => r.key));
    const c = CATS.find((x) => x.id === cat) || CATS[0];
    const list = ed.list.filter((p) => p.cat === c.id);
    const nDone = ed.list.filter((p) => doneSet.has(ed.prefix + p.id)).length;
    screen.innerHTML = bar('Puzzle library', '200 ' + ed.short.toLowerCase() + ' puzzles – ' + nDone + ' completed', { back: true }) +
      '<div class="tabs" role="tablist">' + CATS.map((x) => '<button class="tab" role="tab" aria-selected="' + (x.id === c.id) + '" data-cat="' + x.id + '">' + esc(x.name) + '</button>').join('') + '</div>' +
      '<div class="scroll"><div class="wrap">' +
      '<div class="stylebar"><span class="lab">Grid style</span><div class="seg" id="style">' + Object.keys(EDITIONS).map((k) => '<button data-v="' + k + '" aria-pressed="' + (k === style) + '">' + EDITIONS[k].name + '</button>').join('') + '</div><span class="help">' + esc(ed.help) + '</span></div>' +
      '<div class="cat-head">' + esc(c.name) + '</div><p class="cat-sub">' + esc(c.sub) + '</p><div class="plist">' +
      list.map((p) => {
        const key = ed.prefix + p.id; const s = svs[key];
        const st = doneSet.has(key) ? '<span class="pstat done">Completed</span>' : s ? '<span class="pstat prog">' + Math.round((s.pct || 0) * 100) + '%</span>' : '<span class="pstat">New</span>';
        return '<button class="pitem" data-id="' + p.id + '"><span class="pnum">' + p.id + '</span><span><b>' + esc(p.title) + '</b><span class="d">' + esc(p.desc) + '</span></span>' + st + '</button>';
      }).join('') + '</div></div></div>';
    wireBar(back);
    screen.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { store.set('libcat', b.dataset.cat); current.args = { cat: b.dataset.cat }; VIEWS.library({ cat: b.dataset.cat }); }));
    $('#style').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; store.set('libstyle', b.dataset.v); VIEWS.library({ cat: c.id }); };
    screen.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => openPremade(style, +b.dataset.id)));
  };

  // ----- random -----
  VIEWS.random = function () {
    const groups = CATS.map((c) => '<optgroup label="' + esc(c.name) + '">' + THEMES.filter((t) => t.cat === c.id).map((t) => '<option value="' + t.id + '">' + esc(t.title) + '</option>').join('') + '</optgroup>').join('');
    const last = Object.assign({ src: 'any', size: 'full', style: 'news' }, store.get('randomOpts', {}));
    screen.innerHTML = bar('New random puzzle', 'Infinite crosswords built from the KJV', { back: true }) +
      '<div class="scroll"><div class="wrap" style="max-width:640px"><div class="panel">' +
      '<div class="field"><span class="lab">Grid style</span><div class="seg" id="rstyle"><button data-v="news">Newspaper grid</button><button data-v="open">Open grid</button></div><span class="help" id="rstyleh"></span></div>' +
      '<div class="field"><label for="rsrc">Draw from</label><select id="rsrc"><option value="any">Any theme (surprise me)</option><option value="whole">All of Scripture</option>' + groups + '</select></div>' +
      '<div class="field"><span class="lab">Size</span><div class="seg" id="rsize"></div></div>' +
      '<button class="btn primary" id="rgo" style="width:100%;min-height:52px">Make my puzzle</button></div></div></div>';
    wireBar(back);
    const sel = $('#rsrc'); sel.value = last.src; let size = last.size, style = last.style;
    const SIZES = { news: [['full', 'Full 15×15 (40+ across, 40+ down)'], ['medium', 'Medium 13×13'], ['quick', 'Quick 11×11']], open: [['full', 'Full (40+ across, 40+ down)'], ['medium', 'Medium (25 + 25)'], ['quick', 'Quick (12 + 12)']] };
    const paint = () => {
      $('#rstyle').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === style));
      $('#rstyleh').textContent = EDITIONS[style].help + (style === 'news' ? ' Building one takes a few seconds.' : '');
      $('#rsize').innerHTML = SIZES[style].map((s) => '<button data-v="' + s[0] + '" aria-pressed="' + (s[0] === size) + '">' + s[1] + '</button>').join('');
    };
    paint();
    $('#rstyle').onclick = (e) => { const b = e.target.closest('button'); if (b) { style = b.dataset.v; paint(); } };
    $('#rsize').onclick = (e) => { const b = e.target.closest('button'); if (b) { size = b.dataset.v; paint(); } };
    $('#rgo').onclick = () => { store.set('randomOpts', { src: sel.value, size, style }); makeRandom(sel.value, size, style); };
  };

  // ----- saved -----
  VIEWS.saved = function () {
    const svs = Object.values(saves()).filter((s) => !s.done).sort((a, b) => b.updated - a.updated);
    screen.innerHTML = bar('Saved puzzles', plural(svs.length, 'puzzle') + ' in progress', { back: true }) +
      '<div class="scroll"><div class="wrap">' + (svs.length ? '<div class="plist">' + svs.map((s) =>
        '<div class="pitem" style="grid-template-columns:1fr auto auto"><button class="btn quiet" style="justify-content:flex-start;text-align:left" data-open="' + esc(s.key) + '"><span><b>' + esc(s.title) + '</b><span class="d">' + esc(s.sub || '') + ' – saved ' + fmtDate(s.updated) + ', ' + fmtTime(s.secs) + ' played</span></span></button>' +
        '<span class="pstat prog">' + Math.round((s.pct || 0) * 100) + '%</span><button class="btn icon quiet" aria-label="Delete save" data-del="' + esc(s.key) + '">' + I.close + '</button></div>').join('') + '</div>'
        : '<p class="empty">No puzzles in progress. Start one from the library or make a random puzzle; progress saves automatically.</p><button class="btn primary" data-go="library">Open the puzzle library</button>') +
      '</div></div>';
    wireBar(back);
    screen.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => openSave(b.dataset.open)));
    screen.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => confirmBox('Delete this saved puzzle?', 'Your progress on it will be lost.', 'Delete', () => { dropSave(b.dataset.del); VIEWS.saved(); })));
    const lg = screen.querySelector('[data-go]'); if (lg) lg.onclick = () => go('library');
  };

  // ----- record -----
  VIEWS.record = function () {
    const rec = records().slice().sort((a, b) => b.date - a.date);
    const solved = rec.filter((r) => !r.auto);
    const lib = new Set(solved.filter((r) => /^[pn]\d/.test(r.key)).map((r) => r.key)).size;
    const noHint = solved.filter((r) => !r.hints).length;
    const fulls = solved.filter((r) => r.full).map((r) => r.secs);
    const best = fulls.length ? Math.min.apply(null, fulls) : null;
    screen.innerHTML = bar('Completed puzzles', esc(profileName()) + '’s record', { back: true }) +
      '<div class="scroll"><div class="wrap">' +
      '<div class="stats"><div class="stat"><b>' + solved.length + '</b>puzzles solved</div><div class="stat"><b>' + lib + '/400</b>library puzzles solved</div><div class="stat"><b>' + noHint + '</b>solved without hints</div><div class="stat"><b>' + (best ? fmtTime(best) : '–') + '</b>fastest full-size</div><div class="stat"><b>' + (rec.length - solved.length) + '</b>auto-completed</div></div>' +
      (rec.length ? '<div style="overflow:auto"><table class="rec"><thead><tr><th>Puzzle</th><th>Result</th><th>Date</th><th>Time</th><th>Hints</th></tr></thead><tbody>' +
        rec.map((r) => '<tr><td>' + esc(r.title) + (r.style ? '<div class="d">' + esc(r.style) + '</div>' : '') + '</td><td>' + (r.auto ? '<span class="tag-auto">Auto-completed</span>' : '<span class="tag-solved">Solved</span>') + '</td><td>' + fmtDate(r.date) + '</td><td>' + fmtTime(r.secs) + '</td><td>' + (r.auto ? '–' : (r.hints || 0)) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="empty">Finished puzzles will be listed here with the date, your time and the hints you used.</p>') +
      (rec.length ? '<p style="margin-top:20px"><button class="btn" id="clr">Clear record</button></p>' : '') +
      '</div></div>';
    wireBar(back);
    const c = $('#clr'); if (c) c.onclick = () => confirmBox('Clear your completed record?', 'This removes the history of finished puzzles for ' + profileName() + '. Saved puzzles are kept.', 'Clear record', () => { store.set('done', []); VIEWS.record(); });
  };

  // ----- settings -----
  VIEWS.settings = function () {
    const seg = (id, val, opts) => '<div class="seg" data-key="' + id + '">' + opts.map((o) => '<button data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + o[1] + '</button>').join('') + '</div>';
    screen.innerHTML = bar('Settings', 'For ' + profileName(), { back: true }) +
      '<div class="scroll"><div class="wrap" style="max-width:720px">' +
      '<div class="panel"><h2>Hints and checking</h2>' +
      '<div class="field"><span class="lab">Letter hints when a puzzle starts</span>' + seg('letterHints', settings.letterHints, [['off', 'Off'], ['first', 'First letter of every answer'], ['some', 'A few letters in each answer']]) +
      '<span class="help">Applies to puzzles you start (or restart) from now on. You can also reveal a letter at any time from the Hints button.</span></div>' +
      '<div class="field"><span class="lab">Show wrong letters in red as I type</span>' + seg('autoCheck', settings.autoCheck, [[true, 'On'], [false, 'Off']]) + '</div>' +
      '<div class="field"><span class="lab">Hide the answer when previewing a verse</span>' + seg('maskVerse', settings.maskVerse, [[true, 'Hide it'], [false, 'Show the full verse']]) + '</div>' +
      '<div class="field"><span class="lab">Skip letters already filled in</span>' + seg('skipFilled', settings.skipFilled, [[true, 'On'], [false, 'Off']]) + '</div></div>' +
      '<div class="panel"><h2>Display</h2>' +
      '<div class="field"><span class="lab">Colours</span>' + seg('theme', settings.theme, [['light', 'Daylight'], ['dark', 'Evening']]) + '</div>' +
      '<div class="field"><span class="lab">Text size</span>' + seg('size', settings.size, [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']]) + '</div>' +
      '<div class="field"><span class="lab">On-screen keyboard</span>' + seg('keyboard', settings.keyboard, [['auto', 'Automatic'], ['on', 'Always'], ['off', 'Never']]) + '<span class="help">Automatic shows it on touch screens.</span></div></div>' +
      '<div class="panel"><h2>Reset</h2><p class="help" style="margin-top:0">These affect only ' + esc(profileName()) + '. Other players are not changed.</p>' +
      '<div class="btnrow"><button class="btn" id="resetGame">Reset the entire game</button><button class="btn" id="resetHl">Delete all highlights</button><button class="btn" id="players">' + I.user + '<span>Manage players</span></button></div></div>' +
      '<div class="panel"><h2>About</h2><p>Scripture: King James Version, the 66 books of the Old and New Testaments. Fonts: Atkinson Hyperlegible and EB Garamond (SIL Open Font License).</p>' +
      '</div>' +
      '</div></div>';
    wireBar(back);
    screen.querySelectorAll('.seg[data-key]').forEach((sg) => (sg.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const k = sg.dataset.key; let v = b.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      sg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      settings[k] = v; saveSettings(); applyLook();
    }));
    $('#resetGame').onclick = () => confirmBox('Reset the entire game?', 'This erases every saved puzzle, your completed record and your random-puzzle count for ' + profileName() + '. Highlights and settings are kept.', 'Reset game', () => { store.set('saves', {}); store.set('done', []); store.set('randomCount', 0); toast('Game reset. Every puzzle is new again.'); });
    $('#resetHl').onclick = () => confirmBox('Delete all highlights?', 'Every highlighted verse and folder for ' + profileName() + ' will be removed.', 'Delete highlights', () => { store.set('hl', { folders: [], items: [] }); toast('Highlights deleted'); });
    $('#players').onclick = () => go('profiles');
  };

  // ---------- highlights ----------
  const HL_COLORS = [['yellow', 'Yellow'], ['green', 'Green'], ['blue', 'Blue'], ['pink', 'Pink'], ['orange', 'Orange'], ['purple', 'Purple'], ['teal', 'Teal'], ['red', 'Red'], ['lavender', 'Lavender'], ['gray', 'Gray']];
  const colorName = (c) => (HL_COLORS.find((x) => x[0] === c) || [c, c])[1];
  function hlData() { const d = store.get('hl', null) || { folders: [], items: [] }; return d; }
  function hlSave(d) { store.set('hl', d); }
  function hlColorOf(d) { const m = {}; d.items.forEach((it) => { if (!m[it.v] || m[it.v].t < it.t) m[it.v] = it; }); return m; }

  // ---------- Bible reader ----------
  VIEWS.bible = function (args) {
    const stop = busy('Opening the Bible…');
    loadKJV().then(() => { stop(); renderBible(args); }).catch(() => { stop(); toast('The Bible text could not be loaded.'); });
  };
  let selected = new Set();
  function renderBible(args) {
    const pos = Object.assign({ b: 0, c: 1, hl: null }, store.get('readerPos', {}), args);
    const fromPuzzle = !!args.fromPuzzle;
    const nCh = window.KJV[pos.b].length;
    selected = new Set();
    screen.innerHTML = bar('Holy Bible', 'King James Version', { back: true, extra: (fromPuzzle ? '<button class="btn" data-act="topuzzle">' + I.back + '<span class="lbl">Back to puzzle</span></button>' : '') + '<button class="btn" data-act="hls">' + I.marker + '<span class="lbl">My highlights</span></button>' }) +
      '<div class="reader-tools"><select id="rb" aria-label="Book"><optgroup label="Old Testament">' + BOOKS.slice(0, 39).map((n, i) => '<option value="' + i + '">' + n + '</option>').join('') +
      '</optgroup><optgroup label="New Testament">' + BOOKS.slice(39).map((n, i) => '<option value="' + (i + 39) + '">' + n + '</option>').join('') + '</optgroup></select>' +
      '<select id="rc" aria-label="Chapter">' + Array.from({ length: nCh }, (_, i) => '<option value="' + (i + 1) + '">Chapter ' + (i + 1) + '</option>').join('') + '</select>' +
      '<input class="grow" type="search" id="rs" placeholder="Search the Bible (e.g. still waters)" aria-label="Search the Bible"></div>' +
      '<div class="scroll" id="rbody"></div><div class="selbar" id="selbar" hidden></div>';
    wireBar(back);
    const tp = screen.querySelector('[data-act="topuzzle"]'); if (tp) tp.onclick = back;
    screen.querySelector('[data-act="hls"]').onclick = () => go('highlights');
    $('#rb').value = pos.b; $('#rc').value = pos.c;
    $('#rb').onchange = (e) => { current.args = { b: +e.target.value, c: 1, fromPuzzle }; renderBible(current.args); };
    $('#rc').onchange = (e) => { current.args = { b: pos.b, c: +e.target.value, fromPuzzle }; renderBible(current.args); };
    $('#rs').onkeydown = (e) => { if (e.key === 'Enter') searchBible(e.target.value, fromPuzzle); };
    store.set('readerPos', { b: pos.b, c: pos.c });
    const verses = window.KJV[pos.b][pos.c - 1];
    const base = bible.id(pos.b, pos.c, 1);
    const colors = hlColorOf(hlData());
    const body = $('#rbody');
    body.innerHTML = '<article class="chapter"><h2>' + BOOKS[pos.b] + ' ' + pos.c + '</h2><p class="help reader-help">Tap verses to select them, then highlight and save them to a folder.</p>' +
      verses.map((t, i) => { const id = base + i; const col = colors[id]; return '<p class="v' + (pos.hl && i + 1 >= pos.hl[0] && i + 1 <= pos.hl[1] ? ' hl' : '') + (col ? ' mark-' + col.c : '') + '" id="v' + (i + 1) + '" data-id="' + id + '"><sup>' + (i + 1) + '</sup>' + esc(t) + '</p>'; }).join('') +
      '<div class="chapter-nav"><button class="btn" id="pc">' + I.prev + '<span>Previous chapter</span></button><button class="btn" id="nc"><span>Next chapter</span>' + I.next + '</button></div></article>';
    body.onclick = (e) => {
      const p = e.target.closest('p.v'); if (!p) return;
      const id = +p.dataset.id;
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      p.classList.toggle('sel', selected.has(id));
      updateSelBar();
    };
    const step = (d) => {
      let b = pos.b, c = pos.c + d;
      if (c < 1) { b--; if (b < 0) return; c = window.KJV[b].length; }
      if (c > window.KJV[b].length) { b++; if (b >= 66) return; c = 1; }
      current.args = { b, c, fromPuzzle }; renderBible(current.args);
    };
    $('#pc').onclick = () => step(-1); $('#nc').onclick = () => step(1);
    if (pos.hl) { const el = $('#v' + pos.hl[0]); if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 30); } else body.scrollTop = 0;
  }
  function updateSelBar() {
    const sb = $('#selbar'); if (!sb) return;
    if (!selected.size) { sb.hidden = true; return; }
    const colors = hlColorOf(hlData()); const anyMarked = Array.from(selected).some((id) => colors[id]);
    sb.hidden = false;
    sb.innerHTML = '<span><b>' + plural(selected.size, 'verse') + '</b> selected</span>' +
      '<button class="btn primary" id="hlsave">' + I.marker + '<span>Highlight and save</span></button>' +
      (anyMarked ? '<button class="btn" id="hlrem">Remove highlight</button>' : '') +
      '<button class="btn" id="hlcancel">Cancel</button>';
    $('#hlsave').onclick = () => highlightDialog(Array.from(selected), () => { const a = current.args; renderBible(Object.assign({}, a, { hl: null })); });
    const rm = $('#hlrem'); if (rm) rm.onclick = () => { const d = hlData(); d.items = d.items.filter((it) => !selected.has(it.v)); hlSave(d); toast('Highlight removed'); renderBible(Object.assign({}, current.args, { hl: null })); };
    $('#hlcancel').onclick = () => { selected.clear(); document.querySelectorAll('p.v.sel').forEach((p) => p.classList.remove('sel')); updateSelBar(); };
  }
  function highlightDialog(ids, done) {
    const d = hlData();
    const last = store.get('hlLast', { c: 'yellow', f: d.folders.length ? d.folders[0].id : '' });
    modal('<h2>Highlight ' + plural(ids.length, 'verse') + '</h2>' +
      '<div class="field"><span class="lab">Colour</span><div class="seg swatches" id="hlc">' + HL_COLORS.map((c) => '<button data-v="' + c[0] + '" aria-pressed="' + (c[0] === last.c) + '"><i class="chip-' + c[0] + '"></i>' + c[1] + '</button>').join('') + '</div></div>' +
      '<div class="field"><label for="hlf">Save in folder</label><select id="hlf">' + d.folders.map((f) => '<option value="' + f.id + '">' + esc(f.name) + '</option>').join('') + '<option value="__new">New folder…</option></select></div>' +
      '<div class="field" id="newf" hidden><label for="hln">New folder name</label><input type="text" id="hln" maxlength="40" placeholder="e.g. Promises of God"></div>' +
      '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Save highlight</button></div>',
    (sc, close) => {
      let color = last.c;
      const fsel = sc.querySelector('#hlf'); fsel.value = d.folders.some((f) => f.id === last.f) ? last.f : (d.folders.length ? d.folders[0].id : '__new');
      const showNew = () => { sc.querySelector('#newf').hidden = fsel.value !== '__new'; if (fsel.value === '__new') sc.querySelector('#hln').focus(); };
      showNew(); fsel.onchange = showNew;
      sc.querySelector('#hlc').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; color = b.dataset.v; sc.querySelectorAll('#hlc button').forEach((x) => x.setAttribute('aria-pressed', x === b)); };
      sc.querySelector('[data-ok]').onclick = () => {
        let fid = fsel.value;
        if (fid === '__new') {
          const name = sc.querySelector('#hln').value.trim(); if (!name) { sc.querySelector('#hln').focus(); return; }
          fid = 'f' + Date.now().toString(36); d.folders.push({ id: fid, name, created: Date.now() });
        }
        const t = Date.now();
        ids.forEach((v) => {
          const ex = d.items.find((it) => it.v === v && it.f === fid);
          if (ex) { ex.c = color; ex.t = t; } else d.items.push({ v, f: fid, c: color, t });
        });
        hlSave(d); store.set('hlLast', { c: color, f: fid });
        close(); toast(plural(ids.length, 'verse') + ' saved to “' + d.folders.find((f) => f.id === fid).name + '”'); done();
      };
    });
  }
  function searchBible(q, fromPuzzle) {
    q = q.trim(); if (q.length < 2) return;
    const words = q.toLowerCase().split(/\s+/);
    const res = [];
    for (let i = 0; i < bible.N && res.length < 300; i++) {
      const t = bible.text[i].toLowerCase();
      if (words.every((w) => t.indexOf(w) >= 0)) res.push(i);
    }
    const body = $('#rbody'); selected.clear(); updateSelBar();
    body.onclick = null;
    body.innerHTML = '<div class="results"><p><b>' + res.length + (res.length >= 300 ? '+' : '') + '</b> ' + (res.length === 1 ? 'verse contains' : 'verses contain') + ' “' + esc(q) + '”.</p>' +
      res.map((id) => '<button class="result" data-id="' + id + '"><b>' + vref(id) + '</b><br><span>' + esc(bible.text[id]) + '</span></button>').join('') + '</div>';
    body.scrollTop = 0;
    body.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => {
      const id = +b.dataset.id; current.args = { b: bible.vb[id], c: bible.vc[id], hl: [bible.vv[id], bible.vv[id]], fromPuzzle }; renderBible(current.args);
    }));
  }

  // ----- highlights screens -----
  VIEWS.highlights = function () {
    loadKJV().then(() => {
      const d = hlData();
      const count = (fid) => d.items.filter((it) => it.f === fid).length;
      screen.innerHTML = bar('My highlights', plural(d.items.length, 'highlighted verse'), { back: true }) +
        '<div class="scroll"><div class="wrap" style="max-width:820px">' +
        (d.folders.length ? '<div class="plist">' + d.folders.map((f) =>
          '<button class="pitem" data-f="' + f.id + '"><span class="pnum">' + I.marker + '</span><span><b>' + esc(f.name) + '</b><span class="d">' + plural(count(f.id), 'verse') + '</span></span><span class="pstat">Open</span></button>').join('') + '</div>' +
          '<div class="btnrow" style="margin-top:16px"><button class="btn primary" id="allpz">Make a crossword from all my highlights</button><button class="btn" id="exportall">' + I.save + '<span>Export highlights</span></button><button class="btn" id="newfold">' + I.plus + '<span>New folder</span></button></div>'
          : '<p class="empty">You have no highlights yet. Open the Bible, tap one or more verses, then choose “Highlight and save” to keep them in a folder.</p><div class="btnrow"><button class="btn primary" id="openb">' + I.book + '<span>Open the Bible</span></button><button class="btn" id="newfold">' + I.plus + '<span>New folder</span></button></div>') +
        '</div></div>';
      wireBar(back);
      screen.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => go('folder', { f: b.dataset.f })));
      const nf = $('#newfold'); if (nf) nf.onclick = () => promptBox('New folder', 'Folder name', '', 'Create folder', (name) => { const dd = hlData(); dd.folders.push({ id: 'f' + Date.now().toString(36), name, created: Date.now() }); hlSave(dd); VIEWS.highlights(); });
      const ob = $('#openb'); if (ob) ob.onclick = () => go('bible');
      const ap = $('#allpz'); if (ap) ap.onclick = () => makeHighlightPuzzle(Array.from(new Set(d.items.map((it) => it.v))), 'All my highlights');
      const ex = $('#exportall'); if (ex) ex.onclick = () => exportDialog(null);
    });
  };
  VIEWS.folder = function (args) {
    loadKJV().then(() => {
      const d = hlData(); const f = d.folders.find((x) => x.id === args.f);
      if (!f) { back(); return; }
      const items = d.items.filter((it) => it.f === f.id).sort((a, b) => a.v - b.v);
      screen.innerHTML = bar(f.name, plural(items.length, 'highlighted verse'), { back: true, extra: '<button class="btn icon" id="fmenu" aria-label="Folder options">' + I.more + '</button>' }) +
        '<div class="scroll"><div class="wrap" style="max-width:820px">' +
        (items.length ? '<div class="btnrow" style="margin-bottom:14px"><button class="btn primary" id="mkpz">Make a crossword from these verses</button><button class="btn" id="exportf">' + I.save + '<span>Export this folder</span></button></div>' +
          items.map((it) => '<div class="hlv mark-' + it.c + '"><div class="hlv-top"><button class="ref" data-open="' + it.v + '">' + vref(it.v) + '</button><span class="row-actions"><button class="btn quiet colorbtn" data-col="' + it.v + '" aria-label="Change colour"><i class="chip-' + it.c + '"></i>' + colorName(it.c) + '</button><button class="btn icon quiet" data-rm="' + it.v + '" aria-label="Remove from folder">' + I.close + '</button></span></div><p class="scripture">' + esc(bible.text[it.v]) + '</p></div>').join('')
          : '<p class="empty">This folder is empty. Highlight verses in the Bible and choose this folder to add them.</p><button class="btn primary" id="openb">' + I.book + '<span>Open the Bible</span></button>') +
        '</div></div>';
      wireBar(back);
      const ob = $('#openb'); if (ob) ob.onclick = () => go('bible');
      screen.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => { const id = +b.dataset.open; go('bible', { b: bible.vb[id], c: bible.vc[id], hl: [bible.vv[id], bible.vv[id]] }); }));
      screen.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { const dd = hlData(); dd.items = dd.items.filter((it) => !(it.f === f.id && it.v === +b.dataset.rm)); hlSave(dd); VIEWS.folder(args); }));
      const mk = $('#mkpz'); if (mk) mk.onclick = () => makeHighlightPuzzle(items.map((it) => it.v), f.name);
      const exf = $('#exportf'); if (exf) exf.onclick = () => exportDialog(f.id);
      screen.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => menu(b, HL_COLORS.map((c) => [c[1], () => {
        const dd = hlData(); const it = dd.items.find((x) => x.f === f.id && x.v === +b.dataset.col); if (it) { it.c = c[0]; it.t = Date.now(); hlSave(dd); } VIEWS.folder(args);
      }]))));
      $('#fmenu').onclick = (e) => menu(e.currentTarget, [
        ['Rename folder', () => promptBox('Rename folder', 'Folder name', f.name, 'Save', (name) => { const dd = hlData(); dd.folders.find((x) => x.id === f.id).name = name; hlSave(dd); VIEWS.folder(args); })],
        ['Delete folder', () => confirmBox('Delete “' + f.name + '”?', 'The folder and its highlights will be removed.', 'Delete folder', () => { const dd = hlData(); dd.folders = dd.folders.filter((x) => x.id !== f.id); dd.items = dd.items.filter((it) => it.f !== f.id); hlSave(dd); back(); })]
      ]);
    });
  };
  // ----- exporting highlights -----
  function exportDialog(folderId) {
    const d = hlData();
    const folders = folderId ? d.folders.filter((f) => f.id === folderId) : d.folders;
    const count = d.items.filter((it) => folders.some((f) => f.id === it.f)).length;
    const canShare = !!((window.Android && window.Android.shareText) || window.iOS);
    modal('<h2>Export highlights</h2><p>' + plural(count, 'verse') + ' from ' + (folderId ? '\u201C' + esc(folders[0].name) + '\u201D' : plural(folders.length, 'folder')) + '.</p>' +
      '<div class="field"><span class="lab">Format</span><div class="seg" id="exfmt"><button data-v="txt" aria-pressed="true">Text document (.txt)</button><button data-v="csv" aria-pressed="false">Spreadsheet (.csv)</button></div>' +
      '<span class="help">Text is easy to read, print or paste into notes. The spreadsheet opens in Excel, Google Sheets or Numbers.</span></div>' +
      '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn" id="excopy">Copy to clipboard</button>' + (canShare ? '<button class="btn" id="exshare">Share\u2026</button>' : '') + '<button class="btn primary" id="exsave">' + I.save + 'Save file</button></div>',
    (sc, close) => {
      let fmt = 'txt';
      sc.querySelector('#exfmt').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; fmt = b.dataset.v; sc.querySelectorAll('#exfmt button').forEach((x) => x.setAttribute('aria-pressed', x === b)); };
      const build = () => buildExport(folders, fmt);
      const fname = () => 'Bible-highlights' + (folderId ? '-' + folders[0].name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') : '') + '.' + fmt;
      sc.querySelector('#exsave').onclick = () => { saveTextFile(fname(), build(), fmt === 'csv' ? 'text/csv' : 'text/plain'); close(); };
      sc.querySelector('#excopy').onclick = () => { copyText(build()); close(); };
      const sh = sc.querySelector('#exshare'); if (sh) sh.onclick = () => { (window.iOS || window.Android).shareText(folderId ? folders[0].name : 'My Bible highlights', build()); close(); };
    });
  }
  function buildExport(folders, fmt) {
    const d = hlData();
    if (fmt === 'csv') {
      const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const rows = [['Folder', 'Reference', 'Book', 'Chapter', 'Verse', 'Colour', 'Highlighted on', 'Text']];
      folders.forEach((f) => d.items.filter((it) => it.f === f.id).sort((a, b) => a.v - b.v).forEach((it) => rows.push([f.name, vref(it.v), BOOKS[bible.vb[it.v]], bible.vc[it.v], bible.vv[it.v], colorName(it.c), new Date(it.t).toISOString().slice(0, 10), bible.text[it.v]])));
      return '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
    }
    let out = 'My Bible Highlights \u2013 King James Version\r\n' + profileName() + ' \u2013 exported ' + fmtDate(Date.now()) + '\r\n';
    folders.forEach((f) => {
      const items = d.items.filter((it) => it.f === f.id).sort((a, b) => a.v - b.v);
      out += '\r\n' + f.name.toUpperCase() + ' (' + plural(items.length, 'verse') + ')\r\n' + '-'.repeat(Math.min(60, f.name.length + 12)) + '\r\n';
      items.forEach((it) => { out += '\r\n' + vref(it.v) + '  [' + colorName(it.c) + ']\r\n' + bible.text[it.v] + '\r\n'; });
    });
    return out;
  }
  function saveTextFile(name, text, mime) {
    if (window.desktop && window.desktop.saveFile) {
      window.desktop.saveFile(name, text).then((p) => { if (p) toast('Saved to ' + p); }).catch(() => toast('The file could not be saved.'));
    } else if (window.Android && window.Android.saveText) {
      window.Android.saveText(name, mime, text); // opens Android's "save to" picker
    } else if (window.iOS) {
      window.iOS.saveText(name, mime, text); // opens the iOS "Save to Files" picker
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Downloaded ' + name);
    }
  }
  function copyText(text) {
    const fallback = () => { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } t.remove(); toast(ok ? 'Copied to the clipboard' : 'Copying is not available here.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Copied to the clipboard'), fallback); else fallback();
  }
  window.onAndroidSaved = function (ok) { toast(ok ? 'Highlights saved' : 'The file was not saved.'); };

  function makeHighlightPuzzle(ids, name) {
    if (ids.length < 2) { toast('Highlight at least 2 verses to make a crossword.'); return; }
    const stop = busy('Building a crossword from your verses…');
    setTimeout(() => loadKJV().then(() => {
      const theme = { title: name, ids: ids };
      const sizes = [[40, 40, 27], [30, 30, 25], [22, 22, 21], [15, 15, 19], [10, 10, 15], [7, 7, 13], [5, 5, 11], [3, 3, 11], [2, 2, 9]];
      let res = null;
      for (const s of sizes) {
        for (let tr = 0; tr < 3 && !(res && res.ok); tr++) {
          res = CWMaker.makePuzzle(bible, [], theme, { seed: (Math.random() * 4294967295) >>> 0, minA: s[0], minD: s[1], maxW: s[2], maxH: s[2], attempts: 3, extra: 2, noGiveaway: true });
        }
        if (res && res.ok) break;
      }
      stop();
      if (!res || !res.ok || res.words.length < 4) { toast('These verses don’t have enough words for a crossword yet. Add a few more verses.'); return; }
      const puz = { key: 'h' + Date.now().toString(36), title: 'Highlights: ' + name, sub: plural(ids.length, 'highlighted verse'), random: true, w: res.w, h: res.h, rows: res.rows,
        words: res.words.map((x) => ({ n: x.n, d: x.d, r: x.r, c: x.c, a: x.a, en: x.en === String(x.a.length) ? '' : x.en, q: x.q, ref: x.ref })) };
      go('puzzle', { puz });
    }).catch((e) => { stop(); toast('Could not build a puzzle: ' + e.message); }), 40);
  }

  // ---------- verse popup ----------
  function showVerse(word) {
    loadKJV().then(() => {
      const r = word.ref; const b = r[0], c = r[1], v1 = r[2], v2 = r[3] || r[2];
      let phrase = word.a.toLowerCase();
      if (word.en && word.en.indexOf(',') > 0) { let p = 0; phrase = word.en.split(',').map((n) => { const s = word.a.slice(p, p + +n); p += +n; return s; }).join(' ').toLowerCase(); }
      const solved = game && game.wordSolved(word);
      const mask = settings.maskVerse && !solved;
      const pat = new RegExp('(^|[^A-Za-z])(' + phrase.split(' ').join('\\s+') + ')(?![A-Za-z])', 'gi');
      const render = (m) => {
        let html = '';
        for (let v = v1; v <= v2; v++) {
          let t = esc(window.KJV[b][c - 1][v - 1]);
          if (m) t = t.replace(pat, (all, p1) => p1 + '<span class="mask">' + '_'.repeat(word.a.length).split('').join(' ') + '</span>');
          html += '<sup>' + v + '</sup>' + t + ' ';
        }
        return html;
      };
      modal('<h2>' + esc(refStr(r)) + '</h2><div class="scripture" id="vtext">' + render(mask) + '</div>' +
        '<div class="actions">' + (mask ? '<button class="btn" data-show>Show the hidden word</button>' : '') +
        '<button class="btn" data-close>Close</button><button class="btn primary" data-open>' + I.book + 'Open chapter</button></div>',
      (sc, close) => {
        const sb = sc.querySelector('[data-show]');
        if (sb) sb.onclick = () => { sc.querySelector('#vtext').innerHTML = render(false); sb.remove(); if (game) game.noteHint(); };
        sc.querySelector('[data-open]').onclick = () => { close(); if (game) game.persist(); go('bible', { b, c, hl: [v1, v2], fromPuzzle: !!game }); };
      });
    }).catch(() => toast('The Bible text could not be loaded.'));
  }

  // ---------- puzzle opening ----------
  function puzzleFromPremade(style, p) {
    const ed = EDITIONS[style];
    return { key: ed.prefix + p.id, title: p.title, sub: ed.short + ' puzzle ' + p.id + ' of 200', style: ed.name, dense: style === 'news', w: p.w, h: p.h, rows: p.rows,
      words: p.words.map((x) => ({ n: x[0], d: x[1], r: x[2], c: x[3], a: x[4], en: x[5] || '', q: x[6], ref: x[7] })) };
  }
  function findPremade(key) {
    for (const st in EDITIONS) { const ed = EDITIONS[st]; if (key[0] === ed.prefix) { const p = ed.list.find((x) => ed.prefix + x.id === key); if (p) return puzzleFromPremade(st, p); } }
    return null;
  }
  function validSave(puz, s) { return s && s.entries && s.entries.length === puz.w * puz.h && (!s.sig || s.sig === sig(puz)) && (s.sig || puz.random); }
  function openPremade(style, id) {
    const p = EDITIONS[style].list.find((x) => x.id === id); if (!p) return;
    const puz = puzzleFromPremade(style, p);
    let s = saves()[puz.key];
    if (s && !validSave(puz, s)) { dropSave(puz.key); s = null; }
    const isDone = records().some((r) => r.key === puz.key);
    if (isDone && !s) {
      modal('<h2>' + esc(p.title) + '</h2><p>You have completed this puzzle. Would you like to solve it again?</p><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Solve again</button></div>',
        (sc, close) => { sc.querySelector('[data-ok]').onclick = () => { close(); go('puzzle', { puz }); }; });
      return;
    }
    go('puzzle', { puz, save: s });
  }
  function openSave(key) {
    const s = saves()[key]; if (!s) return;
    const puz = /^[pn]\d/.test(key) ? findPremade(key) : s.puz;
    if (!puz || !validSave(puz, s)) { dropSave(key); toast('That puzzle was updated, so it starts fresh.'); if (puz) go('puzzle', { puz }); return; }
    go('puzzle', { puz, save: s });
  }

  // Newspaper-style grids are built in a background worker so the screen stays responsive.
  let denseWorker = null;
  function denseInWorker(words, opts) {
    return new Promise((resolve, reject) => {
      let w;
      try {
        if (!denseWorker) {
          const src = 'var RNG=' + CWEngine.RNG.toString() + ';var D=(' + CWDense.factory.toString() + ')();' +
            'onmessage=function(e){var o=e.data.opts;o.rng=RNG(o.seed);var r=D.build(e.data.words,o);postMessage(r);};';
          denseWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
        }
        w = denseWorker;
      } catch (e) { denseWorker = null; }
      if (!w) { // fall back to the main thread
        setTimeout(() => { const o = Object.assign({}, opts, { rng: CWEngine.RNG(opts.seed) }); resolve(CWDense.build(words, o)); }, 30);
        return;
      }
      w.onmessage = (e) => resolve(e.data);
      w.onerror = (e) => { e.preventDefault(); denseWorker = null; reject(new Error('worker failed')); };
      w.postMessage({ words, opts });
    });
  }
  function cancelDense() { if (denseWorker) { denseWorker.terminate(); denseWorker = null; } }

  function makeRandom(src, size, style) {
    let cancelled = false;
    const stop = busy(style === 'news' ? 'Building your newspaper-style crossword…' : 'Building your crossword…', () => { cancelled = true; cancelDense(); });
    let theme;
    if (src === 'whole') theme = { title: 'All of Scripture', whole: true, desc: '' };
    else if (src === 'any') theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    else theme = THEMES.find((t) => String(t.id) === String(src)) || THEMES[0];
    const finish = (res, st) => {
      stop();
      if (!res) { toast('That theme could not make a puzzle. Try another.'); return; }
      const n = store.get('randomCount', 0) + 1; store.set('randomCount', n);
      const puz = { key: 'r' + Date.now().toString(36), title: 'Random: ' + theme.title, sub: 'Random puzzle no. ' + n, style: EDITIONS[st].name, dense: st === 'news', random: true, w: res.w, h: res.h, rows: res.rows,
        words: res.words.map((x) => ({ n: x.n, d: x.d, r: x.r, c: x.c, a: x.a, en: x.en === String(x.a.length) ? '' : x.en, q: x.q, ref: x.ref })) };
      go('puzzle', { puz });
    };
    const openStyle = () => {
      const curated = makeRandom.cur || (makeRandom.cur = CWMaker.prepareCurated(bible, window.CURATED));
      const dims = { full: [40, 40, 27], medium: [25, 25, 21], quick: [12, 12, 15] }[size] || [40, 40, 27];
      let res = null;
      for (let i = 0; i < 6 && !(res && res.ok); i++) {
        const seed = (Math.random() * 4294967295) >>> 0;
        res = CWMaker.makePuzzle(bible, curated, theme, { seed, minA: dims[0], minD: dims[1], maxW: dims[2] + (i > 2 ? 2 : 0), maxH: dims[2] + (i > 2 ? 2 : 0), attempts: 4, extra: 2, curatedShare: 0.6 });
      }
      return res;
    };
    setTimeout(() => {
      loadKJV().then(() => {
        if (style !== 'news') { finish(openStyle(), 'open'); return; }
        const curated = makeRandom.cur || (makeRandom.cur = CWMaker.prepareCurated(bible, window.CURATED));
        const N = { full: 15, medium: 13, quick: 11 }[size] || 15;
        const minAD = { 15: 40, 13: 26, 11: 18 }[N];
        const seed = (Math.random() * 4294967295) >>> 0;
        const opts = { seed, W: N, H: N, minA: minAD, minD: minAD, ratio: 0.22, maxLen: N === 11 ? 5 : 6, maxOpen: N === 15 ? 3 : 2, timeMs: 700, restarts: 3, totalMs: 45000, patterns: 400, wScore: 0.25 };
        const prep = CWMaker.denseWords(bible, curated, theme, opts);
        const tryOnce = (attempt) => denseInWorker(prep.words.map((w) => ({ a: w.a, s: w.s })), Object.assign({}, opts, { seed: seed + attempt * 7919 })).then((fill) => {
          if (cancelled) return;
          const res = fill ? CWMaker.finishDense(bible, fill, prep, opts) : null;
          if (res && res.ok) finish(res, 'news');
          else if (attempt < 1) tryOnce(attempt + 1);
          else { toast('A newspaper grid didn’t come together this time, so here is an open-grid puzzle instead.'); finish(openStyle(), 'open'); }
        });
        tryOnce(0).catch(() => { if (!cancelled) finish(openStyle(), 'open'); });
      }).catch((e) => { stop(); toast('Could not build a puzzle: ' + e.message); });
    }, 40);
  }

  // ---------- printing ----------
  function printPuzzle(puz, withAnswers) {
    let root = document.getElementById('print-root');
    if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    const W = puz.w, H = puz.h; const sol = puz.rows.join('');
    const numAt = {}; puz.words.forEach((w) => { numAt[w.r * W + w.c] = w.n; });
    const cellIn = Math.min(0.42, 7.2 / W);
    let g = '<table class="pgrid' + (puz.dense ? ' pnews' : '') + '" style="--pc:' + cellIn + 'in">';
    for (let r = 0; r < H; r++) {
      g += '<tr>';
      for (let c = 0; c < W; c++) {
        const i = r * W + c; const ch = sol[i];
        if (ch === '.') g += '<td class="' + (puz.dense ? 'pb' : 'pe') + '"></td>';
        else g += '<td class="pl">' + (numAt[i] ? '<span>' + numAt[i] + '</span>' : '') + (withAnswers ? '<b>' + ch + '</b>' : '') + '</td>';
      }
      g += '</tr>';
    }
    g += '</table>';
    const clues = (d) => puz.words.filter((w) => w.d === d).map((w) => '<li><b>' + w.n + '</b> ' + esc(w.q) + ' (' + esc(w.en || String(w.a.length)) + ') <i>' + esc(refStr(w.ref)) + '</i>' + (withAnswers ? ' <u>' + w.a + '</u>' : '') + '</li>').join('');
    root.innerHTML = '<h1>' + esc(puz.title) + (withAnswers ? ' – Answer key' : '') + '</h1><p class="psub">Give Me the Bible Crosswords – King James Version' + (puz.style ? ' – ' + esc(puz.style) : '') + '</p>' + g +
      '<div class="pclues"><h2>Across</h2><ol>' + clues('A') + '</ol><h2>Down</h2><ol>' + clues('D') + '</ol></div>';
    setTimeout(doPrint, 60);
  }

  // ---------- the game ----------
  let game = null;
  VIEWS.puzzle = function (args) {
    if (game && game.puz.key === args.puz.key) { game.mount(); return; }
    if (game) game.stop();
    game = new Game(args.puz, args.save);
    game.mount();
  };

  function Game(puz, save) {
    this.puz = puz; const W = puz.w, H = puz.h;
    this.W = W; this.H = H;
    this.sol = puz.rows.join('');
    this.isL = Array.from(this.sol, (ch) => ch !== '.');
    if (puz.dense === undefined) puz.dense = this.isDense();
    this.cellWords = Array.from({ length: W * H }, () => [-1, -1]);
    puz.words.forEach((w, i) => {
      w.cells = [];
      for (let k = 0; k < w.a.length; k++) {
        const idx = (w.r + (w.d === 'D' ? k : 0)) * W + (w.c + (w.d === 'A' ? k : 0));
        w.cells.push(idx); this.cellWords[idx][w.d === 'A' ? 0 : 1] = i;
      }
    });
    this.numAt = {}; puz.words.forEach((w) => { this.numAt[w.cells[0]] = w.n; });
    if (save) {
      this.entries = save.entries.split(''); this.flags = save.flags; this.secs = save.secs || 0; this.hints = save.hints || 0;
      this.sel = save.sel != null && this.isL[save.sel] ? save.sel : puz.words[0].cells[0]; this.dir = save.dir || 'A';
    } else this.reset();
    this.done = false; this.timer = null;
    this.cellPx = store.get(zoomKey(puz), 0);
  }
  Game.prototype.isDense = function () {
    let unchecked = 0; const W = this.W;
    for (let i = 0; i < this.sol.length; i++) {
      if (!this.isL[i]) continue; const r = (i / W) | 0, c = i % W;
      const h = (c > 0 && this.isL[i - 1]) || (c < W - 1 && this.isL[i + 1]); const v = (r > 0 && this.isL[i - W]) || (r < this.H - 1 && this.isL[i + W]);
      if (!(h && v)) unchecked++;
    }
    return unchecked === 0;
  };
  Game.prototype.reset = function () {
    this.entries = Array(this.W * this.H).fill(' '); this.flags = Array(this.W * this.H).fill(0); this.secs = 0; this.hints = 0;
    this.sel = this.puz.words[0].cells[0]; this.dir = this.puz.words[0].d; this.done = false; this.autoDone = false; this.warned = false;
    this.applyStartHints();
  };
  // flags: 1 = given at start, 2 = revealed, 4 = marked wrong
  Game.prototype.applyStartHints = function () {
    const mode = settings.letterHints; if (mode === 'off') return;
    const rng = CWEngine.RNG(CWEngine.hashStr(this.puz.key + mode));
    this.puz.words.forEach((w) => {
      const pick = mode === 'first' ? [0] : (() => { const k = Math.max(1, Math.floor(w.a.length / 4)); const ids = CWEngine.shuffle(w.cells.map((_, i) => i), rng); return ids.slice(0, k); })();
      pick.forEach((i) => { const idx = w.cells[i]; this.entries[idx] = this.sol[idx]; this.flags[idx] |= 1; });
    });
  };
  Game.prototype.curWordIdx = function () {
    const cw = this.cellWords[this.sel]; let i = cw[this.dir === 'A' ? 0 : 1];
    if (i < 0) { this.dir = this.dir === 'A' ? 'D' : 'A'; i = cw[this.dir === 'A' ? 0 : 1]; }
    return i;
  };
  Game.prototype.mount = function () {
    const p = this.puz;
    screen.innerHTML = bar(p.title, p.sub, {
      back: true,
      subHtml: '<span id="timer" aria-label="Time played" style="font-variant-numeric:tabular-nums">' + fmtTime(this.secs) + '</span><span class="hide-narrow"> – ' + esc(p.sub) + '</span>',
      extra: '<button class="btn" data-act="hints" aria-haspopup="menu">' + I.hint + '<span class="lbl">Hints</span></button>' +
        '<button class="btn" data-act="more" aria-haspopup="menu" aria-label="Restart, auto-complete or print">' + I.more + '<span class="lbl">Puzzle</span></button>' +
        '<button class="btn" data-act="save" aria-label="Save for later">' + I.save + '<span class="lbl">Save for later</span></button>' +
        '<button class="btn mobile-clues-btn" data-act="clues">' + I.list + '<span class="lbl">Clues</span></button>'
    }) +
      '<div class="pz"><div class="cluebar"><span class="cnum" id="cbn"></span><span class="ctext" id="cbt"></span><span class="nav"><button class="btn icon" id="cprev" aria-label="Previous clue">' + I.prev + '</button><button class="btn icon" id="cnext" aria-label="Next clue">' + I.next + '</button></span></div>' +
      '<div class="boardwrap" id="bw"><div class="board" id="board"></div>' +
      '<div class="zoom"><button class="btn icon" id="zin" aria-label="Zoom in">' + I.plus + '</button><button class="btn icon" id="zout" aria-label="Zoom out">' + I.minus + '</button></div></div>' +
      '<aside class="clues" id="clues"><div class="bar" style="padding:8px 10px"><h1 style="font-size:1.2em">Clues</h1><button class="btn icon clues-close" id="cclose" aria-label="Close clues">' + I.close + '</button></div><div class="clist" id="clist"></div></aside>' +
      '<div class="kbd" id="kbd"></div></div>';
    wireBar(() => { this.persist(); back(); });
    $('[data-act="hints"]').onclick = (e) => this.hintMenu(e.currentTarget);
    $('[data-act="more"]').onclick = (e) => this.moreMenu(e.currentTarget);
    $('[data-act="save"]').onclick = () => { this.persist(true); toast('Saved. Find it under Saved puzzles.'); home(); };
    $('[data-act="clues"]').onclick = () => $('#clues').classList.add('open');
    $('#cclose').onclick = () => $('#clues').classList.remove('open');
    $('#cprev').onclick = () => this.jumpClue(-1); $('#cnext').onclick = () => this.jumpClue(1);
    $('#zin').onclick = () => this.zoom(1.15); $('#zout').onclick = () => this.zoom(1 / 1.15);
    this.buildBoard(); this.buildClues(); this.buildKeyboard();
    this.fitCells();
    this.render(true);
    this.start();
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = (e) => this.onKey(e);
    document.addEventListener('keydown', this.keyHandler);
    this.setupPinch();
  };
  Game.prototype.fitCells = function () {
    const bw = $('#bw');
    let px = this.cellPx;
    if (!px) {
      const pad = 24;
      const avail = bw.clientWidth - pad - (this.W + 1), availH = bw.clientHeight - pad - (this.H + 1);
      px = Math.floor(Math.min(avail / this.W, Math.max(availH, this.puz.dense ? 260 : 300) / this.H));
      px = this.puz.dense ? Math.max(16, Math.min(52, px)) : Math.max(window.innerWidth < 700 ? 24 : 20, Math.min(44, px));
    }
    this.setCell(px, true);
  };
  Game.prototype.setCell = function (px, center) {
    px = Math.max(12, Math.min(72, Math.round(px)));
    const g0 = this.cv ? this.geom() : null;
    this.cellPx = px;
    if (g0 && !center) { // keep the selected square in place while zooming
      const g = this.geom(); const c = this.sel % this.W, r = (this.sel / this.W) | 0;
      this.panX = Math.round(this.panX + c * (g0.pitch - g.pitch)); this.panY = Math.round(this.panY + r * (g0.pitch - g.pitch));
    }
    if (center) this.centerGrid();
    this.draw();
  };
  Game.prototype.zoom = function (f) {
    this.setCell(this.cellPx * f); store.set(zoomKey(this.puz), this.cellPx); this.scrollToSel();
  };
  // Pan with one finger or the mouse, pinch or Ctrl+wheel to zoom, wheel to scroll; a tap selects a square.
  Game.prototype.setupPinch = function () {
    const cv = this.cv; const pts = new Map(); let start = null, moved = false, pinch = null;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY }; moved = false; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), c: this.cellPx }; moved = true; }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch.d > 0) this.setCell(pinch.c * d / pinch.d); return; }
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true; const dpr = window.devicePixelRatio || 1;
      this.panX = Math.round(start.px + dx * dpr); this.panY = Math.round(start.py + dy * dpr); this.clampPan(); this.draw();
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (pinch && pts.size < 2) { pinch = null; store.set(zoomKey(this.puz), this.cellPx); start = null; return; }
      if (start && !moved && e.type === 'pointerup') this.tapAt(e.clientX, e.clientY);
      if (!pts.size) start = null;
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) { this.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); return; }
      const dpr = window.devicePixelRatio || 1;
      this.panX = Math.round(this.panX - (e.shiftKey ? e.deltaY : e.deltaX) * dpr); this.panY = Math.round(this.panY - (e.shiftKey ? 0 : e.deltaY) * dpr);
      this.clampPan(); this.draw();
    }, { passive: false });
  };
  Game.prototype.tapAt = function (cx, cy) {
    const i = this.cellAtPoint(cx, cy); if (i < 0 || !this.isL[i]) return;
    if (i === this.sel) this.toggleDir(); else { this.sel = i; if (this.cellWords[i][this.dir === 'A' ? 0 : 1] < 0) this.toggleDir(true); }
    this.render();
  };
  // The canvas fills the board area and never scrolls; the grid is drawn at a whole-pixel pan offset,
  // so every line is exactly the same number of physical pixels on any display scaling.
  Game.prototype.buildBoard = function () {
    const b = $('#board');
    b.innerHTML = '<canvas id="grid" role="grid" aria-label="Crossword grid, ' + this.W + ' by ' + this.H + '"></canvas>';
    this.cv = b.firstChild; this.ctx = this.cv.getContext('2d'); this.panX = 0; this.panY = 0;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.draw());
  };
  Game.prototype.geom = function () {
    const dpr = window.devicePixelRatio || 1;
    const cell = Math.max(8, Math.round(this.cellPx * dpr));   // square size in device pixels
    const line = Math.max(1, Math.round(dpr));                  // every grid line: same device-pixel width
    const pitch = cell + line;
    return { dpr, cell, line, pitch, w: this.W * pitch + line, h: this.H * pitch + line };
  };
  Game.prototype.viewSize = function () {
    const dpr = window.devicePixelRatio || 1; const bw = $('#bw');
    return { vw: Math.floor(bw.clientWidth * dpr), vh: Math.floor(bw.clientHeight * dpr) };
  };
  Game.prototype.centerGrid = function () {
    const g = this.geom(), v = this.viewSize();
    this.panX = Math.round((v.vw - g.w) / 2); this.panY = g.h + 24 < v.vh ? Math.round((v.vh - g.h) / 2) : Math.round(12 * g.dpr);
    this.clampPan();
  };
  Game.prototype.clampPan = function () {
    const g = this.geom(), v = this.viewSize(), m = Math.round(12 * g.dpr);
    if (g.w + 2 * m <= v.vw) this.panX = Math.round((v.vw - g.w) / 2); else this.panX = Math.min(m, Math.max(v.vw - g.w - m, this.panX));
    if (g.h + 2 * m <= v.vh) this.panY = Math.min(Math.max(this.panY, m), v.vh - g.h - m); else this.panY = Math.min(m, Math.max(v.vh - g.h - m, this.panY));
    this.panX = Math.round(this.panX); this.panY = Math.round(this.panY);
  };
  Game.prototype.cellAtPoint = function (cx, cy) {
    const g = this.geom(); const r = this.cv.getBoundingClientRect();
    const x = (cx - r.left) * g.dpr - this.panX, y = (cy - r.top) * g.dpr - this.panY;
    const c = Math.floor((x - g.line / 2) / g.pitch), rr = Math.floor((y - g.line / 2) / g.pitch);
    if (c < 0 || rr < 0 || c >= this.W || rr >= this.H) return -1;
    return rr * this.W + c;
  };
  Game.prototype.draw = function () {
    if (!this.cv || !document.getElementById('grid')) return;
    const g = this.geom(), v = this.viewSize(), cv = this.cv, ctx = this.ctx, W = this.W, H = this.H;
    if (cv.width !== v.vw || cv.height !== v.vh) { cv.width = v.vw; cv.height = v.vh; }
    cv.style.width = (v.vw / g.dpr) + 'px'; cv.style.height = (v.vh / g.dpr) + 'px';
    this.snapCanvas();
    const dark = settings.theme === 'dark';
    const LINE = '#1C1D24', CELL = dark ? '#F4F1E6' : '#FFFFFF', WORD = '#FFF2B3', CUR = '#FFD95A';
    const NUM = '#3D3F48', INK = '#1C1D24', BLUE = '#2F4F86', RED = '#C62828';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, v.vw, v.vh);
    const wi = this.curWordIdx(); const inWord = new Set(this.puz.words[wi].cells);
    const ox = this.panX, oy = this.panY;
    const x0 = (c) => ox + c * g.pitch, y0 = (r) => oy + r * g.pitch;
    if (this.puz.dense) { ctx.fillStyle = LINE; ctx.fillRect(ox, oy, g.w, g.h); }     // lines + black squares
    else {                                                                              // lines only around letter squares
      ctx.fillStyle = LINE;
      for (let i = 0; i < W * H; i++) if (this.isL[i]) { const r = (i / W) | 0, c = i % W; ctx.fillRect(x0(c), y0(r), g.pitch + g.line, g.pitch + g.line); }
    }
    const numFont = Math.max(7, Math.round(g.cell * 0.29)), chFont = Math.round(g.cell * 0.6);
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < W * H; i++) {
      if (!this.isL[i]) continue;
      const r = (i / W) | 0, c = i % W, x = x0(c) + g.line, y = y0(r) + g.line;
      if (x > v.vw || y > v.vh || x + g.cell < 0 || y + g.cell < 0) continue;
      ctx.fillStyle = i === this.sel ? CUR : inWord.has(i) ? WORD : CELL;
      ctx.fillRect(x, y, g.cell, g.cell);
      if (this.flags[i] & 2) { // revealed: small blue corner
        const t = Math.max(4, Math.round(g.cell * 0.2)); ctx.fillStyle = BLUE;
        ctx.beginPath(); ctx.moveTo(x + g.cell - t, y); ctx.lineTo(x + g.cell, y); ctx.lineTo(x + g.cell, y + t); ctx.closePath(); ctx.fill();
      }
      if (this.numAt[i]) { ctx.fillStyle = NUM; ctx.font = '700 ' + numFont + 'px Atkinson, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(String(this.numAt[i]), x + Math.round(g.cell * 0.06) + 1, y + numFont); }
      const ch = this.entries[i];
      if (ch !== ' ') {
        ctx.fillStyle = this.isWrong(i) ? RED : (this.flags[i] & 3) ? BLUE : INK;
        ctx.font = '700 ' + chFont + 'px Atkinson, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(ch, x + g.cell / 2, y + g.cell * 0.82);
      }
    }
  };
  // Keep the canvas on a whole device pixel so the browser never resamples it.
  Game.prototype.snapCanvas = function () {
    // Shift the board by the sub-pixel amount (via layout offsets, not transforms) so the canvas
    // starts exactly on a physical pixel and is never resampled.
    const cv = this.cv, board = cv.parentNode; const dpr = window.devicePixelRatio || 1;
    board.style.left = '0px'; board.style.top = '0px';
    const r = cv.getBoundingClientRect();
    const fx = r.left * dpr - Math.round(r.left * dpr), fy = r.top * dpr - Math.round(r.top * dpr);
    if (Math.abs(fx) > 0.01) board.style.left = (-fx / dpr) + 'px';
    if (Math.abs(fy) > 0.01) board.style.top = (-fy / dpr) + 'px';
  };
  Game.prototype.cellRect = function (i) {
    const g = this.geom(); const r = this.cv.getBoundingClientRect();
    const c = i % this.W, rr = (i / this.W) | 0;
    const left = r.left + (this.panX + c * g.pitch + g.line) / g.dpr, top = r.top + (this.panY + rr * g.pitch + g.line) / g.dpr, sz = g.cell / g.dpr;
    return { left, top, right: left + sz, bottom: top + sz };
  };
  Game.prototype.toggleDir = function (force) {
    const other = this.dir === 'A' ? 'D' : 'A';
    if (force || this.cellWords[this.sel][other === 'A' ? 0 : 1] >= 0) this.dir = other;
  };
  Game.prototype.clueHtml = function (w) {
    return '<span class="q">' + esc(w.q) + '</span> <span class="en">(' + esc(w.en || String(w.a.length)) + ')</span> <button class="ref" data-ref="' + this.puz.words.indexOf(w) + '">' + esc(refStr(w.ref)) + '</button>';
  };
  Game.prototype.buildClues = function () {
    const words = this.puz.words; let html = '';
    ['A', 'D'].forEach((d) => {
      html += '<h3>' + (d === 'A' ? 'Across' : 'Down') + '</h3>';
      words.forEach((w, i) => { if (w.d === d) html += '<div class="clue" data-w="' + i + '"><span class="k">' + w.n + '</span><span>' + this.clueHtml(w) + '</span></div>'; });
    });
    const cl = $('#clist'); cl.innerHTML = html;
    this.clueEls = {}; cl.querySelectorAll('.clue').forEach((el) => { this.clueEls[+el.dataset.w] = el; });
    cl.onclick = (e) => {
      const rb = e.target.closest('.ref'); if (rb) { showVerse(words[+rb.dataset.ref]); return; }
      const c = e.target.closest('.clue'); if (!c) return;
      const w = words[+c.dataset.w]; this.dir = w.d; this.sel = this.firstEmpty(w); this.render(); $('#clues').classList.remove('open');
    };
    $('#cbt').onclick = (e) => { const rb = e.target.closest('.ref'); if (rb) showVerse(words[+rb.dataset.ref]); };
  };
  Game.prototype.buildKeyboard = function () {
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    const k = $('#kbd');
    k.innerHTML = rows.map((r, ri) => '<div class="row">' + (ri === 2 ? '<button class="wide" data-k="dir" aria-label="Switch direction">⇅</button>' : '') + r.split('').map((c) => '<button data-k="' + c + '">' + c + '</button>').join('') + (ri === 2 ? '<button class="wide" data-k="del" aria-label="Delete">⌫</button>' : '') + '</div>').join('');
    k.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.k;
      if (v === 'del') this.backspace(); else if (v === 'dir') { this.toggleDir(); this.render(); } else this.type(v);
    };
  };
  Game.prototype.firstEmpty = function (w) {
    for (const idx of w.cells) if (this.entries[idx] === ' ') return idx;
    return w.cells[0];
  };
  Game.prototype.isWrong = function (i) {
    const ch = this.entries[i];
    return ch !== ' ' && ch !== this.sol[i] && ((this.flags[i] & 4) || settings.autoCheck);
  };
  Game.prototype.render = function () {
    const wi = this.curWordIdx(); const w = this.puz.words[wi];
    this.draw();
    $('#cbn').textContent = w.n + (w.d === 'A' ? ' Across' : ' Down');
    $('#cbt').innerHTML = this.clueHtml(w);
    for (const k in this.clueEls) {
      const el = this.clueEls[k]; el.classList.toggle('on', +k === wi);
      el.classList.toggle('solved', this.wordSolved(this.puz.words[+k]));
    }
    const ce = this.clueEls[wi]; if (ce) { const cl = $('#clist'); const r = ce.getBoundingClientRect(), cr = cl.getBoundingClientRect(); if (r.top < cr.top || r.bottom > cr.bottom) ce.scrollIntoView({ block: 'center' }); }
    this.scrollToSel();
    const t = $('#timer'); if (t) t.textContent = fmtTime(this.secs);
  };
  Game.prototype.scrollToSel = function () {
    if (!this.cv || !document.getElementById('grid')) return;
    const g = this.geom(), v = this.viewSize(); const c = this.sel % this.W, r = (this.sel / this.W) | 0;
    const m = Math.round(g.pitch * 1.5);
    const x = this.panX + c * g.pitch, y = this.panY + r * g.pitch;
    let changed = false;
    if (x < m) { this.panX += m - x; changed = true; } else if (x + g.pitch > v.vw - m) { this.panX -= x + g.pitch - (v.vw - m); changed = true; }
    if (y < m) { this.panY += m - y; changed = true; } else if (y + g.pitch > v.vh - m) { this.panY -= y + g.pitch - (v.vh - m); changed = true; }
    if (changed) { this.clampPan(); this.draw(); }
  };
  Game.prototype.wordFilled = function (w) { return w.cells.every((i) => this.entries[i] !== ' '); };
  Game.prototype.wordSolved = function (w) { return w.cells.every((i) => this.entries[i] === this.sol[i]); };
  Game.prototype.type = function (ch) {
    if (this.done) return;
    const i = this.sel;
    if (!(this.flags[i] & 3) || this.entries[i] !== this.sol[i]) { this.entries[i] = ch; this.flags[i] &= ~4; }
    this.advance(); this.changed();
  };
  Game.prototype.advance = function () {
    const w = this.puz.words[this.curWordIdx()]; const k = w.cells.indexOf(this.sel);
    if (settings.skipFilled) {
      for (let j = k + 1; j < w.cells.length; j++) if (this.entries[w.cells[j]] === ' ') { this.sel = w.cells[j]; return; }
      if (!this.wordFilled(w)) { this.sel = this.firstEmpty(w); return; }
    }
    if (k < w.cells.length - 1) { this.sel = w.cells[k + 1]; return; }
    this.jumpClue(1, true);
  };
  Game.prototype.backspace = function () {
    if (this.done) return;
    const w = this.puz.words[this.curWordIdx()]; const k = w.cells.indexOf(this.sel);
    const clear = (i) => { if (!(this.flags[i] & 3)) { this.entries[i] = ' '; this.flags[i] &= ~4; } };
    if (this.entries[this.sel] !== ' ' && !(this.flags[this.sel] & 3)) clear(this.sel);
    else if (k > 0) { this.sel = w.cells[k - 1]; clear(this.sel); }
    this.changed();
  };
  Game.prototype.jumpClue = function (d, unfilledOnly) {
    const words = this.puz.words; let i = this.curWordIdx();
    for (let n = 0; n < words.length; n++) {
      i = (i + d + words.length) % words.length;
      if (!unfilledOnly || !this.wordFilled(words[i])) break;
    }
    const w = words[i]; this.dir = w.d; this.sel = this.firstEmpty(w); this.render();
  };
  Game.prototype.move = function (dr, dc) {
    let r = Math.floor(this.sel / this.W), c = this.sel % this.W;
    const want = dc ? 'A' : 'D';
    if (this.dir !== want && this.cellWords[this.sel][want === 'A' ? 0 : 1] >= 0) { this.dir = want; this.render(); return; }
    for (let s = 0; s < Math.max(this.W, this.H); s++) {
      r += dr; c += dc; if (r < 0 || c < 0 || r >= this.H || c >= this.W) return;
      const i = r * this.W + c; if (this.isL[i]) { this.sel = i; if (this.cellWords[i][this.dir === 'A' ? 0 : 1] < 0) this.toggleDir(true); this.render(); return; }
    }
  };
  Game.prototype.onKey = function (e) {
    if (modalRoot.children.length || !document.getElementById('board')) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); this.type(k.toUpperCase()); }
    else if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); this.backspace(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); this.move(0, -1); }
    else if (k === 'ArrowRight') { e.preventDefault(); this.move(0, 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); this.move(-1, 0); }
    else if (k === 'ArrowDown') { e.preventDefault(); this.move(1, 0); }
    else if (k === 'Tab' || k === 'Enter') { e.preventDefault(); this.jumpClue(e.shiftKey ? -1 : 1); }
    else if (k === ' ') { e.preventDefault(); this.toggleDir(); this.render(); }
    else if (k === 'Escape') closePops();
  };
  Game.prototype.changed = function () {
    this.render(); this.persist();
    if (this.entries.every((ch, i) => !this.isL[i] || ch !== ' ')) {
      if (this.entries.every((ch, i) => !this.isL[i] || ch === this.sol[i])) this.finish();
      else if (!this.warned) { this.warned = true; toast('The grid is full, but some letters are not right yet.'); }
    } else this.warned = false;
  };
  Game.prototype.noteHint = function () { this.hints++; this.persist(); };
  Game.prototype.reveal = function (i) { if (this.entries[i] !== this.sol[i]) { this.entries[i] = this.sol[i]; this.flags[i] = (this.flags[i] | 2) & ~4; return 1; } return 0; };
  Game.prototype.hintMenu = function (anchor) {
    const w = this.puz.words[this.curWordIdx()];
    menu(anchor, [
      ['Reveal this letter', () => { if (this.done) return; if (this.reveal(this.sel)) this.hints++; this.advance(); this.changed(); }],
      ['Reveal this word', () => { if (this.done) return; if (w.cells.reduce((s, i) => s + this.reveal(i), 0)) this.hints++; this.changed(); }],
      '-',
      ['Check this word', () => { let bad = 0; w.cells.forEach((i) => { if (this.entries[i] !== ' ' && this.entries[i] !== this.sol[i]) { this.flags[i] |= 4; bad++; } }); this.hints++; toast(bad ? bad + ' letter' + (bad > 1 ? 's are' : ' is') + ' wrong (shown in red)' : 'No mistakes in this word'); this.changed(); }],
      ['Check the whole puzzle', () => { let bad = 0; this.entries.forEach((ch, i) => { if (this.isL[i] && ch !== ' ' && ch !== this.sol[i]) { this.flags[i] |= 4; bad++; } }); this.hints++; toast(bad ? plural(bad, 'wrong letter') + ' shown in red' : 'No mistakes so far'); this.changed(); }],
      ['Clear my letters', () => confirmBox('Clear your letters?', 'Letters you typed will be removed. Revealed letters stay.', 'Clear', () => {
        this.entries.forEach((ch, i) => { if (this.isL[i] && !(this.flags[i] & 3)) { this.entries[i] = ' '; this.flags[i] = 0; } }); this.render(); this.persist(); })]
    ]);
  };
  Game.prototype.moreMenu = function (anchor) {
    menu(anchor, [
      ['Restart this puzzle', () => confirmBox('Restart this puzzle?', 'All letters, hints and the timer start over.', 'Restart puzzle', () => { this.reset(); this.mount(); this.persist(); toast('Puzzle restarted'); })],
      ['Auto-complete this puzzle', () => confirmBox('Auto-complete this puzzle?', 'Every answer will be filled in. It is added to your completed record marked “Auto-completed”.', 'Auto-complete', () => {
        this.entries.forEach((ch, i) => { if (this.isL[i]) this.reveal(i); }); this.autoDone = true; this.render(); this.finish(); })],
      '-',
      ['Print this puzzle', () => printPuzzle(this.puz, false)],
      ['Print the answer key', () => printPuzzle(this.puz, true)]
    ]);
  };
  Game.prototype.persist = function (force) {
    if (this.done && !force) return;
    if (this.done) return;
    const filled = this.isL.reduce((s, l, i) => s + (l && this.entries[i] !== ' ' ? 1 : 0), 0);
    const total = this.isL.filter(Boolean).length;
    const s = { key: this.puz.key, title: this.puz.title, sub: this.puz.sub, sig: sig(this.puz), entries: this.entries.join(''), flags: this.flags, secs: this.secs, hints: this.hints, sel: this.sel, dir: this.dir, pct: filled / total, updated: Date.now() };
    if (this.puz.random) s.puz = stripPuz(this.puz);
    putSave(s);
  };
  function zoomKey(p) { return 'zoom.' + (window.innerWidth < 700 ? 'm' : 'd') + (p.dense ? 'n' : 'o'); }
  function stripPuz(p) { return { key: p.key, title: p.title, sub: p.sub, style: p.style, dense: p.dense, random: true, w: p.w, h: p.h, rows: p.rows, words: p.words.map((w) => ({ n: w.n, d: w.d, r: w.r, c: w.c, a: w.a, en: w.en, q: w.q, ref: w.ref })) }; }
  Game.prototype.start = function () {
    this.stop();
    if (this.done) return;
    this.timer = setInterval(() => {
      if (document.hidden || modalRoot.children.length) return;
      this.secs++; const t = $('#timer'); if (t) t.textContent = fmtTime(this.secs);
      if (this.secs % 15 === 0) this.persist();
    }, 1000);
  };
  Game.prototype.stop = function () { if (this.timer) clearInterval(this.timer); this.timer = null; };
  Game.prototype.finish = function () {
    if (this.done) return;
    this.done = true; this.stop();
    dropSave(this.puz.key);
    const full = this.puz.words.filter((w) => w.d === 'A').length >= 40;
    const rec = records();
    rec.push({ key: this.puz.key, title: this.puz.title, style: this.puz.style || '', date: Date.now(), secs: this.secs, hints: this.hints, full, auto: !!this.autoDone });
    store.set('done', rec);
    this.render();
    const m = /^([pn])(\d+)$/.exec(this.puz.key);
    const style = m ? (m[1] === 'n' ? 'news' : 'open') : null;
    const nextP = m ? EDITIONS[style].list.find((p) => p.id === +m[2] + 1) : null;
    modal('<h2>' + (this.autoDone ? 'Puzzle auto-completed' : 'Well done!') + '</h2>' +
      (this.autoDone ? '<p>All the answers are filled in. <b>' + esc(this.puz.title) + '</b> is in your completed record, marked “Auto-completed”.</p>' :
        '<p>You completed <b>' + esc(this.puz.title) + '</b> in ' + fmtTime(this.secs) + (this.hints ? ' using ' + plural(this.hints, 'hint') : ' without any hints') + '.</p>' +
        '<p class="scripture" style="font-size:1.1em">“I have fought a good fight, I have finished my course, I have kept the faith.” <span style="font-family:var(--sans);font-size:.75em;color:var(--rubric)">2 Timothy 4:7</span></p>') +
      '<div class="actions"><button class="btn" data-close>Look at the grid</button><button class="btn" data-lib>Puzzle library</button>' +
      (nextP ? '<button class="btn primary" data-next>Next puzzle</button>' : '<button class="btn primary" data-rand>Another random puzzle</button>') + '</div>',
    (sc, close) => {
      sc.querySelector('[data-lib]').onclick = () => { close(); home(); go('library'); };
      const n = sc.querySelector('[data-next]'); if (n) n.onclick = () => { close(); openPremade(style, nextP.id); };
      const r = sc.querySelector('[data-rand]'); if (r) r.onclick = () => { close(); go('random'); };
    });
  };

  // Android hardware back button support
  window.onAndroidBack = function () {
    if (document.querySelector('.pop')) { closePops(); return true; }
    if (modalRoot.children.length) { modalRoot.lastChild.remove(); return true; }
    const cl = document.querySelector('.clues.open'); if (cl) { cl.classList.remove('open'); return true; }
    if (current && current.view !== 'title') { if (game && current.view === 'puzzle') game.persist(); back(); return true; }
    exitApp(); return true;
  };
  window.onAndroidPause = function () { if (game && !game.done) game.persist(); };
  window.onAndroidResume = function () {};
  window.addEventListener('beforeunload', () => { if (game && !game.done) game.persist(); });
  window.addEventListener('resize', () => { if (game && current && current.view === 'puzzle' && document.getElementById('grid')) { game.clampPan(); game.draw(); game.scrollToSel(); } });

  // boot
  go('title', {}, true);
  setTimeout(() => loadKJV().catch(() => {}), 600);
  window.__bc = { go, get settings() { return settings; }, get game() { return game; }, switchProfile, printPuzzle };
})();
