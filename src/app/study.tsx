import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { ExampleBlock } from '../components/study/ExampleBlock';
import { MeaningRow } from '../components/study/MeaningRow';
import { startStudy, studyList, studyReducer, swipeDirection, wheelStep } from '../data/study';
import { useWords } from '../data/WordsContext';
import { effectiveChapter } from '../data/wordList';
import { colors, fonts, isNarrow } from '../theme';

const MOVE_HINT = '⇆  스크롤 · 좌우 밀기로 다음 단어';
const HOLD_HINT = '↖  뜻을 꾹 누르면 동의어가 보여요';
const TRANSLATION_HINT = '↖  해석을 꾹 누르면 맥락 뜻이 보여요';

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
  const { ready } = useWords();
  const { word: wordParam } = useLocalSearchParams<{ word?: string | string[] }>();
  const wordId = typeof wordParam === 'string' ? wordParam : undefined;
  if (!ready) return <View style={styles.screen} />;
  // 쿼리가 바뀌면 처음부터 다시 시작한다.
  return <StudyBody key={wordId ?? 'all'} wordId={wordId} />;
}

function StudyBody({ wordId }: { wordId?: string }) {
  const { words, prefs } = useWords();
  const chapter = effectiveChapter(words, prefs.activeChapter);
  const { list, start } = useMemo(() => studyList(words, wordId, chapter), [words, wordId, chapter]);
  const total = list.length;
  const [state, dispatch] = useReducer(studyReducer, start, startStudy);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const wheelRef = useRef<View>(null);
  const lastWheel = useRef(0);
  const lastSwipe = useRef(0);
  const layoutHeight = useRef(0);
  const contentHeight = useRef(0);
  const overflows = useRef(false);

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
          if (step !== 0) {
            lastSwipe.current = Date.now();
            move(step);
          }
        }),
    [move],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = wheelRef.current as unknown as HTMLElement | null;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      // 해석이 열려 있거나 내용이 화면보다 길어 스크롤이 필요하면 휠을 단어 넘기기로 가로채지 않는다.
      const result = wheelStep({
        deltaY: event.deltaY,
        locked: state.translationOpen || overflows.current,
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
  }, [move, state.translationOpen, total]);

  const updateOverflow = () => {
    overflows.current = contentHeight.current > layoutHeight.current + 1;
  };

  const toggleTranslation = () => {
    // 마우스 드래그로 넘긴 직후에 이어지는 클릭은 예문 토글로 세지 않는다.
    if (Date.now() - lastSwipe.current < 100) return;
    dispatch({ type: 'toggleTranslation' });
  };

  const index = state.index >= total ? 0 : state.index;
  const word = list[index];
  const pad = width >= 621 ? 24 : 20;
  const narrow = isNarrow(width);
  const wordSize = Math.min(40, Math.max(32, width * 0.09));
  const wordStyle = { fontSize: wordSize, lineHeight: wordSize * 1.12, letterSpacing: -0.025 * wordSize };
  const hint = total === 0 ? '' : state.translationOpen ? TRANSLATION_HINT : HOLD_HINT;

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
              {word ? word.chapter : 'Daily vocabulary'}
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
              contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
              onLayout={(event) => {
                layoutHeight.current = event.nativeEvent.layout.height;
                updateOverflow();
              }}
              onContentSizeChange={(_, height) => {
                contentHeight.current = height;
                updateOverflow();
              }}
            >
              {!word ? (
                <StudyEmpty />
              ) : (
                <View key={word.id} style={styles.expanded}>
                  <View style={styles.card}>
                    <AppText style={[styles.cardWord, wordStyle]}>{word.word}</AppText>
                    <AppText style={styles.cardMeta}>WORD · {word.chapter}</AppText>
                  </View>
                  <View style={styles.meaningHeading}>
                    <AppText style={styles.meaningHeadingTitle}>뜻</AppText>
                    <AppText style={styles.meaningHeadingCount}>{word.meanings.length}개의 뜻 · 꾹 누르면 동의어</AppText>
                  </View>
                  <View style={styles.meanings}>
                    {word.meanings.map((meaning, i) => (
                      <MeaningRow key={i} number={i + 1} meaning={meaning} synonyms={word.synonyms[i] ?? ''} />
                    ))}
                  </View>
                  <View style={styles.example}>
                    <ExampleBlock word={word} open={state.translationOpen} onToggle={toggleTranslation} />
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
  expanded: { paddingTop: 18, paddingBottom: 24 },
  card: {
    width: '100%',
    minHeight: 130,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eeeae4',
    borderRadius: 20,
    backgroundColor: colors.surface,
    boxShadow: '0 12px 24px rgba(35, 46, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWord: { fontFamily: fonts.serif, fontWeight: '700', textAlign: 'center' },
  cardMeta: { marginTop: 9, color: '#88958e', fontSize: 11 },
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
  example: { marginTop: 16 },
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
