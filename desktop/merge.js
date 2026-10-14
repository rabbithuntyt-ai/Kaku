// The same merge the page uses, for the desktop end of Wi-Fi sync: item by item and
// skill by skill, keep whichever side shows more recent work. Nothing is discarded.
function mergeStates(base, other) {
  base = base || {}; other = other || {};
  const out = {
    v: 1,
    updatedAt: Math.max(+base.updatedAt || 0, +other.updatedAt || 0),
    settings: (+other.updatedAt || 0) > (+base.updatedAt || 0)
      ? { ...(other.settings || {}) } : { ...(base.settings || {}) },
    progress: {}, custom: {}
  };
  const bp = base.progress || {}, op = other.progress || {};
  for (const k of new Set(Object.keys(bp).concat(Object.keys(op)))) {
    const a = bp[k], b = op[k];
    if (!a || typeof a !== 'object') { out.progress[k] = b; continue; }
    if (!b || typeof b !== 'object') { out.progress[k] = a; continue; }
    const rec = {};
    for (const m of new Set(Object.keys(a).concat(Object.keys(b)))) {
      const ra = a[m], rb = b[m];
      if (!ra) { rec[m] = rb; continue; }
      if (!rb) { rec[m] = ra; continue; }
      const score = (r) => (+r.last || 0) * 10 + (+r.n || 0);
      rec[m] = score(rb) > score(ra) ? rb : ra;
    }
    out.progress[k] = rec;
  }
  const bc = base.custom || {}, oc = other.custom || {};
  for (const id of new Set(Object.keys(bc).concat(Object.keys(oc)))) {
    const rows = [], seen = new Set();
    for (const e of (bc[id] || []).concat(oc[id] || [])) {
      if (!Array.isArray(e) || seen.has(e[0])) continue;
      seen.add(e[0]); rows.push(e);
    }
    if (rows.length) out.custom[id] = rows;
  }
  return out;
}
module.exports = { mergeStates };
