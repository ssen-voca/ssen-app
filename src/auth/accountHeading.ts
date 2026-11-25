import type { User } from '../api/auth';

// 내 정보 화면의 제목·설명. 조교는 교사와 권한이 같고 표시만 다르다.
export function accountHeading(user: User): { title: string; description: string } {
  if (user.role === 'TEACHER') {
    const assistant = user.position === 'ASSISTANT';
    return {
      title: assistant ? `${user.name} 조교님,\n안녕하세요` : `${user.name} 선생님,\n안녕하세요`,
      description: `${assistant ? '조교' : '교사'} 계정${user.school ? ` · ${user.school}` : ''}`,
    };
  }
  return {
    title: `${user.name}님,\n안녕하세요`,
    description: [user.school && `학교: ${user.school}`, user.classroom?.name].filter(Boolean).join(' · ') || '소속된 학교 정보가 없어요.',
  };
}
