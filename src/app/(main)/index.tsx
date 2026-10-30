import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { Icon } from '../../components/Icon';
import { MainScroll } from '../../components/MainScroll';
import { useToast } from '../../components/Toast';
import { NOT_PERSISTED_MESSAGE, useWordForm } from '../../components/WordFormSheet';
import { MaskPanel } from '../../components/wordbook/MaskPanel';
import { DayPicker } from '../../components/wordbook/DayPicker';
import { DaySection } from '../../components/wordbook/DaySection';
import { WordRow } from '../../components/wordbook/WordRow';
import { searchWords, wordsInChapter } from '../../data/filter';
import { anyCardVisible, toggleAll, toggleField } from '../../data/mask';
import type { Word } from '../../data/types';
import { effectiveChapter, groupByChapter } from '../../data/wordList';
import { useWords } from '../../data/WordsContext';
import { colors, fonts } from '../../theme';

function todayLabel(): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
}

export default function WordbookScreen() {
  const { ready, words, prefs, setPref, shown, setShown, deleteWord } = useWords();
  const { open } = useWordForm();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const chapter = effectiveChapter(words, prefs.activeChapter);
  const dayWords = useMemo(() => wordsInChapter(words, chapter), [words, chapter]);
  const dayOptions = useMemo(
    () => [
      { value: 'all', label: '전체 Day', count: words.length },
      ...groupByChapter(words).map((group) => ({ value: group.chapter, label: group.chapter, count: group.words.length })),
    ],
    [words],
  );
  const list = useMemo(() => searchWords(words, query, chapter), [words, query, chapter]);
  const groups = useMemo(() => groupByChapter(list), [list]);

  if (!ready) {
    return <MainScroll>{null}</MainScroll>;
  }

  const remove = async (word: Word) => {
    const result = await deleteWord(word.id);
    toast(result === 'saved' ? `‘${word.word}’ 단어를 삭제했어요` : NOT_PERSISTED_MESSAGE);
  };

  const heroSize = Math.min(30, Math.max(24, width * 0.07));
  const searching = query.trim() !== '';

  return (
    <MainScroll>
      <View style={styles.hero}>
        <View>
          <AppText style={styles.date}>{todayLabel()}</AppText>
          <AppText role="heading" style={[styles.heroTitle, { fontSize: heroSize, letterSpacing: -0.05 * heroSize }]}>
            오늘도 한 단어씩
          </AppText>
        </View>
        <View style={styles.countBadge}>
          <AppText style={styles.countValue}>{words.length}</AppText>
          <AppText style={styles.countLabel}>단어</AppText>
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.navigate('/study')} style={styles.launch}>
        <View style={styles.launchIcon}>
          <AppText style={styles.launchIconText}>▤</AppText>
        </View>
        <View style={styles.launchBody}>
          <AppText style={styles.launchTitle}>오늘의 단어 학습</AppText>
          <AppText style={styles.launchSub}>한 단어씩 넘기며 뜻과 예문 익히기</AppText>
        </View>
        <AppText aria-hidden style={styles.launchArrow}>
          →
        </AppText>
      </Pressable>

      <MaskPanel
        prefs={prefs}
        anyVisible={anyCardVisible(prefs, shown, dayWords)}
        onToggle={(key) => setPref(key, !prefs[key])}
        onRevealAll={() => setShown(toggleAll(prefs, shown, dayWords))}
      >
        <DayPicker
          options={dayOptions}
          value={chapter}
          onChange={(value) => {
            if (value === chapter) return;
            setShown({});
            setPref('activeChapter', value);
          }}
        />
      </MaskPanel>

      <View style={styles.tools}>
        <View style={styles.search}>
          <Icon name="search" size={19} color="#9aa3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="단어 또는 뜻 검색"
            placeholderTextColor={colors.muted}
            accessibilityLabel="단어 또는 뜻 검색"
            autoComplete="off"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
      </View>

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
                onEdit={() => open(word.id)}
                onDelete={() => remove(word)}
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
            {searching ? '검색 결과가 없어요' : '이 챕터에는 단어가 없어요'}
          </AppText>
          <AppText style={styles.emptyText}>
            {searching ? '다른 단어나 뜻으로 검색해 보세요.' : '직접 입력하거나 사진·엑셀 파일을 불러와 보세요.'}
          </AppText>
          {!searching && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/add')}
              style={(state) => [
                styles.emptyButton,
                (state as PressableStateCallbackType & { hovered?: boolean }).hovered && styles.emptyButtonHover,
              ]}
            >
              <AppText style={styles.emptyButtonText}>첫 단어 추가하기</AppText>
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
    alignItems: 'flex-end',
    paddingTop: 22,
    paddingHorizontal: 2,
    paddingBottom: 18,
  },
  date: { marginBottom: 7, color: colors.muted, fontSize: 13, fontWeight: '600' },
  heroTitle: { fontWeight: '700' },
  countBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countValue: { color: colors.accent, fontSize: 21, lineHeight: 21, fontWeight: '700' },
  countLabel: { marginTop: 5, color: colors.muted, fontSize: 11 },
  launch: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 13,
    padding: 13,
    borderWidth: 1,
    borderColor: '#d8e7df',
    borderRadius: 18,
    backgroundColor: '#eaf3ee',
  },
  launchIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchIconText: { color: '#fff' },
  launchBody: { flex: 1 },
  launchTitle: { fontSize: 14, fontWeight: '700' },
  launchSub: { marginTop: 3, color: '#71827a', fontSize: 11 },
  launchArrow: { color: colors.accent, fontSize: 22 },
  tools: { flexDirection: 'row', gap: 9, marginTop: 18, marginBottom: 12 },
  search: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: fonts.body, color: colors.text },
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
