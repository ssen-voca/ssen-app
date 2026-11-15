import { searchWords, wordsInChapter } from './filter';
import { SAMPLE_WORDS } from './samples';
import type { Word } from './types';

const ids = (words: Word[]) => words.map((word) => word.id);

describe('wordsInChapter', () => {
  it('returns every word for "all" and only matching chapters otherwise', () => {
    expect(wordsInChapter(SAMPLE_WORDS, 'all')).toHaveLength(SAMPLE_WORDS.length);
    const day2 = wordsInChapter(SAMPLE_WORDS, 'Week 2');
    expect(ids(day2)).toContain('sample-derive');
    expect(day2.every((word) => word.chapter === 'Week 2')).toBe(true);
    expect(wordsInChapter(SAMPLE_WORDS, 'Week 9')).toEqual([]);
  });
});

describe('searchWords', () => {
  it('matches the word, meanings, synonyms and example, ignoring case and outer spaces', () => {
    expect(ids(searchWords(SAMPLE_WORDS, '  RESILIENT ', 'all'))).toEqual(['sample-resilient']);
    expect(ids(searchWords(SAMPLE_WORDS, '통찰력', 'all'))).toEqual(['sample-insight']);
    expect(ids(searchWords(SAMPLE_WORDS, 'nurture', 'all'))).toEqual(['sample-cultivate']);
    expect(ids(searchWords(SAMPLE_WORDS, 'deduce', 'all'))).toEqual(['sample-derive', 'sample-conclude']);
    expect(ids(searchWords(SAMPLE_WORDS, 'The data gave', 'all'))).toEqual(['sample-insight']);
  });

  it('no longer searches the removed English definitions', () => {
    expect(searchWords(SAMPLE_WORDS, 'growing crops', 'all')).toEqual([]);
  });

  it('treats a blank query as "everything in the chapter"', () => {
    expect(searchWords(SAMPLE_WORDS, '   ', 'Week 1')).toHaveLength(wordsInChapter(SAMPLE_WORDS, 'Week 1').length);
  });

  it('does not choke on regex-looking input', () => {
    expect(searchWords(SAMPLE_WORDS, '(*[', 'all')).toEqual([]);
  });

  it('combines the chapter filter with the query', () => {
    expect(searchWords(SAMPLE_WORDS, 'derive', 'Week 1')).toEqual([]);
  });
});
