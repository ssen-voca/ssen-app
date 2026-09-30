import * as authApi from '../api/auth';
import type { Tokens } from '../api/auth';
import { ApiError } from '../api/client';
import * as tokenStorage from './tokenStorage';

export class SessionExpiredError extends Error {
  constructor() {
    super('로그인이 만료됐어요. 다시 로그인해 주세요');
    this.name = 'SessionExpiredError';
  }
}

type Deps = {
  api: { refresh: (refreshToken: string) => Promise<{ accessToken: string }> };
  storage: {
    loadTokens: () => Promise<Tokens | null>;
    saveTokens: (tokens: Tokens) => Promise<boolean>;
    clearTokens: () => Promise<void>;
  };
};

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

export function createSession({ api, storage }: Deps) {
  // 저장소에서 한 번 읽고 이후에는 메모리가 기준이다 (저장이 막힌 브라우저에서도 이번 세션은 유지).
  let cached: Tokens | null | undefined;
  let generation = 0;
  let refreshing: Promise<string> | undefined;

  const current = async (): Promise<Tokens | null> => {
    if (cached === undefined) {
      const loaded = await storage.loadTokens();
      if (cached === undefined) cached = loaded;
    }
    return cached;
  };

  const clear = async () => {
    generation++;
    cached = null;
    refreshing = undefined;
    await storage.clearTokens();
  };

  const setTokens = async (tokens: Tokens) => {
    generation++;
    cached = tokens;
    await storage.saveTokens(tokens);
  };

  const expire = async (): Promise<never> => {
    await clear();
    throw new SessionExpiredError();
  };

  const refreshOnce = (usedToken: string): Promise<string> => {
    // 다른 호출이 이미 토큰을 갱신했다면 그 토큰으로 바로 재시도한다.
    if (!cached) return Promise.reject(new SessionExpiredError());
    if (cached.accessToken !== usedToken) return Promise.resolve(cached.accessToken);
    if (refreshing) return refreshing;
    const tokens = cached;
    const started = generation;
    let run!: Promise<string>;
    run = (async () => {
      try {
        const { accessToken } = await api.refresh(tokens.refreshToken);
        if (started !== generation) throw new SessionExpiredError();
        cached = { ...tokens, accessToken };
        await storage.saveTokens(cached);
        return accessToken;
      } catch (error) {
        // 갱신 중에 로그아웃·재로그인이 있었다면 지금 저장된 토큰은 새 세션 것이므로 건드리지 않는다.
        if (started !== generation) throw new SessionExpiredError();
        if (isUnauthorized(error)) return expire();
        throw error;
      } finally {
        if (refreshing === run) refreshing = undefined;
      }
    })();
    refreshing = run;
    return run;
  };

  async function call<T>(fn: (accessToken: string) => Promise<T>): Promise<T> {
    const tokens = await current();
    if (!tokens) throw new SessionExpiredError();
    const started = generation;
    try {
      return await fn(tokens.accessToken);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
    }
    // 그 사이 세션이 바뀌었다면(로그아웃·재로그인) 이전 호출을 다른 사용자의 토큰으로 재시도하지 않는다.
    if (started !== generation) throw new SessionExpiredError();
    const accessToken = await refreshOnce(tokens.accessToken);
    if (started !== generation) throw new SessionExpiredError();
    try {
      return await fn(accessToken);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      // 메모리의 토큰이 방금 실패한 토큰일 때만 만료로 처리한다.
      if (cached?.accessToken === accessToken) return expire();
      throw new SessionExpiredError();
    }
  }

  return { call, setTokens, clear };
}

export const session = createSession({ api: authApi, storage: tokenStorage });
