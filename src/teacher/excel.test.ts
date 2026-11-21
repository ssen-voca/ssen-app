import { parseWorkbook, type SheetData } from './excel';

const HEADER = ['번호', '표제어', '한국어 뜻', '품사', '동의어', '예문', '예문 활용형', '예문 해석', '예문 해석 볼드 부분'];
const sheet = (name: string, ...rows: unknown[][]): SheetData => ({ name, rows: [HEADER, ...rows] });

const sustain1 = [1, 'sustain', '지탱하다, 떠받치다', '동사', 'support, bear', 'A strong economy cannot be sustained without trust.', 'sustained', '강한 경제는 신뢰 없이는 지속될 수 없다.', '지속될'];
const sustain2 = [1, 'sustain', '지속하다, 유지하다', '동사', 'maintain, continue', '', '', '', ''];
const insight = [2, 'insight', '통찰력', '명사', 'perception', 'The data gave us a useful insight.', '', '그 데이터는 우리에게 유용한 통찰력을 주었다.', '통찰력'];

describe('parseWorkbook', () => {
  it('turns a Week sheet into words, one row per meaning', () => {
    const result = parseWorkbook([sheet('Week 1', sustain1, sustain2, insight)]);
    expect(result.errors).toEqual([]);
    expect(result.words).toHaveLength(2);
    expect(result.words[0]).toEqual({
      id: 'import:Week 1:1',
      number: 1,
      word: 'sustain',
      chapter: 'Week 1',
      meanings: ['지탱하다, 떠받치다', '지속하다, 유지하다'],
      partsOfSpeech: ['동사', '동사'],
      synonyms: ['support, bear', 'maintain, continue'],
      details: {
        example: 'A strong economy cannot be sustained without trust.',
        exampleKo: '강한 경제는 신뢰 없이는 지속될 수 없다.',
        exampleMeaning: '지속될',
        exampleForm: 'sustained',
      },
    });
    expect(result.words[1].details.exampleForm).toBeUndefined();
    expect(result.weeks).toEqual([{ week: 'Week 1', count: 2 }]);
  });

  it('accepts several sheets and Week-like sheet names', () => {
    const result = parseWorkbook([sheet('week2', insight), sheet('3주차', sustain1)]);
    expect(result.errors).toEqual([]);
    expect(result.words.map((word) => word.chapter)).toEqual(['Week 2', 'Week 3']);
    expect(result.weeks).toEqual([{ week: 'Week 2', count: 1 }, { week: 'Week 3', count: 1 }]);
  });

  it('skips sheets that are not Week sheets with a warning', () => {
    const result = parseWorkbook([{ name: '설명', rows: [['이 파일은 …']] }, sheet('Week 1', insight)]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([{ sheet: '설명', message: "시트 '설명'은 Week 이름이 아니라서 건너뛰었어요." }]);
    expect(result.words).toHaveLength(1);
  });

  it('reads merged cells: blank number and headword continue the previous word', () => {
    const continued = ['', '', '지속하다, 유지하다', '동사', 'maintain', '', '', '', ''];
    const result = parseWorkbook([sheet('Week 1', sustain1, continued)]);
    expect(result.errors).toEqual([]);
    expect(result.words[0].meanings).toHaveLength(2);
  });

  it('finds columns by header name, in any order, and tolerates number-like cells', () => {
    const reordered: SheetData = {
      name: 'Week 1',
      rows: [
        ['표제어', '번호', '한국어 뜻'],
        ['insight', '7', '통찰력'],
        ['derive', 8.0, '이끌어내다'],
      ],
    };
    const result = parseWorkbook([reordered]);
    expect(result.errors).toEqual([]);
    expect(result.words.map((word) => [word.number, word.word])).toEqual([[7, 'insight'], [8, 'derive']]);
    expect(result.words[0].partsOfSpeech).toBeUndefined();
    expect(result.words[0].synonyms).toEqual(['']);
    expect(result.words[0].details).toEqual({ example: '', exampleKo: '', exampleMeaning: '' });
  });

  it('trims cells and ignores fully empty rows', () => {
    const result = parseWorkbook([sheet('Week 1', [' 3 ', ' study ', ' 공부하다 ', ' 동사 ', ' learn ', '', '', '', ''], [null, null, null, null, null, null, null, null, null])]);
    expect(result.errors).toEqual([]);
    expect(result.words[0]).toMatchObject({ number: 3, word: 'study', meanings: ['공부하다'], partsOfSpeech: ['동사'], synonyms: ['learn'] });
  });

  it('rejects two sheets that name the same Week', () => {
    const result = parseWorkbook([sheet('Week 1', insight), sheet('week1', sustain1)]);
    expect(result.errors).toEqual([{ sheet: 'week1', message: 'Week 1 시트가 둘 이상이에요.' }]);
  });

  describe('errors (with sheet and row number)', () => {
    const error = (rows: unknown[][], name = 'Week 1') => parseWorkbook([{ name, rows }]).errors;

    it('needs the 표제어 and 한국어 뜻 headers', () => {
      expect(error([['번호', '뜻'], [1, 'x']])).toEqual([{ sheet: 'Week 1', row: 1, message: "머리글에 '표제어' 열이 없어요." }]);
      expect(error([['번호', '표제어'], [1, 'x']])).toEqual([{ sheet: 'Week 1', row: 1, message: "머리글에 '한국어 뜻' 열이 없어요." }]);
    });

    it('rejects a non-integer number and blank headword or meaning', () => {
      expect(error([HEADER, ['가', 'a', '뜻', '', '', '', '', '', '']]).map((e) => [e.row, e.message])).toEqual([[2, '번호는 숫자로 적어 주세요.']]);
      expect(error([HEADER, [1, '', '뜻', '', '', '', '', '', '']]).map((e) => [e.row, e.message])).toEqual([[2, '표제어를 적어 주세요.']]);
      expect(error([HEADER, [1, 'a', '', '', '', '', '', '', '']]).map((e) => [e.row, e.message])).toEqual([[2, '한국어 뜻을 적어 주세요.']]);
    });

    it('flags a number that comes back after other words, and a headword mismatch', () => {
      const other = [2, 'insight', '통찰력', '', '', '', '', '', ''];
      expect(error([HEADER, sustain1, other, sustain2]).map((e) => [e.row, e.message])).toEqual([[4, '번호 1이 떨어져 있는 줄에 또 나와요.']]);
      const mismatch = [1, 'insight', '통찰력', '', '', '', '', '', ''];
      expect(error([HEADER, sustain1, mismatch]).map((e) => [e.row, e.message])).toEqual([[3, '번호 1의 표제어가 위 줄과 달라요.']]);
    });

    it('needs an example and its translation together', () => {
      const noKo = [1, 'a', '뜻', '', '', 'An example.', '', '', ''];
      const noEn = [1, 'a', '뜻', '', '', '', '', '해석', ''];
      expect(error([HEADER, noKo]).map((e) => e.message)).toEqual(['예문과 예문 해석을 함께 적어 주세요.']);
      expect(error([HEADER, noEn]).map((e) => e.message)).toEqual(['예문과 예문 해석을 함께 적어 주세요.']);
    });

    it('checks that the used form is in the example and the bold part is in the translation', () => {
      const badForm = [...sustain1.slice(0, 6), 'studied', ...sustain1.slice(7)];
      expect(error([HEADER, badForm]).map((e) => [e.row, e.message])).toEqual([[2, "예문에 없는 활용형: 'studied'"]]);
      const badBold = [...sustain1.slice(0, 8), '없는 표현'];
      expect(error([HEADER, badBold]).map((e) => [e.row, e.message])).toEqual([[2, "예문 해석에 없는 볼드 부분: '없는 표현'"]]);
    });

    it('reports every problem at once and refuses an empty upload', () => {
      const result = parseWorkbook([sheet('Week 1', [1, '', '', '', '', '', '', '', ''])]);
      expect(result.errors.map((e) => e.message)).toEqual(['표제어를 적어 주세요.', '한국어 뜻을 적어 주세요.']);
      expect(parseWorkbook([]).errors).toEqual([{ sheet: '', message: '올릴 단어가 없어요.' }]);
      expect(parseWorkbook([{ name: 'Week 1', rows: [HEADER] }]).errors.map((e) => e.message)).toEqual(['올릴 단어가 없어요.']);
    });

    it('stops at the server limit of 2000 words', () => {
      const rows = Array.from({ length: 2001 }, (_, i) => [i + 1, `w${i}`, '뜻', '', '', '', '', '', '']);
      expect(error([HEADER, ...rows]).map((e) => e.message)).toEqual(['한 번에 올릴 수 있는 단어는 2000개까지예요.']);
    });
  });
});
