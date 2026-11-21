import type { Word } from '../data/types';

/** 엑셀 시트 하나: 시트 이름과 칸 값(행 → 칸). 파일을 읽는 쪽이 만들어 넘긴다. */
export type SheetData = { name: string; rows: unknown[][] };

export type ParseIssue = { sheet: string; row?: number; message: string };

export type ParseResult = {
  words: Word[];
  weeks: { week: string; count: number }[];
  errors: ParseIssue[];
  warnings: ParseIssue[];
};

export const MAX_WORDS = 2000;

type Column = 'number' | 'word' | 'meaning' | 'pos' | 'synonyms' | 'example' | 'form' | 'exampleKo' | 'bold';

// 머리글 이름(공백 제거, 소문자) → 열. docs/superpowers/specs/2026-11-18-teacher-excel-format.md
const HEADER_ALIASES: Record<string, Column> = {
  번호: 'number',
  no: 'number',
  'no.': 'number',
  표제어: 'word',
  단어: 'word',
  한국어뜻: 'meaning',
  뜻: 'meaning',
  품사: 'pos',
  동의어: 'synonyms',
  예문: 'example',
  예문활용형: 'form',
  활용형: 'form',
  예문해석: 'exampleKo',
  해석: 'exampleKo',
  예문해석볼드부분: 'bold',
  해석볼드부분: 'bold',
  볼드부분: 'bold',
  볼드: 'bold',
  볼드체: 'bold',
};

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/** 시트 이름 → 'Week N'. Week 이름이 아니면 null. */
export function weekFromSheetName(name: string): string | null {
  const trimmed = name.trim();
  const match = /^week\s*(\d+)$/i.exec(trimmed) ?? /^(\d+)\s*주차$/.exec(trimmed);
  return match ? `Week ${Number(match[1])}` : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function containsForm(example: string, form: string): boolean {
  return new RegExp(`(^|[^A-Za-z])${escapeRegExp(form)}($|[^A-Za-z])`, 'i').test(example);
}

type Draft = {
  number: number;
  word: string;
  firstRow: number;
  exampleRow: number;
  meanings: string[];
  parts: string[];
  synonyms: string[];
  example: string;
  form: string;
  exampleKo: string;
  bold: string;
};

function parseSheet(sheet: SheetData, week: string, issues: { errors: ParseIssue[] }): Word[] {
  const error = (row: number | undefined, message: string) => issues.errors.push({ sheet: sheet.name, row, message });
  const headerRow = sheet.rows[0] ?? [];
  const columns = new Map<Column, number>();
  headerRow.forEach((cell, index) => {
    const key = HEADER_ALIASES[text(cell).replace(/\s+/g, '').toLowerCase()];
    if (key && !columns.has(key)) columns.set(key, index);
  });
  const missing = (['word', 'meaning', 'number'] as const).filter((key) => !columns.has(key));
  if (missing.length > 0) {
    const labels = { word: '표제어', meaning: '한국어 뜻', number: '번호' };
    for (const key of missing) error(1, `머리글에 '${labels[key]}' 열이 없어요.`);
    return [];
  }
  const get = (row: unknown[], key: Column) => (columns.has(key) ? text(row[columns.get(key)!]) : '');

  const drafts: Draft[] = [];
  const closed = new Set<number>();
  let current: Draft | null = null;

  for (let i = 1; i < sheet.rows.length; i++) {
    const row = sheet.rows[i] ?? [];
    const rowNumber = i + 1;
    if (row.every((cell) => text(cell) === '')) continue;

    const numberText = get(row, 'number');
    const word = get(row, 'word');
    const meaning = get(row, 'meaning');
    const number = /^\d+$/.test(numberText) ? Number(numberText) : null;

    // 번호와 표제어가 비었거나(병합 셀), 번호·표제어가 위 줄과 같으면 같은 단어의 다음 뜻이다.
    const sameAsCurrent =
      current !== null &&
      ((numberText === '' && word === '') ||
        (numberText === '' && word.toLowerCase() === current.word.toLowerCase()) ||
        (number === current.number && (word === '' || word.toLowerCase() === current.word.toLowerCase())));
    let target: Draft | null = null;
    let valid = true;

    if (sameAsCurrent) {
      target = current;
    } else if (numberText !== '' && number === null) {
      error(rowNumber, '번호는 숫자로 적어 주세요.');
      valid = false;
    } else if (numberText === '' && word !== '') {
      error(rowNumber, '번호는 숫자로 적어 주세요.');
      valid = false;
    } else if (number !== null && current !== null && number === current.number) {
      error(rowNumber, `번호 ${number}의 표제어가 위 줄과 달라요.`);
      valid = false;
    } else if (number !== null && closed.has(number)) {
      error(rowNumber, `번호 ${number}이 떨어져 있는 줄에 또 나와요.`);
      valid = false;
    } else if (word === '') {
      error(rowNumber, '표제어를 적어 주세요.');
      valid = false;
    } else if (current === null && numberText === '') {
      error(rowNumber, '번호와 표제어를 적어 주세요.');
      valid = false;
    }
    if (meaning === '') {
      error(rowNumber, '한국어 뜻을 적어 주세요.');
      valid = false;
    }
    if (!valid) continue;

    if (target === null) {
      if (current !== null) closed.add(current.number);
      target = {
        number: number as number,
        word,
        firstRow: rowNumber,
        exampleRow: rowNumber,
        meanings: [],
        parts: [],
        synonyms: [],
        example: '',
        form: '',
        exampleKo: '',
        bold: '',
      };
      drafts.push(target);
      current = target;
    }
    target.meanings.push(meaning);
    target.parts.push(get(row, 'pos'));
    target.synonyms.push(get(row, 'synonyms'));
    // 예문 관련 값은 단어당 하나: 처음 값이 있는 행의 것을 쓴다.
    const example = get(row, 'example');
    const form = get(row, 'form');
    const exampleKo = get(row, 'exampleKo');
    const bold = get(row, 'bold');
    if (target.example === '' && target.exampleKo === '' && (example || exampleKo || form || bold)) target.exampleRow = rowNumber;
    if (target.example === '') target.example = example;
    if (target.form === '') target.form = form;
    if (target.exampleKo === '') target.exampleKo = exampleKo;
    if (target.bold === '') target.bold = bold;
  }

  const words: Word[] = [];
  for (const draft of drafts) {
    let ok = true;
    if ((draft.example === '') !== (draft.exampleKo === '')) {
      error(draft.exampleRow, '예문과 예문 해석을 함께 적어 주세요.');
      ok = false;
    } else if (draft.example !== '') {
      if (draft.form !== '' && !containsForm(draft.example, draft.form)) {
        error(draft.exampleRow, `예문에 없는 활용형: '${draft.form}'`);
        ok = false;
      }
      if (draft.bold !== '' && !draft.exampleKo.includes(draft.bold)) {
        error(draft.exampleRow, `예문 해석에 없는 볼드 부분: '${draft.bold}'`);
        ok = false;
      }
    }
    if (!ok) continue;
    const details: Word['details'] = { example: draft.example, exampleKo: draft.exampleKo, exampleMeaning: draft.bold };
    if (draft.form !== '') details.exampleForm = draft.form;
    const word: Word = {
      id: `import:${week}:${draft.number}`,
      number: draft.number,
      word: draft.word,
      chapter: week,
      meanings: draft.meanings,
      synonyms: draft.synonyms,
      details,
    };
    if (draft.parts.some(Boolean)) word.partsOfSpeech = draft.parts;
    words.push(word);
  }
  return words;
}

/** 교사 엑셀의 시트들을 서버로 보낼 단어 목록으로 바꾼다. 오류가 하나라도 있으면 호출한 쪽이 올리지 않는다. */
export function parseWorkbook(sheets: SheetData[]): ParseResult {
  const errors: ParseIssue[] = [];
  const warnings: ParseIssue[] = [];
  const words: Word[] = [];
  const weeks: { week: string; count: number }[] = [];
  const seen = new Set<string>();

  for (const sheet of sheets) {
    const week = weekFromSheetName(sheet.name);
    if (week === null) {
      warnings.push({ sheet: sheet.name, message: `시트 '${sheet.name}'은 Week 이름이 아니라서 건너뛰었어요.` });
      continue;
    }
    if (seen.has(week)) {
      errors.push({ sheet: sheet.name, message: `${week} 시트가 둘 이상이에요.` });
      continue;
    }
    seen.add(week);
    const parsed = parseSheet(sheet, week, { errors });
    if (parsed.length > 0) {
      weeks.push({ week, count: parsed.length });
      words.push(...parsed);
    }
  }
  if (words.length > MAX_WORDS) errors.push({ sheet: '', message: `한 번에 올릴 수 있는 단어는 ${MAX_WORDS}개까지예요.` });
  if (words.length === 0 && errors.length === 0) errors.push({ sheet: '', message: '올릴 단어가 없어요.' });
  return { words, weeks, errors, warnings };
}
