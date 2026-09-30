import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, isNarrow } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type NavItem = { label: string; icon: IconName; href: '/study' | '/' | '/test' | '/add' | '/account' };

const ITEMS: NavItem[] = [
  { label: '학습', icon: 'study', href: '/study' },
  { label: '홈', icon: 'home', href: '/' },
  { label: '시험', icon: 'test', href: '/test' },
  { label: '추가', icon: 'add', href: '/add' },
  { label: '내 정보', icon: 'account', href: '/account' },
];

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View
      role="navigation"
      accessibilityLabel="주요 메뉴"
      style={[styles.nav, { height: 72 + insets.bottom, paddingBottom: insets.bottom }, isNarrow(width) && styles.navNarrow]}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const color = active ? colors.accent : '#9aa3af';
        return (
          <Pressable
            key={item.href}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(item.href)}
            style={styles.item}
          >
            <Icon name={item.icon} size={21} color={color} />
            <AppText style={[styles.label, { color }]}>{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 254, 252, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  navNarrow: { paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '700' },
});
