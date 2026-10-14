// Proves the on-device model can actually be reached: Kaku serves itself a page, and the
// page loads the runtime sitting beside it. Two things broke this once and neither showed
// up in a test, because every other suite runs the page off the disk where no model can run:
//   - the runtime was asked for without the sync key, and the server answered 403
//   - the address was a bare name, which a browser will not resolve at all
// Both failed silently. This drives the app's own libUrl() rather than a copy of it, so a
// change to that one line is caught here.
const assert = require('assert');
const { chromium } = require('playwright');
const { SyncServer } = require('/home/claude/kaku/desktop/sync-server');

let passed = 0;
const ok = (m) => { passed++; console.log('  ok  ' + m); };

(async () => {
  let data = {};
  const server = new SyncServer({
    appDir: '/home/claude/kaku/desktop',
    read: () => data,
    write: (d) => { data = d; },
    merge: (a) => a
  });
  await server.start(0, 'modeltestkey', 0, true);
  const url = server.address();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(url, { waitUntil: 'load' });

  const served = await page.evaluate(() => ({
    lan: !!window.KAKU_LAN,
    secure: window.isSecureContext,
    proto: location.protocol
  }));
  assert.ok(served.lan, 'the page should know it is being served');
  ok('Kaku serves itself a page on this machine');
  assert.ok(served.secure, '127.0.0.1 should count as a page the browser trusts');
  ok('and the browser trusts it, which a model requires');

  // the app's own answer, not a copy of it
  const spec = await page.evaluate(() => window.__kaku.Brain.libUrl());
  assert.ok(!/^https?:/.test(spec), 'a served copy should use the runtime beside it, not a CDN');
  ok('it looks for the runtime next to itself rather than on the internet');
  assert.ok(spec.startsWith('./') || spec.startsWith('/'),
    'a bare specifier will not resolve in a browser: got ' + JSON.stringify(spec));
  ok('and asks for it by a path a browser can resolve');

  const got = await page.evaluate(async () => {
    try {
      const m = await import(window.__kaku.Brain.libUrl());
      const list = (m.prebuiltAppConfig && m.prebuiltAppConfig.model_list) || [];
      return { ok: true, create: typeof m.CreateMLCEngine, ids: list.map((x) => x.model_id) };
    } catch (e) {
      return { ok: false, err: String((e && e.message) || e).slice(0, 160) };
    }
  });
  assert.ok(got.ok, 'the runtime should load: ' + got.err);
  ok('the runtime loads from Kaku’s own server, with no key and no internet');
  assert.strictEqual(got.create, 'function');
  ok('and it brings the part that starts a model');

  const wanted = await page.evaluate(() => window.__kaku.BRAIN_MODELS.map((m) => m.id));
  for (const id of wanted) {
    assert.ok(got.ids.includes(id), id + ' is offered in settings but the runtime does not know it');
  }
  ok('every model Kaku offers is one the runtime can actually fetch');

  // the key still guards everything that is not the runtime
  const r = await fetch(url.split('?')[0] + '/kaku-progress.json');
  assert.ok(r.status === 403 || r.status === 404);
  ok('and progress is still refused to anyone without the key');

  assert.deepStrictEqual(errors, []);
  ok('no errors anywhere');

  await browser.close();
  if (server.stop) server.stop();
  console.log('\n' + passed + ' checks passed');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
