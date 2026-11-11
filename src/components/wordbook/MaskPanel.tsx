import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Prefs } from '../../data/types';
import { colors } from '../../theme';
import { AppText } from '../AppText';

// 토글을 켜면 보이고 끄면 가려진다. (저장된 값 maskWord/maskMeaning은 "가림"이 true라서 화면에서는 뒤집어 보여 준다.)
const SWITCHES = [
  { key: 'maskWord', label: '단어', description: '단어 보이기' },
  { key: 'maskMeaning', label: '뜻', description: '뜻 보이기' },
] as const;

export type MaskKey = (typeof SWITCHES)[number]['key'];

type Props = {
  prefs: Prefs;
  onToggle: (key: MaskKey) => void;
  onToggleAll: () => void;
  children?: ReactNode;
};

function Toggle({ label, description, on, onPress }: { label: string; description: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={description}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.toggle, on && styles.toggleOn]}
    >
      <AppText style={[styles.toggleLabel, on && styles.toggleLabelOn]}>{label}</AppText>
      <View style={[styles.track, on && styles.trackOn]}>
        <View style={[styles.knob, on && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function MaskPanel({ prefs, onToggle, onToggleAll, children }: Props) {
  return (
    <View accessibilityLabel="암기 모드" style={styles.panel}>
      {children ? <View style={styles.slot}>{children}</View> : null}
      <View style={styles.row}>
        {SWITCHES.map(({ key, label, description }) => (
          <Toggle key={key} label={label} description={description} on={!prefs[key]} onPress={() => onToggle(key)} />
        ))}
        <Toggle label="전체" description="전체 보이기" on={!prefs.maskWord && !prefs.maskMeaning} onPress={onToggleAll} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 12, padding: 8, borderRadius: 16, backgroundColor: '#ece6f8' },
  slot: { marginBottom: 8 },
  row: { flexDirection: 'row', gap: 6 },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 36,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  toggleOn: { backgroundColor: '#fff' },
  toggleLabel: { fontSize: 13, color: colors.muted },
  toggleLabelOn: { color: colors.text, fontWeight: '700' },
  track: { width: 28, height: 16, borderRadius: 20, backgroundColor: '#c4b8df' },
  trackOn: { backgroundColor: colors.accent },
  knob: { position: 'absolute', left: 2, top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  knobOn: { transform: [{ translateX: 12 }] },
});
