# ssen-app

쎈슬기 단어장 — 영단어 학습 앱 (React Native + Expo, 지금은 웹 우선)

수능 영어 어휘를 **차시별 단어장과 문맥 예문**으로 익히는 영단어 학습 앱입니다. Expo/React Native로 만들었고 지금은 웹을 우선으로 개발합니다.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | React Native + Expo SDK 57 (TypeScript) |
| 네비게이션 | Expo Router |
| 제스처 | react-native-gesture-handler |
| 로컬 저장 | AsyncStorage |
| 테스트 | Jest (jest-expo) |

## 개발 환경 준비

```bash
npm install
npm run web        # 브라우저에서 확인 (웹 우선)
npm test           # 단위 테스트
npm run typecheck  # 타입 검사
npm run build:web  # dist/ 에 정적 웹 결과물 생성
```

지금은 웹을 우선합니다. 네이티브 빌드(iOS/Android)는 이후 단계에서 다룹니다.

## 수업 참여

학생은 내 정보 → `수업 참여하기`에서 선생님께 받은 6자리 참여코드를 입력해 수업에 들어가고, 그 수업의 교사 단어장을 함께 봅니다 (#35). 코드를 5번 틀리면 5분간 잠깁니다. 자세한 내용은 [스펙](docs/superpowers/specs/2026-11-22-join-classroom.md).

## 올린 단어 관리

교사는 내 정보 → `올린 단어 관리`에서 수업을 고르고, 올린 단어를 차시별로 보며 고치거나 지울 수 있습니다. 엑셀 올리기에서는 `이 파일에 없는 단어는 지우기`로 차시 단위 교체도 됩니다 (#44). 자세한 내용은 [스펙](docs/superpowers/specs/2026-11-25-teacher-word-management.md).

## 서버

API 서버는 별도 저장소에 있습니다 → [ssen-server](https://github.com/ssen-voca/ssen-server)

## 배포

웹 화면 운영 배포(호스팅 설정, 서버 주소·CORS 맞추기)는 [docs/deploy.md](./docs/deploy.md)를 보세요.

## 기여 방법

브랜치·커밋·PR 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 반드시 읽고 따라주세요.
`main`, `develop`에는 직접 push할 수 없으며 모든 작업은 이슈 → 브랜치 → PR 순서로 진행합니다.
