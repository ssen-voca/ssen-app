import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { isMasked } from '../../data/mask';
import type { Prefs, ShownMap, Word } from '../../data/types';
import { cardShadow, colors } from '../../theme';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { Masked } from '../Masked';

type Props = {
  word: Word;
  prefs: Prefs;
  shown: ShownMap;
  onOpen: () => void;
  bookmarked?: boolean;
  pending?: boolean;
  onBookmark?: () => void;
  initialExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

const STAR_COLOR = '#4a2c91';

// Pressable cancels long presses when its parent ScrollView takes the gesture.
export function PeekField({ masked, children, onOpen, style, label }: { masked: boolean; children: ReactNode; onOpen: () => void; style: StyleProp<ViewStyle>; label: string }) {
  const [peeking, setPeeking] = useState(false);
  const held = useRef(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="짧게 누르면 학습, 길게 누르거나 Space를 누르는 동안 가려진 내용 확인"
    delayLongPress={450}
    onPressIn={() => { held.current = false; }}
    onLongPress={() => { held.current = true; setPeeking(true); }}
    onPressOut={() => setPeeking(false)}
    onPress={() => { if (!held.current) onOpen(); }}
    {...({ onKeyDown: (e: any) => { if (e.key === ' ') { e.preventDefault(); held.current = true; setPeeking(true); } }, onKeyUp: (e: any) => { if (e.key === ' ') { e.preventDefault(); setPeeking(false); } }, onContextMenu: (e: any) => e.preventDefault() } as any)}
    onBlur={() => setPeeking(false)} style={style}>
    <Masked masked={masked && !peeking}>{children}</Masked>
  </Pressable>;
}

export function WordRow({ word, prefs, shown, onOpen, bookmarked, pending, onBookmark, initialExpanded = false, onExpandedChange }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [overflow, setOverflow] = useState(false);
  const meaningRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || expanded) return;
    const node = meaningRef.current as unknown as HTMLElement | null;
    const text = node?.querySelector('[data-testid="meaning-text"]');
    if (!node || !text) return;
    const measure = () => setOverflow(text.scrollHeight > text.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [expanded, word.meanings]);
  const wordMasked = isMasked(prefs, shown, word.id, 'word');
  const meaningMasked = isMasked(prefs, shown, word.id, 'meaning');

  return (
    <View style={styles.row}>
      <PeekField masked={wordMasked} label={`${word.word} 학습하기`} onOpen={onOpen} style={styles.wordCol}>
        <AppText style={styles.title}>{word.word}</AppText>
      </PeekField>
      <View ref={meaningRef} style={styles.meaningCol}>
        <PeekField masked={meaningMasked} label={`${word.word} 뜻 학습하기`} onOpen={onOpen} style={undefined}>
          <AppText testID="meaning-text" numberOfLines={expanded ? undefined : 3} onTextLayout={e => { if (e.nativeEvent.lines.length > 3) setOverflow(true); }} style={styles.meaning}>{word.meanings.join(', ')}</AppText>
        </PeekField>
        {(overflow || expanded) && <Pressable accessibilityRole="button" accessibilityLabel={expanded ? '뜻 접기' : '뜻 전체 보기'} accessibilityState={{ expanded }} onPress={() => { setExpanded(!expanded); onExpandedChange?.(!expanded); }}><AppText style={{ color: colors.accent, fontSize: 12, paddingTop: 5 }}>{expanded ? '접기' : '더 보기'}</AppText></Pressable>}
      </View>
      <View style={styles.actions}>
        {onBookmark && <Pressable accessibilityRole="button" accessibilityLabel={bookmarked ? '북마크 해제' : 'MY VOCA에 저장'} accessibilityState={{ selected: bookmarked, disabled: pending }} disabled={pending} onPress={onBookmark} style={styles.mini}><Icon name={bookmarked ? 'starFilled' : 'star'} size={20} color={bookmarked ? STAR_COLOR : colors.muted} /></Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: cardShadow,
  },
  wordCol: { flex: 0.75, minWidth: 0 },
  meaningCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, fontWeight: '700' },
  meaning: { color: '#4e5866', fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'column', gap: 2, marginRight: -6 },
  mini: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniHover: { backgroundColor: colors.bg },
});
