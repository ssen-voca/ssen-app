import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Tokens } from '../api/auth';

export const TOKENS_KEY = 'ssen-auth-v1';

export async function loadTokens(): Promise<Tokens | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKENS_KEY);
    if (raw == null) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { accessToken, refreshToken } = value as Record<string, unknown>;
    if (typeof accessToken !== 'string' || accessToken === '' || typeof refreshToken !== 'string' || refreshToken === '') return null;
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: Tokens): Promise<boolean> {
  try {
    await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    return true;
  } catch {
    // 저장이 막혀도 이번 세션은 메모리 토큰으로 계속 쓴다.
    return false;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKENS_KEY);
  } catch {
    // 지울 수 없어도 메모리 토큰은 이미 비워졌다.
  }
}
