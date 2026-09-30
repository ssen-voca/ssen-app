import { Text, type TextProps } from 'react-native';
import { colors, fonts } from '../theme';

export function AppText({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[{ fontFamily: fonts.body, color: colors.text, fontSize: 16 }, style]} />;
}
