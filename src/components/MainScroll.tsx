import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function MainScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.main} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18 },
});
