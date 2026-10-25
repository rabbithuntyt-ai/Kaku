const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\./, r => r.abort());
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(400);
  // custom words on lesson 3
  await p.evaluate(() => window.__kaku.Lesson.open('3')); await p.waitForTimeout(300);
  const before = await p.locator('.wrow').count();
  await p.fill('#dCustom', 'ざっし, ざっし, magazine\nべんとう、べんとう、boxed lunch\n新しい = new\nこうぎ,こうぎ,lecture');
  await p.click('#dCustomActions >> text=Save my words'); await p.waitForTimeout(300);
  const after = await p.locator('.wrow').count();
  const saved = await p.evaluate(() => window.__kaku.S().custom);
  console.log('words before', before, 'after', after, '| saved:', JSON.stringify(saved).slice(0, 220));
  await p.screenshot({ path: 'shots/C1-custom.png', fullPage: true });
  // they persist and reach the practice pool
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => { const K = window.__kaku; K.S().settings.lessons = ['3']; K.App.refresh(); });
  const inPool = await p.evaluate(() => window.__kaku.lessonPool().filter(k => k.includes('こうぎ') || k.includes('新しい')));
  console.log('custom words in the practice pool after reload:', inPool);
  // clear them
  await p.evaluate(() => window.__kaku.Lesson.open('3')); await p.waitForTimeout(250);
  await p.click('#dCustomActions >> text=Clear'); await p.waitForTimeout(250);
  console.log('after clear:', await p.locator('.wrow').count(), '| custom:', JSON.stringify(await p.evaluate(() => window.__kaku.S().custom)));
  // empty selection guard
  await p.evaluate(() => { const K = window.__kaku; K.S().settings.rows = []; K.S().settings.lessons = []; K.App.refresh(); });
  await p.evaluate(() => window.__kaku.App.home()); await p.waitForTimeout(150);
  console.log('nothing selected:', await p.textContent('#startNote'), '| disabled:', await p.isDisabled('#startBtn'));
  console.log('errors:', errs);
  await b.close();
})();
