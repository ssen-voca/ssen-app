import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWords } from '../data/WordsContext';
import { colors } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const { prefs } = useWords();
  const chapterLabel = prefs.activeChapter === 'all' ? '전체' : prefs.activeChapter;
  return (
    <View style={[styles.bar, { paddingTop: 12 + insets.top, height: 76 + insets.top }]}>
      <View style={styles.brand}>
        <View aria-hidden style={styles.mark}>
          <AppText style={styles.markText}>V</AppText>
        </View>
        <View style={styles.brandText}>
          <AppText style={styles.eyebrow}>MY VOCAB</AppText>
          <AppText role="heading" numberOfLines={1} style={styles.title}>
            포켓 단어장
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable disabled accessibilityRole="button" accessibilityLabel="학습 챕터 선택 (준비 중)" style={styles.chapter}>
          <AppText numberOfLines={1} style={styles.chapterText}>
            {chapterLabel}
          </AppText>
          <Icon name="chevronDown" size={16} color="#4f5b6b" />
        </Pressable>
        <Pressable disabled accessibilityRole="button" accessibilityLabel="표시 정보 설정 (준비 중)" style={styles.iconButton}>
          <Icon name="filter" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 242, 235, 0.94)',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0, flexShrink: 1 },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 13,
    backgroundColor: '#e5f1ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  brandText: { minWidth: 0, flexShrink: 1 },
  eyebrow: { marginBottom: 2, color: colors.accent, fontSize: 9, letterSpacing: 1.35, fontWeight: '800' },
  title: { fontSize: 15, lineHeight: 18, letterSpacing: -0.45, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chapter: {
    maxWidth: 90,
    height: 34,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chapterText: { flexShrink: 1, color: '#4f5b6b', fontSize: 12, fontWeight: '700' },
  iconButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
