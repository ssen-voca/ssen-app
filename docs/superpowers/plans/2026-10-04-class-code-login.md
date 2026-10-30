# 로그인·회원가입 참여코드 추가 (조각 2, 앱) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱의 로그인·회원가입이 참여코드 + 이름 + 휴대폰 뒤 4자리로 동작하고, 가입하면 바로 내 정보로 이동하며, 내 정보가 소속 수업을 보여준다. 가입 직후 참여 코드 화면과 참여 코드 변경 기능은 사라진다.

**Architecture:** API 계층(`src/api/auth.ts`)의 타입·응답 검증을 서버의 새 계약에 맞추고, `AuthContext`의 `signup`/`login`이 `{classCode, name, phoneLast4}` 한 덩어리를 받게 한다. 폼은 `CredentialsForm`에 참여코드 칸을 더해 로그인·회원가입이 함께 쓴다. 입력 정규화·검증은 `src/auth/validate.ts`의 순수 함수로 두고 Jest로 테스트한다.

**Tech Stack:** Expo SDK 57 + Expo Router, React Native 0.86 / react-native-web, TypeScript 6, Jest 29(`jest-expo`).

**Spec:** 서버 저장소의 `docs/superpowers/specs/2026-09-30-classroom-wordbooks-design.md` (조각 2). 서버 변경은 ssen-server #13(이 계획의 선행 조건이 아니라 짝이다. 앱 테스트는 서버 없이 통과하고, 실제 동작 확인만 서버가 필요하다).

## Global Constraints

- 작업 위치: `/Users/JM/dev/ssen/ssen-app`, 브랜치 `feature/9-class-code-login`(이슈 #9). 코드 스타일은 들여쓰기 2칸, 작은따옴표, 세미콜론. 모든 글자는 `AppText`로 그린다(`AppText` 안에 `AppText`를 중첩하지 않는다). `StyleSheet.absoluteFillObject`는 쓰지 않는다. 테스트 파일은 `src/app` 아래에 두지 않는다(jest가 무시한다).
- 검증 명령: `npm run typecheck`, `npm test`, `npm run build:web`.
- 서버 계약(ssen-server #13): `POST /api/auth/signup`, `POST /api/auth/login` 본문 `{classCode, name, phoneLast4}` → `{accessToken, refreshToken}`. 오류 본문은 `{message}`이고 앱은 그대로 보여 준다. `GET /api/users/me` → `{id, name, role, email, classroom}`이며 `email`은 문자열 또는 `null`, `classroom`은 `{id, name, code}` 또는 `null`(옛 학생). `PATCH /api/users/me/class-code`는 사라진다.
- **참여코드 입력 규칙**: 대문자로 바꾸고 영문 대문자·숫자만 남겨 6자까지(입력칸 필터). 검증은 `ABCDEFGHJKMNPQRSTUVWXYZ23456789` 6자(0/O, 1/I/L 제외). 틀리면 `참여 코드 6자리를 입력해 주세요`.
- 화면 문구(정확히 이 문장): 로그인 설명 `참여 코드, 이름, 휴대폰 번호 뒤 4자리를 입력해 주세요.` / 회원가입 설명 `선생님께 받은 참여 코드와 이름, 휴대폰 번호 뒤 4자리만 있으면 돼요. 번호 전체는 저장하지 않아요.` / 내 정보(소속 있음) 설명 `${classroom.name} · 참여 코드 ${classroom.code}` / 내 정보(소속 없음) 설명 `소속된 수업이 없어요.`
- 로그인 없이 쓰는 홈·학습·단어 추가·수정·삭제는 그대로 동작해야 한다(인증 계층은 이들을 막거나 늦추지 않는다).
- 커밋 메시지에 **AI attribution을 넣지 않는다**(`Co-Authored-By:`, `Generated with`, 로봇 이모지). 이 조직의 `AGENTS.md`와 GitHub Ruleset이 막는다. 커밋 제목은 한국어 `feat: ... (#9)`.
- 범위 밖: 서버 단어장 표시(조각 3), 교사용 화면, 네이티브 확인.

## Review Focus

1. **참여코드 붙여넣기·소문자·공백**(`" abc 234 "`): 입력 필터가 대문자·6자로 정리하고, 검증은 정리된 값으로 한다. → Task 1 `validate.test.ts`.
2. **옛 형태의 서버 응답**(`classroom` 없음/`classCode` 문자열이 있는 구버전 서버): 인증 상태가 깨지지 않고 `서버 응답이 올바르지 않아요`로 처리된다. → Task 1 `auth.test.ts`.
3. **수업이 없는 옛 학생**(`classroom: null`): 내 정보가 깨지지 않고 `소속된 수업이 없어요.`를 보여 준다. → Task 2 화면 확인(브라우저).
4. **제거한 `/class-code` 경로**로 직접 들어오는 경우(북마크, 새로고침): Expo Router의 Unmatched 화면이 아니라 내 정보로 안내된다. → Task 2 브라우저 확인.
5. **서버가 429로 막은 경우**(5회 실패): 폼이 서버 메시지를 그대로 보여 주고 다시 제출할 수 있다. → Task 2 브라우저 확인.

---

### Task 1: API·검증 계층 — 참여코드, 새 사용자 응답 형태

**Files:**
- Modify: `src/auth/validate.ts`, `src/api/auth.ts`
- Test: `src/auth/validate.test.ts`, `src/api/auth.test.ts`

**Interfaces:**
- Produces:
  - `validate.ts`: `CLASS_CODE_MESSAGE = '참여 코드 6자리를 입력해 주세요'`, `normalizeClassCode(value: string): string`(대문자화, 영문 대문자·숫자만, 6자까지), `validateClassCode(value: string): string | null`
  - `auth.ts`: `type Credentials = { classCode: string; name: string; phoneLast4: string }`, `type Classroom = { id: number; name: string; code: string }`, `type User = { id: number; name: string; role: string; email: string | null; classroom: Classroom | null }`, `signup(credentials: Credentials): Promise<Tokens>`, `login(credentials: Credentials): Promise<Tokens>`. `setClassCode`는 삭제한다. `refresh`, `getMe`는 시그니처 그대로.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/auth/validate.test.ts` — import를 `import { digitsOnly, normalizeClassCode, validateClassCode, validateName, validatePhoneLast4 } from './validate';`로 바꾸고, 파일 끝에 다음을 더한다.

```ts
describe('normalizeClassCode', () => {
  it('upper-cases and keeps only letters and digits, up to 6 characters', () => {
    expect(normalizeClassCode('abc234')).toBe('ABC234');
    expect(normalizeClassCode('  abc 234 ')).toBe('ABC234');
    expect(normalizeClassCode('abc-234-xyz')).toBe('ABC234');
    expect(normalizeClassCode('가나다')).toBe('');
  });
});

describe('validateClassCode', () => {
  it('accepts six characters from the code alphabet', () => {
    expect(validateClassCode('ABC234')).toBeNull();
    expect(validateClassCode('ZZZZZZ')).toBeNull();
  });

  it.each(['', 'ABC23', 'ABC2345', 'abc234', 'I0O1L1', 'ABC 23', '가나다라마바'])('rejects %j', (value) => {
    expect(validateClassCode(value)).toBe('참여 코드 6자리를 입력해 주세요');
  });
});
```

`src/api/auth.test.ts` 전체를 다음으로 교체한다.

```ts
import { getMe, login, refresh, signup } from './auth';
import { ApiError, request } from './client';

jest.mock('./client', () => ({ ...jest.requireActual('./client'), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;
const BAD = '서버 응답이 올바르지 않아요';
const CLASSROOM = { id: 3, name: '겨울 특강 A반', code: 'ABC234' };
const USER = { id: 1, name: '김', role: 'STUDENT', email: null, classroom: CLASSROOM };
const CREDENTIALS = { classCode: 'ABC234', name: '김', phoneLast4: '1234' };

async function expectBad(pending: Promise<unknown>) {
  const error = await pending.catch((e: unknown) => e as ApiError);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(0);
  expect((error as ApiError).message).toBe(BAD);
}

beforeEach(() => mockRequest.mockReset());

describe('auth api requests', () => {
  it('sends the class code, name and last four digits to signup and login', async () => {
    mockRequest.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

    await signup(CREDENTIALS);
    await login(CREDENTIALS);

    expect(mockRequest).toHaveBeenNthCalledWith(1, '/api/auth/signup', { method: 'POST', body: CREDENTIALS });
    expect(mockRequest).toHaveBeenNthCalledWith(2, '/api/auth/login', { method: 'POST', body: CREDENTIALS });
  });
});

describe('auth api response shapes', () => {
  it('passes well-formed responses through', async () => {
    mockRequest.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });
    await expect(signup(CREDENTIALS)).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
    mockRequest.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });
    await expect(login(CREDENTIALS)).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
    mockRequest.mockResolvedValueOnce({ accessToken: 'n' });
    await expect(refresh('r')).resolves.toEqual({ accessToken: 'n' });
    mockRequest.mockResolvedValueOnce(USER);
    await expect(getMe('a')).resolves.toEqual(USER);
  });

  it('accepts a student without a classroom and a teacher with an email', async () => {
    mockRequest.mockResolvedValueOnce({ ...USER, classroom: null });
    await expect(getMe('a')).resolves.toEqual({ ...USER, classroom: null });
    mockRequest.mockResolvedValueOnce({ ...USER, role: 'TEACHER', email: 't@example.com', classroom: null });
    await expect(getMe('a')).resolves.toMatchObject({ role: 'TEACHER', email: 't@example.com' });
  });

  it.each([undefined, null, 'x', {}, { accessToken: 'a' }, { accessToken: 'a', refreshToken: 1 }, { accessToken: '', refreshToken: 'r' }])(
    'rejects malformed token responses %j',
    async (body) => {
      mockRequest.mockResolvedValue(body);
      await expectBad(signup(CREDENTIALS));
      await expectBad(login(CREDENTIALS));
    },
  );

  it.each([undefined, {}, { accessToken: 1 }, { accessToken: '' }])('rejects malformed refresh response %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(refresh('r'));
  });

  it.each([
    undefined,
    null,
    {},
    { ...USER, id: '1' },
    { ...USER, name: 5 },
    { ...USER, role: undefined },
    { ...USER, email: undefined },
    { ...USER, email: 5 },
    { ...USER, classroom: undefined },
    { ...USER, classroom: 5 },
    { ...USER, classroom: { ...CLASSROOM, id: '3' } },
    { ...USER, classroom: { ...CLASSROOM, name: 5 } },
    { ...USER, classroom: { ...CLASSROOM, code: undefined } },
    { id: 1, name: '김', role: 'STUDENT', classCode: 'ABC234' },
  ])('rejects malformed user response %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(getMe('a'));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/auth/validate.test.ts src/api/auth.test.ts`
Expected: FAIL (`normalizeClassCode`/`validateClassCode` 없음, `signup`이 객체 인자를 받지 않음, 타입 오류).

- [ ] **Step 3: 구현**

`src/auth/validate.ts` 전체:

```ts
export const PHONE_LAST4_MESSAGE = '휴대폰 번호 뒤 4자리를 숫자로 입력해 주세요';
export const CLASS_CODE_MESSAGE = '참여 코드 6자리를 입력해 주세요';

// 서버의 참여코드 글자 집합과 같다 (0/O, 1/I/L 제외).
const CLASS_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function validateName(name: string): string | null {
  if (name.trim() === '') return '이름을 입력해 주세요';
  if (name.length > 50) return '이름은 50자 이하로 입력해 주세요';
  return null;
}

export function validatePhoneLast4(value: string): string | null {
  return /^[0-9]{4}$/.test(value) ? null : PHONE_LAST4_MESSAGE;
}

export function validateClassCode(value: string): string | null {
  return CLASS_CODE_PATTERN.test(value) ? null : CLASS_CODE_MESSAGE;
}

export function digitsOnly(value: string, max = 4): string {
  return value.replace(/[^0-9]/g, '').slice(0, max);
}

/** 입력칸용: 대문자로 바꾸고 영문 대문자·숫자만 남겨 6자까지. 헷갈리는 글자가 섞이면 검증이 잡는다. */
export function normalizeClassCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
```

`src/api/auth.ts` 전체:

```ts
import { ApiError, request } from './client';

export type Tokens = { accessToken: string; refreshToken: string };
export type Credentials = { classCode: string; name: string; phoneLast4: string };
export type Classroom = { id: number; name: string; code: string };
export type User = { id: number; name: string; role: string; email: string | null; classroom: Classroom | null };

const BAD_RESPONSE = '서버 응답이 올바르지 않아요';

// 2xx여도 형태가 다르면(프록시·잘못된 서버·구버전 서버 등) 인증 상태가 깨지지 않도록 여기서 걸러낸다.
function fields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new ApiError(0, BAD_RESPONSE);
  return value as Record<string, unknown>;
}

function str(value: unknown): string {
  if (typeof value !== 'string' || value === '') throw new ApiError(0, BAD_RESPONSE);
  return value;
}

function toTokens(value: unknown): Tokens {
  const raw = fields(value);
  return { accessToken: str(raw.accessToken), refreshToken: str(raw.refreshToken) };
}

function toClassroom(value: unknown): Classroom | null {
  if (value === null) return null;
  const raw = fields(value);
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string' || typeof raw.code !== 'string') {
    throw new ApiError(0, BAD_RESPONSE);
  }
  return { id: raw.id, name: raw.name, code: raw.code };
}

function toUser(value: unknown): User {
  const raw = fields(value);
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string' || typeof raw.role !== 'string') {
    throw new ApiError(0, BAD_RESPONSE);
  }
  if (raw.email !== null && typeof raw.email !== 'string') throw new ApiError(0, BAD_RESPONSE);
  // classroom 키가 없으면(undefined) 구버전 응답이므로 거절한다. 소속이 없는 학생은 명시적인 null이다.
  return { id: raw.id, name: raw.name, role: raw.role, email: raw.email, classroom: toClassroom(raw.classroom) };
}

export async function signup(credentials: Credentials): Promise<Tokens> {
  return toTokens(await request<unknown>('/api/auth/signup', { method: 'POST', body: credentials }));
}

export async function login(credentials: Credentials): Promise<Tokens> {
  return toTokens(await request<unknown>('/api/auth/login', { method: 'POST', body: credentials }));
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  const raw = fields(await request<unknown>('/api/auth/refresh', { method: 'POST', body: { refreshToken } }));
  return { accessToken: str(raw.accessToken) };
}

export async function getMe(accessToken: string): Promise<User> {
  return toUser(await request<unknown>('/api/users/me', { token: accessToken }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/auth/validate.test.ts src/api/auth.test.ts`
Expected: PASS. (`npm run typecheck`는 이 단계에서는 `AuthContext.tsx`·화면이 아직 옛 시그니처를 써서 실패한다 — Task 2에서 고친다. 그래서 이 태스크는 jest만 확인한다.)

- [ ] **Step 5: 커밋**

```bash
git add src/auth/validate.ts src/auth/validate.test.ts src/api/auth.ts src/api/auth.test.ts
git commit -m "feat: 참여코드 검증·입력 정규화와 새 사용자 응답 형태를 API 계층에 추가 (#9)"
```

---

### Task 2: AuthContext·폼·화면 — 참여코드 입력, 참여 코드 화면 제거, 소속 수업 표시

**Files:**
- Modify: `src/auth/AuthContext.tsx`, `src/components/CredentialsForm.tsx`, `src/components/BottomNav.tsx`, `src/app/(main)/login.tsx`, `src/app/(main)/signup.tsx`, `src/app/(main)/account.tsx`
- Replace: `src/app/(main)/class-code.tsx` (참여 코드 입력 화면 전체를 내 정보로 보내는 Redirect 한 줄짜리로 교체, Step 4)

**Interfaces:**
- Consumes: `Credentials`, `User`(`classroom`), `signup(credentials)`, `login(credentials)` (Task 1), `validateClassCode`, `normalizeClassCode` (Task 1)
- Produces: `useAuth()`의 `signup: (credentials: Credentials) => Promise<void>`, `login: (credentials: Credentials) => Promise<void>`. `saveClassCode`는 삭제한다. `CredentialsForm`의 `onSubmit: (credentials: Credentials) => Promise<void>`.

- [ ] **Step 1: AuthContext 수정** — `src/auth/AuthContext.tsx`

- import 줄에 `Credentials`를 더한다: `import type { Credentials, User } from '../api/auth';`
- `AuthContextValue`에서 `signup`/`login` 타입을 `(credentials: Credentials) => Promise<void>`로 바꾸고, `saveClassCode` 선언과 그 위의 주석(`/** 저장해서 반영했으면 true ...*/`)을 삭제한다. 기본값 객체에서도 `saveClassCode: async () => false,`를 삭제한다.
- `signup`/`login` 정의를 다음으로 바꾼다.

```ts
  const signup = useCallback((credentials: Credentials) => enter(() => authApi.signup(credentials)), [enter]);
  const login = useCallback((credentials: Credentials) => enter(() => authApi.login(credentials)), [enter]);
```
- `saveClassCode` 콜백 전체를 삭제하고, `useMemo`의 값과 의존성 배열에서 `saveClassCode`를 뺀다.

- [ ] **Step 2: CredentialsForm 수정** — `src/components/CredentialsForm.tsx`

- import를 바꾼다: `import type { Credentials } from '../api/auth';`, `import { digitsOnly, normalizeClassCode, validateClassCode, validateName, validatePhoneLast4 } from '../auth/validate';`
- `Props.onSubmit`를 `(credentials: Credentials) => Promise<void>`로 바꾼다.
- 상태에 `const [classCode, setClassCode] = useState('');`를 더한다.
- 검증과 제출을 바꾼다.

```tsx
    const invalid = validateClassCode(classCode) ?? validateName(name) ?? validatePhoneLast4(pin);
```
```tsx
      await onSubmit({ classCode, name, phoneLast4: pin });
```
- `fields` 뷰의 맨 앞(이름 필드 위)에 참여코드 필드를 더한다.

```tsx
        <Field label="참여 코드">
          <FormInput
            label="참여 코드"
            value={classCode}
            onChangeText={(value) => setClassCode(normalizeClassCode(value))}
            onSubmit={submit}
            placeholder="예: ABC234"
            autoCapitalize="characters"
            maxLength={6}
          />
        </Field>
```
(`FormInput`은 나머지 `TextInput` props를 그대로 넘긴다. `autoComplete="off"`, `autoCorrect={false}` 기본값이 이미 들어 있다.)

- [ ] **Step 3: 로그인·회원가입 화면 수정**

`src/app/(main)/login.tsx`의 `ChoiceView` 속성을 바꾼다: `title={'참여 코드와 이름으로\n로그인해요'}`, `description="참여 코드, 이름, 휴대폰 번호 뒤 4자리를 입력해 주세요."`. 폼 연결(`onSubmit={login}`)은 그대로다(시그니처가 `Credentials`로 바뀌었으므로 타입이 맞는다).

`src/app/(main)/signup.tsx` 전체:

```tsx
import { router } from 'expo-router';
import type { Credentials } from '../../api/auth';
import { ChoiceView } from '../../components/ChoiceView';
import { CredentialsForm } from '../../components/CredentialsForm';
import { useAuth } from '../../auth/AuthContext';

export default function SignupScreen() {
  const { signup } = useAuth();
  const submit = async (credentials: Credentials) => {
    await signup(credentials);
    router.replace('/account');
  };
  return (
    <ChoiceView
      kicker="SIGN UP"
      title={'처음이세요?\n가입해 볼게요'}
      description="선생님께 받은 참여 코드와 이름, 휴대폰 번호 뒤 4자리만 있으면 돼요. 번호 전체는 저장하지 않아요."
    >
      <CredentialsForm submitLabel="가입하기" onSubmit={submit} linkLabel="이미 가입했어요? 로그인" linkHref="/login" />
    </ChoiceView>
  );
}
```

- [ ] **Step 4: 내 정보 수정, 참여 코드 화면 제거**

`src/app/(main)/account.tsx`의 로그인 상태 블록(`status === 'authenticated' && user`)을 다음으로 바꾼다(`ChoiceCard`의 참여 코드 카드는 삭제).

```tsx
  if (status === 'authenticated' && user) {
    return (
      <ChoiceView
        kicker="MY ACCOUNT"
        title={`${user.name}님,\n안녕하세요`}
        description={user.classroom ? `${user.classroom.name} · 참여 코드 ${user.classroom.code}` : '소속된 수업이 없어요.'}
      >
        <ChoiceCard
          icon="↩"
          title="로그아웃"
          sub="이 기기에서 로그아웃"
          onPress={() => {
            void logout();
            toast('로그아웃했어요');
          }}
        />
      </ChoiceView>
    );
  }
```
그리고 로그아웃 상태 화면의 설명을 `description="참여 코드로 로그인해 보세요. 로그인 없이도 단어장은 계속 쓸 수 있어요."`로, 로그인 카드의 `sub`를 `참여 코드, 이름, 휴대폰 번호 뒤 4자리`로 바꾼다. `useRouter`/`router` import는 그대로 쓰인다.

`src/app/(main)/class-code.tsx`를 다음 한 줄짜리 대체본으로 **교체**한다(경로를 북마크한 사용자를 Unmatched 화면 대신 내 정보로 보낸다).

```tsx
import { Redirect } from 'expo-router';

// 참여 코드는 이제 로그인·가입 폼에서 입력한다. 옛 경로로 들어오면 내 정보로 안내한다.
export default function ClassCodeRedirect() {
  return <Redirect href="/account" />;
}
```

`src/components/BottomNav.tsx`의 `also` 배열에서 `'/class-code'`를 뺀다: `also: ['/login', '/signup']`. (`/class-code`는 곧바로 `/account`로 넘어가므로 하이라이트에 둘 필요가 없다.)

- [ ] **Step 5: 정적 검증**

Run: `npm run typecheck && npm test && npm run build:web`
Expected: 모두 통과. 이제 `classCode`/`saveClassCode`/`setClassCode`를 참조하는 곳이 `class-code.tsx`의 Redirect 외에는 없어야 한다(`grep -rn "saveClassCode\|setClassCode\|user.classCode" src`가 비어야 한다).

- [ ] **Step 6: 브라우저에서 실제 서버로 확인**

서버는 ssen-server의 `feature/13-student-classroom-login` 브랜치가 구현·머지(또는 로컬 체크아웃)된 상태여야 한다. 아직 서버 변경이 없으면 이 단계는 서버가 준비된 뒤 컨트롤러가 수행한다 — 이 경우 Step 5까지만 하고 보고에 "브라우저 확인 대기"를 적는다.

1. DB: `docker ps`에 `ssen-db`가 있어야 한다(없으면 ssen-server 폴더에서 `docker compose up -d`).
2. 서버(8080/8081의 다른 프로세스는 건드리지 않는다): `cd /Users/JM/dev/ssen/ssen-server && DB_PORT=5433 DB_PASSWORD=ssen SERVER_PORT=18080 ./gradlew bootRun` 을 백그라운드로 띄우고 `curl localhost:18080/api/health`로 확인한다.
3. 교사·수업 준비(QA 데이터, 이름은 모두 `QA`로 시작): `curl`로 `POST http://localhost:18080/api/teacher/signup`(`{"name":"QA교사","email":"qa-teacher@example.com","password":"password1","inviteCode":"local-teacher-code"}`) → 받은 `accessToken`으로 `POST /api/teacher/classrooms {"name":"QA수업"}` → 응답의 `code`를 메모한다(토큰·비밀번호를 보고서에 적지 않는다).
4. 앱: `EXPO_PUBLIC_API_BASE_URL=http://localhost:18080 npx expo start --web --port 8099`.
5. 브라우저(Browser pane)에서 확인: 내 정보 → 회원가입(참여 코드를 소문자·공백 섞어 붙여넣어도 대문자 6자로 정리되는지, 틀린 코드 `ZZZZZZ`는 서버의 `참여 코드를 확인해 주세요.` 메시지, 올바른 코드로 `QA학생`/`1234` 가입) → 가입 직후 **내 정보**로 이동하고 `QA수업 · 참여 코드 …`가 보임 → 로그아웃 → 로그인 화면에서 틀린 번호(서버의 401 메시지) → 올바른 값으로 로그인 → 새로고침해도 로그인 유지 → 같은 학생으로 5번 틀리면 429 메시지가 폼에 보이고 6번째도 같은 메시지 → 주소창에 `/class-code`를 직접 입력하면 내 정보로 이동 → 로그인 없이 홈·학습·단어 추가가 동작 → 390px 폭에서 폼이 깨지지 않음.
6. 뒷정리: gradle 서버와 expo 서버를 끄고(18080/8099 포트가 비었는지 확인), QA 데이터를 외래 키 순서(학생 → 수업 → 교사)대로 지운다. 컨테이너는 그대로 둔다.

```bash
docker exec ssen-db psql -U ssen -d ssen -c "DELETE FROM app_user WHERE name LIKE 'QA%' AND role = 'STUDENT'"
docker exec ssen-db psql -U ssen -d ssen -c "DELETE FROM classroom WHERE name LIKE 'QA%'"
docker exec ssen-db psql -U ssen -d ssen -c "DELETE FROM app_user WHERE name LIKE 'QA%'"
```
(컨테이너·사용자·DB 이름이 다르면 `docker ps`와 ssen-server의 `docker-compose.yml`에 맞춘다.) 마지막에 `SELECT count(*) FROM app_user WHERE name LIKE 'QA%'`가 0인지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add src/auth src/components src/app
git commit -m "feat: 로그인·회원가입에 참여코드 칸 추가, 참여 코드 화면 제거, 내 정보에 소속 수업 표시 (#9)"
```
