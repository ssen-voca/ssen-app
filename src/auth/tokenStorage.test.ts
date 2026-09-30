import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKENS_KEY, clearTokens, loadTokens, saveTokens } from './tokenStorage';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('tokenStorage', () => {
  it('round-trips tokens under the versioned key', async () => {
    expect(TOKENS_KEY).toBe('ssen-auth-v1');
    await saveTokens({ accessToken: 'a', refreshToken: 'r' });
    expect(await loadTokens()).toEqual({ accessToken: 'a', refreshToken: 'r' });
    await clearTokens();
    expect(await loadTokens()).toBeNull();
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadTokens()).toBeNull();
  });

  it.each(['not json', '{}', '[]', 'null', '{"accessToken":"a"}', '{"accessToken":1,"refreshToken":"r"}', '{"accessToken":"","refreshToken":"r"}'])(
    'returns null for garbage %s',
    async (raw) => {
      await AsyncStorage.setItem(TOKENS_KEY, raw);
      expect(await loadTokens()).toBeNull();
    },
  );

  it('never rejects when storage throws', async () => {
    const boom = new Error('blocked');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(boom);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(boom);
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(boom);
    await expect(loadTokens()).resolves.toBeNull();
    await expect(saveTokens({ accessToken: 'a', refreshToken: 'r' })).resolves.toBe(false);
    await expect(clearTokens()).resolves.toBeUndefined();
  });
});
