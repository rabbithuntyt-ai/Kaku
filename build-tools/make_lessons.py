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
exam = dict(grammar=GRAMMAR, build=BUILD, exchange=EXCHANGE, listen=LISTEN,
            kosoado=dict(cols=[list(c) for c in KOSOADO['cols']],
                         rows=[list(r) for r in KOSOADO['rows']],
                         cues=[list(c) for c in KOSOADO['cues']],
                         lines=[list(l) for l in KOSOADO['lines']]),
            verbs=VERBS, verbgroups=[list(g) for g in VERB_GROUPS], classes=CLASSES)
json.dump(dict(lessons=out, course=course_meta, katakana=[list(k) for k in KATAKANA], exam=exam),
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
for p in exam_bad:
    print('  EXAM PROBLEM:', p)
print('exam bank checked against the course:', len(exam_bad), 'problem(s)')
assert not exam_bad, f'{len(exam_bad)} exam line(s) use words the course has not taught'

# and the promise that matters: nothing in a scene that its lesson has not taught
problems = verify_scenes.check(out, SCENES) + verify_scenes.check_teaches(out, SCENES)
for p in problems:
    print('  SCENE PROBLEM:', p)
assert not problems, f'{len(problems)} scene line(s) use untaught words'
