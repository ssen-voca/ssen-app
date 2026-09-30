import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_WORDS } from './samples';
import { DEFAULT_PREFS, PREFS_KEY, WORDS_KEY, loadPrefs, loadWords, savePrefs } from './storage';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('loadWords', () => {
  it('seeds and persists the samples on first run', async () => {
    expect(await loadWords()).toEqual(SAMPLE_WORDS);
    expect(JSON.parse((await AsyncStorage.getItem(WORDS_KEY)) as string)).toEqual(SAMPLE_WORDS);
  });

  it('normalizes stored words and drops unusable ones', async () => {
    await AsyncStorage.setItem(
      WORDS_KEY,
      JSON.stringify([
        { id: 'a', word: 'insight', meanings: ['통찰력'] },
        { id: 'b', word: '', meanings: ['빈 단어'] },
        { id: 'c', word: 'nothing', meanings: [] },
      ]),
    );
    const words = await loadWords();
    expect(words.map((word) => word.id)).toEqual(['a']);
    expect(words[0].chapter).toBe('Day 1');
  });

  it('keeps an intentionally empty word list', async () => {
    await AsyncStorage.setItem(WORDS_KEY, '[]');
    expect(await loadWords()).toEqual([]);
  });

  it('falls back to the samples when stored JSON is corrupt', async () => {
    await AsyncStorage.setItem(WORDS_KEY, '{not json');
    expect(await loadWords()).toEqual(SAMPLE_WORDS);
  });

  it('falls back to the samples when storage throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('denied'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('denied'));
    expect(await loadWords()).toEqual(SAMPLE_WORDS);
  });
});

describe('prefs', () => {
  it('uses defaults when nothing is stored', async () => {
    expect(await loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('merges stored values and ignores wrong types', async () => {
    await AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ maskWord: true, maskMeaning: 'yes', activeChapter: 3, view: 'list' }),
    );
    expect(await loadPrefs()).toEqual({ ...DEFAULT_PREFS, maskWord: true });
  });

  it('round-trips through savePrefs', async () => {
    const prefs = { ...DEFAULT_PREFS, maskDetails: true, activeChapter: 'Day 2' };
    await savePrefs(prefs);
    expect(await loadPrefs()).toEqual(prefs);
  });

  it('does not throw when saving fails', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('quota'));
    await expect(savePrefs(DEFAULT_PREFS)).resolves.toBeUndefined();
  });
});
