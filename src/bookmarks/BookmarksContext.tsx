import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { loadWords } from '../data/storage';
import { useWords } from '../data/WordsContext';
import type { Word } from '../data/types';
import * as api from './api';

type State = { owner: number | null; words: Word[]; ids: string[]; loading: boolean; error: string };
const empty: State = { owner: null, words: [], ids: [], loading: false, error: '' };
const Context = createContext<{ words: Word[]; ids: string[]; loading: boolean; error: string; pending: Set<string>; reload: () => void; migrate: () => Promise<void>; toggle: (id: string) => Promise<void> }>(null!);
export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const { words: catalog, setCatalog } = useWords();
  const [state, setState] = useState(empty);
  const [revision, revise] = useState(0);
  const [pending, setPending] = useState(new Set<string>());
  const locks = useRef(new Set<string>());
  const owner = status === 'authenticated' ? user!.id : null;
  const current = useRef(owner); current.current = owner;
  useEffect(() => {
    let active = true;
    locks.current = new Set(); setPending(new Set());
    setState({ ...empty, owner, loading: owner !== null });
    if (owner !== null) Promise.all([api.getCatalog(), api.getBookmarks()]).then(([words, ids]) => {
      if (active) { setState({ owner, words, ids, loading: false, error: '' }); setCatalog(words); }
    }).catch(error => { if (active) setState({ ...empty, owner, error: error.message }); });
    return () => { active = false; };
  }, [owner, revision]);
  const visible = state.owner === owner ? state : empty;
  const toggle = async (id: string) => {
    if (owner === null) throw new Error('로그인 후 저장할 수 있어요.');
    if (visible.loading || visible.error) throw new Error('단어장을 먼저 다시 불러와 주세요.');
    if (locks.current.has(id)) return;
    const lockSet = locks.current;
    lockSet.add(id); setPending(new Set(lockSet));
    const selected = !visible.ids.includes(id);
    setState(s => ({ ...s, ids: selected ? [...s.ids, id] : s.ids.filter(x => x !== id) }));
    try { await api.changeBookmark(id, selected); }
    catch (error) {
      if (current.current === owner && locks.current === lockSet) setState(s => ({ ...s, ids: selected ? s.ids.filter(x => x !== id) : [...s.ids, id] }));
      throw error;
    } finally {
      lockSet.delete(id); if (locks.current === lockSet) setPending(new Set(lockSet));
    }
  };
  const migrate = async () => { await api.importLegacy((await loadWords()).words); if (current.current === owner) revise(x => x + 1); };
  return <Context.Provider value={{ ...visible, words: owner === null ? [] : catalog, pending, toggle, migrate, reload: () => revise(x => x + 1) }}>{children}</Context.Provider>;
}
export const useBookmarks = () => useContext(Context);
