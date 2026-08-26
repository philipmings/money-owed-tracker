const CACHE='money-owed-shell-v6';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('supabase.co')) return;
  if(e.request.method==='GET'){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
  }
});