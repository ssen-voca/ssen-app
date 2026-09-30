import { ApiError, request } from './client';

export type Tokens = { accessToken: string; refreshToken: string };
export type User = { id: number; name: string; classCode: string | null; role: string };

const BAD_RESPONSE = '서버 응답이 올바르지 않아요';

// 2xx여도 형태가 다르면(프록시·잘못된 서버 등) 인증 상태가 깨지지 않도록 여기서 걸러낸다.
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

function toUser(value: unknown): User {
  const raw = fields(value);
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string') throw new ApiError(0, BAD_RESPONSE);
  if (raw.classCode !== null && typeof raw.classCode !== 'string') throw new ApiError(0, BAD_RESPONSE);
  if (typeof raw.role !== 'string') throw new ApiError(0, BAD_RESPONSE);
  return { id: raw.id, name: raw.name, classCode: raw.classCode, role: raw.role };
}

export async function signup(name: string, phoneLast4: string): Promise<Tokens> {
  return toTokens(await request<unknown>('/api/auth/signup', { method: 'POST', body: { name, phoneLast4 } }));
}

export async function login(name: string, phoneLast4: string): Promise<Tokens> {
  return toTokens(await request<unknown>('/api/auth/login', { method: 'POST', body: { name, phoneLast4 } }));
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  const raw = fields(await request<unknown>('/api/auth/refresh', { method: 'POST', body: { refreshToken } }));
  return { accessToken: str(raw.accessToken) };
}

export async function getMe(accessToken: string): Promise<User> {
  return toUser(await request<unknown>('/api/users/me', { token: accessToken }));
}

export async function setClassCode(accessToken: string, classCode: string): Promise<User> {
  return toUser(
    await request<unknown>('/api/users/me/class-code', { method: 'PATCH', body: { classCode }, token: accessToken }),
  );
}
