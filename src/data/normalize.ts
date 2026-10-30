import type { Word, WordDetails } from './types';

const DETAIL_KEYS: (keyof WordDetails)[] = ['example', 'exampleKo', 'exampleMeaning'];

type RawWord = {
  id?: unknown;
  word?: unknown;
  meanings?: unknown;
  meaning?: unknown;
  synonyms?: unknown;
  chapter?: unknown;
  details?: unknown;
};

export function blankDetails(): WordDetails {
  return { example: '', exampleKo: '', exampleMeaning: '' };
}

export function splitMeanings(value: unknown): string[] {
  const parts: unknown[] = Array.isArray(value) ? value : String(value || '').split(/\n|\s*;\s*/);
  return parts.map((part) => String(part).trim()).filter(Boolean);
}

export function alignList(meanings: string[], values: unknown[]): string[] {
  return meanings.map((_, i) => String(values[i] || '').trim());
}

export function makeId(): string {
  const cryptoApi = globalThis.crypto;
  return cryptoApi && typeof cryptoApi.randomUUID === 'function' ? cryptoApi.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// 새 형태(뜻별 배열)가 있으면 그대로, 옛 형태(단어 하나에 하나인 문자열)면 첫 번째 뜻의 동의어로 옮긴다.
function synonymSource(raw: RawWord, rawDetails: Record<string, unknown>): unknown[] {
  if (Array.isArray(raw.synonyms)) {
    return raw.synonyms.map((value) => (typeof value === 'string' ? value : ''));
  }
  if (typeof raw.synonyms === 'string') return [raw.synonyms];
  const legacy = rawDetails.synonyms;
  return typeof legacy === 'string' && legacy.trim() !== '' ? [legacy] : [];
}

export function normalizeWord(input: unknown): Word {
  const raw: RawWord = input && typeof input === 'object' ? (input as RawWord) : {};
  const rawDetails: Record<string, unknown> =
    raw.details && typeof raw.details === 'object' ? (raw.details as Record<string, unknown>) : {};
  const meanings = splitMeanings(raw.meanings || raw.meaning);
  const details = blankDetails();
  for (const key of DETAIL_KEYS) {
    details[key] = String(rawDetails[key] ?? '');
  }
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : makeId(),
    word: String(raw.word || '').trim(),
    meanings,
    synonyms: alignList(meanings, synonymSource(raw, rawDetails)),
    chapter: String(raw.chapter || 'Day 1').trim() || 'Day 1',
    details,
  };
}
