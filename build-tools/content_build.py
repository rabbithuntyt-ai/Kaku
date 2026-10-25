# Parts IV and V, taken apart.
#
# A Part IV question hands you three or four words and asks for a sentence. That looks like one
# task and is really four, stacked:
#
#   1. work out what job each word is doing        (who is this about? what is being eaten?)
#   2. put the right particle on it                (は, を, で, に — or none at all)
#   3. put the pieces in an order Japanese allows  (verb last, topic first, the rest fairly free)
#   4. conjugate the verb                          (ます, or ません if the English is negative)
#
# Get any one of them wrong and the whole sentence is marked wrong, which is why someone can sit
# there getting none of them right and learn nothing from it: the mark does not say which of the
# four failed. So every sentence here is broken into its chunks, and the app can drill one
# decision at a time and say exactly which one went wrong.
#
# Part V is the same problem wearing different clothes. An exchange has a fixed shape, and the
# question word is what fixes it: どこ demands a place, いくら demands a price, ますか demands
# はい or いいえ plus the same verb back. Learn the pairings and the section stops being a
# memory test.

# ---------------------------------------------------------------- the jobs a word can do
# id: (short name, the particle, the question the job answers, what to teach about it)
JOBS = {
    'topic': ('topic', 'は', 'Who or what is this sentence about?',
              'The topic comes first and takes は. It is the thing the rest of the sentence is '
              'about — usually the person doing it. は is written with the kana は but said wa.'),
    'object': ('object', 'を', 'What is the verb acting on?',
               'The thing being eaten, read, watched, drunk. を and nothing else. If you can put '
               '"it" in the English — I eat IT — that word takes を.'),
    'place': ('where it happens', 'で', 'Where does the action take place?',
              'で marks the place an action happens: eating AT home, studying AT the library. '
              'Not に. に is for arriving somewhere, で is for doing something somewhere.'),
    'dest': ('destination', 'に', 'Where are you heading?',
             'いく, くる and かえる take a destination, and a destination takes に (or へ, which '
             'is also accepted). You are not doing something there, you are going there.'),
    'when': ('when', 'に', 'On what day or in what period?',
             'A day or a dated period takes に: どようびに, しゅうまつに. The に may be dropped '
             'and the exam accepts it either way, but putting it in is never wrong.'),
    'time': ('when', '', 'When?',
             'あした, きょう, あさ, こんばん — times measured from now rather than named on a '
             'calendar. These take no particle at all. Adding に to あした is a mistake.'),
    'freq': ('how often', '', 'How often?',
             'まいにち, よく, ときどき, たいてい, まいばん. No particle. They sit after the topic '
             'and before the rest of the sentence.'),
    'deg': ('how much', '', 'How much — and does it force a negative?',
            'あまり and ぜんぜん take no particle and force the verb negative: あまり...ません, '
            'ぜんぜん...ません. Writing them with ます is wrong even though it reads fine.'),
    'manner': ('how', '', 'How is it done?',
               'An い-adjective describing the verb drops い and takes く: はやい becomes はやく. '
               'No particle.'),
    'verb': ('the verb', '', 'What is being done?',
             'The verb is always last. Put it in its polite form: ます, or ません when the '
             'English says not.'),
}

# The order the jobs go in when a sentence has several. Japanese is freer than this, but the
# exam's answer key is not, and this order is the one every worked answer uses.
ORDER = ['topic', 'time', 'freq', 'deg', 'when', 'dest', 'place', 'manner', 'object', 'verb']

# ---------------------------------------------------------------- every Part IV sentence
# keyed by its answer, so a sentence and its breakdown cannot drift apart
# [chunk, particle, job]
PARTS = {
 'わたしはにくをたべません。': [
     ['わたし', 'は', 'topic'], ['にく', 'を', 'object'], ['たべる', '', 'verb']],
 'わたしのおにいさんはうちでおんがくをききません。': [
     ['わたしのおにいさん', 'は', 'topic'], ['うち', 'で', 'place'], ['おんがく', 'を', 'object'],
     ['きく', '', 'verb']],
 'わたしはまいにちコーヒーをのみます。': [
     ['わたし', 'は', 'topic'], ['まいにち', '', 'freq'], ['コーヒー', 'を', 'object'],
     ['のむ', '', 'verb']],
 'ともだちはうちでテレビをみます。': [
     ['ともだち', 'は', 'topic'], ['うち', 'で', 'place'], ['テレビ', 'を', 'object'],
     ['みる', '', 'verb']],
 'わたしはあしたがっこうにいきます。': [
     ['わたし', 'は', 'topic'], ['あした', '', 'time'], ['がっこう', 'に', 'dest'],
     ['いく', '', 'verb']],
 'メアリーさんはにほんごをはなします。': [
     ['メアリーさん', 'は', 'topic'], ['にほんご', 'を', 'object'], ['はなす', '', 'verb']],
 'わたしはときどきざっしをよみます。': [
     ['わたし', 'は', 'topic'], ['ときどき', '', 'freq'], ['ざっし', 'を', 'object'],
     ['よむ', '', 'verb']],
 'わたしはぜんぜんおさけをのみません。': [
     ['わたし', 'は', 'topic'], ['ぜんぜん', '', 'deg'], ['おさけ', 'を', 'object'],
     ['のむ', '', 'verb']],
 'たけしさんはうちにかえります。': [
     ['たけしさん', 'は', 'topic'], ['うち', 'に', 'dest'], ['かえる', '', 'verb']],
 'わたしはとしょかんでべんきょうします。': [
     ['わたし', 'は', 'topic'], ['としょかん', 'で', 'place'], ['べんきょうする', '', 'verb']],
 'わたしはうちでばんごはんをたべます。': [
     ['わたし', 'は', 'topic'], ['うち', 'で', 'place'], ['ばんごはん', 'を', 'object'],
     ['たべる', '', 'verb']],
 'わたしはあさはやくおきます。': [
     ['わたし', 'は', 'topic'], ['あさ', '', 'time'], ['はやく', '', 'manner'],
     ['おきる', '', 'verb']],
 'わたしのいもうとはしゅうまつにえいがをみます。': [
     ['わたしのいもうと', 'は', 'topic'], ['しゅうまつ', 'に', 'when'], ['えいが', 'を', 'object'],
     ['みる', '', 'verb']],
 'わたしはどようびにテニスをします。': [
     ['わたし', 'は', 'topic'], ['どようび', 'に', 'when'], ['テニス', 'を', 'object'],
     ['する', '', 'verb']],
 'おかあさんはあさおちゃをのみます。': [
     ['おかあさん', 'は', 'topic'], ['あさ', '', 'time'], ['おちゃ', 'を', 'object'],
     ['のむ', '', 'verb']],
 'わたしはぜんぜんねません。': [
     ['わたし', 'は', 'topic'], ['ぜんぜん', '', 'deg'], ['ねる', '', 'verb']],
 'ソラさんはまいにちがっこうにきます。': [
     ['ソラさん', 'は', 'topic'], ['まいにち', '', 'freq'], ['がっこう', 'に', 'dest'],
     ['くる', '', 'verb']],
 'わたしはカフェでハンバーガーをたべます。': [
     ['わたし', 'は', 'topic'], ['カフェ', 'で', 'place'], ['ハンバーガー', 'を', 'object'],
     ['たべる', '', 'verb']],
 'おとうさんはまいばんしんぶんをよみます。': [
     ['おとうさん', 'は', 'topic'], ['まいばん', '', 'freq'], ['しんぶん', 'を', 'object'],
     ['よむ', '', 'verb']],
 'わたしはたいていうちでにほんごをべんきょうします。': [
     ['わたし', 'は', 'topic'], ['たいてい', '', 'freq'], ['うち', 'で', 'place'],
     ['にほんご', 'を', 'object'], ['べんきょうする', '', 'verb']],
 'たなかさんはとしょかんにいきます。': [
     ['たなかさん', 'は', 'topic'], ['としょかん', 'に', 'dest'], ['いく', '', 'verb']],
 'ともだちはにほんにきます。': [
     ['ともだち', 'は', 'topic'], ['にほん', 'に', 'dest'], ['くる', '', 'verb']],
 'すずきさんはうちでおんがくをききます。': [
     ['すずきさん', 'は', 'topic'], ['うち', 'で', 'place'], ['おんがく', 'を', 'object'],
     ['きく', '', 'verb']],
 'わたしはうちでにほんごをはなします。': [
     ['わたし', 'は', 'topic'], ['うち', 'で', 'place'], ['にほんご', 'を', 'object'],
     ['はなす', '', 'verb']],
 'わたしはがっこうでひるごはんをたべません。': [
     ['わたし', 'は', 'topic'], ['がっこう', 'で', 'place'], ['ひるごはん', 'を', 'object'],
     ['たべる', '', 'verb']],
 'わたしはしゅうまつにサッカーをします。': [
     ['わたし', 'は', 'topic'], ['しゅうまつ', 'に', 'when'], ['サッカー', 'を', 'object'],
     ['する', '', 'verb']],
 'わたしのおとうとはよくロックをききます。': [
     ['わたしのおとうと', 'は', 'topic'], ['よく', '', 'freq'], ['ロック', 'を', 'object'],
     ['きく', '', 'verb']],
 'わたしはあまりおさけをのみません。': [
     ['わたし', 'は', 'topic'], ['あまり', '', 'deg'], ['おさけ', 'を', 'object'],
     ['のむ', '', 'verb']],
}

# ---------------------------------------------------------------- the shapes of Part V
# id: (the question words that trigger it, what kind of answer it demands, the shape of the
#      answer, what to teach about the pairing)
KINDS = {
    'where':  (['どこ'], 'a place', '〜です。',
               'どこ asks where something IS. The answer is the place and です — nothing else '
               'needs to come back. そこ, あそこ and a named place are all fair answers.'),
    'what':   (['なん', 'なに'], 'a thing', '〜です。',
               'なん／なに asks what something is. Give the thing and です. The question word is '
               'replaced by the answer; the rest of the sentence stays put.'),
    'who':    (['だれ'], 'a person', '〜です。',
               'だれ asks which person. Note it is not だれが here — だれ sits where the answer '
               'will sit.'),
    'whose':  (['だれの'], 'whose it is', '〜のです。',
               'だれの asks whose. The answer keeps the の: ソラさんのぼうしです. Dropping the の '
               'turns "Sora’s hat" into "Sora, a hat".'),
    'price':  (['いくら'], 'an amount of money', '〜えんです。',
               'いくら asks how much it costs. The answer is the number plus えん plus です. '
               'Watch the sound changes: ろっぴゃく, はっぴゃく, さんぜん.'),
    'time':   (['なんじ'], 'a time', '〜じです。',
               'なんじ asks what time. ごぜん and ごご go in front of the hour, not behind it, '
               'and はん comes after it: ごぜんじゅうじはんです.'),
    'age':    (['なんさい'], 'an age', '〜さいです。',
               'なんさい asks how old. Answer with the number plus さい. はたち is the one '
               'exception, at twenty.'),
    'year':   (['なんねんせい'], 'a school year', '〜ねんせいです。',
               'なんねんせい asks which year of study. The answer is the number plus ねんせい — '
               'いちねんせい through よねんせい.'),
    'number': (['なんばん'], 'a number', '〜です。',
               'なんばん asks for a number, usually a phone number. Read the digits one at a '
               'time and say の where the dash would be.'),
    'yesno':  ([], 'yes or no', 'はい、〜です。／いいえ、〜じゃないです。',
               'A question with no question word in it is a yes-or-no question. Answer はい or '
               'いいえ, then give the same shape back — じゃないです for the negative, never '
               'ではありません on this paper.'),
    'yesnov': ([], 'yes or no, with a verb', 'はい、〜ます。／いいえ、〜ません。',
               'A verb question answers with the same verb: はい、のみます or いいえ、のみません. '
               'You do not repeat the whole sentence, only the verb.'),
    'whatdo': (['なにを'], 'a thing plus the verb', '〜を〜ます。',
               'なにを asks what you do something to. The answer puts the thing where なに was, '
               'keeps the を, and keeps the verb.'),
    'wheredo': (['どこで'], 'a place plus the verb', '〜で〜ます。',
                'どこで asks where you do it. The place goes where どこ was, the で stays, and '
                'so does the verb. This is the one people answer with just a place — the verb '
                'has to come too.'),
}

# keyed by the question line, so an exchange and its shape cannot drift apart
EXQ = {
    'たけしさんは なんねんせいですか。': 'year',
    'としょかんは どこですか。': 'where',
    'せんこうは なんですか。': 'what',
    'この かばんは いくらですか。': 'price',
    'いま なんじですか。': 'time',
    'でんわばんごうは なんばんですか。': 'number',
    'これは だれの ぼうしですか。': 'whose',
    'メアリーさんは なんさいですか。': 'age',
    'ソラさんは にほんじんですか。': 'yesno',
    'まいにち コーヒーを のみますか。': 'yesnov',
    'テレビを みますか。': 'yesnov',
    'なにを たべますか。': 'whatdo',
    'どこで べんきょうしますか。': 'wheredo',
    'おなまえは なんですか。': 'what',
    'だいがくは どこですか。': 'where',
    'たけしさんは どこですか。': 'where',
    'それは だれの さいふですか。': 'whose',
    'あれは だれの かさですか。': 'whose',
}
