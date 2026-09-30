import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_WORDS } from './samples';
import { DEFAULT_PREFS, PREFS_KEY, WORDS_KEY, loadPrefs, loadWords, savePrefs, saveWords } from './storage';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('loadWords', () => {
  it('returns the samples without writing when the key is missing', async () => {
    expect(await loadWords()).toEqual({ words: SAMPLE_WORDS, persist: true });
    expect(await AsyncStorage.getItem(WORDS_KEY)).toBeNull();
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
    const { words, persist } = await loadWords();
    expect(persist).toBe(true);
    expect(words.map((word) => word.id)).toEqual(['a']);
    expect(words[0].chapter).toBe('Day 1');
  });

  it('keeps an intentionally empty word list', async () => {
    await AsyncStorage.setItem(WORDS_KEY, '[]');
    expect(await loadWords()).toEqual({ words: [], persist: true });
  });

  it('keeps an empty list when every stored entry is invalid', async () => {
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify([{ id: 'b', word: '', meanings: [] }]));
    expect(await loadWords()).toEqual({ words: [], persist: true });
  });

  it('uses the samples without persisting when stored JSON is corrupt', async () => {
    await AsyncStorage.setItem(WORDS_KEY, '{not json');
    expect(await loadWords()).toEqual({ words: SAMPLE_WORDS, persist: false });
    expect(await AsyncStorage.getItem(WORDS_KEY)).toBe('{not json');
  });

  it('uses the samples without persisting when stored JSON is not an array', async () => {
    await AsyncStorage.setItem(WORDS_KEY, '{"a":1}');
    expect(await loadWords()).toEqual({ words: SAMPLE_WORDS, persist: false });
  });

  it('uses the samples without persisting when storage throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('denied'));
    expect(await loadWords()).toEqual({ words: SAMPLE_WORDS, persist: false });
  });
});

describe('saveWords', () => {
  it('writes the list and reports success', async () => {
    expect(await saveWords(SAMPLE_WORDS)).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem(WORDS_KEY)) as string)).toEqual(SAMPLE_WORDS);
  });

  it('reports failure without rejecting when setItem throws', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('quota'));
    expect(await saveWords(SAMPLE_WORDS)).toBe(false);
  });

  it('reports failure when the list cannot be stringified', async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(await saveWords([circular as never])).toBe(false);
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
