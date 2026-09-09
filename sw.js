const CACHE='money-owed-pwa-v18';
const STATIC=[
  './manifest.webmanifest?v=18',
  './receipt-shell.html?release=v18',
  './receipt.js?v=18',
  './receipt-app.js?v=18',
  './money-owed-icon-192-v11.png',
  './money-owed-icon-512-v11.png',
  './money-owed-apple-touch-v11.png',
  './money-owed-favicon-32-v11.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(url.hostname.endsWith('supabase.co'))return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request,{cache:'no-store'}).then(response=>{
        if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
        return response;
      }).catch(()=>caches.match(request).then(cached=>cached||caches.match('./receipt-shell.html?release=v18')))
    );
    return;
  }

  if(request.method==='GET'){
    event.respondWith(
      fetch(request,{cache:'no-store'}).then(response=>{
        if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
        return response;
      }).catch(()=>caches.match(request))
    );
  }
});
