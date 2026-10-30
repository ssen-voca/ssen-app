import { wordsInChapter } from './filter';
import type { Word } from './types';
import { orderedWords } from './wordList';

export type StudyState = { index: number; translationOpen: boolean };

export type StudyAction = { type: 'move'; step: number; length: number } | { type: 'toggleTranslation' };

export const initialStudy: StudyState = { index: 0, translationOpen: false };

export function startStudy(index: number): StudyState {
  return { ...initialStudy, index: Math.max(0, index) };
}

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case 'move': {
      if (action.length <= 0) return state;
      const current = state.index >= action.length ? 0 : state.index;
      return { ...initialStudy, index: (current + action.step + action.length) % action.length };
    }
    case 'toggleTranslation':
      return { ...state, translationOpen: !state.translationOpen };
  }
}

export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) return dx < 0 ? 1 : -1;
  return 0;
}

type WheelInput = { deltaY: number; locked: boolean; length: number; now: number; lastWheel: number };

export function wheelStep({ deltaY, locked, length, now, lastWheel }: WheelInput): {
  consume: boolean;
  step: -1 | 0 | 1;
  lastWheel: number;
} {
  if (locked || length < 2 || Math.abs(deltaY) < 15) return { consume: false, step: 0, lastWheel };
  if (now - lastWheel < 450) return { consume: true, step: 0, lastWheel };
  return { consume: true, step: deltaY > 0 ? 1 : -1, lastWheel: now };
}

export function splitSynonyms(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((chip) => chip.trim())
    .filter(Boolean);
}

/**
 * 학습 목록과 시작 위치. 단어 id가 있으면 그 단어가 속한 Day의 목록에서 그 단어부터,
 * 없으면(또는 없는 id면) 전체(활성 챕터가 있으면 그 챕터)를 홈 목록과 같은 순서로 첫 단어부터.
 * scope는 목록의 범위('all' 또는 Day 이름).
 */
export function studyList(
  words: Word[],
  wordId: string | undefined,
  activeChapter: string,
): { list: Word[]; start: number; scope: string } {
  const target = wordId === undefined ? undefined : words.find((word) => word.id === wordId);
  if (target) {
    const list = words.filter((word) => word.chapter === target.chapter);
    return { list, start: list.findIndex((word) => word.id === target.id), scope: target.chapter };
  }
  const list = activeChapter === 'all' ? orderedWords(words) : wordsInChapter(words, activeChapter);
  return { list, start: 0, scope: activeChapter };
}
