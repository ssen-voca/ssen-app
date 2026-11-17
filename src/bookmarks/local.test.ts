import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCAL_BOOKMARKS_KEY, loadLocalBookmarks, saveLocalBookmarks, toggleId } from './local';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('local bookmarks', () => {
  it('starts empty and round-trips what was saved', async () => {
    expect(await loadLocalBookmarks()).toEqual([]);
    await saveLocalBookmarks(['a', 'b']);
    expect(await loadLocalBookmarks()).toEqual(['a', 'b']);
  });

  it('ignores broken, wrong-typed and duplicate stored data', async () => {
    await AsyncStorage.setItem(LOCAL_BOOKMARKS_KEY, '{not json');
    expect(await loadLocalBookmarks()).toEqual([]);
    await AsyncStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify({ a: 1 }));
    expect(await loadLocalBookmarks()).toEqual([]);
    await AsyncStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(['a', 5, null, 'a', 'b']));
    expect(await loadLocalBookmarks()).toEqual(['a', 'b']);
  });

  it('does not throw when storage fails', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('blocked'));
    await expect(saveLocalBookmarks(['a'])).resolves.toBeUndefined();
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('blocked'));
    expect(await loadLocalBookmarks()).toEqual([]);
  });
});

describe('toggleId', () => {
  it('adds a missing id and removes a present one without mutating', () => {
    const ids = ['a'];
    expect(toggleId(ids, 'b')).toEqual(['a', 'b']);
    expect(toggleId(ids, 'a')).toEqual([]);
    expect(ids).toEqual(['a']);
  });
});
