// A tiny certificate authority, so this computer can serve Kaku to your phone over
// HTTPS. That matters for one reason: a phone will only keep a web app working
// offline if the page came over HTTPS, and a home Wi-Fi address can never have a
// certificate from a public authority. So Kaku makes its own.
//
// The authority is created once, here, on this computer, and its private key never
// leaves it. The phone installs the public half once. Everything after that is
// automatic, including a new certificate whenever the computer's address changes.
//
// Written against the X.509 spec directly rather than pulling in a library, since
// this app ships as a folder with nothing to install.

const crypto = require('crypto');

// ---------------------------------------------------------------- DER
const len = (n) => {
  if (n < 0x80) return Buffer.from([n]);
  const b = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) b.unshift(v & 0xff);
  return Buffer.from([0x80 | b.length, ...b]);
};
const tlv = (tag, body) => Buffer.concat([Buffer.from([tag]), len(body.length), body]);
const SEQ = (...parts) => tlv(0x30, Buffer.concat(parts));
const SET = (...parts) => tlv(0x31, Buffer.concat(parts));
const BOOL = (v) => tlv(0x01, Buffer.from([v ? 0xff : 0x00]));
const OCTET = (b) => tlv(0x04, b);
const UTF8 = (s) => tlv(0x0c, Buffer.from(s, 'utf8'));
const IA5 = (s) => tlv(0x16, Buffer.from(s, 'ascii'));
const NULL = Buffer.from([0x05, 0x00]);
const ctx = (n, body, constructed) => tlv((constructed === false ? 0x80 : 0xa0) | n, body);

function INT(value) {
  let b = Buffer.isBuffer(value) ? value : Buffer.from([value]);
  let i = 0;
  while (i < b.length - 1 && b[i] === 0 && !(b[i + 1] & 0x80)) i++;   // no leading zeros
  b = b.subarray(i);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]);          // keep it positive
  return tlv(0x02, b);
}

function BITSTRING(b) {
  return tlv(0x03, Buffer.concat([Buffer.from([0]), b]));             // no unused bits
}

function OID(dotted) {
  const p = dotted.split('.').map(Number);
  const out = [p[0] * 40 + p[1]];
  for (const n of p.slice(2)) {
    const chunk = [];
    let v = n;
    do { chunk.unshift(v & 0x7f); v >>>= 7; } while (v > 0);
    for (let i = 0; i < chunk.length - 1; i++) chunk[i] |= 0x80;
    out.push(...chunk);
  }
  return tlv(0x06, Buffer.from(out));
}

// YYMMDDhhmmssZ — fine until 2049, which is long enough for a study app
function UTCTIME(d) {
  const p = (n) => String(n).padStart(2, '0');
  return tlv(0x17, Buffer.from(
    p(d.getUTCFullYear() % 100) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
    p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z', 'ascii'));
}

const O = {
  cn: '2.5.4.3', org: '2.5.4.10',
  ecPublicKey: '1.2.840.10045.2.1', p256: '1.2.840.10045.3.1.7', ecdsaSha256: '1.2.840.10045.4.3.2',
  basicConstraints: '2.5.29.19', keyUsage: '2.5.29.15', extKeyUsage: '2.5.29.37',
  subjectAltName: '2.5.29.17', subjectKeyId: '2.5.29.14', authorityKeyId: '2.5.29.35',
  serverAuth: '1.3.6.1.5.5.7.3.1'
};

const name = (cn, org) => SEQ(SET(SEQ(OID(O.org), UTF8(org))), SET(SEQ(OID(O.cn), UTF8(cn))));
const ext = (oid, critical, value) => SEQ(OID(oid), ...(critical ? [BOOL(true)] : []), OCTET(value));
const keyUsage = (bits) => {
  // bit 0 is digitalSignature, bit 5 keyCertSign, bit 6 cRLSign
  let byte = 0, highest = 0;
  for (const b of bits) { byte |= 0x80 >> b; highest = Math.max(highest, b); }
  return tlv(0x03, Buffer.from([7 - (highest % 8), byte]));
};

function spkiOf(publicKey) {
  return publicKey.export({ type: 'spki', format: 'der' });
}
// the key identifier everyone uses: SHA-1 over the public key bits
function keyIdOf(publicKey) {
  const spki = spkiOf(publicKey);
  const bitStringStart = spki.length - 65;      // P-256 point: 0x04 + 32 + 32
  return crypto.createHash('sha1').update(spki.subarray(bitStringStart)).digest();
}

function sanExt(names) {
  const parts = [];
  for (const n of names) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(n)) parts.push(tlv(0x87, Buffer.from(n.split('.').map(Number))));
    else parts.push(tlv(0x82, Buffer.from(n, 'ascii')));
  }
  return SEQ(...parts);
}

function sign(tbs, issuerKey) {
  const algo = SEQ(OID(O.ecdsaSha256));
  const sig = crypto.createSign('SHA256').update(tbs).sign(issuerKey);
  return SEQ(tbs, algo, BITSTRING(sig));
}

function certificate({ subject, issuer, publicKey, issuerKey, days, extensions }) {
  const now = new Date(Date.now() - 60 * 60 * 1000);                 // a little slack for clock drift
  const until = new Date(now.getTime() + days * 86400000);
  const tbs = SEQ(
    ctx(0, INT(2)),                                                  // v3
    INT(crypto.randomBytes(16)),
    SEQ(OID(O.ecdsaSha256)),
    issuer,
    SEQ(UTCTIME(now), UTCTIME(until)),
    subject,
    spkiOf(publicKey),
    ctx(3, SEQ(...extensions))
  );
  return sign(tbs, issuerKey);
}

const pem = (der, label) => {
  const b64 = der.toString('base64').replace(/(.{64})/g, '$1\n').replace(/\n$/, '');
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
};

const newKey = () => crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

// ---------------------------------------------------------------- the two certificates
function makeCA(label) {
  const { publicKey, privateKey } = newKey();
  const who = name('Kaku on ' + label, 'Kaku');
  const der = certificate({
    subject: who, issuer: who, publicKey, issuerKey: privateKey, days: 3650,
    extensions: [
      ext(O.basicConstraints, true, SEQ(BOOL(true))),
      ext(O.keyUsage, true, keyUsage([5, 6])),                       // sign certificates, sign CRLs
      ext(O.subjectKeyId, false, OCTET(keyIdOf(publicKey)))
    ]
  });
  return {
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    cert: pem(der, 'CERTIFICATE'),
    der: der.toString('base64'),
    keyId: keyIdOf(publicKey).toString('base64')
  };
}

// Apple's rules for a certificate it will trust: SHA-256, a key it accepts, the names
// in subjectAltName rather than the subject, serverAuth, and a short life.
function makeLeaf(ca, names) {
  const caKey = crypto.createPrivateKey(ca.key);
  const caPub = crypto.createPublicKey(caKey);
  const { publicKey, privateKey } = newKey();
  const der = certificate({
    subject: name(names[0], 'Kaku'),
    issuer: name('Kaku on ' + ca.label, 'Kaku'),
    publicKey, issuerKey: caKey, days: 365,
    extensions: [
      ext(O.basicConstraints, true, SEQ()),                          // not an authority
      ext(O.keyUsage, true, keyUsage([0])),                          // digitalSignature
      ext(O.extKeyUsage, false, SEQ(OID(O.serverAuth))),
      ext(O.subjectAltName, false, sanExt(names)),
      ext(O.subjectKeyId, false, OCTET(keyIdOf(publicKey))),
      ext(O.authorityKeyId, false, SEQ(ctx(0, keyIdOf(caPub), false)))
    ]
  });
  return {
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    cert: pem(der, 'CERTIFICATE'),
    names: names.slice()
  };
}

// What an iPhone installs: a configuration profile holding the public certificate.
// It still has to be switched on afterwards in Settings, which no file can do.
function mobileconfig(ca, label) {
  const uuid = () => crypto.randomUUID().toUpperCase();
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = ca.der.replace(/(.{60})/g, '$1\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadCertificateFileName</key><string>kaku-ca.cer</string>
      <key>PayloadContent</key><data>${body}</data>
      <key>PayloadDescription</key><string>Lets this iPhone trust Kaku running on ${esc(label)}.</string>
      <key>PayloadDisplayName</key><string>Kaku on ${esc(label)}</string>
      <key>PayloadIdentifier</key><string>ca.stokoe.kaku.ca</string>
      <key>PayloadType</key><string>com.apple.security.root</string>
      <key>PayloadUUID</key><string>${uuid()}</string>
      <key>PayloadVersion</key><integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key><string>So Kaku keeps working on this phone when ${esc(label)} is off.</string>
  <key>PayloadDisplayName</key><string>Kaku</string>
  <key>PayloadIdentifier</key><string>ca.stokoe.kaku.profile</string>
  <key>PayloadRemovalDisallowed</key><false/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${uuid()}</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>
`;
}

module.exports = { makeCA, makeLeaf, mobileconfig };
