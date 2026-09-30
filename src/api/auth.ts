import { request } from './client';

export type Tokens = { accessToken: string; refreshToken: string };
export type User = { id: number; name: string; classCode: string | null; role: string };

export function signup(name: string, phoneLast4: string): Promise<Tokens> {
  return request<Tokens>('/api/auth/signup', { method: 'POST', body: { name, phoneLast4 } });
}

export function login(name: string, phoneLast4: string): Promise<Tokens> {
  return request<Tokens>('/api/auth/login', { method: 'POST', body: { name, phoneLast4 } });
}

export function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  return request<{ accessToken: string }>('/api/auth/refresh', { method: 'POST', body: { refreshToken } });
}

export function getMe(accessToken: string): Promise<User> {
  return request<User>('/api/users/me', { token: accessToken });
}

export function setClassCode(accessToken: string, classCode: string): Promise<User> {
  return request<User>('/api/users/me/class-code', { method: 'PATCH', body: { classCode }, token: accessToken });
}
