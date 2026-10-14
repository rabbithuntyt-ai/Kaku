"""Check vocabulary entries against JMdict: does the written form exist with that reading?"""
import sqlite3, sys, json
DB = '/home/claude/pkg/jdx/jamdict_data-1.5/jamdict_data/jamdict.db'
_con = sqlite3.connect(DB)

def load():
    kanji, kana, gloss = {}, {}, {}
    for idseq, text in _con.execute('select idseq, text from Kanji'):
        kanji.setdefault(text, set()).add(idseq)
    for idseq, text in _con.execute('select idseq, text from Kana'):
        kana.setdefault(text, set()).add(idseq)
    for idseq, text in _con.execute(
            'select s.idseq, g.text from Sense s join SenseGloss g on g.sid = s.ID'):
        gloss.setdefault(idseq, []).append(text)
    return kanji, kana, gloss

KANJI, KANA, GLOSS = load()

def lookup(written, reading):
    """Return (ok, glosses) for a word written `written` and read `reading`."""
    rset = KANA.get(reading, set())
    if written == reading:
        ids = rset
    else:
        ids = KANJI.get(written, set()) & rset
    if not ids:
        return False, []
    g = []
    for i in sorted(ids)[:40]:
        g += GLOSS.get(i, [])
    return True, g

def check(entries, label=''):
    """entries: list of [written, reading, meaning]. Prints anything suspicious."""
    bad, weak = [], []
    for w, r, m in entries:
        # する-verbs are listed in the dictionary under their noun stem
        lw, lr = (w[:-2], r[:-2]) if w.endswith('する') and len(w) > 2 else (w, r)
        ok, g = lookup(lw, lr)
        if not ok:
            # is the written form known at all, under another reading?
            alts = set()
            for i in KANJI.get(lw, set()):
                alts |= {t for t, ids in KANA.items() if i in ids}
            bad.append((w, r, m, sorted(alts)[:4]))
            continue
        mine = {t for t in m.lower().replace('/', ' ').replace(',', ' ').replace('(', ' ').replace(')', ' ').split() if len(t) > 2}
        theirs = ' '.join(g).lower()
        if mine and not any(t in theirs for t in mine):
            weak.append((w, r, m, g[:6]))
    if bad:
        print(f'[{label}] NOT FOUND ({len(bad)}):')
        for w, r, m, alts in bad:
            print(f'   {w} ({r}) "{m}"   known readings: {alts}')
    if weak:
        print(f'[{label}] gloss mismatch ({len(weak)}):')
        for w, r, m, g in weak:
            print(f'   {w} ({r}) mine="{m}"  jmdict={g}')
    if not bad and not weak:
        print(f'[{label}] all {len(entries)} entries check out')
    return len(bad), len(weak)
