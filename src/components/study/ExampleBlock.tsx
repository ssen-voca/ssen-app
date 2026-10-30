import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { emphasize, koreanHighlight } from '../../data/emphasize';
import type { Word } from '../../data/types';
import { colors } from '../../theme';
import { AppText } from '../AppText';
import { HOLD_STYLE, holdProps } from './hold';

type Props = { word: Word; open: boolean; onToggle: () => void };

export function ExampleBlock({ word, open, onToggle }: Props) {
  const { example, exampleKo } = word.details;
  const [held, setHeld] = useState(false);

  // 해석을 닫을 때 누름 상태가 남아 있지 않게 한다.
  useEffect(() => {
    if (!open) setHeld(false);
  }, [open]);

  if (example === '' && exampleKo === '') {
    return <AppText style={styles.missing}>예문이 아직 없어요.</AppText>;
  }

  const hasTranslation = exampleKo !== '';
  const koreanSegments = hasTranslation ? emphasize(exampleKo, koreanHighlight(word), false) : [];

  return (
    <View style={styles.block}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={hasTranslation ? '예문 — 눌러서 한국어 해석 보기' : '예문'}
        disabled={!hasTranslation}
        onPress={onToggle}
        style={[styles.line, styles.lineEn]}
      >
        <AppText style={styles.text}>
          {example === '' ? (
            <Text style={styles.missing}>영어 예문이 없어요.</Text>
          ) : (
            emphasize(example, word.word, true).map((segment, i) =>
              segment.match ? (
                <Text key={i} style={styles.strong}>
                  {segment.text}
                </Text>
              ) : (
                segment.text
              ),
            )
          )}
        </AppText>
      </Pressable>
      {open && hasTranslation && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="한국어 해석 — 누르고 있는 동안 가려진 뜻 보기"
          {...holdProps(setHeld)}
          style={[styles.line, styles.lineKo, HOLD_STYLE]}
        >
          <AppText style={styles.text}>
            {koreanSegments.map((segment, i) =>
              segment.match ? (
                <Text key={i} style={held ? styles.shown : styles.masked}>
                  {segment.text}
                </Text>
              ) : (
                segment.text
              ),
            )}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 9 },
  line: { borderLeftWidth: 3, paddingVertical: 4, paddingLeft: 10 },
  lineEn: { borderLeftColor: colors.accent },
  lineKo: { borderLeftColor: '#c88465' },
  text: { color: '#5e6863', fontSize: 13, lineHeight: 20.8 },
  strong: { color: colors.text, fontWeight: '800' },
  missing: { color: '#a4ada7', fontSize: 13 },
  // 가려진 맥락 뜻: 글자 폭은 그대로 두고 회색 블록으로 가린다.
  masked: { backgroundColor: '#e9edf2', color: 'transparent' },
  shown: { backgroundColor: colors.accentSoft, color: colors.text, fontWeight: '800' },
});
