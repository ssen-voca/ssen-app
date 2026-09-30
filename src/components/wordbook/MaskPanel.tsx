import { Pressable, StyleSheet, View } from 'react-native';
import type { Prefs } from '../../data/types';
import { colors } from '../../theme';
import { AppText } from '../AppText';

const SWITCHES = [
  { key: 'maskWord', label: '영어 가리기' },
  { key: 'maskMeaning', label: '뜻 가리기' },
  { key: 'maskDetails', label: '추가정보 가리기' },
] as const;

export type MaskKey = (typeof SWITCHES)[number]['key'];

type Props = {
  prefs: Prefs;
  anyVisible: boolean;
  onToggle: (key: MaskKey) => void;
  onRevealAll: () => void;
};

export function MaskPanel({ prefs, anyVisible, onToggle, onRevealAll }: Props) {
  return (
    <View accessibilityLabel="암기 가리기 설정" style={styles.panel}>
      <View style={styles.heading}>
        <View style={styles.headingLeft}>
          <View aria-hidden style={styles.spark}>
            <AppText style={styles.sparkText}>✦</AppText>
          </View>
          <AppText style={styles.headingTitle}>암기 모드</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={onRevealAll} style={styles.textButton}>
          <AppText style={styles.textButtonText}>{anyVisible ? '전체 다시 가리기' : '전체 정답 보기'}</AppText>
        </Pressable>
      </View>
      <View style={styles.switchRow}>
        {SWITCHES.map(({ key, label }) => {
          const on = prefs[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="switch"
              accessibilityLabel={label}
              accessibilityState={{ checked: on }}
              onPress={() => onToggle(key)}
              style={styles.switchItem}
            >
              <AppText style={styles.switchLabel}>{label}</AppText>
              <View style={[styles.track, on && styles.trackOn]}>
                <View style={[styles.knob, on && styles.knobOn]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: '#e9f1ec' },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spark: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: '#d5e9e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkText: { color: colors.accent, fontSize: 14 },
  headingTitle: { fontSize: 14, fontWeight: '700' },
  textButton: { paddingVertical: 5 },
  textButtonText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  switchRow: { flexDirection: 'row', gap: 7 },
  switchItem: {
    flex: 1,
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  switchLabel: { fontSize: 11, textAlign: 'center' },
  track: { width: 30, height: 17, borderRadius: 20, backgroundColor: '#b8c9c0' },
  trackOn: { backgroundColor: colors.accent },
  knob: { position: 'absolute', left: 2, top: 2, width: 13, height: 13, borderRadius: 6.5, backgroundColor: '#fff' },
  knobOn: { transform: [{ translateX: 13 }] },
});
