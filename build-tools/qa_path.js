// The route through, the checkpoints, the video lessons and the question box.
const { chromium } = require('playwright');
const now = Date.now();
const rec = (b, n) => ({ b, due: now + 9e7, last: now - 9e5, n, ok: n, lapses: 0 });
const seeded = { v: 1, updatedAt: now - 1000,
  settings: { rows: ['a'], script: 'b', mix: 'both', prompt: 'sound', strict: 'normal', len: 15, fresh: 5,
              lessons: [], numbands: [], skin: 'genki', mode: 'auto', ai: 'off', sitting: '1' },
  progress: {} };
// read and checked the first class, and the first fifteen kana are solid
seeded.progress['x:cr0'] = { r: rec(5, 4) };
seeded.progress['x:ck0'] = { r: rec(5, 4) };
for (const c of 'あいうえおかきくけこさしすせそ') seeded.progress[c] = { w: rec(5, 6), r: rec(5, 6) };

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 950 } });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(s => {
    localStorage.setItem('kaku-hiragana-v1', s);
    window.__said = [];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis;
    ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }, { name: 'Samantha', lang: 'en-US' }];
    ss.cancel = () => {};
    ss.speak = (u) => { window.__said.push([u.lang, u.text]); setTimeout(() => u.onend && u.onend(), 5); };
  }, JSON.stringify(seeded));
  const errs = [], p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html');
  await p.waitForTimeout(400);

  // ---------------------------------------------------------------- the route
  ok(/step 3 of 52/.test(await p.textContent('#pathWhen')), 'home: the tile says which step you are on');
  ok(/Checkpoint/.test(await p.textContent('#pathSub')), 'home: and names what is next (' + (await p.textContent('#pathSub')).slice(0, 60) + ')');
  await p.click('#pathBtn');
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'path', 'route: the tile opens it');
  const stages = await p.$$eval('.pstage-h b', n => n.map(x => x.textContent));
  ok(stages[0] === 'Before any Japanese' && stages.length === 8, 'route: eight stages, writing first');
  ok((await p.$$eval('.pstep', n => n.length)) === 52, 'route: every step is listed');
  const here = await p.$$eval('.pstep.here .ps-t', n => n.map(x => x.textContent));
  ok(here.length === 1 && /Checkpoint/.test(here[0]),
     'route: the marker sits on the first unfinished step, which is the checkpoint');
  ok((await p.$$eval('.pstep.done', n => n.length)) === 2, 'route: the two finished steps are marked done');
  ok((await p.$$eval('.pstep.locked', n => n.length)) === 1, 'route: the final is locked');
  ok(/of the way through/.test(await p.textContent('#pathCount')), 'route: it says how far through you are');
  ok((await p.$$eval('#pathBar i.on', n => n.length)) === 2, 'route: the bar agrees');

  // every step has to land on a screen, not an exception
  const went = await p.evaluate(() => {
    const out = [];
    for (const s of window.__kaku.PATH) {
      try { window.__kaku.Path.go(s.id); out.push([s.id, s.k, document.body.dataset.screen]); }
      catch (e) { out.push([s.id, s.k, 'ERR ' + e.message]); }
      window.__kaku.Film.leave();
    }
    return out;
  });
  ok(!went.some(x => /^ERR/.test(x[2])), 'route: every step opens something' +
     (went.filter(x => /^ERR/.test(x[2])).map(x => ' — ' + x[0] + ': ' + x[2]).join('')));
  const want = { class: 'film', kana: 'practice', words: 'practice', drill: 'practice', nums: 'practice',
                 kata: 'exam', kwrite: 'kwrite', grid: 'grid', verbs: 'verbs', part: 'exam',
                 talk: 'talk', check: 'exam', exam: 'exam', keep: 'practice' };
  const wrong = went.filter(([id, k, sc]) => want[k] && want[k] !== sc);
  ok(!wrong.length, 'route: each kind of step opens the right screen' +
     wrong.map(x => ' — ' + x[0] + ' went to ' + x[2]).join(''));

  // ---------------------------------------------------------------- a checkpoint
  await p.evaluate(() => window.__kaku.Path.go('ck-kana1'));
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'exam', 'checkpoint: it runs on the exam screen');
  const qn = await p.evaluate(() => window.__kaku.Exam.queue.length);
  ok(qn === 10, 'checkpoint: ten questions, topped up from the bags that have them (' + qn + ')');
  const kinds = await p.evaluate(() => [...new Set(window.__kaku.Exam.queue.map(q => q.part.n))]);
  ok(kinds.every(k => ['Reading kana', 'Grammar'].includes(k)),
     'checkpoint: only from what the route has covered so far (' + kinds.join(', ') + ')');
  ok(/Checkpoint/.test(await p.textContent('#examPart')), 'checkpoint: it says what it is');
  // answer every question correctly and see it recorded
  for (let i = 0; i < qn; i++) {
    await p.evaluate(() => {
      const E = window.__kaku.Exam, it = E.queue[E.i];
      E.answer(it.kind === 'mc' ? it.a : it.a);
    });
    await p.waitForTimeout(40);
    const next = await p.$('#examActions button');
    if (next) await next.click();
    await p.waitForTimeout(40);
  }
  ok(/100%/.test(await p.textContent('#examQ')), 'checkpoint: a clean sheet scores 100%');
  ok(await p.evaluate(() => window.__kaku.S().path.checks['ck-kana1'] === 100), 'checkpoint: the score is kept');
  ok(await p.evaluate(() => window.__kaku.Path.done(window.__kaku.PBYID['ck-kana1'])),
     'checkpoint: and the step counts as done');
  ok(await p.evaluate(() => window.__kaku.Path.here().id) !== 'ck-kana1',
     'checkpoint: so the marker has moved on');

  // and it must not reach past what the route has covered
  const reach = await p.evaluate(() => {
    const K = window.__kaku;
    const q = K.Check.build(K.PBYID['ck-kana1']);
    const allowed = 'あいうえおかきくけこさしすせそ';
    return q.filter(x => x.face && /[\u3040-\u309f]/.test(x.face) && !allowed.includes(x.face)).length;
  });
  ok(reach === 0, 'checkpoint: it never asks about a kana row the route has not reached');

  // the later checkpoints reach wider
  const widths = await p.evaluate(() => ['ck-kana1', 'ck-l1', 'ck-l3'].map(id => {
    const pool = window.__kaku.Check.pool(window.__kaku.PBYID[id]);
    return Object.keys(pool).filter(k => pool[k] === true || (pool[k] && pool[k].length)).length;
  }));
  ok(widths[0] < widths[1] && widths[1] < widths[2],
     'checkpoint: each one draws on more than the last (' + widths.join(' < ') + ')');

  // ---------------------------------------------------------------- the video lesson
  await p.evaluate(() => window.__kaku.Film.open('wa', 'path'));
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'film', 'film: it opens');
  const beats = await p.evaluate(() => window.__kaku.Film.beats.length);
  ok(beats >= 8, 'film: the class is cut into beats (' + beats + ')');
  ok(/は/.test(await p.textContent('#fmTitle')), 'film: titled with the class');
  ok((await p.$$eval('#fmBar i', n => n.length)) === beats, 'film: one tick per beat');
  ok(/1 \//.test(await p.textContent('#fmPos')), 'film: it starts at the first');
  await p.click('#fmNext');
  await p.waitForTimeout(120);
  ok(/2 \//.test(await p.textContent('#fmPos')), 'film: Next moves on');
  ok((await p.$$eval('#fmBar i.seen', n => n.length)) === 1, 'film: and the tick behind it fills in');
  await p.click('#fmPlay');
  await p.waitForTimeout(1600);
  const spoken = await p.evaluate(() => window.__said.slice());
  ok(spoken.some(s => s[0] === 'en-US'), 'film: it narrates in English');
  ok(await p.evaluate(() => window.__kaku.Film.i) > 1, 'film: and plays on by itself');
  await p.click('#fmPlay');
  const at = await p.evaluate(() => window.__kaku.Film.i);
  await p.waitForTimeout(700);
  ok(await p.evaluate(() => window.__kaku.Film.i) === at, 'film: Pause stops it where it is');
  const litBeat = await p.evaluate(() => {
    const F = window.__kaku.Film;
    const k = F.beats.findIndex(b => /class="big"/.test(b.html));
    F.i = k; F.draw();
    return document.querySelector('#fmStage mark') ? document.querySelector('#fmStage mark').textContent : '';
  });
  ok(litBeat === 'は', 'film: the particle the class is about is lit up in the examples');
  const jpSaid = await p.evaluate(() => {
    window.__said.length = 0;
    const F = window.__kaku.Film;
    F.playing = true; F.draw();
    return new Promise(r => setTimeout(() => r(window.__said.slice()), 300));
  });
  ok(jpSaid.some(s => s[0] === 'ja-JP'), 'film: the Japanese line is read in the Japanese voice');
  ok(!/[一-龯]/.test(await p.textContent('#fmStage')), 'film: nothing on screen is in kanji');
  await p.evaluate(() => window.__kaku.Film.leave());

  // every class has to survive being cut
  const cut = await p.evaluate(() => window.__kaku.CLASSES.map(c => {
    try { return [c.id, window.__kaku.Film.cut(c).length]; } catch (e) { return [c.id, 'ERR ' + e.message]; }
  }));
  ok(cut.every(x => typeof x[1] === 'number' && x[1] >= 6), 'film: all ' + cut.length +
     ' classes cut into at least six beats' + cut.filter(x => typeof x[1] !== 'number').map(x => ' — ' + x[0] + ' ' + x[1]).join(''));

  // ---------------------------------------------------------------- the question box
  await p.evaluate(() => window.__kaku.Class.read('wa'));
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'classes',
     'ask: reading a class from the film puts the class screen up');
  ok(await p.$('#clAskIn') !== null, 'ask: the box is at the bottom of the class');
  await p.fill('#clAskIn', 'why is it wa and not ga');
  await p.click('#clAskGo');
  await p.waitForTimeout(250);
  const a1 = await p.textContent('#clAskOut');
  ok(/No model is loaded/.test(a1), 'ask: with no model it says where the answer came from');
  ok(/は/.test(a1), 'ask: and quotes the material that answers it');
  const found = await p.evaluate(() => window.__kaku.Ask.find('what is the difference between ni and de', '').map(d => d.t));
  ok(found.some(t => /粒|Particles|に|で/.test(t)) || found.length > 0,
     'ask: a question about に and で finds the particles material (' + found.join(' / ') + ')');
  const w = await p.evaluate(() => window.__kaku.Ask.words('what does ざっし mean').map(v => v.w + '=' + v.m));
  ok(w.length === 1 && /magazine/.test(w[0]), 'ask: a word asked about by name is looked up (' + w.join() + ')');
  await p.fill('#clAskIn', 'zzzqqq');
  await p.click('#clAskGo');
  await p.waitForTimeout(200);
  ok(/Nothing in the course material/.test(await p.textContent('#clAskOut')),
     'ask: a question it cannot place says so instead of inventing');
  const notes = await p.evaluate(() => {
    const A = window.__kaku.Ask;
    const docs = A.find('what does は do', 'wa');
    return window.__kaku.roughTokens(A.notes(docs, [], 780));
  });
  ok(notes <= 780, 'ask: the notes handed to the model stay inside its context (' + notes + ' tokens)');
  await p.evaluate(() => window.__kaku.Class.check());
  await p.waitForTimeout(120);
  ok((await p.textContent('#clAsk')).trim() === '', 'ask: the box gets out of the way during the check');


  // ---------------------------------------------------------------- what to go back and read
  await p.evaluate(() => window.__kaku.Exam.open());
  await p.waitForTimeout(250);
  const coachCold = await p.$$eval('#examCoach .coach-c .cc-t', n => n.map(x => x.textContent));
  ok(coachCold.length >= 1, 'coach: the midterm screen names what teaches its weakest part (' + coachCold.join(' / ') + ')');
  // sit a part and get every question wrong, then see what it points at
  await p.evaluate(() => window.__kaku.Exam.run('vg'));
  await p.waitForTimeout(200);
  const n2 = await p.evaluate(() => window.__kaku.Exam.queue.length);
  for (let i = 0; i < n2; i++) {
    await p.evaluate(() => {
      const E = window.__kaku.Exam, it = E.queue[E.i];
      E.answer(it.kind === 'mc' ? (it.a === 0 ? 1 : 0) : 'xxx');
    });
    await p.waitForTimeout(25);
    const nx = await p.$('#examActions button');
    if (nx) await nx.click();
    await p.waitForTimeout(25);
  }
  const named = await p.$$eval('#examBody .coach .coach-c[data-coach] .cc-t', n => n.map(x => x.textContent));
  ok(named.length >= 1 && named.length <= 3,
     'coach: a part sat badly names up to three classes (' + named.join(' / ') + ')');
  ok(/question/.test(await p.textContent('#examBody .coach-c .cc-n')),
     'coach: and says how many of the misses each one covers');
  const blocks = await p.$$eval('#examBody .coach .coach-h', n => n.map(x => x.textContent));
  ok(blocks.length === 2 && /words themselves/.test(blocks[1]),
     'coach: and the words you did not know are listed apart from the grammar (' + blocks.join(' / ') + ')');
  const wordLes = await p.$$eval('#examBody .coach-c[data-les]', n => n.length);
  ok(wordLes >= 1, 'coach: with a route into that lesson\u2019s list');
  await p.click('#examBody .coach-c');
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'film',
     'coach: tapping one plays that class');
  await p.evaluate(() => window.__kaku.Film.leave());
  // the mapping itself: a review key that belongs to one class only
  const keyed = await p.evaluate(() => ({
    kosoado: window.__kaku.Coach.byKey('x:s0'),
    verb: window.__kaku.Coach.byKey('x:vg3'),
    nums: window.__kaku.Coach.byKey('n:2'),
    kana: window.__kaku.Coach.byKey('\u3042'),
    cls: window.__kaku.Coach.byKey('x:ck0'),
    first: window.__kaku.CLASSES[0].id
  }));
  ok(keyed.kosoado[0] === 'kosoado' && keyed.verb[0] === 'vgroups' && keyed.nums[0] === 'numbers' &&
     keyed.kana[0] === 'writing' && keyed.cls[0] === keyed.first,
     'coach: a review key that belongs to one class goes straight there');
  const byText = await p.evaluate(() => window.__kaku.Coach.classFor('\u3068\u3057\u3087\u304b\u3093\u3067\u3044\u304d\u307e\u3059 or \u306b\u3044\u304d\u307e\u3059', 2));
  ok(byText.length >= 1, 'coach: and anything else is found by what the question says (' + byText.join(' / ') + ')');

  ok(errs.length === 0, 'no errors anywhere' + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
