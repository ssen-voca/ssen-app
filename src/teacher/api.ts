import { ApiError, request } from '../api/client';
import { session } from '../auth/session';
import type { Word } from '../data/types';

export type TeacherClassroom = { id: number; name: string; code: string; createdAt: string };
export type PublishResult = { created: number; updated: number };

const BAD_RESPONSE = '서버 응답이 올바르지 않아요';

// 2xx여도 형태가 다르면 화면이 깨지지 않도록 여기서 걸러낸다.
function toClassroom(value: unknown): TeacherClassroom {
  const raw = value as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'number' || typeof raw.name !== 'string' || typeof raw.code !== 'string') {
    throw new ApiError(0, BAD_RESPONSE);
  }
  return { id: raw.id, name: raw.name, code: raw.code, createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '' };
}

export async function listClassrooms(): Promise<TeacherClassroom[]> {
  const raw = await session.call((token) => request<unknown>('/api/teacher/classrooms', { token }));
  if (!Array.isArray(raw)) throw new ApiError(0, BAD_RESPONSE);
  return raw.map(toClassroom);
}

export async function createClassroom(name: string): Promise<TeacherClassroom> {
  return toClassroom(await session.call((token) => request<unknown>('/api/teacher/classrooms', { token, method: 'POST', body: { name } })));
}

export async function publishWords(classroomId: number, words: Word[]): Promise<PublishResult> {
  const raw = (await session.call((token) =>
    request<unknown>(`/api/teacher/classrooms/${classroomId}/words`, { token, method: 'POST', body: words }),
  )) as Record<string, unknown> | null;
  if (!raw || typeof raw.created !== 'number' || typeof raw.updated !== 'number') throw new ApiError(0, BAD_RESPONSE);
  return { created: raw.created, updated: raw.updated };
}
