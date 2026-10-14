// Keeps Kaku on the iPad. Everything the app needs is stored by the browser the
// first time it is opened, so after that it runs with no connection at all — on a
// plane, on the bus, with every computer in the house switched off.
//
// Progress never comes near this: it lives in the browser's own storage, written
// by the app itself.

const BUILD = 'f6a0c601f3';
const CACHE = 'kaku-' + BUILD;
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './fonts/klee-600.woff2', './fonts/biz-400.woff2', './fonts/biz-700.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

const timeout = (ms) => new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // opening the app: take a fresh copy when the network is there and quick, so an
  // update lands by itself, and the stored copy the moment it is not
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await Promise.race([fetch(req), timeout(2500)]);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put('./index.html', fresh.clone());
          return fresh;
        }
        throw new Error('bad response');
      } catch (err) {
        return (await caches.match('./index.html', { ignoreSearch: true })) ||
               (await caches.match('./')) ||
               new Response('Open this once with a connection and it works offline after that.',
                            { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // fonts and icons never change within a build, so the stored copy is the fast answer
  e.respondWith((async () => {
    const kept = await caches.match(req, { ignoreSearch: true });
    if (kept) return kept;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
      return fresh;
    } catch (err) {
      return new Response('', { status: 504 });
    }
  })());
});
