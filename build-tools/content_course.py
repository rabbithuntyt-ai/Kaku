# JAPA 100 (VIU, Fall 2026) — what the course itself covers, taken from the Genki vocabulary
# pages the class was told to study and from the twelve class decks.
#
# This file does not replace the lesson content; it marks it. Every word listed here is on the
# course, so the app can tell the difference between "this is on your midterm" and "this is a
# word Kaku knows". Words already in a lesson that are not on this list stay exactly where they
# are — they are simply not counted towards exam readiness.
#
# Sources: TB pp.38-40 (L1), pp.58-59 (L2), pp.84-85 (L3), and Classes 1-12.

# Each entry is (word, reading, meaning). Reading equals the word for kana-only entries.
def w(word, meaning, reading=None):
    return (word, reading or word, meaning)


COURSE = {
    # Class 1: greetings and numbers 1-100
    '0': dict(name='Greetings & numbers', tb='Class 1', words=[
        w('おはよう', 'good morning (casual)'),
        w('おはようございます', 'good morning (polite)'),
        w('こんにちは', 'hello, good afternoon'),
        w('こんばんは', 'good evening'),
        w('さようなら', 'goodbye'),
        w('おやすみなさい', 'good night'),
        w('ありがとう', 'thank you (casual)'),
        w('ありがとうございます', 'thank you (polite)'),
        w('すみません', 'excuse me, sorry, thank you'),
        w('いいえ', 'no, not at all'),
        w('いってきます', "I'll go and come back"),
        w('いってらっしゃい', 'please go and come back'),
        w('ただいま', "I'm home"),
        w('おかえりなさい', 'welcome back'),
        w('いただきます', 'thank you for the meal (before eating)'),
        w('ごちそうさま', 'thank you for the meal (after eating)'),
    ]),

    # Genki L1, TB pp.38-40. Everything on the vocabulary pages, including the additional lists,
    # because the L1 review quiz covered School, Occupations and Family.
    '1': dict(name='Lesson 1 · New friends', tb='TB pp.38-40', words=[
        # School
        w('だいがく', 'college, university'),
        w('こうこう', 'high school'),
        w('がくせい', 'student'),
        w('だいがくせい', 'college student'),
        w('りゅうがくせい', 'international student'),
        w('せんせい', 'teacher, professor'),
        w('ねんせい', '... year student'),
        w('いちねんせい', 'first-year student'),
        w('せんこう', 'major'),
        # Person
        w('わたし', 'I, me'),
        w('ともだち', 'friend'),
        w('さん', 'Mr., Ms. ...'),
        w('じん', '... people'),
        w('にほんじん', 'Japanese people'),
        # Time
        w('いま', 'now'),
        w('ごぜん', 'a.m.'),
        w('ごご', 'p.m.'),
        w('じ', "o'clock"),
        w('いちじ', "one o'clock"),
        w('はん', 'half'),
        w('にじはん', 'half past two'),
        # Others
        w('にほん', 'Japan'),
        w('アメリカ', 'U.S.A.'),
        w('ご', '... language'),
        w('にほんご', 'Japanese language'),
        w('さい', '... years old'),
        w('でんわ', 'telephone'),
        w('ばん', 'number ...'),
        w('ばんごう', 'number'),
        w('なまえ', 'name'),
        w('なん', 'what'),
        w('なに', 'what'),
        # the question compounds the study guide names one by one
        w('なんじ', 'what time'),
        w('なんさい', 'how old'),
        w('なんねんせい', 'what year student'),
        w('なんばん', 'what number'),
        # Expressions
        w('あのう', 'um ...'),
        w('はい', 'yes'),
        w('そうです', "that's right"),
        w('そうですか', 'I see, is that so?'),
        w('はじめまして', 'how do you do'),
        w('よろしくおねがいします', 'nice to meet you'),
        # Countries
        w('イギリス', 'Britain'),
        w('オーストラリア', 'Australia'),
        w('かんこく', 'Korea'),
        w('カナダ', 'Canada'),
        w('ちゅうごく', 'China'),
        w('インド', 'India'),
        w('エジプト', 'Egypt'),
        w('フィリピン', 'Philippines'),
        # Majors
        w('アジアけんきゅう', 'Asian studies'),
        w('けいざい', 'economics'),
        w('こうがく', 'engineering'),
        w('こくさいかんけい', 'international relations'),
        w('コンピューター', 'computer'),
        w('せいじ', 'politics'),
        w('せいぶつがく', 'biology'),
        w('ビジネス', 'business'),
        w('ぶんがく', 'literature'),
        w('れきし', 'history'),
        # Occupations
        w('いしゃ', 'doctor'),
        w('かいしゃいん', 'office worker'),
        w('かんごし', 'nurse'),
        w('こうこうせい', 'high school student'),
        w('しゅふ', 'housewife'),
        w('だいがくいんせい', 'graduate student'),
        w('べんごし', 'lawyer'),
        # Family
        w('おかあさん', 'mother'),
        w('おとうさん', 'father'),
        w('おねえさん', 'older sister'),
        w('おにいさん', 'older brother'),
        w('いもうと', 'younger sister'),
        w('おとうと', 'younger brother'),
    ]),

    # Genki L2, TB pp.58-59
    '2': dict(name='Lesson 2 · Shopping', tb='TB pp.58-59', words=[
        # Words that point
        w('これ', 'this one'),
        w('それ', 'that one'),
        w('あれ', 'that one (over there)'),
        w('どれ', 'which one'),
        w('この', 'this ...'),
        w('その', 'that ...'),
        w('あの', 'that ... (over there)'),
        w('どの', 'which ...'),
        w('ここ', 'here'),
        w('そこ', 'there'),
        w('あそこ', 'over there'),
        w('どこ', 'where'),
        w('だれ', 'who'),
        # Food
        w('おいしい', 'delicious'),
        w('さかな', 'fish'),
        w('とんかつ', 'pork cutlet'),
        w('にく', 'meat'),
        w('メニュー', 'menu'),
        w('やさい', 'vegetable'),
        # Things
        w('かさ', 'umbrella'),
        w('かばん', 'bag'),
        w('くつ', 'shoes'),
        w('さいふ', 'wallet'),
        w('ジーンズ', 'jeans'),
        w('じてんしゃ', 'bicycle'),
        w('しんぶん', 'newspaper'),
        w('スマホ', 'smartphone, mobile'),
        w('Tシャツ', 'T-shirt'),
        w('とけい', 'watch, clock'),
        w('ノート', 'notebook'),
        w('ペン', 'pen'),
        w('ぼうし', 'hat, cap'),
        w('ほん', 'book'),
        # Places
        w('ぎんこう', 'bank'),
        w('コンビニ', 'convenience store'),
        w('トイレ', 'toilet, restroom'),
        w('としょかん', 'library'),
        w('ゆうびんきょく', 'post office'),
        # Majors
        w('えいご', 'English (language)'),
        # Money matters
        w('いくら', 'how much'),
        w('えん', '... yen'),
        w('たかい', 'expensive, high'),
        # Expressions
        w('いらっしゃいませ', 'welcome (to our store)'),
        w('おねがいします', '..., please'),
        w('ください', 'please give me ...'),
        w('じゃあ', 'then, if that is the case'),
        w('どうぞ', 'please, here it is'),
        w('どうも', 'thank you'),
    ]),

    # Genki L3, TB pp.84-85
    '3': dict(name='Lesson 3 · Making a date', tb='TB pp.84-85', words=[
        # Nouns: entertainment and sports
        w('えいが', 'movie'),
        w('おんがく', 'music'),
        w('ざっし', 'magazine'),
        w('スポーツ', 'sports'),
        w('デート', 'date (romantic)'),
        w('テニス', 'tennis'),
        w('テレビ', 'TV'),
        # Foods and drinks
        w('アイスクリーム', 'ice cream'),
        w('ハンバーガー', 'hamburger'),
        w('おさけ', 'sake, alcoholic drink'),
        w('おちゃ', 'green tea'),
        w('コーヒー', 'coffee'),
        w('みず', 'water'),
        w('あさごはん', 'breakfast'),
        w('ひるごはん', 'lunch'),
        w('ばんごはん', 'dinner'),
        # Places
        w('いえ', 'home, house'),
        w('うち', 'home, house, my place'),
        w('がっこう', 'school'),
        w('カフェ', 'cafe'),
        # Time
        w('あした', 'tomorrow'),
        w('きょう', 'today'),
        w('あさ', 'morning'),
        w('こんばん', 'tonight'),
        w('まいにち', 'every day'),
        w('まいばん', 'every night'),
        w('しゅうまつ', 'weekend'),
        w('どようび', 'Saturday'),
        w('にちようび', 'Sunday'),
        w('いつ', 'when'),
        w('ごろ', 'at about ...'),
        # U-verbs
        w('いく', 'to go'),
        w('かえる', 'to go back, to return'),
        w('きく', 'to listen, to hear'),
        w('のむ', 'to drink'),
        w('はなす', 'to speak, to talk'),
        w('よむ', 'to read'),
        # Ru-verbs
        w('おきる', 'to get up'),
        w('たべる', 'to eat'),
        w('ねる', 'to sleep, to go to bed'),
        w('みる', 'to see, to look at, to watch'),
        # Irregular verbs
        w('くる', 'to come'),
        w('する', 'to do'),
        w('べんきょうする', 'to study'),
        # Adjectives
        w('いい', 'good'),
        w('はやい', 'early'),
        # Adverbs
        w('あまり', 'not much (with a negative)'),
        w('ぜんぜん', 'not at all (with a negative)'),
        w('たいてい', 'usually'),
        w('ちょっと', 'a little'),
        w('ときどき', 'sometimes'),
        w('よく', 'often, much'),
        # Expressions
        w('そうですね', "that's right, let me see"),
        w('でも', 'but'),
        w('どうですか', 'how about ...?, how is ...?'),
        w('ええ', 'yes'),
    ]),
}

# Section II of the midterm: you see an English word, you write it in katakana. The class said
# "all the katakana words on the vocabulary pages of Lessons 1 and 2", plus USA and Canada.
KATAKANA = [
    ('アメリカ', 'U.S.A.'),
    ('カナダ', 'Canada'),
    ('イギリス', 'Britain'),
    ('オーストラリア', 'Australia'),
    ('インド', 'India'),
    ('エジプト', 'Egypt'),
    ('フィリピン', 'Philippines'),
    ('コンピューター', 'computer'),
    ('ビジネス', 'business'),
    ('アジア', 'Asia'),
    ('メニュー', 'menu'),
    ('ジーンズ', 'jeans'),
    ('スマホ', 'smartphone'),
    ('Tシャツ', 'T-shirt'),
    ('ノート', 'notebook'),
    ('ペン', 'pen'),
    ('コンビニ', 'convenience store'),
    ('トイレ', 'toilet, restroom'),
]

# What the exam's five sections draw on, in the order the study guide lists them.
SECTIONS = [
    dict(id='listen', n='Listening', about='Numbers in context: time, price, phone number, age',
         mins=5, draws='numbers'),
    dict(id='kata', n='Katakana', about='English word in, katakana out', draws='katakana'),
    dict(id='vg', n='Vocabulary & grammar', about='Multiple choice over everything so far', draws='all'),
    dict(id='build', n='Writing sentences', about='Order the words, add the particles, conjugate the verb',
         draws='l3'),
    dict(id='exchange', n='Completing exchanges', about='Supply the missing question or answer',
         draws='questions'),
]
