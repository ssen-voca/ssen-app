import {
  initialStudy,
  isKeyboardPress,
  registerTap,
  splitChips,
  studyReducer,
  swipeDirection,
  wheelStep,
  type StudyState,
} from './study';

describe('studyReducer', () => {
  it('moves forward and backward with wrap-around, resetting the card', () => {
    const open: StudyState = { index: 2, revealed: true, selected: 1, panel: 'example' };
    expect(studyReducer(open, { type: 'move', step: 1, length: 3 })).toEqual({ ...initialStudy, index: 0 });
    expect(studyReducer(initialStudy, { type: 'move', step: -1, length: 3 })).toEqual({ ...initialStudy, index: 2 });
  });

  it('treats an index past the end as the first card and ignores empty lists', () => {
    const stale: StudyState = { ...initialStudy, index: 5 };
    expect(studyReducer(stale, { type: 'move', step: 1, length: 2 }).index).toBe(1);
    expect(studyReducer(stale, { type: 'move', step: 1, length: 0 })).toBe(stale);
  });

  it('reveals the card, then collapses it and clears the selection', () => {
    const revealed = studyReducer(initialStudy, { type: 'toggleCard' });
    expect(revealed.revealed).toBe(true);
    const picked = studyReducer(revealed, { type: 'selectMeaning', meaning: 1 });
    const example = studyReducer(picked, { type: 'togglePanel' });
    expect(studyReducer(example, { type: 'toggleCard' })).toEqual(initialStudy);
  });

  it('selecting the same meaning twice closes it, and a new selection starts on definitions', () => {
    const picked = studyReducer({ ...initialStudy, revealed: true, panel: 'example' }, { type: 'selectMeaning', meaning: 0 });
    expect(picked).toMatchObject({ selected: 0, panel: 'definition' });
    expect(studyReducer(picked, { type: 'selectMeaning', meaning: 0 }).selected).toBe(-1);
  });

  it('switches panels explicitly and by toggle', () => {
    expect(studyReducer(initialStudy, { type: 'setPanel', panel: 'example' }).panel).toBe('example');
    expect(studyReducer({ ...initialStudy, panel: 'example' }, { type: 'togglePanel' }).panel).toBe('definition');
  });
});

describe('swipeDirection', () => {
  it('needs a clearly horizontal drag longer than 55px', () => {
    expect(swipeDirection(-60, 0)).toBe(1);
    expect(swipeDirection(60, 10)).toBe(-1);
    expect(swipeDirection(-50, 0)).toBe(0);
    expect(swipeDirection(-60, 50)).toBe(0);
    expect(swipeDirection(-100, 30)).toBe(1);
  });
});

describe('registerTap', () => {
  const t0 = 1_700_000_000_000;

  it('toggles on a second tap within 360ms and needs two fresh taps afterwards', () => {
    const first = registerTap(0, t0);
    expect(first.toggle).toBe(false);
    const second = registerTap(first.lastTap, t0 + 200);
    expect(second.toggle).toBe(true);
    expect(registerTap(second.lastTap, t0 + 300).toggle).toBe(false);
  });

  it('ignores taps that are too far apart', () => {
    expect(registerTap(t0, t0 + 400).toggle).toBe(false);
  });
});

describe('isKeyboardPress', () => {
  it('recognises keyboard activation from the raw DOM event or its nativeEvent', () => {
    expect(isKeyboardPress({ type: 'keyup' })).toBe(true);
    expect(isKeyboardPress({ nativeEvent: { type: 'keydown' } })).toBe(true);
    expect(isKeyboardPress({ type: 'click', nativeEvent: { type: 'pointerup' } })).toBe(false);
    expect(isKeyboardPress({ type: 'click', detail: 0 })).toBe(true);
    expect(isKeyboardPress({ nativeEvent: { type: 'click', detail: 0 } })).toBe(true);
    expect(isKeyboardPress({ type: 'click', detail: 1 })).toBe(false);
    expect(isKeyboardPress({ type: 'click' })).toBe(false);
    expect(isKeyboardPress(undefined)).toBe(false);
  });
});

describe('wheelStep', () => {
  const base = { deltaY: 40, revealed: false, length: 3, now: 10_000, lastWheel: 0 };

  it('moves one word per wheel gesture and throttles for 450ms', () => {
    const first = wheelStep(base);
    expect(first).toEqual({ consume: true, step: 1, lastWheel: 10_000 });
    expect(wheelStep({ ...base, now: 10_200, lastWheel: first.lastWheel })).toEqual({
      consume: true,
      step: 0,
      lastWheel: 10_000,
    });
    expect(wheelStep({ ...base, deltaY: -40, now: 10_500, lastWheel: first.lastWheel }).step).toBe(-1);
  });

  it('leaves the wheel alone while the card is open, the list is short, or the scroll is tiny', () => {
    expect(wheelStep({ ...base, revealed: true }).consume).toBe(false);
    expect(wheelStep({ ...base, length: 1 }).consume).toBe(false);
    expect(wheelStep({ ...base, deltaY: 10 }).consume).toBe(false);
  });
});

describe('splitChips', () => {
  it('splits on commas and semicolons and drops blanks', () => {
    expect(splitChips('nurture, develop;; foster ')).toEqual(['nurture', 'develop', 'foster']);
    expect(splitChips('')).toEqual([]);
  });
});
