import { usePathname } from 'expo-router';
import { useBookView } from '../data/BookViewContext';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const path = usePathname(); const mine = path === '/my-voca';
  const { home, my, update } = useBookView(); const view = mine ? my : home;
  const book = path === '/' || mine;
  return (
    <View style={[styles.bar, { paddingTop: 12 + insets.top, height: 76 + insets.top }]}>
      <View style={styles.brand}>
        <View aria-hidden style={styles.mark}>
          <AppText style={styles.markText}>V</AppText>
        </View>
        <View style={styles.brandText}>
          <AppText style={styles.eyebrow}>MY VOCAB</AppText>
          <AppText role="heading" numberOfLines={1} style={styles.title}>
            독해 VOCA 단어장
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        {book && <>
        <Pressable accessibilityRole="button" accessibilityLabel={view.searchOpen ? '검색 닫기' : '검색 열기'} accessibilityState={{ expanded: view.searchOpen }} onPress={() => update(mine, { searchOpen: !view.searchOpen, query: '' })} style={styles.iconButton}>
          <Icon name="search" size={22} color={colors.text} />
        </Pressable></>}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    zIndex: 30,
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
    backgroundColor: '#ebe5f7',
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
