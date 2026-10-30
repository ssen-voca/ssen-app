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
