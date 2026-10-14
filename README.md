# Kaku — the web copy

Japanese practice: kana writing and reading, JLPT N5 kanji, numbers to 100,000,
and vocabulary, grammar notes and sentence drills following the Genki sequence.

Made by Troy Stokoe.

This folder is the whole app. Put it on any HTTPS host and it becomes an app on
any iPad, iPhone, Android phone or laptop that opens it once.

## Putting it online

**GitHub Pages**, which is free and permanent:

1. Make a new repository — call it `kaku`, public, no README.
2. Upload everything in this folder, keeping the `fonts` and `icons` folders.
3. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/`.
4. A minute later it is live at `https://<your-name>.github.io/kaku/`.

Any other static host works the same way — the only requirement is HTTPS, because
that is what lets a phone or tablet keep the app installed and working offline.

## Installing it on an iPad or iPhone

Open the address in **Safari** (not Chrome: only Safari can install a web app on
iOS), then Share → **Add to Home Screen**. It gets its own icon and opens without
Safari's address bar.

From then on it works with no connection: the page, the fonts and the stroke data
are stored on the device. Your progress is stored there too, by the app itself, and
never leaves the device.

Open it every couple of weeks. iPadOS and iOS clear the storage of web apps they
decide you have abandoned, and a backup is the only thing that survives that.

## Talking practice

Thirteen spoken scenes, one per lesson. Kaku says a line, you answer out loud, and it
checks what you said against what the lesson teaches. On an iPad that needs Safari's
microphone permission the first time; where it is not available you type instead and
everything else works the same.

## Keeping it in step with other copies

Practice settings → **Move progress between devices**. Copy the code on one device,
paste it into the other, press Apply. It merges rather than replaces: for every
character, word, drill and number band it keeps whichever side is further along, so
it is safe in either direction, as often as you like.

**Save a backup file** writes the lot to a JSON file. On an iPad that lands in Files,
and **Load a backup file** reads it back, merging the same way.

## What is in here

| File | What it does |
|---|---|
| `index.html` | The whole app: markup, styles, data, logic |
| `sw.js` | Keeps the app on the device so it runs with nothing to connect to |
| `manifest.webmanifest` | Name, icon and colours for the installed app |
| `fonts/` | Klee One and BIZ UDPGothic, cut down to the characters used |
| `icons/` | Home screen icons |

## Credits

- Stroke order data: [KanjiVG](https://kanjivg.tagaini.net) by Ulrich Apel, CC BY-SA 3.0
- Kanji readings and meanings: KANJIDIC, [EDRDG](https://www.edrdg.org/edrdg/licence.html), CC BY-SA 4.0
- Fonts: Klee One and BIZ UDPGothic, SIL Open Font License (`fonts/OFL.txt`)
- Lesson sequence follows Genki (The Japan Times). The vocabulary, grammar notes and
  drills in this app were written for it, not taken from the book.
