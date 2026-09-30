import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PhoneCanvas } from '../components/PhoneCanvas';
import { WordsProvider } from '../data/WordsContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WordsProvider>
        <PhoneCanvas>
          <Slot />
        </PhoneCanvas>
      </WordsProvider>
    </GestureHandlerRootView>
  );
}
