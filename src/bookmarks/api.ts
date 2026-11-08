import { request } from '../api/client';
import { session } from '../auth/session';
import type { Word } from '../data/types';
export const getCatalog = () => session.call(token => request<Word[]>('/api/me/words', { token }));
export const getBookmarks = () => session.call(token => request<string[]>('/api/me/bookmarks', { token }));
export const changeBookmark = (id: string, selected: boolean) => session.call(token => request<void>(selected ? '/api/me/bookmarks' : `/api/me/bookmarks/${encodeURIComponent(id)}`, { token, method: selected ? 'POST' : 'DELETE', ...(selected ? { body: { wordId: id } } : {}) }));
export const importLegacy = (words: Word[]) => session.call(token => request<void>('/api/me/words/import', { token, method: 'POST', body: words }));

export const savePrivateWord = (word: Word) => session.call(token => request<void>(`/api/me/words/${encodeURIComponent(word.id)}`, { token, method: 'PUT', body: word }));
export const deletePrivateWord = (id: string) => session.call(token => request<void>(`/api/me/words/${encodeURIComponent(id)}`, { token, method: 'DELETE' }));
