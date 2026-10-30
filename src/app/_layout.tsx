import { Slot } from 'expo-router';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../auth/AuthContext';
import { PhoneCanvas } from '../components/PhoneCanvas';
import { ToastProvider } from '../components/Toast';
import { WordFormProvider } from '../components/WordFormSheet';
import { WordsProvider } from '../data/WordsContext';

// 웹 출력이 "single"이라 +html.tsx가 반영되지 않아, 앱 시작 때 Pretendard CSS를 <head>에 한 번 넣는다.
const PRETENDARD_CSS =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

function loadPretendard() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById('pretendard-css')) return;
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://cdn.jsdelivr.net';
  preconnect.crossOrigin = 'anonymous';
  const css = document.createElement('link');
  css.id = 'pretendard-css';
  css.rel = 'stylesheet';
  css.href = PRETENDARD_CSS;
  document.head.append(preconnect, css);
}
loadPretendard();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WordsProvider>
        <PhoneCanvas>
          <ToastProvider>
            <AuthProvider>
              <WordFormProvider>
                <Slot />
              </WordFormProvider>
            </AuthProvider>
          </ToastProvider>
        </PhoneCanvas>
      </WordsProvider>
    </GestureHandlerRootView>
  );
}
