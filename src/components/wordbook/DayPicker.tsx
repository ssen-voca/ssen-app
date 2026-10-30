import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { AppText } from '../AppText';

export type DayOption = { value: string; label: string; count: number };
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
        <View style={styles.list}>
          {options.map((option) => {
            const selected = option.value === current.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <AppText style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</AppText>
                <AppText style={styles.optionCount}>{option.count}</AppText>
              </Pressable>
            );
          })}
        </View>
      )}
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
