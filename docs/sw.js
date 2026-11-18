// Service worker: lets the app be installed and open without a connection.
// The app's own files are fetched fresh when online (so updates show up) and served from the cache when offline.
// Firebase's database and sign-in traffic is never touched here; Firestore has its own offline cache.
const CACHE = 'tasks-v1';
const SHELL = [
  './', 'index.html', 'style.css', 'signin.css', 'app.js', 'store.js', 'firebase-config.js',
  'bg.gif', 'icon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const sdk = url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  const fonts = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
  if (!sameOrigin && !sdk && !fonts) return;

  if (sdk || fonts) { // versioned files that never change: cache first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
    })));
    return;
  }
  // The app's own files: network first, cache as fallback.
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});
