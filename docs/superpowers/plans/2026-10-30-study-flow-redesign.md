# 학습 흐름 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈을 Day별 단어 목록으로, 학습 탭을 "표제어 + 뜻 목록(뜻을 꾹 누르면 그 뜻의 동의어) + 마지막 뜻 아래 예문(영어 → 터치로 해석 → 누르고 있는 동안 맥락 뜻)"으로 바꾸고, 영영풀이·반의어·파생어·유의어를 데이터와 화면에서 뺀다. 동의어는 뜻별이다.

**Architecture:** 데이터 계층(`src/data/`)을 먼저 새 구조(v2)로 바꾸고(옛 저장 데이터는 읽을 때 변환) Jest로 검증한다. 그 위에 단어 폼, 홈 Day 목록, 학습 화면을 차례로 옮긴다. 화면 동작(꾹 누르기, 예문 단계)은 작은 컴포넌트(`MeaningRow`, `ExampleBlock`)로 나누고 눌림 상태는 컴포넌트 로컬 상태로 둔다. 학습 목록 계산(`studyList`)과 Day별 묶기(`groupByChapter`)는 순수 함수다.

**Tech Stack:** Expo SDK 57 / Expo Router / react-native-web / react-native-gesture-handler / TypeScript 6 / Jest 29(`jest-expo`).

**Spec:** `docs/superpowers/specs/2026-10-28-study-flow-redesign.md` (PR #12에서 검토 중이며 이 브랜치에 포함돼 있다).

## Global Constraints

- 작업 위치: `/Users/JM/dev/ssen/ssen-app`, 브랜치 `feature/10-study-flow`(이슈 #10). 코드 스타일은 들여쓰기 2칸, 작은따옴표, 세미콜론. 모든 글자는 `AppText`로 그린다(`AppText` 안에 `AppText` 중첩 금지, 인라인 조각은 RN `Text`). `StyleSheet.absoluteFillObject` 금지. 테스트 파일은 `src/app` 아래에 두지 않는다(jest가 무시한다).
- 검증 명령: `npm run typecheck`, `npm test`, `npm run build:web`. **Task 1~3 동안은 아직 옛 필드를 쓰는 화면 파일이 남아 있어 `npm run typecheck`가 일부 실패하는 것이 정상이다.** 각 태스크는 그 태스크가 다루는 파일에 타입 오류가 없는지만 확인한다(명령은 태스크마다 적었다). **Task 4가 끝나면 전체 `typecheck`가 통과해야 한다.**
- 새 데이터 구조(스펙 "데이터 구조 v2"): `Word = { id, word, meanings: string[], synonyms: string[](meanings와 같은 길이, 각 칸은 쉼표로 이은 영단어), chapter, details: { example, exampleKo, exampleMeaning } }`. `definitions`, 반의어, 파생어, 유의어, `details.synonyms`는 없다. 저장 키 `pocket-vocab-words-v1`, `pocket-vocab-prefs-v1`는 그대로 쓴다.
- 암기 모드: `MaskField = 'word' | 'meaning'`, `Prefs = { maskWord, maskMeaning, activeChapter }`(`maskDetails` 없음). 학습 화면은 암기 모드를 따르지 않는다(항상 뜻이 보인다).
- 학습 화면 문구(정확히): 뜻 목록 머리글 `뜻` + 오른쪽 `{n}개의 뜻 · 꾹 누르면 동의어`, 동의어가 비었을 때 `등록된 동의어가 없어요`, 예문이 없을 때 `예문이 아직 없어요.`, 푸터 오른쪽 힌트는 기본 `↖  뜻을 꾹 누르면 동의어가 보여요`, 해석이 열려 있으면 `↖  해석을 꾹 누르면 맥락 뜻이 보여요`. 푸터 왼쪽 `⇆  스크롤 · 좌우 밀기로 다음 단어`는 그대로.
- 꾹 누르기: `Pressable`의 `onPressIn`/`onPressOut`으로 누르는 동안만 보이게 한다. 글자 선택·길게 누르기 메뉴가 뜨지 않게 한다(`userSelect: 'none'`, 웹 `contextmenu` 취소).
- 새 화면의 시각 값은 기존 화면의 값(원본 프로토타입에서 옮긴 값)을 재사용한다. 임의로 새 색·크기를 만들지 않는다.
- 커밋 메시지에 **AI attribution을 넣지 않는다**(`Co-Authored-By:`, `Generated with`, 로봇 이모지). 이 조직의 `AGENTS.md`와 GitHub Ruleset이 막는다. 커밋 제목은 한국어 `feat: ... (#10)`.
- 2026-10-30 추가 요구(사용자): 하단 탭 순서 `홈, 학습, 시험, 내 정보`(추가 탭 삭제), 홈의 `단어 추가`·`내 정보` 박스 삭제, Day 선택 드롭박스를 만들고 암기 모드를 그 카드 안으로 옮긴다, 영어/뜻 가리기는 선택한 Day 안에서 일관되게 적용. 단어 추가는 관리자 + 엑셀 업로드 전용이 될 예정이라 이번 범위에서는 탭·홈 진입점만 숨기고(라우트 `/add`와 폼 코드는 그대로 둔다), 관리자 권한 판별과 엑셀 업로드는 만들지 않는다. → Task 5.
- 범위 밖: 서버 연동, 교사 업로드, 챕터 관리, 나만의 단어장, 네이티브 확인, 키보드 화살표 넘기기.

## Review Focus

1. **옛 저장 데이터**(`definitions`, 반의어·파생어·유의어, 단어 하나에 하나뿐인 `details.synonyms`): 새 구조로 읽히고 오류가 없으며, 옛 동의어는 첫 뜻에 붙는다. 이상한 값(`synonyms`가 숫자·객체·배열 속 비문자열)은 `''`로 처리된다. → Task 1 `normalize.test.ts`, Task 4 브라우저 확인(localStorage에 옛 데이터를 넣고 새로고침).
2. **뜻은 있는데 동의어가 비어 있거나 뜻이 하나뿐인 단어**: 꾹 눌러도 오류 없이 `등록된 동의어가 없어요`가 보인다. → Task 4.
3. **예문의 네 가지 경우**(예문 없음 / 영어만 / 해석만 / 맥락 뜻이 해석에 없음): 각각 `예문이 아직 없어요.`, 터치해도 열리지 않음, `영어 예문이 없어요.` + 터치로 해석 열림, 가리지 않고 해석 그대로. → Task 4.
4. **학습 목록 진입**: 파라미터 없음(전체, Day 순서), 있는 id(그 Day에서 그 단어부터), 없는 id(전체로 폴백), 단어가 하나뿐인 Day. → Task 4 `study.test.ts`.
5. **뜻이 많아 화면보다 길어지는 단어**: 마우스 휠이 스크롤을 가로채 단어를 넘기지 않는다. → Task 4 브라우저 확인.
6. **마우스 드래그로 넘긴 직후의 클릭**이 예문 토글로 새지 않는다. → Task 4 브라우저 확인.
7. **홈 줄의 눌림 구분**: 가려진 영단어·뜻을 누르면 그 부분만 보이고 이동하지 않으며, 가려지지 않은 부분을 누르면 학습으로 이동한다. → Task 3 브라우저 확인.
8. **Day 선택**: 선택한 Day가 삭제되어 사라졌을 때 `전체`로 되돌아오고, Day를 바꾸면 이전 Day에서 펼쳐 둔 정답이 새 Day에 남지 않으며, `전체 정답 보기`가 선택한 Day의 단어에만 적용된다. → Task 5.

---

### Task 1: 데이터 구조 v2 — 타입, 옛 데이터 변환, 샘플, 폼 변환, 필터, 암기 모드, Day별 묶기

**Files:**
- Modify: `src/data/types.ts`, `src/data/normalize.ts`, `src/data/samples.ts`, `src/data/wordForm.ts`, `src/data/filter.ts`, `src/data/mask.ts`, `src/data/wordList.ts`, `src/data/storage.ts`
- Test (전체 교체): `src/data/normalize.test.ts`, `src/data/wordForm.test.ts`, `src/data/filter.test.ts`, `src/data/mask.test.ts`, `src/data/wordList.test.ts`
- Test (수정): `src/data/storage.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `WordDetails { example; exampleKo; exampleMeaning }`, `Word { id; word; meanings; synonyms; chapter; details }`, `Prefs { maskWord; maskMeaning; activeChapter }`, `MaskField = 'word' | 'meaning'`, `ShownMap`
  - `normalize.ts`: `blankDetails()`, `splitMeanings(value)`, `alignList(meanings: string[], values: unknown[]): string[]`(기존 `alignDefinitions`의 새 이름), `makeId()`, `normalizeWord(input)`
  - `wordForm.ts`: `FormValues { word; chapter; meaning; synonyms; example; exampleKo; exampleMeaning }`, `emptyForm(chapter)`, `formFromWord(word)`, `buildWord(values, id, previous?)`
  - `filter.ts`: `wordsInChapter(words, chapter)`, `searchWords(words, query, chapter)`(표제어·뜻·동의어·예문·해석에서 찾음). `detailRows`, `DetailKey`, `DETAIL_LABELS`는 삭제한다.
  - `mask.ts`: `isShown`, `isMasked`, `toggleField`, `cardVisible`, `anyCardVisible`, `toggleAll`(모두 `'word' | 'meaning'` 두 필드만 다룬다). `toggleCard`, `hasMask`는 삭제한다.
  - `wordList.ts`: 기존 `upsertWord`, `removeWord`, `chapterOptions` + `ChapterGroup { chapter; words }`, `compareChapters(a, b)`(숫자 순서), `groupByChapter(words): ChapterGroup[]`(챕터 순서 정렬, 챕터 안은 저장된 순서), `orderedWords(words): Word[]`(그룹 순서대로 펼친 목록)
  - `storage.ts`: `DEFAULT_PREFS = { maskWord: false, maskMeaning: true, activeChapter: 'all' }`

이 태스크는 `src/data/`만 바꾼다. `study.ts`는 건드리지 않는다(Task 4). 검증은 jest만 한다.

- [ ] **Step 1: 타입 교체** — `src/data/types.ts` 전체

```ts
export type WordDetails = {
  example: string;
  exampleKo: string;
  exampleMeaning: string;
};

export type Word = {
  id: string;
  word: string;
  meanings: string[];
  // meanings와 같은 길이. synonyms[i]는 i번째 뜻의 동의어를 쉼표로 이은 문자열('' 허용)
  synonyms: string[];
  chapter: string;
  details: WordDetails;
};

export type Prefs = {
  maskWord: boolean;
  maskMeaning: boolean;
  activeChapter: string;
};

export type MaskField = 'word' | 'meaning';

export type ShownMap = Record<string, Partial<Record<MaskField, boolean>>>;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/data/normalize.test.ts` 전체:

```ts
import { alignList, blankDetails, normalizeWord, splitMeanings } from './normalize';
import { SAMPLE_WORDS } from './samples';

describe('splitMeanings', () => {
  it('splits on newlines and semicolons and trims', () => {
    expect(splitMeanings('회복력이 있는\n탄력 있는; 강한 ')).toEqual(['회복력이 있는', '탄력 있는', '강한']);
  });

  it('keeps array items, dropping blanks', () => {
    expect(splitMeanings([' 통찰력 ', '', '이해'])).toEqual(['통찰력', '이해']);
  });

  it('returns an empty list for missing values', () => {
    expect(splitMeanings(undefined)).toEqual([]);
  });
});

describe('alignList', () => {
  it('pads missing entries and drops extras so lengths match the meanings', () => {
    expect(alignList(['a', 'b', 'c'], ['one', ' two '])).toEqual(['one', 'two', '']);
    expect(alignList(['a'], ['one', 'two'])).toEqual(['one']);
  });
});

describe('normalizeWord', () => {
  it('fills defaults for a minimal record', () => {
    const word = normalizeWord({ word: ' resilient ', meanings: ['회복력이 있는'] });
    expect(word.word).toBe('resilient');
    expect(word.chapter).toBe('Day 1');
    expect(word.synonyms).toEqual(['']);
    expect(word.details).toEqual(blankDetails());
    expect(word.id).not.toBe('');
  });

  it('reads the legacy singular meaning and drops the removed fields', () => {
    const word = normalizeWord({
      id: 'w1',
      word: 'derive',
      meaning: '이끌어내다;유래하다',
      chapter: '  ',
      definitions: ['to obtain', 'to originate'],
      details: {
        definition: 'to obtain\nto originate',
        example: 'We derive it.',
        antonyms: 'a',
        derived: 'd',
        related: 'r',
      },
    });
    expect(word.id).toBe('w1');
    expect(word.meanings).toEqual(['이끌어내다', '유래하다']);
    expect(word.synonyms).toEqual(['', '']);
    expect(word.chapter).toBe('Day 1');
    expect(word.details).toEqual({ example: 'We derive it.', exampleKo: '', exampleMeaning: '' });
    expect('definitions' in word).toBe(false);
  });

  it('moves the old one-per-word synonyms string onto the first meaning', () => {
    const word = normalizeWord({
      word: 'cultivate',
      meanings: ['경작하다', '기르다', '관계를 쌓다'],
      details: { synonyms: 'nurture, develop, foster' },
    });
    expect(word.synonyms).toEqual(['nurture, develop, foster', '', '']);
  });

  it('keeps a per-meaning synonyms array aligned to the meanings', () => {
    expect(normalizeWord({ word: 'a', meanings: ['x', 'y'], synonyms: ['s1'] }).synonyms).toEqual(['s1', '']);
    expect(normalizeWord({ word: 'a', meanings: ['x'], synonyms: ['s1', 's2'] }).synonyms).toEqual(['s1']);
  });

  it('treats strange synonyms values as empty instead of throwing', () => {
    expect(normalizeWord({ word: 'a', meanings: ['x', 'y', 'z'], synonyms: [5, null, {}] }).synonyms).toEqual(['', '', '']);
    expect(normalizeWord({ word: 'a', meanings: ['x'], synonyms: 5, details: { synonyms: 'legacy' } }).synonyms).toEqual(['legacy']);
    expect(normalizeWord({ word: 'a', meanings: ['x'], synonyms: 5 }).synonyms).toEqual(['']);
  });

  it('turns non-object input into an empty word instead of throwing', () => {
    const word = normalizeWord('garbage');
    expect(word.word).toBe('');
    expect(word.meanings).toEqual([]);
    expect(word.synonyms).toEqual([]);
  });

  it('leaves the bundled samples unchanged', () => {
    for (const sample of SAMPLE_WORDS) {
      expect(normalizeWord(sample)).toEqual(sample);
    }
  });
});
```

`src/data/wordForm.test.ts` 전체:

```ts
import { blankDetails } from './normalize';
import type { Word } from './types';
import { buildWord, emptyForm, formFromWord, type FormValues } from './wordForm';

const base: FormValues = { ...emptyForm('Day 2'), word: 'insight', meaning: '통찰력' };

function legacy(overrides: Partial<Word['details']> = {}): Word {
  return {
    id: 'w1',
    word: 'insight',
    meanings: ['통찰력'],
    synonyms: [''],
    chapter: 'Day 2',
    details: { ...blankDetails(), ...overrides },
  };
}

describe('emptyForm', () => {
  it('starts blank with the given chapter', () => {
    expect(emptyForm('Day 3')).toEqual({
      word: '', chapter: 'Day 3', meaning: '', synonyms: '', example: '', exampleKo: '', exampleMeaning: '',
    });
  });
});

describe('buildWord', () => {
  it('requires a word and a meaning', () => {
    const message = '영단어와 뜻을 입력해 주세요';
    expect(buildWord({ ...base, word: '  ' }, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...base, meaning: ' \n ' }, 'n')).toEqual({ ok: false, message });
  });

  it('builds a trimmed word with the supplied id', () => {
    const result = buildWord({ ...base, word: '  insight ', synonyms: ' vision ', chapter: '' }, 'n1');
    expect(result).toEqual({
      ok: true,
      word: { id: 'n1', word: 'insight', meanings: ['통찰력'], synonyms: ['vision'], chapter: 'Day 1', details: blankDetails() },
    });
  });

  it('aligns multi-line synonyms to the meanings, one line per meaning', () => {
    const result = buildWord({ ...base, meaning: '통찰력\n식견\n안목', synonyms: 'a, b\n\nc\nextra' }, 'n');
    expect(result.ok && result.word.meanings).toEqual(['통찰력', '식견', '안목']);
    expect(result.ok && result.word.synonyms).toEqual(['a, b', '', 'c']);
  });

  it('requires English and Korean examples together when added', () => {
    const message = '영어와 한국어 예문을 함께 입력해 주세요';
    expect(buildWord({ ...base, example: 'A sentence.' }, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...base, exampleKo: '문장' }, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...base, example: 'A sentence.', exampleKo: '문장' }, 'n').ok).toBe(true);
  });

  it('requires the used meaning to appear in the Korean example', () => {
    const message = '사용된 뜻은 한국어 예문에 적힌 표현으로 입력해 주세요';
    const values = { ...base, example: 'A sentence.', exampleKo: '통찰력이 있다', exampleMeaning: '식견' };
    expect(buildWord(values, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...values, exampleMeaning: '통찰력' }, 'n').ok).toBe(true);
  });

  it('does not re-validate an unchanged legacy half-filled example on edit', () => {
    const previous = legacy({ example: 'Only English.' });
    const values = { ...formFromWord(previous), synonyms: 'vision' };
    expect(buildWord(values, 'w1', previous).ok).toBe(true);
  });

  it('validates the example pair once it is changed on edit', () => {
    const previous = legacy({ example: 'Only English.' });
    const values = { ...formFromWord(previous), example: 'Changed.' };
    expect(buildWord(values, 'w1', previous)).toEqual({ ok: false, message: '영어와 한국어 예문을 함께 입력해 주세요' });
  });

  it('does not re-validate an unchanged legacy used-meaning on edit', () => {
    const previous = legacy({ example: 'E.', exampleKo: '문장', exampleMeaning: '없는 표현' });
    expect(buildWord(formFromWord(previous), 'w1', previous).ok).toBe(true);
  });

  it('validates the used meaning when only it changes on edit', () => {
    const previous = legacy({ example: 'E.', exampleKo: '문장', exampleMeaning: '없는 표현' });
    const values = { ...formFromWord(previous), exampleMeaning: '또 다른 표현' };
    expect(buildWord(values, 'w1', previous)).toEqual({
      ok: false,
      message: '사용된 뜻은 한국어 예문에 적힌 표현으로 입력해 주세요',
    });
  });
});

describe('formFromWord', () => {
  it('round-trips through buildWord', () => {
    const word: Word = {
      id: 'w9', word: 'insight', meanings: ['통찰력', '식견'], synonyms: ['perception, vision', ''], chapter: 'Day 4',
      details: { example: 'E.', exampleKo: '통찰력이 있다', exampleMeaning: '통찰력' },
    };
    const form = formFromWord(word);
    expect(form.meaning).toBe('통찰력\n식견');
    expect(form.synonyms).toBe('perception, vision\n');
    expect(buildWord(form, 'w9', word)).toEqual({ ok: true, word });
  });
});
```

`src/data/filter.test.ts` 전체:

```ts
import { searchWords, wordsInChapter } from './filter';
import { SAMPLE_WORDS } from './samples';
import type { Word } from './types';

const ids = (words: Word[]) => words.map((word) => word.id);

describe('wordsInChapter', () => {
  it('returns every word for "all" and only matching chapters otherwise', () => {
    expect(wordsInChapter(SAMPLE_WORDS, 'all')).toHaveLength(4);
    expect(ids(wordsInChapter(SAMPLE_WORDS, 'Day 2'))).toEqual(['sample-derive']);
    expect(wordsInChapter(SAMPLE_WORDS, 'Day 9')).toEqual([]);
  });
});

describe('searchWords', () => {
  it('matches the word, meanings, synonyms and example, ignoring case and outer spaces', () => {
    expect(ids(searchWords(SAMPLE_WORDS, '  RESILIENT ', 'all'))).toEqual(['sample-resilient']);
    expect(ids(searchWords(SAMPLE_WORDS, '통찰력', 'all'))).toEqual(['sample-insight']);
    expect(ids(searchWords(SAMPLE_WORDS, 'nurture', 'all'))).toEqual(['sample-cultivate']);
    expect(ids(searchWords(SAMPLE_WORDS, 'deduce', 'all'))).toEqual(['sample-derive']);
    expect(ids(searchWords(SAMPLE_WORDS, 'The data gave', 'all'))).toEqual(['sample-insight']);
  });

  it('no longer searches the removed English definitions', () => {
    expect(searchWords(SAMPLE_WORDS, 'growing crops', 'all')).toEqual([]);
  });

  it('treats a blank query as "everything in the chapter"', () => {
    expect(searchWords(SAMPLE_WORDS, '   ', 'Day 1')).toHaveLength(3);
  });

  it('does not choke on regex-looking input', () => {
    expect(searchWords(SAMPLE_WORDS, '(*[', 'all')).toEqual([]);
  });

  it('combines the chapter filter with the query', () => {
    expect(searchWords(SAMPLE_WORDS, 'derive', 'Day 1')).toEqual([]);
  });
});
```

`src/data/mask.test.ts` 전체:

```ts
import { anyCardVisible, cardVisible, isMasked, toggleAll, toggleField } from './mask';
import { SAMPLE_WORDS } from './samples';
import type { ShownMap } from './types';

const allOn = { maskWord: true, maskMeaning: true };
const allOff = { maskWord: false, maskMeaning: false };
const [cultivate, resilient] = SAMPLE_WORDS;

describe('isMasked', () => {
  it('hides a field only while its switch is on and it has not been revealed', () => {
    expect(isMasked(allOn, {}, cultivate.id, 'meaning')).toBe(true);
    expect(isMasked(allOff, {}, cultivate.id, 'meaning')).toBe(false);
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(isMasked(allOn, shown, cultivate.id, 'meaning')).toBe(false);
  });
});

describe('toggleField', () => {
  it('flips one field without touching the input map', () => {
    const before: ShownMap = {};
    const once = toggleField(before, cultivate.id, 'word');
    expect(once[cultivate.id]?.word).toBe(true);
    expect(toggleField(once, cultivate.id, 'word')[cultivate.id]?.word).toBe(false);
    expect(before).toEqual({});
  });
});

describe('rows', () => {
  it('counts a row as visible once one of its switched-on fields is revealed', () => {
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(cardVisible(allOn, shown, cultivate)).toBe(true);
    expect(cardVisible(allOn, {}, cultivate)).toBe(false);
  });

  it('ignores revealed fields whose switch is off', () => {
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(cardVisible({ ...allOff, maskWord: true }, shown, cultivate)).toBe(false);
  });

  it('toggleAll reveals everything when nothing is visible, otherwise hides everything', () => {
    const words = [cultivate, resilient];
    const revealed = toggleAll(allOn, {}, words);
    expect(words.every((word) => cardVisible(allOn, revealed, word))).toBe(true);
    expect(anyCardVisible(allOn, toggleAll(allOn, revealed, words), words)).toBe(false);
  });
});
```

`src/data/wordList.test.ts` 전체:

```ts
import { blankDetails } from './normalize';
import type { Word } from './types';
import { chapterOptions, groupByChapter, orderedWords, removeWord, upsertWord } from './wordList';

const make = (id: string, chapter = 'Day 1', text = id): Word => ({
  id, word: text, meanings: ['뜻'], synonyms: [''], chapter, details: blankDetails(),
});

describe('upsertWord', () => {
  it('puts a new word at the front without mutating', () => {
    const list = [make('a'), make('b')];
    const next = upsertWord(list, make('c'));
    expect(next.map((w) => w.id)).toEqual(['c', 'a', 'b']);
    expect(list).toHaveLength(2);
  });

  it('replaces an existing word in place', () => {
    const list = [make('a'), make('b'), make('c')];
    const next = upsertWord(list, make('b', 'Day 1', 'changed'));
    expect(next.map((w) => w.id)).toEqual(['a', 'b', 'c']);
    expect(next[1].word).toBe('changed');
    expect(list[1].word).toBe('b');
  });
});

describe('removeWord', () => {
  it('removes by id without mutating', () => {
    const list = [make('a'), make('b')];
    expect(removeWord(list, 'a').map((w) => w.id)).toEqual(['b']);
    expect(list).toHaveLength(2);
  });
});

describe('chapterOptions', () => {
  it('lists Day 1 first then distinct chapters in first-appearance order', () => {
    const list = [make('a', 'Day 3'), make('b', 'Day 2'), make('c', 'Day 3'), make('d', ''), make('e', 'Day 1')];
    expect(chapterOptions(list)).toEqual(['Day 1', 'Day 3', 'Day 2']);
  });

  it('still offers Day 1 for an empty list', () => {
    expect(chapterOptions([])).toEqual(['Day 1']);
  });
});

describe('groupByChapter', () => {
  it('orders chapters numerically and keeps the stored order inside a chapter', () => {
    const list = [make('a', 'Day 10'), make('b', 'Day 2'), make('c', 'Day 2'), make('d', 'Day 1')];
    const groups = groupByChapter(list);
    expect(groups.map((group) => group.chapter)).toEqual(['Day 1', 'Day 2', 'Day 10']);
    expect(groups[1].words.map((word) => word.id)).toEqual(['b', 'c']);
  });

  it('returns no groups for an empty list and does not mutate the input', () => {
    expect(groupByChapter([])).toEqual([]);
    const list = [make('a', 'Day 2'), make('b', 'Day 1')];
    groupByChapter(list);
    expect(list.map((word) => word.id)).toEqual(['a', 'b']);
  });
});

describe('orderedWords', () => {
  it('flattens the chapter groups in display order', () => {
    const list = [make('a', 'Day 10'), make('b', 'Day 2'), make('c', 'Day 2'), make('d', 'Day 1')];
    expect(orderedWords(list).map((word) => word.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});
```

`src/data/storage.test.ts` 수정:
- 기존 `maskDetails`를 쓰는 곳(약 90행 `const prefs = { ...DEFAULT_PREFS, maskDetails: true, activeChapter: 'Day 2' };`)을 `{ ...DEFAULT_PREFS, maskMeaning: false, activeChapter: 'Day 2' }`로 바꾼다.
- 옛 단어 형태나 `definitions` 등을 기대하는 단언이 있으면 새 구조(`synonyms` 배열, 3개짜리 `details`)에 맞게 고친다(의도는 유지).
- 파일 끝에 추가(같은 파일에서 이미 쓰는 `AsyncStorage` 가져오기와 정리 방식을 그대로 따른다):

```ts
describe('legacy prefs', () => {
  it('ignores the removed maskDetails switch', async () => {
    await AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ maskWord: true, maskMeaning: false, maskDetails: true, activeChapter: 'Day 2' }),
    );
    expect(await loadPrefs()).toEqual({ maskWord: true, maskMeaning: false, activeChapter: 'Day 2' });
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx jest src/data`
Expected: FAIL (`alignList`, `groupByChapter`, `orderedWords` 없음, 새 `Word` 모양 불일치 등).

- [ ] **Step 4: 구현**

`src/data/normalize.ts` 전체:

```ts
import type { Word, WordDetails } from './types';

const DETAIL_KEYS: (keyof WordDetails)[] = ['example', 'exampleKo', 'exampleMeaning'];

type RawWord = {
  id?: unknown;
  word?: unknown;
  meanings?: unknown;
  meaning?: unknown;
  synonyms?: unknown;
  chapter?: unknown;
  details?: unknown;
};

export function blankDetails(): WordDetails {
  return { example: '', exampleKo: '', exampleMeaning: '' };
}

export function splitMeanings(value: unknown): string[] {
  const parts: unknown[] = Array.isArray(value) ? value : String(value || '').split(/\n|\s*;\s*/);
  return parts.map((part) => String(part).trim()).filter(Boolean);
}

export function alignList(meanings: string[], values: unknown[]): string[] {
  return meanings.map((_, i) => String(values[i] || '').trim());
}

export function makeId(): string {
  const cryptoApi = globalThis.crypto;
  return cryptoApi && typeof cryptoApi.randomUUID === 'function' ? cryptoApi.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// 새 형태(뜻별 배열)가 있으면 그대로, 옛 형태(단어 하나에 하나인 문자열)면 첫 번째 뜻의 동의어로 옮긴다.
function synonymSource(raw: RawWord, rawDetails: Record<string, unknown>): unknown[] {
  if (Array.isArray(raw.synonyms)) {
    return raw.synonyms.map((value) => (typeof value === 'string' ? value : ''));
  }
  if (typeof raw.synonyms === 'string') return [raw.synonyms];
  const legacy = rawDetails.synonyms;
  return typeof legacy === 'string' && legacy.trim() !== '' ? [legacy] : [];
}

export function normalizeWord(input: unknown): Word {
  const raw: RawWord = input && typeof input === 'object' ? (input as RawWord) : {};
  const rawDetails: Record<string, unknown> =
    raw.details && typeof raw.details === 'object' ? (raw.details as Record<string, unknown>) : {};
  const meanings = splitMeanings(raw.meanings || raw.meaning);
  const details = blankDetails();
  for (const key of DETAIL_KEYS) {
    details[key] = String(rawDetails[key] ?? '');
  }
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : makeId(),
    word: String(raw.word || '').trim(),
    meanings,
    synonyms: alignList(meanings, synonymSource(raw, rawDetails)),
    chapter: String(raw.chapter || 'Day 1').trim() || 'Day 1',
    details,
  };
}
```

`src/data/samples.ts` 전체:

```ts
import type { Word } from './types';

export const SAMPLE_WORDS: Word[] = [
  {
    id: 'sample-cultivate',
    word: 'cultivate',
    meanings: ['경작하다, 재배하다', '기르다, 함양하다', '관계를 쌓다'],
    synonyms: ['nurture, develop, foster', 'develop, foster', 'establish, build'],
    chapter: 'Day 1',
    details: {
      example: 'The course helps students cultivate critical thinking.',
      exampleKo: '이 과정은 학생들이 비판적 사고력을 기르도록 돕는다.',
      exampleMeaning: '기르도록',
    },
  },
  {
    id: 'sample-resilient',
    word: 'resilient',
    meanings: ['회복력이 있는', '탄력 있는'],
    synonyms: ['strong, tough', 'flexible, elastic'],
    chapter: 'Day 1',
    details: {
      example: 'She remained resilient through every change.',
      exampleKo: '그녀는 모든 변화 속에서도 회복력을 유지했다.',
      exampleMeaning: '회복력을 유지했다',
    },
  },
  {
    id: 'sample-insight',
    word: 'insight',
    meanings: ['통찰력', '이해'],
    synonyms: ['perception', 'understanding'],
    chapter: 'Day 1',
    details: {
      example: 'The data gave us a useful insight.',
      exampleKo: '그 데이터는 우리에게 유용한 통찰력을 주었다.',
      exampleMeaning: '통찰력',
    },
  },
  {
    id: 'sample-derive',
    word: 'derive',
    meanings: ['이끌어내다', '유래하다'],
    synonyms: ['obtain, deduce', 'originate, stem'],
    chapter: 'Day 2',
    details: {
      example: 'We can derive the formula from this result.',
      exampleKo: '우리는 이 결과로부터 공식을 이끌어낼 수 있다.',
      exampleMeaning: '이끌어낼',
    },
  },
];
```

`src/data/wordForm.ts` 전체:

```ts
import { alignList, blankDetails, splitMeanings } from './normalize';
import type { Word, WordDetails } from './types';

export type FormValues = {
  word: string;
  chapter: string;
  meaning: string;
  synonyms: string;
  example: string;
  exampleKo: string;
  exampleMeaning: string;
};

export type BuildResult = { ok: true; word: Word } | { ok: false; message: string };

const DETAIL_FIELDS: (keyof WordDetails)[] = ['example', 'exampleKo', 'exampleMeaning'];

export function emptyForm(chapter: string): FormValues {
  return { word: '', chapter, meaning: '', synonyms: '', example: '', exampleKo: '', exampleMeaning: '' };
}

export function formFromWord(word: Word): FormValues {
  return {
    word: word.word,
    chapter: word.chapter,
    meaning: word.meanings.join('\n'),
    synonyms: word.synonyms.join('\n'),
    ...word.details,
  };
}

export function buildWord(values: FormValues, id: string, previous?: Word): BuildResult {
  const word = values.word.trim();
  const meanings = splitMeanings(values.meaning);
  if (!word || meanings.length === 0) return { ok: false, message: '영단어와 뜻을 입력해 주세요' };

  const details = blankDetails();
  for (const key of DETAIL_FIELDS) details[key] = values[key].trim();

  const exampleChanged =
    !previous || previous.details.example !== details.example || previous.details.exampleKo !== details.exampleKo;
  if (exampleChanged && !!details.example !== !!details.exampleKo) {
    return { ok: false, message: '영어와 한국어 예문을 함께 입력해 주세요' };
  }
  if (
    details.exampleMeaning &&
    !details.exampleKo.includes(details.exampleMeaning) &&
    (exampleChanged || previous?.details.exampleMeaning !== details.exampleMeaning)
  ) {
    return { ok: false, message: '사용된 뜻은 한국어 예문에 적힌 표현으로 입력해 주세요' };
  }

  return {
    ok: true,
    word: {
      id,
      word,
      meanings,
      // 동의어는 뜻 순서대로 한 줄씩. 줄 수가 뜻보다 적으면 빈 칸으로 채우고 많으면 남는 줄은 버린다.
      synonyms: alignList(meanings, values.synonyms.split(/\r?\n/)),
      chapter: values.chapter || 'Day 1',
      details,
    },
  };
}
```

`src/data/filter.ts` 전체:

```ts
import type { Word } from './types';

export function wordsInChapter(words: Word[], chapter: string): Word[] {
  return chapter === 'all' ? words : words.filter((word) => word.chapter === chapter);
}

export function searchWords(words: Word[], query: string, chapter: string): Word[] {
  const q = query.trim().toLowerCase();
  return wordsInChapter(words, chapter).filter((word) =>
    [word.word, word.meanings.join(' · '), word.synonyms.join(' '), word.details.example, word.details.exampleKo]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}
```

`src/data/mask.ts` 전체:

```ts
import type { MaskField, Prefs, ShownMap, Word } from './types';

type MaskPrefs = Pick<Prefs, 'maskWord' | 'maskMeaning'>;

const PREF_FOR_FIELD: Record<MaskField, keyof MaskPrefs> = {
  word: 'maskWord',
  meaning: 'maskMeaning',
};

const ALL_FIELDS: MaskField[] = ['word', 'meaning'];

export function isShown(shown: ShownMap, id: string, field: MaskField): boolean {
  return shown[id]?.[field] === true;
}

export function isMasked(prefs: MaskPrefs, shown: ShownMap, id: string, field: MaskField): boolean {
  return prefs[PREF_FOR_FIELD[field]] && !isShown(shown, id, field);
}

function setField(shown: ShownMap, id: string, field: MaskField, value: boolean): ShownMap {
  return { ...shown, [id]: { ...shown[id], [field]: value } };
}

export function toggleField(shown: ShownMap, id: string, field: MaskField): ShownMap {
  return setField(shown, id, field, !isShown(shown, id, field));
}

export function cardVisible(prefs: MaskPrefs, shown: ShownMap, word: Word): boolean {
  return (
    (prefs.maskWord && isShown(shown, word.id, 'word')) || (prefs.maskMeaning && isShown(shown, word.id, 'meaning'))
  );
}

function setCard(shown: ShownMap, id: string, value: boolean): ShownMap {
  return ALL_FIELDS.reduce((acc, field) => setField(acc, id, field, value), shown);
}

export function anyCardVisible(prefs: MaskPrefs, shown: ShownMap, words: Word[]): boolean {
  return words.some((word) => cardVisible(prefs, shown, word));
}

export function toggleAll(prefs: MaskPrefs, shown: ShownMap, words: Word[]): ShownMap {
  const reveal = !anyCardVisible(prefs, shown, words);
  return words.reduce((acc, word) => setCard(acc, word.id, reveal), shown);
}
```

`src/data/wordList.ts` 전체:

```ts
import type { Word } from './types';

export type ChapterGroup = { chapter: string; words: Word[] };

export function upsertWord(words: Word[], word: Word): Word[] {
  return words.some((item) => item.id === word.id)
    ? words.map((item) => (item.id === word.id ? word : item))
    : [word, ...words];
}

export function removeWord(words: Word[], id: string): Word[] {
  return words.filter((item) => item.id !== id);
}

export function chapterOptions(words: Word[]): string[] {
  return ['Day 1', ...new Set(words.map((word) => word.chapter).filter((chapter) => chapter && chapter !== 'Day 1'))];
}

/** 챕터 이름을 숫자 순서로 비교한다 (Day 2가 Day 10보다 앞). */
export function compareChapters(a: string, b: string): number {
  return a.localeCompare(b, 'ko', { numeric: true });
}

/** 챕터별로 묶는다. 챕터는 숫자 순서, 챕터 안의 단어는 저장된 순서를 유지한다. */
export function groupByChapter(words: Word[]): ChapterGroup[] {
  const groups = new Map<string, Word[]>();
  for (const word of words) {
    const group = groups.get(word.chapter);
    if (group) group.push(word);
    else groups.set(word.chapter, [word]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => compareChapters(a, b))
    .map(([chapter, list]) => ({ chapter, words: list }));
}

/** 홈 목록과 같은 순서(챕터 순서 → 저장된 순서)로 펼친 단어 목록. */
export function orderedWords(words: Word[]): Word[] {
  return groupByChapter(words).flatMap((group) => group.words);
}
```

`src/data/storage.ts` 수정:
- `DEFAULT_PREFS`에서 `maskDetails: false,` 줄을 지운다.
- `type MaskPrefKey = 'maskWord' | 'maskMeaning' | 'maskDetails';`를 `type MaskPrefKey = 'maskWord' | 'maskMeaning';`로 바꾼다.
- `loadPrefs`의 반환 객체에서 `maskDetails: flag('maskDetails'),` 줄을 지운다.

- [ ] **Step 5: 통과 확인**

Run: `npx jest src/data`
Expected: `src/data`의 모든 테스트 통과. (`study.test.ts`는 이 태스크에서 건드리지 않았고 새 타입에 의존하지 않으므로 그대로 통과해야 한다. 만약 실패하면 이유를 보고한다.)

- [ ] **Step 6: 커밋**

```bash
git add src/data
git commit -m "feat: 단어 데이터 구조 v2 — 뜻별 동의어, 옛 데이터 변환, Day별 묶기 (#10)"
```

---

### Task 2: 단어 추가·수정 폼 시트

**Files:**
- Modify: `src/components/WordFormSheet.tsx`

**Interfaces:**
- Consumes: `FormValues`(`word, chapter, meaning, synonyms, example, exampleKo, exampleMeaning`), `emptyForm`, `formFromWord`, `buildWord` (Task 1)

- [ ] **Step 1: 필드 목록 교체**

`src/components/WordFormSheet.tsx`에서 `PRIMARY_FIELDS`와 `EXTRA_FIELDS` 선언 두 개를 다음으로 바꾼다(`FieldSpec` 타입은 그대로).

```ts
const PRIMARY_FIELDS: FieldSpec[] = [
  { key: 'word', label: '영단어', placeholder: '예: resilient', required: true },
  { key: 'chapter', label: '챕터', placeholder: '' },
  { key: 'meaning', label: '뜻', hint: '여러 뜻은 줄바꿈으로 입력', placeholder: '예: 회복력이 있는\n탄력 있는', rows: 3, full: true, required: true },
  { key: 'synonyms', label: '뜻별 동의어', hint: '뜻 순서대로 한 줄씩, 여러 개는 쉼표로', placeholder: 'strong, tough\nflexible, elastic', rows: 3, full: true },
];

const EXTRA_FIELDS: FieldSpec[] = [
  { key: 'example', label: '영어 예문', placeholder: 'She remained resilient through change.', rows: 2, full: true },
  { key: 'exampleKo', label: '한국어 예문', placeholder: '그녀는 변화 속에서도 회복력을 유지했다.', rows: 2, full: true },
  { key: 'exampleMeaning', label: '예문에서 사용된 뜻', hint: '한국어 문장에서 가려 둘 표현', placeholder: '예: 회복력을 유지했다', full: true },
];
```

그리고 구분선 문구 `추가 정보`를 `예문`으로 바꾼다(`<AppText style={styles.dividerText}>추가 정보</AppText>` → `예문`).

- [ ] **Step 2: 타입 확인(이 파일만)**

Run: `npm run typecheck 2>&1 | grep "WordFormSheet" || echo "WordFormSheet OK"`
Expected: `WordFormSheet OK` (다른 파일의 오류는 Task 3·4에서 고친다).
Run: `npm test`
Expected: 전부 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/components/WordFormSheet.tsx
git commit -m "feat: 단어 폼을 뜻별 동의어 입력으로 바꾸고 영영풀이·반의어·파생어·유의어 칸 제거 (#10)"
```

---

### Task 3: 홈 Day 목록

**Files:**
- Create: `src/components/wordbook/DaySection.tsx`, `src/components/wordbook/WordRow.tsx`
- Modify: `src/components/wordbook/MaskPanel.tsx`, `src/app/(main)/index.tsx`
- Delete: `src/components/wordbook/WordCard.tsx`

**Interfaces:**
- Consumes: `groupByChapter`, `ChapterGroup` (Task 1), `isMasked`/`toggleField`/`anyCardVisible`/`toggleAll`(Task 1의 두 필드 버전), `Masked`, `Icon`, `AppText`, `colors`, `cardShadow`
- Produces: `DaySection({ chapter, count, children })`, `WordRow({ word, prefs, shown, onToggleField, onOpen, onEdit, onDelete })`. 줄 하나를 누르면(가려지지 않은 영단어·뜻 부분) `onOpen()`이 불리고, 가려진 부분을 누르면 `onToggleField('word' | 'meaning')`만 불린다.

- [ ] **Step 1: DaySection 작성** — `src/components/wordbook/DaySection.tsx`

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { AppText } from '../AppText';

type Props = { chapter: string; count: number; children: ReactNode };

export function DaySection({ chapter, count, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText role="heading" style={styles.tag}>
          {chapter}
        </AppText>
        <AppText style={styles.count}>{count}단어</AppText>
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9, paddingHorizontal: 2 },
  // 원본의 챕터 태그(.chapter-tag) 값
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  count: { color: colors.muted, fontSize: 11 },
  rows: { gap: 8 },
});
```

- [ ] **Step 2: WordRow 작성** — `src/components/wordbook/WordRow.tsx`

원본 리스트 보기 카드(`WordCard`의 `listCard` 스타일)와 수정·삭제 아이콘 버튼 값을 그대로 옮긴다. 눌림이 겹치지 않도록(버튼 안에 버튼을 두지 않으려고) 영단어 칸과 뜻 칸을 각각 하나의 `Pressable`로 만들고, 가려져 있으면 그 칸을 누를 때 보이기만 하고 가려져 있지 않으면 학습으로 이동한다.

```tsx
import { Pressable, StyleSheet, View, type PressableStateCallbackType } from 'react-native';
import { isMasked } from '../../data/mask';
import type { MaskField, Prefs, ShownMap, Word } from '../../data/types';
import { cardShadow, colors } from '../../theme';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { Masked } from '../Masked';

type Props = {
  word: Word;
  prefs: Prefs;
  shown: ShownMap;
  onToggleField: (field: MaskField) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const hovered = (state: PressableStateCallbackType) => !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

function MiniButton({ icon, label, onPress }: { icon: 'edit' | 'delete'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={(state) => [styles.mini, hovered(state) && styles.miniHover]}
    >
      {(state) => <Icon name={icon} size={18} color={hovered(state) ? colors.text : '#9aa3ae'} />}
    </Pressable>
  );
}

export function WordRow({ word, prefs, shown, onToggleField, onOpen, onEdit, onDelete }: Props) {
  const wordMasked = isMasked(prefs, shown, word.id, 'word');
  const meaningMasked = isMasked(prefs, shown, word.id, 'meaning');

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={wordMasked ? '가려진 영단어 보기' : `${word.word} 학습하기`}
        onPress={() => (wordMasked ? onToggleField('word') : onOpen())}
        style={styles.wordCol}
      >
        <Masked masked={wordMasked}>
          <AppText role="heading" style={styles.title}>
            {word.word}
          </AppText>
        </Masked>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={meaningMasked ? '가려진 뜻 보기' : `${word.word} 학습하기`}
        onPress={() => (meaningMasked ? onToggleField('meaning') : onOpen())}
        style={styles.meaningCol}
      >
        <Masked masked={meaningMasked}>
          <AppText numberOfLines={1} style={styles.meaning}>
            {word.meanings.join(' · ')}
          </AppText>
        </Masked>
      </Pressable>
      <View style={styles.actions}>
        <MiniButton icon="edit" label="단어 수정" onPress={onEdit} />
        <MiniButton icon="delete" label="단어 삭제" onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: cardShadow,
  },
  wordCol: { flex: 0.75, minWidth: 105 },
  meaningCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, fontWeight: '700' },
  meaning: { color: '#4e5866', fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 2, marginRight: -6 },
  mini: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniHover: { backgroundColor: colors.bg },
});
```

- [ ] **Step 3: 암기 모드 패널 수정** — `src/components/wordbook/MaskPanel.tsx`

`SWITCHES`에서 세 번째 항목을 지운다.

```ts
const SWITCHES = [
  { key: 'maskWord', label: '영어 가리기' },
  { key: 'maskMeaning', label: '뜻 가리기' },
] as const;
```
(나머지 코드는 그대로. `MaskKey`는 `'maskWord' | 'maskMeaning'`가 된다.)

- [ ] **Step 4: 홈 화면 수정** — `src/app/(main)/index.tsx`

1. import 정리:
   - `import { WordCard } from '../../components/wordbook/WordCard';`를 지우고 다음 두 줄로 바꾼다.
     ```ts
     import { DaySection } from '../../components/wordbook/DaySection';
     import { WordRow } from '../../components/wordbook/WordRow';
     ```
   - `import { anyCardVisible, toggleAll, toggleCard, toggleField } from '../../data/mask';`에서 `toggleCard`를 뺀다.
   - `import type { Word } from '../../data/types';` 아래에 `import { groupByChapter } from '../../data/wordList';`를 더한다.
2. `type ViewMode = 'card' | 'list';`와 `const [view, setView] = useState<ViewMode>('card');`를 지운다.
3. `const list = useMemo(...)` 아래에 `const groups = useMemo(() => groupByChapter(list), [list]);`를 더한다.
4. 검색줄 JSX(`<View style={styles.tools}>` 블록)를 보기 전환 없이 검색창만 남기도록 바꾼다.
   ```tsx
      <View style={styles.tools}>
        <View style={styles.search}>
          <Icon name="search" size={19} color="#9aa3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="단어 또는 뜻 검색"
            placeholderTextColor={colors.muted}
            accessibilityLabel="단어 또는 뜻 검색"
            autoComplete="off"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
      </View>
   ```
5. 목록 렌더(`{list.length > 0 ? ( <View style={[styles.grid ...` 블록의 참 분기)를 Day 섹션으로 바꾼다. 거짓 분기(빈 상태)는 그대로 둔다.
   ```tsx
      {groups.length > 0 ? (
        groups.map((group) => (
          <DaySection key={group.chapter} chapter={group.chapter} count={group.words.length}>
            {group.words.map((word) => (
              <WordRow
                key={word.id}
                word={word}
                prefs={prefs}
                shown={shown}
                onToggleField={(field) => setShown(toggleField(shown, word.id, field))}
                onOpen={() => router.navigate({ pathname: '/study', params: { word: word.id } })}
                onEdit={() => open(word.id)}
                onDelete={() => remove(word)}
              />
            ))}
          </DaySection>
        ))
      ) : (
   ```
   (이어지는 `<View style={styles.empty}> ... </View>` 빈 상태와 닫는 `)}`는 그대로.)
6. 쓰지 않게 된 스타일을 지운다: `toggle`, `toggleButton`, `toggleButtonActive`, `grid`, `gridList`.

- [ ] **Step 5: WordCard 삭제**

```bash
git rm src/components/wordbook/WordCard.tsx
```

- [ ] **Step 6: 정적 확인**

Run: `npm run typecheck 2>&1 | grep -E "WordFormSheet|WordRow|DaySection|MaskPanel|app/\(main\)/index|src/data/" || echo "home + data OK"`
Expected: `home + data OK` (`study.tsx`, `DetailPanel`, `ExamplePair`, `study.ts`는 Task 4에서 고친다).
Run: `npm test` → 전부 통과.

- [ ] **Step 7: 브라우저 확인**

`npx expo start --web --port 8099`를 띄워(끝나면 끈다) Browser pane에서 홈을 확인한다.
- Day 1(3개)·Day 2(1개) 섹션이 보이고 각 줄에 표제어와 뜻 요약, 수정·삭제 아이콘이 있다. 큰 카드와 카드/리스트 전환 버튼은 없다.
- 암기 모드 패널에 스위치가 2개(영어 가리기, 뜻 가리기)만 있고 "전체 정답 보기"가 동작한다.
- 줄의 보이는 영단어·뜻을 누르면 `/study?word=<id>`로 이동한다(학습 화면은 아직 옛 모습이어도 된다 — 이동만 확인한다). **가려진 뜻 부분을 누르면 이동하지 않고 그 뜻만 보인다.**
- 검색(`nurture` 등 동의어로도 찾아짐), 단어 추가·수정·삭제 시트가 새 폼(뜻별 동의어 칸)으로 동작한다.
- localStorage 키 `pocket-vocab-words-v1`에 옛 형태(`definitions`, `details.synonyms` 문자열, `details.antonyms` 등)를 직접 넣고 새로고침해도 목록이 오류 없이 나온다.
- 콘솔 오류가 없다.

- [ ] **Step 8: 커밋**

```bash
git add src/components/wordbook "src/app/(main)/index.tsx"
git commit -m "feat: 홈을 Day별 단어 목록으로 바꾸고 줄을 누르면 학습으로 이동 (#10)"
```

---

### Task 4: 학습 화면 — 뜻 꾹 누르기, 마지막 뜻 아래 예문(3단계), 단어에서 시작

**Files:**
- Modify: `src/data/study.ts`, `src/app/study.tsx`
- Create: `src/components/study/hold.ts`, `src/components/study/MeaningRow.tsx`, `src/components/study/ExampleBlock.tsx`
- Delete: `src/components/study/DetailPanel.tsx`, `src/components/ExamplePair.tsx`
- Test (전체 교체): `src/data/study.test.ts`

**Interfaces:**
- Consumes: `orderedWords` (Task 1 `wordList.ts`), `wordsInChapter` (`filter.ts`), `emphasize`, `koreanHighlight`(`emphasize.ts`, 그대로), `Word.synonyms`, `useWords`
- Produces:
  - `study.ts`: `StudyState { index; translationOpen }`, `StudyAction`(`move`, `toggleTranslation`), `initialStudy`, `startStudy(index): StudyState`, `studyReducer`, `swipeDirection(dx, dy)`, `wheelStep({ deltaY, locked, length, now, lastWheel })`, `splitSynonyms(value): string[]`(기존 `splitChips`의 새 이름), `studyList(words, wordId, activeChapter): { list: Word[]; start: number }`. `StudyPanel` 타입, `registerTap`, `isKeyboardPress`는 삭제한다.
  - `holdProps(setHeld)`, `HOLD_STYLE`(`hold.ts`), `MeaningRow({ number, meaning, synonyms })`, `ExampleBlock({ word, open, onToggle })`
  - 라우트 `/study`는 선택 쿼리 `word=<단어 id>`를 받는다.

- [ ] **Step 1: 실패하는 테스트 작성** — `src/data/study.test.ts` 전체

```ts
import { blankDetails } from './normalize';
import { initialStudy, splitSynonyms, startStudy, studyList, studyReducer, swipeDirection, wheelStep } from './study';
import type { Word } from './types';

const make = (id: string, chapter: string): Word => ({
  id, word: id, meanings: ['뜻'], synonyms: [''], chapter, details: blankDetails(),
});

describe('studyReducer', () => {
  it('moves forward and backward with wrap-around, closing the translation', () => {
    const open = { index: 2, translationOpen: true };
    expect(studyReducer(open, { type: 'move', step: 1, length: 3 })).toEqual({ index: 0, translationOpen: false });
    expect(studyReducer(initialStudy, { type: 'move', step: -1, length: 3 })).toEqual({ index: 2, translationOpen: false });
  });

  it('treats an index past the end as the first card and ignores empty lists', () => {
    const stale = { index: 5, translationOpen: false };
    expect(studyReducer(stale, { type: 'move', step: 1, length: 2 }).index).toBe(1);
    expect(studyReducer(stale, { type: 'move', step: 1, length: 0 })).toBe(stale);
  });

  it('stays on the only word of a one-word list and closes the translation', () => {
    expect(studyReducer({ index: 0, translationOpen: true }, { type: 'move', step: 1, length: 1 })).toEqual({
      index: 0,
      translationOpen: false,
    });
  });

  it('toggles the translation open and closed', () => {
    const open = studyReducer(initialStudy, { type: 'toggleTranslation' });
    expect(open.translationOpen).toBe(true);
    expect(studyReducer(open, { type: 'toggleTranslation' })).toEqual(initialStudy);
  });
});

describe('startStudy', () => {
  it('starts at the given index with the translation closed and never below zero', () => {
    expect(startStudy(2)).toEqual({ index: 2, translationOpen: false });
    expect(startStudy(-1).index).toBe(0);
  });
});

describe('swipeDirection', () => {
  it('needs a long, mostly horizontal drag', () => {
    expect(swipeDirection(-80, 10)).toBe(1);
    expect(swipeDirection(80, 5)).toBe(-1);
    expect(swipeDirection(30, 0)).toBe(0);
    expect(swipeDirection(-80, 70)).toBe(0);
  });
});

describe('wheelStep', () => {
  it('does nothing for small deltas, while locked, or with fewer than two words', () => {
    const idle = { consume: false, step: 0, lastWheel: 0 };
    expect(wheelStep({ deltaY: 5, locked: false, length: 3, now: 1000, lastWheel: 0 })).toEqual(idle);
    expect(wheelStep({ deltaY: 40, locked: true, length: 3, now: 1000, lastWheel: 0 })).toEqual(idle);
    expect(wheelStep({ deltaY: 40, locked: false, length: 1, now: 1000, lastWheel: 0 })).toEqual(idle);
  });

  it('steps by direction and swallows the extra wheel events inside the throttle window', () => {
    expect(wheelStep({ deltaY: 40, locked: false, length: 3, now: 1000, lastWheel: 0 })).toEqual({
      consume: true, step: 1, lastWheel: 1000,
    });
    expect(wheelStep({ deltaY: -40, locked: false, length: 3, now: 1000, lastWheel: 0 }).step).toBe(-1);
    expect(wheelStep({ deltaY: 40, locked: false, length: 3, now: 1200, lastWheel: 1000 })).toEqual({
      consume: true, step: 0, lastWheel: 1000,
    });
  });
});

describe('splitSynonyms', () => {
  it('splits on commas and semicolons, trimming and dropping blanks', () => {
    expect(splitSynonyms('nurture, develop ,foster')).toEqual(['nurture', 'develop', 'foster']);
    expect(splitSynonyms('a;b')).toEqual(['a', 'b']);
    expect(splitSynonyms('')).toEqual([]);
    expect(splitSynonyms(' , ')).toEqual([]);
  });
});

describe('studyList', () => {
  const words = [make('a', 'Day 2'), make('b', 'Day 1'), make('c', 'Day 2'), make('d', 'Day 1')];

  it('opens the word inside its own Day, keeping the stored order', () => {
    const { list, start } = studyList(words, 'c', 'all');
    expect(list.map((word) => word.id)).toEqual(['a', 'c']);
    expect(start).toBe(1);
  });

  it('lets the word win over the chapter filter', () => {
    const { list, start } = studyList(words, 'b', 'Day 2');
    expect(list.map((word) => word.id)).toEqual(['b', 'd']);
    expect(start).toBe(0);
  });

  it('without a word, studies everything in Day order from the first word', () => {
    const { list, start } = studyList(words, undefined, 'all');
    expect(list.map((word) => word.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(start).toBe(0);
  });

  it('without a word, respects an active chapter', () => {
    expect(studyList(words, undefined, 'Day 2').list.map((word) => word.id)).toEqual(['a', 'c']);
  });

  it('falls back to the full list for an unknown id and handles an empty list', () => {
    expect(studyList(words, 'nope', 'all').list).toHaveLength(4);
    expect(studyList([], undefined, 'all')).toEqual({ list: [], start: 0 });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/data/study.test.ts`
Expected: FAIL (`startStudy`, `studyList`, `splitSynonyms` 없음 등).

- [ ] **Step 3: 학습 로직 구현** — `src/data/study.ts` 전체

```ts
import { wordsInChapter } from './filter';
import type { Word } from './types';
import { orderedWords } from './wordList';

export type StudyState = { index: number; translationOpen: boolean };

export type StudyAction = { type: 'move'; step: number; length: number } | { type: 'toggleTranslation' };

export const initialStudy: StudyState = { index: 0, translationOpen: false };

export function startStudy(index: number): StudyState {
  return { ...initialStudy, index: Math.max(0, index) };
}

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case 'move': {
      if (action.length <= 0) return state;
      const current = state.index >= action.length ? 0 : state.index;
      return { ...initialStudy, index: (current + action.step + action.length) % action.length };
    }
    case 'toggleTranslation':
      return { ...state, translationOpen: !state.translationOpen };
  }
}

export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) return dx < 0 ? 1 : -1;
  return 0;
}

type WheelInput = { deltaY: number; locked: boolean; length: number; now: number; lastWheel: number };

export function wheelStep({ deltaY, locked, length, now, lastWheel }: WheelInput): {
  consume: boolean;
  step: -1 | 0 | 1;
  lastWheel: number;
} {
  if (locked || length < 2 || Math.abs(deltaY) < 15) return { consume: false, step: 0, lastWheel };
  if (now - lastWheel < 450) return { consume: true, step: 0, lastWheel };
  return { consume: true, step: deltaY > 0 ? 1 : -1, lastWheel: now };
}

export function splitSynonyms(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((chip) => chip.trim())
    .filter(Boolean);
}

/**
 * 학습 목록과 시작 위치. 단어 id가 있으면 그 단어가 속한 Day의 목록에서 그 단어부터,
 * 없으면(또는 없는 id면) 전체(활성 챕터가 있으면 그 챕터)를 홈 목록과 같은 순서로 첫 단어부터.
 */
export function studyList(
  words: Word[],
  wordId: string | undefined,
  activeChapter: string,
): { list: Word[]; start: number } {
  const target = wordId === undefined ? undefined : words.find((word) => word.id === wordId);
  if (target) {
    const list = words.filter((word) => word.chapter === target.chapter);
    return { list, start: list.findIndex((word) => word.id === target.id) };
  }
  const list = activeChapter === 'all' ? orderedWords(words) : wordsInChapter(words, activeChapter);
  return { list, start: 0 };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/data/study.test.ts`
Expected: PASS.

- [ ] **Step 5: 꾹 누르기 도우미와 컴포넌트 작성**

`src/components/study/hold.ts`:

```ts
import { Platform, type PressableProps } from 'react-native';

// 꾹 누르는 동안 글자 선택이나 길게 누르기 메뉴가 뜨지 않게 한다.
export const HOLD_STYLE = { userSelect: 'none' } as const;

type HoldProps = Pick<PressableProps, 'onPressIn' | 'onPressOut'> & {
  onContextMenu?: (event: { preventDefault: () => void }) => void;
};

export function holdProps(setHeld: (held: boolean) => void): HoldProps {
  return {
    onPressIn: () => setHeld(true),
    onPressOut: () => setHeld(false),
    ...(Platform.OS === 'web' ? { onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault() } : {}),
  };
}
```

`src/components/study/MeaningRow.tsx` (원본 학습 화면의 뜻 줄 `.study-meaning`과 동의어 칩 `.study-chip` 값을 재사용):

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { splitSynonyms } from '../../data/study';
import { colors } from '../../theme';
import { AppText } from '../AppText';
import { HOLD_STYLE, holdProps } from './hold';

type Props = { number: number; meaning: string; synonyms: string };

export function MeaningRow({ number, meaning, synonyms }: Props) {
  const [held, setHeld] = useState(false);
  const chips = splitSynonyms(synonyms);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${number}. ${meaning} — 누르고 있는 동안 동의어 보기`}
      {...holdProps(setHeld)}
      style={[styles.row, HOLD_STYLE, held && styles.rowHeld]}
    >
      <View style={styles.number}>
        <AppText style={styles.numberText}>{number}</AppText>
      </View>
      {held ? (
        <View style={styles.chips}>
          {chips.length > 0 ? (
            chips.map((chip, i) => (
              <AppText key={i} style={styles.chip}>
                {chip}
              </AppText>
            ))
          ) : (
            <AppText style={styles.empty}>등록된 동의어가 없어요</AppText>
          )}
        </View>
      ) : (
        <AppText style={styles.meaning}>{meaning}</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ebe7e0',
    borderRadius: 15,
    backgroundColor: colors.surface,
    boxShadow: '0 7px 14px rgba(36, 43, 38, 0.05)',
  },
  rowHeld: { borderColor: colors.accent, backgroundColor: '#f3faf7' },
  number: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#edf5f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  meaning: { flex: 1, fontSize: 14, lineHeight: 19.6, fontWeight: '700' },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#edf5f1',
    color: colors.accent,
    fontSize: 11,
  },
  empty: { color: '#9aa39d', fontSize: 12 },
});
```

`src/components/study/ExampleBlock.tsx` (원본의 예문 줄 `.line`/`.lineEn`/`.lineKo` 값 재사용):

```tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { emphasize, koreanHighlight } from '../../data/emphasize';
import type { Word } from '../../data/types';
import { colors } from '../../theme';
import { AppText } from '../AppText';
import { HOLD_STYLE, holdProps } from './hold';

type Props = { word: Word; open: boolean; onToggle: () => void };

export function ExampleBlock({ word, open, onToggle }: Props) {
  const { example, exampleKo } = word.details;
  const [held, setHeld] = useState(false);

  // 해석을 닫을 때 누름 상태가 남아 있지 않게 한다.
  useEffect(() => {
    if (!open) setHeld(false);
  }, [open]);

  if (example === '' && exampleKo === '') {
    return <AppText style={styles.missing}>예문이 아직 없어요.</AppText>;
  }

  const hasTranslation = exampleKo !== '';
  const koreanSegments = hasTranslation ? emphasize(exampleKo, koreanHighlight(word), false) : [];

  return (
    <View style={styles.block}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={hasTranslation ? '예문 — 눌러서 한국어 해석 보기' : '예문'}
        disabled={!hasTranslation}
        onPress={onToggle}
        style={[styles.line, styles.lineEn]}
      >
        <AppText style={styles.text}>
          {example === '' ? (
            <Text style={styles.missing}>영어 예문이 없어요.</Text>
          ) : (
            emphasize(example, word.word, true).map((segment, i) =>
              segment.match ? (
                <Text key={i} style={styles.strong}>
                  {segment.text}
                </Text>
              ) : (
                segment.text
              ),
            )
          )}
        </AppText>
      </Pressable>
      {open && hasTranslation && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="한국어 해석 — 누르고 있는 동안 가려진 뜻 보기"
          {...holdProps(setHeld)}
          style={[styles.line, styles.lineKo, HOLD_STYLE]}
        >
          <AppText style={styles.text}>
            {koreanSegments.map((segment, i) =>
              segment.match ? (
                <Text key={i} style={held ? styles.shown : styles.masked}>
                  {segment.text}
                </Text>
              ) : (
                segment.text
              ),
            )}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 9 },
  line: { borderLeftWidth: 3, paddingVertical: 4, paddingLeft: 10 },
  lineEn: { borderLeftColor: colors.accent },
  lineKo: { borderLeftColor: '#c88465' },
  text: { color: '#5e6863', fontSize: 13, lineHeight: 20.8 },
  strong: { color: colors.text, fontWeight: '800' },
  missing: { color: '#a4ada7', fontSize: 13 },
  // 가려진 맥락 뜻: 글자 폭은 그대로 두고 회색 블록으로 가린다.
  masked: { backgroundColor: '#e9edf2', color: 'transparent' },
  shown: { backgroundColor: colors.accentSoft, color: colors.text, fontWeight: '800' },
});
```

- [ ] **Step 6: 학습 화면 교체** — `src/app/study.tsx` 전체

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { ExampleBlock } from '../components/study/ExampleBlock';
import { MeaningRow } from '../components/study/MeaningRow';
import { startStudy, studyList, studyReducer, swipeDirection, wheelStep } from '../data/study';
import { useWords } from '../data/WordsContext';
import { colors, fonts, isNarrow } from '../theme';

const MOVE_HINT = '⇆  스크롤 · 좌우 밀기로 다음 단어';
const HOLD_HINT = '↖  뜻을 꾹 누르면 동의어가 보여요';
const TRANSLATION_HINT = '↖  해석을 꾹 누르면 맥락 뜻이 보여요';

function StudyEmpty() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppText style={styles.emptyIconText}>▤</AppText>
      </View>
      <AppText role="heading" style={styles.emptyTitle}>
        아직 학습할 단어가 없어요
      </AppText>
      <AppText style={styles.emptyText}>단어를 추가하면 이곳에서 한 장씩 공부할 수 있어요.</AppText>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/add')} style={styles.emptyButton}>
        <AppText style={styles.emptyButtonText}>단어 추가하기</AppText>
      </Pressable>
    </View>
  );
}

export default function StudyScreen() {
  const { ready } = useWords();
  const { word: wordParam } = useLocalSearchParams<{ word?: string | string[] }>();
  const wordId = typeof wordParam === 'string' ? wordParam : undefined;
  if (!ready) return <View style={styles.screen} />;
  // 쿼리가 바뀌면 처음부터 다시 시작한다.
  return <StudyBody key={wordId ?? 'all'} wordId={wordId} />;
}

function StudyBody({ wordId }: { wordId?: string }) {
  const { words, prefs } = useWords();
  const { list, start } = useMemo(() => studyList(words, wordId, prefs.activeChapter), [words, wordId, prefs.activeChapter]);
  const total = list.length;
  const [state, dispatch] = useReducer(studyReducer, start, startStudy);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const wheelRef = useRef<View>(null);
  const lastWheel = useRef(0);
  const lastSwipe = useRef(0);
  const layoutHeight = useRef(0);
  const contentHeight = useRef(0);
  const overflows = useRef(false);

  const move = useCallback(
    (step: number) => {
      dispatch({ type: 'move', step, length: total });
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [total],
  );

  const contentPan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          const step = swipeDirection(event.translationX, event.translationY);
          if (step !== 0) {
            lastSwipe.current = Date.now();
            move(step);
          }
        }),
    [move],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = wheelRef.current as unknown as HTMLElement | null;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      // 해석이 열려 있거나 내용이 화면보다 길어 스크롤이 필요하면 휠을 단어 넘기기로 가로채지 않는다.
      const result = wheelStep({
        deltaY: event.deltaY,
        locked: state.translationOpen || overflows.current,
        length: total,
        now: Date.now(),
        lastWheel: lastWheel.current,
      });
      if (!result.consume) return;
      event.preventDefault();
      lastWheel.current = result.lastWheel;
      if (result.step !== 0) move(result.step);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [move, state.translationOpen, total]);

  const updateOverflow = () => {
    overflows.current = contentHeight.current > layoutHeight.current + 1;
  };

  const toggleTranslation = () => {
    // 마우스 드래그로 넘긴 직후에 이어지는 클릭은 예문 토글로 세지 않는다.
    if (Date.now() - lastSwipe.current < 100) return;
    dispatch({ type: 'toggleTranslation' });
  };

  const index = state.index >= total ? 0 : state.index;
  const word = list[index];
  const pad = width >= 621 ? 24 : 20;
  const narrow = isNarrow(width);
  const wordSize = Math.min(40, Math.max(32, width * 0.09));
  const wordStyle = { fontSize: wordSize, lineHeight: wordSize * 1.12, letterSpacing: -0.025 * wordSize };
  const hint = total === 0 ? '' : state.translationOpen ? TRANSLATION_HINT : HOLD_HINT;

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: 16 + insets.top, paddingHorizontal: pad }}>
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="단어장으로 돌아가기"
            onPress={() => router.navigate('/')}
            style={styles.back}
          >
            <AppText style={styles.backText}>←</AppText>
          </Pressable>
          <Pressable disabled accessibilityRole="button" accessibilityLabel="학습 챕터 선택 (준비 중)" style={styles.chapter}>
            <View style={styles.bookIcon}>
              <AppText style={styles.bookIconText}>▤</AppText>
            </View>
            <AppText numberOfLines={1} style={styles.chapterText}>
              {word ? word.chapter : 'Daily vocabulary'}
            </AppText>
          </Pressable>
          <AppText style={styles.count}>{total ? `${index + 1} / ${total}` : '0 / 0'}</AppText>
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${total ? ((index + 1) / total) * 100 : 0}%` }]} />
        </View>
      </View>

      <GestureDetector gesture={contentPan} touchAction="pan-y">
        <View style={styles.contentArea}>
          <View ref={wheelRef} style={styles.contentArea}>
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
              onLayout={(event) => {
                layoutHeight.current = event.nativeEvent.layout.height;
                updateOverflow();
              }}
              onContentSizeChange={(_, height) => {
                contentHeight.current = height;
                updateOverflow();
              }}
            >
              {!word ? (
                <StudyEmpty />
              ) : (
                <View key={word.id} style={styles.expanded}>
                  <View style={styles.card}>
                    <AppText style={[styles.cardWord, wordStyle]}>{word.word}</AppText>
                    <AppText style={styles.cardMeta}>WORD · {word.chapter}</AppText>
                  </View>
                  <View style={styles.meaningHeading}>
                    <AppText style={styles.meaningHeadingTitle}>뜻</AppText>
                    <AppText style={styles.meaningHeadingCount}>{word.meanings.length}개의 뜻 · 꾹 누르면 동의어</AppText>
                  </View>
                  <View style={styles.meanings}>
                    {word.meanings.map((meaning, i) => (
                      <MeaningRow key={i} number={i + 1} meaning={meaning} synonyms={word.synonyms[i] ?? ''} />
                    ))}
                  </View>
                  <View style={styles.example}>
                    <ExampleBlock word={word} open={state.translationOpen} onToggle={toggleTranslation} />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </GestureDetector>

      <View style={[styles.footer, { paddingHorizontal: pad, paddingBottom: 23 + insets.bottom }]}>
        <AppText style={[styles.footerText, narrow && styles.footerTextNarrow]}>{MOVE_HINT}</AppText>
        <AppText style={[styles.footerText, styles.footerHint, narrow && styles.footerTextNarrow]}>{hint}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42 },
  back: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#e5f0ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 24, lineHeight: 24 },
  chapter: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  bookIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#e5f0ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookIconText: { color: colors.accent, fontSize: 15 },
  chapterText: { flexShrink: 1, fontSize: 12 },
  count: { color: '#6f7d77', fontSize: 12, fontWeight: '700' },
  progress: { height: 4, marginTop: 14, borderRadius: 5, overflow: 'hidden', backgroundColor: '#e7e5df' },
  progressFill: { height: 4, borderRadius: 5, backgroundColor: colors.accent },
  contentArea: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  content: { paddingBottom: 18 },
  expanded: { paddingTop: 18, paddingBottom: 24 },
  card: {
    width: '100%',
    minHeight: 130,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eeeae4',
    borderRadius: 20,
    backgroundColor: colors.surface,
    boxShadow: '0 12px 24px rgba(35, 46, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWord: { fontFamily: fonts.serif, fontWeight: '700', textAlign: 'center' },
  cardMeta: { marginTop: 9, color: '#88958e', fontSize: 11 },
  meaningHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 20,
    marginBottom: 10,
  },
  meaningHeadingTitle: { fontSize: 13, fontWeight: '700' },
  meaningHeadingCount: { fontSize: 10, color: colors.muted },
  meanings: { gap: 9 },
  example: { marginTop: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 10 },
  footerText: { color: '#8b9690', fontSize: 10 },
  footerTextNarrow: { fontSize: 9 },
  footerHint: { flexShrink: 1, color: colors.accent, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 170, paddingHorizontal: 15 },
  emptyIcon: {
    width: 54,
    height: 54,
    marginBottom: 15,
    borderRadius: 17,
    backgroundColor: '#e5f0ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { color: colors.accent, fontSize: 25 },
  emptyTitle: { marginBottom: 8, fontSize: 19, fontWeight: '700' },
  emptyText: { marginVertical: 13, color: colors.muted, fontSize: 13, textAlign: 'center' },
  emptyButton: { marginTop: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, backgroundColor: colors.accent },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});
```

- [ ] **Step 7: 사라진 컴포넌트 삭제**

```bash
git rm src/components/study/DetailPanel.tsx src/components/ExamplePair.tsx
```

- [ ] **Step 8: 정적 확인**

Run: `npm run typecheck && npm test && npm run build:web`
Expected: **전체 타입체크 통과**, 테스트 통과, `Exported: dist`. 오류가 남으면(예: `ExamplePair`를 아직 가져오는 곳) 이 태스크 범위 안에서 고친다.

- [ ] **Step 9: 브라우저 확인** (`npx expo start --web --port 8099`, 끝나면 끈다)

1. 홈에서 `cultivate` 줄을 누르면 `/study?word=…`로 열리고 **그 Day(Day 1)의 단어 3개**를 `1 / 3` 형태로 넘길 수 있다. 하단 "학습" 탭은 파라미터 없이 열려 `Day 1` 단어부터 4개(Day 순서)를 넘긴다. 주소를 `/study?word=없는id`로 바꾸면 전체 목록 첫 단어로 열린다.
2. 기본 화면: 표제어 카드, `뜻` 머리글(`3개의 뜻 · 꾹 누르면 동의어`), 번호 붙은 뜻 3줄이 **항상 보이고**, **마지막 뜻 아래에 영어 예문 한 줄**이 보인다(예문 속 `cultivate`는 굵게). 예문 아래에는 아직 한국어 해석이 없다.
3. **뜻 1(`경작하다, 재배하다`)을 누르고 있는 동안** 그 줄에 `nurture`, `develop`, `foster` 칩이 보이고 뜻 글자는 사라지며, 떼면 뜻으로 돌아온다. 뜻 2·3은 각자 다른 동의어(`develop, foster` / `establish, build`)가 보인다. 동의어가 비어 있는 뜻(폼으로 단어를 하나 추가해 확인: 뜻 2개에 동의어 한 줄만 입력)은 누르는 동안 `등록된 동의어가 없어요`가 보인다.
4. **영어 예문을 한 번 누르면** 아래에 한국어 해석이 열리고 **맥락 뜻 `기르도록`만 회색 블록**으로 가려져 있으며 영어 문장은 그대로다. 푸터 힌트가 `↖  해석을 꾹 누르면 맥락 뜻이 보여요`로 바뀐다. **해석을 누르고 있는 동안** 맥락 뜻이 굵게 보이고 떼면 다시 가려진다. 영어 문장을 다시 누르면 해석이 닫힌다. 다른 단어로 넘기면 항상 영어 문장만 보이는 상태로 시작한다.
5. 예문 경우의 수(폼으로 확인): 예문 없는 단어 → `예문이 아직 없어요.`; 영어만 있는 옛 데이터(localStorage에 직접) → 터치해도 열리지 않음; 해석만 있는 옛 데이터 → `영어 예문이 없어요.` 뒤 터치로 해석이 열림; 맥락 뜻이 해석에 없는 단어 → 해석이 가려지지 않고 그대로 보임.
6. **넘기기**: 좌우 마우스 드래그로 단어가 넘어가고, 드래그 직후에 예문 해석이 저절로 열리지 않는다(연속으로 두 번 넘겨 확인). 휠로 넘어가며(해석이 닫혀 있을 때), 해석이 열려 있으면 휠이 넘기지 않는다. 뜻을 8개 넣은 단어를 만들어 내용이 화면보다 길어졌을 때 **휠이 단어를 넘기지 않고 스크롤한다**.
7. 키보드: 뜻 줄에 Tab으로 포커스를 주고 Space를 누르고 있는 동안 동의어가 보이는지 확인한다. 웹 `<button>`에서 동작하지 않으면 **고치지 말고** 보고서에 한계로 적는다.
8. 390px 폭과 모바일 에뮬레이션(Browser pane의 mobile 프리셋)에서 레이아웃이 깨지지 않고, 꾹 눌러도 글자 선택이나 메뉴가 뜨지 않는다. 가능하면 모바일 에뮬레이션에서 뜻 줄에 터치 이벤트(`touchstart`/`touchend`)를 보내 동의어가 보였다 사라지는지 확인한다(실제 꾹 누르기를 구동할 수 없으면 포인터/마우스 이벤트를 JS로 보내 확인하고 그렇게 했다고 적는다).
9. 홈에서 만든 단어 추가·삭제 후에도 학습이 오류 없이 열린다. 콘솔 오류가 없다.

- [ ] **Step 10: 커밋**

```bash
git add src
git commit -m "feat: 학습 화면을 뜻 꾹 누르기 동의어와 마지막 뜻 아래 예문(해석·맥락 뜻 가리기)으로 개편 (#10)"
```

---

### Task 5: 하단 탭 정리, 홈 Day 선택 드롭박스와 암기 모드 통합

**Files:**
- Modify: `src/components/BottomNav.tsx`, `src/app/(main)/index.tsx`, `src/components/wordbook/MaskPanel.tsx`, `src/data/wordList.ts`
- Create: `src/components/wordbook/DayPicker.tsx`
- Test: `src/data/wordList.test.ts`(추가)

**Interfaces:**
- Consumes: `groupByChapter`, `wordsInChapter`, `toggleAll`, `anyCardVisible`, `useWords().setPref/setShown` (Task 1·3)
- Produces: `effectiveChapter(words, active): string`(wordList.ts), `DayPicker({ options: { value: string; label: string; count: number }[]; value: string; onChange })`, `MaskPanel`에 선택적 `children`(패널 맨 위에 그려진다)

기존 화면의 시각 값(패널 `#e9f1ec`, 스위치, 카드 그림자 등)을 재사용하고 새 색·크기를 만들지 않는다. 드롭박스는 열린 목록을 카드 안에서 아래로 펼친다(떠 있는 팝오버 금지: ScrollView 안에서 잘림·겹침이 생긴다). 항목 버튼 안에 버튼을 넣지 않는다.

- [ ] **Step 1: 실패하는 테스트** — `src/data/wordList.test.ts` 맨 아래에 추가(`effectiveChapter`도 import에 더한다)

```ts
describe('effectiveChapter', () => {
  const list = [make('a', 'Day 1'), make('b', 'Day 2')];

  it('keeps "all" and chapters that still exist', () => {
    expect(effectiveChapter(list, 'all')).toBe('all');
    expect(effectiveChapter(list, 'Day 2')).toBe('Day 2');
  });

  it('falls back to "all" when the saved chapter has no words left', () => {
    expect(effectiveChapter(list, 'Day 5')).toBe('all');
    expect(effectiveChapter([], 'Day 1')).toBe('all');
  });
});
```

Run: `npx jest src/data/wordList.test.ts` → FAIL (`effectiveChapter` 없음).

- [ ] **Step 2: 구현** — `src/data/wordList.ts` 맨 아래에 추가

```ts
/** 저장된 활성 챕터에 단어가 더 이상 없으면 전체('all')로 되돌린다. */
export function effectiveChapter(words: Word[], active: string): string {
  return active === 'all' || words.some((word) => word.chapter === active) ? active : 'all';
}
```

Run: `npx jest src/data/wordList.test.ts` → PASS.

- [ ] **Step 3: 하단 탭** — `src/components/BottomNav.tsx`
  - `NavItem.href` 유니온에서 `'/add'`를 뺀다.
  - `ITEMS`를 이 순서로 바꾼다: `홈`(icon `home`, `/`), `학습`(icon `study`, `/study`), `시험`(icon `test`, `/test`), `내 정보`(icon `account`, `/account`, `also: ['/login', '/signup', '/class-code']`). `추가` 항목은 지운다.
  - 이 앱에는 아직 관리자 구분이 없으므로 `/add` 화면과 `WordFormSheet`는 그대로 둔다(탭과 홈 진입점만 없앤다).

- [ ] **Step 4: MaskPanel에 children** — `src/components/wordbook/MaskPanel.tsx`
  `Props`에 `children?: ReactNode`(`import type { ReactNode } from 'react'`)를 더하고, 패널 `View` 안 맨 앞(heading 위)에 `{children ? <View style={styles.slot}>{children}</View> : null}`를 그린다. 스타일 `slot: { marginBottom: 15 }`. 나머지는 그대로.

- [ ] **Step 5: DayPicker 작성** — `src/components/wordbook/DayPicker.tsx`

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { AppText } from '../AppText';

export type DayOption = { value: string; label: string; count: number };
type Props = { options: DayOption[]; value: string; onChange: (value: string) => void };

export function DayPicker({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Day 선택: ${current.label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.trigger}
      >
        <AppText style={styles.triggerLabel}>{current.label}</AppText>
        <AppText style={styles.triggerCount}>{current.count}단어</AppText>
        <AppText aria-hidden style={styles.chevron}>
          {open ? '▴' : '▾'}
        </AppText>
      </Pressable>
      {open && (
        <View style={styles.list}>
          {options.map((option) => {
            const selected = option.value === current.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <AppText style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</AppText>
                <AppText style={styles.optionCount}>{option.count}</AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  triggerLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  triggerCount: { color: colors.muted, fontSize: 11 },
  chevron: { color: colors.accent, fontSize: 13 },
  list: { marginTop: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  optionSelected: { backgroundColor: colors.accentSoft },
  optionLabel: { flex: 1, fontSize: 14 },
  optionLabelSelected: { color: colors.accent, fontWeight: '800' },
  optionCount: { color: colors.muted, fontSize: 11 },
});
```

- [ ] **Step 6: 홈 화면** — `src/app/(main)/index.tsx`
  1. `단어 추가`·`내 정보` 두 카드를 담은 `<View style={styles.actions}> ... </View>` 블록 전체와 그 전용 스타일(`actions`, `actionCard`, `actionCardNarrow`, `actionPrimary`, `actionPrimaryHover`, `actionIcon`, `actionIconNarrow`, `actionIconPrimary`, `actionIconText`, `actionBody`, `actionTitle`, `actionTitleNarrow`, `actionSub`, `actionSubNarrow`, `onPrimary`, `onPrimarySub`)를 지운다. 이로써 안 쓰게 되는 import(`PressableStateCallbackType`, `isNarrow`와 `narrow` 변수 등)도 지운다. `오늘의 단어 학습` 버튼, 검색, 목록은 그대로 둔다.
  2. 선택한 Day를 계산한다. `useWords()`에서 `setPref`, `setShown`을 이미 가져온다.
     ```tsx
     const chapter = effectiveChapter(words, prefs.activeChapter);
     const dayWords = useMemo(() => wordsInChapter(words, chapter), [words, chapter]);
     const dayOptions = useMemo(
       () => [
         { value: 'all', label: '전체 Day', count: words.length },
         ...groupByChapter(words).map((group) => ({ value: group.chapter, label: group.chapter, count: group.words.length })),
       ],
       [words],
     );
     ```
     `list`는 `searchWords(words, query, chapter)`로 바꾼다(`prefs.activeChapter` 대신 `chapter`).
  3. `MaskPanel` 사용부를 다음처럼 바꾼다(Day 선택 드롭박스가 같은 카드 맨 위로 들어간다). `전체 정답 보기`는 **선택한 Day의 단어**(`dayWords`)에만 적용한다.
     ```tsx
     <MaskPanel
       prefs={prefs}
       anyVisible={anyCardVisible(prefs, shown, dayWords)}
       onToggle={(key) => setPref(key, !prefs[key])}
       onRevealAll={() => setShown(toggleAll(prefs, shown, dayWords))}
     >
       <DayPicker
         options={dayOptions}
         value={chapter}
         onChange={(value) => {
           setShown({});
           setPref('activeChapter', value);
         }}
       />
     </MaskPanel>
     ```
     Day를 바꾸면 `setShown({})`으로 펼쳐 둔 정답을 모두 지워, 새 Day의 모든 줄이 같은 상태(스위치대로 가려진 상태)에서 시작하게 한다. 가리기 스위치는 지금처럼 전역 설정이며 모든 Day에 똑같이 적용된다(스위치를 바꾸면 `setPref`가 펼침 상태를 이미 초기화한다).
  4. import에 `DayPicker`, `effectiveChapter`, `wordsInChapter`를 더한다.

- [ ] **Step 7: 정적 확인**

Run: `npm run typecheck 2>&1 | grep -E "BottomNav|DayPicker|MaskPanel|wordList|app/\(main\)/index" || echo "task5 files OK"`
Expected: `task5 files OK` (Task 4가 먼저 끝나 있으면 `npm run typecheck`가 통째로 통과해야 한다).
Run: `npm test` → 전부 통과.

- [ ] **Step 8: 브라우저 확인** (`npx expo start --web --port 8099`, 끝나면 끈다)
  - 하단 바가 `홈, 학습, 시험, 내 정보` 4개 순서이고 `추가` 탭이 없다. 각 탭이 이동하고 현재 탭이 강조된다.
  - 홈에 `단어 추가`·`내 정보` 박스가 없다. `오늘의 단어 학습` 버튼 아래에 연두 카드 하나가 있고 맨 위가 Day 드롭박스, 그 아래가 `암기 모드`(스위치 2개, `전체 정답 보기`)다.
  - 드롭박스를 누르면 `전체 Day`, `Day 1`, `Day 2`가 단어 수와 함께 펼쳐지고, 고르면 닫히며 목록에는 그 Day의 섹션만 보인다. `전체 Day`를 고르면 모두 보인다.
  - Day 1에서 뜻 가리기를 켜고 한 줄의 뜻을 눌러 펼친 뒤 Day 2로 바꿨다가 Day 1로 돌아오면 펼침이 지워져 모든 줄이 똑같이 가려져 있다. 영어 가리기·뜻 가리기는 어느 Day에서든 모든 줄에 똑같이 적용된다.
  - `전체 정답 보기`가 선택한 Day의 줄만 펼치고(다른 Day로 바꿔 보면 그쪽은 가려져 있다), 다시 누르면 그 Day만 다시 가린다.
  - 하단 `학습` 탭: Day 2를 선택한 상태에서 열면 Day 2 단어만 학습 목록으로 나온다(`2 / 1` 같은 개수 확인, Task 4가 끝나 있어야 한다. 아직이면 이 줄은 Task 6에서 확인한다고 보고서에 적는다).
  - 선택한 Day의 단어를 모두 삭제한 뒤 새로고침하면 `전체 Day`로 돌아온다.
  - 390px 폭에서 드롭박스·카드가 깨지지 않는다. 콘솔 오류 없음(로컬 백엔드 8080 호출 오류는 무시).

- [ ] **Step 9: 커밋**

```bash
git add -A src
git commit -m "feat: 하단 탭 순서를 바꾸고 홈에서 Day 선택과 암기 모드를 한 카드로 묶기 (#10)"
```

---

### Task 6: 정리와 최종 확인

**Files:**
- Modify: 남은 죽은 코드가 있는 파일(아래 grep 결과에 따라)

- [ ] **Step 1: 남은 흔적 찾기**

Run: `grep -rnE "definitions|antonyms|derived|related|maskDetails|detailRows|DETAIL_LABELS|splitChips|registerTap|isKeyboardPress|ExamplePair|DetailPanel|WordCard|toggleCard|hasMask|alignDefinitions" src`
Expected: 출력 없음. 남는 줄은 삭제하거나(죽은 코드), 옛 저장 데이터 변환의 의도된 처리(`normalize.ts`/`normalize.test.ts`의 옛 필드 이름 문자열)라면 그대로 둔다. 판단을 보고서에 한 줄로 적는다.
Run: `grep -rn "viewCard\|viewList" src`
Expected: `src/components/Icon.tsx`에만 남는다. 쓰지 않는 아이콘 두 개이므로 `Icon.tsx`에서 `viewCard`, `viewList` 항목(타입 합집합과 SVG 정의)을 지운다.

- [ ] **Step 2: 전체 검증**

Run: `npm run typecheck && npm test && npm run build:web`
Expected: 모두 통과.

- [ ] **Step 3: 최종 브라우저 점검**

`npx expo start --web --port 8099`(끝나면 끈다)로 다음을 한 번 더 훑는다: 홈(Day 섹션, 암기 모드 2스위치, 검색, 단어 추가·수정·삭제) → 줄 누르기 → 학습(뜻 꾹 누르기, 예문 3단계, 넘기기) → 하단 탭 전환 → 새로고침(저장된 단어 유지) → 처음 실행 상태(localStorage 삭제 후 샘플 4개). 콘솔 오류가 없어야 한다.

- [ ] **Step 4: 커밋**

```bash
git add -A src
git commit -m "chore: 개편 후 남은 죽은 코드와 안 쓰는 아이콘 정리 (#10)"
```
(바뀐 파일이 없으면 커밋하지 않는다.)

---

### Task 7: 홈의 `오늘의 단어 학습` 박스 삭제

(사용자 추가 요구 2026-10-30. 학습 진입은 하단 `학습` 탭과 줄 누르기로 충분하다.)

**Files:**
- Modify: `src/app/(main)/index.tsx`

- [ ] **Step 1:** `오늘의 단어 학습` 박스(`<Pressable ... style={styles.launch}> ... </Pressable>` 블록 전체: 아이콘 `▤`, 제목 `오늘의 단어 학습`, 부제 `한 단어씩 넘기며 뜻과 예문 익히기`, 화살표 `→`)와 전용 스타일(`launch`, `launchIcon`, `launchIconText`, `launchBody`, `launchTitle`, `launchSub`, `launchArrow`)을 지운다. 이로써 안 쓰게 되는 import나 변수만 함께 지운다(`router`는 빈 상태 버튼이 쓰면 남긴다). 그 뒤 첫 카드(Day 선택·암기 모드)와 위쪽 히어로 사이의 간격이 어색하지 않은지 확인하고, 필요하면 카드의 위쪽 여백(`MaskPanel`의 `marginTop`)만 맞춘다. 다른 것은 바꾸지 않는다.
- [ ] **Step 2:** `npm run typecheck && npm test` 통과, 브라우저에서 홈에 박스가 없고 히어로 → Day/암기 모드 카드 → 검색 → 목록 순서로 보이며 하단 `학습` 탭과 줄 누르기로 학습이 열리는지 확인한다(콘솔 오류는 8080 호출 제외 없음).
- [ ] **Step 3:** 커밋 `git add -A src && git commit -m "feat: 홈의 오늘의 단어 학습 박스 삭제 (#10)"`

### Task 8: 앱 전체 글꼴을 가독성 좋은 Pretendard로 변경

(사용자 추가 요구 2026-10-30: "가독성이 좋은 폰트로 수정해줘. 전부".)

**Files:**
- Modify: `src/theme.ts`
- Create or Modify: 웹 문서에 글꼴 CSS를 싣는 곳(아래 Step 2)

**Interfaces:** `fonts.body`, `fonts.serif`(theme.ts). 모든 글자는 이미 `AppText`(`fonts.body`)와 `FormInput`/검색창(`fonts.body`), 표제어(`fonts.serif`)로 이 두 값을 거친다. 컴포넌트는 고치지 않는다.

- [ ] **Step 1: 글꼴 스택** — `src/theme.ts`의 `fonts`를 다음으로 바꾼다.

```ts
// 한글 가독성이 좋은 Pretendard. 웹에서는 아래 CSS로 불러오고, 못 불러오면 시스템 한글 글꼴로 대체된다.
const SANS_WEB =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Segoe UI", sans-serif';

export const fonts = {
  body: Platform.select({ web: SANS_WEB, default: undefined }),
  // 표제어·제목도 같은 글꼴을 쓴다(예전 serif에서 변경). 값 이름은 그대로 두어 사용처를 바꾸지 않는다.
  serif: Platform.select({ web: SANS_WEB, default: undefined }),
};
```

- [ ] **Step 2: 웹에서 글꼴 불러오기** — 이 앱은 `app.json`에서 `web.output: "single"`이다. 다음 순서로 시도해 **되는 첫 방법**을 쓴다.
  1. Expo Router의 `src/app/+html.tsx`(루트 HTML)를 만들어 `<head>`에 `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />`와 `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />`를 싣는다. `single` 출력에서 실제로 반영되는지 `npm run build:web` 결과 `dist/index.html`에 두 링크가 들어갔는지로 확인한다. 안 들어가면 이 방법은 버린다(파일도 지운다).
  2. 안 되면 웹에서만, 앱 시작 시 `document.head`에 위 두 `<link>`를 한 번 넣는 작은 함수(`src/theme.ts`가 아니라 `src/app/_layout.tsx` 최상단 effect 또는 모듈 초기화)를 쓴다. 중복 삽입을 막고(`id` 지정) `Platform.OS === 'web'`일 때만 실행한다.
  어느 쪽이든 새 의존성(`expo-font` 등)은 추가하지 않는다. 테스트가 `document`가 없는 jest 환경에서 깨지지 않아야 한다.

- [ ] **Step 3: 확인** — `npm run typecheck && npm test && npm run build:web`. 브라우저에서 홈·학습·시험·내 정보·단어 폼 시트·빈 상태 모두에서 글꼴이 Pretendard로 렌더되는지 확인한다: 페이지에서 `document.fonts`에 Pretendard가 로드됐는지, 대표 요소 몇 개(`getComputedStyle(el).fontFamily`: 히어로 제목, 단어 줄, 검색 입력, 학습 표제어, 하단 탭 라벨, 폼 입력)의 값이 Pretendard로 시작하는지, 그리고 스크린샷으로 한글/영문 모두 읽기 좋은지 본다. CDN을 못 불러오는 상황(오프라인)에서도 시스템 한글 글꼴로 정상 표시되는지 한 번 확인한다(네트워크 요청 차단이 어렵다면 보고서에 미확인으로 적는다). 글자 크기·자간·색은 바꾸지 않는다.
- [ ] **Step 4: 커밋** `git add -A src && git commit -m "feat: 앱 전체 글꼴을 가독성 좋은 Pretendard로 변경 (#10)"`
