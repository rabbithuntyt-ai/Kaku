import json, sys
sys.path.insert(0, '.')
from content_a import L as A
from content_b import L as B
from content_c import L as C
from content_drills import D as DRILLS
from verify import check

from content_course import COURSE, KATAKANA, VIDEO
from content_exam import GRAMMAR, BUILD, EXCHANGE, LISTEN, KOSOADO, VERBS, VERB_GROUPS
from content_class import C as CLASSES
from content_path import PATH, PATH_STAGES
from content_build import PARTS, JOBS, KINDS, EXQ, ORDER
from content_bank import MORE_GRAMMAR, MORE_BUILD, MORE_EXCHANGE
from content_scenes import SCENES
SCENE_BY_LESSON = {s['lesson']: {k: v for k, v in s.items() if k != 'lesson'} for s in SCENES}

lessons = A + B + C
# every N5 kanji should be assigned to exactly one lesson
kanji_all = ''.join(json.load(open('kanji.json', encoding='utf-8'))['k'].keys())
assigned = ''.join(l['kanji'] for l in lessons)
missing = [c for c in kanji_all if c not in assigned]
extra = [c for c in assigned if c not in kanji_all]
dupes = [c for c in set(assigned) if assigned.count(c) > 1]
print('kanji assigned:', len(assigned), '| missing:', ''.join(missing), '| not in set:', ''.join(extra), '| duplicated:', ''.join(dupes))

# What JAPA 100 itself covers is folded in here rather than replacing anything. A word the
# course teaches is marked wherever it already lives, and only added when no lesson has it —
# a word in two lessons collides in the app's index, so each keeps exactly one home. The mark
# is the course lesson it belongs to, so "this is on your midterm" and "this is a word Kaku
# knows" can be told apart without throwing the second kind away.
home = {}
for l in lessons:
    for row in l['vocab']:
        home.setdefault(row[0], l)

added = marked = 0
bad = 0
out = []
prepared = {}
for l in lessons:
    seen, v = set(), []
    for row in l['vocab']:
        if row[0] in seen:
            print('  dropped duplicate', row[0], 'in lesson', l['id'])
            continue
        seen.add(row[0])
        v.append(list(row[:3]))
    prepared[l['id']] = v

for cid, course in COURSE.items():
    for cw, cr, cm in course['words']:
        host = home.get(cw)
        if host is not None:
            for row in prepared[host['id']]:
                if row[0] == cw:
                    if len(row) < 4:
                        row.append(cid)
                        marked += 1
                    break
        else:
            prepared[cid].append([cw, cr, cm, cid])
            home[cw] = next(l for l in lessons if l['id'] == cid)
            added += 1

for l in lessons:
    v = prepared[l['id']]
    b, _ = check([r[:3] for r in v], 'L' + l['id'])
    bad += b
    drills = [dict(q=d['q'], ctx=d.get('ctx', ''), a=d['a'], w=d['w'], why=d['why']) for d in DRILLS.get(l['id'], [])]
    scene = SCENE_BY_LESSON.get(l['id'])
    out.append(dict(id=l['id'], title=l['title'], sub=l['sub'], kanji=l['kanji'], drills=drills,
                    grammar=[dict(t=g['t'], b=g['b'], e=g['e']) for g in l['grammar']],
                    vocab=v, **({'scene': scene} if scene else {})))
course_meta = {k: dict(name=c['name'], tb=c['tb'], n=len(c['words']),
                      **({'video': list(VIDEO[k])} if k in VIDEO else {})) for k, c in COURSE.items()}
# Parts IV and V are the two the student cannot get a single mark on, so they are the two that
# carry their working. Each sentence ships with the job each word is doing and the particle that
# marks it; each exchange ships with the kind of answer its question word demands. Both are
# checked here rather than trusted: a breakdown has to rebuild its own sentence, character for
# character, or the build fails.
# The rest of the bank. Part III grows by the items in content_bank; Part IV's new sentences
# are authored AS their breakdowns, so the sentence, the word list and the working are all
# generated from one source and cannot disagree with each other.
VBY = {v['v']: v for v in VERBS}
GRAMMAR = GRAMMAR + MORE_GRAMMAR


def assemble(en, neg, parts):
    text, words = '', []
    for chunk, par, job in parts:
        if job == 'verb':
            v = VBY[chunk]
            text += v['mn'] if neg else v['ms']
            words.append(chunk)
        else:
            text += chunk + par
            words.append(chunk)
    text += '。'
    # the words are given scrambled on the paper: object first, then the topic, then the verb
    rank = {'object': 0, 'topic': 1, 'verb': 2}
    given = [w for _, w in sorted(zip(parts, words), key=lambda z: rank.get(z[0][2], 3))]
    # へ is accepted for a destination, and the に on a named day or period may be dropped
    alts = set()
    if any(p[2] == 'dest' for p in parts):
        swap, done = '', False
        for chunk, par, job in parts:
            if job == 'verb':
                swap += VBY[chunk]['mn'] if neg else VBY[chunk]['ms']
            elif job == 'dest' and not done:
                swap += chunk + 'へ'; done = True
            else:
                swap += chunk + par
        alts.add(swap + '。')
    if any(p[2] == 'when' for p in parts):
        drop = ''
        for chunk, par, job in parts:
            if job == 'verb':
                drop += VBY[chunk]['mn'] if neg else VBY[chunk]['ms']
            else:
                drop += chunk + ('' if job == 'when' else par)
        alts.add(drop + '。')
    alts.discard(text)
    out = dict(w=given, en=en, a=text, parts=[list(x) for x in parts], neg=1 if neg else 0)
    if alts:
        out['alt'] = sorted(alts)
    return out


for en, neg, parts in MORE_BUILD:
    BUILD.append(assemble(en, neg, parts))
    PARTS[BUILD[-1]['a']] = parts
EXCHANGE = EXCHANGE + MORE_EXCHANGE
for item in MORE_EXCHANGE:
    EXQ[item['before']] = item['kind']
build_bad = []
for item in BUILD:
    parts = PARTS.get(item['a'])
    if not parts:
        build_bad.append('no breakdown for ' + item['a'])
        continue
    neg = item['a'].endswith('ません。')
    rebuilt = ''
    for chunk, par, job in parts:
        if job not in JOBS:
            build_bad.append('unknown job ' + job + ' in ' + item['a'])
            continue
        if job == 'verb':
            v = VBY.get(chunk)
            if not v:
                build_bad.append('unknown verb ' + chunk + ' in ' + item['a'])
                continue
            rebuilt += v['mn'] if neg else v['ms']
        else:
            rebuilt += chunk + par
    if rebuilt + '。' != item['a']:
        build_bad.append('breakdown does not rebuild: ' + item['a'] + ' -> ' + rebuilt + '。')
    item['parts'] = [list(x) for x in parts]
    item['neg'] = 1 if neg else 0
for item in EXCHANGE:
    kind = item.get('kind') or EXQ.get(item['before'])
    if not kind:
        build_bad.append('no question kind for ' + item['before'])
    elif kind not in KINDS:
        build_bad.append('unknown question kind ' + kind)
    item['kind'] = kind or ''
for p in build_bad:
    print('  BUILD PROBLEM:', p)
print('parts IV and V:', len(BUILD), 'sentences broken down |', len(EXCHANGE),
      'exchanges tagged |', len(set(EXQ.values())), 'question shapes in use')
assert not build_bad, f'{len(build_bad)} problem(s) in the Part IV/V breakdowns'

exam = dict(grammar=GRAMMAR, build=BUILD, exchange=EXCHANGE, listen=LISTEN,
            kosoado=dict(cols=[list(c) for c in KOSOADO['cols']],
                         rows=[list(r) for r in KOSOADO['rows']],
                         cues=[list(c) for c in KOSOADO['cues']],
                         lines=[list(l) for l in KOSOADO['lines']]),
            verbs=VERBS, verbgroups=[list(g) for g in VERB_GROUPS], classes=CLASSES,
            jobs={k: list(v) for k, v in JOBS.items()}, order=ORDER,
            kinds={k: [list(v[0])] + list(v[1:]) for k, v in KINDS.items()})
json.dump(dict(lessons=out, course=course_meta, katakana=[list(k) for k in KATAKANA], exam=exam,
               path=PATH, stages=PATH_STAGES),
          open('lessons.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('exam bank:', len(GRAMMAR), 'grammar |', len(BUILD), 'sentences |', len(EXCHANGE),
      'exchanges |', len(KOSOADO['cues']), 'kosoado cues')
print('course words marked:', marked, '| added from the course:', added,
      '| katakana for the exam:', len(KATAKANA))
print('drills:', sum(len(l['drills']) for l in out))
print('lessons:', len(out), '| words:', sum(len(l['vocab']) for l in out),
      '| grammar points:', sum(len(l['grammar']) for l in out), '| lookup failures:', bad)
print('spoken scenes:', sum(1 for l in out if l.get('scene')),
      '| turns:', sum(len(l['scene']['turns']) for l in out if l.get('scene')))

import verify_scenes
# The same promise for the midterm bank: every Japanese line it will ask you to write has to
# be made of words the course has actually taught, or the answer key is teaching you something
# the exam will mark wrong. Names and numbers are allowed on top, as the exam itself uses them.
EXAM_EXTRA = ['メアリー', 'ソラ', 'たけし', 'やました', 'アリゾナ', 'さくら', 'ロバート', 'リー', 'ワン',
              'アレックス', 'さん', 'せんせい', 'が', 'まる', 'おなまえ', 'ごしゅっしん', 'おしごと',
              'たなか', 'すずき', 'ゆい', 'ロバート', 'そら', 'めありい']
# Scope it by what the course teaches, not by Kaku's own lesson numbers: a course word keeps
# whichever lesson already held it, so としょかん and おかあさん sit well past lesson 3.
course_vocab = [row[:3] for l in out for row in l['vocab'] if len(row) > 3]
exam_forms = verify_scenes.forms_for([dict(id='0', vocab=course_vocab)], 0, EXAM_EXTRA)
exam_bad = []
for item in BUILD:
    for line in [item['a']] + list(item.get('alt', [])):
        left = verify_scenes.leftover(line, exam_forms)
        if left:
            exam_bad.append('BUILD ' + line + ' -> ' + left)
    for word in item['w']:
        if verify_scenes.leftover(word, exam_forms):
            exam_bad.append('BUILD word ' + word + ' (' + item['en'] + ')')
for item in EXCHANGE:
    for line in [item['before'], item['after'], item['a']] + list(item.get('alt', [])):
        left = verify_scenes.leftover(line, exam_forms)
        if left:
            exam_bad.append('EXCHANGE ' + line + ' -> ' + left)
for line, en in KOSOADO['lines']:
    left = verify_scenes.leftover(line, exam_forms)
    if left:
        exam_bad.append('KOSOADO ' + line + ' -> ' + left)
for cl in CLASSES:
    for jp, en, note in cl['ex']:
        if any('\u3040' <= c <= '\u30ff' for c in jp):
            left = verify_scenes.leftover(jp.split('\u2192')[0], exam_forms)
            if left:
                exam_bad.append('CLASS ' + cl['id'] + ' ' + jp + ' -> ' + left)
    for wrong, right, why in cl['slips']:
        if not any('\u3040' <= c <= '\u30ff' for c in right):
            continue          # a slip can be about method rather than a sentence
        left = verify_scenes.leftover(right.split('(')[0], exam_forms)
        if left:
            exam_bad.append('CLASS slip ' + cl['id'] + ' ' + right + ' -> ' + left)
    for q in cl['check']:
        if not (0 <= q['a'] < len(q['o'])):
            exam_bad.append('CLASS check answer out of range: ' + cl['id'])
for item in GRAMMAR:
    # only the right answer: the other options are wrong on purpose, and several are wrong
    # precisely by being a form Japanese does not have
    opt = item['o'][item['a']]
    if any('\u3040' <= c <= '\u30ff' for c in opt) and len(opt) > 2:
        left = verify_scenes.leftover(opt, exam_forms)
        if left:
            exam_bad.append('GRAMMAR answer ' + opt + ' (' + item['q'] + ') -> ' + left)
    if not (0 <= item['a'] < len(item['o'])):
        exam_bad.append('GRAMMAR answer index out of range: ' + item['q'])
    if len(set(item['o'])) != len(item['o']):
        exam_bad.append('GRAMMAR repeated option: ' + item['q'])
# the path is only pointers: every one of them has to land on something
cl_ids = {c['id'] for c in CLASSES}
les_ids = {l['id'] for l in out}
part_ids = {'listen', 'kata', 'vg', 'build', 'ex'}
track_ids = {'sent', 'exch'}
row_ids = set('a k s t n h m y r w g z d b p'.split())
band_ids = {'n:1', 'n:2', 'n:3', 'n:4', 'n:5'}
for st in PATH:
    r, k = st['ref'], st['k']
    if k == 'class' and r not in cl_ids: exam_bad.append('PATH ' + st['id'] + ' -> no class ' + str(r))
    if k in ('words', 'drill', 'talk') and r not in les_ids: exam_bad.append('PATH ' + st['id'] + ' -> no lesson ' + str(r))
    if k == 'part' and r not in part_ids: exam_bad.append('PATH ' + st['id'] + ' -> no exam part ' + str(r))
    if k == 'maker' and r not in track_ids: exam_bad.append('PATH ' + st['id'] + ' -> no track ' + str(r))
    if k == 'kana' and (not r or set(r) - row_ids): exam_bad.append('PATH ' + st['id'] + ' -> bad rows ' + str(r))
    if k == 'nums' and (not r or set(r) - band_ids): exam_bad.append('PATH ' + st['id'] + ' -> bad bands ' + str(r))
    for cid in st['covers'].get('cls', []):
        if cid not in cl_ids: exam_bad.append('PATH ' + st['id'] + ' covers missing class ' + cid)
    for lid in st['covers'].get('words', []):
        if lid not in les_ids: exam_bad.append('PATH ' + st['id'] + ' covers missing lesson ' + lid)
covered = {c for st in PATH for c in st['covers'].get('cls', [])}
for cid in sorted(cl_ids - covered):
    exam_bad.append('PATH misses class ' + cid)

for p in exam_bad:
    print('  EXAM PROBLEM:', p)
print('path:', len(PATH), 'steps in', len(PATH_STAGES), 'stages |',
      sum(1 for s in PATH if s['k'] == 'check'), 'checkpoints |',
      sum(s['mins'] for s in PATH), 'minutes end to end')
print('exam bank checked against the course:', len(exam_bad), 'problem(s)')
assert not exam_bad, f'{len(exam_bad)} exam line(s) use words the course has not taught'

# and the promise that matters: nothing in a scene that its lesson has not taught
problems = verify_scenes.check(out, SCENES) + verify_scenes.check_teaches(out, SCENES)
for p in problems:
    print('  SCENE PROBLEM:', p)
assert not problems, f'{len(problems)} scene line(s) use untaught words'
