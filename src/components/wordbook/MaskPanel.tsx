import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Prefs } from '../../data/types';
import { colors } from '../../theme';
import { AppText } from '../AppText';

const SWITCHES = [
  { key: 'maskWord', label: '단어', description: '단어 가리기' },
  { key: 'maskMeaning', label: '뜻', description: '뜻 가리기' },
] as const;

export type MaskKey = (typeof SWITCHES)[number]['key'];

type Props = {
  prefs: Prefs;
  anyVisible: boolean;
  onToggle: (key: MaskKey) => void;
  onRevealAll: () => void;
  children?: ReactNode;
};

export function MaskPanel({ prefs, anyVisible, onToggle, onRevealAll, children }: Props) {
  return (
    <View accessibilityLabel="암기 가리기 설정" style={styles.panel}>
      {children ? <View style={styles.slot}>{children}</View> : null}
      <View style={styles.row}>
        <View style={styles.headingLeft}>
          <View aria-hidden style={styles.spark}>
            <AppText style={styles.sparkText}>✦</AppText>
          </View>
          <AppText style={styles.headingTitle}>암기 모드</AppText>
        </View>
        <View style={styles.toggles}>
          {SWITCHES.map(({ key, label, description }) => {
            const on = prefs[key];
            return (
              <Pressable
                key={key}
                accessibilityRole="switch"
                accessibilityLabel={description}
                accessibilityState={{ checked: on }}
                onPress={() => onToggle(key)}
                style={[styles.toggle, on && styles.toggleOn]}
              >
                <AppText style={[styles.toggleLabel, on && styles.toggleLabelOn]}>{label}</AppText>
                <View style={[styles.track, on && styles.trackOn]}>
                  <View style={[styles.knob, on && styles.knobOn]} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={onRevealAll} style={styles.textButton}>
          <AppText style={styles.textButtonText}>{anyVisible ? '전체 다시 가리기' : '전체 정답 보기'}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#ece6f8' },
  slot: { marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 },
  headingLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spark: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#d9cff0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkText: { color: colors.accent, fontSize: 12 },
  headingTitle: { fontSize: 13, fontWeight: '700' },
  toggles: { flexDirection: 'row', gap: 6 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  toggleOn: { backgroundColor: '#fff' },
  toggleLabel: { fontSize: 12, color: colors.muted },
  toggleLabelOn: { color: colors.text, fontWeight: '700' },
  textButton: { marginLeft: 'auto', paddingVertical: 5 },
  textButtonText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  track: { width: 28, height: 16, borderRadius: 20, backgroundColor: '#c4b8df' },
  trackOn: { backgroundColor: colors.accent },
  knob: { position: 'absolute', left: 2, top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  knobOn: { transform: [{ translateX: 12 }] },
});
