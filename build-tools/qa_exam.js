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
    ok(v.on === 193, 'the course vocabulary is ' + v.on + ' words');
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

  await browser.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
