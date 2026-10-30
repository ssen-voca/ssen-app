import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';

type Props = {
  masked: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Masked({ masked, style, children }: Props) {
  const content = masked ? (
    <>
      <View aria-hidden style={styles.hidden}>
        {children}
      </View>
      <View style={styles.overlay}>
        <AppText style={styles.overlayText}>눌러서 보기</AppText>
      </View>
    </>
  ) : (
    children
  );
  return <View style={[style, masked && styles.masked]}>{content}</View>;
}

const styles = StyleSheet.create({
  masked: { borderRadius: 7, backgroundColor: '#e9edf2', minWidth: 70 },
  hidden: { opacity: 0, pointerEvents: 'none' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  overlayText: { color: '#87919f', fontSize: 10, fontWeight: '700' },
});
