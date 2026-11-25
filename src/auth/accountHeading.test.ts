import type { User } from '../api/auth';
import { accountHeading } from './accountHeading';

const base: User = { id: 1, name: '김', role: 'STUDENT', position: null, email: null, school: '동국대부속고', classroom: null };

describe('accountHeading', () => {
  it('greets teachers as 선생님 with 교사 계정', () => {
    expect(accountHeading({ ...base, name: '박', role: 'TEACHER', position: 'TEACHER' })).toEqual({
      title: '박 선생님,\n안녕하세요',
      description: '교사 계정 · 동국대부속고',
    });
  });

  it('greets assistants as 조교님 with 조교 계정', () => {
    expect(accountHeading({ ...base, name: '이', role: 'TEACHER', position: 'ASSISTANT' })).toEqual({
      title: '이 조교님,\n안녕하세요',
      description: '조교 계정 · 동국대부속고',
    });
  });

  it('omits the school when a teacher or assistant has none', () => {
    expect(accountHeading({ ...base, role: 'TEACHER', position: 'ASSISTANT', school: null }).description).toBe('조교 계정');
    expect(accountHeading({ ...base, role: 'TEACHER', position: 'TEACHER', school: null }).description).toBe('교사 계정');
  });

  it('keeps the student heading unchanged', () => {
    expect(accountHeading({ ...base, classroom: { id: 3, name: '겨울 특강 A반', code: 'ABC234' } })).toEqual({
      title: '김님,\n안녕하세요',
      description: '학교: 동국대부속고 · 겨울 특강 A반',
    });
    expect(accountHeading({ ...base, school: null })).toEqual({ title: '김님,\n안녕하세요', description: '소속된 학교 정보가 없어요.' });
  });
});
