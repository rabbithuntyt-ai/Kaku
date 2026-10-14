import json, re, sys
out = sys.argv[1] if len(sys.argv) > 1 else 'test.html'
html = open('template.html', encoding='utf-8').read()
for var, fn in [('KVG','kvg.json'), ('ROMAJI','romaji.json'), ('LOOK','lookalike.json'),
                ('KANJI','kanji.json'), ('LESSONS','lessons.json')]:
    try:
        data = json.load(open(fn, encoding='utf-8'))
    except FileNotFoundError:
        continue
    html = html.replace('/*__%s__*/null' % var,
                        json.dumps(data, ensure_ascii=False, separators=(',', ':')))
if '--final' in sys.argv:
    html, n = re.subn(r'^window\.__kaku = \{.*\};\n', '', html, flags=re.M)
    assert n <= 1
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html.encode()), 'bytes')
