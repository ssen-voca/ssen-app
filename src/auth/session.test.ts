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

describe('session edge cases', () => {
  it('starts a new refresh after a failed one (the shared promise is reset)', async () => {
    const { session, api } = setup();
    api.refresh.mockRejectedValueOnce(new ApiError(0, 'net'));
    const fn = async (token: string) => {
      if (token === 'old') throw unauthorized();
      return token;
    };
    await expect(session.call(fn)).rejects.toBeInstanceOf(ApiError);
    await expect(session.call(fn)).resolves.toBe('new');
    expect(api.refresh).toHaveBeenCalledTimes(2);
  });

  it('retries a stale 401 with the already-refreshed token without a second refresh', async () => {
    const { session, api } = setup();
    let failLate!: () => void;
    const late = new Promise<string>((_resolve, reject) => {
      failLate = () => reject(unauthorized());
    });
    // first caller's request is slow and will fail with 401 only after another caller refreshed
    const slow = session.call((token) => (token === 'old' ? late : Promise.resolve(token)));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await session.call(async (token) => {
      if (token === 'old') throw unauthorized();
      return token;
    });
    expect(api.refresh).toHaveBeenCalledTimes(1);
    failLate();
    await expect(slow).resolves.toBe('new');
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps a new login when logout + login happen during a refresh that then returns 401', async () => {
    const { session, api, stored } = setup();
    let fail!: () => void;
    api.refresh.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          fail = () => reject(unauthorized());
        }),
    );
    const pending = session.call(async () => Promise.reject(unauthorized()));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await session.clear();
    await session.setTokens({ accessToken: 'mine', refreshToken: 'mine-r' });
    fail();
    await expect(pending).rejects.toBeInstanceOf(SessionExpiredError);
    expect(stored()).toEqual({ accessToken: 'mine', refreshToken: 'mine-r' });
    await expect(session.call(async (token) => token)).resolves.toBe('mine');
  });

  it('does not retry an old caller with a different login after a 401', async () => {
    const { session, api } = setup();
    let failLate!: () => void;
    const late = new Promise<string>((_resolve, reject) => {
      failLate = () => reject(unauthorized());
    });
    const pending = session.call((token) => (token === 'old' ? late : Promise.resolve(token)));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await session.clear();
    await session.setTokens({ accessToken: 'other', refreshToken: 'other-r' });
    failLate();
    await expect(pending).rejects.toBeInstanceOf(SessionExpiredError);
    expect(api.refresh).not.toHaveBeenCalled();
    await expect(session.call(async (token) => token)).resolves.toBe('other');
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
