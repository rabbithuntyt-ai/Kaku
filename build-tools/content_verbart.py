# The thirteen Lesson 3 verbs: a drawing and a hook for each.
#
# The first set of drawings were icons of things — a bowl, a mug, an open book — and an icon of
# a thing reads as a noun. A bowl is "food"; a person lifting a bowl to their mouth is "eating".
# So every one of these has somebody in it, doing the thing. いく and くる are the same walk seen
# from two sides: going away is drawn from behind, with no face, and coming is drawn from the
# front, with one.
#
# The hooks are sound-first. A mnemonic that explains the meaning is useless at the moment you
# need it, which is when you have the meaning and want the word; so each one starts from how the
# Japanese sounds and lands on the English.

HEAD = 2.4   # stroke width the whole set is drawn at
BOX = 72     # viewBox

ART = {
    'たべる':
      '<circle cx="19" cy="19" r="7"/><path d="M19 26v19"/><path d="M19 31 31 29"/>'
      '<path d="M19 33 31 38"/><path d="M30 36h22a11 11 0 0 1-22 0Z"/><path d="M36 52h10"/>'
      '<path d="M58 12 47 29M63 16 52 32"/><path d="M38 26q2-4 0-7M46 26q2-4 0-7"/>',
    'のむ':
      '<circle cx="22" cy="21" r="7"/><path d="M22 28v16"/><path d="M22 44 16 57M22 44 28 57"/>'
      '<path d="M22 32 33 29"/><g transform="rotate(-32 34 24)">'
      '<path d="M31 15h14v13a7 7 0 0 1-14 0Z"/><path d="M45 18h4a5.5 5.5 0 0 1 0 11h-4"/>'
      '<path d="M34 21h8"/></g>',
    'みる':
      '<circle cx="17" cy="25" r="7"/><circle cx="20" cy="24" r="1.6"/><path d="M17 32v15"/>'
      '<path d="M11 47 17 38 23 47"/><path d="M26 23 38 20M26 28 38 32"/>'
      '<rect x="40" y="14" width="26" height="22" rx="3"/><path d="M53 36v6M46 42h14"/>',
    'きく':
      '<circle cx="25" cy="23" r="8"/><path d="M25 31v13"/><path d="M25 44 19 57M25 44 31 56"/>'
      '<path d="M20 41 33 31"/><path d="M34 17c6 2 6 13 0 15"/>'
      '<path d="M46 14a17 17 0 0 1 0 26M55 8a25 25 0 0 1 0 38"/>',
    'よむ':
      '<circle cx="21" cy="15" r="7"/><path d="M21 22v10"/><path d="M21 26 15 33M21 26 29 32"/>'
      '<path d="M36 36c-6-4-13-5-20-4v16c7-1 14 0 20 4 6-4 13-5 20-4V32c-7-1-14 0-20 4Z"/>'
      '<path d="M36 36v16"/>',
    'はなす':
      '<circle cx="14" cy="34" r="7"/><path d="M14 41v12"/><path d="M8 53 14 46 20 53"/>'
      '<circle cx="58" cy="34" r="7"/><path d="M58 41v12"/><path d="M52 53 58 46 64 53"/>'
      '<path d="M26 8h20a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-7l-6 6v-6h-7a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z"/>'
      '<path d="M30 15h12M30 20h8"/>',
    'かえる':
      '<path d="M40 32 54 18 68 32"/><path d="M44 32v20h20V32"/><path d="M52 52V41h5v11"/>'
      '<circle cx="13" cy="22" r="7"/><path d="M13 29v10"/><path d="M13 32 20 36"/>'
      '<path d="M13 39 8 50M13 39 19 49"/><path d="M24 44h12"/><path d="M32 40 37 44 32 48"/>',
    'いく':
      '<circle cx="26" cy="20" r="7"/><path d="M18 30h16"/><path d="M26 27v13"/>'
      '<path d="M26 40 19 53M26 40 33 51"/><path d="M8 20h7M5 27h9M8 34h7"/><path d="M42 32h18"/>'
      '<path d="M55 27 61 32 55 37"/>',
    'くる':
      '<circle cx="46" cy="20" r="7"/><circle cx="43.5" cy="19" r="1.4"/>'
      '<circle cx="48.5" cy="19" r="1.4"/><path d="M38 30h16"/><path d="M46 27v13"/>'
      '<path d="M46 40 39 53M46 40 53 51"/><path d="M64 20h-7M67 27h-9M64 34h-7"/>'
      '<path d="M30 32H12"/><path d="M17 27 11 32 17 37"/>',
    'おきる':
      '<path d="M8 40v14"/><path d="M8 50h44"/><path d="M8 54h44v8"/>'
      '<path d="M30 50h20a4 4 0 0 0-4-4H34a4 4 0 0 0-4 4Z"/>'
      '<circle cx="20" cy="16" r="7"/><path d="M20 23v19"/>'
      '<path d="M20 28 9 18M20 28 31 17"/>'
      '<path d="M63 50V28"/><path d="M58 33 63 28 68 33"/>',
    'ねる':
      '<path d="M6 30v16"/><path d="M6 42h56"/><path d="M6 46h56v10"/><path d="M11 34h13v8H11Z"/>'
      '<circle cx="17" cy="37" r="5"/><path d="M14.5 37q2.5 1.6 5 0"/>'
      '<path d="M26 42h28a5 5 0 0 0-5-5H31a5 5 0 0 0-5 5Z"/>'
      '<path d="M44 20h8l-8 8h8M58 8h6l-6 6h6"/>',
    'する':
      '<circle cx="32" cy="16" r="7"/><path d="M32 23 30 40"/><path d="M32 27 45 19M32 29 20 35"/>'
      '<path d="M30 40 21 54M30 40 40 52"/><path d="M50 27 57 24M52 34h8M48 20l5-4"/>'
      '<path d="M14 27 7 24M12 34H4"/>'
      '<path d="M57 8l1.8 4.6 4.6 1.8-4.6 1.8L57 21l-1.8-4.8-4.6-1.8 4.6-1.8Z"/>',
    'べんきょうする':
      '<path d="M4 54h64"/><path d="M12 54v8M58 54v8"/>'
      '<circle cx="21" cy="24" r="8"/><circle cx="25" cy="27" r="1.6"/>'
      '<path d="M21 32v14"/><path d="M21 37 32 47"/>'
      '<path d="M45 50c-5-3-9-4-13-3v-8c4-1 8 0 13 3 5-3 9-4 13-3v8c-4-1-8 0-13 3Z"/>'
      '<path d="M45 42v8"/>',
}

# Sound first, meaning second. These are hooks, not explanations.
MNEMONIC = {
 'たべる': 'Who picks up the <b>tab</b>? The one who ate. た<b>べ</b>る — tab.',
 'のむ':   '<b>No mu</b>g, nothing to drink. の・む.',
 'みる':   'Look in the <b>mir</b>ror. みる is almost the word.',
 'きく':   '<b>Ki-ku</b>, <b>cu-ckoo</b> — the bird you hear before you see.',
 'よむ':   '<b>Yo</b>u <b>mu</b>st read it. よ・む.',
 'はなす':  'Talk through your <b>はな</b> (nose). はな・す.',
 'かえる':  'かえる is also the word for <b>frog</b> \u2014 and a frog always returns to its own pond.',
 'いく':   '<b>I</b> <b>k</b>eep going. い・く, and the drawing is your back.',
 'くる':   'The <b>k</b>ey <b>c</b>omes in the door — くる turns into <b>き</b>ます.',
 'おきる':  '<b>OK</b>, I’m getting up. <b>おき</b>る.',
 'ねる':   '<b>Ne</b>ver getting up — ねる is the other one.',
 'する':   '<b>Sure</b>, I’ll do it. する is the sound of yes.',
 'べんきょうする': '<b>Ben</b> studies in <b>Kyo</b>to. べん・きょう・する.',
}
