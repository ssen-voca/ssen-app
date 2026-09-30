export const PHONE_LAST4_MESSAGE = '휴대폰 번호 뒤 4자리를 숫자로 입력해 주세요';

export function validateName(name: string): string | null {
  if (name.trim() === '') return '이름을 입력해 주세요';
  if (name.length > 50) return '이름은 50자 이하로 입력해 주세요';
  return null;
}

export function validatePhoneLast4(value: string): string | null {
  return /^[0-9]{4}$/.test(value) ? null : PHONE_LAST4_MESSAGE;
}

export function digitsOnly(value: string, max = 4): string {
  return value.replace(/[^0-9]/g, '').slice(0, max);
}
