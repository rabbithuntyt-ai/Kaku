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

  const wanted = await page.evaluate(() =>
    window.__kaku.BRAIN_MODELS.reduce((a, m) => a.concat([m.id, m.plain]), []));
  for (const id of wanted) {
    assert.ok(got.ids.includes(id), id + ' is offered in settings but the runtime does not know it');
  }
  ok('every model Kaku offers is one the runtime can actually fetch, both builds of it');

  // a card without half-precision maths must be sent to the plain build, never the f16 one
  const swap = await page.evaluate(() => {
    const B = window.__kaku.Brain, before = B.card;
    B.card = { f16: false, name: 'test', maxBuffer: 0 };
    const plain = window.__kaku.BRAIN_MODELS.map((m) => B.idFor(m.id));
    B.card = { f16: true, name: 'test', maxBuffer: 0 };
    const half = window.__kaku.BRAIN_MODELS.map((m) => B.idFor(m.id));
    B.card = before;
    return { plain, half };
  });
  assert.ok(swap.plain.every((id) => /q4f32/.test(id)), 'got ' + swap.plain.join(', '));
  ok('a card with no half-precision maths is given the plain build instead');
  assert.ok(swap.half.every((id) => /q4f16/.test(id)), 'got ' + swap.half.join(', '));
  ok('and a card that has it still gets the smaller, faster one');

  // a shared graphics chip is steered to the model that will finish, not the best one
  const rec = await page.evaluate(() => {
    const B = window.__kaku.Brain, before = B.card;
    B.card = { f16: false, name: 'intel gen-13lp', maxBuffer: 0 };
    const shared = { id: B.best(), why: B.whyBest(), build: B.idFor(B.best()) };
    B.card = { f16: true, name: 'discrete', maxBuffer: 0 };
    const own = { id: B.best(), why: B.whyBest() };
    B.card = before;
    return { shared, own };
  });
  const tiny = await page.evaluate(() => window.__kaku.BRAIN_MODELS[window.__kaku.BRAIN_MODELS.length - 1].id);
  const bigg = await page.evaluate(() => window.__kaku.BRAIN_MODELS[0].id);
  assert.strictEqual(rec.shared.id, tiny, 'a shared chip should be offered the tiny model first');
  ok('a shared graphics chip is pointed at the model it can actually finish');
  assert.ok(rec.shared.why && /tiny/.test(rec.shared.why));
  ok('and told why, rather than silently given a lesser one');
  assert.ok(/q4f32/.test(rec.shared.build));
  ok('in the build it can compile');
  assert.strictEqual(rec.own.id, bigg);
  assert.strictEqual(rec.own.why, '');
  ok('while a card of its own is still offered the best model, unremarked');

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
