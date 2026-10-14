# Takes every line Kaku speaks, and every answer it accepts, apart piece by piece and
# fails if anything appears that the lessons have not taught.
#
# No guessing: the allowed pieces are built from the lesson word lists themselves —
# each word plus the shapes it can take — along with the grammar words that belong to
# no lesson in particular (particles, the copula, inflection endings). A line passes
# only if the whole of it can be cut into those pieces.
import json, re, sys
from functools import lru_cache

# grammar, taught as grammar, never listed as vocabulary
GRAMMAR = """
は を が に へ で と も の か ね よ から まで や ので のに し ば な
です でした ですか でしょう でしょうか だ だった じゃ じゃない じゃないです じゃありません
ます ません ました ませんでした ましょう ましょうか ませんか
て で た だ ない なく なくて なかった なければ いけません いけない
いる ある いて あって いた あった います あります いません ありません
いました ありました ています ている ていました ていません でいます でいる
たい たく たくない すぎ すぎる すぎます すぎました たり だり
ください もいい もいいです ほう ほうが つもり こと もの とき ところ
思い 思う 思います 言い 言って 言っていました おもい おもう おもいます いって いっていました
なる なり なります なりました なった
この その あの どの なに なん どう どうして こう そう ああ
はい いいえ ええ うん あっ ん もちろん じゃあ では でも
こちら そちら どちら さん ちゃん くん
じゅう ひゃく びゃく ぴゃく せん ぜん まん
ひとり ふたり いくつ いちばん もっと より など
""".split()

ENDINGS = ['', 'ます', 'ません', 'ました', 'ませんでした', 'ましょう', 'ましょうか', 'ませんか',
           'たい', 'たいです', 'たくない', 'ながら', 'に', 'すぎ', 'すぎます', 'すぎました']
ROW = {'う': 'いわえおっ', 'く': 'きかけこい', 'ぐ': 'ぎがげごい', 'す': 'しさせそ',
       'つ': 'ちたてとっ', 'ぬ': 'になねのん', 'ぶ': 'びばべぼん', 'む': 'みまめもん',
       'る': 'りられろっ'}
TAILS = ['て', 'で', 'た', 'だ', 'ない', 'なかった', 'なければ', 'れば', 'よう', 'たら']


VERB_END = set('うくぐすつぬぶむる')


def verb_forms(word):
    """Every shape a verb might turn up in. Deliberately generous about endings, but
    only for words that can take them: a noun has no stem, and いいえ is not a verb."""
    out = {word}
    stem = word[:-1]
    if word[-1:] in VERB_END:
        for e in ENDINGS:
            out.add(stem + e)                  # ichidan: たべる -> たべます
        out |= {stem + t for t in TAILS}
    if len(word) >= 2 and word[-1:] in VERB_END:
        head, last = word[:-1], word[-1]
        for ch in ROW.get(last, ''):           # godan: いく -> いき, いか, いけ, いこ, いっ
            out.add(head + ch)
            out |= {head + ch + e for e in ENDINGS}
            out |= {head + ch + t for t in TAILS}
    if word.endswith('する'):
        s = word[:-2]
        out |= {s + 'し' + e for e in ENDINGS}
        out |= {s + x for x in ['し', 'して', 'した', 'しない', 'しなかった', 'しなければ', 'しよう', 'すれば', 'する']}
    if word == 'くる':
        out |= {'き', 'きます', 'きました', 'きて', 'きた', 'こない', 'こなかった'}
    if word == 'する':
        out |= {'し', 'します', 'しました', 'して', 'した', 'しない', 'しよう'}
    return out


def adj_forms(word):
    out = {word}
    if word.endswith('い') and len(word) > 1:
        s = word[:-1]
        out |= {s + x for x in ['い', 'かった', 'く', 'くない', 'くなかった', 'くて', 'ければ', 'さ']}
    out |= {word + x for x in ['です', 'でした', 'じゃない', 'じゃないです', 'な', 'に', 'で']}
    return out


def forms_for(lessons, upto, extra):
    forms = set(GRAMMAR) | set(extra or [])
    for les in lessons:
        if int(les['id']) > upto:
            continue
        for w, r, m in les['vocab']:
            for word in {w, r}:
                if word:
                    forms |= adj_forms(word) | verb_forms(word)
    return {f for f in forms if f}


NUMBER = re.compile(r'^(いち|に|さん|よん|し|ご|ろく|なな|しち|はち|きゅう|く|じゅう|ひゃく|びゃく|ぴゃく|せん|ぜん|まん)+$')


# Single kana that are words in their own right. Without this list any string at all can
# be cut into particles and number sounds, and the check waves everything through.
SMALL = {'は', 'を', 'が', 'に', 'へ', 'で', 'と', 'も', 'の', 'か', 'ね', 'よ', 'ん', 'て', 'た', 'だ', 'な', 'ば'}
# a one-kana verb stem (し of する, み of みる) counts only when an ending follows it
ENDS = set('たてまなよれだでろ')
COUNTERS = r'(じ|はん|ふん|ぷん|えん|つ|にん|ねん|がつ|にち|かい|ばん|まい|さい|こ|さつ|ひき)'
NUMBERISH = re.compile(r'^((いち|に|さん|よん|し|ご|ろく|なな|しち|はち|きゅう|く|じゅう|ひゃく|びゃく|ぴゃく|せん|ぜん|まん)+|'
                       r'[一二三四五六七八九十百千万〇]+)' + COUNTERS + r'?$')


def leftover(text, forms):
    """Cuts the line into known pieces, and reports the shortest list of characters it
    could not account for."""
    s = re.sub(r'[\s、。？！…「」（）]', '', text)
    if not s:
        return ''
    longest = max(len(f) for f in forms)
    n = len(s)

    @lru_cache(maxsize=None)
    def solve(i):
        if i == n:
            return ''
        best = None
        for size in range(min(longest, n - i), 0, -1):
            piece = s[i:i + size]
            ok_size = size > 1 or piece in SMALL or (
                piece in forms and i + 1 < n and s[i + 1] in ENDS)
            if ok_size and (piece in forms or NUMBERISH.match(piece)):
                rest = solve(i + size)
                if rest == '':
                    return ''
                if best is None or len(rest) < len(best):
                    best = rest
        here = s[i] + solve(i + 1)
        if best is None or len(here) < len(best):
            best = here
        return best

    out = solve(0)
    solve.cache_clear()
    return out


def check(lessons, scenes):
    problems = []
    for scene in scenes:
        extra = [p[0] for p in scene.get('phrases', [])] + list(scene.get('names', []))
        forms = forms_for(lessons, int(scene['lesson']), extra)
        for i, t in enumerate(scene['turns']):
            lines = [(f'turn {i + 1} say', t['say'])] + [(f'turn {i + 1} accept', a) for a in t['accept']]
            for where, line in lines:
                bad = leftover(line, forms)
                if bad:
                    problems.append(f"L{scene['lesson']} · {where}: {line}   not taught: {bad}")
    return problems


def check_teaches(lessons, scenes):
    """Every word a turn says it drills has to be a real entry, or grading goes nowhere."""
    known = {w for les in lessons for w, r, m in les['vocab']}
    return [f"L{s['lesson']} turn {i + 1}: teaches '{w}', which is not a word in any lesson"
            for s in scenes for i, t in enumerate(s['turns']) for w in t.get('teaches', []) if w not in known]


if __name__ == '__main__':
    lessons = json.load(open('/home/claude/kaku/lessons.json', encoding='utf-8'))['lessons']
    sys.path.insert(0, '/home/claude/kaku')
    from content_scenes import SCENES
    problems = check(lessons, SCENES) + check_teaches(lessons, SCENES)
    turns = sum(len(s['turns']) for s in SCENES)
    if problems:
        print(f'{len(problems)} problem(s):\n')
        for p in problems:
            print('  ' + p)
        sys.exit(1)
    print(f'{len(SCENES)} scenes, {turns} turns: every word comes from the lesson it belongs to.')
