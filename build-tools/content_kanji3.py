# Lesson 3 kanji and katakana — the quiz set.
#
# Workbook p.133 is the Lesson 3 kanji sheet: fifteen characters, 一 through 十 plus 百, 千, 万,
# 円 and 時. Page 134 is what is done with them, and it is worth copying the shapes exactly
# because the quiz on the 4th/5th is built from the same material:
#
#   I    write the number in kanji        41 → 四十一, 2,890 → 二千八百九十
#   II   write the reading in kanji       ろっぴゃくえん → 六百円, よじ → 四時
#   III  translate, using the kanji       "That bag is 5,300 yen" → そのかばんは五千三百円です。
#
# The three readings that catch everyone are 四時, 七時 and 九時, because the number changes its
# sound in front of 時 and nowhere else on this list. The hundreds and thousands do the same
# thing: 三百 さんびゃく, 六百 ろっぴゃく, 八百 はっぴゃく, 三千 さんぜん, 八千 はっせん.

# char, meaning, the readings this course uses, the compounds it appears in
K3 = [
    ('一', 'one',          ['いち'],          [('一時', 'いちじ', 'one o’clock')]),
    ('二', 'two',          ['に'],            [('二時', 'にじ', 'two o’clock')]),
    ('三', 'three',        ['さん'],          [('三時', 'さんじ', 'three o’clock'),
                                               ('三百', 'さんびゃく', '300 — the sound changes')]),
    ('四', 'four',         ['よん', 'よ', 'し'], [('四時', 'よじ', 'four o’clock — よじ, never よんじ'),
                                               ('四百', 'よんひゃく', '400')]),
    ('五', 'five',         ['ご'],            [('五時', 'ごじ', 'five o’clock')]),
    ('六', 'six',          ['ろく'],          [('六時', 'ろくじ', 'six o’clock'),
                                               ('六百', 'ろっぴゃく', '600 — the sound changes')]),
    ('七', 'seven',        ['なな', 'しち'],   [('七時', 'しちじ', 'seven o’clock — しちじ, never ななじ')]),
    ('八', 'eight',        ['はち'],          [('八時', 'はちじ', 'eight o’clock'),
                                               ('八百', 'はっぴゃく', '800 — the sound changes'),
                                               ('八千', 'はっせん', '8,000 — the sound changes')]),
    ('九', 'nine',         ['きゅう', 'く'],   [('九時', 'くじ', 'nine o’clock — くじ, never きゅうじ')]),
    ('十', 'ten',          ['じゅう'],        [('十時', 'じゅうじ', 'ten o’clock')]),
    ('百', 'hundred',      ['ひゃく'],        [('百円', 'ひゃくえん', '100 yen'),
                                               ('三百', 'さんびゃく', '300'),
                                               ('六百', 'ろっぴゃく', '600')]),
    ('千', 'thousand',     ['せん'],          [('千円', 'せんえん', '1,000 yen'),
                                               ('三千', 'さんぜん', '3,000'),
                                               ('八千', 'はっせん', '8,000')]),
    ('万', 'ten thousand', ['まん'],          [('一万', 'いちまん', '10,000 — always 一万, never just 万')]),
    ('円', 'yen',          ['えん'],          [('百円', 'ひゃくえん', '100 yen'),
                                               ('五千円', 'ごせんえん', '5,000 yen')]),
    ('時', 'o’clock', ['じ'],            [('なん時', 'なんじ', 'what time — なん stays in kana'),
                                               ('四時', 'よじ', 'four o’clock')]),
]

# Part II of the workbook page: a reading in, the kanji out. Everything here is course
# vocabulary, and the numbers are the ones whose sound changes.
K3_WRITE = [
    ('ろっぴゃくえん', '六百円', '600 yen'),
    ('よじ', '四時', '4 o’clock'),
    ('しちじ', '七時', '7 o’clock'),
    ('くじ', '九時', '9 o’clock'),
    ('はっぴゃくえん', '八百円', '800 yen'),
    ('さんぜんえん', '三千円', '3,000 yen'),
    ('はっせんえん', '八千円', '8,000 yen'),
    ('いちまんえん', '一万円', '10,000 yen'),
    ('ごせんえん', '五千円', '5,000 yen'),
    ('さんびゃくえん', '三百円', '300 yen'),
    ('じゅうにじ', '十二時', '12 o’clock'),
    ('いちじはん', '一時はん', 'half past one'),
    ('なんじ', 'なん時', 'what time'),
    ('ひゃくえん', '百円', '100 yen'),
    ('にじゅうごえん', '二十五円', '25 yen'),
]

# Part I: the numbers the sheet actually sets, plus the bands around them
K3_NUM = [41, 300, 1500, 2890, 10000, 67000, 128000, 1000000,
          600, 800, 3000, 8000, 49000, 5300, 380, 12, 25, 99, 110, 7400]

# Part III: a whole sentence, kanji where the course has taught them
K3_LINES = [
    ('This watch is 49,000 yen.', 'このとけいは四万九千円です。', ['このとけいは49000円です。']),
    ('That bag is 5,300 yen.', 'そのかばんは五千三百円です。', []),
    ('Ms. Yamashita gets up at six.', 'やましたさんは六時におきます。', []),
    ('Sora goes to college at seven.', 'ソラさんは七時にだいがくにいきます。',
     ['ソラさんは七時にだいがくへいきます。']),
    ('Mr. Suzuki usually goes to bed at about twelve.', 'すずきさんはたいてい十二時ごろにねます。',
     ['すずきさんはたいてい十二時ごろねます。']),
    ('I sometimes drink coffee at a cafe. The coffee is 380 yen.',
     'わたしはときどきカフェでコーヒーをのみます。コーヒーは三百八十円です。', []),
    ('I watch TV at nine.', 'わたしは九時にテレビをみます。', []),
    ('This hamburger is 400 yen.', 'このハンバーガーは四百円です。', []),
    ('Mary comes to school at eight.', 'メアリーさんは八時にがっこうにきます。',
     ['メアリーさんは八時にがっこうへきます。']),
    ('I do not study at ten.', 'わたしは十時にべんきょうしません。', []),
]

# The Lesson 3 katakana, from the vocabulary page the class was set, plus the four the
# workbook adds on p.33.
KATA3 = [
    ('スポーツ', 'sports'),
    ('デート', 'date (romantic)'),
    ('テニス', 'tennis'),
    ('テレビ', 'TV'),
    ('アイスクリーム', 'ice cream'),
    ('ハンバーガー', 'hamburger'),
    ('コーヒー', 'coffee'),
    ('カフェ', 'cafe'),
    ('サッカー', 'soccer'),
    ('バスケットボール', 'basketball'),
    ('ロック', 'rock music'),
    ('クラシック', 'classical music'),
]


def number_kanji(n):
    """41 -> 四十一. A leading one is dropped before 十, 百 and 千, but 万 always keeps it."""
    if n == 0:
        return '〇'
    D = '〇一二三四五六七八九'

    def under(x):
        s = ''
        t, h, te, o = x // 1000, x % 1000 // 100, x % 100 // 10, x % 10
        if t:
            s += ('' if t == 1 else D[t]) + '千'
        if h:
            s += ('' if h == 1 else D[h]) + '百'
        if te:
            s += ('' if te == 1 else D[te]) + '十'
        if o:
            s += D[o]
        return s

    man, rest = n // 10000, n % 10000
    out = ''
    if man:
        out += ('一' if man == 1 else under(man)) + '万'
    return out + under(rest)
