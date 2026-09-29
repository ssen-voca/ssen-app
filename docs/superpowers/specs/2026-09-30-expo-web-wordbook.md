# Expo 웹 우선 초기 세팅 — 단어장 목록 + 학습 카드

## 배경

`ssen-app`은 지금까지 `AGENTS.md`만 있고 실제 코드가 없다. 팀원(조은지, GitHub `jej41837`)이 별도 레포 `pocket-vocabulary-v2`(`/Users/JM/dev/ssen/pocket-vocabulary-v2`)에 바닐라 JS + Vite + Vercel 서버리스 구조로 동작하는 프로토타입을 이미 만들어뒀다. 이 프로토타입은:

- 완전히 클라이언트 로컬(`localStorage`) 기반 — 백엔드·로그인 없음
- Gemini AI로 사진에서 단어 추출, 뜻/예문 자동 생성 기능 포함
- 카드 학습(스와이프·더블탭·휠 넘기기), 4지선다 퀴즈, CSV/엑셀 임포트, 챕터 관리, 마스킹 기능이 모두 동작

React Native/Expo는 DOM이 없어 이 코드를 그대로 재사용할 수 없다. 네이티브 전환을 목표로 잡았으므로 **Expo(React Native + Expo Router)로 새로 짜되, 팀원이 만든 시각 디자인은 그대로 유지**한다. 초기엔 `expo start --web` / `expo export -p web`으로 웹 결과물만 신경 쓰고, 네이티브 빌드는 다루지 않는다.

## 이번 범위 (v1)

**포함**
- 단어장 목록 화면 (홈)
- 학습 카드 화면 (스와이프로 단어 넘기기, 뜻 선택 후 정의/예문 보기, 가리기)
- 하단 탭 내비게이션 (5개 아이콘 모두 표시 — 시각적 완성도 유지)

**제외 (다음 슬라이스)**
- 단어 추가/수정 폼, CSV·엑셀 임포트, Gemini 연동, 4지선다 퀴즈, 챕터 관리 UI, 로그인/계정 화면
- v1은 앱 내장 샘플 단어 4개(원본 `app.js`의 `samples` 배열과 동일)로 시작한다 — 추가 폼이 없어도 화면을 확인할 수 있게 하기 위한 선택이다.
- 하단 탭 중 "학습"·"홈"만 실제 화면으로 연결한다. "시험"·"추가"·"내 정보"는 탭은 보이되 누르면 "곧 제공됩니다" 같은 자리표시 화면만 띄운다.
- 백엔드 연동(ssen-server JWT API) 없음 — 전부 로컬 저장.

## 데이터 모델

원본 앱의 `localStorage` 스키마를 그대로 따르되 저장소만 `@react-native-async-storage/async-storage`로 바꾼다. 원본 참고: `pocket-vocabulary-v2/app.js:1-30`.

```ts
type WordDetails = {
  exampleKo: string;
  exampleMeaning: string;
  synonyms: string;   // 쉼표 구분 문자열
  antonyms: string;
  derived: string;
  related: string;
  example: string;
};

type Word = {
  id: string;
  word: string;
  meanings: string[];      // 뜻 여러 개
  definitions: string[];   // meanings와 같은 길이, 각 뜻에 대응하는 영영풀이
  chapter: string;         // 예: "Day 1"
  details: WordDetails;
};
```

AsyncStorage 키는 원본과 동일하게 유지한다: `pocket-vocab-words-v1`, `pocket-vocab-prefs-v1`, `pocket-vocab-chapters-v1`. v1의 prefs는 `{ maskWord, maskMeaning, maskDetails, activeChapter }`만 쓴다(view/filters는 다음 슬라이스).

시드 데이터(앱 최초 실행 시, 저장된 단어가 없을 때만 채움): `pocket-vocabulary-v2/app.js:7-11`의 `samples` 4개 단어를 그대로 옮긴다.

## 디자인 — 팀원 프로토타입을 그대로

색상·타이포그래피·간격은 `pocket-vocabulary-v2/style.css`가 소스 오브 트루스다. 파일에 `:root`가 두 번 나오는데(17번째 줄, 281번째 줄), **두 번째 블록이 실제로 쓰이는 최종 테마**(CSS는 나중에 선언된 게 이긴다)다. 구현자는 반드시 두 번째 블록과 그 아래 오버라이드 규칙을 기준으로 삼는다.

핵심 토큰(두 번째 `:root`, `style.css:281-293`):

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg` | `#f5f2eb` | 배경 |
| `--surface` | `#fffefd` | 카드 배경 |
| `--text` | `#24302e` | 본문 텍스트 |
| `--muted` | `#8b9692` | 보조 텍스트 |
| `--line` | `#e7e3dc` | 테두리 |
| `--blue` (accent) | `#2d7b71` | 강조색(실제로는 청록) |
| `--blue-dark` | `#21665f` | 강조색 hover/active |
| `--blue-soft` | `#eaf4f0` | 강조 배경 |
| `--radius` | `20px` | 기본 라운드 |

폰트: 본문은 `Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (`style.css:18`). 학습 카드의 영단어와 계정 선택 화면 제목은 세리프: `Georgia, "Times New Roman", serif` (`style.css:338`, `:388`).

레이아웃: 원본은 `.app-shell`을 최대 402px 폭의 "폰 캔버스"로 중앙 정렬하고(`style.css:412-421`), 402px 이하 실기기에서는 화면 전체를 채운다(`style.css:461-466`). v1은 이 반응형 분기를 그대로 재현하지 않고 **항상 최대 폭 420px로 중앙 정렬된 컨테이너 하나**로 단순화한다 — 웹 우선 단계에서 브레이크포인트 로직까지 맞추는 건 과함. 나중에 실제 반응형이 필요해지면 별도 이슈로 다룬다.

세부 클래스별 정확한 px 값(예: `.word-card`, `.study-word-card`, `.bottom-nav` 등)은 구현 계획에서 화면별로 직접 명시한다 — 이 스펙에서는 다시 옮겨 적지 않고 원본 `pocket-vocabulary-v2/style.css`, `pocket-vocabulary-v2/index.html`을 1차 자료로 삼는다.

## 화면 구성

### 1. 단어장 목록 (홈)

원본: `index.html:49-103` (`#wordbookView`), 로직: `app.js:71-76`(`render`), `:39`(`masked`), `:70`(`cardVisible`).

- 상단바: 브랜드 마크 + "포켓 단어장" 타이틀, 챕터 선택 버튼(v1에서는 "전체" 고정, 실제 전환 기능은 다음 슬라이스)
- 히어로 행: 오늘 날짜 + "오늘도 한 단어씩" + 단어 개수 배지
- "오늘의 단어 학습" 버튼 → 학습 카드 화면으로 이동
- 암기 모드 패널: 영어/뜻/추가정보 가리기 스위치 3개 (다크 패널, `style.css:56-69`)
- 검색창 + 카드/리스트 보기 전환
- 단어 카드 목록: 각 카드는 챕터 태그, 인덱스, 단어, 뜻 목록, 영영풀이·예문·동의어·반의어·파생어·유의어(표시 필터는 v1에서 전부 켜진 상태로 고정), 수정/삭제 아이콘(v1에서는 비활성 — 다음 슬라이스), 가리기 상태면 "눌러서 보기" 오버레이
- 빈 상태: 저장된 단어가 없을 때 안내 문구 + "첫 단어 추가하기" 버튼(v1에서는 비활성 — 안내만)

### 2. 학습 카드

원본: `index.html:33-47` (`#studyView`), 로직: `app.js:183-206`(`studyWords`/`renderStudy`/`studyPanel`), 제스처: `app.js:252-259`.

- 상단: 뒤로가기, 챕터 라벨, 진행률(`n / total`), 진행바
- 기본 상태: 단어만 큰 세리프 폰트로 표시, "뜻을 떠올린 뒤 단어를 두 번 눌러보세요"
- 두 번 탭(또는 더블클릭)하면 카드가 펼쳐지며 뜻 목록이 나타남 — 뜻 중 하나를 고르면 그 아래 상세 패널(영영풀이 + 동의어/파생어 칩, 또는 예문)이 열림
- 상세 패널은 "정의" ↔ "예문" 두 패널을 좌우 스와이프로 전환
- 카드 바깥 영역에서 좌우로 스와이프(또는 마우스 휠)하면 이전/다음 단어로 이동
- 하단: 사용법 힌트 텍스트

## 인터랙션 → RN 매핑

- 더블탭/스와이프/휠 넘기기: `react-native-gesture-handler` + `react-native-reanimated`. 이번 슬라이스가 이 제스처들이 웹 타깃에서 실제로 매끄럽게 동작하는지 검증하는 자리이기도 하다(이전 대화에서 이미 리스크로 flag됨).
- 마스킹 눌러서 보기, 카드/리스트 뷰 전환, 검색: 일반 `Pressable`/`TextInput` + 로컬 state로 충분 — 별도 라이브러리 불필요.
- 원본의 `data-field`/`mark()`/`visible()` 방식(항목별로 "본 적 있음" Set을 들고 있는 구조, `app.js:37-39`)은 그대로 React state(예: `useState<Set<string>>`)로 옮긴다.

## 에러 처리 / 엣지케이스

- 저장된 단어가 없음 → 빈 상태 화면
- 학습 카드에서 해당 챕터에 단어가 없음 → 원본과 동일하게 "아직 학습할 단어가 없어요" 안내(`app.js:193`)
- AsyncStorage 읽기 실패 → 원본의 `load()`처럼 조용히 기본값(샘플 데이터)으로 폴백, 에러를 사용자에게 노출하지 않음

## 테스트

React Native 컴포넌트는 스냅샷/유닛 테스트보다 **실제 웹 브라우저에서 눈으로 확인**하는 쪽이 이 단계에선 더 값어치가 있다 — UI 포팅 작업이라 자동화 테스트의 이득이 적다. 대신 데이터 계층(AsyncStorage 읽기/쓰기, 샘플 시드, 마스킹 상태 토글 로직)은 프레임워크와 분리된 순수 함수로 뽑아서 Jest로 유닛 테스트한다.

## 범위 밖

- 단어 추가/수정, CSV·엑셀 임포트, Gemini AI 연동, 4지선다 퀴즈, 챕터 생성/이름변경/삭제, 로그인/계정, 네이티브 빌드, ssen-server 연동 — 모두 이후 이슈로 분리.
- 반응형(폰 캔버스 vs 실기기 풀블리드) 재현 — v1은 고정 최대 폭 컨테이너로 단순화.
