import type { MaskField, Prefs, ShownMap, Word } from './types';

type MaskPrefs = Pick<Prefs, 'maskWord' | 'maskMeaning'>;

const PREF_FOR_FIELD: Record<MaskField, keyof MaskPrefs> = {
  word: 'maskWord',
  meaning: 'maskMeaning',
};

const ALL_FIELDS: MaskField[] = ['word', 'meaning'];

export function isShown(shown: ShownMap, id: string, field: MaskField): boolean {
  return shown[id]?.[field] === true;
}

export function isMasked(prefs: MaskPrefs, shown: ShownMap, id: string, field: MaskField): boolean {
  return prefs[PREF_FOR_FIELD[field]] && !isShown(shown, id, field);
}

function setField(shown: ShownMap, id: string, field: MaskField, value: boolean): ShownMap {
  return { ...shown, [id]: { ...shown[id], [field]: value } };
}

export function toggleField(shown: ShownMap, id: string, field: MaskField): ShownMap {
  return setField(shown, id, field, !isShown(shown, id, field));
}

export function cardVisible(prefs: MaskPrefs, shown: ShownMap, word: Word): boolean {
  return (
    (prefs.maskWord && isShown(shown, word.id, 'word')) || (prefs.maskMeaning && isShown(shown, word.id, 'meaning'))
  );
}

function setCard(shown: ShownMap, id: string, value: boolean): ShownMap {
  return ALL_FIELDS.reduce((acc, field) => setField(acc, id, field, value), shown);
}

export function anyCardVisible(prefs: MaskPrefs, shown: ShownMap, words: Word[]): boolean {
  return words.some((word) => cardVisible(prefs, shown, word));
}

export function toggleAll(prefs: MaskPrefs, shown: ShownMap, words: Word[]): ShownMap {
  const reveal = !anyCardVisible(prefs, shown, words);
  return words.reduce((acc, word) => setCard(acc, word.id, reveal), shown);
}
