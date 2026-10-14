"""Builds Kaku.app for macOS from the prebuilt Electron runtime: a bundle that runs
on its own, with nothing to install. Apple Silicon by default.

Everything here mirrors what electron-builder does on a Mac — rename the bundle and
its helpers, point the plists at the new name, drop in the app, re-sign — except that
it runs on Linux, so the signing is done with rcodesign instead of Apple's codesign.
"""
import json, os, plistlib, shutil, struct, subprocess, sys, zipfile

VERSION = '33.4.11'
ROOT = '/home/claude/kaku'
APP = os.path.join(ROOT, 'desktop')
APP_ID = 'ca.stokoe.kaku'
KEEP_LPROJ = {'en.lproj', 'en_GB.lproj'}
FILES = ['main.js', 'preload.js', 'store.js', 'sync-server.js', 'certs.js', 'cert-store.js', 'sw.js', 'webllm.js', 'WEBLLM-LICENSE.txt', 'merge.js', 'app.html']


def icns(png_path, out_path):
    """A macOS icon file. The artwork is inset the way Apple's own icons are, so it
    does not look oversized next to them in the Dock."""
    from PIL import Image
    src = Image.open(png_path).convert('RGBA')
    parts = []
    for tag, size in [(b'ic07', 128), (b'ic08', 256), (b'ic09', 512), (b'ic10', 1024),
                      (b'ic11', 32), (b'ic12', 64), (b'ic13', 256), (b'ic14', 512)]:
        art = round(size * 0.82) // 2 * 2
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        canvas.paste(src.resize((art, art), Image.LANCZOS), ((size - art) // 2, (size - art) // 2))
        import io
        buf = io.BytesIO()
        canvas.save(buf, format='PNG')
        data = buf.getvalue()
        parts.append(tag + struct.pack('>I', len(data) + 8) + data)
    body = b''.join(parts)
    open(out_path, 'wb').write(b'icns' + struct.pack('>I', len(body) + 8) + body)


def rename_helper(frameworks, old, new):
    """Electron works out its helper processes' names from the main app's name, so the
    helpers have to follow the rename or no window ever opens."""
    src = os.path.join(frameworks, old + '.app')
    dst = os.path.join(frameworks, new + '.app')
    os.rename(src, dst)
    os.rename(os.path.join(dst, 'Contents', 'MacOS', old), os.path.join(dst, 'Contents', 'MacOS', new))
    os.chmod(os.path.join(dst, 'Contents', 'MacOS', new), 0o755)
    pl = os.path.join(dst, 'Contents', 'Info.plist')
    d = plistlib.load(open(pl, 'rb'))
    d['CFBundleExecutable'] = new
    d['CFBundleName'] = new
    d['CFBundleIdentifier'] = APP_ID + '.helper'
    plistlib.dump(d, open(pl, 'wb'))


def build(arch='arm64', out_dir='/tmp/macbuild/out'):
    runtime = f'/tmp/eldl/electron-v{VERSION}-darwin-{arch}.zip'
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)
    # python's zipfile loses symlinks and permissions inside a framework, so unzip does it
    subprocess.run(['unzip', '-q', runtime, '-d', out_dir], check=True)
    for junk in ['LICENSE', 'LICENSES.chromium.html', 'version']:
        p = os.path.join(out_dir, junk)
        if os.path.exists(p):
            os.remove(p)

    app = os.path.join(out_dir, 'Kaku.app')
    os.rename(os.path.join(out_dir, 'Electron.app'), app)
    contents = os.path.join(app, 'Contents')
    os.rename(os.path.join(contents, 'MacOS', 'Electron'), os.path.join(contents, 'MacOS', 'Kaku'))
    os.chmod(os.path.join(contents, 'MacOS', 'Kaku'), 0o755)

    frameworks = os.path.join(contents, 'Frameworks')
    for suffix in ['', ' (GPU)', ' (Plugin)', ' (Renderer)']:
        if os.path.exists(os.path.join(frameworks, 'Electron Helper' + suffix + '.app')):
            rename_helper(frameworks, 'Electron Helper' + suffix, 'Kaku Helper' + suffix)

    # the app itself, where Electron looks for it
    res = os.path.join(contents, 'Resources')
    app_dir = os.path.join(res, 'app')
    os.makedirs(app_dir)
    for name in FILES:
        shutil.copy(os.path.join(APP, name), app_dir)
    shutil.copytree(os.path.join(APP, 'fonts'), os.path.join(app_dir, 'fonts'))
    os.makedirs(os.path.join(app_dir, 'build'))
    shutil.copy(os.path.join(APP, 'build', 'icon.png'), os.path.join(app_dir, 'build'))
    pkg = json.load(open(os.path.join(APP, 'package.json'), encoding='utf-8'))
    json.dump({k: pkg[k] for k in ['name', 'productName', 'version', 'description', 'author', 'main']},
              open(os.path.join(app_dir, 'package.json'), 'w', encoding='utf-8'), indent=2)

    # trim what a single-language build does not need: the app's own strings, and the
    # 55 language packs inside the framework, which are 41 MB of the download
    os.remove(os.path.join(res, 'default_app.asar'))
    fw_res = os.path.join(frameworks, 'Electron Framework.framework', 'Versions', 'A', 'Resources')
    for folder in [res, fw_res]:
        for f in os.listdir(folder):
            if f.endswith('.lproj') and f not in KEEP_LPROJ:
                shutil.rmtree(os.path.join(folder, f))
    os.remove(os.path.join(res, 'electron.icns'))
    icns(os.path.join(APP, 'build', 'icon.png'), os.path.join(res, 'kaku.icns'))

    pl = os.path.join(contents, 'Info.plist')
    d = plistlib.load(open(pl, 'rb'))
    d.update({'CFBundleDisplayName': 'Kaku', 'CFBundleName': 'Kaku', 'CFBundleExecutable': 'Kaku',
              'CFBundleIdentifier': APP_ID, 'CFBundleIconFile': 'kaku.icns',
              'CFBundleShortVersionString': pkg['version'], 'CFBundleVersion': pkg['version'],
              'LSApplicationCategoryType': 'public.app-category.education',
              'NSHumanReadableCopyright': 'Made by Troy Stokoe'})
    d.pop('ElectronAsarIntegrity', None)   # that stub asar is gone, and Kaku is a plain folder
    plistlib.dump(d, open(pl, 'wb'))

    # Apple Silicon refuses to run anything whose signature does not match its contents,
    # and every edit above broke the one it came with. Ad-hoc signing makes it valid again.
    subprocess.run(['rcodesign', 'sign', app], check=True, capture_output=True)

    files = sum(len(fn) for _, _, fn in os.walk(app))
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, dn, fn in os.walk(app)
               for f in fn if not os.path.islink(os.path.join(dp, f)))
    print(f'darwin-{arch}: {size // 1048576} MB in {files} files')
    return app


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'arm64',
          sys.argv[2] if len(sys.argv) > 2 else '/tmp/macbuild/out')
