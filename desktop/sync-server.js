// Wi-Fi sync. The desktop serves the app and a small sync endpoint on the local
// network; a phone on the same network opens it and the two merge automatically.
// No account, no cloud, nothing leaves the house.
//
// It serves the same thing twice: plain HTTP, which any phone can open straight
// away, and HTTPS, which is the only way a phone will keep the app working when
// this computer is off. The certificate for that comes from certs.js.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8'
};
// served by name, never from the folder listing above: the program's own files stay put
const JS = 'text/javascript; charset=utf-8';
const MANIFEST = 'application/manifest+json; charset=utf-8';
const MAX_BODY = 8 * 1024 * 1024;
// these hold nothing personal, and a browser asks for them on its own without a key
const OPEN = new Set(['/sw.js', '/manifest.webmanifest', '/offline', '/kaku.mobileconfig', '/kaku-ca.crt']);
// the only other program file ever served: the runtime the on-device model needs
const BY_NAME = { '/webllm.js': 'webllm.js' };

// the address a phone on the same Wi-Fi can reach
function lanAddress() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if (n.family !== 'IPv4' && n.family !== 4) continue;
      if (n.internal) continue;
      const ip = n.address;
      const score = /^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
      candidates.push({ ip, score, name });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates.length ? candidates[0].ip : null;
}

// every name this computer might be reached by, so the certificate covers them all
function lanNames() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if ((n.family === 'IPv4' || n.family === 4) && !n.internal) ips.push(n.address);
    }
  }
  const host = String(os.hostname() || 'computer').split('.')[0].toLowerCase();
  return [...new Set([...ips, host + '.local', host, 'localhost', '127.0.0.1'])];
}

class SyncServer {
  // read() returns the current state, write(merged) stores it, merge(a, b) combines two
  // states, certs (optional) is a CertStore and turns on the HTTPS half
  constructor({ appDir, read, write, merge, onChange, certs }) {
    this.appDir = appDir;
    this.read = read;
    this.write = write;
    this.merge = merge;
    this.onChange = onChange || (() => {});
    this.certs = certs || null;
    this.server = null;
    this.secure = null;
    this.token = null;
    this.port = 0;
    this.securePort = 0;
  }

  get running() { return !!this.server; }
  get offlineReady() { return !!this.secure; }

  host() { return this.localOnly ? '127.0.0.1' : (lanAddress() || 'localhost'); }
  address() { return this.running ? `http://${this.host()}:${this.port}/?k=${this.token}` : null; }
  secureAddress() { return this.secure ? `https://${this.host()}:${this.securePort}/?k=${this.token}` : null; }
  setupAddress() { return this.running ? `http://${this.host()}:${this.port}/offline?k=${this.token}` : null; }

  // The build stamp lets a phone running a page it cached earlier notice that the
  // computer now serves a newer one.
  stamp() {
    if (this._stamp) return this._stamp;
    try {
      const html = fs.readFileSync(path.join(this.appDir, 'app.html'));
      this._stamp = crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
    } catch (e) { this._stamp = 'unknown'; }
    return this._stamp;
  }

  // The token is kept between runs by whoever starts the server, so the address a
  // phone saved to its home screen still works tomorrow.
  start(port = 8777, token, securePort = 8778, localOnly) {
    if (this.server) return Promise.resolve(this.address());
    this.token = token || crypto.randomBytes(6).toString('hex');
    this._stamp = null;
    this.localOnly = !!localOnly;
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handle(req, res, false));
      this.server.on('error', (e) => { this.server = null; reject(e); });
      this.server.listen(port, localOnly ? '127.0.0.1' : '0.0.0.0', async () => {
        this.port = this.server.address().port;
        if (!localOnly) await this.startSecure(securePort);
        resolve(this.address());
      });
    });
  }

  // The HTTPS half is a bonus: if anything about it fails, plain Wi-Fi sync carries on.
  async startSecure(port) {
    if (!this.certs || this.secure) return null;
    try {
      const pair = this.certs.serverFor(lanNames());
      await new Promise((resolve, reject) => {
        const s = https.createServer({ key: pair.key, cert: pair.cert }, (req, res) => this.handle(req, res, true));
        s.on('error', (e) => { this.secure = null; reject(e); });
        s.listen(port, '0.0.0.0', () => { this.secure = s; this.securePort = s.address().port; resolve(); });
      });
      return this.secureAddress();
    } catch (e) {
      this.secure = null;
      this.secureError = e.message;
      return null;
    }
  }

  stop() {
    if (this.secure) { this.secure.close(); this.secure = null; this.securePort = 0; }
    if (!this.server) return;
    this.server.close();
    this.server = null;
    this.token = null;
  }

  ok(req) {
    const url = new URL(req.url, 'http://x');
    const given = url.searchParams.get('k') || req.headers['x-kaku-key'] || '';
    const a = Buffer.from(String(given));
    const b = Buffer.from(String(this.token));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  handle(req, res, secure) {
    const url = new URL(req.url, 'http://x');
    const send = (code, body, type, cache) => {
      const head = { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': cache || 'no-store' };
      if (!cache) head['X-Kaku-Build'] = this.stamp();
      res.writeHead(code, head);
      res.end(body);
    };
    // The page and the data need the key. Fonts, images and the setup page do not.
    const openFile = /\.(woff2|png)$/i.test(url.pathname) || OPEN.has(url.pathname);
    if (!openFile && !this.ok(req)) {
      return send(403, 'Wrong or missing key. Open the exact address Kaku shows on your computer.');
    }

    // the sync endpoint: GET returns what the computer has, POST merges what the phone sends
    if (url.pathname === '/sync') {
      if (req.method === 'GET') return send(200, JSON.stringify(this.read() || {}), TYPES['.json']);
      if (req.method === 'POST') {
        let body = '', tooBig = false;
        req.on('data', (c) => {
          body += c;
          if (body.length > MAX_BODY) { tooBig = true; req.destroy(); }
        });
        req.on('end', () => {
          if (tooBig) return send(413, 'too large');
          let incoming;
          try { incoming = JSON.parse(body); } catch (e) { return send(400, 'bad json'); }
          let merged;
          try {
            merged = this.merge(this.read() || {}, incoming);
            this.write(merged);
            this.onChange(merged);
          } catch (e) { return send(500, 'merge failed'); }
          send(200, JSON.stringify(merged), TYPES['.json']);
        });
        return;
      }
      return send(405, 'no');
    }

    // what the phone needs to trust this computer, and the page explaining how
    if (url.pathname === '/kaku.mobileconfig' || url.pathname === '/kaku-ca.crt') {
      if (!this.certs) return send(404, 'offline use is not set up on this computer');
      const asProfile = url.pathname.endsWith('.mobileconfig');
      return send(200, asProfile ? this.certs.profile() : this.certs.ca.cert,
        asProfile ? 'application/x-apple-aspen-config' : 'application/x-x509-ca-cert');
    }
    if (url.pathname === '/offline') return send(200, this.setupPage(secure), TYPES['.html']);
    if (url.pathname === '/manifest.webmanifest') {
      return send(200, JSON.stringify({
        name: 'Kaku', short_name: 'Kaku', start_url: '/?k=' + this.token, scope: '/',
        display: 'standalone', background_color: '#fdfaf6', theme_color: '#fdfaf6',
        icons: [{ src: '/build/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }]
      }), MANIFEST);
    }
    if (BY_NAME[url.pathname]) {
      let file;
      try { file = fs.readFileSync(path.join(this.appDir, BY_NAME[url.pathname])); }
      catch (e) { return send(404, 'not found'); }
      return send(200, file, JS, 'public, max-age=2592000');
    }
    if (url.pathname === '/sw.js') {
      let sw;
      try { sw = fs.readFileSync(path.join(this.appDir, 'sw.js'), 'utf8'); }
      catch (e) { return send(404, 'not found'); }
      return send(200, sw.replace('__BUILD__', this.stamp()), JS);
    }

    // otherwise serve the app itself, so the phone runs the same copy
    let rel = url.pathname === '/' ? 'app.html' : url.pathname.replace(/^\/+/, '');
    rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
    const file = path.join(this.appDir, rel);
    if (!file.startsWith(this.appDir)) return send(403, 'no');
    const ext = path.extname(file).toLowerCase();
    if (!TYPES[ext]) return send(404, 'not found');
    fs.readFile(file, (err, data) => {
      if (err) return send(404, 'not found');
      // A browser only allows the offline worker where it considers the page safe:
      // over HTTPS, or on this computer itself, which always counts.
      const atHome = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(req.headers.host || '');
      if (ext === '.html') data = Buffer.from(this.dress(data.toString('utf8'), secure || atHome), 'utf8');
      // The app and its fonts are allowed to sit in the phone's cache, so the home
      // screen icon still opens Kaku when this computer is off. Progress never is:
      // /sync is always fetched fresh.
      send(200, data, TYPES[ext], 'public, max-age=2592000');
    });
  }

  // What the served page gets that the file on disk does not: the key, the build
  // stamp, a home screen icon, and — over HTTPS only, because a phone allows it
  // nowhere else — the worker that keeps the app working with this computer off.
  dress(text, secure) {
    if (!text.includes('</head>')) throw new Error('app.html has no head to inject into');
    const lan = { key: this.token, build: this.stamp(), secure: !!secure, local: !!this.localOnly };
    let tag = `<link rel="apple-touch-icon" href="/build/icon.png">\n` +
      `<link rel="manifest" href="/manifest.webmanifest">\n` +
      `<script>window.KAKU_LAN=${JSON.stringify(lan)};</script>\n`;
    if (secure) {
      tag += `<script>
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      // keep a copy of the page exactly as it was served, key and all
      const w = reg.active || (await navigator.serviceWorker.ready).active;
      if (w) w.postMessage({ type: 'keep', url: location.href });
    }).catch(() => {});
  });
}
</script>\n`;
    }
    return text.replace('</head>', tag + '</head>');
  }

  setupPage(secure) {
    const https_ = this.secureAddress();
    const pc = String(os.hostname() || 'this computer').split('.')[0];
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const step = (n, title, body) => `<li><h2>${n}. ${title}</h2><p>${body}</p></li>`;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Kaku without the computer</title>
<style>
:root { color-scheme: light dark; --paper:#fdfaf6; --ink:#2b2f35; --muted:#7a7f85; --red:#d8422c; --line:#e2ddd5; --sheet:#fff; }
@media (prefers-color-scheme: dark) { :root { --paper:#241b19; --ink:#f2ece5; --muted:#a79e97; --line:#453c38; --sheet:#2d2320; } }
* { box-sizing: border-box; }
body { margin:0; padding:26px 20px 60px; background:var(--paper); color:var(--ink);
  font:16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; max-width:620px; margin:0 auto; }
h1 { font-size:26px; margin:0 0 6px; }
.lede { color:var(--muted); margin:0 0 22px; }
ol { list-style:none; padding:0; margin:0; counter-reset:n; }
li { border-top:1.5px solid var(--line); padding:16px 0; }
h2 { font-size:16px; margin:0 0 4px; }
p { margin:0; color:var(--muted); }
a.btn { display:block; margin:16px 0 4px; padding:15px 18px; border-radius:11px; background:var(--red);
  color:#fff; text-decoration:none; font-weight:700; text-align:center; }
a.plain { color:var(--red); }
code { background:var(--sheet); border:1px solid var(--line); border-radius:5px; padding:1px 5px; font-size:14px; word-break:break-all; }
.note { margin-top:26px; font-size:14px; color:var(--muted); }
</style></head>
<body>
<h1>Keep Kaku on your phone</h1>
<p class="lede">Four steps, once. After this the Kaku icon opens whether ${esc(pc)} is on, asleep or off, and the two
catch each other up whenever they are on the same Wi-Fi.</p>
<a class="btn" href="/kaku.mobileconfig">Install the certificate</a>
<ol>
${step(1, 'Tap the red button', 'Your phone says a profile was downloaded. That profile is one certificate, made by Kaku on ' + esc(pc) + ', and it never leaves your home network.')}
${step(2, 'Open Settings', 'At the top it now says <b>Profile Downloaded</b>. Tap that, then <b>Install</b>, top right. If it is not at the top: Settings, General, VPN &amp; Device Management.')}
${step(3, 'Turn the trust on', 'Settings, General, About, scroll to the bottom, <b>Certificate Trust Settings</b>, and switch on <b>Kaku on ' + esc(pc) + '</b>. iPhone asks once more; say yes.')}
${step(4, 'Open Kaku and keep it', https_
  ? 'Open <a class="plain" href="' + esc(https_) + '">this link</a>, then Share, <b>Add to Home Screen</b>. Delete the old Kaku icon if you have one — this new one is the one that works offline.'
  : 'HTTPS is not running on ' + esc(pc) + ' right now, so there is nothing to add yet. Turn Wi-Fi sync off and on again, then come back to this page.')}
</ol>
<p class="note">Why any of this: a phone will only keep a web app working offline if the page arrived over HTTPS, and
a home Wi-Fi address cannot get a certificate from a public authority, so Kaku makes its own and you tell the phone
once that it is fine.${https_ ? ' The address is <code>' + esc(https_.replace(/\\?k=.*/, '')) + '</code>.' : ''}</p>
<p class="note">Open Kaku at least every couple of weeks. iPhones clear the storage of pages they think you have
abandoned, and anything on the phone that has not reached ${esc(pc)} yet would go with it.</p>
</body></html>`;
  }
}

module.exports = { SyncServer, lanAddress, lanNames };
