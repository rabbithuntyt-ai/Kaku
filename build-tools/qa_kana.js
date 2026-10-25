// make sure the kana writing path still works after the vocabulary changes
const { chromium } = require('playwright');
async function drawStroke(page, pts) {
  const box = await page.locator('#pBoard svg').boundingBox();
  const map = p => [box.x + (p[0] / 109) * box.width, box.y + (p[1] / 109) * box.height];
  const a = map(pts[0]);
  await page.mouse.move(a[0], a[1]); await page.mouse.down();
  for (let i = 2; i < pts.length; i += 2) { const q = map(pts[i]); await page.mouse.move(q[0], q[1]); }
  const z = map(pts[pts.length - 1]); await page.mouse.move(z[0], z[1]); await page.mouse.up();
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/fonts\./, r => r.abort());
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { const K = window.__kaku; K.S().settings.rows = ['a']; K.S().settings.script = 'h'; K.S().settings.lessons = ['1']; K.App.refresh(); });
  await p.evaluate(() => window.__kaku.Practice.start()); await p.waitForTimeout(700);
  let wrote = 0, words = 0;
  for (let i = 0; i < 30; i++) {
    const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? { kind: P.card.kind, phase: P.card.phase } : null; });
    if (!c) break;
    if (c.kind === 'intro' && c.phase === 'demo') { await p.click('#pActions >> text=Trace it'); await p.waitForTimeout(150); }
    else if (c.phase === 'trace' || c.phase === 'recall') {
      const strokes = await p.evaluate(() => window.__kaku.pBoard.strokes.map(s => s.pts));
      for (const s of strokes) { await drawStroke(p, s); await p.waitForTimeout(60); }
      await p.waitForTimeout(700); wrote++;
    } else if (c.kind[0] === 'v') {
      await p.evaluate(() => { const P = window.__kaku.Practice; if (P.card.kind === 'vintro') return; const V = window.__kaku.VOCAB[P.card.ch]; const a = P.card.kind === 'vread' ? V.m : V.w; (P.opts.find(x => x.textContent === a) || P.opts[0]).click(); });
      await p.waitForTimeout(250); words++;
      if (words === 1) await p.screenshot({ path: 'shots/K1-mixed.png' });
    }
    const n = p.locator('#pActions >> text=Next'), g = p.locator('#pActions >> text=Got it');
    if (await n.count()) { await n.click(); await p.waitForTimeout(140); }
    else if (await g.count()) { await g.click(); await p.waitForTimeout(140); }
    else await p.waitForTimeout(800);
    if (await p.isVisible('#summary')) break;
  }
  console.log('kana cards written:', wrote, '| word cards answered:', words);
  console.log('summary:', await p.textContent('#sLine'));
  await p.screenshot({ path: 'shots/K2-summary.png' });
  console.log('errors:', errs);
  await b.close();
})();
