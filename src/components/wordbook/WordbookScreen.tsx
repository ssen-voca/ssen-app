import { useBookmarks } from '../../bookmarks/BookmarksContext';
import { useAuth } from '../../auth/AuthContext';
import { useBookView } from '../../data/BookViewContext';
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
} from 'react-native';
import { AppText } from '../AppText';
import { MainScroll } from '../MainScroll';
import { useToast } from '../Toast';
import { MaskPanel } from '../wordbook/MaskPanel';
import { DayPicker } from '../wordbook/DayPicker';
import { DaySection } from '../wordbook/DaySection';
import { WordRow } from '../wordbook/WordRow';
import { searchWords } from '../../data/filter';
import { toggleField } from '../../data/mask';
import { dayOptions, effectiveChapter, groupByChapter } from '../../data/wordList';
import { useWords } from '../../data/WordsContext';
import { colors } from '../../theme';

export default function WordbookScreen({ mine = false }: { mine?: boolean }) {
  const local = useWords();
  const saved = useBookmarks(); const { user } = useAuth();
  const { home, my, update } = useBookView(); const view = mine ? my : home;
  const words = user ? saved.words : local.words;
  const source = mine ? words.filter(w => saved.ids.includes(w.id)) : words;
  const { ready } = local;
  const prefs = mine ? view.prefs : local.prefs;
  const shown = mine ? view.shown : local.shown;
  const setShown = (shown: typeof local.shown) => mine ? update(true, { shown }) : local.setShown(shown);
  const setPref: typeof local.setPref = (key, value) => mine ? update(true, { prefs: { ...prefs, [key]: value }, shown: {} }) : local.setPref(key, value);
  // 단어·뜻을 한꺼번에 보이게(켬) 또는 가리게(끔) 한다. MY VOCA는 두 값을 한 번에 바꿔야 앞의 변경이 사라지지 않는다.
  const toggleAllMasks = () => {
    const mask = !(prefs.maskWord || prefs.maskMeaning);
    if (mine) update(true, { prefs: { ...prefs, maskWord: mask, maskMeaning: mask }, shown: {} });
    else { local.setPref('maskWord', mask); local.setPref('maskMeaning', mask); }
  };
  const toast = useToast();
  const query = view.query; const setQuery = (query: string) => update(mine, { query });
  const { width } = useWindowDimensions();
  const chapter = mine ? view.chapter : effectiveChapter(words, prefs.activeChapter);
  const list = useMemo(() => searchWords(source, query, chapter), [source, query, chapter]);
  const groups = useMemo(() => groupByChapter(list), [list]);
  const dayPicker = (
    <DayPicker
      options={dayOptions(words)}
      value={chapter}
      onChange={(next) => {
        update(mine, { chapter: next, shown: {} });
        if (!mine) { local.setPref('activeChapter', next); local.setShown({}); }
      }}
    />
  );

  if (!ready || (user && saved.loading)) {
    return <MainScroll><AppText>단어장을 불러오는 중이에요…</AppText></MainScroll>;
  }

  const heroSize = Math.min(30, Math.max(24, width * 0.07));
  const searching = query.trim() !== '';

  return (
    <MainScroll>
      <View style={styles.hero}>
        <View style={styles.heroMain}>
          {mine ? (
            <>
              <AppText role="heading" style={[styles.heroTitle, { fontSize: heroSize, letterSpacing: -0.05 * heroSize }]}>
                나만의 단어장
              </AppText>
              <View style={styles.heroPicker}>{dayPicker}</View>
            </>
          ) : dayPicker}
        </View>
      </View>

      {saved.loading && <AppText>단어장을 불러오는 중이에요…</AppText>}
      {!!saved.error && <Pressable accessibilityRole="button" onPress={saved.reload}><AppText>{saved.error} · 다시 시도</AppText></Pressable>}
      {user && !mine && <Pressable accessibilityRole="button" onPress={() => saved.migrate().then(() => toast('기존 기기의 단어를 가져왔어요')).catch(e => toast(e.message))}><AppText style={{ color: colors.accent }}>이 기기의 기존 단어 가져오기</AppText></Pressable>}
      <MaskPanel prefs={prefs} onToggle={key => setPref(key, !prefs[key])} onToggleAll={toggleAllMasks} />

      {groups.length > 0 ? (
        groups.map((group) => (
          <DaySection key={group.chapter} chapter={group.chapter} count={group.words.length}>
            {group.words.map((word) => (
              <WordRow
                key={word.id}
                word={word}
                prefs={prefs}
                shown={shown}
                onToggleField={(field) => setShown(toggleField(shown, word.id, field))}
                onOpen={() => router.navigate({ pathname: '/study', params: { word: word.id } })}
                bookmarked={saved.ids.includes(word.id)}
                pending={saved.pending.has(word.id)}
                onBookmark={() => saved.toggle(word.id).catch(e => toast(e.message))}
              />
            ))}
          </DaySection>
        ))
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <AppText style={styles.emptyIconText}>Aa</AppText>
          </View>
          <AppText role="heading" style={styles.emptyTitle}>
            {searching ? '검색 결과가 없어요.' : mine ? (source.length === 0 ? '아직 저장한 단어가 없어요.' : '이 Week에 저장한 단어가 없어요.') : '단어장에 단어가 없어요'}
          </AppText>
          <AppText style={styles.emptyText}>
            {searching ? '다른 단어나 뜻으로 검색해 보세요.' : mine ? '홈에서 북마크를 눌러 나만의 단어장을 만들어 보세요.' : '직접 입력하거나 사진·엑셀 파일을 불러와 보세요.'}
          </AppText>
          {!searching && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate(mine ? '/' : '/add')}
              style={(state) => [
                styles.emptyButton,
                (state as PressableStateCallbackType & { hovered?: boolean }).hovered && styles.emptyButtonHover,
              ]}
            >
              <AppText style={styles.emptyButtonText}>{mine ? '홈으로 이동' : '첫 단어 추가하기'}</AppText>
            </Pressable>
          )}
        </View>
      )}
    </MainScroll>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 22,
    paddingHorizontal: 2,
    paddingBottom: 18,
  },
  heroMain: { flex: 1, minWidth: 0, zIndex: 20 },
  heroPicker: { marginTop: 12 },
  heroTitle: { fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { color: colors.accent, fontWeight: '800' },
  emptyTitle: { marginBottom: 8, fontSize: 18, fontWeight: '700' },
  emptyText: { marginBottom: 20, color: colors.muted, fontSize: 14, textAlign: 'center' },
  emptyButton: {
    minHeight: 47,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonHover: { backgroundColor: colors.accentDark },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
