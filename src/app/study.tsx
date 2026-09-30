import { router } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { DetailPanel } from '../components/study/DetailPanel';
import { wordsInChapter } from '../data/filter';
import { initialStudy, isKeyboardPress, registerTap, studyReducer, swipeDirection, wheelStep } from '../data/study';
import { useWords } from '../data/WordsContext';
import { colors, fonts, isFramed, isNarrow } from '../theme';

const MOVE_HINT = '⇆  스크롤 · 좌우 밀기로 다음 단어';

function StudyEmpty() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppText style={styles.emptyIconText}>▤</AppText>
      </View>
      <AppText role="heading" style={styles.emptyTitle}>
        아직 학습할 단어가 없어요
      </AppText>
      <AppText style={styles.emptyText}>단어를 추가하면 이곳에서 한 장씩 공부할 수 있어요.</AppText>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/add')} style={styles.emptyButton}>
        <AppText style={styles.emptyButtonText}>단어 추가하기</AppText>
      </Pressable>
    </View>
  );
}

export default function StudyScreen() {
  const { ready, words, prefs } = useWords();
  const list = useMemo(() => wordsInChapter(words, prefs.activeChapter), [words, prefs.activeChapter]);
  const total = list.length;
  const [state, dispatch] = useReducer(studyReducer, initialStudy);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const wheelRef = useRef<View>(null);
  const lastTap = useRef(0);
  const lastWheel = useRef(0);

  const move = useCallback(
    (step: number) => {
      dispatch({ type: 'move', step, length: total });
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [total],
  );

  const contentPan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          const step = swipeDirection(event.translationX, event.translationY);
          if (step !== 0) move(step);
        }),
    [move],
  );

  const panelPan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .blocksExternalGesture(contentPan)
        .onEnd((event) => {
          const step = swipeDirection(event.translationX, event.translationY);
          if (step !== 0) dispatch({ type: 'setPanel', panel: step > 0 ? 'example' : 'definition' });
        }),
    [contentPan],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = wheelRef.current as unknown as HTMLElement | null;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      const result = wheelStep({
        deltaY: event.deltaY,
        revealed: state.revealed,
        length: total,
        now: Date.now(),
        lastWheel: lastWheel.current,
      });
      if (!result.consume) return;
      event.preventDefault();
      lastWheel.current = result.lastWheel;
      if (result.step !== 0) move(result.step);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [move, ready, state.revealed, total]);

  const onCardPress = (event: GestureResponderEvent) => {
    if (isKeyboardPress(event)) {
      dispatch({ type: 'toggleCard' });
      return;
    }
    const tap = registerTap(lastTap.current, Date.now());
    lastTap.current = tap.lastTap;
    if (tap.toggle) dispatch({ type: 'toggleCard' });
  };

  if (!ready) {
    return <View style={styles.screen} />;
  }

  const index = state.index >= total ? 0 : state.index;
  const word = list[index];
  const pad = width >= 621 ? 24 : 20;
  const narrow = isNarrow(width);
  const cardHeight = isFramed(width) ? 376 : Math.min(height * 0.43, 376);
  const wordSize = state.revealed
    ? Math.min(40, Math.max(32, width * 0.09))
    : Math.min(43, Math.max(34, width * 0.1));
  const wordStyle = { fontSize: wordSize, lineHeight: wordSize * 1.12, letterSpacing: -0.025 * wordSize };
  const hint =
    total === 0
      ? ''
      : !state.revealed
        ? '↖  단어를 두 번 눌러 뜻 보기'
        : state.selected >= 0
          ? '↖  정보 박스를 왼쪽으로 밀어 예문 보기'
          : '↖  뜻 카드를 눌러 자세히 보기';

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: 16 + insets.top, paddingHorizontal: pad }}>
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="단어장으로 돌아가기"
            onPress={() => router.navigate('/')}
            style={styles.back}
          >
            <AppText style={styles.backText}>←</AppText>
          </Pressable>
          <Pressable disabled accessibilityRole="button" accessibilityLabel="학습 챕터 선택 (준비 중)" style={styles.chapter}>
            <View style={styles.bookIcon}>
              <AppText style={styles.bookIconText}>▤</AppText>
            </View>
            <AppText numberOfLines={1} style={styles.chapterText}>
              {prefs.activeChapter === 'all' ? 'Daily vocabulary' : prefs.activeChapter}
            </AppText>
          </Pressable>
          <AppText style={styles.count}>{total ? `${index + 1} / ${total}` : '0 / 0'}</AppText>
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${total ? ((index + 1) / total) * 100 : 0}%` }]} />
        </View>
      </View>

      <GestureDetector gesture={contentPan} touchAction="pan-y">
        <View style={styles.contentArea}>
          <View ref={wheelRef} style={styles.contentArea}>
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[styles.content, { paddingHorizontal: pad }, !state.revealed && styles.contentFill]}
            >
              {!word ? (
                <StudyEmpty />
              ) : !state.revealed ? (
                <View style={styles.defaultView}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${word.word} — 두 번 눌러 뜻 보기`}
                    onPress={onCardPress}
                    style={[styles.card, styles.cardDefault, { height: cardHeight }]}
                  >
                    <AppText style={[styles.cardWord, wordStyle]}>{word.word}</AppText>
                  </Pressable>
                  <AppText style={styles.recall}>뜻을 떠올린 뒤 단어를 두 번 눌러보세요</AppText>
                </View>
              ) : (
                <View style={styles.expanded}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${word.word} — 두 번 눌러 단어만 보기`}
                    onPress={onCardPress}
                    style={[styles.card, styles.cardRevealed]}
                  >
                    <AppText style={[styles.cardWord, wordStyle]}>{word.word}</AppText>
                    <AppText style={styles.cardMeta}>WORD · {word.chapter}</AppText>
                  </Pressable>
                  <View style={styles.meaningHeading}>
                    <AppText style={styles.meaningHeadingTitle}>뜻을 선택하세요</AppText>
                    <AppText style={styles.meaningHeadingCount}>{word.meanings.length}개의 뜻</AppText>
                  </View>
                  <View style={styles.meanings}>
                    {word.meanings.map((meaning, i) => {
                      const selected = i === state.selected;
                      return (
                        <Fragment key={i}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded: selected }}
                            onPress={() => dispatch({ type: 'selectMeaning', meaning: i })}
                            style={styles.meaning}
                          >
                            <View style={styles.number}>
                              <AppText style={styles.numberText}>{i + 1}</AppText>
                            </View>
                            <AppText style={styles.meaningText}>{meaning}</AppText>
                            <AppText style={[styles.chevron, selected && styles.chevronOn]}>{selected ? '⌄' : '›'}</AppText>
                          </Pressable>
                          {selected && (
                            <DetailPanel
                              word={word}
                              index={i}
                              panel={state.panel}
                              gesture={panelPan}
                              onToggle={() => dispatch({ type: 'togglePanel' })}
                            />
                          )}
                        </Fragment>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </GestureDetector>

      <View style={[styles.footer, { paddingHorizontal: pad, paddingBottom: 23 + insets.bottom }]}>
        <AppText style={[styles.footerText, narrow && styles.footerTextNarrow]}>{MOVE_HINT}</AppText>
        <AppText style={[styles.footerText, styles.footerHint, narrow && styles.footerTextNarrow]}>{hint}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42 },
  back: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#e5f0ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 24, lineHeight: 24 },
  chapter: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  bookIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#e5f0ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookIconText: { color: colors.accent, fontSize: 15 },
  chapterText: { flexShrink: 1, fontSize: 12 },
  count: { color: '#6f7d77', fontSize: 12, fontWeight: '700' },
  progress: { height: 4, marginTop: 14, borderRadius: 5, overflow: 'hidden', backgroundColor: '#e7e5df' },
  progressFill: { height: 4, borderRadius: 5, backgroundColor: colors.accent },
  contentArea: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  content: { paddingBottom: 18 },
  contentFill: { flexGrow: 1 },
  defaultView: { flexGrow: 1, paddingTop: 16, paddingBottom: 8 },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#eeeae4',
    borderRadius: 20,
    backgroundColor: colors.surface,
    boxShadow: '0 12px 24px rgba(35, 46, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDefault: { minHeight: 230, maxHeight: '72%' },
  cardRevealed: { minHeight: 130, padding: 20 },
  cardWord: { fontFamily: fonts.serif, fontWeight: '700', textAlign: 'center' },
  cardMeta: { marginTop: 9, color: '#88958e', fontSize: 11 },
  recall: { marginTop: 'auto', paddingTop: 24, textAlign: 'center', fontSize: 12, color: '#a9b0aa' },
  expanded: { paddingTop: 18, paddingBottom: 24 },
  meaningHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 20,
    marginBottom: 10,
  },
  meaningHeadingTitle: { fontSize: 13, fontWeight: '700' },
  meaningHeadingCount: { fontSize: 10, color: colors.muted },
  meanings: { gap: 9 },
  meaning: {
    width: '100%',
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ebe7e0',
    borderRadius: 15,
    backgroundColor: colors.surface,
    boxShadow: '0 7px 14px rgba(36, 43, 38, 0.05)',
  },
  number: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#edf5f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  meaningText: { flex: 1, fontSize: 14, lineHeight: 19.6, fontWeight: '700' },
  chevron: { color: '#acb8b2', fontSize: 20 },
  chevronOn: { color: colors.accent },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 10 },
  footerText: { color: '#8b9690', fontSize: 10 },
  footerTextNarrow: { fontSize: 9 },
  footerHint: { flexShrink: 1, color: colors.accent, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 170, paddingHorizontal: 15 },
  emptyIcon: {
    width: 54,
    height: 54,
    marginBottom: 15,
    borderRadius: 17,
    backgroundColor: '#e5f0ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: { color: colors.accent, fontSize: 25 },
  emptyTitle: { marginBottom: 8, fontSize: 19, fontWeight: '700' },
  emptyText: { marginVertical: 13, color: colors.muted, fontSize: 13, textAlign: 'center' },
  emptyButton: { marginTop: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, backgroundColor: colors.accent },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});
