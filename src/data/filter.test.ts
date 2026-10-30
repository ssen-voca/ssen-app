import { searchWords, wordsInChapter } from './filter';
import { SAMPLE_WORDS } from './samples';
import type { Word } from './types';

const ids = (words: Word[]) => words.map((word) => word.id);

describe('wordsInChapter', () => {
  it('returns every word for "all" and only matching chapters otherwise', () => {
    expect(wordsInChapter(SAMPLE_WORDS, 'all')).toHaveLength(4);
    expect(ids(wordsInChapter(SAMPLE_WORDS, 'Day 2'))).toEqual(['sample-derive']);
    expect(wordsInChapter(SAMPLE_WORDS, 'Day 9')).toEqual([]);
  });
});

describe('searchWords', () => {
  it('matches the word, meanings, synonyms and example, ignoring case and outer spaces', () => {
    expect(ids(searchWords(SAMPLE_WORDS, '  RESILIENT ', 'all'))).toEqual(['sample-resilient']);
    expect(ids(searchWords(SAMPLE_WORDS, '통찰력', 'all'))).toEqual(['sample-insight']);
    expect(ids(searchWords(SAMPLE_WORDS, 'nurture', 'all'))).toEqual(['sample-cultivate']);
    expect(ids(searchWords(SAMPLE_WORDS, 'deduce', 'all'))).toEqual(['sample-derive']);
    expect(ids(searchWords(SAMPLE_WORDS, 'The data gave', 'all'))).toEqual(['sample-insight']);
  });

  it('no longer searches the removed English definitions', () => {
    expect(searchWords(SAMPLE_WORDS, 'growing crops', 'all')).toEqual([]);
  });

  it('treats a blank query as "everything in the chapter"', () => {
    expect(searchWords(SAMPLE_WORDS, '   ', 'Day 1')).toHaveLength(3);
  });

  it('does not choke on regex-looking input', () => {
    expect(searchWords(SAMPLE_WORDS, '(*[', 'all')).toEqual([]);
  });

  it('combines the chapter filter with the query', () => {
    expect(searchWords(SAMPLE_WORDS, 'derive', 'Day 1')).toEqual([]);
  });
});
