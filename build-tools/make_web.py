# Builds the copy that lives on the open web: a folder you can host anywhere that
# serves HTTPS. An iPad opens it once, adds it to the Home Screen, and from then on
# it is an app on the iPad — its own icon, works on a plane, no computer anywhere.
#
# Everything is relative, so it works at a site root or in a subfolder.
import hashlib, io, os, re, shutil, sys
from PIL import Image

ROOT = '/home/claude/kaku'
SRC = os.path.join(ROOT, 'desktop')          # the build with fonts bundled, not fetched
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'web')

HEAD = """<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" href="icons/icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<script>
if ('serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
</script>
"""

def build():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'icons'))

    html = open(os.path.join(SRC, 'app.html'), encoding='utf-8').read()
    # the fonts sit beside the page here too, so the paths already point at them
    assert 'fonts/klee-600.woff2' in html, 'expected the bundled-font build'
    assert '</head>' in html
    html = html.replace('</head>', HEAD + '</head>')
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
    stamp = hashlib.sha1(html.encode()).hexdigest()[:10]

    shutil.copytree(os.path.join(SRC, 'fonts'), os.path.join(OUT, 'fonts'))
    shutil.copy(os.path.join(SRC, 'webllm.js'), os.path.join(OUT, 'webllm.js'))      # the on-device model runtime
    shutil.copy(os.path.join(SRC, 'WEBLLM-LICENSE.txt'), os.path.join(OUT, 'WEBLLM-LICENSE.txt'))
    src_icon = Image.open(os.path.join(SRC, 'build', 'icon.png')).convert('RGBA')
    for size in (180, 192, 512):
        src_icon.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, 'icons', f'icon-{size}.png'))
    # a maskable icon needs its artwork inside the safe circle, so it is inset on a solid tile
    mask = Image.new('RGBA', (512, 512), (253, 250, 246, 255))
    art = src_icon.resize((400, 400), Image.LANCZOS)
    mask.paste(art, (56, 56), art)
    mask.save(os.path.join(OUT, 'icons', 'icon-512-maskable.png'))

    open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write("""{
  "name": "Kaku",
  "short_name": "Kaku",
  "description": "Japanese practice: kana, kanji, numbers and Genki vocabulary.",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#fdfaf6",
  "theme_color": "#fdfaf6",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
""")

    sw = open(os.path.join(ROOT, 'web-sw.js'), encoding='utf-8').read().replace('__BUILD__', stamp)
    open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)

    shutil.copy(os.path.join(ROOT, 'web-README.md'), os.path.join(OUT, 'README.md'))
    open(os.path.join(OUT, '.nojekyll'), 'w').write('')   # GitHub Pages: serve the files as they are

    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fn in os.walk(OUT) for f in fn)
    print(f'{OUT}: {size // 1024} KB, build {stamp}')
    return OUT


if __name__ == '__main__':
    build()
