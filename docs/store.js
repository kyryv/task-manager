// Storage + sign-in for the hosted Task Manager.
// Replaces the PC version's local server: tasks live in Firestore at users/{uid}/tasks/{taskId},
// categories at users/{uid}/meta/categories. app.js talks only to window.tmStore.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot,
  writeBatch, getDoc, getDocs, getDocsFromServer, getDocsFromCache, getCountFromServer, terminate, clearIndexedDbPersistence, Bytes,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

const LAST_UID = 'tm.lastUid';
const ALLOWED_OK = 'tm.allowedOk.';

/* ---------- sign-in screen ---------- */
const gate = document.createElement('div');
gate.id = 'gate';
gate.innerHTML = `
  <div class="gatecard">
    <div class="gatebrand">
      <svg viewBox="0 0 32 32" width="44" height="44" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#d97757"/><path d="M9 16.5l4.8 4.8L23 11.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h1>Tasks</h1>
    </div>
    <p class="gatemsg" id="gateMsg">Loading…</p>
    <button type="button" class="gatebtn" id="gateBtn" hidden>
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      <span>Sign in with Google</span>
    </button>
    <button type="button" class="gatelink" id="gateOut" hidden>Use another account</button>
    <p class="gatenote">Your tasks are private. The app owner can technically see stored data.</p>
  </div>`;
document.body.appendChild(gate);
const gateMsg = gate.querySelector('#gateMsg');
const gateBtn = gate.querySelector('#gateBtn');
const gateOut = gate.querySelector('#gateOut');
function showGate(msg, { signIn = false, other = false } = {}) {
  gate.hidden = false;
  gateMsg.textContent = msg;
  gateBtn.hidden = !signIn;
  gateOut.hidden = !other;
}

const configured = firebaseConfig && firebaseConfig.apiKey && !/^PASTE/i.test(firebaseConfig.apiKey);

let resolveReady;
const ready = new Promise((r) => { resolveReady = r; });
let auth = null, db = null, current = null;

window.tmStore = {
  ready,                       // resolves with { uid, email } once a signed-in, allowed user is known
  get user() { return current; },
  signOut: async () => { if (auth) await signOut(auth); location.reload(); },
  listen,
  write,
  readAll,
  countServer,
  saveBackground,
  listenBackground,
};

if (!configured) {
  showGate('This copy is not set up yet: paste your Firebase settings into firebase-config.js (see README).');
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Offline persistence: tasks are cached on the device and changes made offline sync later.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

  gateBtn.onclick = async () => {
    showGate('Opening Google sign-in…');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      // Pop-ups can be blocked (e.g. some phones / installed apps): fall back to a full-page redirect.
      if (/popup-blocked|operation-not-supported|cancelled-popup|web-storage/i.test(e.code || '')) {
        try { await signInWithRedirect(auth, provider); return; } catch (e2) { e = e2; }
      }
      showGate(e.code === 'auth/popup-closed-by-user' ? 'Sign in to see your tasks.' : 'Sign-in failed: ' + (e.code || e.message), { signIn: true });
    }
  };
  gateOut.onclick = () => window.tmStore.signOut();
  getRedirectResult(auth).catch((e) => showGate('Sign-in failed: ' + (e.code || e.message), { signIn: true }));

  onAuthStateChanged(auth, async (user) => {
    if (!user) { current = null; showGate('Sign in to see your tasks.', { signIn: true }); return; }

    // A different person signed in on this browser: wipe the previous person's cached data first.
    const last = localStorage.getItem(LAST_UID);
    if (last && last !== user.uid) {
      showGate('Switching account…');
      try { await terminate(db); await clearIndexedDbPersistence(db); } catch {}
      try { localStorage.removeItem('tm.unsaved.v2'); localStorage.removeItem(ALLOWED_OK + last); } catch {}
      localStorage.setItem(LAST_UID, user.uid);
      location.reload();
      return;
    }
    localStorage.setItem(LAST_UID, user.uid);

    showGate('Checking access…');
    const email = (user.email || '').toLowerCase();
    let allowed = false;
    try {
      allowed = (await getDoc(doc(db, 'allowed', email))).exists();
    } catch (e) {
      // Offline: trust the last successful check on this device so the app still opens.
      if (e.code === 'unavailable') allowed = localStorage.getItem(ALLOWED_OK + user.uid) === '1';
    }
    if (!allowed) {
      showGate('This account has no access. Ask the owner.' + (email ? ' (' + email + ')' : ''), { other: true });
      return;
    }
    localStorage.setItem(ALLOWED_OK + user.uid, '1');
    current = { uid: user.uid, email: user.email || '' };
    gate.hidden = true;
    resolveReady(current);
  });
}

/* ---------- data ---------- */
const tasksCol = () => collection(db, 'users', current.uid, 'tasks');
const catsDoc = () => doc(db, 'users', current.uid, 'meta', 'categories');

// Live sync. onTasks(changes, { fromCache }) — changes: [{ type, id, data, local }]; onCats(items | null).
function listen(onTasks, onCats) {
  // includeMetadataChanges: also report when the server confirms the copy cached on this device
  // (otherwise an unchanged list never says "from the server", and the status stays on "Loading…").
  const u1 = onSnapshot(tasksCol(), { includeMetadataChanges: true }, (snap) => {
    const changes = snap.docChanges().map((c) => ({
      type: c.type, id: c.doc.id, data: c.doc.data(),
      local: c.doc.metadata.hasPendingWrites,
    }));
    onTasks(changes, { fromCache: snap.metadata.fromCache });
  }, (e) => onTasks(null, { error: e }));
  const u2 = onSnapshot(catsDoc(), (snap) => onCats(snap.exists() ? (snap.data().items || []) : null), () => {});
  return () => { u1(); u2(); };
}

// Saves tasks (one document per task, id = task id), deletes removed ones, and saves categories.
// The local cache updates at once; the promise resolves when the server has the change.
async function write({ tasks = [], removed = [], categories = null }) {
  const ops = [];
  tasks.forEach((t) => ops.push((b) => b.set(doc(tasksCol(), String(t.id)), t)));
  removed.forEach((id) => ops.push((b) => b.delete(doc(tasksCol(), String(id)))));
  if (categories) ops.push((b) => b.set(catsDoc(), { items: categories }));
  const commits = [];
  for (let i = 0; i < ops.length; i += 450) { // Firestore allows 500 writes per batch
    const b = writeBatch(db);
    ops.slice(i, i + 450).forEach((op) => op(b));
    commits.push(b.commit());
  }
  await Promise.all(commits);
}

// Every task of the signed-in user (all statuses) + categories, from the server when online.
async function readAll() {
  let snap;
  try { snap = await getDocsFromServer(tasksCol()); } catch { snap = await getDocs(tasksCol()); }
  let categories = null;
  try { const c = await getDoc(catsDoc()); categories = c.exists() ? (c.data().items || []) : null; } catch {}
  return { tasks: snap.docs.map((d) => d.data()), categories };
}

async function countServer() {
  return (await getCountFromServer(tasksCol())).data().count;
}

/* ---------- personal background picture ----------
   Stored in the account so it shows on every device: users/{uid}/meta/background holds the details,
   users/{uid}/bgparts/0,1,2… hold the image bytes in pieces (Firestore allows about 1 MB per document). */
const PART = 900 * 1024;
const bgMeta = () => doc(db, 'users', current.uid, 'meta', 'background');
const bgParts = () => collection(db, 'users', current.uid, 'bgparts');

// blob = the image to use, or null to go back to the default background.
async function saveBackground(blob, pixel = false) {
  let oldParts = 0;
  try { const m = await getDoc(bgMeta()); oldParts = m.exists() ? (m.data().parts || 0) : 0; } catch {}
  const b = writeBatch(db);
  if (!blob) {
    for (let i = 0; i < oldParts; i++) b.delete(doc(bgParts(), String(i)));
    b.delete(bgMeta());
    return b.commit();
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const v = Date.now(), n = Math.ceil(bytes.length / PART);
  for (let i = 0; i < n; i++) b.set(doc(bgParts(), String(i)), { v, data: Bytes.fromUint8Array(bytes.subarray(i * PART, (i + 1) * PART)) });
  for (let i = n; i < oldParts; i++) b.delete(doc(bgParts(), String(i)));
  b.set(bgMeta(), { v, type: blob.type || 'image/png', size: bytes.length, parts: n, pixel: !!pixel });
  return b.commit();
}

// cb({ url, pixel }) whenever the background changes (also from another device); cb(null) for the default.
function listenBackground(cb) {
  let shown = null;
  return onSnapshot(bgMeta(), async (snap) => {
    if (!snap.exists()) { if (shown !== 0) { shown = 0; cb(null); } return; }
    const m = snap.data();
    if (shown === m.v) return;
    const usable = (docs) => docs.length >= m.parts && docs.every((d) => d.data().v === m.v);
    let docs = [];
    try { docs = (await getDocsFromCache(bgParts())).docs; } catch {}
    if (!usable(docs)) { try { docs = (await getDocs(bgParts())).docs; } catch { return; } }
    if (!usable(docs)) return; // pieces still on their way; the next snapshot tries again
    docs.sort((a, b) => +a.id - +b.id);
    const blob = new Blob(docs.slice(0, m.parts).map((d) => d.data().data.toUint8Array()), { type: m.type });
    shown = m.v;
    cb({ url: URL.createObjectURL(blob), pixel: !!m.pixel });
  }, () => {});
}
