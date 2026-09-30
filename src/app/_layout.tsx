import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../auth/AuthContext';
import { PhoneCanvas } from '../components/PhoneCanvas';
import { ToastProvider } from '../components/Toast';
import { WordFormProvider } from '../components/WordFormSheet';
import { WordsProvider } from '../data/WordsContext';

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
