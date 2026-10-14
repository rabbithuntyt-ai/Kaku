// Checks the certificates Kaku makes for itself: that they parse, that the chain
// verifies, that a real TLS connection to them succeeds, and that they carry what
// Apple insists on before an iPhone will trust them.
const { makeCA, makeLeaf, mobileconfig } = require('./certs');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const tls = require('tls');

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaku-certs-'));
const openssl = (...args) => execFileSync('openssl', args, { encoding: 'utf8' });

(async () => {
  const ca = makeCA('DESKTOP-TEST');
  ca.label = 'DESKTOP-TEST';
  const leaf = makeLeaf(ca, ['192.168.1.23', 'desktop-test.local', 'localhost', '127.0.0.1']);
  fs.writeFileSync(path.join(dir, 'ca.pem'), ca.cert);
  fs.writeFileSync(path.join(dir, 'leaf.pem'), leaf.cert);

  const caText = openssl('x509', '-in', path.join(dir, 'ca.pem'), '-noout', '-text');
  const leafText = openssl('x509', '-in', path.join(dir, 'leaf.pem'), '-noout', '-text');

  ok(/CA:TRUE/.test(caText), 'the authority says it is one');
  ok(/Certificate Sign/.test(caText) && /CRL Sign/.test(caText), 'the authority may sign certificates');
  ok(/ecdsa-with-SHA256/.test(caText), 'signed with SHA-256, which is the least Apple accepts');
  ok(/prime256v1/.test(caText), 'on a curve Apple accepts');

  ok(/CA:FALSE/.test(leafText), 'the server certificate is not an authority');
  ok(/TLS Web Server Authentication/.test(leafText), 'it is marked for serving websites, which Apple requires');
  ok(/IP Address:192\.168\.1\.23/.test(leafText), 'the computer’s address is in it');
  ok(/DNS:desktop-test\.local/.test(leafText), 'and so is its network name');
  ok(/IP Address:127\.0\.0\.1/.test(leafText), 'and localhost, for testing');
  ok(/X509v3 Subject Key Identifier/.test(leafText) && /X509v3 Authority Key Identifier/.test(leafText),
     'both key identifiers are present');

  // Apple refuses a server certificate that lasts longer than 825 days
  const notAfter = new Date(openssl('x509', '-in', path.join(dir, 'leaf.pem'), '-noout', '-enddate').split('=')[1]);
  const days = Math.round((notAfter - Date.now()) / 86400000);
  ok(days > 300 && days <= 825, `it lasts ${days} days, inside Apple’s limit`);

  let verified = '';
  try { verified = openssl('verify', '-CAfile', path.join(dir, 'ca.pem'), path.join(dir, 'leaf.pem')); }
  catch (e) { verified = String(e.stdout || '') + String(e.stderr || ''); }
  ok(/OK/.test(verified), 'the chain verifies: ' + verified.trim());

  // and the real test: a TLS connection that a client checks properly
  const server = https.createServer({ key: leaf.key, cert: leaf.cert + ca.cert }, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('hello');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const get = (host, servername) => new Promise((resolve, reject) => {
    const req = https.get({ host, port, path: '/', ca: ca.cert, servername,
                            checkServerIdentity: (h, c) => tls.checkServerIdentity(servername || h, c) },
      (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(b)); });
    req.on('error', reject);
  });

  try { ok(await get('127.0.0.1', 'localhost') === 'hello', 'a client that trusts the authority connects and checks the name'); }
  catch (e) { ok(false, 'TLS connection failed: ' + e.message); }

  // a client that does not know the authority must refuse: that is the whole point
  try {
    await new Promise((resolve, reject) => {
      https.get({ host: '127.0.0.1', port, path: '/' }, resolve).on('error', reject);
    });
    ok(false, 'a stranger should not be able to verify this certificate');
  } catch (e) { ok(/self.signed|unable to verify/i.test(e.message), 'a client that does not know the authority refuses it'); }

  // the wrong name must fail too
  try {
    await get('127.0.0.1', 'someone-else.local');
    ok(false, 'the wrong hostname should fail');
  } catch (e) { ok(/altnames|Hostname/i.test(e.message), 'a name that is not in the certificate is rejected'); }

  server.close();

  const profile = mobileconfig(ca, 'DESKTOP-TEST');
  ok(/com\.apple\.security\.root/.test(profile), 'the iPhone profile installs a root certificate');
  ok(profile.includes(ca.der.slice(0, 40)), 'and it carries this computer’s own authority');
  fs.writeFileSync(path.join(dir, 'p.mobileconfig'), profile);
  let plist = '';
  try { plist = execFileSync('python3', ['-c',
    'import plistlib,sys;d=plistlib.load(open(sys.argv[1],"rb"));print(d["PayloadContent"][0]["PayloadType"], len(d["PayloadContent"][0]["PayloadContent"]))',
    path.join(dir, 'p.mobileconfig')], { encoding: 'utf8' }); } catch (e) { plist = 'unreadable: ' + e.message; }
  ok(/com\.apple\.security\.root \d{3,}/.test(plist), 'the profile is a valid plist: ' + plist.trim());

  // a second computer gets a different authority, so one key is never shared
  const ca2 = makeCA('OTHER-PC');
  ok(ca2.der !== ca.der, 'every computer makes its own authority');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('\n' + pass + ' checks passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  process.exit(fail ? 1 : 0);
})();
