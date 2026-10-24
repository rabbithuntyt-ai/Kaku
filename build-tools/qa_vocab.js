// The vocabulary screen and the reworked home screen: filters, search, and the
// chips that say what a session will cover.
const { chromium } = require('playwright');
const now = Date.now();
const rec = (b, n) => ({ b, due: now + 9e7, last: now - 9e5, n, ok: n, lapses: 0 });
const seeded = { v: 1, updatedAt: now - 1000,
  settings: { rows: ['a', 'k'], script: 'b', mix: 'both', prompt: 'sound', strict: 'normal', len: 15, fresh: 5,
              lessons: ['1', '2'], numbands: ['n:3'], skin: 'genki', mode: 'auto' },
  progress: {}, custom: { '1': [['バイト', 'バイト', 'part-time job']] } };
for (const c of 'あいうえおかきくけこ') seeded.progress[c] = { w: rec(4, 6), r: rec(5, 5) };
for (const w of ['わたし', 'がくせい', 'せんせい', 'これ', 'それ']) seeded.progress['v:' + w] = { r: rec(5, 6), p: rec(4, 5) };

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };
const rows = (p) => p.$$eval('#vList .wrow', rs => rs.map(r => r.textContent.replace(/\s+/g, ' ').trim()));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 950 } });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(s => {
    localStorage.setItem('kaku-hiragana-v1', s);
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis; ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = () => {};
  }, JSON.stringify(seeded));
  const errs = [], p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html');
  await p.waitForTimeout(400);

  // home: the chips say what is in the session, the tiles say what each section holds
  const chips = await p.$$eval('.mixchip', bs => bs.map(x => x.textContent.replace(/\s+/g, ' ')));
  ok(chips.length === 3 && /Both/.test(chips[0]), 'home: kana chip names the script (' + chips[0] + ')');
  ok(/L1, L2/.test(chips[1]), 'home: words chip names the lessons (' + chips[1] + ')');
  ok(/100 to 999/.test(chips[2]), 'home: numbers chip names the band');
  const tiles = await p.$$eval('.tile .t-main', bs => bs.map(x => x.textContent));
  ok(tiles[0].startsWith('Midterm mock'), 'home: the midterm comes first, because it has a date on it');
  ok(tiles.join(',').includes('Lessons,Vocabulary,Kanji,Numbers'), 'home: the study sections follow, in order');
  ok(tiles.some((t) => t.startsWith('Verbs')) && tiles.some((t) => t.startsWith('こそあど')),
     'home: and the two the midterm leans on have their own way in');
  ok(tiles[tiles.length - 1] === 'Talking practice', 'home: talking practice last');
  ok(/5 of \d+ words mastered/.test(await p.textContent('#vocabSub')), 'home: vocabulary tile counts what is mastered');
  await p.click('.mixchip:nth-child(2)');
  ok(await p.evaluate(() => document.body.dataset.screen) === 'lessons', 'home: the words chip opens the lessons');
  await p.click('#lsBack');

  // the vocabulary screen itself
  await p.click('#vocabBtn');
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'vocab', 'vocab: the tile opens the screen');
  const all = await p.textContent('#vCount');
  ok(/All \d{3} words · 5 mastered/.test(all), 'vocab: counts every word and the mastered ones (' + all + ')');
  ok((await rows(p)).length === 150, 'vocab: the first page is capped at 150 rows');
  await p.click('#vMore button');
  await p.waitForTimeout(200);
  ok((await rows(p)).length > 150, 'vocab: "show more" lengthens the list');

  await p.fill('#vSearch', 'gakko');
  await p.waitForTimeout(200);
  const r1 = await rows(p);
  ok(r1.length === 3 && r1[0].startsWith('がっこう'), 'vocab: romaji search finds がっこう and its compounds');
  await p.fill('#vSearch', 'teacher');
  await p.waitForTimeout(200);
  ok((await rows(p))[0].startsWith('せんせい'), 'vocab: English search works');
  await p.fill('#vSearch', 'ねこ');
  await p.waitForTimeout(200);
  ok((await rows(p))[0].startsWith('ねこ'), 'vocab: kana search works');
  await p.fill('#vSearch', 'zzzz');
  await p.waitForTimeout(200);
  ok((await rows(p)).length === 0 && /No words match/.test(await p.textContent('#vList')), 'vocab: a search with no hits says so');
  await p.click('#vClear');
  await p.waitForTimeout(200);
  ok(await p.inputValue('#vSearch') === '', 'vocab: clearing the search empties the box');

  await p.click('.lchip[data-l="mine"]');
  await p.waitForTimeout(200);
  const mine = await rows(p);
  ok(mine.length === 1 && mine[0].startsWith('バイト'), 'vocab: "Mine" shows only his own words');
  await p.click('.lchip[data-l="3"]');
  await p.waitForTimeout(200);
  ok(/Lesson 3/.test(await p.textContent('#vList')), 'vocab: a lesson chip narrows to that lesson');
  ok(/Add lesson 3 to rotation/.test(await p.textContent('#vActions')), 'vocab: and offers to add that lesson');
  await p.click('.lchip[data-l="all"]');

  await p.click('#vStatus button[data-v="solid"]');
  await p.waitForTimeout(200);
  ok(/^5 of/.test(await p.textContent('#vCount')), 'vocab: the mastered filter leaves the five known words');
  await p.click('#vStatus button[data-v="new"]');
  await p.waitForTimeout(200);
  ok(!(await rows(p)).some(r => /^(わたし|がくせい|せんせい)/.test(r)), 'vocab: the not-started filter drops the known words');
  await p.click('#vStatus button[data-v="all"]');
  await p.click('#vSort button[data-v="weak"]');
  await p.waitForTimeout(250);
  ok((await p.$$eval('#vList .tagL', t => t.length)) > 0, 'vocab: weakest-first labels each row with its lesson');

  await p.click('#vActions button[data-primary]');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.body.dataset.screen) === 'practice', 'vocab: practising starts a session');
  ok(/^v/.test(await p.evaluate(() => window.__kaku.Practice.card.kind)), 'vocab: and the session starts on a word');
  await p.click('#pClose');

  ok(errs.length === 0, 'no errors anywhere' + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
