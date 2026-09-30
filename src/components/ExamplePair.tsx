import { StyleSheet, Text, View } from 'react-native';
import { emphasize, koreanHighlight, type Segment } from '../data/emphasize';
import type { Word } from '../data/types';
import { colors } from '../theme';
import { AppText } from './AppText';

type Props = {
  word: Word;
  hideWord?: boolean;
  onRevealWord?: () => void;
  size?: 'card' | 'study';
};

export function ExamplePair({ word, hideWord = false, onRevealWord, size = 'card' }: Props) {
  const { example, exampleKo } = word.details;
  const study = size === 'study';
  const textStyle = study ? styles.textStudy : styles.textCard;
  const maskSize = study ? styles.maskStudy : styles.maskCard;

  const render = (segments: Segment[], canHide: boolean) =>
    segments.map((segment, i) => {
      if (!segment.match) return segment.text;
      if (canHide && hideWord) {
        return (
          <Text
            key={i}
            accessibilityRole="button"
            accessibilityLabel="예문 속 단어 보기"
            onPress={onRevealWord}
            style={[styles.wordMask, maskSize]}
          >
            ••••
          </Text>
        );
      }
      return (
        <Text key={i} style={styles.strong}>
          {segment.text}
        </Text>
      );
    });

  return (
    <View style={[styles.pair, study && styles.pairStudy]}>
      <View style={[styles.line, styles.lineEn]}>
        <AppText style={[textStyle, styles.en]}>
          {example ? (
            render(emphasize(example, word.word, true), true)
          ) : (
            <Text style={styles.missing}>영어 예문을 추가해 주세요.</Text>
          )}
        </AppText>
      </View>
      <View style={[styles.line, styles.lineKo]}>
        <AppText style={[textStyle, styles.ko]}>
          {exampleKo ? (
            render(emphasize(exampleKo, koreanHighlight(word), false), false)
          ) : (
            <Text style={styles.missing}>한국어 예문을 추가해 주세요.</Text>
          )}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { gap: 9 },
  pairStudy: { marginTop: 12 },
  line: { borderLeftWidth: 3, paddingVertical: 4, paddingLeft: 10 },
  lineEn: { borderLeftColor: colors.accent },
  lineKo: { borderLeftColor: '#c88465' },
  textCard: { fontSize: 12, lineHeight: 19.2 },
  textStudy: { fontSize: 13, lineHeight: 20.8 },
  en: { color: '#5e6863' },
  ko: { color: '#5f6761' },
  strong: { color: colors.text, fontWeight: '800' },
  missing: { color: '#a4ada7' },
  wordMask: {
    backgroundColor: '#e9edf2',
    color: '#87919f',
    fontWeight: '800',
    borderRadius: 5,
    paddingHorizontal: 6,
  },
  maskCard: { fontSize: 10.32 },
  maskStudy: { fontSize: 11.18 },
});
