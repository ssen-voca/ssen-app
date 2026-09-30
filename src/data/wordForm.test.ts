import { blankDetails } from './normalize';
import type { Word } from './types';
import { buildWord, emptyForm, formFromWord, type FormValues } from './wordForm';

const base: FormValues = { ...emptyForm('Day 2'), word: 'insight', meaning: '통찰력' };

function legacy(overrides: Partial<Word['details']> = {}): Word {
  return {
    id: 'w1',
    word: 'insight',
    meanings: ['통찰력'],
    definitions: [''],
    chapter: 'Day 2',
    details: { ...blankDetails(), ...overrides },
  };
}

describe('emptyForm', () => {
  it('starts blank with the given chapter', () => {
    expect(emptyForm('Day 3')).toEqual({
      word: '', chapter: 'Day 3', meaning: '', definition: '', example: '', exampleKo: '',
      exampleMeaning: '', synonyms: '', antonyms: '', derived: '', related: '',
    });
  });
});

describe('buildWord', () => {
  it('requires a word and a meaning', () => {
    const message = '영단어와 뜻을 입력해 주세요';
    expect(buildWord({ ...base, word: '  ' }, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...base, meaning: ' \n ' }, 'n')).toEqual({ ok: false, message });
  });

  it('builds a trimmed word with the supplied id', () => {
    const result = buildWord({ ...base, word: '  insight ', synonyms: ' vision ', chapter: '' }, 'n1');
    expect(result).toEqual({
      ok: true,
      word: {
        id: 'n1', word: 'insight', meanings: ['통찰력'], definitions: [''], chapter: 'Day 1',
        details: { ...blankDetails(), synonyms: 'vision' },
      },
    });
  });

  it('aligns multi-line definitions to the meanings', () => {
    const result = buildWord({ ...base, meaning: '통찰력\n식견\n안목', definition: 'a\n\nc\nextra' }, 'n');
    expect(result.ok && result.word.meanings).toEqual(['통찰력', '식견', '안목']);
    expect(result.ok && result.word.definitions).toEqual(['a', '', 'c']);
  });

  it('requires English and Korean examples together when added', () => {
    const message = '영어와 한국어 예문을 함께 입력해 주세요';
    expect(buildWord({ ...base, example: 'A sentence.' }, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...base, exampleKo: '문장' }, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...base, example: 'A sentence.', exampleKo: '문장' }, 'n').ok).toBe(true);
  });

  it('requires the used meaning to appear in the Korean example', () => {
    const message = '사용된 뜻은 한국어 예문에 적힌 표현으로 입력해 주세요';
    const values = { ...base, example: 'A sentence.', exampleKo: '통찰력이 있다', exampleMeaning: '식견' };
    expect(buildWord(values, 'n')).toEqual({ ok: false, message });
    expect(buildWord({ ...values, exampleMeaning: '통찰력' }, 'n').ok).toBe(true);
  });

  it('does not re-validate an unchanged legacy half-filled example on edit', () => {
    const previous = legacy({ example: 'Only English.' });
    const values = { ...formFromWord(previous), synonyms: 'vision' };
    expect(buildWord(values, 'w1', previous).ok).toBe(true);
  });

  it('validates the example pair once it is changed on edit', () => {
    const previous = legacy({ example: 'Only English.' });
    const values = { ...formFromWord(previous), example: 'Changed.' };
    expect(buildWord(values, 'w1', previous)).toEqual({ ok: false, message: '영어와 한국어 예문을 함께 입력해 주세요' });
  });

  it('does not re-validate an unchanged legacy used-meaning on edit', () => {
    const previous = legacy({ example: 'E.', exampleKo: '문장', exampleMeaning: '없는 표현' });
    expect(buildWord(formFromWord(previous), 'w1', previous).ok).toBe(true);
  });

  it('validates the used meaning when only it changes on edit', () => {
    const previous = legacy({ example: 'E.', exampleKo: '문장', exampleMeaning: '없는 표현' });
    const values = { ...formFromWord(previous), exampleMeaning: '또 다른 표현' };
    expect(buildWord(values, 'w1', previous)).toEqual({
      ok: false,
      message: '사용된 뜻은 한국어 예문에 적힌 표현으로 입력해 주세요',
    });
  });
});

describe('formFromWord', () => {
  it('round-trips through buildWord', () => {
    const word: Word = {
      id: 'w9', word: 'insight', meanings: ['통찰력', '식견'], definitions: ['a', ''], chapter: 'Day 4',
      details: { example: 'E.', exampleKo: '통찰력이 있다', exampleMeaning: '통찰력', synonyms: 's', antonyms: 'a', derived: 'd', related: 'r' },
    };
    const form = formFromWord(word);
    expect(form.meaning).toBe('통찰력\n식견');
    expect(form.definition).toBe('a\n');
    expect(buildWord(form, 'w9', word)).toEqual({ ok: true, word });
  });
});
