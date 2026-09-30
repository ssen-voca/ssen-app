import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, loadPrefs, loadWords, savePrefs, saveWords } from './storage';
import type { Prefs, ShownMap, Word } from './types';
import { removeWord, upsertWord } from './wordList';

export type SaveResult = 'saved' | 'not-persisted';

type WordsContextValue = {
  ready: boolean;
  words: Word[];
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  shown: ShownMap;
  setShown: (next: ShownMap) => void;
  saveWord: (word: Word) => Promise<SaveResult>;
  deleteWord: (id: string) => Promise<SaveResult>;
};

const WordsContext = createContext<WordsContextValue | null>(null);

export function WordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [shown, setShown] = useState<ShownMap>({});
  const wordsRef = useRef<Word[]>([]);
  const persistRef = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadWords(), loadPrefs()]).then(([loaded, loadedPrefs]) => {
      if (!active) return;
      wordsRef.current = loaded.words;
      persistRef.current = loaded.persist;
      setWords(loaded.words);
      setPrefs(loadedPrefs);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready) void savePrefs(prefs);
  }, [ready, prefs]);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    if (key !== 'activeChapter') setShown({});
  }, []);

  const commit = useCallback(async (next: Word[]): Promise<SaveResult> => {
    wordsRef.current = next;
    setWords(next);
    if (!persistRef.current) return 'not-persisted';
    return (await saveWords(next)) ? 'saved' : 'not-persisted';
  }, []);

  const saveWord = useCallback((word: Word) => commit(upsertWord(wordsRef.current, word)), [commit]);

  const deleteWord = useCallback(
    (id: string) => {
      setShown((current) => {
        const { [id]: _removed, ...rest } = current;
        return rest;
      });
      return commit(removeWord(wordsRef.current, id));
    },
    [commit],
  );

  const value = useMemo(
    () => ({ ready, words, prefs, setPref, shown, setShown, saveWord, deleteWord }),
    [ready, words, prefs, setPref, shown, saveWord, deleteWord],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWords(): WordsContextValue {
  const value = useContext(WordsContext);
  if (!value) throw new Error('useWords must be used inside WordsProvider');
  return value;
}
