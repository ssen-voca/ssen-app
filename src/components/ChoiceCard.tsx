import { Pressable, StyleSheet, View } from 'react-native';
import { cardShadow, colors } from '../theme';
import { AppText } from './AppText';

type Props = { icon: string; title: string; sub: string; onPress?: () => void; disabled?: boolean; label?: string };

export function ChoiceCard({ icon, title, sub, onPress, disabled, label }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.card, disabled && styles.disabled]}
    >
      <View style={styles.icon}>
        <AppText style={styles.iconText}>{icon}</AppText>
      </View>
      <View style={styles.body}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.sub}>{sub}</AppText>
      </View>
      <AppText aria-hidden style={styles.chevron}>
        ›
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e9e5de',
    borderRadius: 18,
    backgroundColor: colors.surface,
    boxShadow: cardShadow,
  },
  disabled: { opacity: 0.5 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: colors.accent, fontSize: 24 },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { marginTop: 4, color: colors.muted, fontSize: 11 },
  chevron: { color: '#a8b4ae', fontSize: 23 },
});
