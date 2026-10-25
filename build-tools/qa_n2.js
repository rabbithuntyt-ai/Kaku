const { chromium } = require('playwright');
const now = Date.now();
const rec = (b, due, n) => ({ b, due, last: now - 9e5, n, ok: n, lapses: 0 });
const seeded = { v: 1, updatedAt: now - 1000,
  settings: { rows: [], script: 'h', mix: 'both', prompt: 'sound', strict: 'normal', len: 10, fresh: 3, lessons: [], numbands: ['n:3','n:4','n:5'] },
  progress: { 'n:3': { r: rec(2, now - 6e5, 2), p: rec(0, now - 6e5, 0) },
              'n:4': { r: rec(1, now - 6e5, 1), p: rec(0, now - 6e5, 0) },
              'n:5': { r: rec(1, now - 6e5, 1), p: rec(1, now - 6e5, 1) } }, custom: {} };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript((s) => {
    localStorage.setItem('kaku-hiragana-v1', s);
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const ss = window.speechSynthesis; ss.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP' }];
    ss.cancel = () => {}; ss.speak = (u) => { (window.__spoken = window.__spoken || []).push(u.text); };
  }, JSON.stringify(seeded));
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(500);
  console.log('home:', await p.textContent('#startNote'), '| numbers chip:', await p.textContent('.mixchip:nth-child(3)'), '|', await p.textContent('#numbersSub'));
  await p.click('#startBtn'); await p.waitForTimeout(500);
  const kinds = {}; let shots = 0;
  for (let i = 0; i < 25; i++) {
    const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? { kind: P.card.kind, n: P.card.n, ch: P.card.ch } : null; });
    if (!c) break;
    kinds[c.kind] = (kinds[c.kind] || 0) + 1;
    if (c.kind === 'nwrite' && shots === 0) {
      await p.screenshot({ path: 'shots/N4-listen.png' });
      const faceText = await p.textContent('#pFace');
      await p.click('#pReveal'); await p.waitForTimeout(150);
      await p.screenshot({ path: 'shots/N5-revealed.png' });
      console.log('listen card: face before reveal =', JSON.stringify(faceText), '| after =', JSON.stringify(await p.textContent('#pFace')));
      shots = 1;
    }
    const ok = await p.evaluate(() => {
      const K = window.__kaku, P = K.Practice, c = P.card;
      if (c.kind === 'nintro') { return 'intro'; }
      const ans = c.kind === 'nread' ? K.numberReading(c.n) : c.n.toLocaleString('en-US');
      const btn = P.opts.find(b => b.textContent === ans);
      if (!btn) return false;
      btn.click(); return true;
    });
    if (ok === 'intro') { await p.click('#pActions >> text=Got it'); await p.waitForTimeout(120); }
    else if (!ok) { console.log('ANSWER MISSING for', JSON.stringify(c)); break; }
    else await p.waitForTimeout(220);
    if (shots === 1 && (c.kind === 'nwrite')) { await p.screenshot({ path: 'shots/N6-answered.png' }); shots = 2; }
    const n = p.locator('#pActions >> text=Next');
    if (await n.count()) { await n.click(); await p.waitForTimeout(130); } else await p.waitForTimeout(900);
    if (await p.isVisible('#summary')) break;
  }
  console.log('kinds:', JSON.stringify(kinds));
  console.log('summary:', await p.textContent('#sLine'));
  await p.screenshot({ path: 'shots/N7-summary.png' });
  // the options always contain the right answer, across 300 generated cards
  const check = await p.evaluate(() => {
    const K = window.__kaku; let bad = 0, samples = [];
    for (const band of K.NBANDS) for (let i = 0; i < 60; i++) {
      const n = K.randomNumber(band.id);
      for (const mode of ['r', 'p']) {
        const opts = K.numberOptions(n, band.id, mode);
        const ans = mode === 'r' ? K.numberReading(n) : n.toLocaleString('en-US');
        if (!opts.includes(ans) || opts.length !== 6 || new Set(opts).size !== 6) { bad++; if (samples.length < 3) samples.push([n, mode, opts]); }
      }
    }
    return { bad, samples };
  });
  console.log('option-set check over 600 cards:', JSON.stringify(check));
  console.log('errors:', errs);
  await b.close();
})();
