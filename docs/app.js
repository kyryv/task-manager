'use strict';
(() => {
  /* =====================================================================
     Basics
     ===================================================================== */
  const $ = (id) => document.getElementById(id);
  const LS = { prefs: 'tm.prefs.v2', local: 'tm.local.v2', stash: 'tm.unsaved.v2' };
  const TABS = ['board', 'dates', 'done'];
  const Q = {
    1: { name: 'Do first', sub: 'Urgent and important' },
    2: { name: 'Schedule', sub: 'Important, not urgent' },
    3: { name: 'Delegate', sub: 'Urgent, not important' },
    4: { name: 'Later', sub: 'Not urgent, not important' },
  };
  const PALETTE = ['#86cf7a', '#b58cf0', '#f28fb8', '#6fa3e0', '#e6b84c', '#5cc8c0', '#ef6b5b', '#d97757', '#c9e265', '#a3a090'];
  const DEFAULT_CATS = [
    { id: 'personal', name: 'Personal', color: '#86cf7a' },
    { id: 'work', name: 'Work', color: '#b58cf0' },
    { id: 'uni', name: 'Uni', color: '#f28fb8' },
  ];

  const svg = (d, sw = '1.7') => `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    cal: svg('<rect x="2.5" y="3.5" width="11" height="10" rx="2"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>'),
    flag: svg('<path d="M4 14V2.5M4 3h8l-2 3 2 3H4"/>'),
    edit: svg('<path d="M10.5 2.8l2.7 2.7L6 12.7 2.8 13.2l.5-3.2z"/>'),
    trash: svg('<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/>'),
    check: svg('<path d="M3.5 8.5l3 3 6-7"/>', '2'),
    search: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>'),
    gear: svg('<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/>'),
    plus: svg('<path d="M8 3v10M3 8h10"/>', '2'),
    x: svg('<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>'),
    grip: svg('<path d="M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01"/>', '2.6'),
    arrow: svg('<path d="M3 8h10M9 4l4 4-4 4"/>'),
    sun: svg('<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/>'),
    list: svg('<path d="M3 4.5h10M3 8h10M3 11.5h6"/>'),
    filter: svg('<path d="M2.5 3.5h11l-4.2 5v4l-2.6 1.5V8.5z"/>'),
    repeat: svg('<path d="M2.8 7.2A5 5 0 0 1 11.6 4.4L13 5.8M13 2.6v3.2H9.8M13.2 8.8A5 5 0 0 1 4.4 11.6L3 10.2M3 13.4v-3.2h3.2"/>'),
  };
  const ic = (name, cls = 'ic') => { const s = document.createElement('span'); s.className = cls; s.innerHTML = ICON[name]; return s; };
  document.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = ICON[n.dataset.icon] || ''; n.classList.add('ic'); });

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const TODAY = () => ymd(today0());
  const plus = (n) => { const d = today0(); d.setDate(d.getDate() + n); return ymd(d); };
  const diff = (s) => Math.round((parseD(s) - today0()) / 864e5);
  const nextWd = (wd, allowToday) => { let n = (wd - today0().getDay() + 7) % 7; if (n === 0 && !allowToday) n = 7; return plus(n); };
  const quick = (v) => (v === 'mon' ? nextWd(1) : v === 'sat' ? nextWd(6, true) : plus(+v));
  const thisYear = (d) => d.getFullYear() === today0().getFullYear();
  function dayName(s, long) {
    const d = parseD(s);
    return d.toLocaleDateString(undefined, { weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', year: thisYear(d) ? undefined : 'numeric' });
  }
  function dLabel(s) {
    const n = diff(s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return parseD(s).toLocaleDateString(undefined, { weekday: 'long' });
    return dayName(s);
  }
  // dLabel for use mid-sentence: "today", "tomorrow" but keep "Sun, Nov 15" as is.
  const dLow = (s) => { const l = dLabel(s); return /^(Today|Tomorrow|Yesterday)$/.test(l) ? l.toLowerCase() : l; };
  function rel(s) {
    const n = diff(s);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return '1 day overdue';
    if (n < 0) return -n + ' days overdue';
    if (n < 14) return 'in ' + n + ' days';
    if (n < 60) return 'in ' + Math.round(n / 7) + ' weeks';
    return 'in ' + Math.round(n / 30) + ' months';
  }

  /* =====================================================================
     State
     ===================================================================== */
  let tasks = [];
  let cats = [];
  let meta = {};
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(LS.prefs) || '{}') || {}; } catch { prefs = {}; }
  const savePrefs = () => { try { localStorage.setItem(LS.prefs, JSON.stringify(prefs)); } catch {} };
  let tab = TABS.includes(prefs.tab) ? prefs.tab : 'board';
  let search = '';
  let stripOffset = 0; // days the Dates strip is moved from today (arrows step a week)
  const expanded = new Set(); // tasks whose subtasks are shown in full
  let inlineAdd = null; // {key, value} — the open "+ Add task" field in a panel

  const find = (id) => tasks.find((t) => t.id === id) || null;
  const catOf = (id) => cats.find((c) => c.id === id) || null;

  const isActive = (t) => t.status === 'active';
  const inToday = (t, now) => (t.date && t.date <= now) || (t.due && t.due <= now);
  const isLate = (t, now) => (t.date && t.date < now) || (t.due && t.due < now);
  const inMatrix = (t, now) => !inToday(t, now) && !(t.date && t.date > now);
  const firstDay = (t) => [t.date, t.due].filter(Boolean).sort()[0] || '';

  function norm(t) {
    const okD = (s) => (typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s) ? s : '');
    let date = okD(t.date);
    let due = okD(t.due);
    if (t.dateType === 'due' && date && !t.due) { due = date; date = ''; } // old format: one date with a type
    const q = +t.q;
    const now = Date.now();
    return {
      id: String(t.id),
      title: String(t.title || '').slice(0, 300),
      desc: typeof t.desc === 'string' ? t.desc.slice(0, 5000) : '',
      q: q >= 1 && q <= 4 ? q : 2,
      cat: t.cat != null ? String(t.cat) : t.tag ? String(t.tag) : '',
      date, due,
      repeat: typeof t.repeat === 'string' && parseSpec(t.repeat) ? t.repeat : '',
      kind: t.kind === 'count' || t.kind === 'big' ? t.kind : '',
      goal: Math.max(0, Math.round(+t.goal) || 0),
      count: Math.max(0, Math.round(+t.count) || 0),
      parent: t.parent ? String(t.parent) : '',
      subs: Array.isArray(t.subs)
        ? t.subs.filter((s) => s && typeof s.title === 'string' && s.title.trim())
          .map((s) => ({ id: s.id ? String(s.id) : uid(), title: s.title.slice(0, 300), done: !!s.done }))
        : [],
      order: Number.isFinite(+t.order) ? +t.order : +t.created || now,
      created: +t.created || now,
      status: t.status === 'done' || t.status === 'deleted' ? t.status : 'active',
      closedAt: +t.closedAt || 0,
      updated: +t.updated || now,
    };
  }
  const validTask = (t) => t && typeof t.title === 'string' && t.title.trim() && (typeof t.id === 'string' || typeof t.id === 'number');

  /* =====================================================================
     Saving (autosave to your account: Firestore, through store.js)
     ===================================================================== */
  const store = window.tmStore;
  let mode = 'cloud';
  const dirty = new Set();
  const removed = new Set();
  let catsDirty = false;
  let saving = false;
  let saveTimer = 0;
  let lastSaved = 0;
  const saveEl = $('saveState');

  function setSave(state, detail) {
    saveEl.className = 'save' + (state === 'busy' ? ' busy' : state === 'err' ? ' err' : state === 'local' ? ' local' : '');
    if (state === 'busy') saveEl.textContent = 'Saving…';
    else if (state === 'err') saveEl.textContent = 'Not saved yet, retrying';
    else if (state === 'local') saveEl.textContent = 'Offline, saved on this device';
    else saveEl.textContent = 'Saved';
    saveEl.title = state === 'err' ? 'Your account could not be reached (' + (detail || 'offline') + '). Your changes are kept and will be saved as soon as it is back.'
      : state === 'local' ? 'You are offline. Changes are stored on this device and sync to your account when you are back online.'
      : lastSaved ? 'All changes synced to your account at ' + new Date(lastSaved).toLocaleTimeString() : 'All changes are saved automatically';
  }
  const pendingSave = () => dirty.size > 0 || removed.size > 0 || catsDirty || saving;

  function touch(ids) {
    ids.forEach((id) => { dirty.add(id); removed.delete(id); });
    queueSave();
  }
  function queueSave(delay = 250) {
    setSave(navigator.onLine ? 'busy' : 'local');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, delay);
  }
  function body() {
    const b = { tasks: [...dirty].map(find).filter(Boolean), removed: [...removed] };
    if (catsDirty) b.categories = cats;
    return b;
  }
  // Firestore keeps unsent writes on this device (also offline, also if the tab closes) and sends them when it can.
  async function flush() {
    clearTimeout(saveTimer);
    if (!dirty.size && !removed.size && !catsDirty) { if (!saving) setSave(navigator.onLine ? 'ok' : 'local'); return; }
    const b = body();
    const sent = { d: new Set(dirty), r: new Set(removed), c: catsDirty };
    dirty.clear(); removed.clear(); catsDirty = false;
    saving = true;
    setSave(navigator.onLine ? 'busy' : 'local');
    try {
      await store.write(b);
      lastSaved = Date.now();
      saving = false;
      if (dirty.size || removed.size || catsDirty) flush();
      else setSave('ok');
    } catch (e) {
      saving = false;
      sent.d.forEach((id) => { if (!removed.has(id)) dirty.add(id); });
      sent.r.forEach((id) => { if (!dirty.has(id)) removed.add(id); });
      if (sent.c) catsDirty = true;
      setSave('err', e.code || e.message);
      saveTimer = setTimeout(flush, 4000);
    }
  }
  addEventListener('online', () => { if (!pendingSave()) setSave('ok'); });
  addEventListener('offline', () => setSave('local'));

  /* ---------- changes + undo ---------- */
  let lastUndo = null;
  function snapshot(ids) { return ids.map((id) => ({ id, t: find(id) ? clone(find(id)) : null })); }
  // Change some tasks: fn() mutates them; msg shows a toast with Undo.
  function commit(ids, fn, msg, undoable = true) {
    const snap = snapshot(ids);
    fn();
    const now = Date.now();
    ids.forEach((id) => { const t = find(id); if (t) t.updated = now; });
    touch(ids);
    render();
    if (msg) toast(msg, undoable ? snap : null);
  }
  function restore(snap) {
    snap.forEach(({ id, t }) => {
      const i = tasks.findIndex((x) => x.id === id);
      if (t) {
        if (i >= 0) tasks[i] = clone(t); else tasks.push(clone(t));
        dirty.add(id); removed.delete(id);
      } else if (i >= 0) {
        tasks.splice(i, 1); dirty.delete(id); removed.add(id);
      }
    });
    queueSave();
    render();
    flashIds(snap.map((s) => s.id));
  }
  function undo() {
    if (!lastUndo) return;
    const s = lastUndo; lastUndo = null;
    restore(s);
    toast('Undone.');
  }
  function purge(ids) {
    const snap = snapshot(ids);
    tasks = tasks.filter((t) => !ids.includes(t.id));
    ids.forEach((id) => { dirty.delete(id); removed.add(id); });
    queueSave();
    render();
    toast(ids.length === 1 ? 'Deleted forever.' : ids.length + ' tasks deleted forever.', snap);
  }
  function complete(id, li) {
    const t = find(id); if (!t) return;
    const go = () => {
      confetti(t.due || t.kind ? 1.6 : 1); // deadlines get a bigger burst
      if (!t.repeat) { commit([id], () => { t.status = 'done'; t.closedAt = Date.now(); }, 'Completed “' + short(t.title) + '”'); return; }
      // Repeating: keep a completed copy for the history, move the task itself to its next date.
      const copy = { ...clone(t), id: uid(), repeat: '', status: 'done', closedAt: Date.now(), updated: Date.now() };
      const next = advance(t);
      const doneKids = partsOf(id).filter((k) => k.status === 'done'); // a repeating task's subtasks start over too
      commit([id, copy.id, ...doneKids.map((k) => k.id)], () => { tasks.push(copy); Object.assign(t, next); doneKids.forEach((k) => { k.status = 'active'; k.closedAt = 0; }); },
        'Done. Next time: ' + dLow(next.date || next.due) + ' (' + repeatLabel(t.repeat).toLowerCase() + ')');
    };
    if (li && !matchMedia('(prefers-reduced-motion: reduce)').matches) { li.classList.add('completing'); setTimeout(go, 260); } else go();
  }
  /* ---------- confetti: two bursts from the left and right edges ---------- */
  let confettiCanvas = null, confettiBits = [], confettiRun = false;
  const CONFETTI_COLORS = ['#d97757', '#86cf7a', '#e3b04b', '#84aedb', '#f28fb8', '#b58cf0', '#f0eee6'];
  function confetti(power = 1) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!confettiCanvas) {
      confettiCanvas = document.createElement('canvas');
      confettiCanvas.id = 'confetti';
      document.body.appendChild(confettiCanvas);
    }
    const W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1;
    confettiCanvas.width = W * dpr; confettiCanvas.height = H * dpr;
    const n = Math.round(46 * power);
    for (const side of [0, 1]) {
      for (let i = 0; i < n; i++) {
        const dir = side ? -1 : 1;
        const speed = (11 + Math.random() * 10) * (0.85 + power * 0.15);
        const angle = (-62 + Math.random() * 40) * Math.PI / 180; // up and towards the middle
        confettiBits.push({
          x: side ? W + 10 : -10, y: H * (0.55 + Math.random() * 0.3),
          vx: Math.cos(angle) * speed * dir, vy: Math.sin(angle) * speed,
          w: 6 + Math.random() * 6, h: 3 + Math.random() * 4,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
          wob: Math.random() * 10, c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
          life: 0, max: 120 + Math.random() * 60, round: Math.random() < 0.25,
        });
      }
    }
    if (!confettiRun) { confettiRun = true; requestAnimationFrame(confettiFrame); }
  }
  function confettiFrame() {
    const ctx = confettiCanvas.getContext('2d'), dpr = devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    confettiBits = confettiBits.filter((p) => p.life < p.max && p.y < innerHeight + 40);
    for (const p of confettiBits) {
      p.life++;
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.26; // air drag + gravity
      p.x += p.vx + Math.sin((p.life + p.wob) / 6) * 0.6; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (p.max - p.life) / 25);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h * 0.8, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 5 + p.wob)) + 1); // flutter
      ctx.restore();
    }
    if (confettiBits.length) requestAnimationFrame(confettiFrame);
    else { confettiRun = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  function remove(id) {
    const t = find(id); if (!t) return;
    commit([id], () => { t.status = 'deleted'; t.closedAt = Date.now(); }, 'Deleted “' + short(t.title) + '”');
  }
  const short = (s) => (s.length > 40 ? s.slice(0, 38) + '…' : s);
  function flashIds(ids) {
    requestAnimationFrame(() => ids.forEach((id) => {
      const n = document.querySelector(`li.task[data-id="${CSS.escape(id)}"]`);
      if (n) { n.classList.add('flash'); n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }));
  }

  /* ---------- toast ---------- */
  const toastEl = $('toast');
  let toastTimer = 0;
  function toast(msg, snap) {
    resetUndoBtn();
    $('toastMsg').textContent = msg;
    lastUndo = snap || lastUndo;
    $('toastUndo').hidden = !snap;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, snap ? 7000 : 3500);
  }
  $('toastUndo').onclick = () => { toastEl.hidden = true; undo(); };
  $('toastX').onclick = () => { toastEl.hidden = true; };

  /* =====================================================================
     Smart quick-add: "Essay due fri #uni !1"
     ===================================================================== */
  const WDS = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  const MON_RE = '(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\\.?';
  const DATE_EXPR = [
    'today', 'tonight', 'tomorrow', 'tmrw?', 'next week', 'next month', 'this weekend', 'weekend',
    '(?:next\\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun)',
    'in\\s+\\d{1,3}\\s*(?:days?|d|weeks?|w|months?)',
    '\\d{4}-\\d{2}-\\d{2}',
    '\\d{1,2}[./]\\d{1,2}(?:[./](?:\\d{4}|\\d{2}))?\\.?',
    '\\d{1,2}\\.?\\s+' + MON_RE,
    MON_RE + '\\s+\\d{1,2}',
  ].join('|');
  const DATE_RE = new RegExp('(^|\\s)((?:(due|by|deadline|until|till|before|on|for|do)\\s+)?(' + DATE_EXPR + '))(?=$|[\\s,;!?])', 'gi');
  const WEAK = /^(?:mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun|\d{1,2}[./]\d{1,2}\.?)$/i;

  function resolveDate(raw) {
    const s = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    if (s === 'today' || s === 'tonight') return TODAY();
    if (/^(tomorrow|tmrw?)$/.test(s)) return plus(1);
    if (s === 'next week') return nextWd(1);
    if (s === 'next month') { const d = today0(); d.setMonth(d.getMonth() + 1); return ymd(d); }
    if (s === 'weekend' || s === 'this weekend') return nextWd(6, true);
    let m = s.match(/^(next )?([a-z]+)$/);
    if (m && WDS[m[2]] != null) {
      let d = nextWd(WDS[m[2]], !m[1]);
      if (m[1] && diff(d) < 7 && parseD(d).getDay() !== 0 && parseD(d) < parseD(nextWd(1))) d = ymd(new Date(parseD(d).getTime() + 7 * 864e5));
      return d;
    }
    m = s.match(/^in (\d+) ?(d|days?|w|weeks?|months?)$/);
    if (m) {
      const n = +m[1];
      if (m[2].startsWith('m')) { const d = today0(); d.setMonth(d.getMonth() + n); return ymd(d); }
      return plus(m[2].startsWith('w') ? n * 7 : n);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return checkDate(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), true);
    m = s.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\.?$/);
    if (m) return checkDate(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null, +m[2] - 1, +m[1]);
    m = s.match(/^(\d{1,2})\.? ([a-z]+)\.?$/) || s.match(/^([a-z]+)\.? (\d{1,2})$/);
    if (m) {
      const [day, mon] = /^\d/.test(m[1]) ? [+m[1], m[2]] : [+m[2], m[1]];
      const mi = MONTHS[mon.slice(0, 3)] ?? MONTHS[mon.slice(0, 4)];
      if (mi == null) return null;
      return checkDate(null, mi, day);
    }
    return null;
  }
  function checkDate(y, m, d, exact) {
    const t = today0();
    let year = y ?? t.getFullYear();
    let dt = new Date(year, m, d);
    if (dt.getMonth() !== m || dt.getDate() !== d) return null;
    if (y == null && !exact && (t - dt) / 864e5 > 60) dt = new Date(year + 1, m, d); // "15.01" in November means next January
    return ymd(dt);
  }

  /* ---------- repeating tasks ----------
     A repeat rule is stored as text: "1d" every day, "2w" every 2 weeks, "1m" every month, "1y" every year,
     "1w:1,4" every week on Monday and Thursday (0 = Sunday). */
  const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function parseSpec(s) {
    const m = /^(\d{1,3})([dwmy])(?::([0-6](?:,[0-6]){0,6}))?$/.exec(s || '');
    if (!m || +m[1] < 1) return null;
    return { n: +m[1], u: m[2], days: m[3] ? [...new Set(m[3].split(',').map(Number))] : null };
  }
  const makeSpec = (n, u, days) => n + u + (u === 'w' && days && days.length ? ':' + [...days].sort((a, b) => a - b).join(',') : '');
  function repeatLabel(s) {
    const p = parseSpec(s); if (!p) return '';
    const U = { d: ['day', 'days'], w: ['week', 'weeks'], m: ['month', 'months'], y: ['year', 'years'] }[p.u];
    if (p.u === 'w' && p.days) {
      const sorted = [...p.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      const txt = sorted.join(',') === '1,2,3,4,5' ? 'weekday' : sorted.length === 7 ? 'day' : sorted.map((d) => WD_SHORT[d]).join(', ');
      return p.n === 1 ? 'Every ' + txt : 'Every ' + p.n + ' weeks on ' + txt;
    }
    return p.n === 1 ? 'Every ' + U[0] : 'Every ' + p.n + ' ' + U[1];
  }
  const addDaysTo = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
  function addMonths(s, n) {
    const d = parseD(s), day = d.getDate();
    const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
    return ymd(t);
  }
  const weekStart = (s) => { const d = parseD(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  // The first date after `from` that the rule lands on.
  function nextOcc(spec, from) {
    const p = parseSpec(spec); if (!p) return null;
    if (p.u === 'd') return addDaysTo(from, p.n);
    if (p.u === 'm') return addMonths(from, p.n);
    if (p.u === 'y') return addMonths(from, 12 * p.n);
    if (!p.days) return addDaysTo(from, 7 * p.n);
    const w0 = weekStart(from);
    for (let i = 1; i <= 7 * p.n + 7; i++) {
      const c = addDaysTo(from, i);
      const wk = Math.round((weekStart(c) - w0) / (7 * 864e5));
      if (p.days.includes(parseD(c).getDay()) && wk % p.n === 0) return c;
    }
    return addDaysTo(from, 7 * p.n);
  }
  // First date for a new repeating task: today, or the next chosen weekday.
  function firstOcc(spec) { const p = parseSpec(spec); return p && p.u === 'w' && p.days ? nextOcc(spec, plus(-1)) : TODAY(); }
  // The next round: the date moves to the next occurrence after today, a deadline keeps its distance, subtasks reset.
  function advance(t) {
    const now = TODAY();
    const anchor = t.date || t.due || now;
    let next = nextOcc(t.repeat, anchor);
    for (let i = 0; next <= now && i < 2000; i++) next = nextOcc(t.repeat, next);
    const out = { subs: t.subs.map((s) => ({ ...s, done: false })) };
    if (t.kind === 'count') out.count = 0; // a new round starts from zero
    if (t.date) { out.date = next; if (t.due) out.due = addDaysTo(t.due, daysBetween(t.date, next)); }
    else if (t.due) out.due = next;
    else out.date = next;
    return out;
  }
  const REPEAT_RE = /(^|\s)((?:every|each)\s+(?:(\d{1,3})\s+)?(days?|weekdays?|weeks?|months?|years?|(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*(?:\s*(?:,|and|&)\s*(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*)*)|daily|weekly|monthly|yearly|annually)(?=\s)/i;
  function repeatFrom(phrase, nStr, word) {
    const simple = { daily: '1d', weekly: '1w', monthly: '1m', yearly: '1y', annually: '1y' };
    if (simple[phrase.toLowerCase()]) return simple[phrase.toLowerCase()];
    const n = Math.max(1, +nStr || 1), w = word.toLowerCase();
    if (/^weekdays?$/.test(w)) return makeSpec(n, 'w', [1, 2, 3, 4, 5]);
    if (/^days?$/.test(w)) return n + 'd';
    if (/^weeks?$/.test(w)) return n + 'w';
    if (/^months?$/.test(w)) return n + 'm';
    if (/^years?$/.test(w)) return n + 'y';
    const days = w.split(/\s*(?:,|and|&)\s*/).map((x) => WDS[x] ?? WDS[x.slice(0, 3)]);
    if (days.some((d) => d == null)) return null;
    return makeSpec(n, 'w', days);
  }

  function parseQuick(text, ignore) {
    const out = { title: '', q: null, cat: null, newCat: null, date: null, due: null, repeat: null, tokens: [] };
    let s = ' ' + text + ' ';
    const ign = (raw) => ignore && ignore.has(raw.trim().toLowerCase());
    const cut = (start, len) => { s = s.slice(0, start) + ' ' + s.slice(start + len); };

    let m;
    // category: #name
    const re = /(^|\s)#([^\s#]+)(?=\s)/g;
    while ((m = re.exec(s))) {
      if (ign(m[0])) continue;
      const name = m[2].replace(/[_-]+/g, ' ').trim();
      const low = name.toLowerCase();
      const hit = cats.find((c) => c.name.toLowerCase() === low) ||
        (cats.filter((c) => c.name.toLowerCase().startsWith(low)).length === 1 ? cats.find((c) => c.name.toLowerCase().startsWith(low)) : null);
      if (hit) { out.cat = hit.id; out.tokens.push({ raw: m[0], label: '#' + hit.name, cls: 'cat', color: hit.color }); }
      else { out.newCat = name.charAt(0).toUpperCase() + name.slice(1); out.tokens.push({ raw: m[0], label: '#' + out.newCat + ' (new)', cls: 'cat new' }); }
      cut(m.index, m[0].length);
      break;
    }
    // repeat: "every mon", "daily", "every 2 weeks" … (before dates, so "every fri" is not read as a date)
    // "every …" wins over a bare "weekly"/"daily", which is often just part of the title ("Weekly review every fri").
    const all = [];
    const reG = new RegExp(REPEAT_RE.source, 'gi');
    while ((m = reG.exec(s))) { all.push(m); reG.lastIndex = m.index + m[0].length - 0; }
    m = all.find((x) => /^(every|each)\s/i.test(x[2]) && !ign(x[2])) || all.find((x) => !ign(x[2])) || null;
    if (m && !ign(m[2])) {
      const spec = repeatFrom(m[2], m[3], m[4] || '');
      if (spec) {
        out.repeat = spec;
        out.tokens.push({ raw: m[2], label: '↻ ' + repeatLabel(spec), cls: 'rep' });
        cut(m.index + m[1].length, m[2].length);
      }
    }
    // dates: "fri", "due 20.11", "next monday", "in 3 days" …
    for (let guard = 0; guard < 6 && (out.date == null || out.due == null); guard++) {
      DATE_RE.lastIndex = 0;
      let found = null;
      while ((m = DATE_RE.exec(s))) {
        const phrase = m[2], prefix = (m[3] || '').toLowerCase(), expr = m[4];
        const isDue = ['due', 'by', 'deadline', 'until', 'till', 'before'].includes(prefix);
        const atEnd = s.slice(m.index + m[0].length).trim() === '';
        if (ign(phrase)) continue;
        if (WEAK.test(expr) && !prefix && !atEnd) continue; // "sun cream", "chapter 3.4" stay as text
        if (isDue ? out.due != null : out.date != null) continue;
        const d = resolveDate(expr);
        if (!d) continue;
        found = { m, phrase, isDue, d };
        break;
      }
      if (!found) break;
      if (found.isDue) out.due = found.d; else out.date = found.d;
      out.tokens.push({ raw: found.phrase, label: (found.isDue ? 'Due ' : '') + dLabel(found.d), cls: found.isDue ? 'dl' : 'on' });
      cut(found.m.index + found.m[1].length, found.phrase.length);
    }
    out.title = s.replace(/\s+/g, ' ').trim();
    return out;
  }

  // Very long text: the first sentence becomes the title, the rest goes to notes.
  function splitLong(title) {
    if (title.length <= 140) return { title, desc: '' };
    const m = title.slice(0, 160).match(/^(.{12,}?[.!?])\s/);
    if (m) return { title: m[1], desc: title.slice(m[1].length).trim() };
    const cutAt = title.lastIndexOf(' ', 110);
    const head = title.slice(0, cutAt > 40 ? cutAt : 110);
    return { title: head + '…', desc: title };
  }
  const cleanLine = (l) => l.replace(/^\s*(?:[-*•–]|\d+[.)]|\[[ xX]?\])\s+/, '').trim();

  function ensureCat(name) {
    const low = name.toLowerCase();
    let c = cats.find((x) => x.name.toLowerCase() === low);
    if (c) return c.id;
    const used = new Set(cats.map((x) => x.color));
    c = { id: 'c' + uid(), name: name.slice(0, 40), color: PALETTE.find((p) => !used.has(p)) || PALETTE[cats.length % PALETTE.length] };
    cats.push(c);
    catsDirty = true;
    return c.id;
  }

  // New tasks go to the top of their list: one below the smallest order value in use.
  const topOrder = () => tasks.reduce((m, x) => Math.min(m, x.order), Date.now()) - 1;
  function newTask(fields) {
    const now = Date.now();
    const t = norm({ id: uid(), created: now, updated: now, order: topOrder(), status: 'active', ...fields });
    tasks.push(t);
    return t;
  }

  /* =====================================================================
     Add bar
     ===================================================================== */
  const addIn = $('newTitle');
  const preview = $('preview');
  const add = { q: [1, 2, 3, 4].includes(prefs.addQ) ? prefs.addQ : 2, cat: prefs.addCat || '', date: '', due: '' };
  let ignore = new Set();
  let pasted = null; // lines waiting for "add as N tasks?"

  function buildPrio(container, get, set) {
    container.textContent = '';
    [1, 2, 3, 4].forEach((n) => {
      const b = el('button', 'q' + n);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.style.setProperty('--qc', `var(--q${n})`);
      b.title = Q[n].name + ': ' + Q[n].sub;
      b.append(el('span', 'dot'), el('span', 'lbl', Q[n].name));
      b.onclick = () => { set(n); };
      container.appendChild(b);
    });
    const sync = () => container.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-checked', String(get() === i + 1)));
    sync();
    return sync;
  }

  function fillCatSelect() {
    const s = $('newCat');
    s.textContent = '';
    s.appendChild(new Option('No category', ''));
    cats.forEach((c) => s.appendChild(new Option(c.name, c.id)));
    s.appendChild(new Option('+ New category…', '__new'));
    if (add.cat && !catOf(add.cat)) add.cat = '';
    s.value = add.cat;
    s.classList.toggle('set', !!add.cat);
  }
  $('newCat').onchange = (e) => {
    if (e.target.value === '__new') {
      const name = (prompt('Name of the new category') || '').trim();
      if (name) { add.cat = ensureCat(name); queueSave(); render(); }
    } else add.cat = e.target.value;
    prefs.addCat = add.cat; savePrefs();
    fillCatSelect();
    addIn.focus();
  };
  const REPEAT_PRESETS = [['', "Doesn't repeat"], ['1d', 'Every day'], ['1w:1,2,3,4,5', 'Every weekday (Mon–Fri)'], ['1w', 'Every week'], ['2w', 'Every 2 weeks'], ['1m', 'Every month'], ['1y', 'Every year']];
  function syncAddRep() {
    const s = $('newRep');
    if (!s.options.length) {
      REPEAT_PRESETS.forEach(([v, l]) => s.appendChild(new Option(v ? '↻ ' + l : '↻ Repeat', v)));
      s.onchange = () => { add.repeat = s.value; syncAddRep(); renderPreview(); addIn.focus(); };
    }
    s.value = add.repeat || '';
    s.classList.toggle('set', !!add.repeat);
  }
  function syncAddDates() {
    [['newDo', 'date', 'Do on'], ['newDue', 'due', 'Deadline']].forEach(([id, f, label]) => {
      const b = $(id);
      b.classList.toggle('set', !!add[f]);
      b.querySelector('.lbl').textContent = add[f] ? (f === 'due' ? 'Due ' : '') + dLabel(add[f]) : label;
      b.title = add[f] ? 'Click to change or remove' : f === 'due' ? 'Set a deadline' : 'Plan a day to do it';
    });
  }
  ['newDo', 'newDue'].forEach((id) => {
    $(id).onclick = (e) => {
      const f = e.currentTarget.dataset.field;
      openPop(e.currentTarget, { field: f, fixed: true, value: add[f], set: (field, v) => { add[field] = v; syncAddDates(); renderPreview(); addIn.focus(); } });
    };
  });

  function renderPreview() {
    preview.textContent = '';
    if (pasted) {
      const box = el('span', 'ask');
      box.append(el('span', null, `Add ${pasted.length} tasks, one per pasted line?`));
      const yes = el('button', 'btn primary sm', `Add ${pasted.length} tasks`); yes.type = 'button';
      const no = el('button', 'btn sm', 'Keep as one'); no.type = 'button';
      yes.onclick = () => { const lines = pasted; pasted = null; addMany(lines); };
      no.onclick = () => { addIn.value = pasted.join(' '); pasted = null; renderPreview(); addIn.focus(); };
      box.append(yes, no);
      preview.appendChild(box);
      return;
    }
    const text = addIn.value.trim();
    if (!text) {
      preview.appendChild(el('span', null, 'Tip: tomorrow · fri · 20.11 · due fri · every mon · #work. Paste a list to add many.'));
      return;
    }
    const p = parseQuick(text, ignore);
    p.tokens.forEach((tk) => {
      const t = el('span', 'tok' + (tk.cls.includes('new') ? ' new' : ''));
      t.append(el('span', null, tk.label));
      const x = el('button'); x.type = 'button'; x.title = 'Keep “' + tk.raw.trim() + '” as text'; x.innerHTML = ICON.x;
      x.onclick = () => { ignore.add(tk.raw.trim().toLowerCase()); renderPreview(); addIn.focus(); };
      t.appendChild(x);
      preview.appendChild(t);
    });
    if (p.title.length > 140) preview.appendChild(el('span', 'note', 'Long text: the first sentence becomes the title, the rest goes to notes.'));
    else if (text.length > 240) preview.appendChild(el('span', null, text.length + '/2000'));
  }
  addIn.addEventListener('input', () => { if (!addIn.value.trim()) ignore = new Set(); pasted = null; renderPreview(); });
  addIn.addEventListener('paste', (e) => {
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    const lines = txt.split(/\r?\n/).map(cleanLine).filter(Boolean);
    if (lines.length > 1) { e.preventDefault(); pasted = lines.slice(0, 100); renderPreview(); }
  });
  addIn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { addIn.value = ''; pasted = null; ignore = new Set(); renderPreview(); addIn.blur(); }
  });

  function fromText(text, defaults) {
    const p = parseQuick(text, defaults.ignore);
    if (!p.title) return null;
    const { title, desc } = splitLong(p.title);
    const cat = p.newCat ? ensureCat(p.newCat) : p.cat ?? defaults.cat ?? '';
    return {
      title, desc, cat,
      q: p.q ?? defaults.q ?? 2,
      date: p.date ?? defaults.date ?? '',
      due: p.due ?? defaults.due ?? '',
      repeat: p.repeat || defaults.repeat || '',
    };
  }
  function withRepeatDate(f) { if (f && f.repeat && !f.date && !f.due) f.date = firstOcc(f.repeat); return f; }
  function addedMsg(t) {
    const now = TODAY();
    if (inToday(t, now)) return 'Added to Today.';
    if (t.date) return 'Planned for ' + dLow(t.date) + '. You will find it under Dates.';
    if (t.due) return 'Deadline ' + dLow(t.due) + '. You will find it under Dates.';
    return 'Added to Schedule.';
  }
  $('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (pasted) { const l = pasted; pasted = null; addMany(l); return; }
    const f = withRepeatDate(fromText(addIn.value, { ...add, ignore }));
    if (!f) { addIn.focus(); return; }
    const t = newTask(f);
    addIn.value = ''; ignore = new Set(); add.date = ''; add.due = ''; add.repeat = '';
    syncAddDates(); syncAddRep(); renderPreview();
    if (tab === 'done') tab = 'board';
    touch([t.id]); render(); flashIds([t.id]);
    toast(addedMsg(t), [{ id: t.id, t: null }]);
    addIn.focus();
  });
  function addMany(lines) {
    const ids = [];
    // Added last-to-first so the pasted list keeps its order at the top.
    [...lines].reverse().forEach((line) => { const f = withRepeatDate(fromText(line, add)); if (f) ids.unshift(newTask(f).id); });
    addIn.value = ''; ignore = new Set(); renderPreview();
    touch(ids); render(); flashIds(ids);
    toast('Added ' + ids.length + ' tasks.', ids.map((id) => ({ id, t: null })));
    addIn.focus();
  }

  /* ---------- phones: bottom add bar + search icon ---------- */
  const addForm = $('addForm');
  const isPhone = () => matchMedia('(max-width:640px)').matches;
  // The add bar shows its options (category, dates, repeat) only while you are adding a task.
  addForm.addEventListener('focusin', () => addForm.classList.add('open'));
  // Android's Back button only hides the keyboard and leaves the text box focused. When the keyboard goes away
  // while typing in the add box, treat it as leaving: fold the options away (typed text stays).
  let tallest = innerHeight;
  const keyboardGone = () => {
    const h = window.visualViewport ? visualViewport.height : innerHeight;
    if (h > tallest - 80 && document.activeElement === addIn && isPhone() && kbWasOpen) { addIn.blur(); addForm.classList.remove('open'); }
    kbWasOpen = h < tallest - 150;
    tallest = Math.max(tallest, h);
  };
  let kbWasOpen = false;
  addEventListener('resize', keyboardGone);
  if (window.visualViewport) visualViewport.addEventListener('resize', keyboardGone);
  addForm.addEventListener('focusout', () => setTimeout(() => {
    if (!addForm.contains(document.activeElement) && $('datePop').hidden && !pasted) addForm.classList.remove('open');
  }, 160));
  // Keep the bottom add bar above the on-screen keyboard (iPhone; Android resizes the page itself).
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const lift = () => document.documentElement.style.setProperty('--kb', Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) + 'px');
    vv.addEventListener('resize', lift); vv.addEventListener('scroll', lift);
  }
  // Short placeholder on a phone (the full example does not fit).
  const fullPlaceholder = addIn.placeholder;
  const fitPlaceholder = () => { addIn.placeholder = isPhone() ? 'Add a task…' : fullPlaceholder; };
  fitPlaceholder(); addEventListener('resize', fitPlaceholder);
  // On a phone the search box is an icon until tapped.
  const topBar = document.querySelector('.top');
  document.querySelector('.search').addEventListener('click', () => {
    if (!isPhone() || topBar.classList.contains('searching')) return;
    topBar.classList.add('searching'); $('search').focus();
  });
  $('search').addEventListener('blur', () => { if (!$('search').value.trim()) topBar.classList.remove('searching'); });

  /* =====================================================================
     Date popover (reschedule, add-bar dates)
     ===================================================================== */
  const pop = $('datePop');
  let popCtx = null;
  function openPop(anchor, ctx) {
    if (popCtx && popCtx.anchor === anchor && !pop.hidden) { closePop(); return; }
    popCtx = { ...ctx, anchor };
    $('popMode').hidden = !!ctx.fixed;
    syncPop();
    pop.hidden = false;
    const r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    pop.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
    pop.querySelector('.popq button').focus({ preventScroll: true });
  }
  function syncPop() {
    const f = popCtx.field;
    const val = popCtx.task ? (find(popCtx.task) || {})[f] : popCtx.value;
    $('popHead').textContent = (f === 'due' ? 'Deadline' : 'Do on') + (val ? ': ' + dLabel(val) : '');
    $('popMode').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.m === f));
    $('popDate').value = val || '';
    pop.querySelector('.clear').hidden = !val;
    pop.querySelectorAll('.popq button').forEach((b) => {
      const d = quick(b.dataset.d);
      let s = b.querySelector('small'); if (!s) { s = el('small'); b.appendChild(s); }
      s.textContent = dayName(d);
    });
  }
  function closePop() { pop.hidden = true; popCtx = null; }
  $('popMode').querySelectorAll('button').forEach((b) => { b.onclick = () => { popCtx.field = b.dataset.m; syncPop(); }; });
  function pickDate(v) {
    const c = popCtx; closePop();
    if (c.task) setTaskDate(c.task, c.field, v);
    else c.set(c.field, v);
  }
  pop.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => pickDate(b.dataset.d === 'none' ? '' : quick(b.dataset.d)); });
  $('popDate').onchange = (e) => { if (e.target.value) pickDate(e.target.value); };
  document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && !(popCtx && popCtx.anchor.contains(e.target))) closePop(); });
  addEventListener('resize', closePop);
  $('view').addEventListener('scroll', closePop, true);

  function setTaskDate(id, field, v) {
    const t = find(id); if (!t) return;
    const label = field === 'due' ? 'Deadline' : 'Planned';
    commit([id], () => { t[field] = v; }, v ? `${label}: ${dLabel(v)}.` : (field === 'due' ? 'Deadline removed.' : 'Date removed. It is back on the board.'));
  }

  /* =====================================================================
     Rendering
     ===================================================================== */
  const view = $('view');

  function matches(t) {
    if (prefs.filter && t.cat !== prefs.filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return t.title.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s) ||
      ((catOf(t.cat) || {}).name || '').toLowerCase().includes(s);
  }
  const byOrder = (a, b) => a.order - b.order;

  /* ---------- goal deadlines ("get 20 clients") and big deadlines (with parts) ---------- */
  // A task's subtasks: tasks whose `parent` is that task (big-deadline parts are the same thing).
  const partsOf = (id) => tasks.filter((x) => x.parent === id && x.status !== 'deleted' && x.id !== id).sort(byOrder);
  // The task and every subtask below it (to avoid making a task a subtask of its own subtask).
  function familyOf(id, seen = new Set()) { if (seen.has(id)) return seen; seen.add(id); partsOf(id).forEach((k) => familyOf(k.id, seen)); return seen; }
  // Subtasks always carry the category of their main task.
  function syncChildCats(t, changed = []) {
    partsOf(t.id).forEach((k) => { if (k.cat !== t.cat) { k.cat = t.cat; k.updated = Date.now(); changed.push(k.id); } syncChildCats(k, changed); });
    return changed;
  }
  // Older data kept subtasks as a checklist inside the task (t.subs). Turn each into a real task linked to it.
  // The new id is derived from the old one, so this is safe to run on several devices at once.
  function liftSubs() {
    const changed = [];
    tasks.slice().forEach((t) => {
      if (!t.subs || !t.subs.length) return;
      t.subs.forEach((s, i) => {
        const id = (t.id + '_' + s.id).replace(/\//g, '-').slice(0, 180);
        if (!find(id)) {
          tasks.push(norm({ id, title: s.title, cat: t.cat, parent: t.id, status: s.done ? 'done' : 'active',
            closedAt: s.done ? Date.now() : 0, created: t.created, order: t.order + (i + 1) / 1000 }));
          changed.push(id);
        }
      });
      t.subs = []; t.updated = Date.now(); changed.push(t.id);
    });
    if (changed.length) touch(changed);
    return changed.length;
  }
  function progressOf(t) {
    if (t.kind === 'count') {
      const goal = Math.max(1, t.goal || 1);
      return { done: Math.min(t.count, goal), total: goal, label: t.count + ' / ' + goal, title: t.count + ' of ' + goal + ' reached' };
    }
    if (t.kind === 'big') {
      const parts = partsOf(t.id);
      const done = parts.filter((x) => x.status === 'done').length + t.subs.filter((x) => x.done).length;
      const total = parts.length + t.subs.length;
      return { done, total, label: total ? done + ' / ' + total + ' done' : 'No subtasks yet', title: done + ' of ' + total + ' subtasks done' };
    }
    return null;
  }
  function bar(pr) {
    const b = el('div', 'gbar' + (pr.total && pr.done >= pr.total ? ' full' : ''));
    const i = el('i'); i.style.width = (pr.total ? Math.min(100, 100 * pr.done / pr.total) : 0) + '%';
    b.appendChild(i); b.title = pr.title;
    return b;
  }
  function goalRow(t, pr) {
    const row = el('div', 'goal');
    row.appendChild(bar(pr));
    row.appendChild(el('span', 'glabel', pr.label));
    if (t.kind === 'count') {
      const minus = el('button', 'gbtn', '−'); minus.type = 'button'; minus.title = 'One less';
      minus.setAttribute('aria-label', 'Decrease count: ' + t.title);
      minus.onclick = (e) => { e.stopPropagation(); bump(t.id, -1); };
      const plusB = el('button', 'gbtn plus', '+'); plusB.type = 'button'; plusB.title = 'One more';
      plusB.setAttribute('aria-label', 'Increase count: ' + t.title);
      plusB.onclick = (e) => { e.stopPropagation(); bump(t.id, 1); };
      row.append(minus, plusB);
    }
    row.onclick = (e) => e.stopPropagation();
    return row;
  }
  function bump(id, delta) {
    const t = find(id); if (!t) return;
    const before = t.count;
    commit([id], () => { t.count = Math.max(0, t.count + delta); }, null);
    if (t.goal && before < t.goal && t.count >= t.goal) {
      confetti(1.4); toast('Goal reached: ' + t.count + ' / ' + t.goal + '! Complete “' + short(t.title) + '”?'); offerComplete(id); }
  }

  function taskCard(t, ctx) {
    const now = ctx.now;
    const c = catOf(t.cat);
    const dueN = t.due ? diff(t.due) : null;
    const li = el('li', 'task' + (isLate(t, now) ? ' late' : '') +
      (t.due ? ' has-due' + (dueN < 0 ? ' due-over' : dueN <= 2 ? ' due-soon' : '') : '') + (t.kind ? ' kind-' + t.kind : ''));
    li.dataset.id = t.id;
    li.dataset.drag = 'task';
    if (c) li.style.setProperty('--cc', c.color);
    if (t.title.length > 90) li.title = t.title;

    const chk = el('button', 'check'); chk.type = 'button'; chk.innerHTML = ICON.check;
    chk.setAttribute('aria-label', 'Complete: ' + t.title);
    chk.title = 'Complete';
    chk.onclick = () => complete(t.id, li);

    const body = el('div', 'body');
    body.onclick = (e) => { if (!e.target.closest('.subs, .more, .goal, .subof')) openEdit(t.id); };
    // Subtask: a small link to its main task in the top-right corner.
    const par = t.parent && find(t.parent);
    let subof = null;
    if (par && par.status !== 'deleted') {
      li.classList.add('is-sub');
      subof = el('button', 'subof'); subof.type = 'button';
      subof.append(el('span', 'subarrow', '↳'), el('span', 'subname', par.title));
      subof.title = 'Subtask of “' + par.title + '”. Click to open it.';
      subof.setAttribute('aria-label', 'Open main task: ' + par.title);
      subof.onclick = (e) => { e.stopPropagation(); openEdit(par.id); };
    }
    body.appendChild(el('div', 'title', t.title));

    const meta = el('div', 'meta');
    if (c && !prefs.filter) { const ch = el('span', 'chip cat', c.name); meta.appendChild(ch); }
    if (t.date && ctx.showDate !== false && !(ctx.todayCol && t.date === now)) {
      const late = t.date < now;
      const ch = el('span', 'chip ' + (late ? 'late' : 'on'));
      ch.append(ic('cal'), document.createTextNode(late ? rel(t.date) : dLabel(t.date)));
      ch.title = 'Do on ' + dayName(t.date, true);
      meta.appendChild(ch);
    }
    if (t.due && ctx.showDue !== false) {
      const n = diff(t.due);
      const ch = el('span', 'chip ' + (n < 0 ? 'late' : n <= 2 ? 'dl soon' : 'dl'));
      ch.append(ic('flag'), document.createTextNode(n < 0 ? 'Due · ' + rel(t.due) : 'Due ' + (n <= 1 ? dLow(t.due) : dLabel(t.due) + ' · ' + rel(t.due))));
      ch.title = 'Deadline: ' + dayName(t.due, true);
      meta.appendChild(ch);
    }
    if (t.repeat) {
      const ch = el('span', 'chip rep');
      ch.append(ic('repeat'), document.createTextNode(repeatLabel(t.repeat)));
      ch.title = 'Repeats. Completing it moves it to the next date and keeps a copy in Completed.';
      meta.appendChild(ch);
    }
    const kids = partsOf(t.id);
    if (kids.length && t.kind !== 'big') {
      const n = kids.filter((s) => s.status === 'done').length;
      const ch = el('span', 'chip prog');
      const bar = el('i'); const fill = el('b'); fill.style.width = (100 * n / kids.length) + '%'; bar.appendChild(fill);
      ch.append(bar, document.createTextNode(n + '/' + kids.length));
      ch.title = n + ' of ' + kids.length + ' subtasks done';
      meta.appendChild(ch);
    }
    if (subof) meta.appendChild(subof); // bottom-right: link to the main task
    if (meta.children.length) body.appendChild(meta);
    const pr = progressOf(t);
    if (pr) body.appendChild(goalRow(t, pr));
    if (t.desc) body.appendChild(el('p', 'desc', t.desc));
    if (kids.length) body.appendChild(subList(t, kids));

    const acts = el('div', 'acts');
    const res = el('button', 'ib'); res.type = 'button'; res.innerHTML = ICON.cal; res.title = 'Date or deadline';
    res.setAttribute('aria-label', 'Set date: ' + t.title);
    res.onclick = (e) => { e.stopPropagation(); openPop(res, { task: t.id, field: t.due && !t.date ? 'due' : 'date' }); };
    const ed = el('button', 'ib'); ed.type = 'button'; ed.innerHTML = ICON.edit; ed.title = 'Open';
    ed.setAttribute('aria-label', 'Edit: ' + t.title);
    ed.onclick = () => openEdit(t.id);
    const del = el('button', 'ib del'); del.type = 'button'; del.innerHTML = ICON.trash; del.title = 'Delete (you can undo)';
    del.setAttribute('aria-label', 'Delete: ' + t.title);
    del.onclick = () => remove(t.id);
    acts.append(res, ed, del);
    li.append(chk, body, acts);
    return li;
  }

  // Checklist of a task's subtasks (which are tasks themselves). Ticking one completes that subtask.
  function subList(t, kids) {
    const ul = el('ul', 'subs');
    const LIMIT = 4;
    const showAll = expanded.has(t.id) || kids.length <= LIMIT + 1;
    const visible = showAll ? kids : kids.slice(0, LIMIT);
    visible.forEach((s) => {
      const done = s.status === 'done';
      const li = el('li', 'sub' + (done ? ' done' : ''));
      li.dataset.sid = s.id;
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = done;
      cb.setAttribute('aria-label', 'Subtask done: ' + s.title);
      cb.onchange = () => {
        if (cb.checked) confetti(s.due ? 1 : 0.6);
        commit([s.id], () => { s.status = cb.checked ? 'done' : 'active'; s.closedAt = cb.checked ? Date.now() : 0; }, cb.checked ? 'Completed “' + short(s.title) + '”' : null);
        const all = kids.length > 1 && kids.every((x) => x.status === 'done');
        if (all && t.status === 'active') { toast('All subtasks done. Complete the task too?', null); offerComplete(t.id); }
      };
      const name = el('span', 'stitle', s.title);
      name.title = 'Open this subtask';
      name.onclick = () => openEdit(s.id);
      li.append(cb, name);
      ul.appendChild(li);
    });
    ul.onclick = (e) => e.stopPropagation();
    if (kids.length > LIMIT + 1) {
      const more = el('button', 'more', showAll ? 'Show fewer' : `+ ${kids.length - LIMIT} more subtasks`);
      more.type = 'button';
      more.onclick = (e) => { e.stopPropagation(); if (showAll) expanded.delete(t.id); else expanded.add(t.id); render(); };
      const wrap = el('div'); wrap.append(ul, more);
      return wrap;
    }
    return ul;
  }
  function offerComplete(id) {
    const b = $('toastUndo');
    b.hidden = false; b.textContent = 'Complete';
    b.onclick = () => { toastEl.hidden = true; resetUndoBtn(); complete(id); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; resetUndoBtn(); }, 7000);
  }
  function resetUndoBtn() { const b = $('toastUndo'); b.textContent = 'Undo'; b.onclick = () => { toastEl.hidden = true; undo(); }; }

  function panel(o) {
    const p = el('section', 'panel ' + (o.cls || ''));
    if (o.qc) p.style.setProperty('--qc', o.qc);
    if (o.zone) p.dataset.zone = o.zone;
    if (o.head) p.appendChild(o.head);
    else {
      const h = el('div', 'phead');
      const h2 = el('h2');
      if (o.qc) h2.appendChild(el('span', 'qdot'));
      if (o.icon) h2.appendChild(ic(o.icon));
      h2.appendChild(document.createTextNode(o.title));
      h.appendChild(h2);
      if (o.sub) h.appendChild(el('span', 'sub', o.sub));
      h.appendChild(el('span', 'count', String(o.count ?? o.items.length)));
      if (o.addDefaults) h.appendChild(addButton(o.key, o.addLabel || 'Add a task to ' + o.title));
      p.appendChild(h);
    }
    if (o.addDefaults && inlineAdd && inlineAdd.key === o.key) p.appendChild(inlineAdder(o.key, o.addDefaults, o.addLabel));
    const ul = el('ul', 'list' + (o.grid ? ' grid' : ''));
    ul.dataset.items = 'li.task';
    ul.dataset.key = o.key;
    if (o.fill) o.fill(ul);
    else {
      if (!o.items.length) ul.appendChild(el('li', 'empty', o.empty));
      o.items.forEach((t) => ul.appendChild(taskCard(t, o.ctx)));
    }
    p.appendChild(ul);
    return p;
  }

  function addButton(key, label) {
    const b = el('button', 'ib addb'); b.type = 'button';
    b.innerHTML = ICON.plus; b.title = label; b.setAttribute('aria-label', label);
    b.onclick = () => { inlineAdd = inlineAdd && inlineAdd.key === key ? null : { key, value: '' }; render(); };
    return b;
  }
  function inlineAdder(key, defaults, label) {
    const wrap = el('div', 'inadd');
    const inp = el('input');
    inp.type = 'text'; inp.maxLength = 2000; inp.value = inlineAdd.value;
    inp.placeholder = 'Type and press Enter · Esc to close';
    inp.setAttribute('aria-label', label || 'Add task');
    inp.oninput = () => { inlineAdd.value = inp.value; };
    inp.onkeydown = (e) => {
      if (e.key === 'Escape') { inlineAdd = null; render(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const f = withRepeatDate(fromText(inp.value, { cat: prefs.filter || '', ...defaults }));
        if (!f) return;
        const t = newTask(f);
        inlineAdd = { key, value: '' };
        touch([t.id]); render(); flashIds([t.id]);
        if (key === 'inbox' && (t.date || t.due)) toast(addedMsg(t));
      }
    };
    inp.onblur = () => {
      setTimeout(() => {
        const a = document.activeElement;
        if (a && a.closest && a.closest('.inadd')) return; // the field was just re-created after adding a task
        if (inlineAdd && inlineAdd.key === key && !inlineAdd.value.trim() && !drag) { inlineAdd = null; render(); }
      }, 150);
    };
    wrap.appendChild(inp);
    wrap.appendChild(el('div', 'ihint', 'Works with fri, due 20.11, every mon, #work'));
    requestAnimationFrame(() => { if (document.activeElement !== inp) inp.focus({ preventScroll: false }); });
    return wrap;
  }

  /* ---------- filters ---------- */
  function renderFilters(active) {
    const box = $('filters');
    box.textContent = '';
    if (prefs.filter && !catOf(prefs.filter)) prefs.filter = '';
    const mk = (label, id, color, n) => {
      const b = el('button', 'fchip');
      b.type = 'button';
      b.setAttribute('aria-pressed', String((prefs.filter || '') === id));
      if (color) { b.style.setProperty('--cc', color); b.appendChild(el('span', 'cdot')); }
      b.appendChild(document.createTextNode(label));
      if (n != null) b.appendChild(el('span', 'c', String(n)));
      b.onclick = () => {
        prefs.filter = prefs.filter === id ? '' : id;
        if (prefs.filter) { add.cat = prefs.filter; fillCatSelect(); }
        savePrefs(); render();
      };
      return b;
    };
    box.appendChild(mk('All', '', null, active.length));
    cats.forEach((c) => box.appendChild(mk(c.name, c.id, c.color, active.filter((t) => t.cat === c.id).length)));
    const m = el('button', 'fchip manage', 'Edit categories'); m.type = 'button';
    m.onclick = () => openSettings(true);
    box.appendChild(m);
    if (search) {
      const n = tasks.filter((t) => (tab === 'done' ? !isActive(t) : isActive(t)) && matches(t)).length;
      box.appendChild(el('span', 'fsum', n + (n === 1 ? ' match' : ' matches') + ' for “' + search + '”'));
    }
  }

  /* ---------- main render ---------- */
  function render() {
    const scroll = {};
    view.querySelectorAll('.list[data-key]').forEach((l) => { scroll[l.dataset.key] = l.scrollTop; });
    const now = TODAY();
    const active = tasks.filter(isActive);
    const shown = active.filter(matches);
    const closed = tasks.filter((t) => !isActive(t));

    TABS.forEach((n) => $('tab-' + n).setAttribute('aria-selected', String(tab === n)));
    const dated = active.filter((t) => t.date || t.due).length;
    $('tab-dates').querySelector('.n').textContent = dated ? String(dated) : '';
    $('tab-done').querySelector('.n').textContent = closed.filter((t) => t.status === 'done').length || '';
    syncPhoneHeader();
    renderFilters(active);
    view.textContent = '';

    if (tab === 'board') view.appendChild(renderBoard(shown, now));
    else if (tab === 'dates') view.appendChild(renderDates(shown, now));
    else view.appendChild(renderDone(closed.filter(matches)));

    view.querySelectorAll('.list[data-key]').forEach((l) => { if (scroll[l.dataset.key]) l.scrollTop = scroll[l.dataset.key]; });
    if (drag) refreshDragEl();
  }

  function renderBoard(shown, now) {
    const board = el('div', 'board');
    const split = Math.min(0.65, Math.max(0.25, prefs.splitX || 0.4));
    board.style.setProperty('--a', split + 'fr');
    board.style.setProperty('--b', (1 - split) + 'fr');

    // Left: Schedule = everything without a planned day or a deadline.
    const items = shown.filter((t) => !t.date && !t.due).sort(byOrder);
    board.appendChild(panel({
      cls: 'inbox', title: 'Schedule', sub: 'No date or deadline yet', items, key: 'inbox', zone: 'inbox',
      ctx: { now }, empty: search ? 'No matches.' : 'Nothing waiting. New tasks without a date land here. Drag one to Today, or onto a day in Dates.',
      addDefaults: {}, addLabel: 'Add a task to Schedule',
    }));

    const sp = el('div', 'splitter');
    sp.title = 'Drag to resize · double-click to reset';
    sp.setAttribute('role', 'separator');
    sp.setAttribute('aria-orientation', 'vertical');
    sp.addEventListener('pointerdown', (e) => startSplit(e, board, sp));
    sp.ondblclick = () => { prefs.splitX = 0.4; savePrefs(); render(); };
    board.appendChild(sp);

    const todays = shown.filter((t) => inToday(t, now))
      .sort((a, b) => (isLate(b, now) - isLate(a, now)) || byOrder(a, b));
    const lateN = todays.filter((t) => isLate(t, now)).length;
    const doneToday = tasks.filter((t) => t.status === 'done' && t.closedAt && ymd(new Date(t.closedAt)) === now).length;
    const soon = shown.filter((t) => t.due && t.due > now && diff(t.due) <= 7);

    const head = el('div', 'thead');
    head.appendChild(el('h2', null, 'Today'));
    const two = (cls, long, shortText) => { const e = el('span', cls); e.append(el('span', 'lf', long), el('span', 'ls', shortText)); return e; };
    head.appendChild(two('tdate', today0().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      today0().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })));
    const stats = el('div', 'tstats');
    // "to do" counts only today's tasks; overdue ones have their own count, so nothing is counted twice.
    if (todays.length - lateN) stats.appendChild(two('stat', (todays.length - lateN) + ' to do', (todays.length - lateN) + ' to do'));
    if (lateN) stats.appendChild(two('stat late', lateN + ' overdue', lateN + ' late'));
    if (doneToday) stats.appendChild(two('stat okk', '✓ ' + doneToday + ' done today', '✓ ' + doneToday));
    head.appendChild(stats);
    const tadd = addButton('today', 'Add a task for today'); tadd.classList.add('wide'); tadd.append(el('span', 'lf', 'Add for today'));
    if (todays.length + doneToday) {
      const prog = el('div', 'tprog'); prog.title = doneToday + ' of ' + (todays.length + doneToday) + ' done today';
      const bar = el('i'); bar.style.width = (100 * doneToday / (todays.length + doneToday)) + '%'; prog.appendChild(bar);
      head.appendChild(prog);
    }
    if (soon.length) {
      const l = el('button', 'linkbtn'); l.type = 'button';
      l.append(ic('flag'), el('span', 'lf', soon.length + (soon.length === 1 ? ' deadline' : ' deadlines') + ' in the next 7 days'), el('span', 'ls', soon.length + ' soon'), ic('arrow'));
      l.title = soon.length + (soon.length === 1 ? ' deadline' : ' deadlines') + ' in the next 7 days';
      l.onclick = () => setTab('dates');
      head.appendChild(l);
    }
    head.appendChild(tadd);
    board.appendChild(panel({
      cls: 'today', head, items: todays, key: 'today', zone: 'today', grid: true,
      ctx: { now, todayCol: true },
      empty: search ? 'No matches for today.' : 'Nothing planned for today. Drag tasks here from Schedule, or press + Add for today.',
      addDefaults: { date: now }, addLabel: 'Add a task for today',
    }));
    return board;
  }

  function startSplit(e, board, sp) {
    e.preventDefault();
    sp.classList.add('active');
    sp.setPointerCapture(e.pointerId);
    const r = board.getBoundingClientRect();
    const move = (ev) => {
      const f = Math.min(0.65, Math.max(0.25, (ev.clientX - r.left) / r.width));
      prefs.splitX = f;
      board.style.setProperty('--a', f + 'fr');
      board.style.setProperty('--b', (1 - f) + 'fr');
    };
    const up = () => { sp.classList.remove('active'); sp.removeEventListener('pointermove', move); savePrefs(); };
    sp.addEventListener('pointermove', move);
    sp.addEventListener('pointerup', up, { once: true });
    sp.addEventListener('pointercancel', up, { once: true });
  }

  function renderDates(shown, now) {
    const wrap = el('div', 'dates');
    // 14-day strip: drop a task on a day to plan it then. Arrows move it a week back or forward.
    const row = el('div', 'striprow');
    const arrow = (step, label) => {
      const b = el('button', 'stripnav'); b.type = 'button';
      b.innerHTML = step < 0 ? svg('<path d="M10 3L5 8l5 5"/>', '2') : svg('<path d="M6 3l5 5-5 5"/>', '2');
      b.title = label + ' (or the ' + (step < 0 ? '←' : '→') + ' key; hold a dragged task here to keep going)'; b.setAttribute('aria-label', label);
      b.dataset.zone = 'nav:' + step;
      b.onclick = () => { stripOffset += step; render(); };
      return b;
    };
    // Back-to-today sits on the side where today is: left when looking ahead, right when looking back.
    const home = () => {
      const back = el('button', 'stripnav home'); back.type = 'button';
      back.innerHTML = ICON.sun; back.title = 'Back to today'; back.setAttribute('aria-label', 'Back to today');
      back.onclick = () => { stripOffset = 0; render(); };
      return back;
    };
    const left = el('div', 'navcol');
    if (stripOffset > 0) left.appendChild(home());
    left.appendChild(arrow(-7, 'Previous week'));
    row.appendChild(left);
    const strip = el('div', 'strip');
    for (let i = 0; i < 14; i++) {
      const d = plus(stripOffset + i), dt = parseD(d);
      const on = shown.filter((t) => t.date === d).length, du = shown.filter((t) => t.due === d).length;
      const cell = el('div', 'day' + (d === now ? ' is-today' : '') + (d < now ? ' past' : '') + (dt.getDay() === 0 || dt.getDay() === 6 ? ' weekend' : '') + (du ? ' has-due' : ''));
      cell.dataset.zone = 'day:' + d;
      cell.dataset.month = dt.toLocaleDateString(undefined, { month: 'short' }).replace('.', ''); // faint month in the background
      cell.title = dayName(d, true) + (du ? ' · ' + du + (du === 1 ? ' deadline' : ' deadlines') : '') + (on ? ' · ' + on + ' planned' : '') + '. Drop a task to plan it for this day, or click to jump there.';
      cell.append(el('div', 'wd', d === now ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' })), el('div', 'dn', String(dt.getDate())));
      const dots = el('div', 'dots');
      for (let k = 0; k < Math.min(on, 4); k++) dots.appendChild(el('i'));
      for (let k = 0; k < Math.min(du, 3); k++) dots.appendChild(el('i', 'd')); // deadlines: amber dots (plus the amber top line)
      cell.appendChild(dots);
      cell.onclick = () => {
        const g = view.querySelectorAll(`li.group[data-day="${d}"]`);
        if (!g.length) { toast('Nothing planned for ' + dLow(d) + ' yet. Drag a task onto this day to plan it.'); return; }
        g.forEach((x) => { x.scrollIntoView({ block: 'start', behavior: 'smooth' }); x.classList.remove('pulse'); void x.offsetWidth; x.classList.add('pulse'); });
      };
      strip.appendChild(cell);
    }
    row.appendChild(strip);
    const right = el('div', 'navcol');
    if (stripOffset < 0) right.appendChild(home());
    right.appendChild(arrow(7, 'Next week'));
    row.appendChild(right);
    wrap.appendChild(row);

    const cols = el('div', 'cols');
    [['date', 'Planned', 'cal', 'k-on', 'Days you plan to do things. Drop a task on a day to move it.', 'Nothing planned. Drag a task onto a day above, or type “fri” when adding.'],
      ['due', 'Deadlines', 'flag', 'k-due', 'Hand-in and due dates, earliest first.', 'No deadlines. Type “due fri” when adding, or drag a task here.']].forEach(([field, title, icon, cls, sub, empty]) => {
      const items = shown.filter((t) => t[field]).sort((a, b) => a[field].localeCompare(b[field]) || byOrder(a, b));
      cols.appendChild(panel({
        cls: 'kpanel ' + cls, title, icon, sub, items, key: 'dates-' + field, zone: 'dates:' + field,
        fill: (ul) => {
          if (!items.length) { ul.appendChild(el('li', 'empty', search ? 'No matches.' : empty)); return; }
          let last = null;
          items.forEach((t) => {
            const d = t[field];
            if (d !== last) {
              last = d;
              const n = diff(d);
              const g = el('li', 'group' + (n < 0 ? ' late' : n === 0 ? ' is-today' : ''));
              g.dataset.day = d;
              g.append(document.createTextNode(n < 0 ? 'Overdue · ' + dayName(d) : dLabel(d)),
                el('span', 'gsub', n < 0 ? rel(d) : n >= 7 ? rel(d) : n >= 2 ? dayName(d) + ' · ' + rel(d) : dayName(d)));
              ul.appendChild(g);
            }
            ul.appendChild(taskCard(t, { now, showDate: field !== 'date', showDue: field !== 'due' }));
          });
        },
      }));
    });
    wrap.appendChild(cols);
    return wrap;
  }

  function renderDone(closed) {
    const wrap = el('div', 'donewrap');
    const show = prefs.doneShow || 'all';
    const bar = el('div', 'dbar');
    const seg = el('div', 'seg small');
    [['all', 'All'], ['done', 'Completed'], ['deleted', 'Deleted']].forEach(([k, l]) => {
      const b = el('button', null, l); b.type = 'button';
      b.classList.toggle('on', show === k);
      b.onclick = () => { prefs.doneShow = k; savePrefs(); render(); };
      seg.appendChild(b);
    });
    bar.appendChild(seg);
    bar.appendChild(el('span', 'grow'));
    [['done', 'Clear completed'], ['deleted', 'Empty deleted']].forEach(([st, label]) => {
      const list = closed.filter((t) => t.status === st);
      if (!list.length) return;
      const b = el('button', 'mini danger', `${label} (${list.length})`); b.type = 'button';
      confirmClick(b, b.textContent, () => purge(list.map((t) => t.id)));
      bar.appendChild(b);
    });
    wrap.appendChild(bar);
    const items = closed.filter((t) => show === 'all' || t.status === show).sort((a, b) => b.closedAt - a.closedAt);
    wrap.appendChild(panel({
      cls: '', title: show === 'deleted' ? 'Deleted' : show === 'done' ? 'Completed' : 'Completed and deleted', items, key: 'done',
      fill: (ul) => {
        if (!items.length) { ul.appendChild(el('li', 'empty', search ? 'No matches.' : 'Nothing here yet. Completed and deleted tasks are kept here so you can restore them.')); return; }
        let last = null;
        items.forEach((t) => {
          const d = ymd(new Date(t.closedAt || Date.now()));
          if (d !== last) { last = d; const g = el('li', 'group'); g.append(document.createTextNode(dLabel(d)), el('span', 'gsub', dLabel(d) === dayName(d) ? '' : dayName(d))); ul.appendChild(g); }
          ul.appendChild(closedRow(t));
        });
      },
    }));
    return wrap;
  }
  function closedRow(t) {
    const del = t.status === 'deleted';
    const li = el('li', 'closed' + (del ? ' deleted' : ''));
    const c = catOf(t.cat);
    const mark = el('span', 'mark'); mark.innerHTML = del ? ICON.x : ICON.check;
    const body = el('div', 'body');
    body.appendChild(el('div', 'title', t.title));
    const meta = el('div', 'meta');
    if (c) { const ch = el('span', 'chip cat', c.name); ch.style.setProperty('--cc', c.color); meta.appendChild(ch); }
    meta.appendChild(el('span', 'chip', (del ? 'Deleted ' : 'Completed ') + new Date(t.closedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })));
    const kids = partsOf(t.id); if (kids.length) meta.appendChild(el('span', 'chip', kids.filter((s) => s.status === 'done').length + '/' + kids.length + ' subtasks'));
    body.appendChild(meta);
    const r = el('button', 'mini', 'Restore'); r.type = 'button';
    r.onclick = () => commit([t.id], () => { t.status = 'active'; t.closedAt = 0; }, 'Restored “' + short(t.title) + '”');
    const f = el('button', 'mini danger', 'Delete forever'); f.type = 'button';
    f.setAttribute('aria-label', 'Delete forever: ' + t.title);
    confirmClick(f, 'Delete forever', () => purge([t.id]));
    li.append(mark, body, r, f);
    return li;
  }
  function confirmClick(btn, label, action) {
    let armed = false, timer = 0;
    btn.onclick = () => {
      if (armed) { clearTimeout(timer); action(); return; }
      armed = true; btn.textContent = 'Click again to confirm'; btn.classList.add('armed');
      timer = setTimeout(() => { armed = false; btn.textContent = label; btn.classList.remove('armed'); }, 3500);
    };
  }

  function setTab(n) {
    tab = n; prefs.tab = n; savePrefs(); closePop(); inlineAdd = null; render();
  }
  TABS.forEach((n) => { $('tab-' + n).onclick = () => setTab(n); });

  /* ---------- phones: the title switches views; categories sit behind a filter icon ---------- */
  const VIEW_NAMES = { board: 'Board', dates: 'Dates', done: 'Completed' };
  const viewMenu = $('viewMenu'), viewBtn = $('viewBtn'), filterBtn = $('filterBtn');
  function syncPhoneHeader() {
    $('viewName').textContent = VIEW_NAMES[tab];
    viewMenu.querySelectorAll('[data-view]').forEach((b) => {
      b.classList.toggle('on', b.dataset.view === tab);
      const n = b.querySelector('.n'), src = $('tab-' + b.dataset.view).querySelector('.n');
      if (n && src) n.textContent = src.textContent;
    });
    const c = prefs.filter && catOf(prefs.filter);
    filterBtn.classList.toggle('on', !!c);
    if (c) filterBtn.style.setProperty('--cc', c.color); else filterBtn.style.removeProperty('--cc');
    filterBtn.title = c ? 'Showing only ' + c.name : 'Filter by category';
  }
  function closeViewMenu() { viewMenu.hidden = true; viewBtn.setAttribute('aria-expanded', 'false'); }
  viewBtn.onclick = (e) => { e.stopPropagation(); const open = viewMenu.hidden; viewMenu.hidden = !open; viewBtn.setAttribute('aria-expanded', String(open)); };
  viewMenu.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => { closeViewMenu(); setTab(b.dataset.view); }; });
  document.addEventListener('pointerdown', (e) => { if (!viewMenu.hidden && !viewMenu.contains(e.target) && !viewBtn.contains(e.target)) closeViewMenu(); });
  const topEl = document.querySelector('.top');
  filterBtn.onclick = () => { const open = !topEl.classList.contains('filters-open'); topEl.classList.toggle('filters-open', open); filterBtn.setAttribute('aria-expanded', String(open)); };
  // After picking a category on a phone, fold the list away again.
  $('filters').addEventListener('click', (e) => {
    if (e.target.closest('.fchip:not(.manage)') && isPhone()) { topEl.classList.remove('filters-open'); filterBtn.setAttribute('aria-expanded', 'false'); }
  });

  /* =====================================================================
     Drag and drop (mouse, pen and touch)
     ===================================================================== */
  let drag = null;
  let pre = null;
  let suppressClick = false;
  const dock = $('dock');

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    const item = e.target.closest('[data-drag]');
    if (!item) return;
    const isHandle = !!e.target.closest('.handle');
    if (!isHandle && e.target.closest('button, input, textarea, select, a, label, .more')) return;
    if (item.dataset.drag === 'dsub' && !isHandle) return;
    pre = { item, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', timer: 0 };
    if (pre.touch && !isHandle) {
      pre.timer = setTimeout(() => { if (pre) begin(pre.x, pre.y); }, 320);
    } else if (isHandle) e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (pre && !drag) {
      const dist = Math.hypot(e.clientX - pre.x, e.clientY - pre.y);
      if (pre.touch && pre.timer) { if (dist > 8) { clearTimeout(pre.timer); pre = null; } return; }
      if (dist > 5) begin(e.clientX, e.clientY);
    }
    if (drag) { drag.x = e.clientX; drag.y = e.clientY; moveDrag(); }
  });
  document.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
  document.addEventListener('pointerup', () => { if (pre) { clearTimeout(pre.timer); pre = null; } if (drag) endDrag(true); });
  document.addEventListener('pointercancel', () => { if (pre) { clearTimeout(pre.timer); pre = null; } if (drag) endDrag(false); });
  document.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);
  document.addEventListener('contextmenu', (e) => { if (drag) e.preventDefault(); });

  function begin(x, y) {
    const p = pre; pre = null; clearTimeout(p.timer);
    const it = p.item, r = it.getBoundingClientRect();
    drag = {
      kind: it.dataset.drag, id: it.dataset.id, sid: it.dataset.sid, task: it.dataset.task,
      offX: p.x - r.left, offY: p.y - r.top, x, y, zone: null, before: null, list: null, tabTimer: 0, tabFor: null,
    };
    const g = it.cloneNode(true);
    g.classList.add('drag-ghost'); g.classList.remove('dragging', 'flash');
    g.style.width = r.width + 'px';
    g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    (drag.kind === 'dsub' ? dlg : document.body).appendChild(g); // the dialog sits in the top layer
    drag.ghost = g;
    it.classList.add('dragging');
    document.body.classList.add('is-dragging');
    if (drag.kind === 'task') dock.hidden = false;
    closePop();
    if (navigator.vibrate && p.touch) navigator.vibrate(12);
    moveDrag();
    tick();
  }
  function dragEl() {
    if (!drag) return null;
    if (drag.kind === 'task') return document.querySelector(`li.task[data-id="${CSS.escape(drag.id)}"]:not(.drag-ghost)`);
    if (drag.kind === 'sub') return document.querySelector(`li.sub[data-sid="${CSS.escape(drag.sid)}"][data-task="${CSS.escape(drag.task)}"]:not(.drag-ghost li)`);
    return $('eSubs').querySelector(`li[data-sid="${CSS.escape(drag.sid)}"]`);
  }
  function refreshDragEl() { const n = dragEl(); if (n) n.classList.add('dragging'); }
  function clearMarks() {
    document.querySelectorAll('.over, .drop-before, .drop-end').forEach((n) => n.classList.remove('over', 'drop-before', 'drop-end'));
  }
  function accepts(zone) {
    const z = zone.dataset.zone;
    if (drag.kind === 'task') return !z.startsWith('subs:') && z !== 'dsubs';
    if (drag.kind === 'sub') return z === 'subs:' + drag.task;
    return z === 'dsubs';
  }
  function moveDrag() {
    const { x, y } = drag;
    drag.ghost.style.transform = `translate(${x - drag.offX}px, ${y - drag.offY}px) rotate(${drag.kind === 'task' ? 1.2 : 0}deg)`;
    const hit = document.elementFromPoint(x, y);
    let zone = hit && hit.closest('[data-zone]');
    while (zone && !accepts(zone)) zone = zone.parentElement && zone.parentElement.closest('[data-zone]');
    clearMarks();
    drag.zone = zone; drag.before = null; drag.list = null; drag.hitGroup = null;
    if (!zone) { stopTabTimer(); return; }
    zone.classList.add('over');
    const z = zone.dataset.zone;
    if (z.startsWith('tab:')) {
      const name = z.slice(4);
      if (name !== tab && name !== 'done' && drag.tabFor !== name) {
        stopTabTimer(); drag.tabFor = name;
        drag.tabTimer = setTimeout(() => { if (drag && drag.tabFor === name) { setTab(name); } }, 550);
      }
      return;
    }
    if (z.startsWith('nav:')) { // holding a task on a strip arrow keeps flipping weeks
      if (drag.tabFor !== z) {
        stopTabTimer(); drag.tabFor = z;
        const step = +z.slice(4);
        const go = () => { if (drag && drag.tabFor === z) { stripOffset += step; render(); drag.tabTimer = setTimeout(go, 800); } };
        drag.tabTimer = setTimeout(go, 450);
      }
      return;
    }
    stopTabTimer();
    const list = zone.matches('[data-items]') ? zone : zone.querySelector('.list[data-items]');
    if (!list) return;
    drag.list = list;
    const g = hit.closest('li.group');
    if (g && list.contains(g)) { drag.hitGroup = g.dataset.day; g.classList.add('over'); }
    const before = itemBefore(list, x, y);
    drag.before = before;
    if (!drag.hitGroup) { if (before) before.classList.add('drop-before'); else list.classList.add('drop-end'); }
  }
  function stopTabTimer() { if (drag) { clearTimeout(drag.tabTimer); drag.tabFor = null; } }
  function listItems(list) {
    return [...list.querySelectorAll(':scope > ' + list.dataset.items + ', :scope > div > ' + list.dataset.items)]
      .filter((n) => !n.classList.contains('dragging') && !n.classList.contains('drag-ghost'));
  }
  function itemBefore(list, x, y) {
    const grid = list.classList.contains('grid');
    for (const it of listItems(list)) {
      const r = it.getBoundingClientRect();
      if (grid ? (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) : y < r.top + r.height / 2) return it;
    }
    return null;
  }
  // Scroll lists (or the page) while holding a dragged card near an edge.
  function tick() {
    if (!drag) return;
    const sc = drag.list && drag.list.scrollHeight > drag.list.clientHeight ? drag.list : null;
    let moved = false;
    if (sc) {
      const r = sc.getBoundingClientRect();
      if (drag.y < r.top + 36 && sc.scrollTop > 0) { sc.scrollTop -= 10; moved = true; }
      else if (drag.y > r.bottom - 36) { const b = sc.scrollTop; sc.scrollTop += 10; moved = sc.scrollTop !== b; }
    }
    if (!moved && document.scrollingElement.scrollHeight > innerHeight) {
      if (drag.y < 50) { scrollBy(0, -12); moved = true; } else if (drag.y > innerHeight - 50) { scrollBy(0, 12); moved = true; }
    }
    if (moved) moveDrag();
    requestAnimationFrame(tick);
  }
  function endDrag(ok) {
    const d = drag; drag = null;
    clearTimeout(d.tabTimer);
    d.ghost.remove();
    document.body.classList.remove('is-dragging');
    dock.hidden = true;
    clearMarks();
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    if (ok && d.zone) drop(d); // still marked .dragging here, so it is not counted as its own neighbour
    document.querySelectorAll('.dragging').forEach((n) => n.classList.remove('dragging'));
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drag) { e.stopPropagation(); endDrag(false); } }, true);

  // New order value between the neighbours where the card was dropped.
  function orderAt(list, before, getOrder) {
    const items = listItems(list);
    const i = before ? items.indexOf(before) : items.length;
    const prev = items[i - 1], next = items[i];
    const po = prev && getOrder(prev), no = next && getOrder(next);
    if (po == null && no == null) return Date.now();
    if (po == null) return no - 1;
    if (no == null) return po + 1;
    return (po + no) / 2;
  }

  function drop(d) {
    const z = d.zone.dataset.zone;
    const ci = z.indexOf(':');
    const [type, arg] = ci < 0 ? [z, ''] : [z.slice(0, ci), z.slice(ci + 1)];

    if (d.kind === 'sub' || d.kind === 'dsub') {
      // Reorder subtasks (in the task window): give the moved one an order value between its new neighbours.
      const s = find(d.sid); if (!s) return;
      const ord = orderAt(d.list, d.before, (n) => (find(n.dataset.sid) || {}).order);
      commit([s.id], () => { s.order = ord; }, null);
      drawSubs();
      return;
    }

    const t = find(d.id); if (!t) return;
    const now = TODAY();
    const ord = d.list ? orderAt(d.list, d.before, (n) => (find(n.dataset.id) || {}).order) : t.order;
    let msg = null;
    const before = { q: t.q, date: t.date, due: t.due };

    if (type === 'inbox') {
      // Schedule holds only tasks without a day or deadline, so dropping here clears both.
      commit([t.id], () => { t.date = ''; t.due = ''; t.order = ord; }, null);
      if (before.date || before.due) msg = 'Moved to Schedule. ' + (before.date && before.due ? 'Its day and deadline were removed.' : before.due ? 'Its deadline was removed.' : 'Its planned day was removed.');
    } else if (type === 'today') {
      commit([t.id], () => { if (!inToday(t, now)) t.date = now; t.order = ord; }, null);
      if (!inToday({ ...t, ...before }, now)) msg = 'Planned for today.';
    } else if (type === 'day') {
      commit([t.id], () => { t.date = arg; }, null);
      msg = 'Planned for ' + dLow(arg) + '.';
    } else if (type === 'dates') {
      const field = arg;
      let day = d.hitGroup || (d.before && d.before.matches('li.task') ? (find(d.before.dataset.id) || {})[field] : null);
      if (!day && d.before) { const g = d.before.previousElementSibling; day = g && g.dataset.day; }
      if (!day) { const items = listItems(d.list); const lastCard = items[items.length - 1]; day = lastCard ? (find(lastCard.dataset.id) || {})[field] : null; }
      day = day || t[field] || now;
      commit([t.id], () => { t[field] = day; t.order = ord; }, null);
      if (before[field] !== day) msg = (field === 'due' ? 'Deadline set to ' : 'Planned for ') + dLow(day) + '. Use the calendar button to pick another day.';
    } else if (type === 'tab' && arg === 'done') {
      complete(t.id); return;
    } else if (type === 'dock') {
      if (arg === 'done') { complete(t.id); return; }
      if (arg === 'delete') { remove(t.id); return; }
      const day = arg === 'tomorrow' ? plus(1) : nextWd(1);
      commit([t.id], () => { t.date = day; }, null);
      msg = 'Planned for ' + dLow(day) + ' (' + dayName(day) + ').';
    } else return;

    if (msg) toast(msg, [{ id: t.id, t: { ...clone(t), ...before } }]);
    flashIds([t.id]);
  }

  /* =====================================================================
     Edit dialog (changes save as you type)
     ===================================================================== */
  const dlg = $('editDlg');
  const eTitle = $('eTitle'), eDesc = $('eDesc'), eSubs = $('eSubs'), eSubNew = $('eSubNew');
  const edit = { id: null, snap: null, timer: 0 };

  function editTask() { return find(edit.id); }
  function editChanged(delay) {
    clearTimeout(edit.timer);
    const t = editTask(); if (!t) return;
    t.updated = Date.now();
    $('eRevert').hidden = false;
    const go = () => { touch([t.id]); render(); const s = $('eSaved'); s.textContent = 'Saved'; s.classList.add('flash'); setTimeout(() => { s.textContent = 'Changes save automatically'; s.classList.remove('flash'); }, 1200); };
    if (delay) edit.timer = setTimeout(go, delay); else go();
  }

  function autosize() { eTitle.style.height = 'auto'; eTitle.style.height = eTitle.scrollHeight + 'px'; }
  eTitle.addEventListener('input', () => {
    if (/\n/.test(eTitle.value)) eTitle.value = eTitle.value.replace(/\s*\n\s*/g, ' ');
    autosize();
    const v = eTitle.value.trim();
    eTitle.classList.toggle('bad', !v);
    if (!v) return;
    editTask().title = v.slice(0, 300);
    editChanged(400);
  });
  eTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); eDesc.focus(); } });
  eDesc.addEventListener('input', () => { editTask().desc = eDesc.value.slice(0, 5000); editChanged(500); });

  function drawCats() {
    const box = $('eCats'); box.textContent = '';
    const t = editTask(); if (!t) return;
    // A subtask takes its category from its main task.
    const main = t.parent && find(t.parent);
    if (main && main.status !== 'deleted') {
      const c = catOf(t.cat);
      const chip = el('span', 'cchip locked'); chip.setAttribute('aria-checked', 'true');
      if (c) chip.style.setProperty('--cc', c.color);
      chip.append(el('span', 'cdot'), document.createTextNode(c ? c.name : 'None'));
      box.append(chip, el('span', 'hint', 'Same as its main task'));
      return;
    }
    const mk = (id, name, color) => {
      const b = el('button', 'cchip'); b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(t.cat === id));
      if (color) b.style.setProperty('--cc', color);
      b.append(el('span', 'cdot'), document.createTextNode(name));
      b.onclick = () => { t.cat = id; touch(syncChildCats(t)); drawCats(); editChanged(); };
      return b;
    };
    box.appendChild(mk('', 'None'));
    cats.forEach((c) => box.appendChild(mk(c.id, c.name, c.color)));
    const nb = el('button', 'cchip newc'); nb.type = 'button';
    nb.append(ic('plus'), document.createTextNode('New'));
    nb.onclick = () => {
      nb.textContent = '';
      const inp = el('input'); inp.placeholder = 'Name, then Enter'; inp.maxLength = 40;
      nb.appendChild(inp); inp.focus();
      const done = (ok) => { const v = inp.value.trim(); if (ok && v) { t.cat = ensureCat(v); touch(syncChildCats(t)); fillCatSelect(); editChanged(); } drawCats(); };
      inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); done(true); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } };
      inp.onblur = () => done(true);
    };
    box.appendChild(nb);
  }

  // One date per task: a switch picks whether it is the day to do it or a deadline.
  let dateMode = null; // 'date' (Do on) or 'due' (Deadline) for the open task
  function drawDates() {
    const t = editTask(); if (!t) return;
    if (!dateMode) dateMode = t.due && !t.date ? 'due' : 'date';
    const f = dateMode, other = f === 'due' ? 'date' : 'due';
    const box = $('eDate'); box.textContent = '';
    const seg = el('div', 'seg small');
    [['date', 'Do on', 'The day you plan to do it'], ['due', 'Deadline', 'The day it is due']].forEach(([m, l, tip]) => {
      const b = el('button', m === f ? 'on' : '', l); b.type = 'button'; b.title = tip;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(m === f));
      b.onclick = () => {
        if (m === dateMode) return;
        // Switching moves the date over: a task has one date, either a day to do it or a deadline.
        if (t[dateMode] && !t[m]) { t[m] = t[dateMode]; t[dateMode] = ''; editChanged(); }
        dateMode = m; drawDates(); drawKind();
      };
      seg.appendChild(b);
    });
    box.appendChild(seg);
    const inp = el('input'); inp.type = 'date'; inp.value = t[f];
    inp.setAttribute('aria-label', f === 'due' ? 'Deadline' : 'Do on');
    inp.onchange = () => { t[f] = inp.value; drawDates(); editChanged(); };
    box.appendChild(inp);
    [['0', 'Today'], ['1', 'Tomorrow'], ['mon', 'Next Mon'], ['7', '+1 week']].forEach(([v, l]) => {
      const b = el('button', 'q', l); b.type = 'button'; b.title = dayName(quick(v), true);
      b.onclick = () => { t[f] = quick(v); drawDates(); editChanged(); };
      box.appendChild(b);
    });
    if (t[f]) {
      const x = el('button', 'q', 'Clear'); x.type = 'button';
      x.onclick = () => { t[f] = ''; drawDates(); editChanged(); };
      box.appendChild(x);
      box.appendChild(el('span', 'rel' + (diff(t[f]) < 0 ? ' late' : ''), rel(t[f])));
    }
    // Older tasks may have both; show the other one with a way to remove it.
    if (t[other]) {
      const note = el('span', 'rel alsodate');
      note.append(document.createTextNode((other === 'due' ? 'Also has a deadline: ' : 'Also planned for: ') + dayName(t[other]) + ' · '));
      const rm = el('button', 'linkish', 'Remove'); rm.type = 'button';
      rm.onclick = () => { t[other] = ''; drawDates(); editChanged(); };
      note.appendChild(rm);
      box.appendChild(note);
    }
    drawRepeat();
  }

  // Repeat row: presets, or "Custom" = every N days/weeks/months/years (+ weekdays for weeks).
  let repCustom = false;
  function drawRepeat() {
    const t = editTask(); if (!t) return;
    const box = $('eRepeat'); box.textContent = '';
    const preset = REPEAT_PRESETS.some(([v]) => v === t.repeat);
    if (t.repeat && !preset) repCustom = true;
    const sel = el('select', 'pill');
    sel.setAttribute('aria-label', 'Repeat');
    REPEAT_PRESETS.forEach(([v, l]) => sel.appendChild(new Option(l, v)));
    sel.appendChild(new Option('Custom…', '__custom'));
    sel.value = repCustom ? '__custom' : t.repeat;
    const setRule = (spec) => {
      t.repeat = spec;
      if (spec && !t.date && !t.due) t.date = firstOcc(spec);
      drawDates(); editChanged();
    };
    sel.onchange = () => {
      if (sel.value === '__custom') {
        repCustom = true;
        const day = parseD(t.date || t.due || TODAY()).getDay();
        setRule(t.repeat && parseSpec(t.repeat) ? t.repeat : makeSpec(1, 'w', [day]));
      } else { repCustom = false; setRule(sel.value); }
    };
    box.appendChild(sel);

    const p = parseSpec(t.repeat);
    if (repCustom && p) {
      const wrap = el('span', 'repcustom');
      wrap.append(document.createTextNode('every'));
      const n = el('input'); n.type = 'number'; n.min = 1; n.max = 365; n.value = p.n; n.setAttribute('aria-label', 'Repeat interval');
      n.onchange = () => { const v = Math.min(365, Math.max(1, Math.round(+n.value) || 1)); setRule(makeSpec(v, p.u, p.days)); };
      const u = el('select', 'pill'); u.setAttribute('aria-label', 'Repeat unit');
      [['d', p.n === 1 ? 'day' : 'days'], ['w', p.n === 1 ? 'week' : 'weeks'], ['m', p.n === 1 ? 'month' : 'months'], ['y', p.n === 1 ? 'year' : 'years']].forEach(([v, l]) => u.appendChild(new Option(l, v)));
      u.value = p.u;
      u.onchange = () => setRule(makeSpec(p.n, u.value, u.value === 'w' ? p.days || [parseD(t.date || TODAY()).getDay()] : null));
      wrap.append(n, u);
      box.appendChild(wrap);
      if (p.u === 'w') {
        const days = el('span', 'wdays');
        [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
          const b = el('button', 'wd' + (p.days && p.days.includes(d) ? ' on' : ''), WD_SHORT[d].slice(0, 2));
          b.type = 'button'; b.title = 'On ' + WD_SHORT[d];
          b.setAttribute('aria-pressed', String(!!(p.days && p.days.includes(d))));
          b.onclick = () => {
            const cur = new Set(p.days || []);
            if (cur.has(d)) cur.delete(d); else cur.add(d);
            setRule(makeSpec(p.n, 'w', [...cur]));
          };
          days.appendChild(b);
        });
        box.appendChild(days);
      }
    }
    if (p) {
      const nx = advance(t);
      const info = el('span', 'rel', 'When done, it moves to ' + dayName(nx.date || nx.due));
      box.appendChild(info);
      const skip = el('button', 'q', 'Skip this time'); skip.type = 'button';
      skip.title = 'Move to the next date without marking it done';
      skip.onclick = () => { Object.assign(t, advance(t)); drawDates(); editChanged(); };
      box.appendChild(skip);
    }
  }

  // Deadline type: simple · count goal (+/−) · big deadline (parts = other tasks linked to it).
  function drawKind() {
    const t = editTask(); if (!t) return;
    $('eKindRow').hidden = dateMode !== 'due' && !t.kind; // deadline types are for deadlines
    const seg = $('eKind'); seg.textContent = '';
    [['', 'Simple', 'A normal task or deadline'], ['count', 'Count goal', 'Reach a number, e.g. get 20 clients'], ['big', 'Big deadline', 'Made of other tasks and deadlines']].forEach(([k, l, tip]) => {
      const b = el('button', null, l); b.type = 'button'; b.title = tip;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(t.kind === k));
      b.classList.toggle('on', t.kind === k);
      b.onclick = () => {
        t.kind = k;
        if (k === 'count' && !t.goal) t.goal = 10;
        drawKind(); editChanged();
      };
      seg.appendChild(b);
    });

    const box = $('eKindBox'); box.textContent = '';
    box.hidden = !t.kind;
    if (t.kind === 'count') {
      const g = el('label', 'kf'); g.append(document.createTextNode('Goal'));
      const gi = el('input'); gi.type = 'number'; gi.min = 1; gi.max = 1000000; gi.value = t.goal || 1;
      gi.onchange = () => { t.goal = Math.max(1, Math.round(+gi.value) || 1); drawKind(); editChanged(); };
      g.appendChild(gi);
      const c = el('span', 'kf'); c.append(document.createTextNode('Done so far'));
      const minus = el('button', 'gbtn', '−'); minus.type = 'button';
      const ci = el('input'); ci.type = 'number'; ci.min = 0; ci.value = t.count;
      const plusB = el('button', 'gbtn plus', '+'); plusB.type = 'button';
      const setC = (v) => { t.count = Math.max(0, Math.round(v) || 0); drawKind(); editChanged(); };
      minus.onclick = () => setC(t.count - 1);
      plusB.onclick = () => setC(t.count + 1);
      ci.onchange = () => setC(+ci.value);
      c.append(minus, ci, plusB);
      const pr = progressOf(t);
      const p = el('div', 'goal'); p.append(bar(pr), el('span', 'glabel', pr.label + ' · ' + Math.round(100 * pr.done / pr.total) + '%'));
      box.append(g, c, p);
      if (t.repeat) box.appendChild(el('p', 'hint', 'It repeats, so the count starts again from 0 each time you complete it.'));
    } else if (t.kind === 'big') {
      const pr = progressOf(t);
      const p = el('div', 'goal'); p.append(bar(pr), el('span', 'glabel', pr.label + (pr.total ? ' · ' + Math.round(100 * pr.done / pr.total) + '%' : '')));
      box.appendChild(p);
      box.appendChild(el('p', 'hint', 'Progress counts its subtasks (listed under Subtasks below).'));
    }

    // "Subtask of": make this task a subtask of another one (its category then follows that task).
    const fam = familyOf(t.id);
    const mains = tasks.filter((x) => x.status === 'active' && !fam.has(x.id)).sort((a, b) => a.title.localeCompare(b.title));
    const sel = $('eParent'); sel.textContent = '';
    sel.appendChild(new Option('— not a subtask —', ''));
    mains.forEach((x) => sel.appendChild(new Option(short(x.title), x.id)));
    if (t.parent && !mains.some((x) => x.id === t.parent)) { const p = find(t.parent); if (p) sel.appendChild(new Option(short(p.title) + ' (closed)', p.id)); }
    sel.value = t.parent || '';
    sel.onchange = () => {
      t.parent = sel.value;
      const p = find(t.parent);
      if (p) { t.cat = p.cat; touch(syncChildCats(t)); }
      drawCats(); editChanged();
    };
  }

  // Subtasks of the open task: real tasks linked to it. Click one to open it; drag the handle to reorder.
  function drawSubs() {
    const t = editTask(); if (!t) return;
    eSubs.textContent = '';
    const kids = partsOf(t.id);
    const n = kids.filter((s) => s.status === 'done').length;
    $('eSubCount').textContent = kids.length ? `(${n}/${kids.length})` : '';
    kids.forEach((s) => {
      const done = s.status === 'done';
      const li = el('li', done ? 'done' : '');
      li.dataset.sid = s.id; li.dataset.drag = 'dsub';
      const h = el('span', 'handle'); h.innerHTML = ICON.grip; h.title = 'Drag to reorder';
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = done; cb.setAttribute('aria-label', 'Done: ' + s.title);
      cb.onchange = () => {
        if (cb.checked) confetti(s.due ? 1 : 0.6);
        s.status = cb.checked ? 'done' : 'active'; s.closedAt = cb.checked ? Date.now() : 0; s.updated = Date.now();
        touch([s.id]); drawSubs(); render();
      };
      // Rename right here; the pencil opens the subtask's own window (dates, notes, repeat…).
      const name = el('input'); name.type = 'text'; name.className = 'sname'; name.value = s.title; name.maxLength = 300;
      name.setAttribute('aria-label', 'Subtask title');
      let renameTimer = 0;
      name.oninput = () => {
        const v = name.value.trim(); if (!v) return;
        clearTimeout(renameTimer);
        renameTimer = setTimeout(() => { s.title = v.slice(0, 300); s.updated = Date.now(); touch([s.id]); render(); }, 400);
      };
      name.onblur = () => { if (!name.value.trim()) name.value = s.title; };
      name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); eSubNew.focus(); } };
      const open = el('button', 'ib'); open.type = 'button'; open.innerHTML = ICON.edit; open.title = 'Open this subtask (dates, notes, repeat…)';
      open.setAttribute('aria-label', 'Open subtask: ' + s.title);
      open.onclick = () => { closeEdit(); openEdit(s.id); };
      li.append(h, cb, name);
      const d = s.due || s.date;
      if (d) li.appendChild(el('span', 'chip ' + (s.due ? (diff(s.due) < 0 && !done ? 'late' : 'dl') : 'on'), (s.due ? 'Due ' : '') + dLabel(d)));
      const x = el('button', 'ib del'); x.type = 'button'; x.innerHTML = ICON.trash; x.title = 'Delete this subtask (you can undo)';
      x.setAttribute('aria-label', 'Delete subtask: ' + s.title);
      x.onclick = () => { remove(s.id); drawSubs(); };
      li.append(open, x);
      eSubs.appendChild(li);
    });
    // Make an existing task a subtask of this one.
    const link = $('eSubLink'); link.textContent = '';
    link.appendChild(new Option('Add an existing task as a subtask…', ''));
    const fam = familyOf(t.id);
    tasks.filter((x) => isActive(x) && !fam.has(x.id) && x.id !== t.parent).sort((a, b) => a.title.localeCompare(b.title))
      .forEach((x) => link.appendChild(new Option(short(x.title), x.id)));
    link.onchange = () => {
      const x = find(link.value); if (!x) return;
      x.parent = t.id; x.cat = t.cat; x.updated = Date.now();
      touch([x.id, ...syncChildCats(x)]); drawSubs(); drawKind(); render();
    };
    if (t.kind === 'big') drawKind();
  }
  function addSubs(lines) {
    const t = editTask(); if (!t) return;
    const ids = [];
    [...lines].reverse().forEach((l) => { const f = withRepeatDate(fromText(l, { cat: t.cat })); if (f) ids.unshift(newTask({ ...f, cat: t.cat, parent: t.id }).id); });
    if (!ids.length) return;
    touch(ids); drawSubs(); drawKind(); render();
  }
  eSubNew.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const v = eSubNew.value.trim(); if (v) { addSubs([v]); eSubNew.value = ''; } }
  });
  eSubNew.addEventListener('paste', (e) => {
    const lines = e.clipboardData.getData('text').split(/\r?\n/).map(cleanLine).filter(Boolean);
    if (lines.length > 1) { e.preventDefault(); addSubs(lines); }
  });

  function fillEdit() {
    const t = editTask(); if (!t) return;
    eTitle.value = t.title; eTitle.classList.remove('bad');
    eDesc.value = t.desc;
    drawCats(); drawDates(); drawSubs(); drawKind();
    eSubNew.value = '';
    const head = $('eHead'); head.textContent = '';
    const main = t.parent && find(t.parent);
    if (main && main.status !== 'deleted') {
      const back = el('button', 'backlink'); back.type = 'button';
      back.append(el('span', null, '↳ Subtask of '), el('b', null, main.title));
      back.title = 'Open the main task';
      back.onclick = () => { closeEdit(); openEdit(main.id); };
      head.appendChild(back);
    } else head.textContent = 'Task';
    requestAnimationFrame(autosize);
  }
  function openEdit(id) {
    if (!find(id)) return;
    closePop();
    edit.id = id; edit.snap = clone(find(id));
    repCustom = false; dateMode = null;
    $('eRevert').hidden = true;
    fillEdit();
    dlg.showModal();
    requestAnimationFrame(autosize);
    eTitle.focus();
    eTitle.setSelectionRange(eTitle.value.length, eTitle.value.length);
  }
  function closeEdit() {
    if (!edit.id) return;
    clearTimeout(edit.timer);
    const t = editTask();
    const pend = eSubNew.value.trim();
    if (t && pend) addSubs([pend]);
    if (t && JSON.stringify(t) !== JSON.stringify(edit.snap)) { t.updated = Date.now(); touch([t.id]); }
    edit.id = null; edit.snap = null;
    if (dlg.open) dlg.close();
    render();
  }
  $('eDone').onclick = closeEdit;
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeEdit(); });
  dlg.addEventListener('close', () => { if (edit.id) closeEdit(); });
  dlg.addEventListener('mousedown', (e) => { if (e.target === dlg) closeEdit(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); closeEdit(); } });
  $('eRevert').onclick = () => {
    const i = tasks.findIndex((x) => x.id === edit.id);
    if (i < 0) return;
    tasks[i] = clone(edit.snap);
    touch([edit.id]); fillEdit(); render();
    $('eRevert').hidden = true;
  };
  $('eDelete').onclick = () => { clearTimeout(edit.timer); const id = edit.id; edit.id = null; dlg.close(); remove(id); };

  /* =====================================================================
     Settings: categories + data
     ===================================================================== */
  const setDlg = $('setDlg');
  function openSettings(focusCats) {
    drawCatList();
    $('catNewColor').value = PALETTE.find((p) => !cats.some((c) => c.color === p)) || PALETTE[0];
    const info = $('dataInfo');
    info.textContent = 'Every change syncs automatically to your account' + (store.user && store.user.email ? ' (' + store.user.email + ')' : '') +
      ' and is available on every device where you sign in. Use Export to keep your own copy.';
    $('backupBtn').hidden = $('folderBtn').hidden = true; // PC-only features: there is no local program on the web
    setDlg.showModal();
    if (focusCats) $('catNewName').focus();
  }
  $('settingsBtn').onclick = () => openSettings(false);
  $('sClose').onclick = () => setDlg.close();
  setDlg.addEventListener('mousedown', (e) => { if (e.target === setDlg) setDlg.close(); });
  setDlg.addEventListener('close', () => { fillCatSelect(); render(); });

  function catsChanged() { catsDirty = true; queueSave(); fillCatSelect(); render(); }
  function drawCatList() {
    const ul = $('catList'); ul.textContent = '';
    if (!cats.length) ul.appendChild(el('li', 'hint', 'No categories yet.'));
    cats.forEach((c, i) => {
      const li = el('li');
      const col = el('input'); col.type = 'color'; col.value = c.color; col.setAttribute('aria-label', 'Color of ' + c.name);
      col.oninput = () => { c.color = col.value; catsDirty = true; queueSave(); render(); };
      const name = el('input'); name.type = 'text'; name.value = c.name; name.maxLength = 40; name.setAttribute('aria-label', 'Category name');
      name.onchange = () => { const v = name.value.trim(); if (v) { c.name = v; catsChanged(); } else name.value = c.name; };
      const n = tasks.filter((t) => t.cat === c.id && isActive(t)).length;
      const cnt = el('span', 'cnt', n + (n === 1 ? ' task' : ' tasks'));
      const up = el('button', 'ib', '↑'); up.type = 'button'; up.title = 'Move up'; up.disabled = i === 0;
      up.onclick = () => { cats.splice(i - 1, 0, cats.splice(i, 1)[0]); catsChanged(); drawCatList(); };
      const dn = el('button', 'ib', '↓'); dn.type = 'button'; dn.title = 'Move down'; dn.disabled = i === cats.length - 1;
      dn.onclick = () => { cats.splice(i + 1, 0, cats.splice(i, 1)[0]); catsChanged(); drawCatList(); };
      const del = el('button', 'mini danger', 'Delete'); del.type = 'button';
      confirmClick(del, 'Delete', () => {
        const ids = tasks.filter((t) => t.cat === c.id).map((t) => t.id);
        cats = cats.filter((x) => x.id !== c.id);
        tasks.forEach((t) => { if (t.cat === c.id) t.cat = ''; });
        if (prefs.filter === c.id) prefs.filter = '';
        touch(ids); catsChanged(); drawCatList();
      });
      li.append(col, name, cnt, up, dn, del);
      ul.appendChild(li);
    });
  }
  function addCatFromForm() {
    const v = $('catNewName').value.trim();
    if (!v) return;
    if (cats.some((c) => c.name.toLowerCase() === v.toLowerCase())) { toast('That category already exists.'); return; }
    cats.push({ id: 'c' + uid(), name: v.slice(0, 40), color: $('catNewColor').value });
    $('catNewName').value = '';
    catsChanged(); drawCatList();
    $('catNewColor').value = PALETTE.find((p) => !cats.some((c) => c.color === p)) || PALETTE[0];
  }
  $('catAdd').onclick = addCatFromForm;
  $('catNewName').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addCatFromForm(); } };

  $('backupBtn').onclick = async () => {
    try { const r = await api('POST', '/api/backup', {}); meta.lastBackup = r.file; meta.backups = r.backups; toast('Backup saved: ' + r.file); openSettings(false); }
    catch (e) { toast('Backup failed: ' + e.message); }
  };
  $('folderBtn').onclick = () => api('POST', '/api/open-folder', {}).catch(() => toast('Could not open the folder.'));
  $('exportBtn').onclick = async () => {
    await flush();
    const d = new Date();
    const name = 'tasks-' + ymd(d) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.json';
    let all;
    try { all = await store.readAll(); } catch (e) { toast('Could not read your tasks: ' + (e.code || e.message)); return; }
    downloadJson(name, { app: 'task-manager', version: 2, exported: d.toISOString(), categories: all.categories || cats, tasks: all.tasks });
    toast('Backup downloaded: ' + name + ' (' + all.tasks.length + ' tasks)');
  };
  function downloadJson(name, data) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); };

  async function importFile(file) {
    let parsed, list;
    try {
      parsed = JSON.parse(await file.text());
      list = Array.isArray(parsed) ? parsed : parsed && parsed.tasks;
      if (!Array.isArray(list)) throw new Error('format');
    } catch {
      toast('That file is not a task backup. Use a .json file made with Export or the old “Download backup”.');
      return null;
    }
    if (Array.isArray(parsed.categories)) {
      parsed.categories.forEach((c) => {
        if (!c || !c.id || !c.name || catOf(String(c.id))) return;
        cats.push({ id: String(c.id), name: String(c.name).slice(0, 40), color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : PALETTE[cats.length % PALETTE.length] });
        catsDirty = true;
      });
    }
    const have = new Set(tasks.map((t) => t.id));
    const ids = [], skipped = [], rejected = [];
    list.forEach((raw, i) => {
      const id = raw && typeof raw === 'object' && raw.id != null ? String(raw.id) : '';
      const why = !raw || typeof raw !== 'object' ? 'not a task'
        : !id ? 'no id'
        : typeof raw.title !== 'string' || !raw.title.trim() ? 'no title'
        : id.includes('/') || id.length > 200 || id === '.' || id === '..' ? 'id cannot be stored' : '';
      if (why) { rejected.push('#' + (i + 1) + (raw && typeof raw.title === 'string' && raw.title.trim() ? ' “' + short(raw.title) + '”' : '') + ': ' + why); return; }
      if (have.has(id)) { skipped.push(id); return; } // same id = same task: importing twice never duplicates
      const t = norm(raw);
      if (t.cat && !catOf(t.cat)) { // a category we have not seen: create it
        const known = DEFAULT_CATS.find((c) => c.id === t.cat);
        cats.push(known ? { ...known } : { id: t.cat, name: t.cat.charAt(0).toUpperCase() + t.cat.slice(1), color: PALETTE[cats.length % PALETTE.length] });
        catsDirty = true;
      }
      tasks.push(t); have.add(t.id); ids.push(t.id);
    });
    touch(ids); liftSubs(); fillCatSelect(); render();
    if (setDlg.open) drawCatList();
    if (ids.length) { prefs.welcomed = true; savePrefs(); }
    const report = '<b>Import report: ' + escapeHtml(file.name) + '</b><br>' + list.length + ' tasks in the file · ' + ids.length + ' added · ' +
      skipped.length + ' skipped (already in your list) · ' + rejected.length + ' rejected' +
      (rejected.length ? '<br><small>' + rejected.slice(0, 12).map(escapeHtml).join('<br>') + (rejected.length > 12 ? '<br>…and ' + (rejected.length - 12) + ' more' : '') + '</small>' : '');
    banner(report + '<br><span id="importCount">Saving to your account…</span>', '', [['OK', () => { $('banner').hidden = true; }, true]]);
    try {
      await flush();
      const n = await store.countServer();
      const c = $('importCount'); if (c) c.textContent = 'Tasks stored in your account now: ' + n + '.';
    } catch (e) {
      const c = $('importCount'); if (c) c.textContent = 'Saved on this device; it will reach your account when you are online.';
    }
    return { inFile: list.length, added: ids.length, skipped: skipped.length, rejected };
  }
  function escapeHtml(x) { return String(x).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  // Drop a backup file anywhere on the page.
  let fileDepth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); fileDepth++; $('fileDrop').hidden = false; });
  addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--fileDepth <= 0) { fileDepth = 0; $('fileDrop').hidden = true; } });
  addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); fileDepth = 0; $('fileDrop').hidden = true;
    const f = e.dataTransfer.files[0]; if (f) importFile(f);
  });

  /* =====================================================================
     Search + keyboard
     ===================================================================== */
  const searchIn = $('search');
  searchIn.addEventListener('input', () => { search = searchIn.value.trim(); render(); });
  searchIn.addEventListener('keydown', (e) => { if (e.key === 'Escape') { searchIn.value = ''; search = ''; render(); searchIn.blur(); } });

  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest('input, textarea, select, [contenteditable]');
    const modal = dlg.open || setDlg.open;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing && !modal) { e.preventDefault(); undo(); return; }
    if (typing || modal || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); addIn.focus(); }
    else if (e.key === '/') { e.preventDefault(); searchIn.focus(); searchIn.select(); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') setTab(TABS[+e.key - 1]);
    else if (tab === 'dates' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); stripOffset += e.key === 'ArrowLeft' ? -7 : 7; render(); }
    else if (e.key === '?') openSettings(false);
    else if (e.key === 'Escape') { closePop(); toastEl.hidden = true; }
  });

  /* =====================================================================
     Start
     ===================================================================== */
  function banner(html, cls, buttons) {
    const b = $('banner');
    b.className = 'banner' + (cls ? ' ' + cls : '');
    b.textContent = '';
    const p = el('p'); p.innerHTML = html; b.appendChild(p);
    (buttons || []).forEach(([label, fn, primary]) => { const x = el('button', 'btn sm' + (primary ? ' primary' : ''), label); x.type = 'button'; x.onclick = fn; b.appendChild(x); });
    b.hidden = false;
  }

  // Live updates from the account (other devices, other tabs). Your own unsent edits always win.
  let renderLater = 0;
  function renderSoon() {
    clearTimeout(renderLater);
    if (drag) { renderLater = setTimeout(renderSoon, 400); return; }
    fillCatSelect(); render();
  }
  function onRemote(changes) {
    let changed = false;
    for (const ch of changes) {
      if (ch.local || dirty.has(ch.id)) continue; // our own write, or changed here again since
      const i = tasks.findIndex((x) => x.id === ch.id);
      if (ch.type === 'removed') { if (i >= 0) { tasks.splice(i, 1); changed = true; } continue; }
      if (removed.has(ch.id) || !validTask(ch.data)) continue;
      const t = norm(ch.data);
      if (i >= 0) { if (JSON.stringify(tasks[i]) !== JSON.stringify(t)) { tasks[i] = t; changed = true; } }
      else { tasks.push(t); changed = true; }
    }
    return changed;
  }

  // Before the first upload: tasks kept only in this browser (none on a fresh device) are first downloaded
  // as a backup file, then added to the account. The browser copy is never deleted.
  function uploadBrowserData(uidKey) {
    const flag = 'tm.uploaded.' + uidKey;
    if (localStorage.getItem(flag)) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS.local) || 'null'); } catch {}
    const list = saved && Array.isArray(saved.tasks) ? saved.tasks : [];
    if (list.length) {
      const d = new Date();
      downloadJson('tasks-' + ymd(d) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.json',
        { app: 'task-manager', version: 2, exported: d.toISOString(), categories: saved.categories || cats, tasks: list });
      importFile(new File([JSON.stringify({ categories: saved.categories || [], tasks: list })], 'tasks kept in this browser'));
    }
    localStorage.setItem(flag, '1');
  }

  async function init() {
    setSave('busy'); saveEl.textContent = 'Loading…';
    cats = DEFAULT_CATS.map((c) => ({ ...c }));
    fillCatSelect(); syncAddDates(); syncAddRep(); renderPreview();
    if (!store) { banner('<b>Could not load the app.</b> Check your internet connection and reload the page.', 'warn'); return; }
    const user = await store.ready; // the sign-in screen stays up until then
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0); // never open on an old scroll position
    render();
    let first = true;
    store.listen((changes, info) => {
      if (!changes) { setSave('err', info.error && (info.error.code || info.error.message)); return; }
      const changed = onRemote(changes);
      const lifted = !first || !info.fromCache ? liftSubs() : 0; // old checklist subtasks become real tasks
      if (changed || lifted || first) renderSoon();
      if (first && !info.fromCache) {
        first = false;
        if (!pendingSave()) setSave(navigator.onLine ? 'ok' : 'local');
        if (!tasks.length && !prefs.welcomed) {
          banner('<b>Your tasks now sync to your account.</b> Have a backup file (from Export, or the old “Download backup”)? Drop it here or import it.', '', [
            ['Import backup…', () => $('importFile').click(), true],
            ['Start fresh', () => { prefs.welcomed = true; savePrefs(); $('banner').hidden = true; }],
          ]);
        }
        uploadBrowserData(user.uid);
      } else if (first && !navigator.onLine) setSave('local');
    }, (items) => {
      if (catsDirty) return;
      if (items) cats = items;
      renderSoon();
    });
    $('signOutBtn').onclick = async () => { await flush(); store.signOut(); };
    store.listenBackground(applyBg);
    let day = TODAY();
    setInterval(() => { if (TODAY() !== day) { day = TODAY(); render(); } }, 60000);
  }

  /* ---------- personal background ---------- */
  let bgUrl = null;
  function applyBg(info) {
    const old = bgUrl;
    bgUrl = info ? info.url : null;
    if (info) document.body.style.setProperty('--bg-user', 'url("' + info.url + '")');
    else document.body.style.removeProperty('--bg-user');
    document.body.classList.toggle('bg-pixel', !!(info && info.pixel));
    if (old && old !== bgUrl) setTimeout(() => URL.revokeObjectURL(old), 2000);
  }
  const BG_MAX = 3 * 1024 * 1024;
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  // GIFs are kept as they are (so they stay animated) up to 3 MB; other pictures over 3 MB are made smaller.
  async function prepareBg(file) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Choose a PNG, JPG, WebP or GIF picture.');
    if (file.type === 'image/gif' && file.size > BG_MAX) throw new Error('This GIF is ' + mb(file.size) + '. Animated GIFs can be up to 3 MB.');
    let bmp;
    try { bmp = await createImageBitmap(file); } catch { throw new Error('That picture could not be opened.'); }
    const pixel = file.type === 'image/gif' || Math.max(bmp.width, bmp.height) < 900; // small / pixel art stays sharp
    if (file.type === 'image/gif') {
      if (file.size > BG_MAX) throw new Error('This GIF is ' + mb(file.size) + '. Animated GIFs can be up to 3 MB.');
      return { blob: file, pixel };
    }
    if (file.size <= BG_MAX) return { blob: file, pixel };
    let side = 2560, q = 0.85, blob = null;
    for (let i = 0; i < 8 && (!blob || blob.size > BG_MAX); i++) {
      const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      side = Math.round(side * 0.85); q = Math.max(0.6, q - 0.05);
    }
    if (!blob || blob.size > BG_MAX) throw new Error('That picture is too large. Try a smaller one.');
    return { blob, pixel: false };
  }
  $('bgPick').onclick = () => $('bgFile').click();
  $('bgFile').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const p = await prepareBg(f);
      applyBg({ url: URL.createObjectURL(p.blob), pixel: p.pixel });
      toast('Saving your background…');
      await store.saveBackground(p.blob, p.pixel);
      toast('Background saved. It will show on your other devices too.');
    } catch (err) {
      toast(err.code ? 'Could not save the background: ' + err.code : err.message);
    }
  };
  $('bgReset').onclick = async () => {
    applyBg(null);
    try { await store.saveBackground(null); toast('Back to the default background.'); }
    catch (err) { toast('Could not save: ' + (err.code || err.message)); }
  };
  init();
})();
