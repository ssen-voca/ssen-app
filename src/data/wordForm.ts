import { alignDefinitions, blankDetails, splitMeanings } from './normalize';
import type { Word, WordDetails } from './types';

export type FormValues = {
  word: string;
  chapter: string;
  meaning: string;
  definition: string;
  example: string;
  exampleKo: string;
  exampleMeaning: string;
  synonyms: string;
  antonyms: string;
  derived: string;
  related: string;
};

export type BuildResult = { ok: true; word: Word } | { ok: false; message: string };

const DETAIL_FIELDS: (keyof WordDetails)[] = [
  'example', 'exampleKo', 'exampleMeaning', 'synonyms', 'antonyms', 'derived', 'related',
];

export function emptyForm(chapter: string): FormValues {
  return {
    word: '', chapter, meaning: '', definition: '', example: '', exampleKo: '',
    exampleMeaning: '', synonyms: '', antonyms: '', derived: '', related: '',
  };
}

export function formFromWord(word: Word): FormValues {
  return {
    word: word.word,
    chapter: word.chapter,
    meaning: word.meanings.join('\n'),
    definition: word.definitions.join('\n'),
    ...word.details,
  };
}

export function buildWord(values: FormValues, id: string, previous?: Word): BuildResult {
  const word = values.word.trim();
  const meanings = splitMeanings(values.meaning);
  if (!word || meanings.length === 0) return { ok: false, message: '영단어와 뜻을 입력해 주세요' };

  const details = blankDetails();
  for (const key of DETAIL_FIELDS) details[key] = values[key].trim();

  const exampleChanged =
    !previous || previous.details.example !== details.example || previous.details.exampleKo !== details.exampleKo;
  if (exampleChanged && !!details.example !== !!details.exampleKo) {
    return { ok: false, message: '영어와 한국어 예문을 함께 입력해 주세요' };
  }
  if (
    details.exampleMeaning &&
    !details.exampleKo.includes(details.exampleMeaning) &&
    (exampleChanged || previous?.details.exampleMeaning !== details.exampleMeaning)
  ) {
    return { ok: false, message: '사용된 뜻은 한국어 예문에 적힌 표현으로 입력해 주세요' };
  }

  return {
    ok: true,
    word: {
      id,
      word,
      meanings,
      definitions: alignDefinitions(meanings, values.definition.split(/\r?\n/)),
      chapter: values.chapter || 'Day 1',
      details,
    },
  };
}
