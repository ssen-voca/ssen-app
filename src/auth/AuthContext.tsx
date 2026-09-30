import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import type { User } from '../api/auth';
import { session, SessionExpiredError } from './session';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unreachable';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signup: (name: string, phoneLast4: string) => Promise<void>;
  login: (name: string, phoneLast4: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 저장해서 반영했으면 true, 그 사이 로그아웃·재로그인으로 밀렸으면 false (호출한 쪽은 조용히 끝낸다). */
  saveClassCode: (classCode: string) => Promise<boolean>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  saveClassCode: async () => false,
  retry: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: User | null }>({ status: 'loading', user: null });
  const mounted = useRef(true);
  // 오래된 부팅 확인이 나중에 도착해 최신 상태를 덮어쓰지 않도록 한다.
  const epoch = useRef(0);

  const apply = useCallback((status: AuthStatus, user: User | null = null) => {
    if (mounted.current) setState({ status, user });
  }, []);

  const boot = useCallback(async () => {
    const mine = ++epoch.current;
    const settle = (status: AuthStatus, user: User | null = null) => {
      if (epoch.current === mine) apply(status, user);
    };
    try {
      settle('authenticated', await session.call(authApi.getMe));
    } catch (error) {
      settle(error instanceof SessionExpiredError ? 'anonymous' : 'unreachable');
    }
  }, [apply]);

  useEffect(() => {
    mounted.current = true;
    void boot();
    return () => {
      mounted.current = false;
    };
  }, [boot]);

  const enter = useCallback(
    async (getTokens: () => Promise<authApi.Tokens>) => {
      const tokens = await getTokens();
      await session.setTokens(tokens);
      try {
        const user = await session.call(authApi.getMe);
        epoch.current++;
        apply('authenticated', user);
      } catch (error) {
        await session.clear();
        throw error;
      }
    },
    [apply],
  );

  const signup = useCallback((name: string, phoneLast4: string) => enter(() => authApi.signup(name, phoneLast4)), [enter]);
  const login = useCallback((name: string, phoneLast4: string) => enter(() => authApi.login(name, phoneLast4)), [enter]);

  const logout = useCallback(async () => {
    epoch.current++;
    apply('anonymous');
    await session.clear();
  }, [apply]);

  const saveClassCode = useCallback(
    async (classCode: string): Promise<boolean> => {
      const mine = epoch.current;
      try {
        const user = await session.call((token) => authApi.setClassCode(token, classCode));
        if (epoch.current !== mine) return false;
        apply('authenticated', user);
        return true;
      } catch (error) {
        if (epoch.current !== mine) return false;
        if (error instanceof SessionExpiredError) {
          epoch.current++;
          apply('anonymous');
        }
        throw error;
      }
    },
    [apply],
  );

  const retry = useCallback(() => {
    apply('loading');
    void boot();
  }, [apply, boot]);

  const value = useMemo(
    () => ({ ...state, signup, login, logout, saveClassCode, retry }),
    [state, signup, login, logout, saveClassCode, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
