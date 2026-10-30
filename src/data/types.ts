export type WordDetails = {
  example: string;
  exampleKo: string;
  exampleMeaning: string;
};

export type Word = {
  id: string;
  word: string;
  meanings: string[];
  // meanings와 같은 길이. synonyms[i]는 i번째 뜻의 동의어를 쉼표로 이은 문자열('' 허용)
  synonyms: string[];
  chapter: string;
  details: WordDetails;
};

export type Prefs = {
  maskWord: boolean;
  maskMeaning: boolean;
  activeChapter: string;
};

export type MaskField = 'word' | 'meaning';

export type ShownMap = Record<string, Partial<Record<MaskField, boolean>>>;
