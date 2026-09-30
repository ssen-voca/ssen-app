import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardShadow } from '../theme';
import { AppText } from './AppText';

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const animate = useCallback(
    (to: number) => {
      Animated.timing(progress, { toValue: to, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start();
    },
    [progress],
  );

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      animate(1);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => animate(0), 2300);
    },
    [animate],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View role="status" aria-live="polite" style={[styles.wrap, { bottom: 88 + insets.bottom }]}>
        <Animated.View
          style={[
            styles.toast,
            { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
          ]}
        >
          <AppText style={styles.text}>{message}</AppText>
        </Animated.View>
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 200, alignItems: 'center', paddingHorizontal: 18, pointerEvents: 'none' },
  toast: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#263632',
    boxShadow: cardShadow,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
