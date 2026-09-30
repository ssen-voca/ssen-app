import { anyCardVisible, cardVisible, hasMask, isMasked, toggleAll, toggleCard, toggleField } from './mask';
import { SAMPLE_WORDS } from './samples';
import type { ShownMap } from './types';

const allOn = { maskWord: true, maskMeaning: true, maskDetails: true };
const allOff = { maskWord: false, maskMeaning: false, maskDetails: false };
const [cultivate, resilient] = SAMPLE_WORDS;

describe('isMasked', () => {
  it('hides a field only while its switch is on and it has not been revealed', () => {
    expect(isMasked(allOn, {}, cultivate.id, 'meaning')).toBe(true);
    expect(isMasked(allOff, {}, cultivate.id, 'meaning')).toBe(false);
    const shown = toggleField({}, cultivate.id, 'meaning');
    expect(isMasked(allOn, shown, cultivate.id, 'meaning')).toBe(false);
  });

  it('ties the example word to the English-word switch', () => {
    expect(isMasked({ ...allOff, maskWord: true }, {}, cultivate.id, 'exampleWord')).toBe(true);
    expect(isMasked({ ...allOn, maskWord: false }, {}, cultivate.id, 'exampleWord')).toBe(false);
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

describe('cards', () => {
  it('reveals then re-hides every field of one card', () => {
    const revealed = toggleCard(allOn, {}, cultivate);
    expect(cardVisible(allOn, revealed, cultivate)).toBe(true);
    expect(isMasked(allOn, revealed, cultivate.id, 'details')).toBe(false);
    expect(cardVisible(allOn, toggleCard(allOn, revealed, cultivate), cultivate)).toBe(false);
  });

  it('ignores revealed fields whose switch is off', () => {
    const shown = toggleField({}, cultivate.id, 'details');
    expect(cardVisible({ ...allOff, maskWord: true }, shown, cultivate)).toBe(false);
  });

  it('toggleAll hides everything when any card is visible, otherwise reveals everything', () => {
    const words = [cultivate, resilient];
    const all = toggleAll(allOn, {}, words);
    expect(words.every((word) => cardVisible(allOn, all, word))).toBe(true);
    const oneVisible = toggleCard(allOn, {}, cultivate);
    expect(anyCardVisible(allOn, toggleAll(allOn, oneVisible, words), words)).toBe(false);
  });
});

describe('hasMask', () => {
  it('shows the reveal button only when something on the card can be hidden', () => {
    expect(hasMask(allOff, true)).toBe(false);
    expect(hasMask({ ...allOff, maskDetails: true }, false)).toBe(false);
    expect(hasMask({ ...allOff, maskDetails: true }, true)).toBe(true);
    expect(hasMask({ ...allOff, maskMeaning: true }, false)).toBe(true);
  });
});
