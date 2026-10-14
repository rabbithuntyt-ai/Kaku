// The iPad copy: once it has been opened, does it still open with nothing to
// connect to? Served from a subfolder, the way a GitHub Pages project site is.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = '/home/claude/kaku/web';
const PREFIX = '/kaku/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png',
  '.md': 'text/markdown', '.txt': 'text/plain' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const serve = () => new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (!p.startsWith(PREFIX)) { res.writeHead(404); return res.end('no'); }
    let rel = p.slice(PREFIX.length) || 'index.html';
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  server.listen(0, '127.0.0.1', () => resolve(server));
});

(async () => {
  let server = await serve();
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}${PREFIX}`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 1366 } });   // an iPad
  await ctx.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis; ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = () => {};
  });
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto(url);
  await page.waitForTimeout(900);
  ok(await page.title() === 'Kaku', 'it opens');
  ok(await page.evaluate(() => !!document.getElementById('startBtn')), 'the app is there');
  ok(await page.evaluate(() => !window.KAKU_LAN && !window.claude), 'with no computer and no account behind it');
  ok(await page.evaluate(() => getComputedStyle(document.body).fontFamily.includes('BIZ')),
     'and its own fonts, not Google’s');

  // installable: manifest, icons, worker
  const man = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  ok(man.display === 'standalone' && man.name === 'Kaku', 'it declares itself an app');
  ok(await page.evaluate(() => !!document.querySelector('link[rel="apple-touch-icon"]')), 'with an icon for the Home Screen');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {});
  ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'the worker that keeps it is running');
  ok(await page.evaluate(async () => {
    const c = await caches.open((await caches.keys())[0]);
    const r = await c.match('./index.html');
    return !!r && (await r.text()).includes('Start practice');
  }), 'the app itself is stored on the device');

  // do some work, as if studying on the train
  await page.evaluate(() => {
    const S = window.__kaku ? window.__kaku.S() : null;
    if (S) { S.progress['あ'] = { w: { b: 2, due: Date.now() + 9e7, last: Date.now(), n: 2, ok: 2, lapses: 0 } }; window.__kaku.Store.touch(); }
    else localStorage.setItem('kaku-probe', '1');
  });
  await page.waitForTimeout(300);

  // --- nothing to connect to -------------------------------------------------
  await new Promise(r => server.close(r));
  const offline = await ctx.newPage();
  offline.on('pageerror', e => errs.push('pageerror(offline): ' + e.message));
  await offline.goto(url);
  await offline.waitForTimeout(900);
  ok(await offline.evaluate(() => !!document.getElementById('startBtn')), 'with the site unreachable, it still opens');
  ok(await offline.evaluate(() => document.querySelectorAll('.cell').length > 50), 'the whole kana chart is there');
  ok(await offline.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('kaku-hiragana-v1') || '{}');
    return !!(raw.progress && raw.progress['あ']);
  }), 'and the work done earlier is still saved');

  // a session runs start to finish with no network
  await offline.click('#startBtn');
  await offline.waitForTimeout(700);
  ok(await offline.evaluate(() => document.body.dataset.screen) === 'practice', 'a practice session starts offline');
  await offline.click('#pClose');

  // the vocabulary screen, which is the heaviest part of the page
  await offline.click('#vocabBtn');
  await offline.waitForTimeout(400);
  ok(await offline.evaluate(() => document.querySelectorAll('#vList .wrow').length > 100), 'the vocabulary list is there too');

  // and a backup can still be taken, since that is the only way off the device
  ok(await offline.evaluate(() => {
    const btns = [...document.querySelectorAll('#syncActions button')].map(b => b.textContent);
    return btns.some(t => /Save a backup/.test(t)) && btns.some(t => /Copy this device/.test(t));
  }), 'backup and sync codes are available with no connection');

  ok(errs.length === 0, 'no errors anywhere' + (errs.length ? ' — ' + errs[0] : ''));
  await browser.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
