import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import type { DayOption } from '../../data/wordList';
import { AppText } from '../AppText';

type Props = { options: DayOption[]; value: string; onChange: (value: string) => void };

export function DayPicker({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Day 선택: ${current.label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.trigger}
      >
        <AppText style={styles.triggerLabel}>{current.label}</AppText>
        <AppText style={styles.triggerCount}>{current.count}단어</AppText>
        <AppText aria-hidden style={styles.chevron}>
          {open ? '▴' : '▾'}
        </AppText>
      </Pressable>
      {open && (
        <DayOptionList
          options={options}
          current={current.value}
          onChange={(next) => {
            setOpen(false);
            onChange(next);
          }}
        />
      )}
    </View>
  );
}

/** 펼친 Day 목록. 학습 화면은 칩으로 직접 펼치므로 따로 내보낸다. */
export function DayOptionList({ options, current, onChange }: { options: DayOption[]; current: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.list}>
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
  list: { marginTop: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  optionSelected: { backgroundColor: colors.accentSoft },
  optionLabel: { flex: 1, fontSize: 14 },
  optionLabelSelected: { color: colors.accent, fontWeight: '800' },
  optionCount: { color: colors.muted, fontSize: 11 },
});
