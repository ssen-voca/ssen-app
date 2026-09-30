import { digitsOnly, validateName, validatePhoneLast4 } from './validate';

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
