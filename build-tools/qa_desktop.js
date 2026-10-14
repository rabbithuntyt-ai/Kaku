// Simulates the Electron bridge in a browser: does the page load from the file,
// save back to it, and survive a restart?
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1100, height: 860 } });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.addInitScript(() => {
    // a fake "file on disk" that survives reloads within this context
    window.__disk = window.__disk || null;
    window.__saves = 0;
    window.kakuNative = {
      load: async () => JSON.parse(sessionStorage.getItem('disk') || 'null'),
      save: async (data) => { sessionStorage.setItem('disk', JSON.stringify(data)); window.__saves++; return true; },
      info: async () => ({ file: 'C:/Users/Troy/AppData/Roaming/Kaku/kaku-progress.json', size: 1234, saved: new Date().toISOString(), version: '1.0.0', platform: 'win32' }),
      exportFile: async () => ({ path: 'C:/Users/Troy/Documents/kaku-backup.json' }),
      importFile: async () => ({ data: JSON.parse(sessionStorage.getItem('disk') || 'null') }),
      chooseFolder: async () => 'C:/Users/Troy/OneDrive/Kaku',
      openWeb: async () => true,
      onMenu: () => {}
    };
  });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/kaku/desktop/app.html'); await p.waitForTimeout(600);
  console.log('storage note:', await p.textContent('#syncNote'));
  console.log('footer:', (await p.textContent('.foot')).replace(/\s+/g, ' ').slice(0, 60));
  // do some work
  await p.evaluate(() => {
    const K = window.__kaku, S = K.S(), now = Date.now();
    S.settings.lessons = ['2'];
    S.progress['あ'] = { w: { b: 3, due: now + 9e7, last: now, n: 3, ok: 3, lapses: 0 }, r: { b: 2, due: now + 9e7, last: now, n: 2, ok: 2, lapses: 0 } };
    K.Store.touch();
  });
  await p.waitForTimeout(900);
  console.log('saves written:', await p.evaluate(() => window.__saves), '| disk has:', await p.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('disk')).progress).length), 'items');
  // restart the app: clear the browser copy, reload, and see if progress comes back from the file
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(700);
  const after = await p.evaluate(() => { const S = window.__kaku.S(); return { box: S.progress['あ'] && S.progress['あ'].w.b, lessons: S.settings.lessons }; });
  console.log('after restart with an empty browser store:', JSON.stringify(after));
  // the settings panel offers the file buttons
  await p.click('#settings summary'); await p.waitForTimeout(200);
  console.log('sync buttons:', await p.$$eval('#syncActions button', bs => bs.map(x => x.textContent).join(' | ')));
  await p.click('#syncActions >> text=Copy this device');
  await p.waitForTimeout(300);
  const code = await p.inputValue('#syncBox');
  console.log('code produced:', code.slice(0, 12) + '…', code.length, 'chars');
  await p.locator('#settings').screenshot({ path: 'shots/D1-settings.png' });
  await p.screenshot({ path: 'shots/D2-desktop.png' });
  console.log('errors:', errs);
  await b.close();
})();
