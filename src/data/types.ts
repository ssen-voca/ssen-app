export type WordDetails = {
  example: string;
  exampleKo: string;
  exampleMeaning: string;
  synonyms: string;
  antonyms: string;
  derived: string;
  related: string;
};

export type Word = {
  id: string;
  word: string;
  meanings: string[];
  definitions: string[];
  chapter: string;
  details: WordDetails;
};

export type Prefs = {
  maskWord: boolean;
  maskMeaning: boolean;
  maskDetails: boolean;
  activeChapter: string;
};

export type MaskField = 'word' | 'meaning' | 'details' | 'exampleWord';

export type ShownMap = Record<string, Partial<Record<MaskField, boolean>>>;
