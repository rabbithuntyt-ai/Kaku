# Kaku — desktop

Japanese practice: kana writing and reading, JLPT N5 kanji, numbers to 100,000,
and vocabulary, grammar notes and sentence drills following the Genki sequence.

Made by Troy Stokoe.

## What is in the app

The home screen starts a session and shows what that session will draw on —
kana lines, lesson words, number bands — then four places to study:

| Section | What it holds |
|---|---|
| Lessons | Grammar notes, vocabulary, kanji and sentence drills, lesson by lesson |
| Vocabulary | Every word in one list: search by Japanese, romaji or English, filter by lesson or by how well you know it, and practise whatever the filter leaves |
| Kanji | Stroke order for the 79 characters in JLPT N5 |
| Numbers | 1 to 100,000, including the readings that change sound |
| Talking practice | Scenes you speak: Kaku says a line, you answer out loud, and it tells you why if you are off |

### Talking practice

Thirteen scenes, one per lesson from the greetings through Lesson 12. Kaku takes the
other side — shop assistant, classmate, neighbour — says its line out loud, and tells
you what to get across. You answer by speaking; it checks what it heard against what
the lesson teaches, names the mistake if you made one of the usual ones, and moves
those words along in the same review boxes as everything else.

Every word in a scene comes from that lesson or an earlier one. Anything outside the
word lists — shop phrases, place names — is listed and translated before the scene
starts, as are any words from lessons you have not switched on. `verify_scenes.py`
takes every line apart at build time and the build fails if a word appears that the
lessons have not taught.

Speaking needs a browser that will listen: Safari and Chrome do, over HTTPS or on
your own machine. Where the microphone is not available the scene runs exactly the
same, typed instead, and says so. `That is what I said` overrules a microphone that
mishears you.

## Installing

Prebuilt, nothing to install: **Kaku.zip** (Windows) and **Kaku-mac.zip**
(Apple Silicon) each hold the whole program. Unpack and run.

From source instead:

**Windows:** double-click **install.bat**.
**macOS or Linux:** double-click **install.command**, or run `./install.command`.

It checks for Node.js (and sends you to nodejs.org if it is missing), installs
what it needs, then asks whether to start Kaku, build a proper installer, or both.

After that, **start.bat** (or `./start.sh`) opens the app.

Building produces, in `dist/`, a Windows installer that adds a Start Menu
shortcut plus a portable exe that runs from anywhere including a USB stick, or a
`.dmg` on macOS. Build on the platform you are targeting.

If you would rather do it by hand: `npm install`, then `npm start`, or
`npm run dist:win` / `npm run dist:mac`.

## Opening it on a Mac

On a Mac the app is signed by itself rather than with a paid Apple certificate,
so the first launch needs `xattr -dr com.apple.quarantine Kaku.app`, or a
right-click on the app and **Open**. A folder called `data` beside `Kaku.app`
makes it portable; inside the bundle is no good, since that would break the
signature.

## Where your progress lives

Everything is stored in one file on this computer:

| Platform | Location |
|---|---|
| Windows | `%APPDATA%\Kaku\kaku-progress.json` |
| macOS | `~/Library/Application Support/Kaku/kaku-progress.json` |
| Linux | `~/.config/Kaku/kaku-progress.json` |

Saves are atomic — the file is written to a temporary name, flushed to disk, then
renamed over the old one — so a crash or a power cut cannot leave a half-written
save. A copy is kept in `backups/` the first time the app opens each day, and the
last ten days are retained. If the main file is ever unreadable, the app falls
back to the newest backup on its own.

**File → Choose where progress is saved…** moves that file anywhere you like. Point
two computers at the same OneDrive or Dropbox folder and they share one save.
Don't run both at once if you do: whichever saves last wins.

**File → Save a backup file… / Load a backup file…** writes or reads a plain JSON
copy. Loading merges rather than replacing.

## Sharing progress with your phone

Three ways, from most automatic to least.

### 1. Wi-Fi sync (no account, nothing to type after the first time)

**File → Sync with my phone over Wi-Fi…** It shows an address like
`http://192.168.1.23:8777/?k=7f3a9c1b2d4e`. Open that on your phone while it is
on the same Wi-Fi, and your phone runs Kaku straight from this computer. From
then on the two merge themselves: every save goes across, and each side checks
for the other's work every few seconds. Add to Home Screen on the phone keeps it
one tap away.

It serves only the app and the sync endpoint, only on your own network, and the
key in the address is what keeps anything else out. The key is kept between runs,
so the icon on the phone keeps working. Windows asks to allow it through the
firewall the first time — say yes for private networks. It stops when you turn it
off or close Kaku.

#### Using the phone with this computer off

Borrowing the app from the computer means there is nothing to open when the
computer sleeps. A phone will only keep a web app working offline if the page
arrived over HTTPS, so Kaku runs a second copy of the server on port 8778 with a
certificate it makes itself — `certs.js` writes the X.509 directly, and the
authority's private key is created on this computer, kept in the progress folder,
and never leaves it.

On the phone, tap **Make it work when the computer is off** at the bottom of
Kaku's home screen. That opens `/offline`, which hands the phone a configuration
profile holding the public certificate, walks through installing it and switching
it on in Settings → General → About → Certificate Trust Settings, and then links
to the HTTPS copy to add to the Home Screen. A minute, once.

After that `sw.js` keeps the app, its fonts and its icon in the phone's own
storage: the icon opens whether the computer is on, asleep or off, and the sync
endpoint is the one thing never cached. Work done on the phone while the computer
is away is pushed over as soon as the two see each other again, item by item, each
side keeping whatever the other did later.

The server certificate is reissued whenever this computer's address changes; the
phone never has to be told again. Only the address itself changing (a new IP from
the router) means re-adding the icon, so a reserved address in the router is worth
having.

### 2. Your Claude account (works anywhere, needs internet)

**Help → Use my Claude account instead.** The window loads the same app running
from your Claude account, which is the copy your phone uses too, so both share
one store that updates itself wherever you are. You sign in once. Help → Go back
to this computer's own copy returns to the local version.

The two stores are separate, so when you switch, carry your progress across once
with a sync code.

### 3. A sync code (works offline, between any two copies)

1. On either device, open **Practice settings → Move progress between devices**.
2. Press **Copy this device's code**.
3. On the other device, paste it into the box and press **Apply pasted code**.

The code is your whole progress file, compressed, around 300 characters at the
start and a few KB once you have a lot of history. Applying it **merges**: for
every character, word, drill and number band it keeps whichever side is further
along, and your own word lists from both sides are combined. Nothing is thrown
away, so it is safe to send in either direction, as often as you like.

**Help → Open the web version** opens the browser copy for your phone.

## What is in here

| File | What it does |
|---|---|
| `main.js` | The window, the menus, and all file access |
| `preload.js` | The only bridge between the page and the computer |
| `store.js` | Atomic saves, daily backups, recovery |
| `sync-server.js` | The Wi-Fi sync server, plain and HTTPS |
| `certs.js` | Writes this computer's own certificates, by hand, no library |
| `cert-store.js` | Keeps the authority between runs, reissues the server certificate |
| `sw.js` | What keeps the app on the phone when this computer is off |
| `merge.js` | Combining two devices' progress without losing either |
| `app.html` | The whole app: markup, styles, data, logic |
| `fonts/` | Klee One and BIZ UDPGothic, cut down to the characters used |
| `test-store.js` | `npm test` — checks the save file survives crashes and corruption |
| `test-sync.js` | Checks the sync server, its key, and the merge |
| `test-certs.js` | Checks the certificates against what Apple demands, with openssl |
| `test-offline.js` | Drives a real browser: computer off, study, computer back, nothing lost |
| `install.bat` / `install.command` | One-click setup |
| `start.bat` / `start.sh` | Opens the app once it is set up |

The page runs with `contextIsolation` on, `nodeIntegration` off and a sandboxed
renderer, so the app itself cannot touch your disk except through the handful of
calls in `preload.js`, and those are refused for anything that is not the local
page. It makes no network requests of its own; Wi-Fi sync only listens, and only
while you have it switched on.

## Themes

**Practice settings → Theme** has five: Classic (the green practice paper),
Genki (textbook white and red), Indigo, Sakura and Sumi. Each has a light and a
dark face, and **Light or dark** follows your system unless you force it.

## Credits

- Stroke order data: [KanjiVG](https://kanjivg.tagaini.net) by Ulrich Apel, CC BY-SA 3.0
- Kanji readings and meanings: KANJIDIC, [EDRDG](https://www.edrdg.org/edrdg/licence.html), CC BY-SA 4.0
- Fonts: Klee One and BIZ UDPGothic, SIL Open Font License (`fonts/OFL.txt`)
- Lesson sequence follows Genki (The Japan Times). Vocabulary, grammar notes and
  drills here are written for this app, not taken from the book.
