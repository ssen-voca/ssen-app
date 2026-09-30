import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, loadPrefs, loadWords, savePrefs } from './storage';
import type { Prefs, ShownMap, Word } from './types';

type WordsContextValue = {
  ready: boolean;
  words: Word[];
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  shown: ShownMap;
  setShown: (next: ShownMap) => void;
};

const WordsContext = createContext<WordsContextValue | null>(null);

export function WordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [shown, setShown] = useState<ShownMap>({});

  useEffect(() => {
    let active = true;
    Promise.all([loadWords(), loadPrefs()]).then(([loadedWords, loadedPrefs]) => {
      if (!active) return;
      setWords(loadedWords);
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

  const value = useMemo(
    () => ({ ready, words, prefs, setPref, shown, setShown }),
    [ready, words, prefs, setPref, shown],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWords(): WordsContextValue {
  const value = useContext(WordsContext);
  if (!value) throw new Error('useWords must be used inside WordsProvider');
  return value;
}
