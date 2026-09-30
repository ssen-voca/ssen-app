import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeWord } from './normalize';
import { SAMPLE_WORDS } from './samples';
import type { Prefs, Word } from './types';

export const WORDS_KEY = 'pocket-vocab-words-v1';
export const PREFS_KEY = 'pocket-vocab-prefs-v1';

export const DEFAULT_PREFS: Prefs = {
  maskWord: false,
  maskMeaning: true,
  maskDetails: false,
  activeChapter: 'all',
};

type MaskPrefKey = 'maskWord' | 'maskMeaning' | 'maskDetails';

async function readJson(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장이 막힌 브라우저(시크릿 모드, 용량 초과)에서도 학습은 계속되게 둔다.
  }
}

export async function loadWords(): Promise<Word[]> {
  const stored = await readJson(WORDS_KEY);
  if (!Array.isArray(stored)) {
    await writeJson(WORDS_KEY, SAMPLE_WORDS);
    return SAMPLE_WORDS;
  }
  return stored.map((item) => normalizeWord(item)).filter((word) => word.word !== '' && word.meanings.length > 0);
}

export async function loadPrefs(): Promise<Prefs> {
  const stored = await readJson(PREFS_KEY);
  const raw: Record<string, unknown> = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const flag = (key: MaskPrefKey): boolean => (typeof raw[key] === 'boolean' ? (raw[key] as boolean) : DEFAULT_PREFS[key]);
  return {
    maskWord: flag('maskWord'),
    maskMeaning: flag('maskMeaning'),
    maskDetails: flag('maskDetails'),
    activeChapter:
      typeof raw.activeChapter === 'string' && raw.activeChapter !== '' ? raw.activeChapter : DEFAULT_PREFS.activeChapter,
  };
}

export function savePrefs(prefs: Prefs): Promise<void> {
  return writeJson(PREFS_KEY, prefs);
}
