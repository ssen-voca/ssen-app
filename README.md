# ssen-app

쎈슬기 단어장 — 영단어 학습 앱 (React Native + Expo, 지금은 웹 우선)

수능 영어 어휘를 **차시별 단어장과 문맥 예문**으로 익히는 태블릿 학습 앱의 클라이언트입니다.

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

## 서버

API 서버는 별도 저장소에 있습니다 → [ssen-server](https://github.com/ssen-voca/ssen-server)

## 기여 방법

브랜치·커밋·PR 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 반드시 읽고 따라주세요.
`main`, `develop`에는 직접 push할 수 없으며 모든 작업은 이슈 → 브랜치 → PR 순서로 진행합니다.
