// Keeps this computer's own certificate authority: made once, kept in the same
// folder as your progress, reused forever. The server certificate under it is
// cheap to remake, so it is reissued whenever this computer's address changes —
// the phone never has to be told again.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { makeCA, makeLeaf, mobileconfig } = require('./certs');

class CertStore {
  constructor(dir, label) {
    this.dir = dir;
    this.label = label || String(os.hostname() || 'this computer').split('.')[0];
    this.file = path.join(dir, 'wifi-ca.json');
    this.ca = this.loadCA();
    this.leaf = null;
  }

  loadCA() {
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (saved && saved.key && saved.cert && saved.der) {
        this.label = saved.label || this.label;
        return saved;
      }
    } catch (e) {}
    const ca = makeCA(this.label);
    ca.label = this.label;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(ca), { mode: 0o600 });
    } catch (e) {}      // an unwritable folder only costs a new authority next time
    return ca;
  }

  // key and certificate chain for an HTTPS server covering these names
  serverFor(names) {
    const want = names.join(',');
    if (!this.leaf || this.leaf.want !== want) {
      const leaf = makeLeaf(this.ca, names);
      this.leaf = { want, key: leaf.key, cert: leaf.cert + this.ca.cert };
    }
    return { key: this.leaf.key, cert: this.leaf.cert };
  }

  profile() { return mobileconfig(this.ca, this.label); }

  // forget everything, so a fresh authority is made next time
  reset() {
    this.leaf = null;
    try { fs.unlinkSync(this.file); } catch (e) {}
    this.ca = this.loadCA();
  }
}

module.exports = { CertStore };
