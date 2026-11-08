import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DEFAULT_PREFS } from './storage';
import type { Prefs, ShownMap } from './types';
export type BookView = { chapter: string; query: string; searchOpen: boolean; prefs: Prefs; shown: ShownMap };
const initial = (): BookView => ({ chapter: 'all', query: '', searchOpen: false, prefs: { ...DEFAULT_PREFS }, shown: {} });
const Context = createContext<{ home: BookView; my: BookView; update: (my: boolean, patch: Partial<BookView>) => void }>(null!);
export function BookViewProvider({ children }: { children: ReactNode }) {
 const { user } = useAuth();
 const [home, setHome] = useState(initial); const [my, setMy] = useState(initial);
 useEffect(() => { setHome(initial()); setMy(initial()); }, [user?.id]);
 return <Context.Provider value={{ home, my, update: (mine, patch) => (mine ? setMy : setHome)(s => ({ ...s, ...patch })) }}>{children}</Context.Provider>;
}
export const useBookView = () => useContext(Context);
