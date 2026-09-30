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

type Read = { status: 'ok'; value: unknown } | { status: 'missing' } | { status: 'unreadable' };

async function readJson(key: string): Promise<Read> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return { status: 'unreadable' };
  }
  if (raw == null) return { status: 'missing' };
  try {
    return { status: 'ok', value: JSON.parse(raw) };
  } catch {
    return { status: 'unreadable' };
  }
}

async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // 저장이 막힌 브라우저(시크릿 모드, 용량 초과)에서도 학습은 계속되게 둔다.
    return false;
  }
}

export async function loadWords(): Promise<{ words: Word[]; persist: boolean }> {
  const read = await readJson(WORDS_KEY);
  if (read.status === 'missing') return { words: SAMPLE_WORDS, persist: true };
  // 읽을 수 없는 저장값은 덮어쓰지 않도록 persist를 끈다.
  if (read.status === 'unreadable' || !Array.isArray(read.value)) return { words: SAMPLE_WORDS, persist: false };
  const words = read.value.map((item) => normalizeWord(item)).filter((word) => word.word !== '' && word.meanings.length > 0);
  return { words, persist: true };
}

export function saveWords(words: Word[]): Promise<boolean> {
  return writeJson(WORDS_KEY, words);
}

export async function loadPrefs(): Promise<Prefs> {
  const read = await readJson(PREFS_KEY);
  const stored = read.status === 'ok' ? read.value : null;
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

export async function savePrefs(prefs: Prefs): Promise<void> {
  await writeJson(PREFS_KEY, prefs);
}
