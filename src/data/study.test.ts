import { blankDetails } from './normalize';
import { initialStudy, splitSynonyms, startStudy, studyList, studyReducer, swipeDirection, wheelStep } from './study';
import type { Word } from './types';

const make = (id: string, chapter: string): Word => ({
  id, word: id, meanings: ['뜻'], synonyms: [''], chapter, details: blankDetails(),
});

describe('studyReducer', () => {
  it('moves forward and backward with wrap-around, closing the translation', () => {
    const open = { index: 2, translationOpen: true };
    expect(studyReducer(open, { type: 'move', step: 1, length: 3 })).toEqual({ index: 0, translationOpen: false });
    expect(studyReducer(initialStudy, { type: 'move', step: -1, length: 3 })).toEqual({ index: 2, translationOpen: false });
  });

  it('treats an index past the end as the first card and ignores empty lists', () => {
    const stale = { index: 5, translationOpen: false };
    expect(studyReducer(stale, { type: 'move', step: 1, length: 2 }).index).toBe(1);
    expect(studyReducer(stale, { type: 'move', step: 1, length: 0 })).toBe(stale);
  });

  it('stays on the only word of a one-word list and closes the translation', () => {
    expect(studyReducer({ index: 0, translationOpen: true }, { type: 'move', step: 1, length: 1 })).toEqual({
      index: 0,
      translationOpen: false,
    });
  });

  it('toggles the translation open and closed', () => {
    const open = studyReducer(initialStudy, { type: 'toggleTranslation' });
    expect(open.translationOpen).toBe(true);
    expect(studyReducer(open, { type: 'toggleTranslation' })).toEqual(initialStudy);
  });
});

describe('startStudy', () => {
  it('starts at the given index with the translation closed and never below zero', () => {
    expect(startStudy(2)).toEqual({ index: 2, translationOpen: false });
    expect(startStudy(-1).index).toBe(0);
  });
});

describe('swipeDirection', () => {
  it('needs a long, mostly horizontal drag', () => {
    expect(swipeDirection(-80, 10)).toBe(1);
    expect(swipeDirection(80, 5)).toBe(-1);
    expect(swipeDirection(30, 0)).toBe(0);
    expect(swipeDirection(-80, 70)).toBe(0);
  });
});

describe('wheelStep', () => {
  it('does nothing for small deltas, while locked, or with fewer than two words', () => {
    const idle = { consume: false, step: 0, lastWheel: 0 };
    expect(wheelStep({ deltaY: 5, locked: false, length: 3, now: 1000, lastWheel: 0 })).toEqual(idle);
    expect(wheelStep({ deltaY: 40, locked: true, length: 3, now: 1000, lastWheel: 0 })).toEqual(idle);
    expect(wheelStep({ deltaY: 40, locked: false, length: 1, now: 1000, lastWheel: 0 })).toEqual(idle);
  });

  it('steps by direction and swallows the extra wheel events inside the throttle window', () => {
    expect(wheelStep({ deltaY: 40, locked: false, length: 3, now: 1000, lastWheel: 0 })).toEqual({
      consume: true, step: 1, lastWheel: 1000,
    });
    expect(wheelStep({ deltaY: -40, locked: false, length: 3, now: 1000, lastWheel: 0 }).step).toBe(-1);
    expect(wheelStep({ deltaY: 40, locked: false, length: 3, now: 1200, lastWheel: 1000 })).toEqual({
      consume: true, step: 0, lastWheel: 1000,
    });
  });
});

describe('splitSynonyms', () => {
  it('splits on commas and semicolons, trimming and dropping blanks', () => {
    expect(splitSynonyms('nurture, develop ,foster')).toEqual(['nurture', 'develop', 'foster']);
    expect(splitSynonyms('a;b')).toEqual(['a', 'b']);
    expect(splitSynonyms('')).toEqual([]);
    expect(splitSynonyms(' , ')).toEqual([]);
  });
});

describe('studyList', () => {
  const words = [make('a', 'Day 2'), make('b', 'Day 1'), make('c', 'Day 2'), make('d', 'Day 1')];

  it('opens the word inside its own Day, keeping the stored order', () => {
    const { list, start } = studyList(words, 'c', 'all');
    expect(list.map((word) => word.id)).toEqual(['a', 'c']);
    expect(start).toBe(1);
  });

  it('lets the word win over the chapter filter', () => {
    const { list, start } = studyList(words, 'b', 'Day 2');
    expect(list.map((word) => word.id)).toEqual(['b', 'd']);
    expect(start).toBe(0);
  });

  it('without a word, studies everything in Day order from the first word', () => {
    const { list, start } = studyList(words, undefined, 'all');
    expect(list.map((word) => word.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(start).toBe(0);
  });

  it('without a word, respects an active chapter', () => {
    expect(studyList(words, undefined, 'Day 2').list.map((word) => word.id)).toEqual(['a', 'c']);
  });

  it('falls back to the full list for an unknown id and handles an empty list', () => {
    expect(studyList(words, 'nope', 'all').list).toHaveLength(4);
    expect(studyList([], undefined, 'all')).toEqual({ list: [], start: 0 });
  });
});
