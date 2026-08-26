const CACHE='money-owed-fresh-v9';
const STATIC=[
  './manifest.webmanifest?v=9',
  './money-owed-icon-192-v9.png',
  './money-owed-icon-512-v9.png',
  './money-owed-apple-touch-v9.png',
  './money-owed-favicon-32-v9.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.hostname.endsWith('supabase.co')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, {cache:'no-store'})
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (req.method === 'GET') {
    event.respondWith(
      fetch(req, {cache:'no-store'})
        .then(resp => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(cache => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
  }
});
