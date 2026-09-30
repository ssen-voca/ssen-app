import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../components/BottomNav';
import { TopBar } from '../../components/TopBar';
import { colors } from '../../theme';

export default function MainLayout() {
  return (
    <View style={styles.shell}>
      <TopBar />
      <View style={styles.body}>
        <Slot />
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, minHeight: 0 },
});
