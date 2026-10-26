/** Remove only Kiduka's legacy app-shell registrations, never messaging workers. */
export async function retireAppWorker() {
 if (!('serviceWorker' in navigator)) return;
 try {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.filter(r=>[r.active,r.waiting,r.installing].some(w=>w && new URL(w.scriptURL).origin===window.location.origin && ['/sw.js','/service-worker.js'].includes(new URL(w.scriptURL).pathname))).map(r=>r.unregister()));
 } catch { /* Render even when browser worker storage is unavailable. */ }
}
