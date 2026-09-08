/* Ritmo SyP - service worker 2026.09.08.1610
   Cascaron: cache primero y se refresca en segundo plano.
   datos.json: SIEMPRE la red primero; el cache solo cubre la falta de senal. */
const V = 'ritmo-2026.09.08.1610';
const CASCARON = ['./', './index.html', './app.js?v=2026.09.08.1610', './manifest.webmanifest',
                  './icono-192.png', './icono-512.png', './icono-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CASCARON)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          /* fuentes y demas: directo a la red */

  if (url.pathname.endsWith('/datos.json')){
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) { const c = r.clone(); caches.open(V).then(k => k.put('./datos.json', c)); }
        return r;
      }).catch(() => caches.match('./datos.json').then(r => {
        if (!r) return Response.error();
        const h = new Headers(r.headers); h.set('X-Ritmo-Cache', '1');
        return new Response(r.body, {status: 200, statusText: 'OK', headers: h});
      }))
    );
    return;
  }

  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => {
      const red = fetch(req).then(r => {
        if (r && r.ok) { const c = r.clone(); caches.open(V).then(k => k.put(req, c)); }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
