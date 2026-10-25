const { chromium } = require('playwright');
const now = Date.now();
const rec = (b, due, n) => ({ b, due, last: now - 9e5, n, ok: n, lapses: 0 });
// a returning user: lesson 1 words already recognised, so production cards are due
const seeded = { v: 1, updatedAt: now - 1000,
  settings: { rows: ['a'], script: 'h', mix: 'both', prompt: 'sound', strict: 'normal', len: 15, fresh: 3, lessons: ['1'] },
  progress: {}, custom: {} };
for (const w of ['わたし', 'がくせい', 'せんせい', 'だいがく', 'ともだち', 'いしゃ'])
  seeded.progress['v:' + w] = { r: rec(2, now - 6e5, 2), p: rec(0, now - 6e5, 0) };
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
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/test.html'); await p.waitForTimeout(500);
  console.log('home:', await p.textContent('#startNote'), '| words chip:', await p.textContent('.mixchip:nth-child(2)'), '|', await p.textContent('#lessonsSub'));
  await p.screenshot({ path: 'shots/W0-home.png', fullPage: true });
  await p.click('#startBtn'); await p.waitForTimeout(600);
  let kinds = {}, shot = {};
  for (let i = 0; i < 40; i++) {
    const c = await p.evaluate(() => { const P = window.__kaku.Practice; return P.card ? { ch: P.card.ch, kind: P.card.kind } : null; });
    if (!c) break;
    kinds[c.kind] = (kinds[c.kind] || 0) + 1;
    if (c.kind === 'vwrite' && !shot.w) { await p.screenshot({ path: 'shots/W1-vwrite.png' }); shot.w = 1; }
    if (c.kind === 'vintro') { await p.click('#pActions >> text=Got it'); await p.waitForTimeout(100); }
    else if (c.kind === 'vread' || c.kind === 'vwrite') {
      await p.evaluate(() => {
        const P = window.__kaku.Practice, V = window.__kaku.VOCAB[P.card.ch];
        const ans = P.card.kind === 'vread' ? V.m : V.w;
        (P.opts.find(b => b.textContent === ans) || P.opts[0]).click();
      });
      await p.waitForTimeout(200);
      if (shot.w && !shot.a) { await p.screenshot({ path: 'shots/W2-vwrite-answered.png' }); shot.a = 1; }
    } else if (c.kind === 'intro') { await p.click('#pActions >> text=Trace it').catch(()=>{}); await p.waitForTimeout(100); await p.evaluate(() => window.__kaku.Practice.advance()); }
    else { await p.evaluate(() => window.__kaku.Practice.advance()); }
    const n = p.locator('#pActions >> text=Next');
    if (await n.count()) { await n.click(); await p.waitForTimeout(140); } else await p.waitForTimeout(800);
    if (await p.isVisible('#summary')) break;
  }
  console.log('kinds:', JSON.stringify(kinds));
  console.log('summary:', await p.textContent('#sLine'));
  await p.screenshot({ path: 'shots/W3-summary.png' });
  // the route through, which is what the home screen now leads with
  await p.click('#sHome'); await p.waitForTimeout(200);
  await p.click('#pathBtn'); await p.waitForTimeout(300);
  console.log('route:', await p.textContent('#pathCount'));
  console.log('steps:', await p.locator('.pstep').count(), '| here:', await p.locator('.pstep.here .ps-t').textContent());
  await p.screenshot({ path: 'shots/W4-path.png', fullPage: true });
  console.log('errors:', errs);
  await b.close();
})();
