const CACHE='money-owed-power-v14';
const STATIC=[
  './manifest.webmanifest?v=11',
  './money-owed-icon-192-v11.png',
  './money-owed-icon-512-v11.png',
  './money-owed-apple-touch-v11.png',
  './money-owed-favicon-32-v11.png'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);if(u.hostname.endsWith('supabase.co'))return;
  if(r.mode==='navigate'){e.respondWith(fetch(r,{cache:'no-store'}).then(x=>{const y=x.clone();caches.open(CACHE).then(c=>c.put('./index.html',y));return x}).catch(()=>caches.match('./index.html')));return}
  if(r.method==='GET')e.respondWith(fetch(r,{cache:'no-store'}).then(x=>{if(x.ok){const y=x.clone();caches.open(CACHE).then(c=>c.put(r,y))}return x}).catch(()=>caches.match(r)))
});