import { useAuth } from '../auth/AuthContext';
import { getCatalog, savePrivateWord, deletePrivateWord } from '../bookmarks/api';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, loadPrefs, loadWords, savePrefs, saveWords } from './storage';
import type { Prefs, ShownMap, Word } from './types';
import { effectiveChapter, removeWord, upsertWord } from './wordList';

export type SaveResult = 'saved' | 'not-persisted';

type WordsContextValue = {
  setCatalog: (words: Word[]) => void;
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
  const { user, status } = useAuth();
  const owner = status === 'authenticated' ? user!.id : null;
  const [remote, setRemote] = useState<{ owner: number; words: Word[] } | null>(null);
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

  // 저장된 Week에 단어가 하나도 남지 않으면 전체로 되돌린다(학습·상단 칩·폼이 모두 같은 값을 본다).
  useEffect(() => {
    if (owner === null && ready && effectiveChapter(words, prefs.activeChapter) !== prefs.activeChapter) {
      setPrefs((current) => ({ ...current, activeChapter: 'all' }));
      setShown({});
    }
  }, [ready, words, prefs.activeChapter, owner]);

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

  const saveWord = useCallback(async (word: Word): Promise<SaveResult> => {
    if (owner === null) return commit(upsertWord(wordsRef.current, word));
    await savePrivateWord(word);
    const words = await getCatalog();
    setRemote({ owner, words });
    return 'saved';
  }, [commit, owner]);

  const deleteWord = useCallback(
    async (id: string): Promise<SaveResult> => {
      if (owner !== null) {
        await deletePrivateWord(id);
        setRemote({ owner, words: await getCatalog() });
        return 'saved';
      }
      setShown((current) => {
        const { [id]: _removed, ...rest } = current;
        return rest;
      });
      return commit(removeWord(wordsRef.current, id));
    },
    [commit, owner],
  );

  const value = useMemo(
    () => ({ setCatalog: (catalog: Word[]) => { if (owner !== null) setRemote({ owner, words: catalog }); }, ready, words: owner === null ? words : remote?.owner === owner ? remote.words : [], prefs, setPref, shown, setShown, saveWord, deleteWord }),
    [ready, words, prefs, setPref, shown, saveWord, deleteWord, owner, remote],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWords(): WordsContextValue {
  const value = useContext(WordsContext);
  if (!value) throw new Error('useWords must be used inside WordsProvider');
  return value;
}
