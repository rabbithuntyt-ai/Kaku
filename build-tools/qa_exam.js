// The JAPA 100 midterm, the こそあど grid and the Lesson 3 verbs.
//
// The exam is a real paper on a real date, so the thing that matters most here is that the
// app's idea of it matches the study guide: five parts in that order, the right number of
// questions, and a readiness figure that means what it says rather than flattering.
const { chromium } = require('playwright');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const open = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 940 } });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis;
    window.__said = [];
    ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = (u) => window.__said.push(u.text);
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + __dirname + '/test.html', { waitUntil: 'load' });
  await page.waitForTimeout(250);
  return { ctx, page, errs };
};

(async () => {
  const browser = await chromium.launch();

  // ---- the paper matches the study guide ---------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    const p = await page.evaluate(() => window.__kaku.Exam.PARTS.map((x) => [x.id, x.n, x.q]));
    ok(p.length === 5, 'the paper has five parts');
    ok(p[0][0] === 'listen' && p[1][0] === 'kata' && p[2][0] === 'vg' && p[3][0] === 'build' && p[4][0] === 'ex',
      'in the order the study guide prints them');
    const total = p.reduce((a, x) => a + x[2], 0);
    ok(total === 38, 'and ' + total + ' questions across it');

    // the course, kept apart from everything else Kaku knows
    const v = await page.evaluate(() => {
      const K = window.__kaku, all = Object.values(K.VOCAB);
      const on = all.filter((x) => x.c);
      return { all: all.length, on: on.length,
               byCourse: on.reduce((a, x) => { a[x.c] = (a[x.c] || 0) + 1; return a; }, {}),
               kata: K.KATAKANA.length };
    });
    // read the expected total from the course data rather than pinning it, so adding a
    // workbook word is not a test failure
    const expected = await page.evaluate(() =>
      Object.values(window.__kaku.COURSE).reduce((a, c) => a + c.n, 0));
    ok(v.on === expected, 'every one of the ' + expected + ' course words is marked, and no others');
    ok(v.all > v.on, 'and the rest of what Kaku knows is still there, ' + (v.all - v.on) + ' words of it');
    ok(Object.keys(v.byCourse).sort().join(',') === '0,1,2,3', 'split across the four course lessons');
    ok(v.kata === 18, 'with ' + v.kata + ' katakana words for Part II');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- what the readiness figure means -----------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    const cold = await page.evaluate(() => {
      const r = window.__kaku.Exam.readiness();
      return { expected: r.expected, perfect: r.perfect, total: r.total };
    });
    ok(Math.abs(cold.expected - 0.25) < 0.02,
      'from nothing, the expected mark is a guess on four options (' + Math.round(cold.expected * 100) + '%)');
    ok(cold.perfect < 0.001, 'and the chance of a perfect paper is essentially nil, as it should be');
    ok(cold.perfect < cold.expected, 'a perfect paper is always the harsher number of the two');

    // getting things right has to move it, and only the part it belongs to
    const after = await page.evaluate(() => {
      const K = window.__kaku;
      const before = K.Exam.partChance('build');
      const beforeOther = K.Exam.partChance('kata');
      for (const k of K.Exam.keys('build')) for (let i = 0; i < 4; i++) K.SRS.update(k, 'r', 'perfect');
      return { before, after: K.Exam.partChance('build'),
               otherBefore: beforeOther, otherAfter: K.Exam.partChance('kata') };
    });
    ok(after.after > after.before + 0.2, 'practising a part lifts that part (' +
      Math.round(after.before * 100) + '% to ' + Math.round(after.after * 100) + '%)');
    ok(Math.abs(after.otherAfter - after.otherBefore) < 0.001, 'and leaves the others exactly where they were');

    const capped = await page.evaluate(() => {
      const K = window.__kaku;
      for (const part of ['listen', 'kata', 'vg', 'build', 'ex']) {
        for (const k of K.Exam.keys(part)) for (let i = 0; i < 8; i++) K.SRS.update(k, 'r', 'perfect');
      }
      return K.Exam.readiness();
    });
    ok(capped.expected < 1, 'even everything right never reads as a certainty');
    ok(capped.perfect > cold.perfect, 'but the perfect-paper chance does climb off the floor');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- every part produces questions that can be answered -----------------------
  {
    const { ctx, page, errs } = await open(browser);
    for (const [part, n] of [['listen', 5], ['kata', 8], ['vg', 15], ['build', 5], ['ex', 5]]) {
      const made = await page.evaluate(([p, k]) => {
        const items = window.__kaku.Exam.make(p, k);
        return items.map((it) => ({
          kind: it.kind, hasQ: !!it.q, key: it.key || '',
          optCount: it.opts ? it.opts.length : 0,
          answerable: it.kind === 'mc' ? (it.a >= 0 && it.a < it.opts.length) : !!it.a
        }));
      }, [part, n]);
      ok(made.length === n, part + ': makes the ' + n + ' questions the paper asks for');
      ok(made.every((m) => m.hasQ), part + ': every question has something to answer');
      ok(made.every((m) => m.answerable), part + ': and an answer that is actually among the options');
      if (part !== 'listen') ok(made.every((m) => m.key), part + ': each one is a review item of its own');
    }
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- marking: the shape matters, the punctuation does not ---------------------
  {
    const { ctx, page, errs } = await open(browser);
    const m = await page.evaluate(() => {
      const E = window.__kaku.Exam;
      const item = { kind: 'type', a: 'わたしはにくをたべません。', alt: [] };
      const mc = { kind: 'mc', a: 2 };
      return {
        exact: E.right(item, 'わたしはにくをたべません。'),
        spaced: E.right(item, 'わたしは にくを たべません。'),
        noStop: E.right(item, 'わたしはにくをたべません'),
        kanji: E.right(item, '私は肉を食べません。'),
        wrongParticle: E.right(item, 'わたしがにくをたべません。'),
        wrongForm: E.right(item, 'わたしはにくをたべます。'),
        mcRight: E.right(mc, 2), mcWrong: E.right(mc, 1)
      };
    });
    ok(m.exact && m.spaced && m.noStop, 'spacing and the full stop are not what is being tested');
    ok(m.kanji, 'and neither is whether you wrote it in kanji or kana');
    ok(!m.wrongParticle, 'but the wrong particle is wrong');
    ok(!m.wrongForm, 'and so is the wrong verb form, which is the whole of Part IV');
    ok(m.mcRight && !m.mcWrong, 'multiple choice marks on the option you picked');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- こそあど: one decision per question ---------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    await page.click('#gridBtn');
    await page.waitForTimeout(200);
    const cells = await page.$$eval('.kg-c b', (n) => n.map((x) => x.textContent));
    ok(cells.join(' ') === 'これ それ あれ どれ この その あの どの ここ そこ あそこ どこ',
      'the grid is all twelve, laid out as three rows of four');
    await page.click('#gridActions button');
    await page.waitForTimeout(250);
    const q = await page.evaluate(() => ({
      prog: document.getElementById('gridProg').textContent,
      opts: [...document.querySelectorAll('#gridBody .opt')].map((o) => o.textContent)
    }));
    ok(/how far away|which shape/.test(q.prog), 'each question says which decision it is testing');
    const d = await page.evaluate(() => window.__kaku.Exam.kosoadoRows || null);
    const rows = [['これ', 'それ', 'あれ', 'どれ'], ['この', 'その', 'あの', 'どの'], ['ここ', 'そこ', 'あそこ', 'どこ']];
    const sameRow = rows.some((r) => q.opts.every((o) => r.includes(o)));
    const sameCol = [0, 1, 2, 3].some((i) => q.opts.every((o) => rows.map((r) => r[i]).includes(o)));
    ok(sameRow || sameCol, 'and the options vary one axis only: ' + q.opts.join(' '));
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- the Lesson 3 verbs --------------------------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    const v = await page.evaluate(() => {
      const V = window.__kaku.Verbs.all();
      return { n: V.length,
               groups: V.reduce((a, x) => { a[x.g] = (a[x.g] || 0) + 1; return a; }, {}),
               traps: V.filter((x) => x.trap).map((x) => x.v),
               kaeru: V.find((x) => x.v === 'かえる'),
               everyOne: V.every((x) => x.m && x.ms && x.mn && x.p) };
    });
    ok(v.n === 13, 'all thirteen Lesson 3 verbs are there');
    ok(v.groups.u === 6 && v.groups.ru === 4 && v.groups.irr === 3, 'six う, four る, three irregular');
    ok(v.everyOne, 'each with its meaning, both polite forms and its particle');
    ok(v.kaeru.g === 'u' && v.kaeru.ms === 'かえります', 'かえる is a う-verb — かえります, not かえます');
    ok(v.traps.join(',') === 'かえる', 'and it is the one flagged as the trap it is');

    await page.click('#verbsBtn');
    await page.waitForTimeout(200);
    ok((await page.$$('.vrow')).length === 13, 'the list shows all thirteen');
    ok((await page.$$('.vrow.trap')).length === 1, 'with the trap marked out');
    // the polite-form drill must offer the mistake the group makes you prone to
    const tempting = await page.evaluate(() => {
      const V = window.__kaku.Verbs;
      V.run('f');
      for (let i = 0; i < 40; i++) {
        if (V.cur && V.cur.v.v === 'かえる') {
          return [...document.querySelectorAll('#vBody .opt')].map((o) => o.textContent);
        }
        V.i++; V.ask();
      }
      return null;
    });
    if (tempting) {
      ok(tempting.includes('かえります'), 'the right form is among the options for かえる');
      ok(tempting.includes('かえます'), 'and so is かえます, the mistake its shape invites');
    } else {
      ok(true, 'かえる did not come up in this draw');
    }
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- what you get back for doing the work --------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    const g = await page.evaluate(() => {
      const K = window.__kaku;
      K.Gains.snap();
      const first = K.Gains.mark();
      const again = K.Gains.mark();
      for (const k of K.Exam.keys('build')) for (let i = 0; i < 5; i++) K.SRS.update(k, 'r', 'perfect');
      return { first, again, streak: K.S().streak.n, since: K.Gains.since() };
    });
    ok(g.first === true, 'turning up is counted');
    ok(g.again === false, 'once a day, not once a question');
    ok(g.streak === 1, 'and the streak starts at one');
    ok(/expected mark up/.test(g.since), 'a session reports what it moved: ' + g.since);

    const ms = await page.evaluate(() => {
      const K = window.__kaku;
      const out = [];
      for (const part of ['listen', 'kata', 'vg', 'build', 'ex']) {
        for (const k of K.Exam.keys(part)) for (let i = 0; i < 8; i++) K.SRS.update(k, 'r', 'perfect');
      }
      out.push(K.Gains.milestone());
      out.push(K.Gains.milestone());
      return out;
    });
    ok(!!ms[0], 'a milestone is announced when one is reached: ' + ms[0]);
    ok(ms[1] !== ms[0], 'and never the same one twice');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- sitting a part through to the end -----------------------------------------
  {
    const { ctx, page, errs } = await open(browser);
    await page.click('#examBtn');
    await page.waitForTimeout(200);
    await page.click('.part[data-part="vg"]');
    await page.waitForTimeout(250);
    for (let i = 0; i < 15; i++) {
      const a = await page.evaluate(() => {
        const q = window.__kaku.Exam.queue[window.__kaku.Exam.i];
        return q ? q.a : null;
      });
      if (a === null) break;
      await page.evaluate((x) => window.__kaku.Exam.answer(x), a);
      await page.waitForTimeout(40);
      const next = await page.$('#examActions button');
      if (next) await next.click();
      await page.waitForTimeout(40);
    }
    const done = await page.evaluate(() => ({
      score: (document.querySelector('#examQ .score-n') || {}).textContent,
      gain: (document.querySelector('#examBody .gain') || {}).textContent,
      rows: document.querySelectorAll('#examBody .row').length
    }));
    ok(done.score === '100%', 'answering every one right scores 100%');
    ok(done.rows >= 1, 'with a breakdown by part');
    ok(!!done.gain, 'and a line saying what it moved: ' + done.gain);
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- a machine with no Japanese voice -------------------------------------------
  // Windows ships Japanese speech only with the language pack. Without it the listening part
  // would be a silent button and five marks you cannot attempt.
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 940 } });
    await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await ctx.addInitScript(() => {
      window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      const ss = window.speechSynthesis;
      ss.getVoices = () => [{ name: 'Microsoft David', lang: 'en-US' }];
      ss.cancel = () => {}; ss.speak = () => {};
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto('file://' + __dirname + '/test.html', { waitUntil: 'load' });
    await page.waitForTimeout(2800);
    await page.click('#examBtn');
    await page.waitForTimeout(200);
    await page.click('.part[data-part="listen"]');
    await page.waitForTimeout(350);
    const seen = await page.evaluate(() => ({
      text: document.getElementById('examQ').textContent,
      opts: document.querySelectorAll('.opt').length
    }));
    ok(/no Japanese voice/.test(seen.text), 'it says the machine cannot speak Japanese');
    ok(/[\u3040-\u30ff]/.test(seen.text), 'and writes the line out instead of playing nothing');
    ok(seen.opts === 3, 'so the five marks are still answerable');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- the eight improvements -----------------------------------------------------
  {
    const { ctx, page, errs } = await open(browser);

    // 1. kanji is accepted but said, because the paper forbids it
    const k = await page.evaluate(() => {
      const E = window.__kaku.Exam;
      return { flags: E.usedKanji('私はにくをたべません。'), clean: E.usedKanji('わたしはにくをたべません。'),
               stillRight: E.right({ kind: 'type', a: 'わたしはにくをたべません。', alt: [] }, '私はにくをたべません。') };
    });
    ok(k.flags && !k.clean, 'kanji in an answer is noticed');
    ok(k.stillRight, 'and still marked right, because the Japanese was right');

    // 3. distractors you could actually mishear
    const d = await page.evaluate(() => {
      const E = window.__kaku.Exam, bad = [];
      for (let r = 0; r < 60; r++) for (const i of E.make('listen', 4)) {
        if (new Set(i.opts).size !== 3) bad.push('dupe ' + i.opts.join('/'));
        const ages = i.opts.filter((o) => /years old/.test(o)).map((o) => parseInt(o, 10));
        if (ages.some((a) => a < 15 || a > 60)) bad.push('age ' + i.opts.join('/'));
        if (i.opts.some((o) => /undefined|NaN/.test(o))) bad.push('broken ' + i.opts.join('/'));
      }
      return bad;
    });
    ok(d.length === 0, 'over 240 listening questions no option set is broken or implausible');

    // 2. the quizzes already sat
    const q = await page.evaluate(() => {
      const K = window.__kaku, S = K.S();
      const cold = K.Exam.readiness();
      S.exam = { quiz: { kata: 15, l1: 15, l2: 17 } };
      const warm = K.Exam.readiness();
      return { cold: cold.expected, warm: warm.expected,
               kata: warm.parts.find((x) => x.id === 'kata').chance,
               build: warm.parts.find((x) => x.id === 'build').chance,
               listen: warm.parts.find((x) => x.id === 'listen').chance };
    });
    ok(q.warm > q.cold + 0.3, 'real quiz marks move the expected mark off its cold start (' +
      Math.round(q.cold * 100) + '% to ' + Math.round(q.warm * 100) + '%)');
    ok(Math.abs(q.kata - 0.75) < 0.02, 'Part II reads straight off the katakana quiz');
    ok(Math.abs(q.listen - 0.25) < 0.02, 'Part I stays at a guess, because no quiz covered numbers');
    ok(q.build < q.kata + 0.2 && q.build < 0.75,
      'and Part IV is discounted, because Lesson 3 was never quizzed (' + Math.round(q.build * 100) + '%)');

    // 4. what you have never once practised
    const u = await page.evaluate(() => {
      const K = window.__kaku;
      const before = Object.values(K.Exam.untouched()).reduce((a, x) => a + x.length, 0);
      const first = Object.values(K.Exam.untouched())[0][0];
      const key = Object.keys(K.VOCAB).find((x) => K.VOCAB[x].w === first.w);
      K.SRS.update(key, 'r', 'perfect');
      return { before, after: Object.values(K.Exam.untouched()).reduce((a, x) => a + x.length, 0) };
    });
    const total = await page.evaluate(() =>
      Object.values(window.__kaku.COURSE).reduce((a, c) => a + c.n, 0));
    ok(u.before === total, 'from nothing, all ' + total + ' course words are untouched');
    ok(u.after === u.before - 1, 'and practising one takes it off the list');

    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- cram, exam conditions, and writing by hand -----------------------------------
  {
    const { ctx, page, errs } = await open(browser);

    // 8. the schedule is the wrong master two days out
    const c = await page.evaluate(() => {
      const K = window.__kaku, S = K.S();
      S.settings.lessons = ['0', '1'];
      const keys = K.LBYID['1'].keys.slice(0, 10);
      // answered, and genuinely not due again for days — which is exactly the state the
      // schedule puts you in the day after a good session, and the wrong one before an exam
      for (const k of keys) {
        K.SRS.update(k, 'r', 'perfect');
        for (const m of ['r', 'p']) if (S.progress[k] && S.progress[k][m]) {
          S.progress[k][m].due = Date.now() + 5 * 86400000;
        }
      }
      S.settings.cram = 'off';
      const spaced = K.plan(keys);
      S.settings.cram = 'on';
      const cram = K.plan(keys);
      return { spaced: spaced ? spaced.dueCount : 0, cram: cram ? cram.dueCount : 0,
               spacedQ: spaced ? spaced.queue.length : 0, cramQ: cram ? cram.queue.length : 0 };
    });
    ok(c.spaced === 0, 'the schedule says nothing is due for days, and means it');
    ok(c.cram === 10, 'cramming counts all ten as due anyway (' + c.cram + ')');
    ok(c.cramQ > 0 && c.spacedQ > 0, 'and either way a session still has something in it');

    // 6. sixty minutes, marked at the end
    await page.click('#examBtn');
    await page.waitForTimeout(200);
    const labels = await page.$$eval('#examStart button', (n) => n.map((x) => x.textContent));
    ok(labels.some((l) => /exam conditions/i.test(l)), 'the paper can be sat under exam conditions');
    await page.evaluate(() => window.__kaku.Exam.run(null, true));
    await page.waitForTimeout(1200);
    const strict = await page.evaluate(() => {
      const E = window.__kaku.Exam;
      const before = document.getElementById('examProg').textContent;
      E.answer(E.queue[0].a);
      return { before, msg: document.getElementById('examMsg').textContent, moved: E.i === 1 };
    });
    ok(/\d+:\d\d left/.test(strict.before), 'with a clock running: ' + strict.before);
    ok(strict.msg === '' && strict.moved, 'and nothing is revealed until the end');
    const out = await page.evaluate(async () => {
      const E = window.__kaku.Exam;
      E.endsAt = Date.now() - 1;
      await new Promise((r) => setTimeout(r, 1200));
      return document.getElementById('examProg').textContent;
    });
    ok(/Time\./.test(out) && /unanswered/.test(out), 'running out of time ends it and says what it cost');

    // 5. Part II is handwritten on the day
    const hw = await page.evaluate(async () => {
      const K = window.__kaku, W = K.KWrite;
      W.open(true);
      await new Promise((r) => setTimeout(r, 250));
      const words = W.queue.map((i) => K.KATAKANA[i][0]);
      const before = Object.keys(K.S().progress).filter((x) => x.startsWith('x:k')).length;
      W.c = W.chars.length; W.slipped = false;
      W.wordDone(); W.wordDone();
      return { words, n: W.queue.length,
               marked: Object.keys(K.S().progress).filter((x) => x.startsWith('x:k')).length - before,
               freed: W.drill === null && W.board.onStroke === null };
    });
    ok(hw.n === 6, 'it sets six words to write');
    ok(hw.words.every((w) => /^[゠-ヿーA-Z]+$/.test(w)), 'all of them katakana: ' + hw.words.join(' '));
    ok(hw.marked === 1, 'a word is marked once however the finish is reached');
    ok(hw.freed, 'and the board is let go of, so a stray stroke cannot reach a finished drill');

    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- the catch-up classes ---------------------------------------------------------
  // Drilling something you do not understand only makes you quicker at guessing, so these
  // come first: the idea, the shape, contrasting examples, the mistake, then a check.
  {
    const { ctx, page, errs } = await open(browser);
    const cl = await page.evaluate(() => {
      const C = window.__kaku.CLASSES;
      return { n: C.length,
               lessons: [...new Set(C.map((c) => c.lesson))].sort(),
               complete: C.every((c) => c.idea && c.body.length && c.ex.length && c.check.length),
               haveSlips: C.filter((c) => c.slips.length).length,
               particles: C.find((c) => c.id === 'particles') };
    });
    ok(cl.n >= 14, 'there is a class for every idea the course taught (' + cl.n + ')');
    ok(cl.lessons.join(',') === '0,1,2,3', 'across all four course lessons');
    ok(cl.complete, 'each one has an idea, an explanation, examples and a check');
    ok(cl.haveSlips === cl.n, 'and every one names the mistake people actually make');
    ok(cl.particles.body.length >= 4 && cl.particles.shape.length >= 7,
      'particles gets the fullest treatment, since that is the one that was asked for');
    ok(cl.particles.slips.some((x) => /で/.test(x[0]) && /に/.test(x[1])),
      'including で against に, which is the distinction that actually costs marks');

    await page.click('#classesBtn');
    await page.waitForTimeout(250);
    ok((await page.$$('.clrow')).length === cl.n, 'all of them are listed');
    await page.click('[data-cl="particles"]');
    await page.waitForTimeout(250);
    const read = await page.evaluate(() => ({
      title: document.getElementById('clTitle').textContent,
      paras: document.querySelectorAll('.cl-p').length,
      ex: document.querySelectorAll('.clex').length,
      slips: document.querySelectorAll('.slip').length,
      acts: [...document.querySelectorAll('#clActions button')].map((x) => x.textContent)
    }));
    ok(read.paras >= 4 && read.ex >= 5 && read.slips >= 4, 'the class reads as a class, not a cue card');
    ok(read.acts.some((a) => /Check I understood/.test(a)), 'and ends by offering to check');

    // the check has to gate the drill, or it is just another drill
    const checked = await page.evaluate(async () => {
      const C = window.__kaku.Class;
      C.check();
      await new Promise((r) => setTimeout(r, 60));
      const n = C.q.length;
      for (let i = 0; i < n; i++) {
        C.answer(C.a, C.q[C.i]);
        await new Promise((r) => setTimeout(r, 40));
        const b = document.querySelector('#clActions button[data-primary]');
        if (b) b.click();
        await new Promise((r) => setTimeout(r, 40));
      }
      return { n, acts: [...document.querySelectorAll('#clActions button')].map((x) => x.textContent),
               body: document.getElementById('clBody').textContent };
    });
    ok(checked.n >= 2, 'the check asks at least a couple of questions');
    ok(checked.acts.some((a) => /Drill it/.test(a)), 'getting them right opens the drill');
    ok(/landed/.test(checked.body), 'and says so plainly');

    const failed = await page.evaluate(async () => {
      const C = window.__kaku.Class;
      C.read('wa');
      await new Promise((r) => setTimeout(r, 60));
      C.check();
      await new Promise((r) => setTimeout(r, 60));
      for (let i = 0; i < C.q.length; i++) {
        C.answer((C.a + 1) % C.q[C.i].o.length, C.q[C.i]);
        await new Promise((r) => setTimeout(r, 40));
        const b = document.querySelector('#clActions button[data-primary]');
        if (b) b.click();
        await new Promise((r) => setTimeout(r, 40));
      }
      return { acts: [...document.querySelectorAll('#clActions button')].map((x) => x.textContent),
               body: document.getElementById('clBody').textContent };
    });
    ok(failed.acts.some((a) => /Read it again/.test(a)) && !failed.acts.some((a) => /Drill it/.test(a)),
      'getting them wrong sends you back to the explanation instead');
    ok(/assumes this/.test(failed.body), 'because the drill assumes the class landed');

    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  // ---- opening it for the first time ------------------------------------------------
  // Nine tiles and a progress panel reading zero is not a way in. Until there is something
  // to show, say what the thing is and offer a few honest starting points.
  {
    const { ctx, page, errs } = await open(browser);
    const cold = await page.evaluate(() => ({
      first: !document.getElementById('firstRun').hidden,
      startHidden: document.getElementById('startBtn').hidden,
      ways: [...document.querySelectorAll('#firstActions button')].map((x) => x.textContent),
      groups: [...document.querySelectorAll('.tgroup-h')].map((x) => x.firstChild.textContent)
    }));
    ok(cold.first, 'a first run opens on what the app is, not on the tiles');
    ok(cold.startHidden, 'and does not offer to resume something that has not started');
    ok(cold.ways.length === 3, 'with three ways in: ' + cold.ways.join(', '));
    ok(cold.groups.length === 3 && cold.groups.includes('Understand it') &&
       cold.groups.includes('Practise it') && cold.groups.includes('Try it for real'),
      'and the nine tiles are grouped by what they are for: ' + cold.groups.join(' / '));

    const warm = await page.evaluate(() => {
      window.__kaku.SRS.update('あ', 'w', 'perfect');
      window.__kaku.App.refresh();
      return { first: !document.getElementById('firstRun').hidden,
               start: !document.getElementById('startBtn').hidden };
    });
    ok(!warm.first && warm.start, 'once there is progress the ordinary home comes back');

    // the class videos are linked, not bundled
    await page.click('#classesBtn');
    await page.waitForTimeout(250);
    const vids = await page.$$eval('.vlink', (a) => a.map((x) => x.href));
    ok(vids.length === 3, 'the three vocabulary playlists the class set are linked');
    ok(vids.every((v) => /^https:\/\/www\.youtube\.com\/playlist\?list=/.test(v)),
      'as links out, so nothing of anyone else’s is copied in');
    ok(errs.length === 0, 'no errors' + (errs.length ? ' — ' + errs[0] : ''));
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
