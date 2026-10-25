const { chromium } = require('playwright');
const now = Date.now();
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(() => {
    const V = [{ name: 'Kyoko', lang: 'ja-JP' }];
    window.__spoken = [];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis;
    ss.getVoices = () => V; ss.cancel = () => {};
    ss.speak = (u) => { window.__spoken.push(u.text); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 5); };
  });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(500);

  // turn on Lesson 2 from the lessons page
  await p.click('#lessonsBtn'); await p.waitForTimeout(250);
  await p.screenshot({ path: 'shots/L1-lessons.png', fullPage: true });
  const rows = await p.$$('.lrow');
  await rows[2].$eval('.toggle', b => b.click()); await p.waitForTimeout(200);
  console.log('after toggle, settings.lessons =', await p.evaluate(() => window.__kaku.S().settings.lessons));
  // open lesson 2 detail
  await rows[2].$eval('.lrow-mid', b => b.click()); await p.waitForTimeout(300);
  console.log('lesson detail:', await p.textContent('#dEyebrow'), '|', await p.textContent('#dTitle'), '|', await p.textContent('#dSub'));
  console.log('grammar points:', await p.locator('.gp').count(), '| words:', await p.locator('.wrow').count(), '| kanji cells:', await p.locator('#dKanji .cell').count());
  await p.screenshot({ path: 'shots/L2-detail.png', fullPage: true });
  // practise just this lesson
  await p.click('#dActions >> text=Practise this lesson'); await p.waitForTimeout(600);
  const q = await p.evaluate(() => { const P = window.__kaku.Practice; return { card: P.card && [P.card.ch, P.card.kind], queue: P.queue.map(c => c.kind).join(','), total: P.total }; });
  console.log('session:', JSON.stringify(q));
  await p.screenshot({ path: 'shots/L3-vintro.png' });
  // walk the session
  let guard = 0, seen = {};
  while (guard++ < 40) {
    const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? { ch: P.card.ch, kind: P.card.kind } : null; });
    if (!c) break;
    seen[c.kind] = (seen[c.kind] || 0) + 1;
    if (c.kind === 'vintro') { await p.click('#pActions >> text=Got it'); await p.waitForTimeout(120); }
    else if (c.kind === 'vread' || c.kind === 'vwrite') {
      if (!seen.shot) { await p.screenshot({ path: 'shots/L4-' + c.kind + '.png' }); }
      await p.evaluate(() => {
        const P = window.__kaku.Practice, V = window.__kaku.VOCAB[P.card.ch];
        const ans = P.card.kind === 'vread' ? V.m : V.w;
        const right = P.opts.find(b => b.textContent === ans);
        (P.card.kind === 'vread' ? right : (P.opts.find(b => b.textContent !== ans) || right)).click();
      });
      await p.waitForTimeout(250);
      if (!seen.shot) { await p.screenshot({ path: 'shots/L5-answered.png' }); seen.shot = 1; }
    }
    const n = p.locator('#pActions >> text=Next');
    if (await n.count()) { await n.click(); await p.waitForTimeout(150); } else await p.waitForTimeout(900);
    if (await p.isVisible('#summary')) break;
  }
  console.log('card kinds seen:', JSON.stringify(seen));
  console.log('summary:', await p.textContent('#sLine'), '|', await p.textContent('#sNext'));
  await p.screenshot({ path: 'shots/L6-summary.png' });
  console.log('spoken sample:', (await p.evaluate(() => window.__spoken)).slice(0, 6).join(' '));
  console.log('errors:', errs);
  await b.close();
})();
