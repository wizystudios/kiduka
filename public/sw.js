// One-release replacement for Kiduka's legacy app-shell worker.
function isAppCache(name) {
 const workboxBucket=/(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
 return (workboxBucket && name.endsWith(self.registration.scope)) || /^kiduka-(pos|static|dynamic|images)-v\d+$/.test(name) || name==='failed-requests';
}
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 try {
  const names=await caches.keys();
  await Promise.allSettled(names.filter(isAppCache).map(name=>caches.delete(name)));
  await self.clients.claim();
  const windows=await self.clients.matchAll({type:'window'});
  await Promise.allSettled(windows.map(client=>client.navigate(client.url)));
 } finally { await self.registration.unregister(); }
})()));
