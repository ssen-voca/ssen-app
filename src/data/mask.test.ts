import { anyCardVisible, cardVisible, isMasked, toggleAll, toggleField } from './mask';
import { SAMPLE_WORDS } from './samples';
import type { ShownMap } from './types';

const allOn = { maskWord: true, maskMeaning: true };
const allOff = { maskWord: false, maskMeaning: false };
const [cultivate, resilient] = SAMPLE_WORDS;

describe('isMasked', () => {
  it('hides a field only while its switch is on and it has not been revealed', () => {
    expect(isMasked(allOn, {}, cultivate.id, 'meaning')).toBe(true);
    expect(isMasked(allOff, {}, cultivate.id, 'meaning')).toBe(false);
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(isMasked(allOn, shown, cultivate.id, 'meaning')).toBe(false);
  });
});

describe('toggleField', () => {
  it('flips one field without touching the input map', () => {
    const before: ShownMap = {};
    const once = toggleField(before, cultivate.id, 'word');
    expect(once[cultivate.id]?.word).toBe(true);
    expect(toggleField(once, cultivate.id, 'word')[cultivate.id]?.word).toBe(false);
    expect(before).toEqual({});
  });
});

describe('rows', () => {
  it('counts a row as visible once one of its switched-on fields is revealed', () => {
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(cardVisible(allOn, shown, cultivate)).toBe(true);
    expect(cardVisible(allOn, {}, cultivate)).toBe(false);
  });

  it('ignores revealed fields whose switch is off', () => {
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(cardVisible({ ...allOff, maskWord: true }, shown, cultivate)).toBe(false);
  });

  it('toggleAll reveals everything when nothing is visible, otherwise hides everything', () => {
    const words = [cultivate, resilient];
    const revealed = toggleAll(allOn, {}, words);
    expect(words.every((word) => cardVisible(allOn, revealed, word))).toBe(true);
    expect(anyCardVisible(allOn, toggleAll(allOn, revealed, words), words)).toBe(false);
  });
});
