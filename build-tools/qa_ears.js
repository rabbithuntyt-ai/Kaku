// Listening without a speech service: the desktop app has none, so Kaku carries its own.
// The model itself is fetched from Hugging Face the first time and cannot be reached from
// the build machine, so what is checked here is everything around it — the runtime loads
// from Kaku's own server, audio is decoded and resampled to what the model expects, the
// offer appears instead of "I did not catch that", and the microphone routes to it.
const assert = require('assert');
const { chromium } = require('playwright');
const { SyncServer } = require('/home/claude/kaku/desktop/sync-server');

let passed = 0;
const ok = (m) => { passed++; console.log('  ok  ' + m); };

(async () => {
  let data = {};
  const server = new SyncServer({
    appDir: '/home/claude/kaku/desktop',
    read: () => data, write: (d) => { data = d; }, merge: (a) => a
  });
  await server.start(0, 'earstestkey', 0, true);
  const url = server.address();

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  // a window shaped like the desktop app: a speech service that accepts and then does nothing
  await ctx.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { setTimeout(() => this.onend && this.onend(), 5); }
      stop() {} abort() {}
    };
    window.kakuNative = {
      load: async () => null, save: async () => true, info: async () => ({}), onMenu: () => {}
    };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(url, { waitUntil: 'load' });

  const spec = await page.evaluate(() => window.__kaku.Ears.libUrl());
  assert.ok(spec.startsWith('./'), 'served copies use the runtime beside them: got ' + spec);
  ok('the listening runtime is the one shipped with Kaku, not a CDN');

  const lib = await page.evaluate(async () => {
    try {
      const m = await import(window.__kaku.Ears.libUrl());
      return { ok: true, pipeline: typeof m.pipeline, env: !!(m.env && m.env.backends.onnx.wasm) };
    } catch (e) { return { ok: false, err: String((e && e.message) || e).slice(0, 160) }; }
  });
  assert.ok(lib.ok, 'the runtime should load: ' + lib.err);
  assert.strictEqual(lib.pipeline, 'function');
  ok('it loads from Kaku’s own server and brings the part that builds a listener');
  assert.ok(lib.env);
  ok('and the place it looks for its wasm can be pointed at Kaku too');

  // the wasm must arrive as wasm; served as JavaScript the browser refuses it before it runs
  const w = await fetch(url.split('?')[0] + 'ort-wasm-simd-threaded.jsep.wasm');
  assert.strictEqual(w.status, 200);
  assert.strictEqual(w.headers.get('content-type'), 'application/wasm');
  ok('the runtime’s wasm is served as wasm, and without a key, as an import asks for it');

  // Whisper takes one channel at 16 kHz. A real recording arrives at whatever the microphone
  // runs at, so the decode has to resample — this proves it does, not merely that it returns.
  const audio = await page.evaluate(async () => {
    const rate = 44100, secs = 0.5, n = Math.floor(rate * secs);
    const bytes = new ArrayBuffer(44 + n * 2), view = new DataView(bytes);
    const put = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    put(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); put(8, 'WAVE'); put(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    put(36, 'data'); view.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) view.setInt16(44 + i * 2, Math.sin(i / 8) * 16000, true);
    const pcm = await window.__kaku.Ears.samples(new Blob([bytes], { type: 'audio/wav' }));
    return { len: pcm.length, first: pcm[100], isFloat: pcm instanceof Float32Array };
  });
  assert.ok(audio.isFloat, 'the model wants raw samples');
  ok('a recording comes back as raw samples');
  assert.ok(Math.abs(audio.len - 8000) < 400, 'half a second at 16 kHz is ~8000, got ' + audio.len);
  ok('resampled to the 16 kHz the model expects, whatever the microphone ran at');
  assert.ok(Math.abs(audio.first) > 0.01, 'the sound itself should survive the resampling');
  ok('with the sound still in it');

  // a tap, not speech: too short to be worth waking the model for
  const wav = (secs, rate) => `(() => {
    const rate = ${rate}, n = Math.floor(rate * ${secs});
    const bytes = new ArrayBuffer(44 + n * 2), view = new DataView(bytes);
    const put = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    put(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); put(8, 'WAVE'); put(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    put(36, 'data'); view.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) view.setInt16(44 + i * 2, Math.sin(i / 8) * 16000, true);
    return new Blob([bytes], { type: 'audio/wav' });
  })()`;
  const tiny = await page.evaluate(`(async () => {
    window.__asked = false;
    window.__kaku.Ears.pipe = async () => { window.__asked = true; return { text: 'x' }; };
    const got = await window.__kaku.Ears.hear(${wav(0.05, 44100)});
    return { got, asked: window.__asked };
  })()`);
  assert.strictEqual(tiny.got, '');
  assert.strictEqual(tiny.asked, false);
  ok('and a tap too short to be speech never reaches the model at all');

  // a recording that decodes to nothing is silence, not a crash
  const broken = await page.evaluate(async () => {
    const bad = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'audio/wav' });
    try { return { got: await window.__kaku.Ears.hear(bad) }; }
    catch (e) { return { threw: String((e && e.message) || e).slice(0, 80) }; }
  });
  assert.strictEqual(broken.got, '', 'should be silence, not ' + JSON.stringify(broken));
  ok('and a recording that will not decode is treated as silence rather than breaking');

  // Several readings of the same sound, judged by the words the lessons have taught. This is
  // the real case: "じゅう ごぜん です" came back as "キューが出てくる", which is not something
  // a beginner could have said, and the lessons say so.
  const picked = await page.evaluate(async () => {
    const K = window.__kaku, E = K.Ears;
    const forms = K.Allowed.set(K.Partner.lessons());
    E.state = 'warm';
    E.samples = async () => new Float32Array(16000);
    const seen = {};
    E.pipe = async (pcm, opts) => {
      seen.beams = opts.num_beams; seen.asked = opts.num_return_sequences;
      return [{ text: 'キューが出てくる' }, { text: 'きゅう が でて くる' }, { text: 'じゅう ごぜん です' }];
    };
    const best = await E.hear(new Blob(['x']), forms);
    // and with nothing to judge against, the model's own first choice stands
    const blind = await E.hear(new Blob(['x']), null);
    return { best, blind, seen };
  });
  assert.ok(picked.seen.asked > 1, 'it should ask for more than one reading');
  ok('it asks the model for several readings of the sound, not just one');
  assert.strictEqual(picked.best, 'じゅう ごぜん です');
  ok('and keeps the one made of words the lessons have actually taught');
  assert.strictEqual(picked.blind, 'キューが出てくる');
  ok('while with no lessons to judge against it takes the model at its word');

  // a model that will not take the extra readings must still be usable
  const fallback = await page.evaluate(async () => {
    const E = window.__kaku.Ears;
    let first = true;
    E.pipe = async () => {
      if (first) { first = false; throw new Error('num_return_sequences unsupported'); }
      return { text: 'おはよう' };
    };
    return await E.hear(new Blob(['x']), null);
  });
  assert.strictEqual(fallback, 'おはよう');
  ok('and a runtime that refuses them is asked again the plain way rather than failing');

  // back to a window with no listener, for the checks below
  await page.evaluate(() => { window.__kaku.Ears.state = 'cold'; window.__kaku.Ears.pipe = null; });

  // what the microphone button does in a window with no speech service
  await page.click('#talkBtn');
  await page.waitForTimeout(150);
  await page.click('[data-scene="0"] .lrow-mid');
  await page.waitForTimeout(150);
  await page.click('#tStart button[data-primary]');
  await page.waitForTimeout(250);
  await page.click('#tMic');
  await page.waitForTimeout(250);
  const msg = await page.textContent('#tMsg');
  assert.ok(!/did not catch|a little closer/.test(msg), 'got: ' + msg);
  ok('it does not tell you to speak up when nothing was listening');
  assert.ok(/cannot turn speech into words|listening here instead/.test(msg), 'got: ' + msg);
  ok('it offers to do the listening here instead');
  const labels = await page.$$eval('#tActions button', (b) => b.map((x) => x.textContent));
  assert.ok(labels.some((l) => /base listener/i.test(l)) && labels.some((l) => /tiny listener/i.test(l)),
    'got: ' + labels.join(' | '));
  ok('with both listeners to choose from, and their sizes said up front');
  assert.ok(labels.some((l) => /Type/i.test(l)));
  ok('and typing, for anyone who would rather');

  // a choice below the fold is no choice: the buttons must be on screen, not merely in the page
  const seen = await page.evaluate(() => {
    const host = document.getElementById('tActions');
    const b = host && host.querySelector('button');
    if (!b) return { none: true };
    const r = b.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, h: window.innerHeight, height: r.height };
  });
  assert.ok(!seen.none, 'there should be buttons at all');
  assert.ok(seen.height > 0, 'the buttons should be rendered');
  assert.ok(seen.top >= 0 && seen.bottom <= seen.h + 1,
    'buttons off screen: ' + JSON.stringify(seen));
  ok('and they are on screen, not waiting below the fold');

  // the message must not be so long that it buries them
  assert.ok(msg.length < 220, 'the offer is ' + msg.length + ' characters: ' + msg);
  ok('with a message short enough to leave room for them');

  // once a listener is loaded the microphone goes through it rather than the dead service
  const routed = await page.evaluate(async () => {
    const E = window.__kaku.Ears, L = window.__kaku.Listen;
    E.state = 'warm'; E.pipe = async () => ({ text: 'おはようございます' });
    E.record = async () => { window.__recording = true; };
    E.stopRecording = async () => new Blob(['x'], { type: 'audio/wav' });
    E.samples = async () => new Float32Array(16000);
    const seen = {};
    L.start({
      started: () => { seen.started = true; },
      partial: () => {}, working: () => { seen.working = true; },
      done: (heard) => { seen.heard = heard; }, fail: (w) => { seen.failed = w; }
    });
    await new Promise((r) => setTimeout(r, 50));
    await L.stop();
    await new Promise((r) => setTimeout(r, 50));
    return { seen, recording: !!window.__recording, ok: L.ok };
  });
  assert.ok(routed.recording && routed.seen.started, 'the microphone should reach the listener');
  ok('with a listener loaded, the microphone records through it');
  assert.ok(routed.seen.working);
  ok('and says it is working rather than looking frozen');
  assert.deepStrictEqual(routed.seen.heard, ['おはようございます']);
  ok('and what you said comes back as words');
  assert.ok(!routed.seen.failed);
  assert.ok(routed.ok);
  ok('so a window with no speech service of its own still counts as able to listen');

  assert.deepStrictEqual(errors, []);
  ok('no errors anywhere');

  await browser.close();
  if (server.stop) server.stop();
  console.log('\n' + passed + ' checks passed');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
