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
import { WordCard } from '../../components/wordbook/WordCard';
import { searchWords } from '../../data/filter';
import { anyCardVisible, toggleAll, toggleCard, toggleField } from '../../data/mask';
import type { Word } from '../../data/types';
import { useWords } from '../../data/WordsContext';
import { colors, fonts, isNarrow } from '../../theme';

type ViewMode = 'card' | 'list';

function todayLabel(): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
}

export default function WordbookScreen() {
  const { ready, words, prefs, setPref, shown, setShown, deleteWord } = useWords();
  const { open } = useWordForm();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('card');
  const { width } = useWindowDimensions();
  const list = useMemo(() => searchWords(words, query, prefs.activeChapter), [words, query, prefs.activeChapter]);

  if (!ready) {
    return <MainScroll>{null}</MainScroll>;
  }

  const remove = async (word: Word) => {
    const result = await deleteWord(word.id);
    toast(result === 'saved' ? `‘${word.word}’ 단어를 삭제했어요` : NOT_PERSISTED_MESSAGE);
  };

  const narrow = isNarrow(width);
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

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/add')}
          style={(state) => [
            styles.actionCard,
            styles.actionPrimary,
            narrow && styles.actionCardNarrow,
            (state as PressableStateCallbackType & { hovered?: boolean }).hovered && styles.actionPrimaryHover,
          ]}
        >
          <View style={[styles.actionIcon, styles.actionIconPrimary, narrow && styles.actionIconNarrow]}>
            <AppText style={[styles.actionIconText, styles.onPrimary]}>＋</AppText>
          </View>
          <View style={styles.actionBody}>
            <AppText style={[styles.actionTitle, styles.onPrimary, narrow && styles.actionTitleNarrow]}>단어 추가</AppText>
            <AppText style={[styles.actionSub, styles.onPrimarySub, narrow && styles.actionSubNarrow]}>
              추가 방법 선택하기
            </AppText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/account')}
          style={[styles.actionCard, narrow && styles.actionCardNarrow]}
        >
          <View style={[styles.actionIcon, narrow && styles.actionIconNarrow]}>
            <Icon name="account" size={21} color={colors.accent} />
          </View>
          <View style={styles.actionBody}>
            <AppText style={[styles.actionTitle, narrow && styles.actionTitleNarrow]}>내 정보</AppText>
            <AppText style={[styles.actionSub, narrow && styles.actionSubNarrow]}>로그인 방식 선택하기</AppText>
          </View>
        </Pressable>
      </View>

      <MaskPanel
        prefs={prefs}
        anyVisible={anyCardVisible(prefs, shown, words)}
        onToggle={(key) => setPref(key, !prefs[key])}
        onRevealAll={() => setShown(toggleAll(prefs, shown, words))}
      />

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
        <View accessibilityLabel="보기 방식" style={styles.toggle}>
          {(['card', 'list'] as const).map((mode) => {
            const active = view === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={mode === 'card' ? '카드 보기' : '리스트 보기'}
                accessibilityState={{ selected: active }}
                onPress={() => setView(mode)}
                style={[styles.toggleButton, active && styles.toggleButtonActive]}
              >
                <Icon name={mode === 'card' ? 'viewCard' : 'viewList'} size={19} color={active ? colors.accent : '#99a1ad'} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {list.length > 0 ? (
        <View style={[styles.grid, view === 'list' && styles.gridList]}>
          {list.map((word, i) => (
            <WordCard
              key={word.id}
              word={word}
              number={i + 1}
              mode={view}
              prefs={prefs}
              shown={shown}
              onToggleField={(field) => setShown(toggleField(shown, word.id, field))}
              onToggleCard={() => setShown(toggleCard(prefs, shown, word))}
              onEdit={() => open(word.id)}
              onDelete={() => remove(word)}
            />
          ))}
        </View>
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
  actions: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.surface,
    boxShadow: '0 3px 14px rgba(25, 40, 64, 0.03)',
  },
  actionCardNarrow: { paddingVertical: 12, paddingHorizontal: 10, gap: 8 },
  actionPrimary: { borderColor: colors.accent, backgroundColor: colors.accent, boxShadow: 'none' },
  actionPrimaryHover: { backgroundColor: colors.accentDark },
  actionIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: 'rgba(23, 111, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconNarrow: { width: 33, height: 33 },
  actionIconPrimary: { backgroundColor: 'rgba(255, 255, 255, 0.17)' },
  actionIconText: { color: colors.accent, fontSize: 25, fontWeight: '300' },
  actionBody: { flex: 1, minWidth: 0 },
  actionTitle: { marginBottom: 4, fontSize: 15, fontWeight: '700' },
  actionTitleNarrow: { fontSize: 13 },
  actionSub: { color: colors.muted, fontSize: 11, lineHeight: 14.3 },
  actionSubNarrow: { fontSize: 10 },
  onPrimary: { color: '#fff' },
  onPrimarySub: { color: 'rgba(255, 255, 255, 0.76)' },
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
  toggle: { height: 48, padding: 4, flexDirection: 'row', borderRadius: 15, backgroundColor: '#ebe8e1' },
  toggleButton: { width: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleButtonActive: { backgroundColor: colors.surface, boxShadow: '0 2px 8px rgba(25, 40, 64, 0.1)' },
  grid: { gap: 11 },
  gridList: { gap: 8 },
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
