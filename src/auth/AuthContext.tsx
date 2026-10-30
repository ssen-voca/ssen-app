import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import type { Credentials, User } from '../api/auth';
import { session, SessionExpiredError } from './session';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unreachable';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signup: (credentials: Credentials) => Promise<void>;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  user: null,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
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

  const signup = useCallback((credentials: Credentials) => enter(() => authApi.signup(credentials)), [enter]);
  const login = useCallback((credentials: Credentials) => enter(() => authApi.login(credentials)), [enter]);

  const logout = useCallback(async () => {
    epoch.current++;
    apply('anonymous');
    await session.clear();
  }, [apply]);

  const retry = useCallback(() => {
    apply('loading');
    void boot();
  }, [apply, boot]);

  const value = useMemo(
    () => ({ ...state, signup, login, logout, retry }),
    [state, signup, login, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
