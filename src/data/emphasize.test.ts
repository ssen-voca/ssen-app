import { emphasize, koreanHighlight, type Segment } from './emphasize';
import { SAMPLE_WORDS } from './samples';

const marked = (segments: Segment[]) => segments.filter((segment) => segment.match).map((segment) => segment.text);
const joined = (segments: Segment[]) => segments.map((segment) => segment.text).join('');
const [cultivate] = SAMPLE_WORDS;

describe('emphasize (English)', () => {
  it('matches the headword and its common inflections, case-insensitively', () => {
    expect(marked(emphasize('We derived it. Derive again.', 'derive', true))).toEqual(['derived', 'Derive']);
  });

  it('does not match inside a longer word', () => {
    expect(marked(emphasize('The insightful data gave insight.', 'insight', true))).toEqual(['insight']);
  });

  it('keeps the full text intact across segments', () => {
    const text = 'The course helps students cultivate critical thinking.';
    const segments = emphasize(text, 'cultivate', true);
    expect(joined(segments)).toBe(text);
    expect(marked(segments)).toEqual(['cultivate']);
  });

  it('returns a single plain segment when the term is blank or absent, and nothing for empty text', () => {
    expect(emphasize('No match here.', 'resilient', true)).toEqual([{ text: 'No match here.', match: false }]);
    expect(emphasize('Plain.', '  ', true)).toEqual([{ text: 'Plain.', match: false }]);
    expect(emphasize('', 'word', true)).toEqual([]);
  });

  it('escapes regex characters in the term', () => {
    expect(marked(emphasize('I like c++ a lot', 'c++', false))).toEqual(['c++']);
  });
});

describe('koreanHighlight', () => {
  it('prefers the recorded example meaning', () => {
    const phrase = koreanHighlight(cultivate);
    expect(phrase).toBe('기르도록');
    expect(marked(emphasize(cultivate.details.exampleKo, phrase, false))).toEqual(['기르도록']);
  });

  it('falls back to a meaning fragment that appears in the sentence', () => {
    const word = { ...cultivate, details: { ...cultivate.details, exampleMeaning: '', exampleKo: '밭을 재배하다.' } };
    expect(koreanHighlight(word)).toBe('재배하다');
  });

  it('returns an empty string when nothing appears in the sentence', () => {
    const word = { ...cultivate, details: { ...cultivate.details, exampleMeaning: '', exampleKo: '관련 없는 문장' } };
    expect(koreanHighlight(word)).toBe('');
  });
});
