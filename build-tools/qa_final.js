const { chromium } = require('playwright');
const now = Date.now();
const rec = (b, due, n, ok) => ({ b, due, last: now - 9e5, n, ok: ok === undefined ? n : ok, lapses: 0 });
const seeded = { v: 1, updatedAt: now - 1000,
  settings: { rows: ['a','k'], script: 'b', mix: 'both', prompt: 'sound', strict: 'normal', len: 15, fresh: 5, lessons: ['1','2'], numbands: ['n:3'], skin: 'genki' },
  progress: {}, custom: {} };
for (const c of 'あいうえおかきくけこ') seeded.progress[c] = { w: rec(4, now + 9e7, 6, 5), r: rec(5, now + 9e7, 5, 5) };
for (const c of 'アイウエオ') seeded.progress[c] = { w: rec(1, now - 6e5, 2, 1), r: rec(2, now + 9e7, 2, 2) };
for (const w of ['わたし','がくせい','せんせい']) seeded.progress['v:' + w] = { r: rec(3, now + 9e7, 4, 4), p: rec(2, now + 9e7, 3, 2) };
seeded.progress['d:2:0'] = { r: rec(2, now + 9e7, 2, 2) };
seeded.progress['n:3'] = { r: rec(3, now + 9e7, 4, 3), p: rec(1, now - 6e5, 2, 1) };
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const [w, h, scheme] of [[390, 844, 'light'], [390, 844, 'dark'], [844, 390, 'light'], [1280, 800, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 2 });
    await ctx.route(/fonts\./, r => r.abort());
    await ctx.addInitScript(s => {
      localStorage.setItem('kaku-hiragana-v1', s);
      window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      const ss = window.speechSynthesis; ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
      ss.cancel = () => {}; ss.speak = () => {};
    }, JSON.stringify(seeded));
    const errs = []; const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(500);
    const tag = `${w}x${h}-${scheme}`;
    if (w === 390) {
      await p.click('#confidence summary'); await p.waitForTimeout(200);
      if (scheme === 'light') out.push('confidence: ' + await p.$$eval('.conf-row', rs => rs.map(r => r.textContent.replace(/\s+/g, ' ')).join(' | ')));
      await p.screenshot({ path: `shots/Z-${tag}-home.png`, fullPage: true });
      await p.click('#confidence summary');
    }
    // every screen
    for (const [name, go] of [['lessons', () => p.click('#lessonsBtn')], ['lesson', () => p.evaluate(() => window.__kaku.Lesson.open('2'))],
                              ['numbers', () => p.evaluate(() => window.__kaku.Numbers.open())], ['kanji', () => p.evaluate(() => { window.__kaku.App.home(); }).then(() => p.click('#kanjiBtn'))]]) {
      await go(); await p.waitForTimeout(220);
      if (scheme === 'dark' && name === 'lesson') await p.screenshot({ path: `shots/Z-${tag}-lesson.png`, fullPage: true });
    }
    // a full mixed session
    await p.evaluate(() => window.__kaku.App.home()); await p.waitForTimeout(100);
    await p.click('#startBtn'); await p.waitForTimeout(500);
    const kinds = {};
    for (let i = 0; i < 40; i++) {
      const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? { kind: P.card.kind, ch: P.card.ch, phase: P.card.phase } : null; });
      if (!c) break;
      kinds[c.kind] = (kinds[c.kind] || 0) + 1;
      const res = await p.evaluate(() => {
        const K = window.__kaku, P = K.Practice, c = P.card;
        if (c.kind === 'pattern') { P.opts.find(b => b.textContent === K.DRILL[c.ch].a).click(); return 'ok'; }
        if (c.kind === 'vread' || c.kind === 'vwrite') { const V = K.VOCAB[c.ch]; const a = c.kind === 'vread' ? V.m : V.w; (P.opts.find(b => b.textContent === a) || P.opts[0]).click(); return 'ok'; }
        if (c.kind === 'nread' || c.kind === 'nwrite') { const a = c.kind === 'nread' ? K.numberReading(c.n) : c.n.toLocaleString('en-US'); (P.opts.find(b => b.textContent === a) || P.opts[0]).click(); return 'ok'; }
        if (c.kind === 'read') { const a = K.ROMAJI[c.ch]; (P.opts.find(b => b.textContent === a) || P.opts[0]).click(); return 'ok'; }
        return 'manual';
      });
      if (res === 'manual') {
        const got = p.locator('#pActions >> text=Got it'), tr = p.locator('#pActions >> text=Trace it'), sm = p.locator('#pActions >> text=Show me');
        if (await got.count()) await got.click();
        else if (await tr.count()) { await tr.click(); await p.waitForTimeout(100); if (await sm.count()) await sm.click(); }
        else if (await sm.count()) await sm.click();
        else await p.evaluate(() => window.__kaku.Practice.advance());
        await p.waitForTimeout(200);
      } else await p.waitForTimeout(220);
      const n = p.locator('#pActions >> text=Next');
      if (await n.count()) { await n.click(); await p.waitForTimeout(130); } else await p.waitForTimeout(700);
      if (await p.isVisible('#summary')) break;
    }
    out.push(`${tag}: kinds ${JSON.stringify(kinds)} | summary "${await p.textContent('#sLine')}" | errors ${JSON.stringify(errs)}`);
    await ctx.close();
  }
  console.log(out.join('\n'));
  await b.close();
})();
