// The live conversation: does it answer what you actually said, keep going, and —
// the part that matters — refuse to put a word in front of you that your lessons
// have not taught?
const { chromium } = require('playwright');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const seeded = (lessons, ai) => JSON.stringify({
  v: 1, updatedAt: Date.now(),
  settings: { rows: ['a'], script: 'h', mix: 'both', prompt: 'sound', strict: 'normal', len: 15, fresh: 5,
              lessons, numbands: [], skin: 'genki', mode: 'auto', ai: ai || 'off' },
  progress: {}, custom: {}
});

// a stand-in for Claude: hands back whatever the test queued, and records what it was asked
const fakeClaude = (replies) => {
  window.__asked = [];
  window.__replies = replies;
  window.claude = {
    use: async (name) => {
      if (name !== 'sample') return null;
      const fn = async () => ({ text: '', truncated: false, modelTierApplied: 'quick' });
      fn.json = async (turns) => {
        window.__asked.push(turns);
        const next = window.__replies.shift();
        if (!next) throw Object.assign(new Error('no more'), { code: 'upstream_error' });
        if (next.code) throw Object.assign(new Error(next.code), { code: next.code });
        return next;
      };
      fn.limits = async () => ({ maxPromptBytes: 65536 });
      return fn;
    }
  };
};

const open = async (browser, { lessons = ['0', '1', '2'], claude = null, ai = 'off' } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 940 } });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript((state) => {
    localStorage.setItem('kaku-hiragana-v1', state);
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis;
    window.__said = [];
    ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = (u) => { window.__said.push(u.text); };
  }, seeded(lessons, ai));
  if (claude) await ctx.addInitScript(fakeClaude, claude);
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await page.goto('file:///home/claude/kaku/test.html');
  await page.waitForTimeout(400);
  return { ctx, page, errs };
};

const thread = (page) => page.$$eval('#cThread .bub', bs => bs.map(b => ({
  who: b.querySelector('.who').textContent,
  jp: b.querySelector('.jp').textContent,
  en: (b.querySelector('.en') || {}).textContent || ''
})));

(async () => {
  const browser = await chromium.launch();

  // ---- the guard: what counts as taught ---------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    const check = (line, lessons) => page.evaluate(([l, ls]) =>
      window.__kaku.Allowed.unknown(l, window.__kaku.Allowed.set(ls)), [line, lessons]);
    ok(await check('これは いくらですか。', ['0', '1', '2']) === '', 'a line inside the lessons passes');
    ok(await check('たかいですね。', ['0', '1', '2']) === '', 'and so does an adjective from them');
    ok(await check('でんしゃで いきます。', ['0', '1', '2']) !== '', 'a word from a later lesson is caught');
    ok(await check('でんしゃで いきます。', ['0', '1', '2', '3', '10']) === '', 'and passes once those lessons are on');
    ok(await check('ねこは つくえの したに います。', ['0', '1', '2']) !== '', 'lesson 4 words are caught before lesson 4');
    ok(await check('ねこは つくえの したに います。', ['4']) === '', 'and pass with lesson 4 on');
    ok(errs.length === 0, 'no errors in the checker');
    await ctx.close();
  }

  // ---- the parser, which is what makes it an answer rather than a guess ---------
  {
    const { ctx, page, errs } = await open(browser, { lessons: ['0', '1', '2', '3', '4'] });
    const frame = (line) => page.evaluate((l) => window.__kaku.parseJa(l, ['0', '1', '2', '3', '4']), line);
    const a = await frame('きのう としょかんへ いきました');
    ok(a.verb === 'いく' && a.kind === 'motion', 'it finds the verb through its ending');
    ok(a.past === true, 'and that it already happened');
    ok(a.roles.to === 'としょかん', 'and where you went, from the particle');
    const b2 = await frame('うちで えいがを みました');
    ok(b2.roles.place === 'うち' && b2.roles.object === 'えいが', 'で and を are read as place and object');
    const c = await frame('これは いくらですか');
    ok(c.question && c.qword === 'howmuch', 'a price question is recognised as one');
    const d = await frame('なにを たべますか');
    ok(d.qword === 'what' && d.kind === 'eat', 'and what-do-you-eat is read as both');
    const e = await frame('たべません');
    ok(e.negative === true, 'a negative is read as a negative');
    const speed = await page.evaluate(() => {
      const t0 = performance.now();
      for (let i = 0; i < 50; i++) window.__kaku.Partner.localReply('きのう としょかんへ いきました');
      return (performance.now() - t0) / 50;
    });
    ok(speed < 60, 'a reply takes ' + speed.toFixed(1) + ' ms on this machine, with no network');
    ok(errs.length === 0, 'no errors in the parser');
    await ctx.close();
  }

  // ---- the offline partner -----------------------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    await page.click('#talkBtn');
    await page.waitForTimeout(150);
    ok(/Free conversation/.test(await page.textContent('#tNew')), 'the way in sits above the scenes');
    await page.click('[data-free] .lrow-mid');
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.body.dataset.screen) === 'chat', 'it opens the conversation');
    ok(/this device/i.test(await page.textContent('#cWho')), 'and says which partner is answering');
    const opening = await thread(page);
    ok(opening.length === 1 && opening[0].jp.length > 2, 'it opens the conversation itself');
    ok(opening[0].en.length > 2, 'with the English underneath');
    const words = await page.evaluate(() => window.__kaku.Allowed.unknown(
      document.querySelector('#cThread .jp').textContent, window.__kaku.Allowed.set(['0', '1', '2'])));
    ok(words === '', 'and every word of it comes from the lessons on');

    await page.evaluate(() => window.__kaku.Chat.said('はい、がくせいです'));
    await page.waitForTimeout(300);
    const after = await thread(page);
    ok(after.length === 3 && after[1].who === 'You', 'what you said goes in the thread');
    ok(/そうですか|いいですね|なるほど/.test(after[2].jp), 'the answer fits what you said');
    ok(/か。$/.test(after[2].jp.trim()), 'and it asks you something back: ' + JSON.stringify(after[2].jp));

    await page.evaluate(() => window.__kaku.Chat.said('ありがとうございます'));
    await page.waitForTimeout(300);
    const t2 = await thread(page);
    ok(/いいえ/.test(t2[t2.length - 1].jp), 'thanks is answered as thanks');

    await page.evaluate(() => window.__kaku.Chat.said('ぜんぜんわかりません'));
    await page.waitForTimeout(300);
    const t3 = await thread(page);
    ok(t3.length > 6, 'something it cannot parse still gets an answer');
    ok(/did not quite follow|not a word|もういちど/.test(await page.textContent('#cThread')),
       'and says so plainly rather than bluffing');

    ok(await page.evaluate(() => {
      const p = window.__kaku.S().progress['v:がくせい'];
      return !!(p && p.p && p.p.n > 0);
    }), 'words you said yourself count as practice');

    // the thread holds: what it asks next comes out of what you just told it
    const follow = await page.evaluate(() => {
      window.__kaku.Partner.asked = [];
      return window.__kaku.Partner.localReply('これは いくらですか').jp;
    });
    ok(/えんです/.test(follow), 'a price question gets a price back: ' + JSON.stringify(follow));
    ok(errs.length === 0, 'no errors in a conversation' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- Claude as the partner ---------------------------------------------------
  {
    const { ctx, page, errs } = await open(browser, { ai: 'on', claude: [
      { jp: 'こんにちは。 おなまえは なんですか。', en: 'Hello. What is your name?', note: '' },
      { jp: 'そうですか。 がくせいですか。', en: 'I see. Are you a student?', note: 'わたしわ should be わたしは — は is the particle.' }
    ] });
    await page.click('#talkBtn');
    await page.waitForTimeout(150);
    await page.click('[data-free] .lrow-mid');
    await page.waitForTimeout(600);
    ok(/Claude is answering/.test(await page.textContent('#cWho')), 'Claude takes the part where it can be reached');
    await page.evaluate(() => window.__kaku.Chat.said('わたしわ トロイです'));
    await page.waitForTimeout(400);
    const t = await thread(page);
    ok(/がくせいですか/.test(t[t.length - 1].jp), 'the reply is the one Claude gave');
    ok((await page.textContent('#cThread')).includes('should be わたしは'), 'and its correction is shown underneath');
    const asked = await page.evaluate(() => window.__asked[window.__asked.length - 1]);
    ok(asked[0].role === 'user' && /only the words/i.test(asked[0].content), 'Claude is told to stay inside the lessons');
    ok(/これ \(this one\)/.test(asked[0].content), 'with the actual word list from those lessons');
    ok(!/でんしゃ/.test(asked[0].content), 'and nothing from lessons that are switched off');
    ok(asked[asked.length - 1].role === 'user', 'the turns end on what you said');
    ok(errs.length === 0, 'no errors with Claude answering');
    await ctx.close();
  }

  // ---- Claude says something the lessons have not taught ------------------------
  {
    const { ctx, page, errs } = await open(browser, { ai: 'on', claude: [
      { jp: 'でんしゃで びょういんへ いきました。', en: 'I went to the hospital by train.', note: '' },
      { jp: 'くるまで びょういんへ いきました。', en: 'I went to the hospital by car.', note: '' }
    ] });
    await page.click('#talkBtn');
    await page.waitForTimeout(150);
    await page.click('[data-free] .lrow-mid');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__kaku.Chat.said('はい'));
    await page.waitForTimeout(500);
    const asked = await page.evaluate(() => window.__asked.length);
    ok(asked === 2, 'an answer outside the lessons is sent back to be rewritten (' + asked + ' calls)');
    const rewrite = await page.evaluate(() => window.__asked[window.__asked.length - 1][0].content);
    ok(/has not been taught/.test(rewrite), 'with the offending word named');
    const t = await thread(page);
    const shown = t.map(b => b.jp).join(' ');
    ok(!/でんしゃ|くるま|びょういん/.test(shown), 'and neither untaught line ever reaches you');
    const left = await page.evaluate((line) => window.__kaku.Allowed.unknown(line, window.__kaku.Allowed.set(['0', '1', '2'])),
      t[t.length - 1].jp);
    ok(left === '', 'what takes its place is entirely inside the lessons');
    ok(errs.length === 0, 'no errors while rejecting a reply');
    await ctx.close();
  }

  // ---- Claude refused or unavailable -------------------------------------------
  {
    const { ctx, page, errs } = await open(browser, { ai: 'on', claude: [{ code: 'not_granted' }] });
    await page.click('#talkBtn');
    await page.waitForTimeout(150);
    await page.click('[data-free] .lrow-mid');
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__kaku.Chat.said('こんにちは'));
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__kaku.Partner.mode) === 'local', 'a refusal drops to the offline partner');
    const t = await thread(page);
    ok(t.length >= 3, 'and the conversation carries on regardless');
    ok(errs.length === 0, 'no errors after a refusal');
    await ctx.close();
  }

  // ---- a model running on this machine -----------------------------------------
  {
    const { ctx, page, errs } = await open(browser, { lessons: ['0', '1', '2'] });
    // what it says when there is no graphics card to use
    const why = await page.evaluate(async () => {
      Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
      return window.__kaku.Brain.why() || await window.__kaku.Brain.check();
    });
    ok(/WebGPU|graphics card|trusts/.test(why || ''), 'without a graphics card it says so plainly: ' + JSON.stringify((why || '').slice(0, 60)));

    // the three-line shape a small model is asked for
    const parsed = await page.evaluate(() => window.__kaku.Brain.parse(
      'JP: こんにちは。 がくせいですか。\nEN: Hello. Are you a student?\nNOTE: わ should be は.'));
    ok(parsed.jp === 'こんにちは。 がくせいですか。' && /student/.test(parsed.en) && /は/.test(parsed.note),
       'a labelled reply is read back correctly');
    const loose = await page.evaluate(() => window.__kaku.Brain.parse('こんにちは。おげんきですか。\nHello. How are you?'));
    ok(/こんにちは/.test(loose.jp) && /Hello/.test(loose.en), 'and so is one that forgot the labels');

    // with a stand-in engine, the whole path works and is still checked
    const run = async (replies) => page.evaluate(async (rs) => {
      const K = window.__kaku;
      K.Brain.state = 'warm';
      K.Brain.engine = { chat: { completions: { create: async () => ({
        [Symbol.asyncIterator]() {
          const text = rs.shift() || '';
          let done = false;
          return { next: async () => done ? { done: true } : (done = true, { value: { choices: [{ delta: { content: text } }] }, done: false }) };
        }
      }) } } };
      K.S().settings.ai = 'brain';
      K.Partner.ready = false;
      await K.Partner.connect();
      const out = await K.Partner.respond('はい、がくせいです');
      return { jp: out && out.jp, note: K.Partner.note || '', mode: K.Partner.mode };
    }, replies);

    const good = await run(['JP: そうですか。 せんこうは なんですか。\nEN: I see. What is your major?\nNOTE:']);
    ok(good.mode === 'brain', 'the model is the one answering');
    ok(/せんこう/.test(good.jp), 'its reply is used: ' + JSON.stringify(good.jp));

    const strayed = await run([
      'JP: でんしゃで びょういんへ いきました。\nEN: I went by train.\nNOTE:',
      'JP: くるまで いきました。\nEN: I went by car.\nNOTE:'
    ]);
    ok(!/でんしゃ|くるま/.test(strayed.jp || ''), 'a reply outside the lessons never reaches you');
    ok(await page.evaluate((line) => window.__kaku.Allowed.unknown(line, window.__kaku.Allowed.set(['0', '1', '2'])), strayed.jp) === '',
       'what takes its place is inside the lessons');
    ok(/wandered outside/.test(strayed.note), 'and it says why: ' + JSON.stringify(strayed.note.slice(0, 40)));
    ok(await page.evaluate(() => window.__asked === undefined || window.__asked.length === 0),
       'with the model answering, Claude is never asked');
    ok(errs.length === 0, 'no errors with a model answering' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- the switch is off by default: nothing is sent to Claude ------------------
  {
    const { ctx, page, errs } = await open(browser, { claude: [
      { jp: 'こんにちは。', en: 'Hello.', note: '' }
    ] });
    ok(await page.evaluate(() => window.__kaku.S().settings.ai) === 'off', 'answering with Claude is off to begin with');
    await page.click('#talkBtn');
    await page.waitForTimeout(150);
    await page.click('[data-free] .lrow-mid');
    await page.waitForTimeout(500);
    ok(/this device/i.test(await page.textContent('#cWho')), 'so this device answers');
    await page.evaluate(() => window.__kaku.Chat.said('はい、がくせいです'));
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__asked.length) === 0, 'and Claude is never asked, so nothing is spent');
    const t = await thread(page);
    ok(t.length >= 3, 'the conversation still answers you');
    ok(await page.evaluate(() => {
      const el = document.getElementById('aiField');
      return !!el && !el.hidden;
    }), 'the switch to hand it to Claude is there when Claude could be reached');
    ok(errs.length === 0, 'no errors with the switch off');
    await ctx.close();
  }

  // ---- the prompt has to fit the window it is sent into ----------------------
  // "Prompt tokens exceed context window size: 591 / 512" — the rules listed every word of
  // every lesson switched on, so the prompt grew with the lessons until the model refused it.
  {
    const { ctx, page, errs } = await open(browser, { lessons: ['0', '1', '2', '3', '4', '5'] });
    const fit = await page.evaluate(() => {
      const K = window.__kaku;
      const out = { unbounded: K.roughTokens(K.Partner.brainRules(99999)), fits: [], shape: true };
      for (const b of [256, 512, 1000, 1600]) {
        const r = K.Partner.brainRules(b);
        out.fits.push({ b, got: K.roughTokens(r) });
        if (!/JP: <your Japanese>/.test(r) || !/Use ONLY these words/.test(r)) out.shape = false;
      }
      return out;
    });
    ok(fit.unbounded > 512, 'six lessons of words would not have fitted the old window');
    for (const f of fit.fits) ok(f.got <= f.b, 'a ' + f.b + '-token budget is respected (' + f.got + ')');
    ok(fit.shape, 'and the reply shape survives the trimming, which is what makes it parseable');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' \u2014 ' + errs[0] : ''));
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
