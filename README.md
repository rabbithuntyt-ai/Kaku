# Kaku

Japanese practice: kana writing and reading, JLPT N5 kanji, numbers to 100,000, and
vocabulary, grammar notes, sentence drills and spoken conversation following the Genki
sequence.

Made by Troy Stokoe.

**The app is live at https://rabbithuntyt-ai.github.io/Kaku/** — open that on a phone or
iPad in Safari, Share → Add to Home Screen, and from then on it works with no connection
at all.

## What it does

| | |
|---|---|
| Kana | Writing from sound, stroke by stroke, and reading. Hiragana, katakana, or both |
| Kanji | Stroke order for the 79 characters in JLPT N5 |
| Numbers | 1 to 100,000, including the readings that change sound |
| Lessons | Grammar notes, vocabulary and sentence drills, lesson by lesson |
| Vocabulary | Every word in one list: search by Japanese, romaji or English, filter by lesson or by how well you know it |
| Talking practice | Thirteen spoken scenes. Kaku says a line, you answer out loud, and it tells you why if you are off |
| Free conversation | A partner that answers what you actually said and keeps the thread going |

Everything is scheduled: each character, word, drill and number band moves through review
boxes, and the home screen shows how confident you can be in each area today.

## The conversation partner

Three of them, behind one switch in **Practice settings → Who answers in free
conversation**:

- **Rules** — a parser on your own machine. It pulls the sentence apart by its particles,
  finds the verb through the shapes the lessons teach, and answers from that. A couple of
  milliseconds, no download, works offline. It will not improvise.
- **Model here** — a small language model (Qwen2.5 1.5B or 3B) running on your own
  graphics card through WebGPU. Fetched once, about 1.1 GB, then free and offline for
  good. It needs a page the browser trusts: the desktop app serves itself from 127.0.0.1
  for this, and the web copy above is already https.
- **Claude** — only in the copy running from a Claude account, and only if you switch it
  on. Spends your own Claude usage.

Whichever answers, every line is taken apart against the lessons you have switched on
before it reaches you. A word you have not been taught never appears.

## Building the desktop app

`desktop/` is the whole Electron app.

**With Node installed:** `cd desktop && npm install && npm start`, or `npm run dist:win` /
`npm run dist:mac` for an installer. `install.bat` and `install.command` do that for you.

**Without installing anything:** `build-tools/assemble.py` takes a prebuilt Electron
runtime and produces a folder that runs on its own — that is how the Windows and macOS
downloads are made. `desktop/README.md` says where progress is saved, how Wi-Fi sync and
its certificate work, and what each file does.

The built zips are not in the repository (100 MB and 90 MB). Build them with the scripts
above, or attach them to a GitHub Release.

## Building the web copy

```
python3 build-tools/make_lessons.py
python3 build-tools/build.py test.html
python3 build-tools/make_desktop.py
python3 build-tools/make_web.py
```

writes the folder this repository serves. `build-tools/verify_scenes.py` runs as part of
the lesson build and fails it if any spoken line uses a word its lesson has not taught.
The `qa_*.js` scripts drive a real browser through the app.

## Credits

- Stroke order data: [KanjiVG](https://kanjivg.tagaini.net) by Ulrich Apel, CC BY-SA 3.0
- Kanji readings and meanings: KANJIDIC, [EDRDG](https://www.edrdg.org/edrdg/licence.html), CC BY-SA 4.0
- Fonts: Klee One and BIZ UDPGothic, SIL Open Font License (`fonts/OFL.txt`)
- On-device models: [WebLLM](https://github.com/mlc-ai/web-llm) (Apache 2.0, `WEBLLM-LICENSE.txt`)
- Lesson sequence follows Genki (The Japan Times). The vocabulary, grammar notes, drills
  and scenes here were written for this app, not taken from the book.
