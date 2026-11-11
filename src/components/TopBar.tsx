import { usePathname } from 'expo-router';
import { useBookView } from '../data/BookViewContext';
import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const path = usePathname(); const mine = path === '/my-voca';
  const { home, my, update } = useBookView(); const view = mine ? my : home;
  const book = path === '/' || mine;
  const inputRef = useRef<TextInput>(null);
  const open = book && view.searchOpen;
  // 모바일 브라우저는 누르는 순간(제스처) 안에서 focus()를 불러야 키보드가 뜬다. 그래서 입력칸은 항상 달아 두고 누를 때 바로 focus한다.
  const toggleSearch = () => {
    if (view.searchOpen) {
      inputRef.current?.blur();
      update(mine, { searchOpen: false, query: '' });
    } else {
      inputRef.current?.focus();
      update(mine, { searchOpen: true, query: '' });
    }
  };
  return (
    <View style={[styles.bar, { paddingTop: 12 + insets.top, height: 76 + insets.top }]}>
      {!open && (
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
      )}
      {book && (
        <View style={open ? styles.searchBox : styles.searchHidden}>
          <Icon name="search" size={19} color={colors.muted} />
          <TextInput
            ref={inputRef}
            value={view.query}
            onChangeText={(query) => update(mine, { query })}
            placeholder="단어 또는 뜻 검색"
            placeholderTextColor={colors.muted}
            accessibilityLabel="단어 또는 뜻 검색"
            autoComplete="off"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      )}
      <View style={styles.actions}>
        {book && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? '검색 닫기' : '검색 열기'}
            accessibilityState={{ expanded: open }}
            onPress={toggleSearch}
            style={styles.iconButton}
          >
            {open ? <AppText style={styles.closeText}>✕</AppText> : <Icon name="search" size={22} color={colors.text} />}
          </Pressable>
        )}
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
  searchBox: {
    flex: 1,
    height: 40,
    marginRight: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  // 닫혀 있을 때도 화면에 달려 있어야 누르는 순간 focus할 수 있다 (보이지 않게 접어 둔다).
  searchHidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: fonts.body, color: colors.text },
  closeText: { color: colors.text, fontSize: 15, fontWeight: '700' },
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
