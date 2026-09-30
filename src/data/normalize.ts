import type { Word, WordDetails } from './types';

const DETAIL_KEYS: (keyof WordDetails)[] = [
  'example',
  'exampleKo',
  'exampleMeaning',
  'synonyms',
  'antonyms',
  'derived',
  'related',
];

type RawWord = {
  id?: unknown;
  word?: unknown;
  meanings?: unknown;
  meaning?: unknown;
  definitions?: unknown;
  chapter?: unknown;
  details?: unknown;
};

export function blankDetails(): WordDetails {
  return { example: '', exampleKo: '', exampleMeaning: '', synonyms: '', antonyms: '', derived: '', related: '' };
}

export function splitMeanings(value: unknown): string[] {
  const parts: unknown[] = Array.isArray(value) ? value : String(value || '').split(/\n|\s*;\s*/);
  return parts.map((part) => String(part).trim()).filter(Boolean);
}

export function alignDefinitions(meanings: string[], values: unknown[]): string[] {
  return meanings.map((_, i) => String(values[i] || '').trim());
}

export function makeId(): string {
  const cryptoApi = globalThis.crypto;
  return cryptoApi && typeof cryptoApi.randomUUID === 'function' ? cryptoApi.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function normalizeWord(input: unknown): Word {
  const raw: RawWord = input && typeof input === 'object' ? (input as RawWord) : {};
  const rawDetails: Record<string, unknown> =
    raw.details && typeof raw.details === 'object' ? (raw.details as Record<string, unknown>) : {};
  const meanings = splitMeanings(raw.meanings || raw.meaning);
  const definitionSource: unknown[] = Array.isArray(raw.definitions)
    ? raw.definitions
    : String(rawDetails.definition || '').split(/\r?\n/);
  const details = blankDetails();
  for (const key of DETAIL_KEYS) {
    details[key] = String(rawDetails[key] ?? '');
  }
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : makeId(),
    word: String(raw.word || '').trim(),
    meanings,
    definitions: alignDefinitions(meanings, definitionSource),
    chapter: String(raw.chapter || 'Day 1').trim() || 'Day 1',
    details,
  };
}
