// Talking practice: does it hear you, score you the way the lesson would, say why
// when you are off, and move the words along? And does it still work on a device
// that will not hand over a microphone?
const { chromium } = require('playwright');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

// a microphone that says exactly what the test tells it to
const fakeMic = () => {
  window.__spoken = [];
  window.SpeechRecognition = class {
    constructor() { this.lang = ''; this.onresult = null; this.onend = null; this.onerror = null; }
    start() {
      window.__rec = this;
      setTimeout(() => {
        const text = window.__nextSaid;
        if (text === undefined) { this.onend && this.onend(); return; }
        const results = [[{ transcript: text, confidence: 0.9 }]];
        results[0].isFinal = true;
        results.length = 1;
        this.onresult && this.onresult({ resultIndex: 0, results: Object.assign(results, { length: 1 }) });
        this.onend && this.onend();
      }, 20);
    }
    stop() {}
    abort() {}
  };
};

const prep = async (browser, { mic = true } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 940 } });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis;
    window.__said = [];
    ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = (u) => { window.__said.push(u.text); };
  });
  if (mic) await ctx.addInitScript(fakeMic);
  else await ctx.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await page.goto('file:///home/claude/kaku/test.html');
  await page.waitForTimeout(500);
  return { ctx, page, errs };
};

const say = async (page, text) => {
  await page.evaluate((t) => { window.__nextSaid = t; }, text);
  await page.click('#tMic');
  await page.waitForTimeout(220);
};

(async () => {
  const browser = await chromium.launch();

  // ---- the matching itself, before any clicking ------------------------------
  {
    const { ctx, page, errs } = await prep(browser);
    const verdict = (said, want, slips) => page.evaluate(([s, w, sl]) =>
      window.__kaku.judge(s, { accept: [w], slips: sl || [] }), [said, want, slips || []]);
    ok((await verdict('これはいくらですか', 'これは いくらですか')).good, 'spacing does not matter');
    ok((await verdict('コレハイクラデスカ', 'これは いくらですか')).good, 'katakana from the microphone still matches');
    ok((await verdict('学生です', 'がくせいです')).good, 'kanji the engine writes back is read off the kanji data');
    ok((await verdict('五千円です', 'ごせんえんです')).good, 'numbers written as digits are read as numbers');
    const wrongOne = await verdict('それはいくらですか', 'これは いくらですか', [['それ', 'それ is for something near the other person.']]);
    ok(!wrongOne.good && /near the other person/.test(wrongOne.pointer), 'the wrong demonstrative is caught and named');
    ok(!(await verdict('あれはやすいですか', 'これは いくらですか')).good, 'a different line is not waved through');
    ok((await verdict('ねつがあって、のどがいたいです', 'ねつが あって、のどが いたいです')).good, 'a long line still matches');
    ok(!(await verdict('やすいですね', 'たかいですね')).good, 'the opposite adjective is a miss');
    ok(errs.length === 0, 'no errors while matching');
    await ctx.close();
  }

  // ---- a scene, start to finish ----------------------------------------------
  {
    const { ctx, page, errs } = await prep(browser);
    await page.click('#talkBtn');
    await page.waitForTimeout(200);
    ok((await page.$$('[data-scene]')).length === 13, 'every lesson with a scene is listed');

    // lesson 2, the shop
    await page.click('[data-scene="2"] .lrow-mid');
    await page.waitForTimeout(200);
    ok(/At the shop/.test(await page.textContent('#tTitle')), 'the shop scene opens');
    ok(/いらっしゃいませ/.test(await page.textContent('#tNew')), 'phrases outside the word lists are explained first');
    ok(/not switched on/i.test(await page.textContent('#tNew')), 'and so are words from lessons not in the rotation');

    await page.click('#tStart button[data-primary]');
    await page.waitForTimeout(300);
    ok((await page.textContent('#tThread')).includes('いらっしゃいませ'), 'Kaku speaks first');
    ok((await page.evaluate(() => window.__said)).some(t => /いらっしゃいませ/.test(t)), 'out loud, not just on screen');
    ok(/how much/i.test(await page.textContent('#tCue')), 'and the cue says what to get across');

    // right answer
    await say(page, 'これはいくらですか');
    ok(/Exactly right|そうです/.test(await page.textContent('#tMsg')), 'a correct line is marked correct');
    ok(await page.evaluate(() => {
      const p = window.__kaku.S().progress['v:これ'];
      return !!(p && p.p && p.p.n === 1 && p.p.b > 0);
    }), 'and the words in it move up a box');

    await page.click('#tActions button[data-primary]');
    await page.waitForTimeout(250);

    // wrong answer, of the kind the lesson warns about
    await say(page, 'やすいですね');
    const msg = await page.textContent('#tMsg');
    ok(/たかいですね/.test(msg), 'a wrong line gets the model answer: ' + JSON.stringify(msg.slice(0, 40)));
    ok(await page.evaluate(() => {
      const p = window.__kaku.S().progress['v:たかい'];
      return !!(p && p.p && p.p.b === 0 && p.p.lapses === 1);
    }), 'and the word it was drilling goes back to the start');

    await page.click('#tActions button[data-primary]');
    await page.waitForTimeout(250);

    // the pointer for a classic slip
    await say(page, 'これはやすいですか');
    await page.waitForTimeout(150);
    const body = await page.textContent('#tRoom');
    ok(/これ is what is right by you/.test(body), 'the slip you made is named, not just the answer');

    // a microphone that mishears must not cost you the word
    const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.__kaku.S().progress['v:あれ'] || {})));
    const overrule = await page.$('#tActions button:has-text("That is what I said")');
    ok(!!overrule, 'a missed answer offers "that is what I said"');
    if (overrule) {
      await overrule.click();
      await page.waitForTimeout(150);
      ok(/Counted as said/.test(await page.textContent('#tMsg')), 'and taking it counts the turn');
      ok(await page.evaluate((b) => {
        const p = window.__kaku.S().progress['v:あれ'];
        return !!(p && p.p && p.p.b > (b.p ? b.p.b : 0));
      }, before), 'with the word moving up rather than down');
    }

    // show me, then say it
    await page.click('#tActions button[data-primary]');
    await page.waitForTimeout(200);
    await page.click('#tActions button:not([data-primary])');   // "Hear it again" / "Show me"
    const actions = await page.$$eval('#tActions button', b => b.map(x => x.textContent));
    ok(actions.length > 0, 'the turn always offers a way forward (' + actions.join(', ') + ')');

    // walk the rest of the scene out with correct answers
    for (let n = 0; n < 8; n++) {
      if (!(await page.$('#tDone:not([hidden])'))) {
        const shown = await page.$('#tActions button[data-primary]');
        if (shown) {
          const label = await shown.textContent();
          if (/Next|Finish/.test(label)) { await shown.click(); await page.waitForTimeout(200); continue; }
        }
        const want = await page.evaluate(() => window.__kaku.Talk.scene.turns[window.__kaku.Talk.i].accept[0]);
        await say(page, want);
        await page.waitForTimeout(150);
      }
    }
    ok(!(await page.$('#tDone[hidden]')), 'the scene reaches its end');
    ok(/said the way the lesson teaches it/.test(await page.textContent('#tScore')), 'and reports how it went');
    ok(errs.length === 0, 'no errors in a whole scene' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- a device with no microphone -------------------------------------------
  {
    const { ctx, page, errs } = await prep(browser, { mic: false });
    await page.click('#talkBtn');
    await page.waitForTimeout(150);
    ok(/will not listen/.test(await page.textContent('#tSetting')), 'it says plainly that this browser will not listen');
    await page.click('[data-scene="0"] .lrow-mid');
    await page.waitForTimeout(150);
    await page.click('#tStart button[data-primary]');
    await page.waitForTimeout(250);
    ok(await page.evaluate(() => document.getElementById('tMic').hidden), 'the microphone button is out of the way');
    await page.click('#tActions button');            // "Type it instead"
    await page.waitForTimeout(150);
    await page.fill('#tType', 'おはようございます');
    await page.click('#tActions button[data-primary]');
    await page.waitForTimeout(200);
    ok(/Exactly right|そうです/.test(await page.textContent('#tMsg')), 'a typed answer is scored the same way');
    ok(errs.length === 0, 'no errors without a microphone' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- a window that accepts the microphone and then does nothing with it ------
  // This is the desktop app's shape: start() works, nothing listens, it ends at once with no
  // result and no error. Telling someone to speak up is the one thing that cannot help.
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 940 } });
    await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await ctx.addInitScript(() => {
      window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      const ss = window.speechSynthesis;
      ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
      ss.cancel = () => {}; ss.speak = () => {};
      window.SpeechRecognition = class {
        start() { setTimeout(() => this.onend && this.onend(), 5); }
        stop() {} abort() {}
      };
      window.__opened = 0;
      window.kakuNative = {
        load: async () => null, save: async () => true, info: async () => ({}),
        openHere: async () => { window.__opened++; return { ok: true }; },
        onMenu: () => {}
      };
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto('file://' + __dirname + '/test.html', { waitUntil: 'load' });
    await page.click('#talkBtn');
    await page.waitForTimeout(150);
    await page.click('[data-scene="0"] .lrow-mid');
    await page.waitForTimeout(150);
    await page.click('#tStart button[data-primary]');
    await page.waitForTimeout(250);
    await page.click('#tMic');
    await page.waitForTimeout(250);
    const msg = await page.textContent('#tMsg');
    ok(!/did not catch|did not hear|a little closer/.test(msg),
      'it does not blame you for mumbling when nothing was listening');
    ok(/no way of its own|runs on this machine/.test(msg), 'it says the window itself cannot listen');
    const labels = await page.$$eval('#tActions button', (b) => b.map((x) => x.textContent));
    ok(labels.some((l) => /listener/i.test(l)), 'it offers to do the listening here instead');
    ok(labels.some((l) => /Type/i.test(l)), 'and typing, for anyone who would rather');
    ok(labels.some((l) => /browser/i.test(l)), 'and the browser, for anyone who would rather that');
    await page.click('#tActions button:has-text("Open Kaku in my browser")');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => window.__opened) === 1, 'and that button opens the served page');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
