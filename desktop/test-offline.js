// The point of the whole exercise: can the phone open Kaku with the computer off,
// keep working, and catch up with the computer afterwards?
//
// A real browser against the real server. It runs over localhost, which browsers
// treat as safe in the same way they treat HTTPS, so the offline worker behaves here
// exactly as it does for a phone on the Wi-Fi certificate.
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const { SyncServer } = require('./sync-server');
const { CertStore } = require('./cert-store');
const { mergeStates } = require('./merge');
const { Store } = require('./store');

const now = Date.now();
const rec = (b, n, last) => ({ b, due: now + 9e7, last, n, ok: n, lapses: 0 });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaku-offline-'));
  const store = new Store(dir);
  store.save({ v: 1, updatedAt: now - 5000, settings: { skin: 'genki', lessons: ['1'] },
    progress: { 'あ': { w: rec(4, 5, now - 1000) } }, custom: {} });

  const certs = new CertStore(dir, 'TEST-PC');
  const mk = () => new SyncServer({ appDir: __dirname, certs,
    read: () => store.load(), write: (d) => store.save(d), merge: mergeStates });

  let server = mk();
  await server.start(0, 'abcdef123456', 0);
  const port = server.port;
  const base = `http://127.0.0.1:${port}`;
  const url = `${base}/?k=abcdef123456`;
  ok(server.offlineReady, 'the computer also serves HTTPS, on port ' + server.securePort);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis; ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = () => {};
  });
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));

  // --- first visit, computer on ------------------------------------------------
  await page.goto(url);
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => !!window.KAKU_LAN), 'the page knows it came from the computer');
  ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'the offline worker is running the page');
  ok(await page.evaluate(() => document.querySelector('link[rel="apple-touch-icon"]') !== null),
     'the home screen icon is Kaku’s own');
  await page.waitForFunction(async () => {
    const c = await caches.open((await caches.keys())[0]);
    return !!(await c.match('/'));
  }, null, { timeout: 8000 }).catch(() => {});
  ok(await page.evaluate(async () => {
    const c = await caches.open((await caches.keys())[0]);
    const r = await c.match('/');
    return !!r && (await r.text()).includes('Start practice');
  }), 'the whole app is kept on the phone');

  // it pulled what the computer had
  ok(await page.evaluate(() => !!window.__kaku.S().progress['あ']), 'it pulled the computer’s progress');

  // --- computer off ------------------------------------------------------------
  server.stop();
  await page.waitForTimeout(200);
  const offline = await ctx.newPage();
  offline.on('pageerror', e => errs.push('pageerror(offline): ' + e.message));
  await offline.goto(url);
  await offline.waitForTimeout(900);
  ok(await offline.evaluate(() => !!document.getElementById('startBtn')), 'with the computer off, the app still opens');
  ok(await offline.evaluate(() => !!window.__kaku.S().progress['あ']), 'and the progress is still there');

  // work done on the phone while the computer is off
  await offline.evaluate(() => {
    const S = window.__kaku.S();
    S.progress['か'] = { w: { b: 3, due: Date.now() + 9e7, last: Date.now(), n: 3, ok: 3, lapses: 0 } };
    window.__kaku.Store.touch();
  });
  await offline.waitForTimeout(300);
  ok(await offline.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('kaku-hiragana-v1') || '{}');
    return !!(raw.progress && raw.progress['か']);
  }), 'work done with the computer off is saved on the phone');
  // the app checks every few seconds; two misses in a row is what makes it say so
  for (let i = 0; i < 3; i++) { await offline.evaluate(() => window.__kaku.Wifi.pull()); await offline.waitForTimeout(250); }
  const line = await offline.textContent('#wifiLine').catch(() => '');
  ok(/computer is off/i.test(line || ''), 'and it says so plainly: ' + JSON.stringify((line || '').slice(0, 48)));

  // --- computer back on --------------------------------------------------------
  // meanwhile the computer itself learned something else
  const onPc = store.load();
  onPc.progress['さ'] = { w: rec(2, 2, Date.now()) };
  onPc.updatedAt = Date.now();
  store.save(onPc);

  server = mk();
  await server.start(port, 'abcdef123456', 0);
  await offline.evaluate(() => window.__kaku.Wifi.pull());
  await offline.waitForTimeout(1500);

  ok(await offline.evaluate(() => !!window.__kaku.S().progress['さ']), 'the phone picks up what the computer did');
  const onDisk = store.load();
  ok(!!onDisk.progress['か'], 'and the computer picks up what the phone did');
  ok(!!onDisk.progress['あ'] && !!onDisk.progress['さ'], 'with nothing of its own lost');

  // --- a newer app on the computer ---------------------------------------------
  ok(await offline.evaluate(async () => {
    const r = await fetch('/sync?k=abcdef123456');
    return r.headers.get('x-kaku-build') !== null;
  }), 'the computer stamps every answer with the build it is serving');

  // --- the HTTPS half, which is what a phone actually uses ---------------------
  const https = require('https');
  const tls = require('tls');
  const fetchSecure = (p) => new Promise((resolve, reject) => {
    https.get({ host: '127.0.0.1', port: server.securePort, path: p, ca: certs.ca.cert, servername: 'localhost',
                checkServerIdentity: (h, c) => tls.checkServerIdentity('localhost', c) }, (res) => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body: b }));
    }).on('error', reject);
  });

  try {
    const page2 = await fetchSecure('/?k=abcdef123456');
    ok(page2.status === 200 && page2.body.includes('Start practice'), 'the HTTPS copy serves the app');
    ok(page2.body.includes("navigator.serviceWorker.register('/sw.js')"), 'and tells the phone to keep a copy of it');
    ok(/"secure":true/.test(page2.body), 'and the page knows it arrived safely');

    const sw = await fetchSecure('/sw.js');
    ok(sw.status === 200 && !sw.body.includes('__BUILD__'), 'the worker is served with this build stamped into it');

    const prof = await fetchSecure('/kaku.mobileconfig');
    ok(prof.status === 200 && /apple-aspen-config/.test(prof.type || ''), 'the phone profile is served as a profile');
    ok(prof.body.includes('com.apple.security.root'), 'and it carries the certificate to trust');

    const setup = await fetchSecure('/offline');
    ok(setup.status === 200 && /Certificate Trust Settings/.test(setup.body), 'the setup page spells out the iPhone steps');

    const nokey = await fetchSecure('/sync');
    ok(nokey.status === 403, 'HTTPS still refuses progress without the key');
  } catch (e) {
    ok(false, 'HTTPS checks failed: ' + e.message);
  }

  ok(errs.length === 0, 'no errors anywhere' + (errs.length ? ' — ' + errs[0] : ''));

  await browser.close();
  server.stop();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
