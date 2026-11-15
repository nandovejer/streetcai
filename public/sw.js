// Caché sin conexión de Street Cai. La versión llega en la URL (sw.js?v=<build>): cada despliegue es un
// worker nuevo con caché nueva, y se borran las anteriores.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'streetcai-' + VERSION;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('streetcai-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

// el servidor puede mandar Vary: Origin y la petición del módulo no coincidiría con la guardada
const MATCH = { ignoreVary: true };
const save = (req, res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // la página, primero de la red (así una versión nueva se ve al recargar); sin conexión, la guardada
    e.respondWith(fetch(req).then((res) => save(req, res)).catch(() => caches.match(req, MATCH).then((r) => r || caches.match(new URL('./', self.location.href), MATCH))));
    return;
  }
  // gráficos, voces, código y fuente: primero la caché (solo cambian con una versión nueva, que estrena caché)
  e.respondWith(caches.match(req, MATCH).then((hit) => hit || fetch(req).then((res) => save(req, res))));
});

// La página pasa la lista de lo que ya ha descargado (antes de que este worker controlara la página): se guarda
// lo que falte, sin repetir lo que ya está.
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'cache') return;
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(e.data.urls.map((u) => c.match(u, MATCH).then((hit) => hit || c.add(u)).catch(() => undefined)))));
});
