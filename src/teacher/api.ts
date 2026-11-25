import { ApiError, request } from '../api/client';
import { session } from '../auth/session';
import type { Word } from '../data/types';

export type TeacherClassroom = { id: number; name: string; code: string; createdAt: string; joinable: boolean; studentCount: number };
export type ClassroomStudent = { id: number; name: string; school: string | null };
export type PublishResult = { created: number; updated: number; deleted?: number };

const BAD_RESPONSE = '서버 응답이 올바르지 않아요';

// 2xx여도 형태가 다르면 화면이 깨지지 않도록 여기서 걸러낸다.
function toClassroom(value: unknown): TeacherClassroom {
  const raw = value as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'number' || typeof raw.name !== 'string' || typeof raw.code !== 'string') {
    throw new ApiError(0, BAD_RESPONSE);
  }
  // joinable·studentCount는 구버전 서버에 없을 수 있어 기본값으로 둔다.
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    joinable: typeof raw.joinable === 'boolean' ? raw.joinable : true,
    studentCount: typeof raw.studentCount === 'number' ? raw.studentCount : 0,
  };
}

export async function listClassrooms(): Promise<TeacherClassroom[]> {
  const raw = await session.call((token) => request<unknown>('/api/teacher/classrooms', { token }));
  if (!Array.isArray(raw)) throw new ApiError(0, BAD_RESPONSE);
  return raw.map(toClassroom);
}

export async function createClassroom(name: string): Promise<TeacherClassroom> {
  return toClassroom(await session.call((token) => request<unknown>('/api/teacher/classrooms', { token, method: 'POST', body: { name } })));
}

const classroomPath = (id: number) => `/api/teacher/classrooms/${id}`;

export async function updateClassroom(id: number, changes: { name?: string; joinable?: boolean }): Promise<TeacherClassroom> {
  return toClassroom(await session.call((token) => request<unknown>(classroomPath(id), { token, method: 'PATCH', body: changes })));
}

export async function reissueClassroomCode(id: number): Promise<TeacherClassroom> {
  return toClassroom(await session.call((token) => request<unknown>(`${classroomPath(id)}/code`, { token, method: 'POST' })));
}

function toStudent(value: unknown): ClassroomStudent {
  const raw = value as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'number' || typeof raw.name !== 'string') throw new ApiError(0, BAD_RESPONSE);
  return { id: raw.id, name: raw.name, school: typeof raw.school === 'string' ? raw.school : null };
}

export async function listClassroomStudents(id: number): Promise<ClassroomStudent[]> {
  const raw = await session.call((token) => request<unknown>(`${classroomPath(id)}/students`, { token }));
  if (!Array.isArray(raw)) throw new ApiError(0, BAD_RESPONSE);
  return raw.map(toStudent);
}

export async function removeClassroomStudent(id: number, studentId: number): Promise<void> {
  await session.call((token) => request<unknown>(`${classroomPath(id)}/students/${studentId}`, { token, method: 'DELETE' }));
}

export async function deleteClassroom(id: number): Promise<void> {
  await session.call((token) => request<unknown>(classroomPath(id), { token, method: 'DELETE' }));
}

const isStrings = (value: unknown) => Array.isArray(value) && value.every((v) => typeof v === 'string');

function toWord(value: unknown): Word {
  const raw = value as Record<string, unknown> | null;
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof raw.id !== 'string' ||
    typeof raw.word !== 'string' ||
    typeof raw.chapter !== 'string' ||
    !isStrings(raw.meanings) ||
    !isStrings(raw.synonyms) ||
    !raw.details ||
    typeof raw.details !== 'object'
  ) {
    throw new ApiError(0, BAD_RESPONSE);
  }
  return raw as unknown as Word;
}

const wordsPath = (classroomId: number) => `/api/teacher/classrooms/${classroomId}/words`;

export async function getClassroomWords(classroomId: number): Promise<Word[]> {
  const raw = await session.call((token) => request<unknown>(wordsPath(classroomId), { token }));
  if (!Array.isArray(raw)) throw new ApiError(0, BAD_RESPONSE);
  return raw.map(toWord);
}

export async function updateClassroomWord(classroomId: number, word: Word): Promise<Word> {
  return toWord(
    await session.call((token) =>
      request<unknown>(`${wordsPath(classroomId)}/${encodeURIComponent(word.id)}`, { token, method: 'PUT', body: word }),
    ),
  );
}

export async function deleteClassroomWord(classroomId: number, wordId: string): Promise<void> {
  await session.call((token) => request<unknown>(`${wordsPath(classroomId)}/${encodeURIComponent(wordId)}`, { token, method: 'DELETE' }));
}

export async function deleteChapter(classroomId: number, chapter: string): Promise<void> {
  await session.call((token) =>
    request<unknown>(`/api/teacher/classrooms/${classroomId}/chapters/${encodeURIComponent(chapter)}`, { token, method: 'DELETE' }),
  );
}

export async function publishWords(classroomId: number, words: Word[], options: { replace?: boolean } = {}): Promise<PublishResult> {
  const replace = options.replace === true;
  const raw = (await session.call((token) =>
    request<unknown>(`${wordsPath(classroomId)}${replace ? '?replace=true' : ''}`, { token, method: 'POST', body: words }),
  )) as Record<string, unknown> | null;
  if (!raw || typeof raw.created !== 'number' || typeof raw.updated !== 'number') throw new ApiError(0, BAD_RESPONSE);
  if (!replace) return { created: raw.created, updated: raw.updated };
  if (typeof raw.deleted !== 'number') throw new ApiError(0, BAD_RESPONSE);
  return { created: raw.created, updated: raw.updated, deleted: raw.deleted };
}
