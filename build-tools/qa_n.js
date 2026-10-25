const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(() => {
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis; ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = (u) => { (window.__spoken = window.__spoken || []).push(u.text); };
  });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(500);
  console.log('nav sub:', await p.textContent('#numbersSub'));
  await p.click('#numbersBtn'); await p.waitForTimeout(300);
  console.log('bands:', await p.locator('#nBands .lrow').count(), '| ref tables:', await p.locator('.ntable').count(), '| odd cells:', await p.locator('.ncell.odd').count());
  // the converter
  for (const v of ['8640', '300', '11000', '100000', '0', '999999']) {
    await p.fill('#nInput', v); await p.waitForTimeout(80);
    console.log('  ', v.padStart(6), '->', (await p.textContent('#nOut')).slice(0, 70).replace(/\s+/g, ' '));
  }
  await p.fill('#nInput', '86400'); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shots/N1-page.png', fullPage: true });
  // practise numbers
  await p.click('#nActions >> text=Practise numbers'); await p.waitForTimeout(600);
  const kinds = {};
  for (let i = 0; i < 30; i++) {
    const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? { kind: P.card.kind, n: P.card.n, ch: P.card.ch } : null; });
    if (!c) break;
    kinds[c.kind] = (kinds[c.kind] || 0) + 1;
    if (c.kind === 'nintro' && !kinds.s1) { await p.screenshot({ path: 'shots/N2-intro.png' }); kinds.s1 = 1; }
    if (c.kind === 'nread' && !kinds.s2) { await p.screenshot({ path: 'shots/N3-read.png' }); kinds.s2 = 1; }
    if (c.kind === 'nwrite' && !kinds.s3) {
      await p.screenshot({ path: 'shots/N4-listen.png' });
      await p.click('#pReveal'); await p.waitForTimeout(150);
      await p.screenshot({ path: 'shots/N5-revealed.png' }); kinds.s3 = 1;
    }
    if (c.kind === 'nintro') { await p.click('#pActions >> text=Got it'); await p.waitForTimeout(120); }
    else {
      const ok = await p.evaluate(() => {
        const K = window.__kaku, P = K.Practice, c = P.card;
        const ans = c.kind === 'nread' ? K.numberReading(c.n) : c.n.toLocaleString('en-US');
        const btn = P.opts.find(b => b.textContent === ans);
        if (!btn) return false;
        // answer the first one wrong on purpose to see the feedback
        (window.__wrong ? btn : (P.opts.find(b => b.textContent !== ans) || btn)).click();
        window.__wrong = 1;
        return true;
      });
      if (!ok) { console.log('  ANSWER MISSING from options for', JSON.stringify(c)); break; }
      await p.waitForTimeout(250);
      if (!kinds.s4) { await p.screenshot({ path: 'shots/N6-answered.png' }); kinds.s4 = 1; }
    }
    const n = p.locator('#pActions >> text=Next');
    if (await n.count()) { await n.click(); await p.waitForTimeout(140); } else await p.waitForTimeout(900);
    if (await p.isVisible('#summary')) break;
  }
  console.log('kinds:', JSON.stringify(kinds));
  console.log('summary:', await p.textContent('#sLine'), '|', await p.textContent('#sNext'));
  await p.screenshot({ path: 'shots/N7-summary.png' });
  console.log('spoken:', (await p.evaluate(() => window.__spoken || [])).slice(0, 5).join(' '));
  console.log('errors:', errs);
  await b.close();
})();
