import { getMe, login, refresh, setClassCode, signup } from './auth';
import { ApiError, request } from './client';

jest.mock('./client', () => ({ ...jest.requireActual('./client'), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;
const BAD = '서버 응답이 올바르지 않아요';
const USER = { id: 1, name: '김', classCode: null, role: 'STUDENT' };

async function expectBad(pending: Promise<unknown>) {
  const error = await pending.catch((e: unknown) => e as ApiError);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(0);
  expect((error as ApiError).message).toBe(BAD);
}

beforeEach(() => mockRequest.mockReset());

describe('auth api response shapes', () => {
  it('passes well-formed responses through', async () => {
    mockRequest.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });
    await expect(signup('김', '1234')).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
    mockRequest.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });
    await expect(login('김', '1234')).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
    mockRequest.mockResolvedValueOnce({ accessToken: 'n' });
    await expect(refresh('r')).resolves.toEqual({ accessToken: 'n' });
    mockRequest.mockResolvedValueOnce(USER);
    await expect(getMe('a')).resolves.toEqual(USER);
    mockRequest.mockResolvedValueOnce({ ...USER, classCode: 'ABC' });
    await expect(setClassCode('a', 'ABC')).resolves.toEqual({ ...USER, classCode: 'ABC' });
  });

  it.each([undefined, null, 'x', {}, { accessToken: 'a' }, { accessToken: 'a', refreshToken: 1 }, { accessToken: '', refreshToken: 'r' }])(
    'rejects malformed token responses %j',
    async (body) => {
      mockRequest.mockResolvedValue(body);
      await expectBad(signup('김', '1234'));
      await expectBad(login('김', '1234'));
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
    { ...USER, classCode: 5 },
    { ...USER, classCode: undefined },
    { ...USER, role: undefined },
  ])('rejects malformed user response %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(getMe('a'));
    await expectBad(setClassCode('a', 'ABC'));
  });
});
