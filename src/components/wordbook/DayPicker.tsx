import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';
import type { DayOption } from '../../data/wordList';
import { AppText } from '../AppText';

type Props = { options: DayOption[]; value: string; onChange: (value: string) => void; compact?: boolean };

export function DayPicker({ options, value, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <View style={compact ? { zIndex: 30 } : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Day 선택: ${current.label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[styles.trigger, compact && { paddingHorizontal: 8, paddingVertical: 8 }]}
      >
        <AppText style={styles.triggerLabel}>{current.label}</AppText>
        {!compact && <AppText style={styles.triggerCount}>{current.count}단어</AppText>}
        <AppText aria-hidden style={styles.chevron}>
          {open ? '▴' : '▾'}
        </AppText>
      </Pressable>
      {open && (
        <ScrollView style={compact ? { position: 'absolute', top: 42, right: 0, width: 200, maxHeight: 320, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line } : undefined}><DayOptionList
          style={styles.listGap}
          options={options}
          current={current.value}
          onChange={(next) => {
            setOpen(false);
            onChange(next);
          }}
        /></ScrollView>
      )}
    </View>
  );
}

/** 펼친 Day 목록. 학습 화면은 칩으로 직접 펼치므로 따로 내보낸다. */
type ListProps = { options: DayOption[]; current: string; onChange: (value: string) => void; style?: StyleProp<ViewStyle> };

export function DayOptionList({ options, current, onChange, style }: ListProps) {
  return (
    <View style={[styles.list, style]}>
      {options.map((option) => {
        const selected = option.value === current;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <AppText style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</AppText>
            <AppText style={styles.optionCount}>{option.count}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  triggerLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  triggerCount: { color: colors.muted, fontSize: 11 },
  chevron: { color: colors.accent, fontSize: 13 },
  listGap: { marginTop: 6 },
  list: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  optionSelected: { backgroundColor: colors.accentSoft },
  optionLabel: { flex: 1, fontSize: 14 },
  optionLabelSelected: { color: colors.accent, fontWeight: '800' },
  optionCount: { color: colors.muted, fontSize: 11 },
});
