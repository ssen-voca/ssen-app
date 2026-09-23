# ssen-app

쎈슬기 단어장 — 태블릿 앱 (React Native + Expo)

수능 영어 어휘를 **차시별 단어장과 문맥 예문**으로 익히는 태블릿 학습 앱의 클라이언트입니다.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | React Native + Expo (TypeScript) |
| 네비게이션 | Expo Router |
| 상태 관리 | TanStack Query + Zustand |
| 애니메이션 | Reanimated 3 / Gesture Handler |
| TTS | expo-speech |
| 로컬 저장 | expo-sqlite, MMKV |

## 개발 환경 준비

```bash
npm install
npx expo start
```

실기기(iPad / 갤럭시탭)에서 확인하려면 Expo Go 또는 Dev Client로 접속합니다.

## 서버

API 서버는 별도 저장소에 있습니다 → [ssen-server](https://github.com/ssen-voca/ssen-server)

## 기여 방법

브랜치·커밋·PR 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 반드시 읽고 따라주세요.
`main`, `develop`에는 직접 push할 수 없으며 모든 작업은 이슈 → 브랜치 → PR 순서로 진행합니다.
