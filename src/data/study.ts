export type StudyPanel = 'definition' | 'example';

export type StudyState = { index: number; revealed: boolean; selected: number; panel: StudyPanel };

export type StudyAction =
  | { type: 'move'; step: number; length: number }
  | { type: 'toggleCard' }
  | { type: 'selectMeaning'; meaning: number }
  | { type: 'togglePanel' }
  | { type: 'setPanel'; panel: StudyPanel };

export const initialStudy: StudyState = { index: 0, revealed: false, selected: -1, panel: 'definition' };

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case 'move': {
      if (action.length <= 0) return state;
      const current = state.index >= action.length ? 0 : state.index;
      return { ...initialStudy, index: (current + action.step + action.length) % action.length };
    }
    case 'toggleCard':
      return state.revealed
        ? { ...state, revealed: false, selected: -1, panel: 'definition' }
        : { ...state, revealed: true };
    case 'selectMeaning':
      return { ...state, selected: state.selected === action.meaning ? -1 : action.meaning, panel: 'definition' };
    case 'togglePanel':
      return { ...state, panel: state.panel === 'definition' ? 'example' : 'definition' };
    case 'setPanel':
      return { ...state, panel: action.panel };
  }
}

export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) return dx < 0 ? 1 : -1;
  return 0;
}

export function registerTap(lastTap: number, now: number): { toggle: boolean; lastTap: number } {
  return now - lastTap < 360 ? { toggle: true, lastTap: 0 } : { toggle: false, lastTap: now };
}

export function isKeyboardPress(event: unknown): boolean {
  if (!event || typeof event !== 'object') return false;
  const e = event as { type?: unknown; nativeEvent?: { type?: unknown } };
  return [e.type, e.nativeEvent?.type].some((type) => type === 'keyup' || type === 'keydown');
}

type WheelInput = { deltaY: number; revealed: boolean; length: number; now: number; lastWheel: number };

export function wheelStep({ deltaY, revealed, length, now, lastWheel }: WheelInput): {
  consume: boolean;
  step: -1 | 0 | 1;
  lastWheel: number;
} {
  if (revealed || length < 2 || Math.abs(deltaY) < 15) return { consume: false, step: 0, lastWheel };
  if (now - lastWheel < 450) return { consume: true, step: 0, lastWheel };
  return { consume: true, step: deltaY > 0 ? 1 : -1, lastWheel: now };
}

export function splitChips(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((chip) => chip.trim())
    .filter(Boolean);
}
