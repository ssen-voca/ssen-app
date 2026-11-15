import { blankDetails } from './normalize';
import type { Word } from './types';
import { chapterOptions, dayOptions, effectiveChapter, groupByChapter, orderedWords, removeWord, upsertWord } from './wordList';

const make = (id: string, chapter = 'Week 1', text = id): Word => ({
  id, word: text, meanings: ['뜻'], synonyms: [''], chapter, details: blankDetails(),
});

describe('upsertWord', () => {
  it('puts a new word at the front without mutating', () => {
    const list = [make('a'), make('b')];
    const next = upsertWord(list, make('c'));
    expect(next.map((w) => w.id)).toEqual(['c', 'a', 'b']);
    expect(list).toHaveLength(2);
  });

  it('replaces an existing word in place', () => {
    const list = [make('a'), make('b'), make('c')];
    const next = upsertWord(list, make('b', 'Week 1', 'changed'));
    expect(next.map((w) => w.id)).toEqual(['a', 'b', 'c']);
    expect(next[1].word).toBe('changed');
    expect(list[1].word).toBe('b');
  });
});

describe('removeWord', () => {
  it('removes by id without mutating', () => {
    const list = [make('a'), make('b')];
    expect(removeWord(list, 'a').map((w) => w.id)).toEqual(['b']);
    expect(list).toHaveLength(2);
  });
});

describe('chapterOptions', () => {
  it('lists Week 1 first then distinct chapters in first-appearance order', () => {
    const list = [make('a', 'Week 3'), make('b', 'Week 2'), make('c', 'Week 3'), make('d', ''), make('e', 'Week 1')];
    expect(chapterOptions(list)).toEqual(['Week 1', 'Week 3', 'Week 2']);
  });

  it('still offers Week 1 for an empty list', () => {
    expect(chapterOptions([])).toEqual(['Week 1']);
  });
});

describe('groupByChapter', () => {
  it('orders chapters numerically and keeps the stored order inside a chapter', () => {
    const list = [make('a', 'Week 10'), make('b', 'Week 2'), make('c', 'Week 2'), make('d', 'Week 1')];
    const groups = groupByChapter(list);
    expect(groups.map((group) => group.chapter)).toEqual(['Week 1', 'Week 2', 'Week 10']);
    expect(groups[1].words.map((word) => word.id)).toEqual(['b', 'c']);
  });

  it('returns no groups for an empty list and does not mutate the input', () => {
    expect(groupByChapter([])).toEqual([]);
    const list = [make('a', 'Week 2'), make('b', 'Week 1')];
    groupByChapter(list);
    expect(list.map((word) => word.id)).toEqual(['a', 'b']);
  });
});

describe('orderedWords', () => {
  it('flattens the chapter groups in display order', () => {
    const list = [make('a', 'Week 10'), make('b', 'Week 2'), make('c', 'Week 2'), make('d', 'Week 1')];
    expect(orderedWords(list).map((word) => word.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});

describe('effectiveChapter', () => {
  const list = [make('a', 'Week 1'), make('b', 'Week 2')];

  it('keeps "all" and chapters that still exist', () => {
    expect(effectiveChapter(list, 'all')).toBe('all');
    expect(effectiveChapter(list, 'Week 2')).toBe('Week 2');
  });

  it('falls back to "all" when the saved chapter has no words left', () => {
    expect(effectiveChapter(list, 'Week 5')).toBe('all');
    expect(effectiveChapter([], 'Week 1')).toBe('all');
  });
});

describe('dayOptions', () => {
  it('starts with the all option, then each Day in numeric order with its count', () => {
    const list = [make('a', 'Week 10'), make('b', 'Week 2'), make('c', 'Week 2')];
    expect(dayOptions(list)).toEqual([
      { value: 'all', label: '전체 Week', count: 3 },
      { value: 'Week 2', label: 'Week 2', count: 2 },
      { value: 'Week 10', label: 'Week 10', count: 1 },
    ]);
  });

  it('has only the all option for an empty list', () => {
    expect(dayOptions([])).toEqual([{ value: 'all', label: '전체 Week', count: 0 }]);
  });
});
