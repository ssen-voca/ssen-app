import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCAL_BOOKMARKS_KEY = 'pocket-vocab-bookmarks-v1';

/** 로그인하지 않았을 때 이 기기에 저장해 둔 북마크(별) 단어 id 목록. 깨졌거나 없으면 빈 목록. */
export async function loadLocalBookmarks(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_BOOKMARKS_KEY);
    const value: unknown = raw == null ? [] : JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
  } catch {
    return [];
  }
}

export async function saveLocalBookmarks(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(ids));
  } catch {
    // 저장이 막힌 브라우저에서도 이번 화면에서는 계속 쓸 수 있게 둔다.
  }
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
