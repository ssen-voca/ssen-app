import type { Word } from './types';

export function upsertWord(words: Word[], word: Word): Word[] {
  return words.some((item) => item.id === word.id)
    ? words.map((item) => (item.id === word.id ? word : item))
    : [word, ...words];
}

export function removeWord(words: Word[], id: string): Word[] {
  return words.filter((item) => item.id !== id);
}

export function chapterOptions(words: Word[]): string[] {
  return ['Day 1', ...new Set(words.map((word) => word.chapter).filter((chapter) => chapter && chapter !== 'Day 1'))];
}
