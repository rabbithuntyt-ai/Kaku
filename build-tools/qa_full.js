const { chromium } = require('playwright');
const now = Date.now();
// progress saved by the version he is using today (kana only, no lessons or custom words)
const oldSave = { v: 1, updatedAt: now - 5e6,
  settings: { rows: ['a','k'], script: 'b', mix: 'both', prompt: 'sound', strict: 'normal', len: 15, fresh: 5 },
  progress: { 'あ': { w: { b: 3, due: now - 1e6, last: now - 2e6, n: 4, ok: 3, lapses: 0 }, r: { b: 2, due: now + 9e7, last: now, n: 2, ok: 2, lapses: 0 } },
              'ア': { w: { b: 1, due: now - 1e6, last: now - 2e6, n: 1, ok: 1, lapses: 0 }, r: { b: 0, due: 0, last: 0, n: 0, ok: 0, lapses: 0 } } } };
(async () => {
  const b = await chromium.launch();
  const out = [];
  // ---- migration from the current published version
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/fonts\./, r => r.abort());
    await ctx.addInitScript(s => localStorage.setItem('kaku-hiragana-v1', s), JSON.stringify(oldSave));
    const errs = []; const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(500);
    const st = await p.evaluate(() => { const S = window.__kaku.S(); return { a: S.progress['あ'].w.b, rows: S.settings.rows, lessons: S.settings.lessons, custom: S.custom, keys: Object.keys(S.progress).length }; });
    out.push('migration: ' + JSON.stringify(st));
    out.push('  home note: ' + await p.textContent('#startNote'));
    await ctx.close();
  }
  // ---- every screen, three viewports, light and dark
  for (const [w, h, scheme] of [[390, 844, 'light'], [844, 390, 'light'], [1280, 800, 'light'], [390, 844, 'dark']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: scheme === 'dark' ? 2 : 1 });
    await ctx.route(/fonts\./, r => r.abort());
    const errs = []; const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(400);
    const tag = `${w}x${h}-${scheme}`;
    await p.evaluate(() => { const K = window.__kaku; K.S().settings.lessons = ['1','2']; K.App.refresh(); });
    for (const [name, fn] of [
      ['lessons', async () => { await p.click('#lessonsBtn'); }],
      ['lesson',  async () => { await p.evaluate(() => window.__kaku.Lesson.open('3')); }],
      ['path',    async () => { await p.evaluate(() => window.__kaku.Path.open()); }],
      ['kanji',   async () => { await p.evaluate(() => window.__kaku.App.home()); await p.click('#kanjiBtn'); }],
    ]) {
      await fn(); await p.waitForTimeout(250);
      if (scheme === 'dark' || w === 844) await p.screenshot({ path: `shots/F-${tag}-${name}.png`, fullPage: w !== 844 });
    }
    // a vocabulary card in this viewport
    await p.evaluate(() => window.__kaku.App.home()); await p.waitForTimeout(100);
    await p.evaluate(() => window.__kaku.Practice.start()); await p.waitForTimeout(500);
    for (let i = 0; i < 12; i++) {
      const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? P.card.kind : null; });
      if (!c) break;
      if (c[0] === 'v') { await p.screenshot({ path: `shots/F-${tag}-card.png` }); break; }
      await p.evaluate(() => window.__kaku.Practice.advance());
      await p.waitForTimeout(120);
    }
    out.push(`${tag}: errors ${JSON.stringify(errs)}`);
    await ctx.close();
  }
  console.log(out.join('\n'));
  await b.close();
})();
