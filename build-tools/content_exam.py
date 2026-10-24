# The JAPA 100 midterm, as the study guide describes it. Five parts, in the exam's own order.
#
# Parts I-III are generated in the app from the course vocabulary and the number practice, so
# they are different every time. Parts IV and V cannot be generated safely — word order,
# particles and conjugation have to be right, and a wrong answer key is worse than no practice
# — so they are written out here and checked at build time against the course vocabulary.

# ---------------------------------------------------------------- III. grammar multiple choice
# Each: the sentence with a gap, the options, the index of the right one, and why.
# These cover the checklist: particles, question words, pointing words, negation, ね/よ,
# greetings, counters, and the Lesson 3 verb endings.
GRAMMAR = [
    dict(q='わたし＿＿ りゅうがくせいです。', o=['は', 'を', 'の', 'で'], a=0,
         why='は marks the topic — the thing the sentence is about.'),
    dict(q='これは わたし＿＿ かばんです。', o=['は', 'の', 'も', 'を'], a=1,
         why='の joins two nouns. わたしのかばん = my bag.'),
    dict(q='にくを たべます＿＿。', o=['か', 'の', 'を', 'に'], a=0,
         why='か at the end turns a statement into a question.'),
    dict(q='メアリーさんは アメリカじんです。ソラさん＿＿ かんこくじんです。', o=['は', 'も', 'の', 'を'], a=1,
         why='も = too. Use it instead of は when adding a second person or thing.'),
    dict(q='うち＿＿ おんがくを ききます。', o=['に', 'で', 'を', 'は'], a=1,
         why='で marks where an action happens.'),
    dict(q='がっこう＿＿ いきます。', o=['で', 'に', 'を', 'も'], a=1,
         why='に marks the destination. で would be where something happens instead.'),
    dict(q='コーヒー＿＿ のみます。', o=['を', 'で', 'に', 'は'], a=0,
         why='を marks the direct object — the thing the verb acts on.'),
    dict(q='この とけいは ごせんえんです＿＿。（right?）', o=['よ', 'ね', 'か', 'の'], a=1,
         why='ね asks the listener to agree — "right?".'),
    dict(q='あの とけいも はっせんえんです＿＿。（I tell you）', o=['ね', 'か', 'よ', 'の'], a=2,
         why='よ tells the listener something you are sure of and they may not know.'),
    dict(q='いぬじゃないです。ねこ＿＿。', o=['です', 'ですか', 'じゃないです', 'でした'], a=0,
         why='Plain statement: です. じゃないです is the negative.'),
    dict(q='ソラさんは がくせい＿＿。（is not）', o=['です', 'じゃないです', 'ですか', 'ですね'], a=1,
         why='じゃないです is how Lesson 2 makes a noun sentence negative.'),
    dict(q='＿＿は なんですか。（the thing in your own hand）', o=['これ', 'それ', 'あれ', 'どれ'], a=0,
         why='これ is near the speaker, それ near the listener, あれ far from both.'),
    dict(q='＿＿は なんですか。（the thing the other person is holding）', o=['これ', 'それ', 'あれ', 'どれ'], a=1,
         why='それ is the one near the listener.'),
    dict(q='＿＿ ほんは いくらですか。（that book, over by you）', o=['これ', 'この', 'その', 'あの'], a=2,
         why='この/その/あの go in front of a noun. これ/それ/あれ stand alone.'),
    dict(q='トイレは ＿＿ですか。', o=['だれ', 'どこ', 'なに', 'いくら'], a=1,
         why='どこ asks where.'),
    dict(q='これは ＿＿ かばんですか。（whose）', o=['だれの', 'だれ', 'どこの', 'なんの'], a=0,
         why='だれの + noun asks whose something is.'),
    dict(q='せんこうは ＿＿ですか。', o=['なに', 'なん', 'どこ', 'だれ'], a=1,
         why='なん before です; なに before a particle or in なにじん.'),
    dict(q='いま ＿＿ですか。', o=['なんさい', 'なんじ', 'なんばん', 'なんねんせい'], a=1,
         why='なんじ asks the time.'),
    dict(q='ソラさんは ＿＿ですか。（what year at university）', o=['なんさい', 'なんじ', 'なんねんせい', 'なんばん'], a=2,
         why='なんねんせい asks which year of study.'),
    dict(q='たけしさんは ＿＿ですか。（how old）', o=['なんさい', 'なんじ', 'なんばん', 'なんねんせい'], a=0,
         why='なんさい asks age.'),
    dict(q='でんわばんごうは ＿＿ですか。', o=['なんじ', 'なんばん', 'なんさい', 'どこ'], a=1,
         why='なんばん asks for a number such as a phone number.'),
    dict(q='この ぼうしは ＿＿ですか。（how much）', o=['いくら', 'なんばん', 'どこ', 'だれ'], a=0,
         why='いくら asks a price.'),
    dict(q='やさいを ＿＿。（I do not eat）', o=['たべます', 'たべません', 'たべる', 'たべましょう'], a=1,
         why='ます becomes ません for the polite negative.'),
    dict(q='おさけを ＿＿。（I drink）', o=['のむます', 'のみます', 'のまます', 'のびます'], a=1,
         why='のむ is a う-verb: the む becomes み before ます.'),
    dict(q='まいにち べんきょう＿＿。', o=['しります', 'します', 'すります', 'さます'], a=1,
         why='する is irregular: する → します.'),
    dict(q='あした がっこうに ＿＿。（I come）', o=['きます', 'くます', 'こます', 'きります'], a=0,
         why='くる is irregular: くる → きます.'),
    dict(q='テレビを ＿＿。（I watch）', o=['みるます', 'みります', 'みます', 'めます'], a=2,
         why='みる is a る-verb: drop る, add ます.'),
    dict(q='ぜんぜん テレビを ＿＿。', o=['みます', 'みません', 'みる', 'みましょう'], a=1,
         why='ぜんぜん and あまり need a negative verb to finish the sentence.'),
    dict(q='You meet your teacher at 8 p.m. ＿＿', o=['おはようございます', 'こんにちは', 'こんばんは', 'さようなら'], a=2,
         why='こんばんは once it is dark.'),
    dict(q='You are leaving the house. ＿＿', o=['ただいま', 'いってきます', 'おかえりなさい', 'いただきます'], a=1,
         why='The one leaving says いってきます; the one staying answers いってらっしゃい.'),
    dict(q='You have just got home. ＿＿', o=['いってきます', 'ただいま', 'いってらっしゃい', 'ごちそうさま'], a=1,
         why='ただいま on arriving home; おかえりなさい is the reply.'),
    dict(q='Before eating. ＿＿', o=['ごちそうさま', 'いただきます', 'おやすみなさい', 'どうぞ'], a=1,
         why='いただきます before the meal, ごちそうさま after it.'),
    dict(q='A shopkeeper greets you with ＿＿', o=['いらっしゃいませ', 'おねがいします', 'どうぞ', 'どうも'], a=0,
         why='いらっしゃいませ is what the shop says as you come in.'),
    dict(q='You decide to buy it: この かばんを ＿＿。', o=['ください', 'どうぞ', 'どうも', 'いくら'], a=0,
         why='（〜を）ください = please give me this one.'),
]

# ---------------------------------------------------------------- IV. writing sentences
# The words you are given (dictionary form for verbs, no particles), the English, and the
# sentence that answers it. `alt` holds any other wording the exam would also accept.
BUILD = [
    dict(w=['にく', 'わたし', 'たべる'], en="I don't eat meat.", a='わたしはにくをたべません。'),
    dict(w=['おんがく', 'わたしのおにいさん', 'きく', 'うち'], en="My older brother doesn't listen to music at home.",
         a='わたしのおにいさんはうちでおんがくをききません。'),
    dict(w=['コーヒー', 'わたし', 'のむ', 'まいにち'], en='I drink coffee every day.',
         a='わたしはまいにちコーヒーをのみます。'),
    dict(w=['テレビ', 'ともだち', 'みる', 'うち'], en='My friend watches TV at home.',
         a='ともだちはうちでテレビをみます。'),
    dict(w=['がっこう', 'わたし', 'いく', 'あした'], en='I am going to school tomorrow.',
         a='わたしはあしたがっこうにいきます。', alt=['わたしはあしたがっこうへいきます。']),
    dict(w=['にほんご', 'メアリーさん', 'はなす'], en='Mary speaks Japanese.',
         a='メアリーさんはにほんごをはなします。'),
    dict(w=['ざっし', 'わたし', 'よむ', 'ときどき'], en='I sometimes read magazines.',
         a='わたしはときどきざっしをよみます。'),
    dict(w=['おさけ', 'わたし', 'のむ', 'ぜんぜん'], en="I don't drink alcohol at all.",
         a='わたしはぜんぜんおさけをのみません。'),
    dict(w=['うち', 'たけしさん', 'かえる'], en='Takeshi goes home.', a='たけしさんはうちにかえります。',
         alt=['たけしさんはうちへかえります。']),
    dict(w=['べんきょうする', 'わたし', 'としょかん'], en='I study at the library.',
         a='わたしはとしょかんでべんきょうします。'),
    dict(w=['ばんごはん', 'わたし', 'たべる', 'うち'], en='I eat dinner at home.',
         a='わたしはうちでばんごはんをたべます。'),
    dict(w=['あさ', 'わたし', 'おきる', 'はやい'], en='I get up early in the morning.',
         a='わたしはあさはやくおきます。'),
    dict(w=['えいが', 'わたしのいもうと', 'みる', 'しゅうまつ'], en='My younger sister watches films at the weekend.',
         a='わたしのいもうとはしゅうまつにえいがをみます。',
         alt=['わたしのいもうとはしゅうまつえいがをみます。']),
    dict(w=['テニス', 'わたし', 'する', 'どようび'], en='I play tennis on Saturday.',
         a='わたしはどようびにテニスをします。', alt=['わたしはどようびテニスをします。']),
    dict(w=['おちゃ', 'おかあさん', 'のむ', 'あさ'], en='My mother drinks green tea in the morning.',
         a='おかあさんはあさおちゃをのみます。'),
    dict(w=['ねる', 'わたし', 'ぜんぜん'], en="I don't sleep at all.", a='わたしはぜんぜんねません。'),
    dict(w=['がっこう', 'ソラさん', 'くる', 'まいにち'], en='Sora comes to school every day.',
         a='ソラさんはまいにちがっこうにきます。', alt=['ソラさんはまいにちがっこうへきます。']),
    dict(w=['ハンバーガー', 'わたし', 'たべる', 'カフェ'], en='I eat a hamburger at the cafe.',
         a='わたしはカフェでハンバーガーをたべます。'),
    dict(w=['しんぶん', 'おとうさん', 'よむ', 'まいばん'], en='My father reads the newspaper every night.',
         a='おとうさんはまいばんしんぶんをよみます。'),
    dict(w=['にほんご', 'わたし', 'べんきょうする', 'たいてい', 'うち'],
         en='I usually study Japanese at home.', a='わたしはたいていうちでにほんごをべんきょうします。'),
]

# ---------------------------------------------------------------- V. completing exchanges
# One side is given; you supply the other. `a` is the expected answer, `alt` other acceptable
# ones, and `hint` the bracketed cue the exam prints alongside.
EXCHANGE = [
    dict(before='たけしさんは なんねんせいですか。', after='よねんせいです。', ask='after',
         a='よねんせいです。', hint='fourth-year student'),
    dict(before='としょかんは どこですか。', after='あそこですよ。', ask='before',
         a='としょかんはどこですか。', hint='ask where the library is'),
    dict(before='せんこうは なんですか。', after='にほんごです。', ask='before',
         a='せんこうはなんですか。', hint='ask what their major is'),
    dict(before='この かばんは いくらですか。', after='ごせんえんです。', ask='before',
         a='このかばんはいくらですか。', hint='ask the price of this bag'),
    dict(before='いま なんじですか。', after='ごぜんじゅうじです。', ask='before',
         a='いまなんじですか。', hint='ask the time'),
    dict(before='でんわばんごうは なんばんですか。', after='ろくまるよんのきゅうはちいちです。', ask='before',
         a='でんわばんごうはなんばんですか。', hint='ask for a phone number'),
    dict(before='これは だれの ぼうしですか。', after='ソラさんのぼうしです。', ask='before',
         a='これはだれのぼうしですか。', hint='ask whose hat this is'),
    dict(before='メアリーさんは なんさいですか。', after='じゅうきゅうさいです。', ask='after',
         a='じゅうきゅうさいです。', hint='19 years old'),
    dict(before='ソラさんは にほんじんですか。', after='いいえ、にほんじんじゃないです。', ask='after',
         a='いいえ、にほんじんじゃないです。', hint='no — say so in the negative'),
    dict(before='まいにち コーヒーを のみますか。', after='はい、のみます。', ask='after',
         a='はい、のみます。', hint='yes, you do'),
    dict(before='テレビを みますか。', after='いいえ、みません。', ask='after',
         a='いいえ、みません。', hint='no, you do not'),
    dict(before='なにを たべますか。', after='とんかつをたべます。', ask='after',
         a='とんかつをたべます。', hint='pork cutlet'),
    dict(before='どこで べんきょうしますか。', after='としょかんでべんきょうします。', ask='after',
         a='としょかんでべんきょうします。', hint='at the library'),
    dict(before='おなまえは なんですか。', after='メアリーです。', ask='before',
         a='おなまえはなんですか。', hint='ask their name'),
    dict(before='だいがくは どこですか。', after='アリゾナだいがくです。', ask='before',
         a='だいがくはどこですか。', hint='ask which university'),
]

# Statements for Part I. The app speaks one and offers three numbers; `kind` picks the frame.
LISTEN = [
    dict(kind='time', frame='いま、{}です。', q='What time is it?'),
    dict(kind='age', frame='わたしは{}さいです。', q='How old are they?'),
    dict(kind='yen', frame='これは{}えんです。', q='How much is it?'),
    dict(kind='year', frame='わたしは{}ねんせいです。', q='Which year student?'),
]


# ---------------------------------------------------------------- こそあど
# These are three sets of four that learners mix up, and the reason is that they vary along two
# axes at once: how far the thing is, and what grammatical shape it takes. Taught as a list they
# are twelve things to memorise; taught as a grid they are two decisions.
#
#            こ (by me)   そ (by you)   あ (away from us both)   ど (which?)
#  on its own  これ        それ          あれ                    どれ
#  + a noun    この〜      その〜        あの〜                  どの〜
#  a place     ここ        そこ          あそこ                  どこ
KOSOADO = dict(
    cols=[
        ('こ', 'by me', 'close to the speaker'),
        ('そ', 'by you', 'close to the listener'),
        ('あ', 'away from us both', 'far from both of us'),
        ('ど', 'which?', 'the question word'),
    ],
    rows=[
        ('thing', 'on its own', ['これ', 'それ', 'あれ', 'どれ'],
         'Stands in for the noun, like "this one". Never followed by the noun itself.'),
        ('noun', 'in front of a noun', ['この', 'その', 'あの', 'どの'],
         'Always has a noun after it: このほん, that book この is never alone.'),
        ('place', 'a place', ['ここ', 'そこ', 'あそこ', 'どこ'],
         'Means here / there / over there / where.'),
    ],
    # Situations, as (row, column, the cue you are shown). The app builds the options from the
    # grid itself, sometimes varying the distance and sometimes the shape, so each question
    # tests one decision rather than both at once.
    cues=[
        ('thing', 'こ', 'the thing in your own hand — "what is this?"'),
        ('thing', 'そ', 'the thing the other person is holding'),
        ('thing', 'あ', 'a thing across the room from both of you'),
        ('thing', 'ど', 'you cannot tell which one they mean'),
        ('thing', 'こ', 'you hold up a wallet: "this one is mine"'),
        ('thing', 'そ', 'they hold up a watch: "that one is expensive"'),
        ('thing', 'あ', 'a shop sign far down the street'),
        ('thing', 'ど', '"which one is Sora’s?"'),
        ('noun', 'こ', 'the book you are holding — "this book"'),
        ('noun', 'そ', 'the bag beside the person you are talking to'),
        ('noun', 'あ', 'the clock on the far wall — "that clock over there"'),
        ('noun', 'ど', '"which book is it?"'),
        ('noun', 'こ', 'the shoes on your own feet'),
        ('noun', 'そ', 'the newspaper on their desk'),
        ('noun', 'あ', 'the building across the road'),
        ('place', 'こ', 'where you are standing — "it is here"'),
        ('place', 'そ', 'where they are standing'),
        ('place', 'あ', 'over there, away from you both'),
        ('place', 'ど', 'asking where the toilet is'),
        ('place', 'こ', '"the bank is here" — pointing at your own spot'),
        ('place', 'あ', '"the library is over there" — across the campus'),
        ('place', 'ど', '"where is the post office?"'),
    ],
    # Whole exchanges, so the words are met in the shape the exam asks for them.
    lines=[
        ('これはなんですか。', 'What is this? (in my hand)'),
        ('それはなんですか。', 'What is that? (in your hand)'),
        ('あれはなんですか。', 'What is that over there?'),
        ('このかばんはいくらですか。', 'How much is this bag?'),
        ('そのとけいはたかいですね。', 'That watch of yours is expensive, isn’t it.'),
        ('あのぼうしはだれのぼうしですか。', 'Whose hat is that one over there?'),
        ('トイレはどこですか。', 'Where is the toilet?'),
        ('ぎんこうはあそこですよ。', 'The bank is over there.'),
        ('としょかんはここです。', 'The library is here.'),
        ('どれがソラさんのさいふですか。', 'Which one is Sora’s wallet?'),
    ],
)


# ---------------------------------------------------------------- Lesson 3 verbs
# Every verb the Lesson 3 slides introduce, with the group it belongs to, what it means, the
# polite forms, and the particle it takes. Group matters because it decides the conjugation,
# and one of these is a trap: かえる ends in る but is a う-verb, so it is かえります, not かえます.
#
# g: 'u' | 'ru' | 'irr'   p: the particle the verb normally takes
VERBS = [
    dict(v='いく', g='u', m='to go', ms='いきます', mn='いきません', p='に／へ (destination)',
         note='Destination takes に or へ: がっこうにいきます.'),
    dict(v='かえる', g='u', m='to go back, to return', ms='かえります', mn='かえりません', p='に／へ (destination)',
         note='Ends in る but is a う-verb. かえります, never かえます. This is the one the exam likes.',
         trap=1),
    dict(v='きく', g='u', m='to listen, to hear', ms='ききます', mn='ききません', p='を',
         note='おんがくをききます.'),
    dict(v='のむ', g='u', m='to drink', ms='のみます', mn='のみません', p='を',
         note='む becomes み: のみます.'),
    dict(v='はなす', g='u', m='to speak, to talk', ms='はなします', mn='はなしません', p='を／で (language)',
         note='にほんごをはなします, or にほんごではなします.'),
    dict(v='よむ', g='u', m='to read', ms='よみます', mn='よみません', p='を',
         note='Same shape as のむ: よみます.'),
    dict(v='おきる', g='ru', m='to get up', ms='おきます', mn='おきません', p='—',
         note='Drop る, add ます.'),
    dict(v='たべる', g='ru', m='to eat', ms='たべます', mn='たべません', p='を',
         note='にくをたべます.'),
    dict(v='ねる', g='ru', m='to sleep, to go to bed', ms='ねます', mn='ねません', p='—',
         note='Drop る, add ます.'),
    dict(v='みる', g='ru', m='to see, to look at, to watch', ms='みます', mn='みません', p='を',
         note='テレビをみます.'),
    dict(v='くる', g='irr', m='to come', ms='きます', mn='きません', p='に／へ (destination)',
         note='The stem changes sound: くる → きます.'),
    dict(v='する', g='irr', m='to do', ms='します', mn='しません', p='を',
         note='する → します. It joins nouns to make new verbs.'),
    dict(v='べんきょうする', g='irr', m='to study', ms='べんきょうします', mn='べんきょうしません', p='を',
         note='A noun plus する, so it conjugates like する.'),
]

VERB_GROUPS = [
    ('ru', 'る-verb', 'Base ends in e or i, plus る. Drop る and add ます.'),
    ('u', 'う-verb', 'Consonant base plus う. The last kana shifts to the i-row before ます.'),
    ('irr', 'irregular', 'Only する and くる, and anything built on them.'),
]
