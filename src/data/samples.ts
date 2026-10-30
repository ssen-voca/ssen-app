import type { Word } from './types';

export const SAMPLE_WORDS: Word[] = [
  {
    id: 'sample-cultivate',
    word: 'cultivate',
    meanings: ['경작하다, 재배하다', '기르다, 함양하다', '관계를 쌓다'],
    synonyms: ['nurture, develop, foster', 'develop, foster', 'establish, build'],
    chapter: 'Day 1',
    details: {
      example: 'The course helps students cultivate critical thinking.',
      exampleKo: '이 과정은 학생들이 비판적 사고력을 기르도록 돕는다.',
      exampleMeaning: '기르도록',
    },
  },
  {
    id: 'sample-resilient',
    word: 'resilient',
    meanings: ['회복력이 있는', '탄력 있는'],
    synonyms: ['strong, tough', 'flexible, elastic'],
    chapter: 'Day 1',
    details: {
      example: 'She remained resilient through every change.',
      exampleKo: '그녀는 모든 변화 속에서도 회복력을 유지했다.',
      exampleMeaning: '회복력을 유지했다',
    },
  },
  {
    id: 'sample-insight',
    word: 'insight',
    meanings: ['통찰력', '이해'],
    synonyms: ['perception', 'understanding'],
    chapter: 'Day 1',
    details: {
      example: 'The data gave us a useful insight.',
      exampleKo: '그 데이터는 우리에게 유용한 통찰력을 주었다.',
      exampleMeaning: '통찰력',
    },
  },
  {
    id: 'sample-derive',
    word: 'derive',
    meanings: ['이끌어내다', '유래하다'],
    synonyms: ['obtain, deduce', 'originate, stem'],
    chapter: 'Day 2',
    details: {
      example: 'We can derive the formula from this result.',
      exampleKo: '우리는 이 결과로부터 공식을 이끌어낼 수 있다.',
      exampleMeaning: '이끌어낼',
    },
  },
];
