import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { CANVAS, colors, isFramed } from '../theme';

export function PhoneCanvas({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (!isFramed(width)) {
    return <View style={styles.bleed}>{children}</View>;
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.frame}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  page: { flex: 1, backgroundColor: colors.page },
  pageContent: { alignItems: 'center', paddingVertical: 20 },
  frame: {
    width: CANVAS.width,
    height: CANVAS.height,
    borderRadius: CANVAS.radius,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    boxShadow: '0 0 36px rgba(50, 55, 50, 0.06)',
  },
});
