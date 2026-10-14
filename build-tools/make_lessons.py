import json, sys
sys.path.insert(0, '.')
from content_a import L as A
from content_b import L as B
from content_c import L as C
from content_drills import D as DRILLS
from verify import check

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

bad = 0
out = []
for l in lessons:
    seen, v = set(), []
    for w, r, m in l['vocab']:
        if w in seen:
            print('  dropped duplicate', w, 'in lesson', l['id'])
            continue
        seen.add(w)
        v.append([w, r, m])
    b, _ = check(v, 'L' + l['id'])
    bad += b
    drills = [dict(q=d['q'], ctx=d.get('ctx', ''), a=d['a'], w=d['w'], why=d['why']) for d in DRILLS.get(l['id'], [])]
    scene = SCENE_BY_LESSON.get(l['id'])
    out.append(dict(id=l['id'], title=l['title'], sub=l['sub'], kanji=l['kanji'], drills=drills,
                    grammar=[dict(t=g['t'], b=g['b'], e=g['e']) for g in l['grammar']],
                    vocab=v, **({'scene': scene} if scene else {})))
json.dump(dict(lessons=out), open('lessons.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('drills:', sum(len(l['drills']) for l in out))
print('lessons:', len(out), '| words:', sum(len(l['vocab']) for l in out),
      '| grammar points:', sum(len(l['grammar']) for l in out), '| lookup failures:', bad)
print('spoken scenes:', sum(1 for l in out if l.get('scene')),
      '| turns:', sum(len(l['scene']['turns']) for l in out if l.get('scene')))

# and the promise that matters: nothing in a scene that its lesson has not taught
import verify_scenes
problems = verify_scenes.check(out, SCENES) + verify_scenes.check_teaches(out, SCENES)
for p in problems:
    print('  SCENE PROBLEM:', p)
assert not problems, f'{len(problems)} scene line(s) use untaught words'
