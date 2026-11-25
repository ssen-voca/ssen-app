import { ApiError, request } from '../api/client';
import { createClassroom, deleteChapter, deleteClassroomWord, getClassroomWords, listClassrooms, publishWords, updateClassroomWord } from './api';
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

describe('teacher word management requests', () => {
  it('lists the classroom words', async () => {
    mockRequest.mockResolvedValue([WORD]);
    await expect(getClassroomWords(3)).resolves.toEqual([WORD]);
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms/3/words', { token: 'tok' });
  });

  it('updates a word by id with the id in the body too', async () => {
    mockRequest.mockResolvedValue(WORD);
    await expect(updateClassroomWord(3, WORD)).resolves.toEqual(WORD);
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms/3/words/import%3AWeek%201%3A1', { token: 'tok', method: 'PUT', body: WORD });
  });

  it('deletes a word', async () => {
    mockRequest.mockResolvedValue(undefined);
    await expect(deleteClassroomWord(3, WORD.id)).resolves.toBeUndefined();
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms/3/words/import%3AWeek%201%3A1', { token: 'tok', method: 'DELETE' });
  });

  it('deletes a chapter with the name encoded', async () => {
    mockRequest.mockResolvedValue(undefined);
    await expect(deleteChapter(3, 'Week 1')).resolves.toBeUndefined();
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms/3/chapters/Week%201', { token: 'tok', method: 'DELETE' });
  });

  it('adds replace=true only when asked and returns deleted', async () => {
    mockRequest.mockResolvedValue({ created: 1, updated: 2, deleted: 3 });
    await expect(publishWords(3, [WORD], { replace: true })).resolves.toEqual({ created: 1, updated: 2, deleted: 3 });
    expect(mockRequest).toHaveBeenCalledWith('/api/teacher/classrooms/3/words?replace=true', { token: 'tok', method: 'POST', body: [WORD] });
    mockRequest.mockResolvedValue({ created: 1, updated: 2, deleted: 3 });
    await expect(publishWords(3, [WORD], { replace: false })).resolves.toEqual({ created: 1, updated: 2 });
    expect(mockRequest).toHaveBeenLastCalledWith('/api/teacher/classrooms/3/words', { token: 'tok', method: 'POST', body: [WORD] });
  });

  it('passes the server message of a duplicate word (409) through', async () => {
    mockRequest.mockRejectedValue(new ApiError(409, '같은 단어가 이미 있어요.'));
    await expect(updateClassroomWord(3, WORD)).rejects.toMatchObject({ status: 409, message: '같은 단어가 이미 있어요.' });
  });
});

describe('teacher api response shapes', () => {
  it.each([undefined, null, {}, 'x', [null], [{}], [{ ...WORD, id: 1 }], [{ ...WORD, word: undefined }], [{ ...WORD, chapter: 1 }], [{ ...WORD, meanings: 'a' }], [{ ...WORD, meanings: [1] }], [{ ...WORD, synonyms: undefined }], [{ ...WORD, details: null }]])(
    'rejects malformed word list %j',
    async (body) => {
      mockRequest.mockResolvedValue(body);
      await expectBad(getClassroomWords(3));
    },
  );

  it.each([undefined, null, [], { ...WORD, id: undefined }, { ...WORD, details: 'x' }])('rejects malformed saved word %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(updateClassroomWord(3, WORD));
  });

  it.each([{ created: 1, updated: 0 }, { created: 1, updated: 0, deleted: '1' }])('rejects a replace result without a numeric deleted %j', async (body) => {
    mockRequest.mockResolvedValue(body);
    await expectBad(publishWords(3, [WORD], { replace: true }));
  });

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
