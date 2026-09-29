# Expo 웹 우선 초기 세팅 — 단어장 목록 + 학습 카드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ssen-app`에 Expo(SDK 57) + Expo Router 프로젝트를 만들고, 팀원 프로토타입(`pocket-vocabulary-v2`)의 단어장 목록 화면과 학습 카드 화면을 디자인 그대로 옮겨 웹으로 띄운다.

**Architecture:** 화면과 무관한 로직(데이터 정규화, 저장, 가리기, 검색, 예문 강조, 학습 상태)은 `src/data/`의 순수 함수로 두고 Jest로 테스트한다. 화면은 `src/app/`(Expo Router 라우트)과 `src/components/`에 두고, 원본 CSS 값을 RN 스타일로 옮긴다. 루트 레이아웃이 "폰 캔버스"(뷰포트 402px 초과 시 402×874 카드, 이하면 전체 화면)를 그리고, `(main)` 그룹이 상단바·하단 탭을 붙인다. 학습 화면(`/study`)은 그룹 밖에 있어 상단바·하단 탭이 없다(원본 `body.study-active`).

**Tech Stack:** Expo SDK 57 (`expo ~57.0.26`), React Native 0.86.3, React 19.2.3, Expo Router ~57.0.24, react-native-web ~0.21.0, react-native-gesture-handler ~2.32.0, react-native-svg 15.15.4, @react-native-async-storage/async-storage 2.2.0, TypeScript ~6.0.3, Jest 29 + jest-expo ~57.0.5.

**Spec:** `docs/superpowers/specs/2026-09-30-expo-web-wordbook.md`

## Global Constraints

- 작업 위치: `/Users/JM/dev/ssen/ssen-app`, 브랜치 `feature/3-expo-web-init`(이슈 #3). 모든 경로는 이 저장소 루트 기준.
- **디자인 1차 자료:** `/Users/JM/dev/ssen/pocket-vocabulary-v2/style.css`(두 번째 `:root`인 281행 이후 규칙이 최종 테마), `index.html`, `app.js`. 이 계획의 스타일 값은 전부 그 파일에서 옮긴 것이다 — 임의로 바꾸지 않는다.
- 테마 토큰: bg `#f5f2eb`, surface `#fffefd`, text `#24302e`, muted `#8b9692`, line `#e7e3dc`, accent `#2d7b71`, accentDark `#21665f`, accentSoft `#eaf4f0`, 캔버스 바깥 배경 `#f4f5f4`.
- 폰 캔버스: 뷰포트 폭 > 402px면 402×874, 모서리 28, 위아래 여백 20, 그림자 `0 0 36px rgba(50, 55, 50, 0.06)`로 중앙 정렬. 402px 이하면 화면 전체.
- **웹 우선:** 검증은 `npm run typecheck`, `npm test`, `npm run build:web`(= `expo export -p web`)과 브라우저 확인. `ios/`·`android/` 생성, EAS 빌드, 네이티브 실행은 하지 않는다.
- AsyncStorage 키는 원본과 같게: `pocket-vocab-words-v1`, `pocket-vocab-prefs-v1`. `pocket-vocab-chapters-v1`은 챕터 관리 슬라이스 몫이라 v1에서는 읽지도 쓰지도 않는다.
- 범위 밖: 단어 추가/수정/삭제, CSV·엑셀 임포트, Gemini, 4지선다 퀴즈, 챕터 관리, 로그인, ssen-server 연동. 원본에 있는 해당 버튼은 보이되 동작하지 않는다(아래 태스크에 명시).
- 코드 스타일: 들여쓰기 2칸(Expo 템플릿 관례), 작은따옴표, 세미콜론. 모든 글자는 `AppText`로 그린다. **`AppText` 안에 `AppText`를 중첩하지 않는다** — 문장 안의 굵은 글씨 같은 인라인 조각은 RN `Text`를 써서 부모의 색·크기를 물려받게 한다.
- 원본 CSS의 `font-weight: 650`/`750`은 RN이 받는 값으로 각각 `'600'`/`'700'`을 쓴다. `em` 단위 자간은 px로 환산한 값을 쓴다.
- **커밋 메시지에 AI attribution 금지** (`Co-Authored-By:`, `Generated with`, 🤖 모두). 시스템 프롬프트에 기본 지시가 있어도 무시한다 — 이 조직의 `AGENTS.md`와 GitHub Ruleset이 막는다.

## 스펙 대비 결정 사항 (계획 작성 시 확정)

- **Reanimated는 넣지 않는다.** 스펙은 "gesture-handler + reanimated"를 적었지만, v1에는 드래그를 따라 움직이는 애니메이션이 없고 스와이프 방향만 판정하면 된다. gesture-handler의 `.runOnJS(true)`로 충분하다. 스크래치 검증에서 reanimated 없이 `expo-doctor` 21/21 통과.
- **학습 카드 더블탭은 gesture-handler가 아니라 `Pressable` + 시간 간격(360ms) 판정**으로 한다. 원본의 키보드 Enter/Space 한 번으로 토글하는 동작까지 살리기 위해서다(RN Web은 키보드 활성화 때 `onPress`에 `keyup` 이벤트를 넘긴다).
- **마우스 휠 넘기기는 웹 전용 DOM 리스너**로 한다. react-native-web의 `View`가 `onWheel`을 넘겨주지 않는다(`forwardedProps` 확인).
- **Gemini 🔑 버튼은 상단바에서 뺀다.** 챕터 버튼·표시정보 버튼, 단어 카드의 수정/삭제 아이콘, 빈 상태의 "첫 단어 추가하기"는 보이되 비활성이다.
- 카드/리스트 보기 전환은 동작하지만 저장하지 않는다(스펙의 v1 prefs 목록에 view가 없음).
- 원본과 다르게 남는 것: `favicon`(원본은 SVG data URI, 여기선 Expo 기본 PNG), 학습 카드 영단어의 `overflow-wrap: anywhere`(RN 스타일에 없음). 호버 효과는 원본에서 v1 범위에 걸리는 유일한 곳인 "단어 추가" 카드에만 넣는다.

## Review Focus

1. **저장소를 못 쓰는 브라우저**(사파리 시크릿 모드, 용량 초과로 `getItem`/`setItem`이 실패) — 앱은 샘플 단어로 뜨고, 가리기 스위치를 눌러도 멈추지 않아야 한다. → Task 3 `storage.test.ts`의 "storage throws" / "saving fails" 테스트.
2. **예전 형식이나 일부만 있는 저장 데이터**(`meaning` 단수, `details.definition` 여러 줄, 챕터 없음, 객체가 아닌 값) — 정규화돼서 뜨고, 쓸 수 없는 항목만 빠져야 한다. → Task 2 `normalize.test.ts`, Task 3 `storage.test.ts`.
3. **검색창에 공백만 넣거나 `(*[` 같은 글자를 넣는 경우** — 공백은 "전체"로, 특수문자는 오류 없이 결과 없음으로. → Task 4 `filter.test.ts`.
4. **학습할 단어가 0개나 1개인 챕터** — 넘기기·휠이 아무것도 망가뜨리지 않아야 한다. → Task 7 `study.test.ts`의 `move`(length 0), `wheelStep`(length 1).
5. **학습 카드를 빠르게 세 번 누르는 경우** — 두 번째에서 뒤집히고, 세 번째 탭 하나로 다시 뒤집히면 안 된다. → Task 7 `study.test.ts`의 `registerTap`.

---

### Task 1: Expo 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `jest.setup.js`
- Create: `assets/icon.png`, `assets/favicon.png`, `assets/android-icon-background.png`, `assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png` (Expo 템플릿에서 복사)
- Create: `src/app/_layout.tsx`, `src/app/(main)/index.tsx` (임시 화면 — Task 5·6에서 교체)
- Modify: `.gitignore`, `README.md`

**Interfaces:**
- Produces: `npm run web`, `npm run build:web`, `npm run typecheck`, `npm test` 스크립트. Jest는 `jest-expo` 프리셋이고 AsyncStorage는 `jest.setup.js`에서 공식 mock으로 바뀐다. `tsconfig.json`의 `types: ["jest"]`는 TypeScript 6이 `types` 기본값을 `[]`로 바꿔서 필요하다(없으면 테스트 파일의 `describe`/`expect`가 타입 오류).

- [ ] **Step 1: 템플릿 에셋 복사**

기존 `README.md`·`AGENTS.md`·`CONTRIBUTING.md`·`.github`를 덮어쓰지 않도록 템플릿은 임시 폴더에 만들고 에셋만 가져온다.

```bash
cd /Users/JM/dev/ssen/ssen-app
TPL=$(mktemp -d)
npx --yes create-expo-app@5.0.0 "$TPL/tpl" --template blank-typescript --no-install
mkdir -p assets
cp "$TPL/tpl/assets/icon.png" "$TPL/tpl/assets/favicon.png" "$TPL/tpl/assets/android-icon-background.png" "$TPL/tpl/assets/android-icon-foreground.png" "$TPL/tpl/assets/android-icon-monochrome.png" assets/
rm -rf "$TPL"
ls assets
```

Expected: 다섯 개 png가 `assets/`에 보인다.

- [ ] **Step 2: `package.json` 작성**

```json
{
  "name": "ssen-app",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "build:web": "expo export -p web",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@expo/metro-runtime": "~57.0.16",
    "@react-native-async-storage/async-storage": "2.2.0",
    "expo": "~57.0.26",
    "expo-constants": "~57.0.20",
    "expo-linking": "~57.0.11",
    "expo-router": "~57.0.24",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.3",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0",
    "react-native-svg": "15.15.4",
    "react-native-web": "~0.21.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/react": "~19.2.2",
    "jest": "^29.7.0",
    "jest-expo": "~57.0.5",
    "typescript": "~6.0.3"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFiles": ["./jest.setup.js"]
  }
}
```

- [ ] **Step 3: `app.json`, `tsconfig.json`, `jest.setup.js` 작성**

`app.json`:

```json
{
  "expo": {
    "name": "포켓 단어장",
    "slug": "ssen-app",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "ssenapp",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "output": "single"
    },
    "plugins": ["expo-router"]
  }
}
```

`tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["jest"]
  }
}
```

`jest.setup.js`:

```js
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

- [ ] **Step 4: 임시 라우트 두 개 작성**

`src/app/_layout.tsx`:

```tsx
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
```

`src/app/(main)/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>포켓 단어장</Text>
    </View>
  );
}
```

- [ ] **Step 5: `.gitignore`에 두 줄 추가**

`# expo` 블록의 `expo-env.d.ts` 줄 바로 아래에 추가한다:

```
.metro-health-check*
*.tsbuildinfo
```

- [ ] **Step 6: `README.md`의 "기술 스택"·"개발 환경 준비" 섹션 교체**

첫 설명 줄 `쎈슬기 단어장 — 태블릿 앱 (React Native + Expo)`을 `쎈슬기 단어장 — 영단어 학습 앱 (React Native + Expo, 지금은 웹 우선)`으로 바꾸고, `## 기술 스택`부터 `## 서버` 직전까지를 아래로 바꾼다:

````markdown
## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | React Native + Expo SDK 57 (TypeScript) |
| 네비게이션 | Expo Router |
| 제스처 | react-native-gesture-handler |
| 로컬 저장 | AsyncStorage |
| 테스트 | Jest (jest-expo) |

화면 디자인은 팀원 프로토타입 [pocket-vocabulary-v2](https://github.com/jej41837/pocket-vocabulary-v2)를 그대로 옮긴 것입니다.

## 개발 환경 준비

```bash
npm install
npm run web        # 브라우저에서 확인 (웹 우선)
npm test           # 단위 테스트
npm run typecheck  # 타입 검사
npm run build:web  # dist/ 에 정적 웹 결과물 생성
```

지금은 웹을 우선합니다. 네이티브 빌드(iOS/Android)는 이후 단계에서 다룹니다.

````

- [ ] **Step 7: 설치 후 검증**

```bash
npm install
npm run typecheck
npx jest --passWithNoTests
npm run build:web
npx --yes expo-doctor
```

Expected: typecheck 출력 없음, Jest `No tests found, exiting with code 0`, 빌드 마지막 줄 `Exported: dist`, expo-doctor 실패 0개(스크래치 검증 때 `21/21 checks passed`).

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json app.json tsconfig.json jest.setup.js assets src .gitignore README.md
git commit -m "feat: Expo SDK 57 + Expo Router 웹 우선 프로젝트 스캐폴딩 (#3)"
```

---

### Task 2: 단어 데이터 모델 · 정규화 · 샘플

**Files:**
- Create: `src/data/types.ts`, `src/data/normalize.ts`, `src/data/samples.ts`
- Test: `src/data/normalize.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `WordDetails`, `Word`, `Prefs`, `MaskField = 'word' | 'meaning' | 'details' | 'exampleWord'`, `ShownMap = Record<string, Partial<Record<MaskField, boolean>>>`
  - `normalize.ts`: `blankDetails(): WordDetails`, `splitMeanings(value: unknown): string[]`, `alignDefinitions(meanings: string[], values: unknown[]): string[]`, `normalizeWord(input: unknown): Word`
  - `samples.ts`: `SAMPLE_WORDS: Word[]` (원본 `app.js:7-18`의 4개 단어, 이미 정규화된 형태, 순서 cultivate → resilient → insight → derive)

- [ ] **Step 1: 타입 작성** — `src/data/types.ts`

```ts
export type WordDetails = {
  example: string;
  exampleKo: string;
  exampleMeaning: string;
  synonyms: string;
  antonyms: string;
  derived: string;
  related: string;
};

export type Word = {
  id: string;
  word: string;
  meanings: string[];
  definitions: string[];
  chapter: string;
  details: WordDetails;
};

export type Prefs = {
  maskWord: boolean;
  maskMeaning: boolean;
  maskDetails: boolean;
  activeChapter: string;
};

export type MaskField = 'word' | 'meaning' | 'details' | 'exampleWord';

export type ShownMap = Record<string, Partial<Record<MaskField, boolean>>>;
```

- [ ] **Step 2: 샘플 작성** — `src/data/samples.ts`

원본의 `samples` + `sampleDefinitions`를 원본 `norm()`을 거친 결과 그대로 옮긴 것이다(`definitions`는 `sampleDefinitions` 값).

```ts
import type { Word } from './types';

export const SAMPLE_WORDS: Word[] = [
  {
    id: 'sample-cultivate',
    word: 'cultivate',
    meanings: ['경작하다, 재배하다', '기르다, 함양하다', '관계를 쌓다'],
    definitions: [
      'to prepare and use land for growing crops',
      'to develop a quality or skill through effort',
      'to develop and maintain a relationship over time',
    ],
    chapter: 'Day 1',
    details: {
      example: 'The course helps students cultivate critical thinking.',
      exampleKo: '이 과정은 학생들이 비판적 사고력을 기르도록 돕는다.',
      exampleMeaning: '기르도록',
      synonyms: 'nurture, develop, foster',
      antonyms: 'neglect',
      derived: 'cultivation, cultivated',
      related: 'grow, encourage',
    },
  },
  {
    id: 'sample-resilient',
    word: 'resilient',
    meanings: ['회복력이 있는', '탄력 있는'],
    definitions: ['able to recover quickly from difficulty', 'able to return to its original shape after being bent'],
    chapter: 'Day 1',
    details: {
      example: 'She remained resilient through every change.',
      exampleKo: '그녀는 모든 변화 속에서도 회복력을 유지했다.',
      exampleMeaning: '회복력을 유지했다',
      synonyms: 'strong, flexible',
      antonyms: 'fragile',
      derived: 'resilience, resiliently',
      related: 'durable, adaptable',
    },
  },
  {
    id: 'sample-insight',
    word: 'insight',
    meanings: ['통찰력', '이해'],
    definitions: ['the ability to understand a situation deeply', 'an understanding of something'],
    chapter: 'Day 1',
    details: {
      example: 'The data gave us a useful insight.',
      exampleKo: '그 데이터는 우리에게 유용한 통찰력을 주었다.',
      exampleMeaning: '통찰력',
      synonyms: 'perception, understanding',
      antonyms: 'ignorance',
      derived: 'insightful',
      related: 'awareness, intuition',
    },
  },
  {
    id: 'sample-derive',
    word: 'derive',
    meanings: ['이끌어내다', '유래하다'],
    definitions: ['to obtain something from a source', 'to come from or originate in something'],
    chapter: 'Day 2',
    details: {
      example: 'We can derive the formula from this result.',
      exampleKo: '우리는 이 결과로부터 공식을 이끌어낼 수 있다.',
      exampleMeaning: '이끌어낼',
      synonyms: 'obtain, deduce',
      antonyms: '',
      derived: 'derivation, derivative',
      related: 'infer, originate',
    },
  },
];
```

- [ ] **Step 3: 실패하는 테스트 작성** — `src/data/normalize.test.ts`

```ts
import { alignDefinitions, blankDetails, normalizeWord, splitMeanings } from './normalize';
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

describe('alignDefinitions', () => {
  it('pads missing definitions and drops extras so lengths match meanings', () => {
    expect(alignDefinitions(['a', 'b', 'c'], ['one', ' two '])).toEqual(['one', 'two', '']);
    expect(alignDefinitions(['a'], ['one', 'two'])).toEqual(['one']);
  });
});

describe('normalizeWord', () => {
  it('fills defaults for a minimal record', () => {
    const word = normalizeWord({ word: ' resilient ', meanings: ['회복력이 있는'] });
    expect(word.word).toBe('resilient');
    expect(word.chapter).toBe('Day 1');
    expect(word.definitions).toEqual(['']);
    expect(word.details).toEqual(blankDetails());
    expect(word.id).not.toBe('');
  });

  it('reads the legacy singular meaning and multi-line details.definition', () => {
    const word = normalizeWord({
      id: 'w1',
      word: 'derive',
      meaning: '이끌어내다;유래하다',
      chapter: '  ',
      details: { definition: 'to obtain\nto originate', example: 'We derive it.' },
    });
    expect(word.id).toBe('w1');
    expect(word.meanings).toEqual(['이끌어내다', '유래하다']);
    expect(word.definitions).toEqual(['to obtain', 'to originate']);
    expect(word.chapter).toBe('Day 1');
    expect(word.details.example).toBe('We derive it.');
  });

  it('turns non-object input into an empty word instead of throwing', () => {
    const word = normalizeWord('garbage');
    expect(word.word).toBe('');
    expect(word.meanings).toEqual([]);
  });

  it('leaves the bundled samples unchanged', () => {
    for (const sample of SAMPLE_WORDS) {
      expect(normalizeWord(sample)).toEqual(sample);
    }
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `npx jest src/data/normalize.test.ts`
Expected: FAIL — `Cannot find module './normalize'`.

- [ ] **Step 5: 구현** — `src/data/normalize.ts`

원본 `app.js:22-25`(`split`, `alignedDefinitions`, `norm`)을 옮긴 것이다.

```ts
import type { Word, WordDetails } from './types';

const DETAIL_KEYS: (keyof WordDetails)[] = [
  'example',
  'exampleKo',
  'exampleMeaning',
  'synonyms',
  'antonyms',
  'derived',
  'related',
];

type RawWord = {
  id?: unknown;
  word?: unknown;
  meanings?: unknown;
  meaning?: unknown;
  definitions?: unknown;
  chapter?: unknown;
  details?: unknown;
};

export function blankDetails(): WordDetails {
  return { example: '', exampleKo: '', exampleMeaning: '', synonyms: '', antonyms: '', derived: '', related: '' };
}

export function splitMeanings(value: unknown): string[] {
  const parts: unknown[] = Array.isArray(value) ? value : String(value || '').split(/\n|\s*;\s*/);
  return parts.map((part) => String(part).trim()).filter(Boolean);
}

export function alignDefinitions(meanings: string[], values: unknown[]): string[] {
  return meanings.map((_, i) => String(values[i] || '').trim());
}

function makeId(): string {
  const cryptoApi = globalThis.crypto;
  return cryptoApi && typeof cryptoApi.randomUUID === 'function' ? cryptoApi.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function normalizeWord(input: unknown): Word {
  const raw: RawWord = input && typeof input === 'object' ? (input as RawWord) : {};
  const rawDetails: Record<string, unknown> =
    raw.details && typeof raw.details === 'object' ? (raw.details as Record<string, unknown>) : {};
  const meanings = splitMeanings(raw.meanings || raw.meaning);
  const definitionSource: unknown[] = Array.isArray(raw.definitions)
    ? raw.definitions
    : String(rawDetails.definition || '').split(/\r?\n/);
  const details = blankDetails();
  for (const key of DETAIL_KEYS) {
    details[key] = String(rawDetails[key] ?? '');
  }
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : makeId(),
    word: String(raw.word || '').trim(),
    meanings,
    definitions: alignDefinitions(meanings, definitionSource),
    chapter: String(raw.chapter || 'Day 1').trim() || 'Day 1',
    details,
  };
}
```

- [ ] **Step 6: 통과 확인**

Run: `npx jest src/data/normalize.test.ts && npm run typecheck`
Expected: PASS (8 tests), typecheck 출력 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/data/types.ts src/data/samples.ts src/data/normalize.ts src/data/normalize.test.ts
git commit -m "feat: 단어 데이터 모델·정규화·샘플 단어 추가 (#3)"
```

---

### Task 3: 로컬 저장소 + 앱 전역 상태

**Files:**
- Create: `src/data/storage.ts`, `src/data/WordsContext.tsx`
- Test: `src/data/storage.test.ts`

**Interfaces:**
- Consumes: `normalizeWord`, `SAMPLE_WORDS`, `Word`, `Prefs`, `ShownMap` (Task 2)
- Produces:
  - `storage.ts`: `WORDS_KEY`, `PREFS_KEY`, `DEFAULT_PREFS: Prefs` (`maskWord: false, maskMeaning: true, maskDetails: false, activeChapter: 'all'` — 원본 `app.js:30` 기본값), `loadWords(): Promise<Word[]>`, `loadPrefs(): Promise<Prefs>`, `savePrefs(prefs: Prefs): Promise<void>`. 세 함수 모두 저장소 오류로 reject되지 않는다.
  - `WordsContext.tsx`: `WordsProvider`, `useWords(): { ready: boolean; words: Word[]; prefs: Prefs; setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void; shown: ShownMap; setShown: (next: ShownMap) => void }`. 가리기 스위치(`mask*`)를 바꾸면 `shown`이 비워진다(원본 `app.js:262`).

- [ ] **Step 1: 실패하는 테스트 작성** — `src/data/storage.test.ts`

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_WORDS } from './samples';
import { DEFAULT_PREFS, PREFS_KEY, WORDS_KEY, loadPrefs, loadWords, savePrefs } from './storage';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('loadWords', () => {
  it('seeds and persists the samples on first run', async () => {
    expect(await loadWords()).toEqual(SAMPLE_WORDS);
    expect(JSON.parse((await AsyncStorage.getItem(WORDS_KEY)) as string)).toEqual(SAMPLE_WORDS);
  });

  it('normalizes stored words and drops unusable ones', async () => {
    await AsyncStorage.setItem(
      WORDS_KEY,
      JSON.stringify([
        { id: 'a', word: 'insight', meanings: ['통찰력'] },
        { id: 'b', word: '', meanings: ['빈 단어'] },
        { id: 'c', word: 'nothing', meanings: [] },
      ]),
    );
    const words = await loadWords();
    expect(words.map((word) => word.id)).toEqual(['a']);
    expect(words[0].chapter).toBe('Day 1');
  });

  it('keeps an intentionally empty word list', async () => {
    await AsyncStorage.setItem(WORDS_KEY, '[]');
    expect(await loadWords()).toEqual([]);
  });

  it('falls back to the samples when stored JSON is corrupt', async () => {
    await AsyncStorage.setItem(WORDS_KEY, '{not json');
    expect(await loadWords()).toEqual(SAMPLE_WORDS);
  });

  it('falls back to the samples when storage throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('denied'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('denied'));
    expect(await loadWords()).toEqual(SAMPLE_WORDS);
  });
});

describe('prefs', () => {
  it('uses defaults when nothing is stored', async () => {
    expect(await loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('merges stored values and ignores wrong types', async () => {
    await AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ maskWord: true, maskMeaning: 'yes', activeChapter: 3, view: 'list' }),
    );
    expect(await loadPrefs()).toEqual({ ...DEFAULT_PREFS, maskWord: true });
  });

  it('round-trips through savePrefs', async () => {
    const prefs = { ...DEFAULT_PREFS, maskDetails: true, activeChapter: 'Day 2' };
    await savePrefs(prefs);
    expect(await loadPrefs()).toEqual(prefs);
  });

  it('does not throw when saving fails', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('quota'));
    await expect(savePrefs(DEFAULT_PREFS)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/data/storage.test.ts`
Expected: FAIL — `Cannot find module './storage'`.

- [ ] **Step 3: 구현** — `src/data/storage.ts`

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeWord } from './normalize';
import { SAMPLE_WORDS } from './samples';
import type { Prefs, Word } from './types';

export const WORDS_KEY = 'pocket-vocab-words-v1';
export const PREFS_KEY = 'pocket-vocab-prefs-v1';

export const DEFAULT_PREFS: Prefs = {
  maskWord: false,
  maskMeaning: true,
  maskDetails: false,
  activeChapter: 'all',
};

type MaskPrefKey = 'maskWord' | 'maskMeaning' | 'maskDetails';

async function readJson(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장이 막힌 브라우저(시크릿 모드, 용량 초과)에서도 학습은 계속되게 둔다.
  }
}

export async function loadWords(): Promise<Word[]> {
  const stored = await readJson(WORDS_KEY);
  if (!Array.isArray(stored)) {
    await writeJson(WORDS_KEY, SAMPLE_WORDS);
    return SAMPLE_WORDS;
  }
  return stored.map((item) => normalizeWord(item)).filter((word) => word.word !== '' && word.meanings.length > 0);
}

export async function loadPrefs(): Promise<Prefs> {
  const stored = await readJson(PREFS_KEY);
  const raw: Record<string, unknown> = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const flag = (key: MaskPrefKey): boolean => (typeof raw[key] === 'boolean' ? (raw[key] as boolean) : DEFAULT_PREFS[key]);
  return {
    maskWord: flag('maskWord'),
    maskMeaning: flag('maskMeaning'),
    maskDetails: flag('maskDetails'),
    activeChapter:
      typeof raw.activeChapter === 'string' && raw.activeChapter !== '' ? raw.activeChapter : DEFAULT_PREFS.activeChapter,
  };
}

export function savePrefs(prefs: Prefs): Promise<void> {
  return writeJson(PREFS_KEY, prefs);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/data/storage.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: 전역 상태 작성** — `src/data/WordsContext.tsx`

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, loadPrefs, loadWords, savePrefs } from './storage';
import type { Prefs, ShownMap, Word } from './types';

type WordsContextValue = {
  ready: boolean;
  words: Word[];
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  shown: ShownMap;
  setShown: (next: ShownMap) => void;
};

const WordsContext = createContext<WordsContextValue | null>(null);

export function WordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [shown, setShown] = useState<ShownMap>({});

  useEffect(() => {
    let active = true;
    Promise.all([loadWords(), loadPrefs()]).then(([loadedWords, loadedPrefs]) => {
      if (!active) return;
      setWords(loadedWords);
      setPrefs(loadedPrefs);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready) void savePrefs(prefs);
  }, [ready, prefs]);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    if (key !== 'activeChapter') setShown({});
  }, []);

  const value = useMemo(
    () => ({ ready, words, prefs, setPref, shown, setShown }),
    [ready, words, prefs, setPref, shown],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWords(): WordsContextValue {
  const value = useContext(WordsContext);
  if (!value) throw new Error('useWords must be used inside WordsProvider');
  return value;
}
```

- [ ] **Step 6: 전체 검증**

Run: `npm test && npm run typecheck`
Expected: 2 suites PASS, typecheck 출력 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/data/storage.ts src/data/storage.test.ts src/data/WordsContext.tsx
git commit -m "feat: AsyncStorage 저장소와 단어·설정 전역 상태 추가 (#3)"
```

---

### Task 4: 화면 로직 순수 함수 — 가리기 · 검색 · 예문 강조

**Files:**
- Create: `src/data/mask.ts`, `src/data/filter.ts`, `src/data/emphasize.ts`
- Test: `src/data/mask.test.ts`, `src/data/filter.test.ts`, `src/data/emphasize.test.ts`

**Interfaces:**
- Consumes: `Word`, `Prefs`, `MaskField`, `ShownMap`, `SAMPLE_WORDS` (Task 2)
- Produces:
  - `mask.ts` (원본 `app.js:37-39, 70, 226, 263`): `isShown(shown, id, field): boolean`, `isMasked(prefs, shown, id, field): boolean`, `toggleField(shown, id, field): ShownMap`, `cardVisible(prefs, shown, word): boolean`, `toggleCard(prefs, shown, word): ShownMap`, `anyCardVisible(prefs, shown, words): boolean`, `toggleAll(prefs, shown, words): ShownMap`, `hasMask(prefs, hasDetails: boolean): boolean`. `prefs` 인자는 `Pick<Prefs, 'maskWord' | 'maskMeaning' | 'maskDetails'>`. 반환하는 `ShownMap`은 항상 새 객체다.
  - `filter.ts` (원본 `app.js:5, 69, 72, 183`): `type DetailKey = 'definition' | 'example' | 'synonyms' | 'antonyms' | 'derived' | 'related'`, `DETAIL_LABELS: Record<DetailKey, string>`, `wordsInChapter(words, chapter): Word[]`, `searchWords(words, query, chapter): Word[]`, `detailRows(word): DetailKey[]`
  - `emphasize.ts` (원본 `app.js:49-67`): `type Segment = { text: string; match: boolean }`, `emphasize(text: string, term: string, english: boolean): Segment[]`, `koreanHighlight(word: Word): string`

- [ ] **Step 1: 실패하는 테스트 세 개 작성**

`src/data/mask.test.ts`:

```ts
import { anyCardVisible, cardVisible, hasMask, isMasked, toggleAll, toggleCard, toggleField } from './mask';
import { SAMPLE_WORDS } from './samples';
import type { ShownMap } from './types';

const allOn = { maskWord: true, maskMeaning: true, maskDetails: true };
const allOff = { maskWord: false, maskMeaning: false, maskDetails: false };
const [cultivate, resilient] = SAMPLE_WORDS;

describe('isMasked', () => {
  it('hides a field only while its switch is on and it has not been revealed', () => {
    expect(isMasked(allOn, {}, cultivate.id, 'meaning')).toBe(true);
    expect(isMasked(allOff, {}, cultivate.id, 'meaning')).toBe(false);
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(isMasked(allOn, shown, cultivate.id, 'meaning')).toBe(false);
  });

  it('ties the example word to the English-word switch', () => {
    expect(isMasked({ ...allOff, maskWord: true }, {}, cultivate.id, 'exampleWord')).toBe(true);
    expect(isMasked({ ...allOn, maskWord: false }, {}, cultivate.id, 'exampleWord')).toBe(false);
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

describe('cards', () => {
  it('reveals then re-hides every field of one card', () => {
    const revealed = toggleCard(allOn, {}, cultivate);
    expect(cardVisible(allOn, revealed, cultivate)).toBe(true);
    expect(isMasked(allOn, revealed, cultivate.id, 'details')).toBe(false);
    expect(cardVisible(allOn, toggleCard(allOn, revealed, cultivate), cultivate)).toBe(false);
  });

  it('ignores revealed fields whose switch is off', () => {
    const shown = toggleField({}, cultivate.id, 'details');
    expect(cardVisible({ ...allOff, maskWord: true }, shown, cultivate)).toBe(false);
  });

  it('toggleAll hides everything when any card is visible, otherwise reveals everything', () => {
    const words = [cultivate, resilient];
    const all = toggleAll(allOn, {}, words);
    expect(words.every((word) => cardVisible(allOn, all, word))).toBe(true);
    const oneVisible = toggleCard(allOn, {}, cultivate);
    expect(anyCardVisible(allOn, toggleAll(allOn, oneVisible, words), words)).toBe(false);
  });
});

describe('hasMask', () => {
  it('shows the reveal button only when something on the card can be hidden', () => {
    expect(hasMask(allOff, true)).toBe(false);
    expect(hasMask({ ...allOff, maskDetails: true }, false)).toBe(false);
    expect(hasMask({ ...allOff, maskDetails: true }, true)).toBe(true);
    expect(hasMask({ ...allOff, maskMeaning: true }, false)).toBe(true);
  });
});
```

`src/data/filter.test.ts`:

```ts
import { detailRows, searchWords, wordsInChapter } from './filter';
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
  it('matches the word, meanings, definitions and details, ignoring case and outer spaces', () => {
    expect(ids(searchWords(SAMPLE_WORDS, '  RESILIENT ', 'all'))).toEqual(['sample-resilient']);
    expect(ids(searchWords(SAMPLE_WORDS, '통찰력', 'all'))).toEqual(['sample-insight']);
    expect(ids(searchWords(SAMPLE_WORDS, 'growing crops', 'all'))).toEqual(['sample-cultivate']);
    expect(ids(searchWords(SAMPLE_WORDS, 'derivation', 'all'))).toEqual(['sample-derive']);
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

describe('detailRows', () => {
  it('lists rows in display order and skips empty ones', () => {
    expect(detailRows(SAMPLE_WORDS[0])).toEqual(['definition', 'example', 'synonyms', 'antonyms', 'derived', 'related']);
    expect(detailRows(SAMPLE_WORDS[3])).toEqual(['definition', 'example', 'synonyms', 'derived', 'related']);
  });

  it('shows the example row for a Korean-only example and hides all-blank definitions', () => {
    const base = SAMPLE_WORDS[0];
    const word: Word = {
      ...base,
      definitions: ['', '', ''],
      details: { ...base.details, example: '', synonyms: '', antonyms: '', derived: '', related: '' },
    };
    expect(detailRows(word)).toEqual(['example']);
  });
});
```

`src/data/emphasize.test.ts`:

```ts
import { emphasize, koreanHighlight, type Segment } from './emphasize';
import { SAMPLE_WORDS } from './samples';

const marked = (segments: Segment[]) => segments.filter((segment) => segment.match).map((segment) => segment.text);
const joined = (segments: Segment[]) => segments.map((segment) => segment.text).join('');
const [cultivate] = SAMPLE_WORDS;

describe('emphasize (English)', () => {
  it('matches the headword and its common inflections, case-insensitively', () => {
    expect(marked(emphasize('We derived it. Derive again.', 'derive', true))).toEqual(['derived', 'Derive']);
  });

  it('does not match inside a longer word', () => {
    expect(marked(emphasize('The insightful data gave insight.', 'insight', true))).toEqual(['insight']);
  });

  it('keeps the full text intact across segments', () => {
    const text = 'The course helps students cultivate critical thinking.';
    const segments = emphasize(text, 'cultivate', true);
    expect(joined(segments)).toBe(text);
    expect(marked(segments)).toEqual(['cultivate']);
  });

  it('returns a single plain segment when the term is blank or absent, and nothing for empty text', () => {
    expect(emphasize('No match here.', 'resilient', true)).toEqual([{ text: 'No match here.', match: false }]);
    expect(emphasize('Plain.', '  ', true)).toEqual([{ text: 'Plain.', match: false }]);
    expect(emphasize('', 'word', true)).toEqual([]);
  });

  it('escapes regex characters in the term', () => {
    expect(marked(emphasize('I like c++ a lot', 'c++', false))).toEqual(['c++']);
  });
});

describe('koreanHighlight', () => {
  it('prefers the recorded example meaning', () => {
    const phrase = koreanHighlight(cultivate);
    expect(phrase).toBe('기르도록');
    expect(marked(emphasize(cultivate.details.exampleKo, phrase, false))).toEqual(['기르도록']);
  });

  it('falls back to a meaning fragment that appears in the sentence', () => {
    const word = { ...cultivate, details: { ...cultivate.details, exampleMeaning: '', exampleKo: '밭을 재배하다.' } };
    expect(koreanHighlight(word)).toBe('재배하다');
  });

  it('returns an empty string when nothing appears in the sentence', () => {
    const word = { ...cultivate, details: { ...cultivate.details, exampleMeaning: '', exampleKo: '관련 없는 문장' } };
    expect(koreanHighlight(word)).toBe('');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/data/mask.test.ts src/data/filter.test.ts src/data/emphasize.test.ts`
Expected: 3 suites FAIL — `Cannot find module`.

- [ ] **Step 3: 구현** — `src/data/mask.ts`

```ts
import type { MaskField, Prefs, ShownMap, Word } from './types';

type MaskPrefs = Pick<Prefs, 'maskWord' | 'maskMeaning' | 'maskDetails'>;

const PREF_FOR_FIELD: Record<MaskField, keyof MaskPrefs> = {
  word: 'maskWord',
  exampleWord: 'maskWord',
  meaning: 'maskMeaning',
  details: 'maskDetails',
};

const ALL_FIELDS: MaskField[] = ['word', 'meaning', 'details', 'exampleWord'];

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
    (prefs.maskWord && isShown(shown, word.id, 'word')) ||
    (prefs.maskMeaning && isShown(shown, word.id, 'meaning')) ||
    (prefs.maskDetails && isShown(shown, word.id, 'details')) ||
    (prefs.maskWord && word.details.example !== '' && isShown(shown, word.id, 'exampleWord'))
  );
}

function setCard(shown: ShownMap, id: string, value: boolean): ShownMap {
  return ALL_FIELDS.reduce((acc, field) => setField(acc, id, field, value), shown);
}

export function toggleCard(prefs: MaskPrefs, shown: ShownMap, word: Word): ShownMap {
  return setCard(shown, word.id, !cardVisible(prefs, shown, word));
}

export function anyCardVisible(prefs: MaskPrefs, shown: ShownMap, words: Word[]): boolean {
  return words.some((word) => cardVisible(prefs, shown, word));
}

export function toggleAll(prefs: MaskPrefs, shown: ShownMap, words: Word[]): ShownMap {
  const reveal = !anyCardVisible(prefs, shown, words);
  return words.reduce((acc, word) => setCard(acc, word.id, reveal), shown);
}

export function hasMask(prefs: MaskPrefs, hasDetails: boolean): boolean {
  return prefs.maskWord || prefs.maskMeaning || (prefs.maskDetails && hasDetails);
}
```

- [ ] **Step 4: 구현** — `src/data/filter.ts`

```ts
import type { Word } from './types';

export type DetailKey = 'definition' | 'example' | 'synonyms' | 'antonyms' | 'derived' | 'related';

export const DETAIL_LABELS: Record<DetailKey, string> = {
  definition: '영영',
  example: '예문',
  synonyms: '동의어',
  antonyms: '반의어',
  derived: '파생어',
  related: '유의어',
};

const DETAIL_ORDER: DetailKey[] = ['definition', 'example', 'synonyms', 'antonyms', 'derived', 'related'];

export function wordsInChapter(words: Word[], chapter: string): Word[] {
  return chapter === 'all' ? words : words.filter((word) => word.chapter === chapter);
}

export function searchWords(words: Word[], query: string, chapter: string): Word[] {
  const q = query.trim().toLowerCase();
  return wordsInChapter(words, chapter).filter((word) =>
    [word.word, word.meanings.join(' · '), word.definitions.join(' '), ...Object.values(word.details)]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

export function detailRows(word: Word): DetailKey[] {
  return DETAIL_ORDER.filter((key) => {
    if (key === 'definition') return word.definitions.some(Boolean);
    if (key === 'example') return word.details.example !== '' || word.details.exampleKo !== '';
    return word.details[key] !== '';
  });
}
```

- [ ] **Step 5: 구현** — `src/data/emphasize.ts`

```ts
import type { Word } from './types';

export type Segment = { text: string; match: boolean };

function escapeRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function emphasize(text: string, term: string, english: boolean): Segment[] {
  const target = term.trim();
  if (text === '') return [];
  if (target === '') return [{ text, match: false }];
  const pattern = english
    ? new RegExp(`(^|[^A-Za-z])(${escapeRegExp(target)}(?:s|es|d|ed|ing)?)(?=$|[^A-Za-z])`, 'gi')
    : new RegExp(`(${escapeRegExp(target)})`, 'g');
  const segments: Segment[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const lead = english ? found[1].length : 0;
    const matched = english ? found[2] : found[1];
    const start = (found.index ?? 0) + lead;
    if (start > last) segments.push({ text: text.slice(last, start), match: false });
    segments.push({ text: matched, match: true });
    last = start + matched.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments;
}

export function koreanHighlight(word: Word): string {
  const candidates = [word.details.exampleMeaning, ...word.meanings.flatMap((meaning) => meaning.split(/[,;]+/))]
    .map((value) => value.trim())
    .filter(Boolean);
  return candidates.find((value) => word.details.exampleKo.includes(value)) ?? '';
}
```

- [ ] **Step 6: 통과 확인**

Run: `npm test && npm run typecheck`
Expected: 5 suites PASS, typecheck 출력 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/data/mask.ts src/data/mask.test.ts src/data/filter.ts src/data/filter.test.ts src/data/emphasize.ts src/data/emphasize.test.ts
git commit -m "feat: 가리기·검색·예문 강조 로직을 순수 함수로 추가 (#3)"
```

---

### Task 5: 앱 셸 — 폰 캔버스 · 상단바 · 하단 탭 · 자리표시 화면

**Files:**
- Create: `src/theme.ts`, `src/components/AppText.tsx`, `src/components/Icon.tsx`, `src/components/PhoneCanvas.tsx`, `src/components/MainScroll.tsx`, `src/components/TopBar.tsx`, `src/components/BottomNav.tsx`, `src/components/ComingSoon.tsx`
- Create: `src/app/(main)/_layout.tsx`, `src/app/(main)/test.tsx`, `src/app/(main)/add.tsx`, `src/app/(main)/account.tsx`
- Modify: `src/app/_layout.tsx` (Task 1의 임시본 전체 교체)

**Interfaces:**
- Consumes: `WordsProvider`, `useWords` (Task 3)
- Produces:
  - `theme.ts`: `colors { page, bg, surface, text, muted, line, accent, accentDark, accentSoft }`, `cardShadow: string`, `fonts { body, serif }`, `CANVAS { width: 402, height: 874, radius: 28 }`, `isFramed(viewportWidth): boolean`(> 402), `isNarrow(viewportWidth): boolean`(≤ 380, 원본 `@media (max-width: 380px)`)
  - `AppText`: RN `Text`와 같은 props. 본문 폰트·`#24302e`·16px가 기본값.
  - `Icon({ name, size?, color })`, `IconName = 'filter' | 'chevronDown' | 'account' | 'search' | 'viewCard' | 'viewList' | 'edit' | 'delete' | 'study' | 'home' | 'test' | 'add'` — 원본 인라인 SVG 경로 그대로.
  - `MainScroll({ children })`: `(main)` 화면들이 쓰는 스크롤 영역(좌우 18px, 원본 `main { padding: 0 18px }`).
  - 라우트: `/`(Task 6이 채움), `/test`, `/add`, `/account`. `/study`는 Task 7이 만든다 — 그 전까지 하단 탭의 "학습"은 Expo Router의 "Unmatched Route" 화면을 띄우는 게 정상이다.

- [ ] **Step 1: 테마·기본 컴포넌트 작성**

`src/theme.ts`:

```ts
import { Platform } from 'react-native';

export const colors = {
  page: '#f4f5f4',
  bg: '#f5f2eb',
  surface: '#fffefd',
  text: '#24302e',
  muted: '#8b9692',
  line: '#e7e3dc',
  accent: '#2d7b71',
  accentDark: '#21665f',
  accentSoft: '#eaf4f0',
};

export const cardShadow = '0 10px 24px rgba(38, 48, 42, 0.07)';

export const fonts = {
  body: Platform.select({
    web: 'Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: undefined,
  }),
  serif: Platform.select({ web: 'Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' }),
};

export const CANVAS = { width: 402, height: 874, radius: 28 };

export function isFramed(viewportWidth: number): boolean {
  return viewportWidth > CANVAS.width;
}

export function isNarrow(viewportWidth: number): boolean {
  return viewportWidth <= 380;
}
```

`src/components/AppText.tsx`:

```tsx
import { Text, type TextProps } from 'react-native';
import { colors, fonts } from '../theme';

export function AppText({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[{ fontFamily: fonts.body, color: colors.text, fontSize: 16 }, style]} />;
}
```

`src/components/Icon.tsx` (경로는 `pocket-vocabulary-v2/index.html`의 인라인 SVG):

```tsx
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'filter'
  | 'chevronDown'
  | 'account'
  | 'search'
  | 'viewCard'
  | 'viewList'
  | 'edit'
  | 'delete'
  | 'study'
  | 'home'
  | 'test'
  | 'add';

const SHAPES: Record<IconName, ReactNode> = {
  filter: <Path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />,
  chevronDown: <Path d="m7 10 5 5 5-5" />,
  account: (
    <>
      <Circle cx={12} cy={8} r={3} />
      <Path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="m16 16 4 4" />
    </>
  ),
  viewCard: (
    <>
      <Rect x={4} y={4} width={16} height={16} rx={3} />
      <Path d="M8 9h8M8 13h5" />
    </>
  ),
  viewList: (
    <>
      <Path d="M9 6h11M9 12h11M9 18h11" />
      <Circle cx={5} cy={6} r={1} />
      <Circle cx={5} cy={12} r={1} />
      <Circle cx={5} cy={18} r={1} />
    </>
  ),
  edit: <Path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10zM14 7l3 3" />,
  delete: <Path d="M4 7h16M9 4h6M7 7l1 13h8l1-13M10 11v5M14 11v5" />,
  study: (
    <>
      <Rect x={4} y={4} width={16} height={16} rx={3} />
      <Path d="M8 11h8M8 15h5" />
    </>
  ),
  home: (
    <>
      <Path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z" />
      <Path d="M9 20a4 4 0 0 1 4-4h6" />
    </>
  ),
  test: (
    <>
      <Path d="M9 4h6M9 20h6M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <Path d="m9 11 2 2 4-4" />
    </>
  ),
  add: <Path d="M12 5v14M5 12h14" />,
};

type Props = { name: IconName; size?: number; color: string };

export function Icon({ name, size = 24, color }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[name]}
    </Svg>
  );
}
```

- [ ] **Step 2: 캔버스·스크롤 영역 작성**

`src/components/PhoneCanvas.tsx` (원본 `style.css:410-421, 461-466`):

```tsx
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { CANVAS, colors, isFramed } from '../theme';

export function PhoneCanvas({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (!isFramed(width)) {
    return <View style={styles.bleed}>{children}</View>;
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.frame}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  page: { flex: 1, backgroundColor: colors.page },
  pageContent: { alignItems: 'center', paddingVertical: 20 },
  frame: {
    width: CANVAS.width,
    height: CANVAS.height,
    borderRadius: CANVAS.radius,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    boxShadow: '0 0 36px rgba(50, 55, 50, 0.06)',
  },
});
```

`src/components/MainScroll.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function MainScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.main} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18 },
});
```

- [ ] **Step 3: 상단바·하단 탭 작성**

`src/components/TopBar.tsx` (원본 `index.html:15-30`, `style.css:26-31, 229-232, 297-298, 422-429`). Gemini 🔑 버튼은 넣지 않는다.

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWords } from '../data/WordsContext';
import { colors } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const { prefs } = useWords();
  const chapterLabel = prefs.activeChapter === 'all' ? '전체' : prefs.activeChapter;
  return (
    <View style={[styles.bar, { paddingTop: 12 + insets.top, height: 76 + insets.top }]}>
      <View style={styles.brand}>
        <View aria-hidden style={styles.mark}>
          <AppText style={styles.markText}>V</AppText>
        </View>
        <View style={styles.brandText}>
          <AppText style={styles.eyebrow}>MY VOCAB</AppText>
          <AppText role="heading" numberOfLines={1} style={styles.title}>
            포켓 단어장
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable disabled accessibilityRole="button" accessibilityLabel="학습 챕터 선택 (준비 중)" style={styles.chapter}>
          <AppText numberOfLines={1} style={styles.chapterText}>
            {chapterLabel}
          </AppText>
          <Icon name="chevronDown" size={16} color="#4f5b6b" />
        </Pressable>
        <Pressable disabled accessibilityRole="button" accessibilityLabel="표시 정보 설정 (준비 중)" style={styles.iconButton}>
          <Icon name="filter" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 242, 235, 0.94)',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0, flexShrink: 1 },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 13,
    backgroundColor: '#e5f1ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  brandText: { minWidth: 0, flexShrink: 1 },
  eyebrow: { marginBottom: 2, color: colors.accent, fontSize: 9, letterSpacing: 1.35, fontWeight: '800' },
  title: { fontSize: 15, lineHeight: 18, letterSpacing: -0.45, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chapter: {
    maxWidth: 90,
    height: 34,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chapterText: { flexShrink: 1, color: '#4f5b6b', fontSize: 12, fontWeight: '700' },
  iconButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

`src/components/BottomNav.tsx` (원본 `index.html:163-169`, `style.css:114-117, 314-316, 406, 431-442`):

```tsx
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, isNarrow } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type NavItem = { label: string; icon: IconName; href: '/study' | '/' | '/test' | '/add' | '/account' };

const ITEMS: NavItem[] = [
  { label: '학습', icon: 'study', href: '/study' },
  { label: '홈', icon: 'home', href: '/' },
  { label: '시험', icon: 'test', href: '/test' },
  { label: '추가', icon: 'add', href: '/add' },
  { label: '내 정보', icon: 'account', href: '/account' },
];

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View
      role="navigation"
      accessibilityLabel="주요 메뉴"
      style={[styles.nav, { height: 72 + insets.bottom, paddingBottom: insets.bottom }, isNarrow(width) && styles.navNarrow]}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const color = active ? colors.accent : '#9aa3af';
        return (
          <Pressable
            key={item.href}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(item.href)}
            style={styles.item}
          >
            <Icon name={item.icon} size={21} color={color} />
            <AppText style={[styles.label, { color }]}>{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 254, 252, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  navNarrow: { paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '700' },
});
```

- [ ] **Step 4: 자리표시 화면 작성**

`src/components/ComingSoon.tsx` (원본 `.choice-view` 스타일, `style.css:386-389`):

```tsx
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';
import { MainScroll } from './MainScroll';

type Props = { kicker: string; title: string };

export function ComingSoon({ kicker, title }: Props) {
  return (
    <MainScroll>
      <View style={styles.view}>
        <AppText style={styles.kicker}>{kicker}</AppText>
        <AppText role="heading" style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.description}>곧 제공됩니다.</AppText>
      </View>
    </MainScroll>
  );
}

const styles = StyleSheet.create({
  view: { paddingTop: 58, paddingHorizontal: 2, paddingBottom: 20 },
  kicker: { marginBottom: 11, color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.43 },
  title: { fontFamily: fonts.serif, fontSize: 33, lineHeight: 38.28, letterSpacing: -0.99, fontWeight: '700' },
  description: { marginTop: 15, marginBottom: 32, color: '#83918a', fontSize: 14, lineHeight: 21.7 },
});
```

`src/app/(main)/test.tsx`:

```tsx
import { ComingSoon } from '../../components/ComingSoon';

export default function TestScreen() {
  return <ComingSoon kicker="QUICK TEST" title={'얼마나 외웠는지\n확인해 볼까요?'} />;
}
```

`src/app/(main)/add.tsx`:

```tsx
import { ComingSoon } from '../../components/ComingSoon';

export default function AddScreen() {
  return <ComingSoon kicker="YOUR VOCABULARY" title={'단어를 어떻게\n추가할까요?'} />;
}
```

`src/app/(main)/account.tsx`:

```tsx
import { ComingSoon } from '../../components/ComingSoon';

export default function AccountScreen() {
  return <ComingSoon kicker="MY ACCOUNT" title={'내 단어장을\n더 편하게 사용해요'} />;
}
```

- [ ] **Step 5: 레이아웃 연결**

`src/app/(main)/_layout.tsx` — 상단바와 하단 탭 사이에 현재 화면을 끼운다. 스크롤은 각 화면이 `MainScroll`로 맡는다(레이아웃에서 `Slot`을 `ScrollView`로 감싸면 화면 높이가 0으로 무너질 수 있다).

```tsx
import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../components/BottomNav';
import { TopBar } from '../../components/TopBar';
import { colors } from '../../theme';

export default function MainLayout() {
  return (
    <View style={styles.shell}>
      <TopBar />
      <View style={styles.body}>
        <Slot />
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, minHeight: 0 },
});
```

`src/app/_layout.tsx` 전체 교체:

```tsx
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PhoneCanvas } from '../components/PhoneCanvas';
import { WordsProvider } from '../data/WordsContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WordsProvider>
        <PhoneCanvas>
          <Slot />
        </PhoneCanvas>
      </WordsProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 6: 검증**

Run: `npm run typecheck && npm test && npm run build:web`
Expected: typecheck 출력 없음, 5 suites PASS, `Exported: dist`.

- [ ] **Step 7: 커밋**

```bash
git add src/theme.ts src/components src/app
git commit -m "feat: 폰 캔버스·상단바·하단 탭 앱 셸과 자리표시 화면 추가 (#3)"
```

---

### Task 6: 단어장 목록 화면 (홈)

**Files:**
- Create: `src/components/Masked.tsx`, `src/components/ExamplePair.tsx`, `src/components/wordbook/MaskPanel.tsx`, `src/components/wordbook/WordCard.tsx`
- Modify: `src/app/(main)/index.tsx` (Task 1의 임시본 전체 교체)

**Interfaces:**
- Consumes: `useWords` (Task 3), `isMasked`/`toggleField`/`toggleCard`/`toggleAll`/`anyCardVisible`/`cardVisible`/`hasMask` (Task 4), `searchWords`/`detailRows`/`DETAIL_LABELS`/`DetailKey` (Task 4), `emphasize`/`koreanHighlight`/`Segment` (Task 4), `AppText`/`Icon`/`MainScroll`/`colors`/`cardShadow`/`fonts`/`isNarrow` (Task 5)
- Produces:
  - `Masked({ masked, onPress?, style?, children })` — 가려지면 회색 바탕 위에 "눌러서 보기", 내용은 투명하게 자리만 차지하고 스크린리더에서도 숨는다.
  - `ExamplePair({ word, hideWord?, onRevealWord?, size?: 'card' | 'study' })` — Task 7의 학습 패널도 `size="study"`로 쓴다.

- [ ] **Step 1: 가리기 래퍼 작성** — `src/components/Masked.tsx` (원본 `.masked`, `style.css:97-98`)

```tsx
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';

type Props = {
  masked: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Masked({ masked, onPress, style, children }: Props) {
  const content = masked ? (
    <>
      <View aria-hidden style={styles.hidden}>
        {children}
      </View>
      <View style={styles.overlay}>
        <AppText style={styles.overlayText}>눌러서 보기</AppText>
      </View>
    </>
  ) : (
    children
  );
  const containerStyle = [style, masked && styles.masked];
  if (!onPress) {
    return <View style={containerStyle}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={masked ? '가려진 내용 보기' : undefined}
      onPress={onPress}
      style={containerStyle}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  masked: { borderRadius: 7, backgroundColor: '#e9edf2', minWidth: 70 },
  hidden: { opacity: 0 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  overlayText: { color: '#87919f', fontSize: 10, fontWeight: '700' },
});
```

- [ ] **Step 2: 예문 쌍 작성** — `src/components/ExamplePair.tsx` (원본 `app.js:61-67`, `style.css:454-460`, `.inline-word-mask` `:236`)

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { emphasize, koreanHighlight, type Segment } from '../data/emphasize';
import type { Word } from '../data/types';
import { colors } from '../theme';
import { AppText } from './AppText';

type Props = {
  word: Word;
  hideWord?: boolean;
  onRevealWord?: () => void;
  size?: 'card' | 'study';
};

export function ExamplePair({ word, hideWord = false, onRevealWord, size = 'card' }: Props) {
  const { example, exampleKo } = word.details;
  const study = size === 'study';
  const textStyle = study ? styles.textStudy : styles.textCard;
  const maskSize = study ? styles.maskStudy : styles.maskCard;

  const render = (segments: Segment[], canHide: boolean) =>
    segments.map((segment, i) => {
      if (!segment.match) return segment.text;
      if (canHide && hideWord) {
        return (
          <Text
            key={i}
            accessibilityRole="button"
            accessibilityLabel="예문 속 단어 보기"
            onPress={onRevealWord}
            style={[styles.wordMask, maskSize]}
          >
            ••••
          </Text>
        );
      }
      return (
        <Text key={i} style={styles.strong}>
          {segment.text}
        </Text>
      );
    });

  return (
    <View style={[styles.pair, study && styles.pairStudy]}>
      <View style={[styles.line, styles.lineEn]}>
        <AppText style={[textStyle, styles.en]}>
          {example ? (
            render(emphasize(example, word.word, true), true)
          ) : (
            <Text style={styles.missing}>영어 예문을 추가해 주세요.</Text>
          )}
        </AppText>
      </View>
      <View style={[styles.line, styles.lineKo]}>
        <AppText style={[textStyle, styles.ko]}>
          {exampleKo ? (
            render(emphasize(exampleKo, koreanHighlight(word), false), false)
          ) : (
            <Text style={styles.missing}>한국어 예문을 추가해 주세요.</Text>
          )}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { gap: 9 },
  pairStudy: { marginTop: 12 },
  line: { borderLeftWidth: 3, paddingVertical: 4, paddingLeft: 10 },
  lineEn: { borderLeftColor: colors.accent },
  lineKo: { borderLeftColor: '#c88465' },
  textCard: { fontSize: 12, lineHeight: 19.2 },
  textStudy: { fontSize: 13, lineHeight: 20.8 },
  en: { color: '#5e6863' },
  ko: { color: '#5f6761' },
  strong: { color: colors.text, fontWeight: '800' },
  missing: { color: '#a4ada7' },
  wordMask: {
    backgroundColor: '#e9edf2',
    color: '#87919f',
    fontWeight: '800',
    borderRadius: 5,
    paddingHorizontal: 6,
  },
  maskCard: { fontSize: 10.32 },
  maskStudy: { fontSize: 11.18 },
});
```

- [ ] **Step 3: 암기 모드 패널 작성** — `src/components/wordbook/MaskPanel.tsx` (원본 `index.html:73-83`, `style.css:56-69, 304-309`)

"전체 정답 보기" 라벨은 지금 상태에서 계산한다(보이는 카드가 하나라도 있으면 "전체 다시 가리기") — 원본의 클릭 후 결과와 같다.

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import type { Prefs } from '../../data/types';
import { colors } from '../../theme';
import { AppText } from '../AppText';

const SWITCHES = [
  { key: 'maskWord', label: '영어 가리기' },
  { key: 'maskMeaning', label: '뜻 가리기' },
  { key: 'maskDetails', label: '추가정보 가리기' },
] as const;

export type MaskKey = (typeof SWITCHES)[number]['key'];

type Props = {
  prefs: Prefs;
  anyVisible: boolean;
  onToggle: (key: MaskKey) => void;
  onRevealAll: () => void;
};

export function MaskPanel({ prefs, anyVisible, onToggle, onRevealAll }: Props) {
  return (
    <View accessibilityLabel="암기 가리기 설정" style={styles.panel}>
      <View style={styles.heading}>
        <View style={styles.headingLeft}>
          <View aria-hidden style={styles.spark}>
            <AppText style={styles.sparkText}>✦</AppText>
          </View>
          <AppText style={styles.headingTitle}>암기 모드</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={onRevealAll} style={styles.textButton}>
          <AppText style={styles.textButtonText}>{anyVisible ? '전체 다시 가리기' : '전체 정답 보기'}</AppText>
        </Pressable>
      </View>
      <View style={styles.switchRow}>
        {SWITCHES.map(({ key, label }) => {
          const on = prefs[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="switch"
              accessibilityLabel={label}
              accessibilityState={{ checked: on }}
              onPress={() => onToggle(key)}
              style={styles.switchItem}
            >
              <AppText style={styles.switchLabel}>{label}</AppText>
              <View style={[styles.track, on && styles.trackOn]}>
                <View style={[styles.knob, on && styles.knobOn]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: '#e9f1ec' },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spark: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: '#d5e9e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkText: { color: colors.accent, fontSize: 14 },
  headingTitle: { fontSize: 14, fontWeight: '700' },
  textButton: { paddingVertical: 5 },
  textButtonText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  switchRow: { flexDirection: 'row', gap: 7 },
  switchItem: {
    flex: 1,
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  switchLabel: { fontSize: 11, textAlign: 'center' },
  track: { width: 30, height: 17, borderRadius: 20, backgroundColor: '#b8c9c0' },
  trackOn: { backgroundColor: colors.accent },
  knob: { position: 'absolute', left: 2, top: 2, width: 13, height: 13, borderRadius: 6.5, backgroundColor: '#fff' },
  knobOn: { transform: [{ translateX: 13 }] },
});
```

- [ ] **Step 4: 단어 카드 작성** — `src/components/wordbook/WordCard.tsx` (원본 `app.js:69, 74`, `style.css:81-108, 233-235, 271-272, 311-313`)

수정·삭제 아이콘은 비활성이다(범위 밖).

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DETAIL_LABELS, detailRows, type DetailKey } from '../../data/filter';
import { cardVisible, hasMask, isMasked } from '../../data/mask';
import type { MaskField, Prefs, ShownMap, Word } from '../../data/types';
import { cardShadow, colors } from '../../theme';
import { AppText } from '../AppText';
import { ExamplePair } from '../ExamplePair';
import { Icon } from '../Icon';
import { Masked } from '../Masked';

type Props = {
  word: Word;
  number: number;
  mode: 'card' | 'list';
  prefs: Prefs;
  shown: ShownMap;
  onToggleField: (field: MaskField) => void;
  onToggleCard: () => void;
};

function CardActions() {
  return (
    <View style={styles.actions}>
      <Pressable disabled accessibilityRole="button" accessibilityLabel="단어 수정 (준비 중)" style={styles.mini}>
        <Icon name="edit" size={18} color="#9aa3ae" />
      </Pressable>
      <Pressable disabled accessibilityRole="button" accessibilityLabel="단어 삭제 (준비 중)" style={styles.mini}>
        <Icon name="delete" size={18} color="#9aa3ae" />
      </Pressable>
    </View>
  );
}

export function WordCard({ word, number, mode, prefs, shown, onToggleField, onToggleCard }: Props) {
  const masked = (field: MaskField) => isMasked(prefs, shown, word.id, field);

  if (mode === 'list') {
    return (
      <View style={[styles.card, styles.listCard]}>
        <View style={[styles.top, styles.listTop]}>
          <View style={styles.listMain}>
            <Masked masked={masked('word')} onPress={() => onToggleField('word')} style={styles.listWordCol}>
              <AppText role="heading" style={styles.listTitle}>
                {word.word}
              </AppText>
            </Masked>
            <Masked masked={masked('meaning')} onPress={() => onToggleField('meaning')} style={styles.listMeaningCol}>
              {word.meanings.map((meaning, i) => (
                <AppText key={i} style={styles.listMeaning}>
                  {meaning}
                </AppText>
              ))}
            </Masked>
          </View>
          <CardActions />
        </View>
      </View>
    );
  }

  const rows = detailRows(word);
  const detailsMasked = masked('details');

  const renderDetail = (key: DetailKey) => {
    if (key === 'definition') {
      return word.definitions.map((definition, i) =>
        definition ? (
          <AppText key={i} style={styles.ddText}>
            <Text style={styles.ddStrong}>{word.meanings[i]}</Text> · {definition}
          </AppText>
        ) : null,
      );
    }
    if (key === 'example') {
      return (
        <ExamplePair word={word} hideWord={masked('exampleWord')} onRevealWord={() => onToggleField('exampleWord')} />
      );
    }
    return <AppText style={styles.ddText}>{word.details[key]}</AppText>;
  };

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <AppText style={styles.chapterTag}>{word.chapter}</AppText>
      <View style={styles.top}>
        <View style={styles.main}>
          <AppText style={styles.index}>WORD {String(number).padStart(2, '0')}</AppText>
          <Masked masked={masked('word')} onPress={() => onToggleField('word')}>
            <AppText role="heading" style={styles.title}>
              {word.word}
            </AppText>
          </Masked>
          <Masked masked={masked('meaning')} onPress={() => onToggleField('meaning')} style={styles.meanings}>
            {word.meanings.map((meaning, i) => (
              <AppText key={i} style={styles.meaning}>
                <Text style={styles.bullet}>• </Text>
                {meaning}
              </AppText>
            ))}
          </Masked>
        </View>
        <CardActions />
      </View>
      {rows.length > 0 && (
        <View style={styles.details}>
          {rows.map((key) => (
            <View key={key} style={styles.row}>
              <AppText style={styles.dt}>{DETAIL_LABELS[key]}</AppText>
              <Masked
                masked={detailsMasked}
                onPress={detailsMasked ? () => onToggleField('details') : undefined}
                style={styles.dd}
              >
                {renderDetail(key)}
              </Masked>
            </View>
          ))}
        </View>
      )}
      {hasMask(prefs, rows.length > 0) && (
        <Pressable accessibilityRole="button" onPress={onToggleCard} style={styles.reveal}>
          <AppText style={styles.revealText}>{cardVisible(prefs, shown, word) ? '다시 가리기' : '정답 보기'}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    boxShadow: cardShadow,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderRadius: 4,
    backgroundColor: colors.accent,
    opacity: 0.8,
  },
  chapterTag: {
    position: 'absolute',
    top: 13,
    right: 68,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', paddingLeft: 3 },
  main: { flex: 1, minWidth: 0 },
  index: { marginBottom: 6, color: '#a1a9b3', fontSize: 11, fontWeight: '800', letterSpacing: 0.88 },
  title: { fontSize: 23, lineHeight: 28.75, letterSpacing: -0.575, fontWeight: '700' },
  meanings: { marginTop: 7 },
  meaning: { color: '#4e5866', fontSize: 15, lineHeight: 22.5 },
  bullet: { color: colors.accent },
  actions: { flexDirection: 'row', gap: 2, marginRight: -6 },
  mini: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  details: {
    marginTop: 14,
    paddingTop: 14,
    paddingLeft: 3,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
  dt: { width: 58, fontSize: 13, lineHeight: 20.15, color: colors.muted, fontWeight: '700' },
  dd: { flex: 1, minWidth: 0 },
  ddText: { fontSize: 13, lineHeight: 20.15, color: '#3f4855' },
  ddStrong: { fontWeight: '700' },
  reveal: {
    alignSelf: 'flex-start',
    marginTop: 13,
    marginLeft: 3,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 11,
    backgroundColor: colors.accentSoft,
  },
  revealText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  listCard: { paddingVertical: 14, paddingHorizontal: 15, borderRadius: 17 },
  listTop: { alignItems: 'center' },
  listMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listWordCol: { flex: 0.75, minWidth: 105 },
  listMeaningCol: { flex: 1 },
  listTitle: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, fontWeight: '700' },
  listMeaning: { color: '#4e5866', fontSize: 14, lineHeight: 21 },
});
```

- [ ] **Step 5: 홈 화면 작성** — `src/app/(main)/index.tsx` 전체 교체 (원본 `index.html:49-103`, `app.js:71-77`, `style.css:38-53, 71-80, 109-112, 139-143, 218-222, 300-303, 379-385`)

"단어 추가"·"내 정보" 카드는 원본처럼 `/add`·`/account`로 이동하고(지금은 자리표시 화면), 빈 상태의 "첫 단어 추가하기"는 스펙대로 비활성이다.

```tsx
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { Icon } from '../../components/Icon';
import { MainScroll } from '../../components/MainScroll';
import { MaskPanel } from '../../components/wordbook/MaskPanel';
import { WordCard } from '../../components/wordbook/WordCard';
import { searchWords } from '../../data/filter';
import { anyCardVisible, toggleAll, toggleCard, toggleField } from '../../data/mask';
import { useWords } from '../../data/WordsContext';
import { colors, fonts, isNarrow } from '../../theme';

type ViewMode = 'card' | 'list';

function todayLabel(): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
}

export default function WordbookScreen() {
  const { ready, words, prefs, setPref, shown, setShown } = useWords();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('card');
  const { width } = useWindowDimensions();
  const list = useMemo(() => searchWords(words, query, prefs.activeChapter), [words, query, prefs.activeChapter]);

  if (!ready) {
    return <MainScroll>{null}</MainScroll>;
  }

  const narrow = isNarrow(width);
  const heroSize = Math.min(30, Math.max(24, width * 0.07));
  const searching = query.trim() !== '';

  return (
    <MainScroll>
      <View style={styles.hero}>
        <View>
          <AppText style={styles.date}>{todayLabel()}</AppText>
          <AppText role="heading" style={[styles.heroTitle, { fontSize: heroSize, letterSpacing: -0.05 * heroSize }]}>
            오늘도 한 단어씩
          </AppText>
        </View>
        <View style={styles.countBadge}>
          <AppText style={styles.countValue}>{words.length}</AppText>
          <AppText style={styles.countLabel}>단어</AppText>
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.navigate('/study')} style={styles.launch}>
        <View style={styles.launchIcon}>
          <AppText style={styles.launchIconText}>▤</AppText>
        </View>
        <View style={styles.launchBody}>
          <AppText style={styles.launchTitle}>오늘의 단어 학습</AppText>
          <AppText style={styles.launchSub}>한 단어씩 넘기며 뜻과 예문 익히기</AppText>
        </View>
        <AppText aria-hidden style={styles.launchArrow}>
          →
        </AppText>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/add')}
          style={(state) => [
            styles.actionCard,
            styles.actionPrimary,
            narrow && styles.actionCardNarrow,
            (state as PressableStateCallbackType & { hovered?: boolean }).hovered && styles.actionPrimaryHover,
          ]}
        >
          <View style={[styles.actionIcon, styles.actionIconPrimary, narrow && styles.actionIconNarrow]}>
            <AppText style={[styles.actionIconText, styles.onPrimary]}>＋</AppText>
          </View>
          <View style={styles.actionBody}>
            <AppText style={[styles.actionTitle, styles.onPrimary, narrow && styles.actionTitleNarrow]}>단어 추가</AppText>
            <AppText style={[styles.actionSub, styles.onPrimarySub, narrow && styles.actionSubNarrow]}>
              추가 방법 선택하기
            </AppText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/account')}
          style={[styles.actionCard, narrow && styles.actionCardNarrow]}
        >
          <View style={[styles.actionIcon, narrow && styles.actionIconNarrow]}>
            <Icon name="account" size={21} color={colors.accent} />
          </View>
          <View style={styles.actionBody}>
            <AppText style={[styles.actionTitle, narrow && styles.actionTitleNarrow]}>내 정보</AppText>
            <AppText style={[styles.actionSub, narrow && styles.actionSubNarrow]}>로그인 방식 선택하기</AppText>
          </View>
        </Pressable>
      </View>

      <MaskPanel
        prefs={prefs}
        anyVisible={anyCardVisible(prefs, shown, words)}
        onToggle={(key) => setPref(key, !prefs[key])}
        onRevealAll={() => setShown(toggleAll(prefs, shown, words))}
      />

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
        <View accessibilityLabel="보기 방식" style={styles.toggle}>
          {(['card', 'list'] as const).map((mode) => {
            const active = view === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={mode === 'card' ? '카드 보기' : '리스트 보기'}
                accessibilityState={{ selected: active }}
                onPress={() => setView(mode)}
                style={[styles.toggleButton, active && styles.toggleButtonActive]}
              >
                <Icon name={mode === 'card' ? 'viewCard' : 'viewList'} size={19} color={active ? colors.accent : '#99a1ad'} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {list.length > 0 ? (
        <View style={[styles.grid, view === 'list' && styles.gridList]}>
          {list.map((word, i) => (
            <WordCard
              key={word.id}
              word={word}
              number={i + 1}
              mode={view}
              prefs={prefs}
              shown={shown}
              onToggleField={(field) => setShown(toggleField(shown, word.id, field))}
              onToggleCard={() => setShown(toggleCard(prefs, shown, word))}
            />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <AppText style={styles.emptyIconText}>Aa</AppText>
          </View>
          <AppText role="heading" style={styles.emptyTitle}>
            {searching ? '검색 결과가 없어요' : '이 챕터에는 단어가 없어요'}
          </AppText>
          <AppText style={styles.emptyText}>
            {searching ? '다른 단어나 뜻으로 검색해 보세요.' : '직접 입력하거나 사진·엑셀 파일을 불러와 보세요.'}
          </AppText>
          {!searching && (
            <Pressable disabled accessibilityRole="button" style={styles.emptyButton}>
              <AppText style={styles.emptyButtonText}>첫 단어 추가하기</AppText>
            </Pressable>
          )}
        </View>
      )}
    </MainScroll>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 22,
    paddingHorizontal: 2,
    paddingBottom: 18,
  },
  date: { marginBottom: 7, color: colors.muted, fontSize: 13, fontWeight: '600' },
  heroTitle: { fontWeight: '700' },
  countBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countValue: { color: colors.accent, fontSize: 21, lineHeight: 21, fontWeight: '700' },
  countLabel: { marginTop: 5, color: colors.muted, fontSize: 11 },
  launch: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 13,
    padding: 13,
    borderWidth: 1,
    borderColor: '#d8e7df',
    borderRadius: 18,
    backgroundColor: '#eaf3ee',
  },
  launchIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchIconText: { color: '#fff' },
  launchBody: { flex: 1 },
  launchTitle: { fontSize: 14, fontWeight: '700' },
  launchSub: { marginTop: 3, color: '#71827a', fontSize: 11 },
  launchArrow: { color: colors.accent, fontSize: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.surface,
    boxShadow: '0 3px 14px rgba(25, 40, 64, 0.03)',
  },
  actionCardNarrow: { paddingVertical: 12, paddingHorizontal: 10, gap: 8 },
  actionPrimary: { borderColor: colors.accent, backgroundColor: colors.accent, boxShadow: 'none' },
  actionPrimaryHover: { backgroundColor: colors.accentDark },
  actionIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: 'rgba(23, 111, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconNarrow: { width: 33, height: 33 },
  actionIconPrimary: { backgroundColor: 'rgba(255, 255, 255, 0.17)' },
  actionIconText: { color: colors.accent, fontSize: 25, fontWeight: '300' },
  actionBody: { flex: 1, minWidth: 0 },
  actionTitle: { marginBottom: 4, fontSize: 15, fontWeight: '700' },
  actionTitleNarrow: { fontSize: 13 },
  actionSub: { color: colors.muted, fontSize: 11, lineHeight: 14.3 },
  actionSubNarrow: { fontSize: 10 },
  onPrimary: { color: '#fff' },
  onPrimarySub: { color: 'rgba(255, 255, 255, 0.76)' },
  tools: { flexDirection: 'row', gap: 9, marginTop: 18, marginBottom: 12 },
  search: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: fonts.body, color: colors.text },
  toggle: { height: 48, padding: 4, flexDirection: 'row', borderRadius: 15, backgroundColor: '#ebe8e1' },
  toggleButton: { width: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleButtonActive: { backgroundColor: colors.surface, boxShadow: '0 2px 8px rgba(25, 40, 64, 0.1)' },
  grid: { gap: 11 },
  gridList: { gap: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { color: colors.accent, fontWeight: '800' },
  emptyTitle: { marginBottom: 8, fontSize: 18, fontWeight: '700' },
  emptyText: { marginBottom: 20, color: colors.muted, fontSize: 14, textAlign: 'center' },
  emptyButton: {
    minHeight: 47,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
```

- [ ] **Step 6: 검증**

Run: `npm run typecheck && npm test && npm run build:web`
Expected: typecheck 출력 없음, 5 suites PASS, `Exported: dist`.

- [ ] **Step 7: 커밋**

```bash
git add src/components src/app
git commit -m "feat: 단어장 목록 화면 추가 — 암기 모드·검색·카드/리스트 보기 (#3)"
```

- [ ] **Step 8: 브라우저 비교 (컨트롤러가 수행)**

구현자는 이 단계를 하지 않는다. 컨트롤러가 `npm run web`(ssen-app)과 `pocket-vocabulary-v2`의 `npm run dev`를 나란히 띄워 같은 창 폭(>402px 한 번, 390px 한 번)에서 비교한다: 폰 캔버스 크기·모서리, 상단바, 히어로, 학습 시작 버튼, 두 액션 카드, 암기 모드 스위치(켜고 끌 때 "눌러서 보기"가 생기고 사라짐), 검색, 카드↔리스트 전환, 단어 카드의 가리기·"정답 보기"·예문 속 `••••`.

---

### Task 7: 학습 카드 화면

**Files:**
- Create: `src/data/study.ts`, `src/components/study/DetailPanel.tsx`, `src/app/study.tsx`
- Test: `src/data/study.test.ts`

**Interfaces:**
- Consumes: `useWords` (Task 3), `wordsInChapter` (Task 4), `ExamplePair` (Task 6), `AppText`/`colors`/`fonts`/`isFramed`/`isNarrow` (Task 5)
- Produces:
  - `study.ts` (원본 `app.js:183-206, 252-259`): `type StudyPanel = 'definition' | 'example'`, `type StudyState = { index: number; revealed: boolean; selected: number; panel: StudyPanel }`, `initialStudy`, `studyReducer(state, action)` with actions `{ type: 'move'; step: number; length: number } | { type: 'toggleCard' } | { type: 'selectMeaning'; meaning: number } | { type: 'togglePanel' } | { type: 'setPanel'; panel: StudyPanel }`, `swipeDirection(dx, dy): -1 | 0 | 1`, `registerTap(lastTap, now): { toggle: boolean; lastTap: number }`, `isKeyboardPress(event: unknown): boolean`, `wheelStep({ deltaY, revealed, length, now, lastWheel }): { consume: boolean; step: -1 | 0 | 1; lastWheel: number }`, `splitChips(value: string): string[]`
  - 라우트 `/study` — `(main)` 그룹 밖이라 상단바·하단 탭이 없다.

- [ ] **Step 1: 실패하는 테스트 작성** — `src/data/study.test.ts`

```ts
import {
  initialStudy,
  isKeyboardPress,
  registerTap,
  splitChips,
  studyReducer,
  swipeDirection,
  wheelStep,
  type StudyState,
} from './study';

describe('studyReducer', () => {
  it('moves forward and backward with wrap-around, resetting the card', () => {
    const open: StudyState = { index: 2, revealed: true, selected: 1, panel: 'example' };
    expect(studyReducer(open, { type: 'move', step: 1, length: 3 })).toEqual({ ...initialStudy, index: 0 });
    expect(studyReducer(initialStudy, { type: 'move', step: -1, length: 3 })).toEqual({ ...initialStudy, index: 2 });
  });

  it('treats an index past the end as the first card and ignores empty lists', () => {
    const stale: StudyState = { ...initialStudy, index: 5 };
    expect(studyReducer(stale, { type: 'move', step: 1, length: 2 }).index).toBe(1);
    expect(studyReducer(stale, { type: 'move', step: 1, length: 0 })).toBe(stale);
  });

  it('reveals the card, then collapses it and clears the selection', () => {
    const revealed = studyReducer(initialStudy, { type: 'toggleCard' });
    expect(revealed.revealed).toBe(true);
    const picked = studyReducer(revealed, { type: 'selectMeaning', meaning: 1 });
    const example = studyReducer(picked, { type: 'togglePanel' });
    expect(studyReducer(example, { type: 'toggleCard' })).toEqual(initialStudy);
  });

  it('selecting the same meaning twice closes it, and a new selection starts on definitions', () => {
    const picked = studyReducer({ ...initialStudy, revealed: true, panel: 'example' }, { type: 'selectMeaning', meaning: 0 });
    expect(picked).toMatchObject({ selected: 0, panel: 'definition' });
    expect(studyReducer(picked, { type: 'selectMeaning', meaning: 0 }).selected).toBe(-1);
  });

  it('switches panels explicitly and by toggle', () => {
    expect(studyReducer(initialStudy, { type: 'setPanel', panel: 'example' }).panel).toBe('example');
    expect(studyReducer({ ...initialStudy, panel: 'example' }, { type: 'togglePanel' }).panel).toBe('definition');
  });
});

describe('swipeDirection', () => {
  it('needs a clearly horizontal drag longer than 55px', () => {
    expect(swipeDirection(-60, 0)).toBe(1);
    expect(swipeDirection(60, 10)).toBe(-1);
    expect(swipeDirection(-50, 0)).toBe(0);
    expect(swipeDirection(-60, 50)).toBe(0);
    expect(swipeDirection(-100, 30)).toBe(1);
  });
});

describe('registerTap', () => {
  const t0 = 1_700_000_000_000;

  it('toggles on a second tap within 360ms and needs two fresh taps afterwards', () => {
    const first = registerTap(0, t0);
    expect(first.toggle).toBe(false);
    const second = registerTap(first.lastTap, t0 + 200);
    expect(second.toggle).toBe(true);
    expect(registerTap(second.lastTap, t0 + 300).toggle).toBe(false);
  });

  it('ignores taps that are too far apart', () => {
    expect(registerTap(t0, t0 + 400).toggle).toBe(false);
  });
});

describe('isKeyboardPress', () => {
  it('recognises keyboard activation from the raw DOM event or its nativeEvent', () => {
    expect(isKeyboardPress({ type: 'keyup' })).toBe(true);
    expect(isKeyboardPress({ nativeEvent: { type: 'keydown' } })).toBe(true);
    expect(isKeyboardPress({ type: 'click', nativeEvent: { type: 'pointerup' } })).toBe(false);
    expect(isKeyboardPress(undefined)).toBe(false);
  });
});

describe('wheelStep', () => {
  const base = { deltaY: 40, revealed: false, length: 3, now: 10_000, lastWheel: 0 };

  it('moves one word per wheel gesture and throttles for 450ms', () => {
    const first = wheelStep(base);
    expect(first).toEqual({ consume: true, step: 1, lastWheel: 10_000 });
    expect(wheelStep({ ...base, now: 10_200, lastWheel: first.lastWheel })).toEqual({
      consume: true,
      step: 0,
      lastWheel: 10_000,
    });
    expect(wheelStep({ ...base, deltaY: -40, now: 10_500, lastWheel: first.lastWheel }).step).toBe(-1);
  });

  it('leaves the wheel alone while the card is open, the list is short, or the scroll is tiny', () => {
    expect(wheelStep({ ...base, revealed: true }).consume).toBe(false);
    expect(wheelStep({ ...base, length: 1 }).consume).toBe(false);
    expect(wheelStep({ ...base, deltaY: 10 }).consume).toBe(false);
  });
});

describe('splitChips', () => {
  it('splits on commas and semicolons and drops blanks', () => {
    expect(splitChips('nurture, develop;; foster ')).toEqual(['nurture', 'develop', 'foster']);
    expect(splitChips('')).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/data/study.test.ts`
Expected: FAIL — `Cannot find module './study'`.

- [ ] **Step 3: 구현** — `src/data/study.ts`

```ts
export type StudyPanel = 'definition' | 'example';

export type StudyState = { index: number; revealed: boolean; selected: number; panel: StudyPanel };

export type StudyAction =
  | { type: 'move'; step: number; length: number }
  | { type: 'toggleCard' }
  | { type: 'selectMeaning'; meaning: number }
  | { type: 'togglePanel' }
  | { type: 'setPanel'; panel: StudyPanel };

export const initialStudy: StudyState = { index: 0, revealed: false, selected: -1, panel: 'definition' };

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case 'move': {
      if (action.length <= 0) return state;
      const current = state.index >= action.length ? 0 : state.index;
      return { ...initialStudy, index: (current + action.step + action.length) % action.length };
    }
    case 'toggleCard':
      return state.revealed
        ? { ...state, revealed: false, selected: -1, panel: 'definition' }
        : { ...state, revealed: true };
    case 'selectMeaning':
      return { ...state, selected: state.selected === action.meaning ? -1 : action.meaning, panel: 'definition' };
    case 'togglePanel':
      return { ...state, panel: state.panel === 'definition' ? 'example' : 'definition' };
    case 'setPanel':
      return { ...state, panel: action.panel };
  }
}

export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) return dx < 0 ? 1 : -1;
  return 0;
}

export function registerTap(lastTap: number, now: number): { toggle: boolean; lastTap: number } {
  return now - lastTap < 360 ? { toggle: true, lastTap: 0 } : { toggle: false, lastTap: now };
}

export function isKeyboardPress(event: unknown): boolean {
  if (!event || typeof event !== 'object') return false;
  const e = event as { type?: unknown; nativeEvent?: { type?: unknown } };
  return [e.type, e.nativeEvent?.type].some((type) => type === 'keyup' || type === 'keydown');
}

type WheelInput = { deltaY: number; revealed: boolean; length: number; now: number; lastWheel: number };

export function wheelStep({ deltaY, revealed, length, now, lastWheel }: WheelInput): {
  consume: boolean;
  step: -1 | 0 | 1;
  lastWheel: number;
} {
  if (revealed || length < 2 || Math.abs(deltaY) < 15) return { consume: false, step: 0, lastWheel };
  if (now - lastWheel < 450) return { consume: true, step: 0, lastWheel };
  return { consume: true, step: deltaY > 0 ? 1 : -1, lastWheel: now };
}

export function splitChips(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((chip) => chip.trim())
    .filter(Boolean);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/data/study.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: 상세 패널 작성** — `src/components/study/DetailPanel.tsx` (원본 `app.js:201-206`, `style.css:353-371, 405`)

```tsx
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { splitChips, type StudyPanel } from '../../data/study';
import type { Word } from '../../data/types';
import { colors, isNarrow } from '../../theme';
import { AppText } from '../AppText';
import { ExamplePair } from '../ExamplePair';

type PanGesture = ReturnType<typeof Gesture.Pan>;

type Props = {
  word: Word;
  index: number;
  panel: StudyPanel;
  gesture: PanGesture;
  onToggle: () => void;
};

type ChipRowProps = { label: string; value: string; derived?: boolean; first?: boolean };

function ChipRow({ label, value, derived, first }: ChipRowProps) {
  const { width } = useWindowDimensions();
  const chips = splitChips(value);
  return (
    <View style={[styles.chipRow, first && styles.chipRowFirst]}>
      <AppText style={[styles.chipLabel, isNarrow(width) && styles.chipLabelNarrow]}>{label}</AppText>
      <View style={styles.chips}>
        {chips.length > 0 ? (
          chips.map((chip, i) => (
            <AppText key={i} style={[styles.chip, derived && styles.chipDerived]}>
              {chip}
            </AppText>
          ))
        ) : (
          <AppText style={styles.chipEmpty}>—</AppText>
        )}
      </View>
    </View>
  );
}

export function DetailPanel({ word, index, panel, gesture, onToggle }: Props) {
  const isDefinition = panel === 'definition';
  const definition = word.definitions[index];
  const hasExample = word.details.example !== '' || word.details.exampleKo !== '';

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View style={styles.panel}>
        <View style={styles.head}>
          <View style={styles.headIcon}>
            <AppText style={styles.headIconText}>{isDefinition ? '▤' : '❞'}</AppText>
          </View>
          <AppText style={styles.headTitle}>{isDefinition ? 'DEFINITIONS' : 'IN CONTEXT'}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isDefinition ? '예문 보기' : '영영 풀이 보기'}
            hitSlop={12}
            onPress={onToggle}
            style={styles.next}
          >
            <AppText style={styles.nextText}>{isDefinition ? '→' : '←'}</AppText>
          </Pressable>
        </View>
        {isDefinition ? (
          <>
            {definition ? (
              <View style={styles.definitions}>
                <AppText style={styles.definitionMarker}>1.</AppText>
                <AppText style={styles.definition}>{definition}</AppText>
              </View>
            ) : (
              <AppText style={styles.noDetail}>이 뜻에 등록된 영영 풀이가 없어요.</AppText>
            )}
            <ChipRow label="동의어" value={word.details.synonyms} first />
            <ChipRow label="파생어" value={word.details.derived} derived />
          </>
        ) : hasExample ? (
          <ExamplePair word={word} size="study" />
        ) : (
          <AppText style={styles.noDetail}>등록된 예문이 없어요.</AppText>
        )}
        <View aria-hidden style={styles.dots}>
          <View style={[styles.dot, isDefinition && styles.dotActive]} />
          <View style={[styles.dot, !isDefinition && styles.dotActive]} />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 1,
    marginBottom: 4,
    paddingTop: 15,
    paddingHorizontal: 14,
    paddingBottom: 11,
    borderWidth: 1,
    borderColor: '#ebe7e0',
    borderRadius: 18,
    backgroundColor: colors.surface,
    boxShadow: '0 10px 20px rgba(36, 43, 38, 0.055)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headIcon: {
    width: 23,
    height: 23,
    borderRadius: 8,
    backgroundColor: '#edf5f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headIconText: { color: colors.accent, fontSize: 13 },
  headTitle: { color: '#5c6762', fontSize: 11, letterSpacing: 0.165, fontWeight: '700' },
  next: { marginLeft: 'auto' },
  nextText: { color: colors.accent, fontSize: 19 },
  definitions: { flexDirection: 'row', marginTop: 10, marginBottom: 13 },
  definitionMarker: {
    width: 19,
    paddingRight: 4,
    textAlign: 'right',
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18.6,
    fontWeight: '800',
  },
  definition: { flex: 1, paddingLeft: 3, marginBottom: 5, fontSize: 12, lineHeight: 18.6 },
  noDetail: { marginVertical: 12, color: colors.muted, fontSize: 12, lineHeight: 18 },
  chipRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingTop: 9 },
  chipRowFirst: { borderTopWidth: 1, borderTopColor: '#eeeae5' },
  chipLabel: { width: 70, paddingTop: 5, color: '#9aa39d', fontSize: 10, fontWeight: '800' },
  chipLabelNarrow: { width: 58 },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#edf5f1',
    color: colors.accent,
    fontSize: 10,
  },
  chipDerived: { backgroundColor: '#fbede6', color: '#bd7457' },
  chipEmpty: { color: '#b5bdb6' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingTop: 9 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#d5dfd9' },
  dotActive: { width: 13, backgroundColor: colors.accent },
});
```

- [ ] **Step 6: 학습 화면 작성** — `src/app/study.tsx` (원본 `index.html:33-47`, `app.js:183-200, 252-259`, `style.css:322-352, 372-378, 398-404, 446-452`)

카드 바깥에서 좌우로 밀면 이전/다음 단어, 상세 패널 위에서 밀면 정의↔예문이다(`panelPan.blocksExternalGesture(contentPan)`로 패널이 우선). 휠은 웹 전용 DOM 리스너로, `GestureDetector`가 자기 자식의 ref를 다룰 수 있어 한 단계 안쪽 `View`에 건다.

```tsx
import { router } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { DetailPanel } from '../components/study/DetailPanel';
import { wordsInChapter } from '../data/filter';
import { initialStudy, isKeyboardPress, registerTap, studyReducer, swipeDirection, wheelStep } from '../data/study';
import { useWords } from '../data/WordsContext';
import { colors, fonts, isFramed, isNarrow } from '../theme';

const MOVE_HINT = '⇆  스크롤 · 좌우 밀기로 다음 단어';

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
  const { ready, words, prefs } = useWords();
  const list = useMemo(() => wordsInChapter(words, prefs.activeChapter), [words, prefs.activeChapter]);
  const total = list.length;
  const [state, dispatch] = useReducer(studyReducer, initialStudy);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const wheelRef = useRef<View>(null);
  const lastTap = useRef(0);
  const lastWheel = useRef(0);

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
          if (step !== 0) move(step);
        }),
    [move],
  );

  const panelPan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .blocksExternalGesture(contentPan)
        .onEnd((event) => {
          const step = swipeDirection(event.translationX, event.translationY);
          if (step !== 0) dispatch({ type: 'setPanel', panel: step > 0 ? 'example' : 'definition' });
        }),
    [contentPan],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = wheelRef.current as unknown as HTMLElement | null;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      const result = wheelStep({
        deltaY: event.deltaY,
        revealed: state.revealed,
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
  }, [move, ready, state.revealed, total]);

  const onCardPress = (event: GestureResponderEvent) => {
    if (isKeyboardPress(event)) {
      dispatch({ type: 'toggleCard' });
      return;
    }
    const tap = registerTap(lastTap.current, Date.now());
    lastTap.current = tap.lastTap;
    if (tap.toggle) dispatch({ type: 'toggleCard' });
  };

  if (!ready) {
    return <View style={styles.screen} />;
  }

  const index = state.index >= total ? 0 : state.index;
  const word = list[index];
  const pad = width >= 621 ? 24 : 20;
  const narrow = isNarrow(width);
  const cardHeight = isFramed(width) ? 376 : Math.min(height * 0.43, 376);
  const wordSize = state.revealed
    ? Math.min(40, Math.max(32, width * 0.09))
    : Math.min(43, Math.max(34, width * 0.1));
  const wordStyle = { fontSize: wordSize, lineHeight: wordSize * 1.12, letterSpacing: -0.025 * wordSize };
  const hint =
    total === 0
      ? ''
      : !state.revealed
        ? '↖  단어를 두 번 눌러 뜻 보기'
        : state.selected >= 0
          ? '↖  정보 박스를 왼쪽으로 밀어 예문 보기'
          : '↖  뜻 카드를 눌러 자세히 보기';

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
              {prefs.activeChapter === 'all' ? 'Daily vocabulary' : prefs.activeChapter}
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
              contentContainerStyle={[styles.content, { paddingHorizontal: pad }, !state.revealed && styles.contentFill]}
            >
              {!word ? (
                <StudyEmpty />
              ) : !state.revealed ? (
                <View style={styles.defaultView}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${word.word} — 두 번 눌러 뜻 보기`}
                    onPress={onCardPress}
                    style={[styles.card, styles.cardDefault, { height: cardHeight }]}
                  >
                    <AppText style={[styles.cardWord, wordStyle]}>{word.word}</AppText>
                  </Pressable>
                  <AppText style={styles.recall}>뜻을 떠올린 뒤 단어를 두 번 눌러보세요</AppText>
                </View>
              ) : (
                <View style={styles.expanded}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${word.word} — 두 번 눌러 단어만 보기`}
                    onPress={onCardPress}
                    style={[styles.card, styles.cardRevealed]}
                  >
                    <AppText style={[styles.cardWord, wordStyle]}>{word.word}</AppText>
                    <AppText style={styles.cardMeta}>WORD · {word.chapter}</AppText>
                  </Pressable>
                  <View style={styles.meaningHeading}>
                    <AppText style={styles.meaningHeadingTitle}>뜻을 선택하세요</AppText>
                    <AppText style={styles.meaningHeadingCount}>{word.meanings.length}개의 뜻</AppText>
                  </View>
                  <View style={styles.meanings}>
                    {word.meanings.map((meaning, i) => {
                      const selected = i === state.selected;
                      return (
                        <Fragment key={i}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded: selected }}
                            onPress={() => dispatch({ type: 'selectMeaning', meaning: i })}
                            style={styles.meaning}
                          >
                            <View style={styles.number}>
                              <AppText style={styles.numberText}>{i + 1}</AppText>
                            </View>
                            <AppText style={styles.meaningText}>{meaning}</AppText>
                            <AppText style={[styles.chevron, selected && styles.chevronOn]}>{selected ? '⌄' : '›'}</AppText>
                          </Pressable>
                          {selected && (
                            <DetailPanel
                              word={word}
                              index={i}
                              panel={state.panel}
                              gesture={panelPan}
                              onToggle={() => dispatch({ type: 'togglePanel' })}
                            />
                          )}
                        </Fragment>
                      );
                    })}
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
  contentFill: { flexGrow: 1 },
  defaultView: { flexGrow: 1, paddingTop: 16, paddingBottom: 8 },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#eeeae4',
    borderRadius: 20,
    backgroundColor: colors.surface,
    boxShadow: '0 12px 24px rgba(35, 46, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDefault: { minHeight: 230, maxHeight: '72%' },
  cardRevealed: { minHeight: 130, padding: 20 },
  cardWord: { fontFamily: fonts.serif, fontWeight: '700', textAlign: 'center' },
  cardMeta: { marginTop: 9, color: '#88958e', fontSize: 11 },
  recall: { marginTop: 'auto', paddingTop: 24, textAlign: 'center', fontSize: 12, color: '#a9b0aa' },
  expanded: { paddingTop: 18, paddingBottom: 24 },
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
  meaning: {
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
  number: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#edf5f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  meaningText: { flex: 1, fontSize: 14, lineHeight: 19.6, fontWeight: '700' },
  chevron: { color: '#acb8b2', fontSize: 20 },
  chevronOn: { color: colors.accent },
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

- [ ] **Step 7: 검증**

Run: `npm run typecheck && npm test && npm run build:web`
Expected: typecheck 출력 없음, 6 suites PASS, `Exported: dist`.

- [ ] **Step 8: 커밋**

```bash
git add src/data/study.ts src/data/study.test.ts src/components/study src/app/study.tsx
git commit -m "feat: 학습 카드 화면 추가 — 더블탭 뒤집기·스와이프·휠 넘기기 (#3)"
```

- [ ] **Step 9: 브라우저 비교 (컨트롤러가 수행)**

구현자는 이 단계를 하지 않는다. 컨트롤러가 두 앱을 나란히 띄워 비교한다: 하단 탭 "학습"과 홈의 "오늘의 단어 학습" 둘 다로 진입, 상단바·하단 탭이 사라지는지, 더블클릭(과 Enter 한 번)으로 카드가 펼쳐지고 접히는지, 카드 바깥 좌우 드래그·마우스 휠로 이전/다음 단어, 진행률 `n / 4`와 진행바, 뜻 선택 → 상세 패널, 패널 위 좌우 드래그와 → 버튼으로 정의↔예문, 뒤로가기(←)로 홈 복귀.
