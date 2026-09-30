import { ApiError } from '../api/client';
import type { Tokens } from '../api/auth';
import { SessionExpiredError, createSession } from './session';

const OLD: Tokens = { accessToken: 'old', refreshToken: 'refresh' };

function setup(initial: Tokens | null = OLD) {
  let stored = initial;
  const storage = {
    loadTokens: jest.fn(async () => stored),
    saveTokens: jest.fn(async (tokens: Tokens) => {
      stored = tokens;
      return true;
    }),
    clearTokens: jest.fn(async () => {
      stored = null;
    }),
  };
  const api = { refresh: jest.fn(async (_refreshToken: string) => ({ accessToken: 'new' })) };
  const session = createSession({ api, storage });
  return { session, storage, api, stored: () => stored };
}

const unauthorized = () => new ApiError(401, '만료');

describe('session.call', () => {
  it('runs fn with the stored access token without refreshing', async () => {
    const { session, api } = setup();
    const fn = jest.fn(async (token: string) => `ok:${token}`);
    await expect(session.call(fn)).resolves.toBe('ok:old');
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('refreshes once on 401, stores the new access token and retries', async () => {
    const { session, api, stored } = setup();
    const fn = jest.fn(async (token: string) => {
      if (token === 'old') throw unauthorized();
      return `ok:${token}`;
    });
    await expect(session.call(fn)).resolves.toBe('ok:new');
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(api.refresh).toHaveBeenCalledWith('refresh');
    expect(stored()).toEqual({ accessToken: 'new', refreshToken: 'refresh' });
    // later calls use the refreshed token straight away
    await expect(session.call(async (token) => token)).resolves.toBe('new');
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight refresh between concurrent callers', async () => {
    const { session, api } = setup();
    let release!: () => void;
    api.refresh.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ accessToken: 'new' });
        }),
    );
    const fn = jest.fn(async (token: string) => {
      if (token === 'old') throw unauthorized();
      return token;
    });
    const first = session.call(fn);
    const second = session.call(fn);
    await new Promise((resolve) => setTimeout(resolve, 0));
    release();
    await expect(Promise.all([first, second])).resolves.toEqual(['new', 'new']);
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('clears tokens and throws SessionExpiredError when the refresh is rejected with 401', async () => {
    const { session, api, storage, stored } = setup();
    api.refresh.mockRejectedValue(unauthorized());
    await expect(session.call(async () => Promise.reject(unauthorized()))).rejects.toBeInstanceOf(SessionExpiredError);
    expect(storage.clearTokens).toHaveBeenCalled();
    expect(stored()).toBeNull();
  });

  it('keeps the tokens and rethrows when the refresh fails with a network error or 5xx', async () => {
    for (const failure of [new ApiError(0, 'net'), new ApiError(503, 'down')]) {
      const { session, api, storage, stored } = setup();
      api.refresh.mockRejectedValue(failure);
      await expect(session.call(async () => Promise.reject(unauthorized()))).rejects.toBe(failure);
      expect(storage.clearTokens).not.toHaveBeenCalled();
      expect(stored()).toEqual(OLD);
    }
  });

  it('clears and throws SessionExpiredError when the retry is still 401', async () => {
    const { session, api, stored } = setup();
    await expect(session.call(async () => Promise.reject(unauthorized()))).rejects.toBeInstanceOf(SessionExpiredError);
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(stored()).toBeNull();
  });

  it('passes non-401 errors through untouched', async () => {
    const { session, api } = setup();
    const failure = new ApiError(500, 'boom');
    await expect(session.call(async () => Promise.reject(failure))).rejects.toBe(failure);
    const plain = new Error('x');
    await expect(session.call(async () => Promise.reject(plain))).rejects.toBe(plain);
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('throws SessionExpiredError without any request when there are no tokens', async () => {
    const { session, api } = setup(null);
    const fn = jest.fn(async () => 'x');
    await expect(session.call(fn)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(fn).not.toHaveBeenCalled();
    expect(api.refresh).not.toHaveBeenCalled();
  });
});

describe('session token management', () => {
  it('keeps tokens in memory when saving fails', async () => {
    const { session, storage } = setup(null);
    storage.saveTokens.mockResolvedValue(false);
    await session.setTokens({ accessToken: 'mem', refreshToken: 'r' });
    await expect(session.call(async (token) => token)).resolves.toBe('mem');
  });

  it('clear() forgets tokens in memory and storage', async () => {
    const { session, stored } = setup();
    await session.clear();
    expect(stored()).toBeNull();
    await expect(session.call(async () => 'x')).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('does not resurrect tokens when cleared during an in-flight refresh', async () => {
    const { session, api, stored } = setup();
    let release!: () => void;
    api.refresh.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ accessToken: 'new' });
        }),
    );
    const pending = session.call(async (token) => {
      if (token === 'old') throw unauthorized();
      return token;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await session.clear();
    release();
    await expect(pending).rejects.toBeInstanceOf(SessionExpiredError);
    expect(stored()).toBeNull();
  });
});
