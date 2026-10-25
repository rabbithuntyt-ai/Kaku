// Parts IV and V: the ladder, the climbing, the worked examples, and above all the marking —
// a wrong sentence has to come back with which chunk was wrong, not with the answer.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 950 } });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(() => {
    window.__said = [];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis;
    ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }, { name: 'Samantha', lang: 'en-US' }];
    ss.cancel = () => {};
    ss.speak = (u) => { window.__said.push([u.lang, u.text]); setTimeout(() => u.onend && u.onend(), 5); };
  });
  const errs = [], p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html');
  await p.waitForTimeout(400);

  // ---------------------------------------------------------------- the content behind it
  const data = await p.evaluate(() => ({
    sents: window.__kaku.SENTS.length, exchs: window.__kaku.EXCHS.length,
    everyPart: window.__kaku.SENTS.every(s => s.parts && s.parts.length >= 3),
    everyKind: window.__kaku.EXCHS.every(e => e.kind),
    rebuild: window.__kaku.SENTS.filter(s =>
      s.parts.map(x => window.__kaku.Maker.piece(s, x)).join('') + '。' !== s.a).map(s => s.a)
  }));
  ok(data.sents === 28 && data.exchs === 19, 'content: all 28 sentences and 19 exchanges carry their working');
  ok(data.everyPart && data.everyKind, 'content: every sentence has a breakdown, every exchange a question kind');
  ok(data.rebuild.length === 0, 'content: every breakdown rebuilds its own sentence exactly' +
     (data.rebuild.length ? ' — ' + data.rebuild[0] : ''));

  // ---------------------------------------------------------------- the screen and the ladder
  await p.click('#makerBtn');
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'maker', 'screen: the tile opens it');
  ok((await p.$$eval('.rung', n => n.length)) === 5, 'ladder: five rungs');
  ok((await p.$$eval('.rung.here', n => n.length)) === 1, 'ladder: one of them is where you are');
  ok(/Part IV/.test(await p.textContent('#mkEyebrow')), 'ladder: it opens on Part IV');
  await p.click('.mktab[data-tr="exch"]');
  await p.waitForTimeout(200);
  ok(/Part V/.test(await p.textContent('#mkEyebrow')), 'ladder: the other tab is Part V');
  await p.click('.mktab[data-tr="sent"]');
  await p.waitForTimeout(150);

  // ---------------------------------------------------------------- each rung asks its own thing
  const kinds = await p.evaluate(() => {
    const M = window.__kaku.Maker, out = {};
    for (const tr of ['sent', 'exch']) {
      out[tr] = [];
      for (let r = 0; r < 5; r++) {
        const q = M.make(tr, r);
        out[tr].push(q ? q.kind : 'none');
      }
    }
    return out;
  });
  ok(kinds.sent.join(',') === 'mc,mc,order,mc,type',
     'rungs: Part IV goes job, particle, order, verb, then the real thing (' + kinds.sent.join(',') + ')');
  ok(kinds.exch.join(',') === 'tap,mc,mc,type,type',
     'rungs: Part V goes spot it, name it, shape it, fill it, write it (' + kinds.exch.join(',') + ')');

  // a thousand questions, to be sure none of them is unanswerable
  const sane = await p.evaluate(() => {
    const M = window.__kaku.Maker, bad = [];
    for (const tr of ['sent', 'exch']) for (let r = 0; r < 5; r++) for (let i = 0; i < 100; i++) {
      let q;
      try { q = M.make(tr, r); } catch (e) { bad.push(tr + r + ' threw ' + e.message); break; }
      if (!q) { bad.push(tr + r + ' made nothing'); break; }
      if (q.kind === 'mc' || q.kind === 'tap') {
        const list = q.opts || q.bank;
        if (!(q.a >= 0 && q.a < list.length)) bad.push(tr + r + ' answer out of range');
        if (new Set(list).size !== list.length) bad.push(tr + r + ' repeated option: ' + list.join('/'));
        if (list.length < 2) bad.push(tr + r + ' only one option');
      } else if (!q.a) bad.push(tr + r + ' no answer');
      if (!q.why) bad.push(tr + r + ' no explanation');
    }
    return bad.slice(0, 5);
  });
  ok(sane.length === 0, 'rungs: a thousand generated questions are all answerable' +
     (sane.length ? ' — ' + sane[0] : ''));

  // ---------------------------------------------------------------- the marking
  const mark = await p.evaluate(() => {
    const M = window.__kaku.Maker, S = window.__kaku.SENTS;
    const by = (a) => S.find(x => x.a === a);
    const meat = by('わたしはにくをたべません。');
    const home = by('たけしさんはうちにかえります。');
    const study = by('わたしはたいていうちでにほんごをべんきょうします。');
    const morning = by('わたしはあさはやくおきます。');
    const r = (it, s) => M.checkSent(it, s);
    return {
      right:      r(meat, 'わたしはにくをたべません。'),
      noStop:     r(meat, 'わたしはにくをたべません'),
      particle:   r(meat, 'わたしはにくでたべません。'),
      polarity:   r(meat, 'わたしはにくをたべます。'),
      plain:      r(meat, 'わたしはにくをたべる。'),
      missing:    r(meat, 'にくをたべません。'),
      notLast:    r(meat, 'わたしはたべませんにくを。'),
      trap:       r(home, 'たけしさんはうちにかえます。'),
      destHe:     r(home, 'たけしさんはうちへかえります。'),
      freeOrder:  r(study, 'わたしはうちでたいていにほんごをべんきょうします。'),
      morningOk:  r(morning, 'わたしはあさはやくおきます。'),
      strayPar:   r(morning, 'わたしはあさにはやくおきます。'),
      twoWrong:   r(meat, 'わたしはにくでたべます。')
    };
  });
  ok(mark.right.ok && mark.noStop.ok, 'marking: the right answer passes, with or without the full stop');
  ok(!mark.particle.ok && /にく/.test(mark.particle.say) && /を/.test(mark.particle.say),
     'marking: a wrong particle names the word and the particle it wants — "' + mark.particle.say.slice(0, 80) + '"');
  ok(!mark.polarity.ok && /wrong way round/.test(mark.polarity.say),
     'marking: ます for ません is called out as the verb, not as a wrong sentence');
  ok(!mark.plain.ok && /dictionary form/.test(mark.plain.say),
     'marking: the dictionary form is named as such');
  ok(!mark.missing.ok && /わたし/.test(mark.missing.say),
     'marking: a missing chunk says which one and what job it was doing');
  ok(!mark.notLast.ok && /last/.test(mark.notLast.say),
     'marking: a verb in the middle is told to go to the end');
  ok(!mark.trap.ok && /う-verb|かえります/.test(mark.trap.say),
     'marking: かえます gets the う-verb trap explained — "' + mark.trap.say.slice(0, 70) + '"');
  ok(mark.destHe.ok, 'marking: へ is accepted for a destination, like the paper does');
  ok(mark.freeOrder.ok && /order/.test(mark.freeOrder.say),
     'marking: a different but correct order is marked right, and says the key prefers its own');
  ok(mark.morningOk.ok, 'marking: あさはやく is not mistaken for a stray particle');
  ok(!mark.strayPar.ok && /no particle/.test(mark.strayPar.say),
     'marking: but あさに is — あした and あさ take nothing');
  ok(!mark.twoWrong.ok && mark.twoWrong.all && mark.twoWrong.all.length === 2 &&
     /one other thing wrong too/.test(mark.twoWrong.say),
     'marking: two faults in one sentence are both found, and it says to fix one first');

  const markEx = await p.evaluate(() => {
    const M = window.__kaku.Maker, E = window.__kaku.EXCHS;
    const by = (q) => E.find(x => x.before === q);
    const yes = by('まいにち コーヒーを のみますか。');
    const whose = by('これは だれの ぼうしですか。');
    const price = by('この かばんは いくらですか。');
    const where = by('どこで べんきょうしますか。');
    return {
      right:  M.checkEx(yes, yes.a),
      noYes:  M.checkEx(yes, 'のみます。'),
      noNo:   M.checkEx(whose, 'ソラさんぼうしです。'),
      noYen:  M.checkEx(price, 'ごせんです。'),
      noVerb: M.checkEx(where, 'としょかんです。')
    };
  });
  ok(markEx.right.ok, 'marking: a right exchange passes');
  ok(!markEx.noYes.ok && /はい/.test(markEx.noYes.say),
     'marking: a yes-or-no answer without はい or いいえ is told so');
  ok(!markEx.noNo.ok && /の/.test(markEx.noNo.say),
     'marking: だれの answered without の gets the の explained');
  ok(!markEx.noYen.ok && /えん/.test(markEx.noYen.say),
     'marking: a price with no えん is named as a missing counter');
  ok(!markEx.noVerb.ok && /で/.test(markEx.noVerb.say),
     'marking: どこで answered with a bare place is told the verb comes too');

  // ---------------------------------------------------------------- climbing and dropping
  const climb = await p.evaluate(() => {
    const M = window.__kaku.Maker;
    M.run('sent', 0);
    const seen = [M.rung];
    for (let i = 0; i < 3; i++) { M.streak++; M.slips = 0; M.climb(); }
    const up = M.rung;
    M.streak = 0;
    for (let i = 0; i < 2; i++) { M.slips++; M.climb(); }
    return { start: seen[0], up, down: M.rung };
  });
  ok(climb.start === 0 && climb.up === 1, 'climbing: three in a row moves you up a rung');
  ok(climb.down === 0, 'climbing: two misses move you back down to where it is going wrong');

  // ---------------------------------------------------------------- a whole session
  await p.evaluate(() => window.__kaku.Maker.run('sent', 0));
  await p.waitForTimeout(200);
  ok(/Rung 1 of 5/.test(await p.textContent('#mkRung')), 'session: it says which rung you are on');
  let answered = 0;
  const LEN = await p.evaluate(() => window.__kaku.Maker.LEN);
  for (let i = 0; i < LEN; i++) {
    const state = await p.evaluate(() => {
      const M = window.__kaku.Maker;
      if (!M.cur || M.done) return null;
      const q = M.cur;
      if (q.kind === 'mc' || q.kind === 'tap') M.answer(q.a);
      else if (q.kind === 'order') { M.placed = q.pieces.slice(); M.answer(q.a); }
      else M.answer(q.a);
      return { n: M.n, ok: M.ok, rung: M.rung };
    });
    if (!state) break;
    answered++;
    const next = await p.$('#mkNext button');
    if (next) await next.click();
    await p.waitForTimeout(30);
  }
  ok(answered === LEN, 'session: all ' + LEN + ' questions answered (' + answered + ')');
  ok(await p.evaluate(() => window.__kaku.Maker.rung) === 4,
     'session: answering everything right climbs you to the real questions');
  ok(/%/.test(await p.textContent('#mkQ')), 'session: it ends on a score');
  ok(await p.evaluate(() => (window.__kaku.S().maker || {}).sent === 4),
     'session: and the rung you reached is remembered');
  ok((await p.$$eval('#mkBody .row', n => n.length)) > 0, 'session: with a line per rung');

  // the real questions are what the midterm reads, so they have to move it
  const moved = await p.evaluate(() => {
    const K = window.__kaku;
    return K.Exam.keys('build').filter(k => K.confidence(k) > 0).length;
  });
  ok(moved > 0, 'session: answering the real question moves Part IV readiness (' + moved + ' items)');

  // ---------------------------------------------------------------- the worked examples
  await p.evaluate(() => window.__kaku.Maker.worked('sent'));
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'film', 'worked: it plays in the film player');
  const beats = await p.evaluate(() => window.__kaku.Film.beats.length);
  ok(beats >= 5, 'worked: a sentence is built over several beats (' + beats + ')');
  ok(/worked through/.test(await p.textContent('#fmEyebrow')), 'worked: and says what it is');
  const built = await p.evaluate(() => {
    const F = window.__kaku.Film;
    F.i = F.beats.length - 1; F.draw();
    return document.querySelector('#fmStage .big').textContent;
  });
  ok(/。$/.test(built), 'worked: ending on the finished sentence (' + built + ')');
  await p.evaluate(() => window.__kaku.Maker.worked('exch'));
  await p.waitForTimeout(250);
  ok((await p.evaluate(() => window.__kaku.Film.beats.length)) >= 5, 'worked: exchanges too');
  ok(!/[一-龯]/.test(await p.textContent('#fmStage')), 'worked: nothing on screen is in kanji');
  await p.evaluate(() => window.__kaku.Film.leave());

  // ---------------------------------------------------------------- the way in
  await p.evaluate(() => window.__kaku.App.home());
  await p.waitForTimeout(200);
  ok(/Parts IV and V|Rung/.test(await p.textContent('#makerSub')),
     'home: the tile says what it is for (' + (await p.textContent('#makerSub')) + ')');
  const coached = await p.evaluate(() => {
    const K = window.__kaku;
    return K.Coach.PART_CLASS.build.length > 0 && K.Coach.PART_CLASS.ex.length > 0;
  });
  ok(coached, 'coach: Parts IV and V still name what explains them');

  ok(errs.length === 0, 'no errors anywhere' + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
