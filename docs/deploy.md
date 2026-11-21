# 웹 화면 운영 배포

앱 웹 화면은 `npm run build:web`(Expo 정적 내보내기)이 만드는 **정적 파일(`dist/`)** 입니다. 서버가 아니라 정적 호스팅에 올립니다. 서버·DB 배포는 [ssen-server의 배포 가이드](https://github.com/ssen-voca/ssen-server/blob/develop/docs/deploy.md)를 보세요. 이슈 #38.

## 먼저 알아둘 것

- **서버 주소는 빌드할 때 번들에 박힙니다.** `EXPO_PUBLIC_API_BASE_URL`은 실행할 때 읽는 값이 아니라 빌드 결과(`dist`의 JS)에 들어가는 값이라서, 서버 주소가 바뀌면 **다시 빌드해서 올려야** 합니다. 호스팅 화면에서 변수만 바꿔 저장하는 것으로는 반영되지 않습니다.
- 변수를 안 넣고 빌드하면 `http://localhost:8080`이 박혀서, 배포된 화면이 학생 컴퓨터의 localhost로 요청을 보내 모든 API가 실패합니다. 배포 전에 변수가 들어갔는지 꼭 확인하세요.
- 유료 강의에 쓰는 화면이라 **Vercel Hobby 플랜(비상업용)은 쓰지 않습니다.** Vercel Pro 또는 Cloudflare Pages를 쓰세요. Cloudflare 무료 플랜의 상업적 이용 가능 여부는 약관으로 직접 확인하세요.

## 설정값

| 항목 | 값 |
|---|---|
| 빌드 명령 | `npm run build:web` |
| 출력 폴더 | `dist` |
| 환경변수(빌드용) | `EXPO_PUBLIC_API_BASE_URL` = 운영 서버 주소(예: `https://….up.railway.app`, 슬래시로 끝내지 않습니다) |
| 배포 브랜치 | `develop` (머지될 때마다 자동 빌드·배포) |
| Node | 20 이상 |

### Vercel Pro

저장소에 `vercel.json`이 있어서 빌드 명령·출력 폴더·새로고침 대체 경로(`/index.html`)가 이미 설정돼 있습니다. 프로젝트의 Production Branch를 `develop`으로 두고 **Environment Variables**에 `EXPO_PUBLIC_API_BASE_URL`(Production)만 넣으면 됩니다.

### Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**으로 저장소를 연결하고, 위 표의 빌드 명령·출력 폴더를 넣고 **Variables**에 `EXPO_PUBLIC_API_BASE_URL`을 추가합니다. 이 프로젝트는 `404.html`이 없는 단일 페이지 앱이라 알 수 없는 경로가 `index.html`로 연결돼야 하는데, 배포 뒤 아래 "배포 후 확인"의 새로고침 항목으로 실제로 되는지 확인하세요.

## 서버와 맞추기

1. 서버를 먼저 배포하고 공개 주소를 얻습니다(서버 가이드 참고).
2. 위 주소를 `EXPO_PUBLIC_API_BASE_URL`에 넣고 웹을 배포합니다.
3. 웹의 최종 주소(예: `https://내앱.example.com`)를 서버의 `CORS_ALLOWED_ORIGINS`에 넣고 서버를 다시 배포합니다. 슬래시로 끝내지 않고, 주소가 여러 개면 쉼표로 구분합니다.

서버 주소나 웹 주소가 바뀌면 2~3번을 다시 합니다.

## 로컬에서 운영과 같게 빌드해 보기

```bash
EXPO_PUBLIC_API_BASE_URL=https://서버주소 npx expo export -p web --clear
grep -rl '서버주소' dist   # 파일이 나와야 합니다
```

`--clear`를 빼면 이전 빌드 캐시 때문에 새 주소가 반영되지 않을 수 있습니다(실제로 확인한 현상). 호스팅의 새 빌드는 캐시 없이 시작하므로 보통 문제가 없습니다.

## 배포 후 확인

- [ ] 웹 주소를 열어 홈 화면이 보인다
- [ ] 브라우저 개발자 도구 Network 탭에서 API 요청이 `localhost`가 아니라 운영 서버 주소로 나간다
- [ ] 교사 계정으로 로그인된다(CORS 오류가 없다)
- [ ] `/study` 같은 하위 경로를 주소창에 직접 입력하거나 새로고침해도 화면이 열린다
- [ ] 학생 계정으로 가입 → 참여 코드로 수업 참여 → 교사가 올린 단어가 보인다
