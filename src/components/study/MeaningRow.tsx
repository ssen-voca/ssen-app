import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { splitSynonyms } from '../../data/study';
import { colors } from '../../theme';
import { AppText } from '../AppText';
import { HOLD_STYLE, holdProps } from './hold';

type Props = { number: number; meaning: string; synonyms: string };

export function MeaningRow({ number, meaning, synonyms }: Props) {
  const [held, setHeld] = useState(false);
  const chips = splitSynonyms(synonyms);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${number}. ${meaning} — 누르고 있는 동안 동의어 보기`}
      {...holdProps(setHeld)}
      style={[styles.row, HOLD_STYLE, held && styles.rowHeld]}
    >
      <View style={styles.number}>
        <AppText style={styles.numberText}>{number}</AppText>
      </View>
      {held ? (
        <View style={styles.chips}>
          {chips.length > 0 ? (
            chips.map((chip, i) => (
              <AppText key={i} style={styles.chip}>
                {chip}
              </AppText>
            ))
          ) : (
            <AppText style={styles.empty}>등록된 동의어가 없어요</AppText>
          )}
        </View>
      ) : (
        <AppText style={styles.meaning}>{meaning}</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
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
  rowHeld: { borderColor: colors.accent, backgroundColor: '#f3faf7' },
  number: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#edf5f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  meaning: { flex: 1, fontSize: 14, lineHeight: 19.6, fontWeight: '700' },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#edf5f1',
    color: colors.accent,
    fontSize: 11,
  },
  empty: { color: '#9aa39d', fontSize: 12 },
});
