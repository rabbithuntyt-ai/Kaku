// Local storage for Kaku. Plain node so it can be tested on its own.
// Writes are atomic: a temp file is written and flushed, then renamed over the real one,
// so a crash or a power cut can never leave a half-written save behind.

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 8 * 1024 * 1024;   // a sane ceiling; real saves are a few hundred KB
const KEEP_BACKUPS = 10;

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.length > MAX_BYTES) throw new Error('save file is too large');
  return JSON.parse(raw);
}

class Store {
  constructor(dir, name = 'kaku-progress.json') {
    this.setDir(dir, name);
  }

  setDir(dir, name = this.name || 'kaku-progress.json') {
    this.dir = dir;
    this.name = name;
    this.file = path.join(dir, name);
    this.backupDir = path.join(dir, 'backups');
    fs.mkdirSync(this.dir, { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  // the saved state, or null on a first run. A damaged file falls back to the newest backup.
  load() {
    try {
      if (fs.existsSync(this.file)) return readJson(this.file);
    } catch (e) {
      const recovered = this.loadNewestBackup();
      if (recovered) return recovered;
      // keep the unreadable file rather than silently writing over it
      try { fs.renameSync(this.file, this.file + '.broken-' + Date.now()); } catch (e2) {}
    }
    return null;
  }

  loadNewestBackup() {
    try {
      const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json')).sort().reverse();
      for (const f of files) {
        try { return readJson(path.join(this.backupDir, f)); } catch (e) { /* try the next one */ }
      }
    } catch (e) {}
    return null;
  }

  save(data) {
    if (!data || typeof data !== 'object') throw new Error('nothing to save');
    const text = JSON.stringify(data);
    if (text.length > MAX_BYTES) throw new Error('save is too large');
    const tmp = this.file + '.tmp-' + process.pid;
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeFileSync(fd, text, 'utf8');
      fs.fsyncSync(fd);                       // on disk before the rename, not just in the OS cache
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, this.file);
    return this.file;
  }

  // one backup per day, so a bad merge or an accidental reset is always recoverable
  backupDaily(data) {
    const day = new Date().toISOString().slice(0, 10);
    const target = path.join(this.backupDir, `kaku-${day}.json`);
    if (fs.existsSync(target)) return null;
    fs.writeFileSync(target, JSON.stringify(data), 'utf8');
    this.trimBackups();
    return target;
  }

  trimBackups() {
    try {
      const files = fs.readdirSync(this.backupDir).filter(f => /^kaku-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
      while (files.length > KEEP_BACKUPS) {
        fs.unlinkSync(path.join(this.backupDir, files.shift()));
      }
    } catch (e) {}
  }

  info() {
    let size = 0, saved = null;
    try {
      const st = fs.statSync(this.file);
      size = st.size;
      saved = st.mtime.toISOString();
    } catch (e) {}
    return { file: this.file, dir: this.dir, size, saved };
  }
}

module.exports = { Store, MAX_BYTES };
