const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis; ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = () => {};
  });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(500);
  console.log('skin attr:', await p.evaluate(() => document.documentElement.dataset.skin));
  await p.screenshot({ path: 'shots/G1-home.png', fullPage: true });
  // lesson 2 on, practise it
  await p.evaluate(() => { const K = window.__kaku; K.S().settings.lessons = ['2']; K.S().settings.rows = []; K.App.refresh(); });
  await p.evaluate(() => window.__kaku.Lesson.open('2')); await p.waitForTimeout(300);
  console.log('lesson sub:', await p.textContent('#dSub'));
  await p.screenshot({ path: 'shots/G2-lesson.png', fullPage: true });
  await p.click('#dActions >> text=Practise this lesson'); await p.waitForTimeout(500);
  let pat = 0, kinds = {};
  for (let i = 0; i < 24; i++) {
    const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? { kind: P.card.kind, ch: P.card.ch } : null; });
    if (!c) break;
    kinds[c.kind] = (kinds[c.kind] || 0) + 1;
    if (c.kind === 'pattern') {
      if (!pat) { await p.screenshot({ path: 'shots/G3-drill.png' }); }
      // answer wrong on the first, right afterwards
      await p.evaluate((wrong) => {
        const P = window.__kaku.Practice, d = window.__kaku.DRILL[P.card.ch];
        const btn = wrong ? P.opts.find(b => b.textContent !== d.a) : P.opts.find(b => b.textContent === d.a);
        btn.click();
      }, pat === 0);
      await p.waitForTimeout(250);
      if (!pat) {
        console.log('wrong-answer msg:', await p.textContent('#pMsg'));
        console.log('face text:', (await p.textContent('#pFace')).slice(0, 180).replace(/\s+/g, ' '));
        await p.screenshot({ path: 'shots/G4-drill-wrong.png' });
      }
      pat++;
    } else if (c.kind === 'vintro') { await p.click('#pActions >> text=Got it'); await p.waitForTimeout(100); }
    else {
      await p.evaluate(() => {
        const K = window.__kaku, P = K.Practice, V = K.VOCAB[P.card.ch];
        const ans = P.card.kind === 'vread' ? V.m : V.w;
        (P.opts.find(x => x.textContent !== ans) || P.opts[0]).click();   // wrong, to see the pointer
      });
      await p.waitForTimeout(220);
      if (!kinds.vp) { console.log('vocab pointer:', await p.textContent('.pointer-line').catch(() => 'none')); kinds.vp = 1; }
    }
    const n = p.locator('#pActions >> text=Next');
    if (await n.count()) { await n.click(); await p.waitForTimeout(130); } else await p.waitForTimeout(900);
    if (await p.isVisible('#summary')) break;
  }
  console.log('kinds:', JSON.stringify(kinds));
  await p.click('#sHome').catch(() => {}); await p.waitForTimeout(250);
  await p.click('#confidence summary'); await p.waitForTimeout(200);
  console.log('confidence rows:', await p.$$eval('.conf-row', rs => rs.map(r => r.textContent.replace(/\s+/g, ' ')).join(' | ')));
  await p.screenshot({ path: 'shots/G5-confidence.png', fullPage: true });
  console.log('errors:', errs);
  await b.close();
})();
