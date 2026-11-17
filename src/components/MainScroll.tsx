import { useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function MainScroll({ children, initialY = 0, onScrollY, stickyHeaderIndices }: { children: ReactNode; initialY?: number; onScrollY?: (y: number) => void; stickyHeaderIndices?: number[] }) {
  const ref = useRef<ScrollView>(null);
  const restored = useRef(false);
  return (
    <ScrollView ref={ref} stickyHeaderIndices={stickyHeaderIndices} onContentSizeChange={() => { if (!restored.current) { ref.current?.scrollTo({ y: initialY, animated: false }); restored.current = true; } }} onScroll={e => onScrollY?.(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16} style={styles.main} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18 },
});
