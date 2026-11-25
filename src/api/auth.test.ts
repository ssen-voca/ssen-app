import { getMe, joinClassroom, leaveClassroom, login, refresh, signup, withdraw } from './auth';
import { ApiError, request } from './client';

jest.mock('./client', () => ({ ...jest.requireActual('./client'), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;
const BAD = '서버 응답이 올바르지 않아요';
const CLASSROOM = { id: 3, name: '겨울 특강 A반', code: 'ABC234' };
const USER = { id: 1, name: '김', role: 'STUDENT', position: null, email: null, school: '동국대부속고', classroom: CLASSROOM };
const CREDENTIALS = { school: '동국대부속고', name: '김', phoneLast4: '1234' };

async function expectBad(pending: Promise<unknown>) {
  const error = await pending.catch((e: unknown) => e as ApiError);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(0);
  expect((error as ApiError).message).toBe(BAD);
}

beforeEach(() => mockRequest.mockReset());

describe('auth api requests', () => {
  it('sends the school, name and last four digits to signup and login', async () => {
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
    mockRequest.mockResolvedValueOnce({ ...USER, role: 'TEACHER', email: 't@example.com', school: null, classroom: null });
    await expect(getMe('a')).resolves.toMatchObject({ role: 'TEACHER', email: 't@example.com', school: null });
  });

  it('accepts an explicit null school', async () => {
    mockRequest.mockResolvedValueOnce({ ...USER, school: null });
    await expect(getMe('a')).resolves.toEqual({ ...USER, school: null });
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
    { ...USER, school: undefined },
    { ...USER, school: 5 },
    { ...USER, classroom: undefined },
    { ...USER, classroom: 5 },
    { ...USER, classroom: { ...CLASSROOM, id: '3' } },
    { ...USER, classroom: { ...CLASSROOM, name: 5 } },
    { ...USER, classroom: { ...CLASSROOM, code: undefined } },
    { id: 1, name: '김', role: 'STUDENT', school: '동국대부속고' },
  ])('rejects malformed user response %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(getMe('a'));
  });
});

describe('getMe position', () => {
  const teacher = { ...USER, role: 'TEACHER', classroom: null };

  it('reads the position of teachers and assistants', async () => {
    mockRequest.mockResolvedValueOnce({ ...teacher, position: 'TEACHER' });
    await expect(getMe('a')).resolves.toMatchObject({ role: 'TEACHER', position: 'TEACHER' });
    mockRequest.mockResolvedValueOnce({ ...teacher, position: 'ASSISTANT' });
    await expect(getMe('a')).resolves.toMatchObject({ role: 'TEACHER', position: 'ASSISTANT' });
  });

  it('treats a teacher without a position (older server) as a teacher instead of rejecting the response', async () => {
    mockRequest.mockResolvedValueOnce(teacher);
    await expect(getMe('a')).resolves.toMatchObject({ position: 'TEACHER' });
    mockRequest.mockResolvedValueOnce({ ...teacher, position: null });
    await expect(getMe('a')).resolves.toMatchObject({ position: 'TEACHER' });
  });

  it('ignores unknown position values rather than breaking sign-in', async () => {
    mockRequest.mockResolvedValueOnce({ ...teacher, position: 'PRINCIPAL' });
    await expect(getMe('a')).resolves.toMatchObject({ position: 'TEACHER' });
  });

  it('never gives students a position, even if the server sends one', async () => {
    mockRequest.mockResolvedValueOnce({ ...USER, position: 'ASSISTANT' });
    await expect(getMe('a')).resolves.toMatchObject({ role: 'STUDENT', position: null });
  });
});

describe('joinClassroom', () => {
  it('posts the code with the access token and returns the classroom', async () => {
    mockRequest.mockResolvedValueOnce(CLASSROOM);
    await expect(joinClassroom('tok', 'ABC234')).resolves.toEqual(CLASSROOM);
    expect(mockRequest).toHaveBeenCalledWith('/api/me/classroom', { method: 'POST', body: { code: 'ABC234' }, token: 'tok' });
  });

  it.each([undefined, null, 'x', {}, { ...CLASSROOM, id: '3' }, { ...CLASSROOM, name: 5 }, { ...CLASSROOM, code: undefined }])(
    'rejects malformed response %j',
    async (body) => {
      mockRequest.mockResolvedValue(body);
      await expectBad(joinClassroom('tok', 'ABC234'));
    },
  );

  it('passes server errors through', async () => {
    mockRequest.mockRejectedValue(new ApiError(404, '참여 코드를 확인해 주세요.'));
    await expect(joinClassroom('tok', 'ZZZZZZ')).rejects.toMatchObject({ status: 404, message: '참여 코드를 확인해 주세요.' });
  });
});

describe('leaveClassroom', () => {
  it('sends DELETE to the classroom path with the access token', async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await expect(leaveClassroom('tok')).resolves.toBeUndefined();
    expect(mockRequest).toHaveBeenCalledWith('/api/me/classroom', { method: 'DELETE', token: 'tok' });
  });

  it('passes server errors through', async () => {
    mockRequest.mockRejectedValue(new ApiError(403, '학생만 사용할 수 있어요.'));
    await expect(leaveClassroom('tok')).rejects.toMatchObject({ status: 403, message: '학생만 사용할 수 있어요.' });
  });
});

describe('withdraw', () => {
  it('posts the last four digits with the access token and returns nothing', async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await expect(withdraw('tok', '1234')).resolves.toBeUndefined();
    expect(mockRequest).toHaveBeenCalledWith('/api/me/withdraw', { method: 'POST', body: { phoneLast4: '1234' }, token: 'tok' });
  });

  it.each([
    [403, '번호가 올바르지 않아요.'],
    [429, '시도 횟수를 초과했어요. 5분 뒤에 다시 시도해 주세요.'],
  ])('passes %i errors through', async (status, message) => {
    mockRequest.mockRejectedValue(new ApiError(status, message));
    await expect(withdraw('tok', '0000')).rejects.toMatchObject({ status, message });
  });
});
