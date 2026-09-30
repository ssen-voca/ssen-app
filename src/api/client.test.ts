import { API_BASE_URL, ApiError, normalizeBaseUrl, request } from './client';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function reply(status: number, body?: unknown, raw?: string) {
  const text = raw ?? (body === undefined ? '' : JSON.stringify(body));
  return { ok: status >= 200 && status < 300, status, text: async () => text } as Response;
}

function fetchReturning(response: Response): FetchMock {
  return jest.fn(async (_url: string, _init?: RequestInit) => response);
}

const asFetch = (mock: unknown) => mock as typeof fetch;
const failure = (pending: Promise<unknown>): Promise<ApiError> =>
  pending.then(
    () => {
      throw new Error('expected the request to fail');
    },
    (e: unknown) => e as ApiError,
  );

afterEach(() => {
  jest.useRealTimers();
});

describe('normalizeBaseUrl', () => {
  it('trims trailing slashes', () => {
    expect(normalizeBaseUrl('http://x.test/')).toBe('http://x.test');
    expect(normalizeBaseUrl('http://x.test///')).toBe('http://x.test');
  });

  it('falls back to localhost:8080 when empty or missing', () => {
    expect(normalizeBaseUrl(undefined)).toBe('http://localhost:8080');
    expect(normalizeBaseUrl('')).toBe('http://localhost:8080');
  });
});

describe('request', () => {
  it('returns the parsed JSON body on success', async () => {
    const fetchImpl = fetchReturning(reply(200, { a: 1 }));
    await expect(request('/api/x', { fetchImpl: asFetch(fetchImpl) })).resolves.toEqual({ a: 1 });
    expect(fetchImpl.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/x`);
  });

  it('returns undefined for 204 and empty bodies', async () => {
    await expect(request('/x', { fetchImpl: asFetch(fetchReturning(reply(204))) })).resolves.toBeUndefined();
    await expect(request('/x', { fetchImpl: asFetch(fetchReturning(reply(200, undefined, ''))) })).resolves.toBeUndefined();
  });

  it('sends JSON with a content type and uses GET by default', async () => {
    const fetchImpl = fetchReturning(reply(200, {}));
    await request('/x', { method: 'POST', body: { name: '김' }, fetchImpl: asFetch(fetchImpl) });
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: '김' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');

    await request('/x', { fetchImpl: asFetch(fetchImpl) });
    const plain = fetchImpl.mock.calls[1][1] as RequestInit;
    expect(plain.method).toBe('GET');
    expect(plain.body).toBeUndefined();
  });

  it('sets Authorization only when a token is given', async () => {
    const fetchImpl = fetchReturning(reply(200, {}));
    await request('/x', { fetchImpl: asFetch(fetchImpl) });
    await request('/x', { token: 'abc', fetchImpl: asFetch(fetchImpl) });
    expect((fetchImpl.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBeUndefined();
    expect((fetchImpl.mock.calls[1][1]!.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('uses the string message from the error body', async () => {
    const fetchImpl = fetchReturning(reply(409, { message: '이미 가입된 학생이에요. 로그인해 주세요.' }));
    const error = await failure(request('/x', { fetchImpl: asFetch(fetchImpl) }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('이미 가입된 학생이에요. 로그인해 주세요.');
  });

  it.each([
    [401, '로그인 정보가 올바르지 않아요'],
    [429, '시도 횟수를 초과했어요. 잠시 후 다시 시도해 주세요'],
    [500, '서버에 문제가 생겼어요'],
    [503, '서버에 문제가 생겼어요'],
    [400, '요청에 실패했어요'],
    [404, '요청에 실패했어요'],
  ])('falls back to a Korean message for status %i', async (status, message) => {
    for (const fetchImpl of [fetchReturning(reply(status)), fetchReturning(reply(status, { message: 5 })), fetchReturning(reply(status, undefined, '<html>'))]) {
      const error = await failure(request('/x', { fetchImpl: asFetch(fetchImpl) }));
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(status);
      expect(error.message).toBe(message);
    }
  });

  it('maps a network failure to status 0', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const error = await failure(request('/x', { fetchImpl: asFetch(fetchImpl) }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toBe('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요');
  });

  it('maps a non-JSON success body to status 0', async () => {
    const error = await failure(request('/x', { fetchImpl: asFetch(fetchReturning(reply(200, undefined, '<html>'))) }));
    expect(error.status).toBe(0);
  });

  it('aborts after 10 seconds and reports status 0', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = failure(request('/x', { fetchImpl: asFetch(fetchImpl) }));
    await jest.advanceTimersByTimeAsync(9999);
    expect(fetchImpl.mock.calls[0][1]!.signal!.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    const error = await pending;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
  });
});
