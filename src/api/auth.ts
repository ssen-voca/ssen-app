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
