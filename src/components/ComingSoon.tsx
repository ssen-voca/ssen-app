import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';
import { MainScroll } from './MainScroll';

type Props = { kicker: string; title: string };

export function ComingSoon({ kicker, title }: Props) {
  return (
    <MainScroll>
      <View style={styles.view}>
        <AppText style={styles.kicker}>{kicker}</AppText>
        <AppText role="heading" style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.description}>곧 제공됩니다.</AppText>
      </View>
    </MainScroll>
  );
}

const styles = StyleSheet.create({
  view: { paddingTop: 58, paddingHorizontal: 2, paddingBottom: 20 },
  kicker: { marginBottom: 11, color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.43 },
  title: { fontFamily: fonts.serif, fontSize: 33, lineHeight: 38.28, letterSpacing: -0.99, fontWeight: '700' },
  description: { marginTop: 15, marginBottom: 32, color: '#83918a', fontSize: 14, lineHeight: 21.7 },
});
