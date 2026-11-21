import { ApiError, request } from '../api/client';
import { createClassroom, listClassrooms, publishWords } from './api';
import type { Word } from '../data/types';

jest.mock('../api/client', () => ({ ...jest.requireActual('../api/client'), request: jest.fn() }));
jest.mock('../auth/session', () => ({ session: { call: jest.fn((fn: (token: string) => unknown) => fn('tok')) } }));

const mockRequest = request as jest.MockedFunction<typeof request>;
const BAD = '서버 응답이 올바르지 않아요';
const CLASSROOM = { id: 3, name: '겨울 특강 A반', code: 'ABC234', createdAt: '2026-11-20T01:02:03Z' };
const WORD: Word = { id: 'import:Week 1:1', word: 'insight', meanings: ['통찰'], synonyms: [''], chapter: 'Week 1', details: { example: '', exampleKo: '', exampleMeaning: '' } };

async function expectBad(pending: Promise<unknown>) {
  const error = await pending.catch((e: unknown) => e as ApiError);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(0);
  expect((error as ApiError).message).toBe(BAD);
}

beforeEach(() => mockRequest.mockReset());

describe('teacher api requests', () => {
  it('lists classrooms with the bearer token', async () => {
    mockRequest.mockResolvedValue([CLASSROOM]);
    await expect(listClassrooms()).resolves.toEqual([CLASSROOM]);
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms', { token: 'tok' });
  });

  it('creates a classroom by name', async () => {
    mockRequest.mockResolvedValue(CLASSROOM);
    await expect(createClassroom('겨울 특강 A반')).resolves.toEqual(CLASSROOM);
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms', { token: 'tok', method: 'POST', body: { name: '겨울 특강 A반' } });
  });

  it('publishes the words as they are to the classroom', async () => {
    mockRequest.mockResolvedValue({ created: 1, updated: 0 });
    await expect(publishWords(3, [WORD])).resolves.toEqual({ created: 1, updated: 0 });
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms/3/words', { token: 'tok', method: 'POST', body: [WORD] });
  });
});

describe('teacher api response shapes', () => {
  it.each([undefined, null, {}, 'x', [{}], [{ ...CLASSROOM, id: '3' }], [{ ...CLASSROOM, name: 5 }], [{ ...CLASSROOM, code: undefined }], [null]])(
    'rejects malformed classroom list %j',
    async (body) => {
      mockRequest.mockResolvedValue(body);
      await expectBad(listClassrooms());
    },
  );

  it.each([undefined, null, [], { ...CLASSROOM, id: '3' }, { ...CLASSROOM, code: 5 }, { id: 3 }])('rejects malformed created classroom %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(createClassroom('A'));
  });

  it.each([undefined, null, {}, { created: 1 }, { created: '1', updated: 0 }, { created: 1, updated: null }])('rejects malformed publish result %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(publishWords(3, [WORD]));
  });

  it('lets server errors through untouched', async () => {
    mockRequest.mockRejectedValue(new ApiError(413, '파일이 너무 커요'));
    await expect(publishWords(3, [WORD])).rejects.toMatchObject({ status: 413, message: '파일이 너무 커요' });
  });
});
