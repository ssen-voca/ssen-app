import type { Word } from './types';

export type DetailKey = 'definition' | 'example' | 'synonyms' | 'antonyms' | 'derived' | 'related';

export const DETAIL_LABELS: Record<DetailKey, string> = {
  definition: '영영',
  example: '예문',
  synonyms: '동의어',
  antonyms: '반의어',
  derived: '파생어',
  related: '유의어',
};

const DETAIL_ORDER: DetailKey[] = ['definition', 'example', 'synonyms', 'antonyms', 'derived', 'related'];

export function wordsInChapter(words: Word[], chapter: string): Word[] {
  return chapter === 'all' ? words : words.filter((word) => word.chapter === chapter);
}

export function searchWords(words: Word[], query: string, chapter: string): Word[] {
  const q = query.trim().toLowerCase();
  return wordsInChapter(words, chapter).filter((word) =>
    [word.word, word.meanings.join(' · '), word.definitions.join(' '), ...Object.values(word.details)]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

export function detailRows(word: Word): DetailKey[] {
  return DETAIL_ORDER.filter((key) => {
    if (key === 'definition') return word.definitions.some(Boolean);
    if (key === 'example') return word.details.example !== '' || word.details.exampleKo !== '';
    return word.details[key] !== '';
  });
}
