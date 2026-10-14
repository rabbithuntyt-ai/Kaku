// Two "devices" against one running sync server: do they end up agreeing,
// and does each keep whatever the other did not have?
const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { SyncServer } = require('./sync-server');
const { mergeStates } = require('./merge');
const { Store } = require('./store');

const now = Date.now();
const rec = (b, n, last) => ({ b, due: now + 9e7, last, n, ok: n, lapses: 0 });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaku-sync-'));
const store = new Store(dir);
let pass = 0;
const ok = (m) => { console.log('  ok  ' + m); pass++; };

(async () => {
  // the computer already knows two characters
  store.save({ v: 1, updatedAt: now - 5000, settings: { skin: 'genki', lessons: ['1'] },
    progress: { 'あ': { w: rec(4, 5, now - 1000), r: rec(3, 3, now - 1000) }, 'い': { w: rec(2, 2, now - 1000) } },
    custom: { '1': [['こうぎ', 'こうぎ', 'lecture']] } });

  const server = new SyncServer({ appDir: __dirname, read: () => store.load(), write: (d) => store.save(d), merge: mergeStates });
  const address = await server.start(0);
  const base = `http://127.0.0.1:${server.port}`;
  const key = address.split('k=')[1];
  ok('server started on ' + base);

  // wrong key is refused
  let r = await fetch(`${base}/sync?k=wrong`);
  assert.strictEqual(r.status, 403); ok('a wrong key is refused');
  r = await fetch(`${base}/sync`);
  assert.strictEqual(r.status, 403); ok('no key is refused');

  // the phone pulls what the computer has
  r = await fetch(`${base}/sync?k=${key}`);
  let state = await r.json();
  assert.strictEqual(Object.keys(state.progress).length, 2); ok('phone pulls the computer state');

  // the phone practises different things and pushes
  const phone = { v: 1, updatedAt: now, settings: { skin: 'sumi', lessons: ['1', '2'] },
    progress: {
      'う': { w: rec(1, 1, now) },                       // only the phone has this
      'あ': { w: rec(1, 1, now - 9e8), r: rec(5, 6, now) } // older writing, newer reading
    },
    custom: { '1': [['ざっし', 'ざっし', 'magazine']] } };
  r = await fetch(`${base}/sync?k=${key}`, { method: 'POST', body: JSON.stringify(phone), headers: { 'Content-Type': 'application/json' } });
  const merged = await r.json();

  assert.strictEqual(Object.keys(merged.progress).length, 3); ok('both sides survive the merge');
  assert.strictEqual(merged.progress['あ'].w.b, 4); ok('the stale half of a record does not win');
  assert.strictEqual(merged.progress['あ'].r.b, 5); ok('the fresher half of the same record does win');
  assert.strictEqual(merged.progress['い'].w.b, 2); ok('what only the computer had is kept');
  assert.strictEqual(merged.progress['う'].w.b, 1); ok('what only the phone had is kept');
  assert.deepStrictEqual(merged.custom['1'].map(e => e[0]).sort(), ['ざっし', 'こうぎ'].sort()); ok('custom word lists are combined');
  assert.strictEqual(merged.settings.skin, 'sumi'); ok('settings come from whichever device is newer');

  // and the computer's file now holds the merge
  assert.deepStrictEqual(store.load(), merged); ok('the merge is written to disk');

  // the app itself is served, with the key injected
  r = await fetch(`${base}/?k=${key}`);
  const html = await r.text();
  assert.ok(html.includes('KAKU_LAN') && html.includes(key) && html.length > 300000); ok('the app is served with its key');
  r = await fetch(`${base}/fonts/klee-600.woff2?k=${key}`);
  assert.strictEqual(r.status, 200); ok('fonts are served');

  // no wandering outside the folder
  r = await fetch(`${base}/../../store.js?k=${key}`);
  assert.ok(r.status === 404 || r.status === 403); ok('path traversal is refused');
  for (const f of ['/store.js', '/main.js', '/certs.js', '/cert-store.js']) {
    r = await fetch(`${base}${f}?k=${key}`);
    assert.strictEqual(r.status, 404, f + ' should not be served');
  }
  ok('the program\u2019s own files are not served, only the app');
  r = await fetch(`${base}/sw.js`);
  assert.strictEqual(r.status, 200); ok('but the offline worker is, without a key, as a browser asks for it');
  r = await fetch(`${base}/main.js?k=${key}`);
  assert.strictEqual(r.status, 404); ok('only app files are served, not the program');

  // a phone can keep the app in its cache, so the home screen icon still opens Kaku
  // when the computer is off — but never the progress, which must always be fresh
  r = await fetch(`${base}/?k=${key}`);
  assert.match(r.headers.get('cache-control') || '', /max-age=\d{5,}/); ok('the app may be cached on the phone');
  r = await fetch(`${base}/fonts/klee-600.woff2?k=${key}`);
  assert.match(r.headers.get('cache-control') || '', /max-age=\d{5,}/); ok('so may the fonts');
  r = await fetch(`${base}/sync?k=${key}`);
  assert.strictEqual(r.headers.get('cache-control'), 'no-store'); ok('progress is never cached');

  // and the phone can tell when the computer has a newer build than the page it cached
  const stamp = r.headers.get('x-kaku-build');
  assert.match(stamp || '', /^[0-9a-f]{10}$/); ok('the computer stamps which build it serves');
  r = await fetch(`${base}/?k=${key}`);
  assert.ok((await r.text()).includes(stamp)); ok('and the page it serves carries the same stamp');

  server.stop();
  assert.strictEqual(server.running, false); ok('server stops');

  // the address a phone saved must still work after the computer restarts
  const again = new SyncServer({ appDir: __dirname, read: () => store.load(), write: (d) => store.save(d), merge: mergeStates });
  await again.start(0, key);
  assert.strictEqual(again.token, key); ok('a kept key survives a restart, so the saved address still works');
  r = await fetch(`http://localhost:${again.port}/sync?k=${key}`);
  assert.strictEqual(r.status, 200); ok('and the phone is let in with it');
  again.stop();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n${pass} checks passed`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
