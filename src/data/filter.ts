import type { Word } from './types';

export function wordsInChapter(words: Word[], chapter: string): Word[] {
  return chapter === 'all' ? words : words.filter((word) => word.chapter === chapter);
}

export function searchWords(words: Word[], query: string, chapter: string): Word[] {
  const q = query.trim().toLowerCase();
  return wordsInChapter(words, chapter).filter((word) =>
    [word.word, word.meanings.join(' · '), word.synonyms.join(' '), word.details.example, word.details.exampleKo]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}
