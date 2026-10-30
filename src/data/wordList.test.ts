import { blankDetails } from './normalize';
import type { Word } from './types';
import { chapterOptions, groupByChapter, orderedWords, removeWord, upsertWord } from './wordList';

const make = (id: string, chapter = 'Day 1', text = id): Word => ({
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
    const next = upsertWord(list, make('b', 'Day 1', 'changed'));
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
  it('lists Day 1 first then distinct chapters in first-appearance order', () => {
    const list = [make('a', 'Day 3'), make('b', 'Day 2'), make('c', 'Day 3'), make('d', ''), make('e', 'Day 1')];
    expect(chapterOptions(list)).toEqual(['Day 1', 'Day 3', 'Day 2']);
  });

  it('still offers Day 1 for an empty list', () => {
    expect(chapterOptions([])).toEqual(['Day 1']);
  });
});

describe('groupByChapter', () => {
  it('orders chapters numerically and keeps the stored order inside a chapter', () => {
    const list = [make('a', 'Day 10'), make('b', 'Day 2'), make('c', 'Day 2'), make('d', 'Day 1')];
    const groups = groupByChapter(list);
    expect(groups.map((group) => group.chapter)).toEqual(['Day 1', 'Day 2', 'Day 10']);
    expect(groups[1].words.map((word) => word.id)).toEqual(['b', 'c']);
  });

  it('returns no groups for an empty list and does not mutate the input', () => {
    expect(groupByChapter([])).toEqual([]);
    const list = [make('a', 'Day 2'), make('b', 'Day 1')];
    groupByChapter(list);
    expect(list.map((word) => word.id)).toEqual(['a', 'b']);
  });
});

describe('orderedWords', () => {
  it('flattens the chapter groups in display order', () => {
    const list = [make('a', 'Day 10'), make('b', 'Day 2'), make('c', 'Day 2'), make('d', 'Day 1')];
    expect(orderedWords(list).map((word) => word.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});
