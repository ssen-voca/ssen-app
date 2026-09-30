const DEFAULT_BASE_URL = 'http://localhost:8080';
const TIMEOUT_MS = 10_000;
const NETWORK_MESSAGE = '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요';

export function normalizeBaseUrl(raw: string | undefined): string {
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  fetchImpl?: typeof fetch;
};

function fallbackMessage(status: number): string {
  if (status === 401) return '로그인 정보가 올바르지 않아요';
  if (status === 429) return '시도 횟수를 초과했어요. 잠시 후 다시 시도해 주세요';
  if (status >= 500) return '서버에 문제가 생겼어요';
  return '요청에 실패했어요';
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, fetchImpl = fetch } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let status: number;
  let ok: boolean;
  let text: string;
  try {
    const response = await fetchImpl(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    status = response.status;
    ok = response.ok;
    text = await response.text();
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
  }

  const parsed = text === '' ? ({ ok: true, value: undefined } as const) : parseJson(text);
  if (!ok) {
    const message = parsed.ok && typeof (parsed.value as { message?: unknown } | null)?.message === 'string' ? (parsed.value as { message: string }).message : '';
    throw new ApiError(status, message || fallbackMessage(status));
  }
  // 2xx인데 JSON이 아니면 우리 API 서버가 아니다(잘못된 주소 등).
  if (!parsed.ok) throw new ApiError(0, NETWORK_MESSAGE);
  return parsed.value as T;
}
