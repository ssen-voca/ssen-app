import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { AppText } from '../AppText';

type Props = { chapter: string; count: number; children: ReactNode };

export function DaySection({ chapter, count, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText role="heading" style={styles.tag}>
          {chapter}
        </AppText>
        <AppText style={styles.count}>{count}단어</AppText>
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9, paddingHorizontal: 2 },
  // 원본의 챕터 태그(.chapter-tag) 값
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  count: { color: colors.muted, fontSize: 11 },
  rows: { gap: 8 },
});
