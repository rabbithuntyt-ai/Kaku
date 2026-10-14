// Checks the save file survives the things that actually break save files.
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { Store } = require('./store');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaku-test-'));
const s = new Store(dir);
let pass = 0;
const ok = (name) => { console.log('  ok  ' + name); pass++; };

assert.strictEqual(s.load(), null); ok('first run returns nothing');

const data = { v: 1, updatedAt: Date.now(), settings: { len: 15 }, progress: { 'あ': { w: { b: 3, n: 4 } } }, custom: {} };
s.save(data);
assert.deepStrictEqual(s.load(), data); ok('saves and loads a round trip');

assert.strictEqual(fs.readdirSync(dir).filter(f => f.includes('.tmp-')).length, 0); ok('leaves no temp files behind');

const b = s.backupDaily(data);
assert.ok(b && fs.existsSync(b)); ok('writes a daily backup');
assert.strictEqual(s.backupDaily(data), null); ok('only one backup per day');

// a half-written file should fall back to the backup rather than losing everything
fs.writeFileSync(s.file, '{"v":1,"progre');
const recovered = s.load();
assert.deepStrictEqual(recovered, data); ok('recovers from a damaged save file');
assert.ok(fs.readdirSync(dir).some(f => f.includes('.broken-')) === false); ok('keeps the backup path quiet when recovery works');

// a bigger, realistic save
const big = { v: 1, updatedAt: Date.now(), settings: {}, progress: {}, custom: {} };
for (let i = 0; i < 1200; i++) big.progress['v:word' + i] = { r: { b: 3, due: Date.now(), last: Date.now(), n: 5, ok: 4, lapses: 1 }, p: { b: 1, due: 0, last: 0, n: 1, ok: 1, lapses: 0 } };
s.save(big);
assert.strictEqual(Object.keys(s.load().progress).length, 1200); ok('handles a full progress file');

assert.throws(() => s.save(null)); ok('refuses an empty save');

// moving the folder, as choosing a sync folder does
const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'kaku-test2-'));
s.setDir(dir2);
assert.strictEqual(s.load(), null);
s.save(data);
assert.deepStrictEqual(s.load(), data); ok('moves to another folder');

const info = s.info();
assert.ok(info.size > 0 && info.file.endsWith('kaku-progress.json')); ok('reports file details');

fs.rmSync(dir, { recursive: true, force: true });
fs.rmSync(dir2, { recursive: true, force: true });
console.log(`\n${pass} checks passed`);
