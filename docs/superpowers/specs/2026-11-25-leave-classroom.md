# 수업 나가기 (#46)

학생이 속한 수업에서 나간다. 서버 API는 `DELETE /api/me/classroom`(학생 토큰, 204). 수업이 없어도 204이고, 교사는 403, 비로그인은 401이다.

## 동작
- 진입: 내 정보(`/account`)의 `수업 나가기` 카드 → `/leave-classroom`. 카드는 수업이 있는 학생에게만 보이며 `수업 바꾸기` 카드 아래, 로그아웃 위에 있다.
- 확인 화면: 수업명이 들어간 안내와 `수업 나가기`(primary), `취소`(ghost, `/account`로 이동) 버튼.
- 비로그인이면 `/login`, 서버에 연결할 수 없으면 `/account`로 보낸다. 교사는 안내만, 수업이 없는 학생은 `수업 참여하기`(→ `/join`) 버튼과 안내만 본다.
- 나가면 `/api/users/me`의 `classroom`이 null이 되고 교사 단어는 `/api/me/words`에서 빠진다. 계정·개인 단어·북마크 기록은 그대로이고, 같은 코드로 다시 들어오면 수업 단어와 북마크가 돌아온다.

## 확인을 화면으로 한 이유
웹에서는 `Alert`가 동작하지 않는다. 그래서 `Alert` 대신 별도 확인 화면을 둔다.

## 제출 순서
`leaveClassroom` → `refreshUser()`(실패해도 오류로 보지 않음) → `useBookmarks().reload()` → 토스트 `수업에서 나갔어요` → `/account`로 `replace`. 요청 중 중복 제출은 무시한다. 오류는 `ApiError`/`SessionExpiredError` 메시지, 그 외는 `요청에 실패했어요`를 보여주고 화면에 남는다.

## 구현 위치
`src/api/auth.ts` `leaveClassroom`, `src/classroom/LeaveScreen.tsx`, `src/app/(main)/leave-classroom.tsx`, `src/app/(main)/account.tsx`, `src/components/BottomNav.tsx`
