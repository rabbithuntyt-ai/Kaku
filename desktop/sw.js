// What keeps Kaku on the phone when the computer is off.
//
// The page, the fonts and the icon are kept in the phone's own cache, so the home
// screen icon opens the app with nothing on the other end. Progress is never
// cached: /sync always goes to the computer, and fails quietly when it is not there,
// which the app already knows how to live with.

const BUILD = '__BUILD__';
const CACHE = 'kaku-' + BUILD;
const PAGE = '/';                       // where the page is kept, whatever key was on the URL
const SHELL = ['/build/icon.png', '/fonts/klee-600.woff2', '/fonts/biz-400.woff2', '/fonts/biz-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // these need no key, so the worker can fetch them by itself
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

// the page hands over its own address, key and all, so the worker can keep a copy
self.addEventListener('message', (e) => {
  const msg = e.data || {};
  if (msg.type !== 'keep' || !msg.url) return;
  e.waitUntil((async () => {
    try {
      const res = await fetch(msg.url, { cache: 'no-store' });
      if (res && res.ok) (await caches.open(CACHE)).put(PAGE, res.clone());
    } catch (err) {}
  })());
});

const timeout = (ms) => new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sync') return;              // progress is never served from a cache

  // opening the app: try the computer briefly, fall back to the copy on the phone
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await Promise.race([fetch(req, { cache: 'no-store' }), timeout(2500)]);
        if (fresh && fresh.ok) {
          (await caches.open(CACHE)).put(PAGE, fresh.clone());
          return fresh;
        }
        throw new Error('bad response');
      } catch (err) {
        const kept = await caches.match(PAGE, { ignoreSearch: true });
        return kept || new Response(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<body style="font:16px/1.5 -apple-system,system-ui,sans-serif;padding:40px 24px;color:#2b2f35;background:#fdfaf6">' +
          '<h1 style="font-size:20px">Kaku has not been saved to this phone yet</h1>' +
          '<p style="color:#7a7f85">Open it once while your computer is on, and after that it works without it.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 });
      }
    })());
    return;
  }

  // fonts and the icon: the phone's copy first, since they never change within a build
  e.respondWith((async () => {
    const kept = await caches.match(req);
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
