export const PHONE_LAST4_MESSAGE = '휴대폰 번호 뒤 4자리를 숫자로 입력해 주세요';

export function validateName(name: string): string | null {
  if (name.trim() === '') return '이름을 입력해 주세요';
  if (name.length > 50) return '이름은 50자 이하로 입력해 주세요';
  return null;
}

export function validatePhoneLast4(value: string): string | null {
  return /^[0-9]{4}$/.test(value) ? null : PHONE_LAST4_MESSAGE;
}

export function validateSchool(value: string): string | null {
  const school = value.trim();
  if (school === '') return '학교를 입력해 주세요';
  if (school.length > 100) return '학교 이름은 100자 이하로 입력해 주세요';
  return null;
}

export function digitsOnly(value: string, max = 4): string {
  return value.replace(/[^0-9]/g, '').slice(0, max);
}

const CLASS_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CLASS_CODE_LENGTH = 6;

export function normalizeClassCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function validateClassCode(value: string): string | null {
  const code = normalizeClassCode(value);
  if (code === '') return '참여 코드를 입력해 주세요';
  return /^[A-HJKMNP-Z2-9]{6}$/.test(code) ? null : '참여 코드를 확인해 주세요 (영문 대문자·숫자 6자)';
}

// 입력 중에는 대문자로 바꾸고, 코드에 쓰지 않는 글자(공백 포함)는 지우고, 6자까지만 남긴다.
export function filterClassCodeInput(value: string): string {
  return [...value.toUpperCase()].filter((c) => CLASS_CODE_CHARS.includes(c)).join('').slice(0, CLASS_CODE_LENGTH);
}
