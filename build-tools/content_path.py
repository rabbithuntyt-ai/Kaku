# The route through, for someone who has never touched Japanese.
#
# Everything else in Kaku is a room you can walk into. That is right once you know what you
# need; it is useless on the first day, when nine tiles all look equally plausible and none of
# them says "start here". This file is the order. It follows the course — the kana rows in the
# order Class 1, 2 and 3 taught them, then the lessons in the order Genki teaches them — and it
# puts a test after each block so that moving on is a decision based on something.
#
# A step is a pointer at something that already exists. Nothing here is a second copy of the
# material: 'class' opens a catch-up class, 'words' practises a lesson's vocabulary, 'part'
# sits one section of the midterm. What this file adds is sequence, a reason for each step, and
# the running total of what has been covered, which is what the checkpoints sample from.

def step(id, k, t, why, ref=None, covers=None, mins=10, opt=None):
    # opt: settings this step needs switched over before it starts — the katakana step is
    # pointless if the chart is still showing hiragana.
    return dict(id=id, k=k, t=t, why=why, ref=ref, covers=covers or {}, mins=mins, opt=opt or {})


# covers: what sitting this step adds to the pool a later checkpoint may ask from.
#   kana   rows of the chart          words  a lesson's course vocabulary
#   nums   number bands               kata   the katakana section
#   cls    a catch-up class's check questions
#   grid   the こそあど twelve        verbs  the Lesson 3 verbs
#   gram   the grammar bank           build / exch  the sentence sections

STAGES = [
    dict(id='start', n='Before any Japanese', sub='What the writing is, and the first forty-six sounds', steps=[
        step('writing', 'class', 'What the three writing systems are',
             'Before a single kana: why Japanese is written three ways at once, and which one your '
             'midterm will accept.', ref='writing', covers=dict(cls=['writing']), mins=6),
        step('kana-aks', 'kana', 'The first three lines — あ, か, さ',
             'Class 1 taught these fifteen. Write them to the sound, then read them back.',
             ref=['a', 'k', 's'], covers=dict(kana=['a', 'k', 's']), mins=15, opt=dict(script='h')),
        step('ck-kana1', 'check', 'Checkpoint — the first fifteen',
             'A short mixed test. If these are not automatic yet, the next thirty will not stick.',
             ref=dict(n=10), mins=5),
        step('kana-tnh', 'kana', 'The next three lines — た, な, は',
             'Class 2. ち, つ and ふ are the three that trip everyone; they are in here.',
             ref=['t', 'n', 'h'], covers=dict(kana=['t', 'n', 'h']), mins=15, opt=dict(script='h')),
        step('kana-myrw', 'kana', 'The last lines — ま, や, ら, わ',
             'Class 3, and that is all forty-six basic kana.',
             ref=['m', 'y', 'r', 'w'], covers=dict(kana=['m', 'y', 'r', 'w']), mins=15, opt=dict(script='h')),
        step('kanaextra', 'class', 'The marks that change a kana',
             'Two dots, a circle, a small kana, a doubled consonant. Five rules and the chart '
             'covers every sound in the language.', ref='kanaextra',
             covers=dict(cls=['kanaextra']), mins=8),
        step('kana-dk', 'kana', 'The voiced lines — が, ざ, だ, ば, ぱ',
             'Same shapes, two dots. Twenty-five more sounds for almost no new work.',
             ref=['g', 'z', 'd', 'b', 'p'], covers=dict(kana=['g', 'z', 'd', 'b', 'p']), mins=12,
             opt=dict(script='h')),
        step('ck-kana2', 'check', 'Checkpoint — all of hiragana',
             'Every line so far, mixed. This is the floor everything else stands on.',
             ref=dict(n=14), mins=7),
    ]),

    dict(id='first', n='The first things you can say', sub='Greetings, and the numbers behind half the midterm', steps=[
        step('greetings', 'class', 'Greetings, and the ones that come in pairs',
             'Class 1 again. Several of these are halves of an exchange — the other half is '
             'expected back.', ref='greetings', covers=dict(cls=['greetings']), mins=8),
        step('words-0', 'words', 'The greeting words themselves',
             'Sixteen set phrases. They are free marks on any paper and the first Japanese you '
             'will actually use.', ref='0', covers=dict(words=['0']), mins=12),
        step('numbers', 'class', 'Numbers, and the three that change sound',
             'The counting is regular. Three numbers are not, and those three are exactly what '
             'Part I of the midterm listens for.', ref='numbers', covers=dict(cls=['numbers']), mins=8),
        step('nums-100', 'nums', 'One to ninety-nine',
             'Hear it, write the number. This is Part I practice before Part I exists.',
             ref=['n:1', 'n:2'], covers=dict(nums=['n:1', 'n:2']), mins=12),
        step('ck-first', 'check', 'Checkpoint — kana, greetings and numbers',
             'Everything so far together, in a random order, the way a paper asks it.',
             ref=dict(n=14), mins=7),
    ]),

    dict(id='l1', n='Lesson 1 · New friends', sub='Saying who you are, and asking', steps=[
        step('words-1', 'words', 'Lesson 1 vocabulary',
             'School, people, time, countries, majors, occupations, family. The biggest single '
             'block of words on the midterm.', ref='1', covers=dict(words=['1']), mins=25),
        step('wa', 'class', 'は: the topic',
             'The first particle, and the one that makes a Japanese sentence possible at all.',
             ref='wa', covers=dict(cls=['wa']), mins=8),
        step('no', 'class', 'の: gluing two nouns',
             'Two nouns, one idea. It is how you say "my", "a student of", "Japanese language".',
             ref='no', covers=dict(cls=['no']), mins=7),
        step('ka', 'class', 'か: asking instead of telling',
             'One kana on the end turns a statement into a question. No word order changes.',
             ref='ka', covers=dict(cls=['ka']), mins=7),
        step('qwords', 'class', 'The question words and their counters',
             'なん attaches to a counter: なんじ, なんさい, なんねんせい. The study guide lists '
             'these one by one for a reason.', ref='qwords', covers=dict(cls=['qwords']), mins=9),
        step('drill-1', 'drill', 'Lesson 1 drills',
             'A situation, four ways to say it, one that fits. Where the grammar stops being '
             'abstract.', ref='1', covers=dict(gram=True), mins=12),
        step('talk-1', 'talk', 'Say Lesson 1 out loud',
             'Meeting someone: name, year, major, where you are from. Out loud, because the '
             'midterm has a spoken half somewhere behind it.', ref='1', mins=12),
        step('ck-l1', 'check', 'Checkpoint — through Lesson 1',
             'Kana, numbers, greetings and all of Lesson 1, sampled at random.',
             ref=dict(n=16), mins=9),
    ]),

    dict(id='kata', n='Katakana', sub='The second alphabet, and Section II of the paper', steps=[
        step('kata-read', 'kana', 'Read the katakana chart',
             'Same sounds, different shapes. Switch the chart over and read the same forty-six '
             'back in the other script.', ref=['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'],
             covers=dict(kana=['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w']), mins=18,
             opt=dict(script='k', mix='read')),
        step('kata-words', 'kata', 'The eighteen katakana words on the paper',
             'An English word in, katakana out. Section II is eight of these and nothing else.',
             covers=dict(kata=True), mins=15),
        step('kata-hand', 'kwrite', 'Write the katakana by hand',
             'Section II is not multiple choice: you write the shapes yourself, on paper. This is '
             'the same thing with a finger.', mins=15),
        step('ck-kata', 'check', 'Checkpoint — katakana included',
             'Now with the katakana words mixed in among everything else.',
             ref=dict(n=16), mins=9),
    ]),

    dict(id='l2', n='Lesson 2 · Shopping', sub='Pointing at things, and saying what they cost', steps=[
        step('words-2', 'words', 'Lesson 2 vocabulary',
             'Things, places, food, money. Shorter than Lesson 1 and leans on words that point.',
             ref='2', covers=dict(words=['2']), mins=20),
        step('kosoado', 'class', 'こ・そ・あ・ど: two decisions, not twelve words',
             'Twelve words that are really a four-by-three grid. Learn the grid and the twelve '
             'are free.', ref='kosoado', covers=dict(cls=['kosoado']), mins=10),
        step('grid', 'grid', 'Drill the こそあど grid',
             'One decision at a time: how far away, and what kind of word. A wrong answer tells '
             'you which of the two you are unsure about.', covers=dict(grid=True), mins=12),
        step('mo', 'class', 'も: too',
             'It replaces は rather than joining it. The commonest particle mistake there is.',
             ref='mo', covers=dict(cls=['mo']), mins=6),
        step('janai', 'class', 'じゃないです: saying it is not',
             'です has a negative, and it is not ではありません on this paper.',
             ref='janai', covers=dict(cls=['janai']), mins=7),
        step('neyo', 'class', 'ね and よ: checking and telling',
             'Two syllables that carry what English does with tone of voice.',
             ref='neyo', covers=dict(cls=['neyo']), mins=7),
        step('drill-2', 'drill', 'Lesson 2 drills',
             'Shopping, pointing, prices — in the situations they come up in.', ref='2',
             covers=dict(gram=True), mins=12),
        step('talk-2', 'talk', 'Say Lesson 2 out loud',
             'Buying something: asking what it is, how much, and taking it.', ref='2', mins=12),
        step('ck-l2', 'check', 'Checkpoint — through Lesson 2',
             'Two lessons, both scripts, numbers and the grid. This is most of the midterm.',
             ref=dict(n=18), mins=10),
    ]),

    dict(id='l3', n='Lesson 3 · Making a date', sub='Verbs, at last', steps=[
        step('particles', 'class', 'Particles: what they are for',
             'Read this before the verbs. Lesson 3 is the first lesson where a sentence has '
             'several labelled parts, and the labels are the whole trick.',
             ref='particles', covers=dict(cls=['particles']), mins=12),
        step('words-3', 'words', 'Lesson 3 vocabulary',
             'Food, places, times, and thirteen verbs. The verbs are the ones Part IV asks you '
             'to conjugate.', ref='3', covers=dict(words=['3']), mins=25),
        step('vgroups', 'class', 'The three verb groups',
             'う, る, irregular. Which group a verb is in decides every form it ever takes, so '
             'this is the one thing to know cold.', ref='vgroups', covers=dict(cls=['vgroups']), mins=10),
        step('verbs', 'verbs', 'The thirteen verbs, group and ます form',
             'From memory: the group, the meaning, and the polite form. Four things per verb.',
             covers=dict(verbs=True), mins=18),
        step('masu', 'class', 'ます and ません',
             'One ending covers the present and the future. The negative is where marks go '
             'missing.', ref='masu', covers=dict(cls=['masu']), mins=8),
        step('adverbs', 'class', 'あまり and ぜんぜん need a negative',
             'Two adverbs that force the verb negative. Writing them with ます is wrong even '
             'though it reads fine.', ref='adverbs', covers=dict(cls=['adverbs']), mins=7),
        step('drill-3', 'drill', 'Lesson 3 drills',
             'Time, frequency, invitations — the sentences Part IV is made of.', ref='3',
             covers=dict(gram=True), mins=12),
        step('talk-3', 'talk', 'Say Lesson 3 out loud',
             'Asking someone out: what, when, and whether they want to.', ref='3', mins=12),
        step('ck-l3', 'check', 'Checkpoint — everything the midterm covers',
             'All three lessons, both scripts, numbers, the grid and the verbs. The last check '
             'before the paper itself.', ref=dict(n=20), mins=12),
    ]),

    dict(id='mid', n='The midterm', sub='The five sections, one at a time, then the whole paper', steps=[
        step('part-listen', 'part', 'Part I — Listening',
             'A line read twice, and a number to pick out of it. Five marks.', ref='listen',
             covers=dict(nums=['n:1', 'n:2', 'n:3']), mins=10),
        step('part-kata', 'part', 'Part II — Katakana',
             'Eight English words to write in katakana.', ref='kata', covers=dict(kata=True), mins=10),
        step('part-vg', 'part', 'Part III — Vocabulary and grammar',
             'Fifteen multiple choice over the whole course.', ref='vg', covers=dict(gram=True), mins=15),
        step('make-sent', 'maker', 'Learn to write the sentences',
             'Four decisions hide inside one Part IV answer. This drills them one at a time and '
             'climbs, instead of marking whole sentences wrong.', ref='sent',
             covers=dict(build=True), mins=25),
        step('part-build', 'part', 'Part IV — Writing sentences',
             'Words given, order and particles and conjugation yours. Five marks and the '
             'hardest five.', ref='build', covers=dict(build=True), mins=15),
        step('make-exch', 'maker', 'Learn to complete the exchanges',
             'Every exchange turns on its question word. Find it, name what it wants back, then '
             'write the line.', ref='exch', covers=dict(exch=True), mins=20),
        step('part-ex', 'part', 'Part V — Completing exchanges',
             'Half a conversation given, the other half missing.', ref='ex',
             covers=dict(exch=True), mins=12),
        step('mock', 'exam', 'The whole paper, marked as you go',
             'All five parts in order, with the two readiness numbers afterwards.', mins=45),
        step('mock-strict', 'exam', 'The whole paper under exam conditions',
             'Sixty minutes, no marking until the end. Worth doing once, to find out whether you '
             'are fast enough.', ref='strict', mins=60),
    ]),

    dict(id='after', n='After the midterm', sub='Where the final will go', steps=[
        step('keep', 'keep', 'Keep the three lessons warm',
             'The final is cumulative. Ten minutes of review a day costs less than relearning '
             'Lesson 1 in December.', mins=10),
        step('final', 'final', 'The final exam',
             'Locked until the study guide exists. When you have it, the sections and the '
             'readiness numbers get built the same way the midterm’s were.', mins=0),
    ]),
]

PATH = [dict(stage=st['id'], **s) for st in STAGES for s in st['steps']]
PATH_STAGES = [dict(id=s['id'], n=s['n'], sub=s['sub'], steps=[x['id'] for x in s['steps']]) for s in STAGES]
