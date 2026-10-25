// The verb flashcards: both halves, the drawings, and the marking behind them.
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
    ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = (u) => { window.__said.push(u.text); };
  });
  const errs = [], p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html');
  await p.waitForTimeout(400);

  // every verb has a drawing of its own, and no two share one
  const art = await p.evaluate(() => {
    const K = window.__kaku, verbs = K.Verbs.all();
    const drawn = verbs.map(v => K.VERB_ART[v.v]);
    return { verbs: verbs.length, missing: verbs.filter(v => !K.VERB_ART[v.v]).map(v => v.v),
             distinct: new Set(drawn).size,
             svg: K.Cards.draw(verbs[0].v) };
  });
  ok(art.missing.length === 0, 'art: all ' + art.verbs + ' verbs have a drawing');
  ok(art.distinct === art.verbs, 'art: and no two verbs share one');
  ok(/viewBox="0 0 64 64"/.test(art.svg) && /stroke="currentColor"/.test(art.svg),
     'art: drawn as line art that follows the theme colour');

  // the way in
  await p.evaluate(() => window.__kaku.Verbs.open());
  await p.waitForTimeout(200);
  const first = await p.textContent('#verbsActions button');
  ok(/Flashcards/.test(first), 'way in: the verbs screen leads with the flashcards');
  await p.click('#verbsActions button');
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'cards', 'way in: which opens them');
  ok((await p.$$eval('.deck', n => n.length)) === 5, 'decks: five of them');
  const deckNames = await p.$$eval('.deck .dk-t', n => n.map(x => x.textContent));
  ok(/Picture/.test(deckNames[0]) && deckNames.some(x => /ます/.test(x)),
     'decks: picture on one side, and a deck for the group and the two forms (' + deckNames.join(' / ') + ')');

  // a picture card: drawing on the front, the Japanese behind it
  await p.evaluate(() => window.__kaku.Cards.run('pic'));
  await p.waitForTimeout(250);
  ok((await p.$$eval('#cdFront svg', n => n.length)) === 1, 'card: the front is the drawing and nothing else');
  ok((await p.textContent('#cdFront')).trim() === '', 'card: with no Japanese on it to give it away');
  const backHas = await p.evaluate(() => {
    const r = document.getElementById('cdRear');
    return { jp: !!r.querySelector('.cd-jp'), en: !!r.querySelector('.cd-en'),
             grp: !!r.querySelector('.cd-grp'), forms: (r.querySelector('.cd-forms') || {}).textContent || '' };
  });
  ok(backHas.jp && backHas.en && backHas.grp && backHas.forms.length > 3,
     'card: the back carries the verb, the meaning, the group and both forms (' + backHas.forms + ')');
  ok(!(await p.evaluate(() => document.getElementById('cdCard').classList.contains('turned'))),
     'card: it starts face down');
  await p.click('#cdCard');
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.getElementById('cdCard').classList.contains('turned')),
     'card: tapping it turns it over');
  const rateBtns = await p.$$eval('#cdNext button', n => n.map(x => x.textContent));
  ok(/Knew it/.test(rateBtns[0]) && rateBtns.some(x => /Not yet/.test(x)),
     'card: then you say whether you knew it (' + rateBtns.slice(0, 3).join(', ') + ')');

  // rating feeds the same records the rest of the app reads
  const before = await p.evaluate(() => {
    const K = window.__kaku, v = K.Cards.cur;
    return { v: v.v, c: K.confidence(K.Verbs.key(v.v, 'm')) };
  });
  await p.click('#cdNext button');
  await p.waitForTimeout(150);
  const after = await p.evaluate((name) => {
    const K = window.__kaku;
    return K.confidence(K.Verbs.key(name, 'm'));
  }, before.v);
  ok(after > before.c, 'card: "Knew it" moves that verb’s record (' + before.c.toFixed(2) + ' to ' + after.toFixed(2) + ')');
  ok(await p.evaluate(() => window.__kaku.Cards.i) === 1, 'card: and deals the next one');

  // the second half: group, ます and ません
  await p.evaluate(() => window.__kaku.Cards.run('conj'));
  await p.waitForTimeout(200);
  ok(/Which group/.test(await p.textContent('#cdFront')),
     'forms: the front asks for the group and both forms');
  await p.evaluate(() => window.__kaku.Cards.turn());
  await p.waitForTimeout(120);
  const conj = await p.evaluate(() => {
    const K = window.__kaku, v = K.Cards.cur, r = document.getElementById('cdRear');
    return { text: r.textContent, ms: v.ms, mn: v.mn, grp: v.g };
  });
  ok(conj.text.includes(conj.ms) && conj.text.includes(conj.mn),
     'forms: and the back gives both of them (' + conj.ms + ' / ' + conj.mn + ')');
  const bothKeys = await p.evaluate(() => {
    const K = window.__kaku, v = K.Cards.cur;
    K.Cards.rate('perfect');
    return { f: K.confidence(K.Verbs.key(v.v, 'f')), g: K.confidence(K.Verbs.key(v.v, 'g')) };
  });
  ok(bothKeys.f > 0 && bothKeys.g > 0,
     'forms: knowing the forms counts as knowing the group, so that card marks both');

  // the sorting deck is marked rather than self-rated
  await p.evaluate(() => window.__kaku.Cards.run('sort'));
  await p.waitForTimeout(200);
  const sortBtns = await p.$$eval('#cdNext button', n => n.map(x => x.textContent));
  ok(sortBtns.length === 4 && /verb|irregular/.test(sortBtns[0]),
     'sorting: three groups to choose from (' + sortBtns.join(', ') + ')');
  const graded = await p.evaluate(() => {
    const K = window.__kaku, v = K.Cards.cur;
    K.Cards.sorted(v, v.g === 'ru' ? 'u' : 'ru');          // deliberately wrong
    return { msg: document.getElementById('cdMsg').textContent, rear: document.getElementById('cdRear').textContent };
  });
  ok(/Not that one/.test(graded.msg), 'sorting: a wrong group is marked wrong at once');
  ok(graded.rear.length > 5, 'sorting: and the right answer plus the forms appear');

  // a verb that looks like one group and is another says so wherever it turns up
  const trap = await p.evaluate(() => {
    const K = window.__kaku;
    const v = K.Verbs.all().find(x => x.trap);
    K.Cards.deck = K.Cards.DECKS[0];
    const faces = K.Cards.faces(v);
    return { v: v.v, warned: /cd-note warn/.test(faces[1]) };
  });
  ok(trap.warned, 'traps: ' + trap.v + ' carries its warning on the picture deck too');

  // dealing the whole deck
  const run = await p.evaluate(() => {
    const K = window.__kaku;
    K.Cards.run('pic');
    const n = K.Cards.queue.length;
    for (let i = 0; i < n; i++) { K.Cards.turn(); K.Cards.rate('perfect'); }
    return { n, score: (document.querySelector('#cdRun .score-n') || {}).textContent };
  });
  ok(run.n === 13, 'deck: all thirteen verbs in a run');
  ok(run.score === '100%', 'deck: and it ends on a score');

  ok(errs.length === 0, 'no errors anywhere' + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
