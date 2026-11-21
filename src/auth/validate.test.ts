import { digitsOnly, filterClassCodeInput, normalizeClassCode, validateClassCode, validateName, validatePhoneLast4, validateSchool } from './validate';

describe('validateName', () => {
  it('accepts normal names, including 50 characters', () => {
    expect(validateName('김민준')).toBeNull();
    expect(validateName('a'.repeat(50))).toBeNull();
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateName('')).toBe('이름을 입력해 주세요');
    expect(validateName('   \t')).toBe('이름을 입력해 주세요');
  });

  it('rejects names longer than 50 characters', () => {
    expect(validateName('a'.repeat(51))).toBe('이름은 50자 이하로 입력해 주세요');
  });
});

describe('validatePhoneLast4', () => {
  it('accepts exactly four digits', () => {
    expect(validatePhoneLast4('1234')).toBeNull();
    expect(validatePhoneLast4('0000')).toBeNull();
  });

  it.each(['', '123', '12345', 'abcd', '12a4', ' 123', '１２３４'])('rejects %j', (value) => {
    expect(validatePhoneLast4(value)).toBe('휴대폰 번호 뒤 4자리를 숫자로 입력해 주세요');
  });
});

describe('digitsOnly', () => {
  it('strips non-digits and caps at 4 by default', () => {
    expect(digitsOnly('1a2-3 4')).toBe('1234');
    expect(digitsOnly('123456')).toBe('1234');
    expect(digitsOnly('abc')).toBe('');
  });

  it('honours a custom max', () => {
    expect(digitsOnly('123456', 6)).toBe('123456');
    expect(digitsOnly('123456', 2)).toBe('12');
  });
});

describe('validateSchool', () => {
  it('accepts normal school names, including 100 characters', () => {
    expect(validateSchool('동국대부속고')).toBeNull();
    expect(validateSchool('a'.repeat(100))).toBeNull();
  });

  it('rejects empty and whitespace-only values', () => {
    expect(validateSchool('')).toBe('학교를 입력해 주세요');
    expect(validateSchool('   \t')).toBe('학교를 입력해 주세요');
  });

  it('rejects values longer than 100 characters after trimming', () => {
    expect(validateSchool('a'.repeat(101))).toBe('학교 이름은 100자 이하로 입력해 주세요');
    expect(validateSchool(` ${'a'.repeat(100)} `)).toBeNull();
  });
});

describe('normalizeClassCode', () => {
  it('removes whitespace and uppercases', () => {
    expect(normalizeClassCode(' abc 234\t')).toBe('ABC234');
  });
});

describe('validateClassCode', () => {
  it('accepts six allowed characters, in any case and with spaces', () => {
    expect(validateClassCode('ABC234')).toBeNull();
    expect(validateClassCode(' abc 234 ')).toBeNull();
    expect(validateClassCode('KMNPQR')).toBeNull();
  });

  it.each(['', '   '])('asks for a code when %j is empty', (value) => {
    expect(validateClassCode(value)).toBe('참여 코드를 입력해 주세요');
  });

  it.each(['ABC23', 'ABC2345', 'ABCDE0', 'ABCDE1', 'ABCDEI', 'ABCDEL', 'ABCDEO', 'ABC-23', '가나다라마바'])('rejects %j', (value) => {
    expect(validateClassCode(value)).toBe('참여 코드를 확인해 주세요 (영문 대문자·숫자 6자)');
  });
});

describe('filterClassCodeInput', () => {
  it('uppercases, drops spaces and disallowed characters, and caps at 6', () => {
    expect(filterClassCodeInput('abc 234')).toBe('ABC234');
    expect(filterClassCodeInput('a0b1-i_l o')).toBe('AB');
    expect(filterClassCodeInput('ABCDEFGH')).toBe('ABCDEF');
    expect(filterClassCodeInput('가나')).toBe('');
  });
});
