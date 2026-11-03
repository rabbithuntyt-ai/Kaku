// The Lesson 3 kanji and katakana quiz: the set, the question shapes from workbook p.134, and
// the one rule that matters here — a kana answer to a kanji question is wrong.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 950 } });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis;
    ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = () => {};
  });
  const errs = [], p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html');
  await p.waitForTimeout(400);

  // ---------------------------------------------------------------- the set
  const set = await p.evaluate(() => ({
    chars: window.__kaku.K3.map(k => k[0]).join(''),
    kata: window.__kaku.KATA3.length,
    strokes: window.__kaku.K3.filter(k => !(window.KANJI && window.KANJI.k)).length,
    readings: window.__kaku.K3.filter(k => !k[2].length).length,
    compounds: window.__kaku.K3.filter(k => !k[3].length).length
  }));
  ok(set.chars === '一二三四五六七八九十百千万円時',
     'set: the fifteen from workbook p.133, in order (' + set.chars + ')');
  ok(set.kata === 12, 'set: and the twelve Lesson 3 katakana words');
  ok(set.readings === 0 && set.compounds === 0, 'set: each one carries its readings and its words');

  // ---------------------------------------------------------------- numbers into kanji
  const nums = await p.evaluate(() => {
    const Q = window.__kaku.Quiz3;
    const want = { 41: '四十一', 300: '三百', 1500: '千五百', 2890: '二千八百九十', 10000: '一万',
                   67000: '六万七千', 128000: '十二万八千', 1000000: '百万', 5300: '五千三百',
                   49000: '四万九千', 600: '六百', 8000: '八千' };
    const bad = [];
    for (const n in want) if (Q.kanjiOf(+n) !== want[n]) bad.push(n + ' -> ' + Q.kanjiOf(+n) + ' want ' + want[n]);
    const rand = [];
    for (let i = 0; i < 400; i++) {
      const v = Q.randomNum();
      const k = Q.kanjiOf(v);
      if (!k || /undefined|NaN/.test(k)) rand.push(v + ' -> ' + k);
    }
    return { bad, rand: rand.slice(0, 3) };
  });
  ok(nums.bad.length === 0, 'numbers: every one the workbook sets comes out right' +
     (nums.bad.length ? ' — ' + nums.bad[0] : ''));
  ok(nums.rand.length === 0, 'numbers: and four hundred random ones convert without a hole');

  // ---------------------------------------------------------------- the question shapes
  const shapes = await p.evaluate(() => {
    const Q = window.__kaku.Quiz3, seen = {}, bad = [];
    for (let i = 0; i < 40; i++) for (const q of Q.build('all')) {
      seen[q.part.n] = (seen[q.part.n] || 0) + 1;
      if (q.kind === 'mc') {
        if (!(q.a >= 0 && q.a < q.opts.length)) bad.push('bad index');
        if (new Set(q.opts).size !== q.opts.length) bad.push('repeated option: ' + q.opts.join('/'));
      } else if (!q.a) bad.push('no answer for ' + q.q);
      if (!/^x:[jt]\d+$/.test(q.key || '')) bad.push('bad key ' + q.key);
      if (!q.why) bad.push('no explanation');
    }
    return { parts: Object.keys(seen).sort(), bad: bad.slice(0, 3) };
  });
  ok(shapes.bad.length === 0, 'questions: eight hundred of them are all answerable' +
     (shapes.bad.length ? ' — ' + shapes.bad[0] : ''));
  ok(shapes.parts.length >= 6,
     'questions: in the shapes the sheet uses (' + shapes.parts.join(', ') + ')');
  ok(shapes.parts.includes('Numbers in kanji') && shapes.parts.includes('Readings into kanji') &&
     shapes.parts.includes('Whole sentences') && shapes.parts.includes('Katakana'),
     'questions: number to kanji, reading to kanji, whole sentence, and katakana are all in');

  // ---------------------------------------------------------------- the marking
  const mark = await p.evaluate(() => {
    const E = window.__kaku.Exam, Q = window.__kaku.Quiz3;
    const num = Q.qNum(40).find(x => x.a === '四十一') || Q.qNum(1)[0];
    const write = Q.qWrite(40).find(x => x.a === '六百円');
    const read = Q.qRead(40).find(x => x.a === 'よじ');
    const back = Q.qBack(40).find(x => x.q === 'What number is this?');
    return {
      kanjiRight: E.right(num, num.a),
      kanaWrong: E.right(num, 'よんじゅういち'),
      writeRight: write ? E.right(write, '六百円') : null,
      writeKana: write ? E.right(write, 'ろっぴゃくえん') : null,
      readRight: read ? E.right(read, 'よじ') : null,
      readWrong: read ? E.right(read, 'よんじ') : null,
      backComma: back ? E.right(back, Number(back.a).toLocaleString('en-US')) : null,
      wantKanji: !!num.wantKanji
    };
  });
  ok(mark.kanjiRight, 'marking: the kanji answer passes');
  ok(mark.wantKanji && !mark.kanaWrong,
     'marking: and the kana spelling of it does not — which is the whole point of a kanji quiz');
  ok(mark.writeRight && !mark.writeKana, 'marking: ろっぴゃくえん written in kana is marked wrong');
  ok(mark.readRight && !mark.readWrong, 'marking: よじ is right and よんじ is not');
  ok(mark.backComma, 'marking: a number written with a comma is accepted');

  // and it must not tell you off for using kanji on a kanji question
  await p.evaluate(() => {
    const Q = window.__kaku.Quiz3, E = window.__kaku.Exam;
    const q = Q.qWrite(1)[0];
    E.runQueue([Object.assign({ part: q.part }, q)], { title: 'test' });
    E.answer(q.a);
  });
  await p.waitForTimeout(150);
  const msg = await p.textContent('#examMsg');
  ok(!/kanji, though|has to be kana/.test(msg), 'marking: and does not scold you for writing kanji (' + msg.slice(0, 40) + ')');

  // ---------------------------------------------------------------- the screen
  await p.evaluate(() => window.__kaku.App.home());
  await p.waitForTimeout(150);
  ok(/tomorrow|in \d+ days|today/.test(await p.textContent('#q3When')),
     'screen: the tile says when the quiz is (' + (await p.textContent('#q3When')) + ')');
  await p.click('#q3Btn');
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'q3', 'screen: the tile opens it');
  ok((await p.$$eval('.k3', n => n.length)) === 15, 'screen: all fifteen are listed');
  ok((await p.$$eval('.k3w', n => n.length)) === 12, 'screen: and the twelve katakana words');
  await p.click('.k3[data-k="13"]');
  await p.waitForTimeout(200);
  const one = await p.textContent('#q3One');
  ok(/円/.test(one) && /yen/.test(one), 'screen: tapping one shows its readings and its words');
  ok((await p.$$eval('#q3OneActs button', n => n.map(x => x.textContent))).some(x => /Stroke order/.test(x)),
     'screen: with a route to the stroke order');

  // sitting it
  await p.evaluate(() => window.__kaku.Quiz3.run('all'));
  await p.waitForTimeout(250);
  const qn = await p.evaluate(() => window.__kaku.Exam.queue.length);
  ok(qn >= 16, 'quiz: ' + qn + ' questions in a sitting');
  for (let i = 0; i < qn; i++) {
    await p.evaluate(() => {
      const E = window.__kaku.Exam, it = E.queue[E.i];
      E.answer(it.kind === 'mc' ? it.a : it.a);
    });
    await p.waitForTimeout(20);
    const nx = await p.$('#examActions button');
    if (nx) await nx.click();
    await p.waitForTimeout(20);
  }
  ok(/100%/.test(await p.textContent('#examQ')), 'quiz: a clean sheet scores 100%');
  const moved = await p.evaluate(() => {
    const K = window.__kaku;
    return { k: K.K3.filter((x, i) => K.confidence('x:j' + i) > 0).length,
             t: K.KATA3.filter((x, i) => K.confidence('x:t' + i) > 0).length };
  });
  ok(moved.k > 0 && moved.t > 0,
     'quiz: and it moves both sets (' + moved.k + ' kanji, ' + moved.t + ' katakana)');

  // writing the katakana by hand uses the Lesson 3 list, not the midterm one
  const hand = await p.evaluate(() => {
    const K = window.__kaku;
    K.KWrite.open(false, K.KATA3);
    return { n: K.KWrite.words.length, pre: K.KWrite.pre, first: K.KWrite.words[0][0] };
  });
  ok(hand.n === 12 && hand.pre === 'x:t', 'by hand: the board drills the Lesson 3 words on their own records');

  ok(errs.length === 0, 'no errors anywhere' + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
