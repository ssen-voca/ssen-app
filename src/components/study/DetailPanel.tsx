import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { splitChips, type StudyPanel } from '../../data/study';
import type { Word } from '../../data/types';
import { colors, isNarrow } from '../../theme';
import { AppText } from '../AppText';
import { ExamplePair } from '../ExamplePair';

type PanGesture = ReturnType<typeof Gesture.Pan>;

type Props = {
  word: Word;
  index: number;
  panel: StudyPanel;
  gesture: PanGesture;
  onToggle: () => void;
};

type ChipRowProps = { label: string; value: string; derived?: boolean; first?: boolean };

function ChipRow({ label, value, derived, first }: ChipRowProps) {
  const { width } = useWindowDimensions();
  const chips = splitChips(value);
  return (
    <View style={[styles.chipRow, first && styles.chipRowFirst]}>
      <AppText style={[styles.chipLabel, isNarrow(width) && styles.chipLabelNarrow]}>{label}</AppText>
      <View style={styles.chips}>
        {chips.length > 0 ? (
          chips.map((chip, i) => (
            <AppText key={i} style={[styles.chip, derived && styles.chipDerived]}>
              {chip}
            </AppText>
          ))
        ) : (
          <AppText style={styles.chipEmpty}>—</AppText>
        )}
      </View>
    </View>
  );
}

export function DetailPanel({ word, index, panel, gesture, onToggle }: Props) {
  const isDefinition = panel === 'definition';
  const definition = word.definitions[index];
  const hasExample = word.details.example !== '' || word.details.exampleKo !== '';

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View style={styles.panel}>
        <View style={styles.head}>
          <View style={styles.headIcon}>
            <AppText style={styles.headIconText}>{isDefinition ? '▤' : '❞'}</AppText>
          </View>
          <AppText style={styles.headTitle}>{isDefinition ? 'DEFINITIONS' : 'IN CONTEXT'}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isDefinition ? '예문 보기' : '영영 풀이 보기'}
            hitSlop={12}
            onPress={onToggle}
            style={styles.next}
          >
            <AppText style={styles.nextText}>{isDefinition ? '→' : '←'}</AppText>
          </Pressable>
        </View>
        {isDefinition ? (
          <>
            {definition ? (
              <View style={styles.definitions}>
                <AppText style={styles.definitionMarker}>1.</AppText>
                <AppText style={styles.definition}>{definition}</AppText>
              </View>
            ) : (
              <AppText style={styles.noDetail}>이 뜻에 등록된 영영 풀이가 없어요.</AppText>
            )}
            <ChipRow label="동의어" value={word.details.synonyms} first />
            <ChipRow label="파생어" value={word.details.derived} derived />
          </>
        ) : hasExample ? (
          <ExamplePair word={word} size="study" />
        ) : (
          <AppText style={styles.noDetail}>등록된 예문이 없어요.</AppText>
        )}
        <View aria-hidden style={styles.dots}>
          <View style={[styles.dot, isDefinition && styles.dotActive]} />
          <View style={[styles.dot, !isDefinition && styles.dotActive]} />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 1,
    marginBottom: 4,
    paddingTop: 15,
    paddingHorizontal: 14,
    paddingBottom: 11,
    borderWidth: 1,
    borderColor: '#ebe7e0',
    borderRadius: 18,
    backgroundColor: colors.surface,
    boxShadow: '0 10px 20px rgba(36, 43, 38, 0.055)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headIcon: {
    width: 23,
    height: 23,
    borderRadius: 8,
    backgroundColor: '#edf5f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headIconText: { color: colors.accent, fontSize: 13 },
  headTitle: { color: '#5c6762', fontSize: 11, letterSpacing: 0.165, fontWeight: '700' },
  next: { marginLeft: 'auto' },
  nextText: { color: colors.accent, fontSize: 19 },
  definitions: { flexDirection: 'row', marginTop: 10, marginBottom: 13 },
  definitionMarker: {
    width: 19,
    paddingRight: 4,
    textAlign: 'right',
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18.6,
    fontWeight: '800',
  },
  definition: { flex: 1, paddingLeft: 3, marginBottom: 5, fontSize: 12, lineHeight: 18.6 },
  noDetail: { marginVertical: 12, color: colors.muted, fontSize: 12, lineHeight: 18 },
  chipRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingTop: 9 },
  chipRowFirst: { borderTopWidth: 1, borderTopColor: '#eeeae5' },
  chipLabel: { width: 70, paddingTop: 5, color: '#9aa39d', fontSize: 10, fontWeight: '800' },
  chipLabelNarrow: { width: 58 },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#edf5f1',
    color: colors.accent,
    fontSize: 10,
  },
  chipDerived: { backgroundColor: '#fbede6', color: '#bd7457' },
  chipEmpty: { color: '#b5bdb6' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingTop: 9 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#d5dfd9' },
  dotActive: { width: 13, backgroundColor: colors.accent },
});
