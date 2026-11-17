export type WordDetails = {
  example: string;
  exampleKo: string;
  // 예문 해석에서 맥락 뜻에 해당하는 표현 (학습 화면에서 가려졌다가 누르면 보인다)
  exampleMeaning: string;
  // 예문에서 실제로 쓰인 표제어의 형태 (예: 표제어 study, 예문에서는 studied). 없으면 표제어로 찾는다.
  exampleForm?: string;
};

export type Word = {
  id: string;
  word: string;
  meanings: string[];
  // meanings와 같은 길이. synonyms[i]는 i번째 뜻의 동의어를 쉼표로 이은 문자열('' 허용)
  synonyms: string[];
  // 교사 엑셀에서 온 값. 옛 데이터에는 없다.
  number?: number;
  // meanings와 같은 길이. partsOfSpeech[i]는 i번째 뜻의 품사('' 허용)
  partsOfSpeech?: string[];
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
