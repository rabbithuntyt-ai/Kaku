# Builds the desktop copy of the app: same page, but fonts come from the bundle
# instead of Google, so it works with no internet at all.
import re, sys
html = open('test.html', encoding='utf-8').read()
links = re.search(r'<link rel="preconnect".*?rel="stylesheet">', html, re.S)
assert links, 'font links not found'
faces = """<style>
@font-face { font-family: "Klee One"; font-weight: 600; font-style: normal; font-display: swap; src: url("fonts/klee-600.woff2") format("woff2"); }
@font-face { font-family: "BIZ UDPGothic"; font-weight: 400; font-style: normal; font-display: swap; src: url("fonts/biz-400.woff2") format("woff2"); }
@font-face { font-family: "BIZ UDPGothic"; font-weight: 700; font-style: normal; font-display: swap; src: url("fonts/biz-700.woff2") format("woff2"); }
</style>"""
html = html.replace(links.group(0), faces)
open('desktop/app.html', 'w', encoding='utf-8').write(html)
print('desktop/app.html', len(html.encode()), 'bytes')
