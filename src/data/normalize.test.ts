import { alignDefinitions, blankDetails, normalizeWord, splitMeanings } from './normalize';
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

describe('alignDefinitions', () => {
  it('pads missing definitions and drops extras so lengths match meanings', () => {
    expect(alignDefinitions(['a', 'b', 'c'], ['one', ' two '])).toEqual(['one', 'two', '']);
    expect(alignDefinitions(['a'], ['one', 'two'])).toEqual(['one']);
  });
});

describe('normalizeWord', () => {
  it('fills defaults for a minimal record', () => {
    const word = normalizeWord({ word: ' resilient ', meanings: ['회복력이 있는'] });
    expect(word.word).toBe('resilient');
    expect(word.chapter).toBe('Day 1');
    expect(word.definitions).toEqual(['']);
    expect(word.details).toEqual(blankDetails());
    expect(word.id).not.toBe('');
  });

  it('reads the legacy singular meaning and multi-line details.definition', () => {
    const word = normalizeWord({
      id: 'w1',
      word: 'derive',
      meaning: '이끌어내다;유래하다',
      chapter: '  ',
      details: { definition: 'to obtain\nto originate', example: 'We derive it.' },
    });
    expect(word.id).toBe('w1');
    expect(word.meanings).toEqual(['이끌어내다', '유래하다']);
    expect(word.definitions).toEqual(['to obtain', 'to originate']);
    expect(word.chapter).toBe('Day 1');
    expect(word.details.example).toBe('We derive it.');
  });

  it('turns non-object input into an empty word instead of throwing', () => {
    const word = normalizeWord('garbage');
    expect(word.word).toBe('');
    expect(word.meanings).toEqual([]);
  });

  it('leaves the bundled samples unchanged', () => {
    for (const sample of SAMPLE_WORDS) {
      expect(normalizeWord(sample)).toEqual(sample);
    }
  });
});
