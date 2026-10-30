export const PHONE_LAST4_MESSAGE = '휴대폰 번호 뒤 4자리를 숫자로 입력해 주세요';
export const CLASS_CODE_MESSAGE = '참여 코드 6자리를 입력해 주세요';

// 서버의 참여코드 글자 집합과 같다 (0/O, 1/I/L 제외).
const CLASS_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function validateName(name: string): string | null {
  if (name.trim() === '') return '이름을 입력해 주세요';
  if (name.length > 50) return '이름은 50자 이하로 입력해 주세요';
  return null;
}

export function validatePhoneLast4(value: string): string | null {
  return /^[0-9]{4}$/.test(value) ? null : PHONE_LAST4_MESSAGE;
}

export function validateClassCode(value: string): string | null {
  return CLASS_CODE_PATTERN.test(value) ? null : CLASS_CODE_MESSAGE;
}

export function digitsOnly(value: string, max = 4): string {
  return value.replace(/[^0-9]/g, '').slice(0, max);
}

/** 입력칸용: 대문자로 바꾸고 영문 대문자·숫자만 남겨 6자까지. 헷갈리는 글자가 섞이면 검증이 잡는다. */
export function normalizeClassCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
