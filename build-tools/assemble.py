"""Builds a folder that runs on its own: the Electron runtime with Kaku inside it.
Nothing to install, nothing to download."""
import json, os, shutil, stat, subprocess, sys, zipfile

VERSION = '33.4.11'
ROOT = '/home/claude/kaku'
APP = os.path.join(ROOT, 'desktop')
KEEP_LOCALES = {'en-US.pak', 'en-GB.pak'}

def build(platform, out_dir):
    runtime = f'/tmp/eldl/electron-v{VERSION}-{platform}.zip'
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)
    with zipfile.ZipFile(runtime) as z:
        z.extractall(out_dir)

    # the app itself goes where Electron looks for it
    app_dir = os.path.join(out_dir, 'resources', 'app')
    os.makedirs(app_dir)
    for name in ['main.js', 'preload.js', 'store.js', 'sync-server.js', 'certs.js', 'cert-store.js', 'sw.js', 'webllm.js', 'WEBLLM-LICENSE.txt', 'asr.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm', 'ASR-LICENSE.txt', 'merge.js', 'app.html']:
        shutil.copy(os.path.join(APP, name), app_dir)
    shutil.copytree(os.path.join(APP, 'fonts'), os.path.join(app_dir, 'fonts'))
    os.makedirs(os.path.join(app_dir, 'build'))
    shutil.copy(os.path.join(APP, 'build', 'icon.png'), os.path.join(app_dir, 'build'))
    pkg = json.load(open(os.path.join(APP, 'package.json'), encoding='utf-8'))
    json.dump({k: pkg[k] for k in ['name', 'productName', 'version', 'description', 'author', 'main']},
              open(os.path.join(app_dir, 'package.json'), 'w', encoding='utf-8'), indent=2)

    # trim what a single-language build does not need
    stub = os.path.join(out_dir, 'resources', 'default_app.asar')
    if os.path.exists(stub):
        os.remove(stub)
    loc = os.path.join(out_dir, 'locales')
    for f in os.listdir(loc):
        if f not in KEEP_LOCALES:
            os.remove(os.path.join(loc, f))

    # name the program after the app
    if platform.startswith('win32'):
        os.rename(os.path.join(out_dir, 'electron.exe'), os.path.join(out_dir, 'Kaku.exe'))
    else:
        os.rename(os.path.join(out_dir, 'electron'), os.path.join(out_dir, 'kaku'))
        os.chmod(os.path.join(out_dir, 'kaku'), 0o755)
        for f in ['chrome-sandbox', 'chrome_crashpad_handler']:
            p = os.path.join(out_dir, f)
            if os.path.exists(p):
                os.chmod(p, 0o755)
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, dn, fn in os.walk(out_dir) for f in fn)
    print(f'{platform}: {size // 1048576} MB in {sum(len(fn) for _, _, fn in os.walk(out_dir))} files')
    return out_dir

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
