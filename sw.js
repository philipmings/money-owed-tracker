const CACHE='money-owed-power-v15';
const STATIC=[
  './manifest.webmanifest?v=11',
  './money-owed-icon-192-v11.png',
  './money-owed-icon-512-v11.png',
  './money-owed-apple-touch-v11.png',
  './money-owed-favicon-32-v11.png'
];

function normalizeAppSource(html){
  return html
    .replace("['borrowed_from_them','Loan']","['cash_loan','Loan']")
    .replace("['they_bought_for_me','Purchases']","['purchase_on_behalf','Purchases']")
    .replace("['they_paid_me','Repayment']","['repayment','Repayment']")
    .replace("['paid_them','Repayment']","['repayment','Repayment']");
}

async function normalizedNavigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(!response.ok)return response;
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    const html=normalizeAppSource(await response.text());
    const fixed=new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
    const copy=fixed.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));
    return fixed;
  }catch(e){
    return caches.match('./index.html');
  }
}

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);if(u.hostname.endsWith('supabase.co'))return;
  if(r.mode==='navigate'){e.respondWith(normalizedNavigation(r));return}
  if(r.method==='GET')e.respondWith(fetch(r,{cache:'no-store'}).then(x=>{if(x.ok){const y=x.clone();caches.open(CACHE).then(c=>c.put(r,y))}return x}).catch(()=>caches.match(r)))
});