// Kaku desktop — main process.
// Owns the window, the menus and the save file. The page itself never touches the disk;
// it asks through the preload bridge, and every request is validated here.

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { Store } = require('./store');
const { SyncServer } = require('./sync-server');
const { CertStore } = require('./cert-store');
const { mergeStates } = require('./merge');

// A model compiles seventy-odd shaders onto the graphics card before it answers anything.
// Chromium keeps some of what that needs behind switches, and without them the compile
// does not fail — it stops partway and sits there, which looks exactly like a hung app.
// These have to be set before the app is ready, so they go here rather than in a function.
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-dawn-features', 'allow_unsafe_apis');
// and on a laptop, ask for the real graphics card rather than the power-saving chip
app.commandLine.appendSwitch('force_high_performance_gpu');


// If a folder called "data" sits next to the program, everything lives there and the
// whole app folder can be moved, copied or carried on a stick. Otherwise it uses the
// normal per-user location, which survives re-downloading the app.
function portableDir() {
  try {
    const exe = app.getPath('exe');
    // On a Mac the program lives inside Kaku.app/Contents/MacOS, and the bundle is signed:
    // writing into it would break the signature, so look beside the app instead.
    const base = process.platform === 'darwin'
      ? path.resolve(path.dirname(exe), '..', '..', '..')
      : path.dirname(exe);
    const dir = path.join(base, 'data');
    if (fs.statSync(dir).isDirectory()) return dir;
  } catch (e) {}
  return null;
}
const SETTINGS_FILE = () => path.join(portableDir() || app.getPath('userData'), 'settings.json');
const WEB_VERSION = 'https://claude.ai/artifact/WZgqiM8JjtvPH2YbfK2hZi';

let win = null;
let store = null;
let sync = null;

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8')); } catch (e) { return {}; }
}
function writeSettings(s) {
  try { fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(s), 'utf8'); } catch (e) {}
}

// Chromium can talk to the graphics card more than one way, and they are not equally capable
// on the same hardware. Intel's Vulkan driver reports half-precision maths where its Direct3D
// one often does not, and the two compile shaders with completely different compilers, so a
// shader that hangs on one can build on the other. Changing it means restarting, so the choice
// is remembered. This has to run before the app is ready, which it does — the file is read
// at load, not at window time.
const GPU_PATHS = { auto: '', vulkan: 'vulkan', d3d12: 'd3d12', opengl: 'opengles' };
const GPU_PATH = (() => { try { return readSettings().gpu || 'auto'; } catch (e) { return 'auto'; } })();
if (GPU_PATHS[GPU_PATH]) app.commandLine.appendSwitch('use-webgpu-adapter', GPU_PATHS[GPU_PATH]);

// where progress lives: the app folder by default, or any folder the user picks
// (a OneDrive or Dropbox folder makes two computers share one file)
function dataDir() {
  const s = readSettings();
  if (s.dataDir) {
    try { fs.mkdirSync(s.dataDir, { recursive: true }); return s.dataDir; } catch (e) {}
  }
  return portableDir() || app.getPath('userData');
}

const claudeMode = () => readSettings().mode === 'claude';

function createWindow() {
  const s = readSettings();
  const hosted = s.mode === 'claude';
  win = new BrowserWindow({
    width: (s.bounds && s.bounds.width) || 900,
    height: (s.bounds && s.bounds.height) || 900,
    x: s.bounds && s.bounds.x,
    y: s.bounds && s.bounds.y,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#241b19' : '#fdfaf6',
    title: 'Kaku',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      // The bridge to your files is attached only to the local copy. The hosted copy is
      // an ordinary web page and gets no way to touch this computer.
      preload: hosted ? undefined : path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  if (hosted) {
    win.loadURL(WEB_VERSION);
    win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
      if (!isMain || code === -3) return;
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'Could not reach Claude',
        message: 'The Claude copy did not load.',
        detail: 'You may be offline or signed out. You can keep working in this computer\u2019s own copy instead.',
        buttons: ['Use this computer\u2019s copy', 'Try again'],
        defaultId: 0
      }).then(r => (r.response === 0 ? setMode('local') : win.reload()));
    });
  } else if (readSettings().ai === 'brain') {
    // A model needs WebGPU and somewhere to keep a gigabyte of weights; a page opened
    // straight off the disk gets neither. Serving it from this computer, to this
    // computer only, gives the browser an origin it trusts.
    localPage().then((url) => {
      pageOrigin = url ? new URL(url).origin : '';
      if (url) win.loadURL(url); else win.loadFile(path.join(__dirname, 'app.html'));
    });
  } else {
    pageOrigin = '';
    win.loadFile(path.join(__dirname, 'app.html'));
  }
  // the window is called Kaku, whatever the page's own <title> says
  win.on('page-title-updated', (e) => e.preventDefault());

  const remember = () => {
    if (!win || win.isDestroyed() || win.isMinimized()) return;
    const st = readSettings();
    st.bounds = win.getNormalBounds();
    writeSettings(st);
  };
  win.on('resize', remember);
  win.on('move', remember);

  // outside links open in the real browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    // sign-in flows open their own window; everything else goes to the real browser
    if (hosted && /^https:\/\//.test(url)) return { action: 'allow' };
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (hosted && /^https:\/\//.test(url)) return;
    if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); }
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: claudeMode() ? [
        { label: 'In this mode your progress lives in your Claude account', enabled: false },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ] : [
        { label: 'Save a backup file…', click: () => win && win.webContents.send('menu', 'export') },
        { label: 'Load a backup file…', click: () => win && win.webContents.send('menu', 'import') },
        { type: 'separator' },
        { label: 'Choose where progress is saved…', click: chooseFolder },
        { label: 'Show the save folder', click: () => shell.openPath(store.dir) },
        { type: 'separator' },
        { label: sync && sync.running ? 'Wi-Fi sync is on — show the address or turn it off' : 'Sync with my phone over Wi-Fi…', click: toggleWifi },
        { label: 'Open Kaku when this computer starts', type: 'checkbox',
          checked: app.getLoginItemSettings().openAtLogin,
          click: (item) => { app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true, args: [] }); buildMenu(); } },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
                { type: 'separator' }, { role: 'togglefullscreen' }, { role: 'toggleDevTools' }]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Open the web version (for your phone)', click: () => shell.openExternal(WEB_VERSION) },
        claudeMode()
          ? { label: 'Go back to this computer\u2019s own copy', click: () => setMode('local') }
          : {
              label: 'Use my Claude account instead (one copy, shared with your phone)\u2026',
              click: async () => {
                const r = await dialog.showMessageBox(win, {
                  type: 'question',
                  title: 'Use your Claude account',
                  message: 'Open the Claude copy in this window?',
                  detail: [
                    'It is the same app, running from your Claude account, so this computer and',
                    'your phone share one copy that updates itself wherever you are.',
                    '',
                    'You sign in to Claude once. It needs an internet connection, and the progress',
                    'saved on this computer stays where it is \u2014 to bring it across, copy the sync',
                    'code from Practice settings first and paste it in afterwards.',
                    '',
                    'Help \u2192 Go back to this computer\u2019s own copy returns here at any time.'
                  ].join('\n'),
                  buttons: ['Open the Claude copy', 'Cancel'],
                  defaultId: 0, cancelId: 1
                });
                if (r.response === 0) setMode('claude');
              }
            },
        { type: 'separator' },
        {
          label: 'About Kaku',
          click: () => dialog.showMessageBox(win, {
            type: 'info',
            title: 'About Kaku',
            message: 'Kaku ' + app.getVersion(),
            detail: [
              'Made by Troy Stokoe.',
              '',
              'Progress is saved on this computer at:',
              store.file,
              '',
              'Stroke order data from KanjiVG by Ulrich Apel, CC BY-SA 3.0.',
              'Kanji readings and meanings from KANJIDIC, EDRDG, CC BY-SA 4.0.'
            ].join('\n')
          })
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setMode(mode) {
  const s = readSettings();
  s.mode = mode;
  writeSettings(s);
  if (sync) { sync.stop(); sync = null; }
  const old = win;
  createWindow();
  buildMenu();
  if (old && !old.isDestroyed()) old.close();
}

async function chooseFolder() {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose where Kaku saves your progress',
    message: 'Pick a folder. A folder that syncs (OneDrive, Dropbox, iCloud) lets two computers share one file.',
    properties: ['openDirectory', 'createDirectory']
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const dir = r.filePaths[0];
  const existing = store.load();
  const s = readSettings();
  s.dataDir = dir;
  writeSettings(s);
  store.setDir(dir);
  if (existing && !fs.existsSync(store.file)) store.save(existing);   // carry the current save across
  if (win) win.webContents.send('menu', 'reload-store');
  buildMenu();
  return dir;
}

app.whenReady().then(() => {
  store = new Store(dataDir());
  buildMenu();
  createWindow();
  restoreWifi();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (sync) sync.stop(); });

// ---- the bridge the page talks to -------------------------------------------------

// Only the page loaded from this folder may use the bridge.
// The page may be the file on disk, or this computer serving it to itself when a model
// is in use. Nothing else is ever allowed to reach the bridge.
let pageOrigin = '';
const guard = (fn) => (e, ...args) => {
  let url = '';
  try { url = (e.senderFrame && e.senderFrame.url) || ''; } catch (err) {}
  const mine = url.startsWith('file://') || (pageOrigin && url.startsWith(pageOrigin + '/'));
  if (!mine) throw new Error('not allowed');
  return fn(e, ...args);
};

// a second server, bound to this computer alone, purely to serve the window its own page
let localServer = null;
async function localPage() {
  try {
    if (!localServer) {
      const { SyncServer } = require('./sync-server');
      localServer = new SyncServer({
        appDir: __dirname,
        read: () => store.load(),
        write: (data) => store.save(data),
        merge: mergeStates
      });
      await localServer.start(0, wifiKey(), 0, true);
    }
    return localServer.address();
  } catch (e) {
    localServer = null;
    return null;
  }
}

ipcMain.handle('kaku:load', guard(() => {
  const data = store.load();
  if (data) { try { store.backupDaily(data); } catch (e) {} }
  return data;
}));

ipcMain.handle('kaku:save', guard((e, data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad save');
  store.save(data);
  return true;
}));

ipcMain.handle('kaku:info', guard(() => ({ ...store.info(), version: app.getVersion(), platform: process.platform })));

ipcMain.handle('kaku:export', guard(async (e, data) => {
  const stamp = new Date().toISOString().slice(0, 10);
  const r = await dialog.showSaveDialog(win, {
    title: 'Save a Kaku backup',
    defaultPath: path.join(app.getPath('documents'), `kaku-backup-${stamp}.json`),
    filters: [{ name: 'Kaku backup', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePath) return { path: null };
  fs.writeFileSync(r.filePath, JSON.stringify(data), 'utf8');
  return { path: r.filePath };
}));

ipcMain.handle('kaku:import', guard(async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Load a Kaku backup',
    filters: [{ name: 'Kaku backup', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (r.canceled || !r.filePaths[0]) return { data: null };
  const raw = fs.readFileSync(r.filePaths[0], 'utf8');
  return { data: JSON.parse(raw), path: r.filePaths[0] };
}));

ipcMain.handle('kaku:chooseFolder', guard(() => chooseFolder()));

// ---- Wi-Fi sync -------------------------------------------------------------------

function syncServer() {
  if (!sync) {
    sync = new SyncServer({
      appDir: __dirname,
      // its own certificate authority, made once and kept with your progress. Without
      // it a phone will not keep the app working while this computer is off.
      certs: new CertStore(store.dir, require('os').hostname().split('.')[0]),
      read: () => store.load(),
      write: (data) => store.save(data),
      merge: mergeStates,
      onChange: () => { if (win && !win.isDestroyed()) win.webContents.send('menu', 'reload-store'); }
    });
  }
  return sync;
}

// One key, kept between runs, so the address a phone saved to its home screen
// still works tomorrow instead of changing every time Kaku opens.
function wifiKey() {
  const s = readSettings();
  if (s.wifiKey && /^[0-9a-f]{12}$/.test(s.wifiKey)) return s.wifiKey;
  const key = require('crypto').randomBytes(6).toString('hex');
  writeSettings({ ...s, wifiKey: key });
  return key;
}

// if it was on when Kaku last closed, bring it back by itself on the next launch
async function restoreWifi() {
  if (!readSettings().wifi) return;
  try { await syncServer().start(8777, wifiKey()); buildMenu(); } catch (e) {}
}

async function toggleWifi() {
  const s = syncServer();
  if (s.running) {
    s.stop();
    writeSettings({ ...readSettings(), wifi: false });
    buildMenu();
    dialog.showMessageBox(win, {
      type: 'info', title: 'Wi-Fi sync', message: 'Wi-Fi sync is off.',
      detail: 'Your phone keeps everything it already has and carries on by itself. Turn this back on and the two catch up with each other.'
    });
    return;
  }
  try {
    const address = await s.start(8777, wifiKey());
    writeSettings({ ...readSettings(), wifi: true });
    buildMenu();
    await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Wi-Fi sync is on',
      message: 'On your phone, open this address:',
      detail: [
        address,
        '',
        'Same Wi-Fi as this computer. In Safari, Share → Add to Home Screen, and Kaku',
        'sits on your phone like any other app. This address does not change, so that',
        'icon keeps working from now on.',
        '',
        'With this computer on, the two keep each other up to date on their own, each side',
        'taking whatever the other did later. Nothing is overwritten.',
        '',
        ...(s.offlineReady ? [
          'To use Kaku on the phone while this computer is off, tap the line at the bottom',
          'of the phone\u2019s Kaku screen \u2014 "Make it work when the computer is off" \u2014 and',
          'follow the four steps. It takes a minute, once, and then the icon opens whether',
          'this computer is on or not.'
        ] : [
          'Offline use could not start on this computer, so the phone needs this one awake.'
        ]),
        '',
        'Wi-Fi sync comes back on by itself whenever Kaku opens. Windows may ask you to',
        'allow Kaku through the firewall the first time: say yes for private networks.',
        'It only works on your own network, and the key in the address keeps others out.'
      ].join('\n'),
      buttons: ['Copy the address', 'Copy the setup link', 'Done'],
      defaultId: 0
    }).then(r => {
      const { clipboard } = require('electron');
      if (r.response === 0) clipboard.writeText(address);
      if (r.response === 1) clipboard.writeText(s.setupAddress() || address);
    });
  } catch (e) {
    dialog.showMessageBox(win, { type: 'error', title: 'Wi-Fi sync', message: 'Could not start.', detail: String(e.message || e) });
  }
}
// the page asks to be served (for a model) or to go back to the plain file
ipcMain.handle('kaku:pageFor', guard(async (e, how) => {
  const want = how === 'brain';
  writeSettings({ ...readSettings(), ai: want ? 'brain' : 'off' });
  if (!win || win.isDestroyed()) return { ok: false };
  const onServer = !!pageOrigin;
  if (want && !onServer) {
    const url = await localPage();
    if (!url) return { ok: false, why: 'could not start the local page' };
    pageOrigin = new URL(url).origin;
    win.loadURL(url);
    return { ok: true, reloaded: true };
  }
  if (!want && onServer) {
    pageOrigin = '';
    win.loadFile(path.join(__dirname, 'app.html'));
    return { ok: true, reloaded: true };
  }
  return { ok: true, reloaded: false };
}));

// the page asks for a different route to the graphics card, which only a restart can change
ipcMain.handle('kaku:gpuPath', guard((e, which) => {
  if (!Object.prototype.hasOwnProperty.call(GPU_PATHS, which)) return { ok: false };
  if (which === GPU_PATH) return { ok: true, already: true, path: GPU_PATH };
  writeSettings({ ...readSettings(), gpu: which });
  app.relaunch();
  app.exit(0);
  return { ok: true };
}));
ipcMain.handle('kaku:gpuNow', guard(() => ({ path: GPU_PATH, paths: Object.keys(GPU_PATHS) })));

ipcMain.handle('kaku:openWeb', guard(() => { shell.openExternal(WEB_VERSION); return true; }));
