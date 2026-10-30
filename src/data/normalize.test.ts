import { alignList, blankDetails, normalizeWord, splitMeanings } from './normalize';
import { SAMPLE_WORDS } from './samples';

describe('splitMeanings', () => {
  it('splits on newlines and semicolons and trims', () => {
    expect(splitMeanings('회복력이 있는\n탄력 있는; 강한 ')).toEqual(['회복력이 있는', '탄력 있는', '강한']);
  });

  it('keeps array items, dropping blanks', () => {
    expect(splitMeanings([' 통찰력 ', '', '이해'])).toEqual(['통찰력', '이해']);
  });

  it('returns an empty list for missing values', () => {
    expect(splitMeanings(undefined)).toEqual([]);
  });
});

describe('alignList', () => {
  it('pads missing entries and drops extras so lengths match the meanings', () => {
    expect(alignList(['a', 'b', 'c'], ['one', ' two '])).toEqual(['one', 'two', '']);
    expect(alignList(['a'], ['one', 'two'])).toEqual(['one']);
  });
});

describe('normalizeWord', () => {
  it('fills defaults for a minimal record', () => {
    const word = normalizeWord({ word: ' resilient ', meanings: ['회복력이 있는'] });
    expect(word.word).toBe('resilient');
    expect(word.chapter).toBe('Day 1');
    expect(word.synonyms).toEqual(['']);
    expect(word.details).toEqual(blankDetails());
    expect(word.id).not.toBe('');
  });

  it('reads the legacy singular meaning and drops the removed fields', () => {
    const word = normalizeWord({
      id: 'w1',
      word: 'derive',
      meaning: '이끌어내다;유래하다',
      chapter: '  ',
      definitions: ['to obtain', 'to originate'],
      details: {
        definition: 'to obtain\nto originate',
        example: 'We derive it.',
        antonyms: 'a',
        derived: 'd',
        related: 'r',
      },
    });
    expect(word.id).toBe('w1');
    expect(word.meanings).toEqual(['이끌어내다', '유래하다']);
    expect(word.synonyms).toEqual(['', '']);
    expect(word.chapter).toBe('Day 1');
    expect(word.details).toEqual({ example: 'We derive it.', exampleKo: '', exampleMeaning: '' });
    expect('definitions' in word).toBe(false);
  });

  it('moves the old one-per-word synonyms string onto the first meaning', () => {
    const word = normalizeWord({
      word: 'cultivate',
      meanings: ['경작하다', '기르다', '관계를 쌓다'],
      details: { synonyms: 'nurture, develop, foster' },
    });
    expect(word.synonyms).toEqual(['nurture, develop, foster', '', '']);
  });

  it('keeps a per-meaning synonyms array aligned to the meanings', () => {
    expect(normalizeWord({ word: 'a', meanings: ['x', 'y'], synonyms: ['s1'] }).synonyms).toEqual(['s1', '']);
    expect(normalizeWord({ word: 'a', meanings: ['x'], synonyms: ['s1', 's2'] }).synonyms).toEqual(['s1']);
  });

  it('treats strange synonyms values as empty instead of throwing', () => {
    expect(normalizeWord({ word: 'a', meanings: ['x', 'y', 'z'], synonyms: [5, null, {}] }).synonyms).toEqual(['', '', '']);
    expect(normalizeWord({ word: 'a', meanings: ['x'], synonyms: 5, details: { synonyms: 'legacy' } }).synonyms).toEqual(['legacy']);
    expect(normalizeWord({ word: 'a', meanings: ['x'], synonyms: 5 }).synonyms).toEqual(['']);
  });

  it('turns non-object input into an empty word instead of throwing', () => {
    const word = normalizeWord('garbage');
    expect(word.word).toBe('');
    expect(word.meanings).toEqual([]);
    expect(word.synonyms).toEqual([]);
  });

  it('leaves the bundled samples unchanged', () => {
    for (const sample of SAMPLE_WORDS) {
      expect(normalizeWord(sample)).toEqual(sample);
    }
  });
});
