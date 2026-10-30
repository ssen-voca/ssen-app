import type { Word } from './types';

export type ChapterGroup = { chapter: string; words: Word[] };
export type DayOption = { value: string; label: string; count: number };

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

/** 챕터 이름을 숫자 순서로 비교한다 (Day 2가 Day 10보다 앞). */
export function compareChapters(a: string, b: string): number {
  return a.localeCompare(b, 'ko', { numeric: true });
}

/** 챕터별로 묶는다. 챕터는 숫자 순서, 챕터 안의 단어는 저장된 순서를 유지한다. */
export function groupByChapter(words: Word[]): ChapterGroup[] {
  const groups = new Map<string, Word[]>();
  for (const word of words) {
    const group = groups.get(word.chapter);
    if (group) group.push(word);
    else groups.set(word.chapter, [word]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => compareChapters(a, b))
    .map(([chapter, list]) => ({ chapter, words: list }));
}

/** 홈 목록과 같은 순서(챕터 순서 → 저장된 순서)로 펼친 단어 목록. */
export function orderedWords(words: Word[]): Word[] {
  return groupByChapter(words).flatMap((group) => group.words);
}

/** 저장된 활성 챕터에 단어가 더 이상 없으면 전체('all')로 되돌린다. */
export function effectiveChapter(words: Word[], active: string): string {
  return active === 'all' || words.some((word) => word.chapter === active) ? active : 'all';
}

/** Day 선택 목록: 전체 + Day별(숫자 순서) 단어 수. 홈과 학습 화면이 함께 쓴다. */
export function dayOptions(words: Word[]): DayOption[] {
  return [
    { value: 'all', label: '전체 Day', count: words.length },
    ...groupByChapter(words).map((group) => ({ value: group.chapter, label: group.chapter, count: group.words.length })),
  ];
}
