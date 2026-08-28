/* Service worker: hace que la app abra aunque no haya internet.

   Estrategia deliberada: NETWORK FIRST para el HTML.
   Un service worker que cachea el HTML "para siempre" es la causa clasica de
   "hago un cambio y no lo veo nunca". Asi siempre se pide la ultima version, y
   la copia guardada se usa solo si no hay conexion.

   Para subir una version nueva, cambiar el numero de CACHE. */
const CACHE = 'dashboard-v1';
const ESENCIALES = [
  './',
  './index.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png',
  './favicon.svg'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ESENCIALES))
      .then(() => self.skipWaiting())          /* activar la version nueva sin esperar */
      .catch(() => self.skipWaiting())         /* si algo no esta, no bloquear la instalacion */
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(claves => Promise.all(
        claves.filter(k => k !== CACHE).map(k => caches.delete(k))   /* limpiar versiones viejas */
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* Solo se cachea lo propio: nada de Supabase ni Google Fonts */
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    fetch(req)
      .then(resp => {
        /* Copia fresca al cache, para tenerla cuando no haya red */
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
