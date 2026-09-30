import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DETAIL_LABELS, detailRows, type DetailKey } from '../../data/filter';
import { cardVisible, hasMask, isMasked } from '../../data/mask';
import type { MaskField, Prefs, ShownMap, Word } from '../../data/types';
import { cardShadow, colors } from '../../theme';
import { AppText } from '../AppText';
import { ExamplePair } from '../ExamplePair';
import { Icon } from '../Icon';
import { Masked } from '../Masked';

type Props = {
  word: Word;
  number: number;
  mode: 'card' | 'list';
  prefs: Prefs;
  shown: ShownMap;
  onToggleField: (field: MaskField) => void;
  onToggleCard: () => void;
};

function CardActions() {
  return (
    <View style={styles.actions}>
      <Pressable disabled accessibilityRole="button" accessibilityLabel="단어 수정 (준비 중)" style={styles.mini}>
        <Icon name="edit" size={18} color="#9aa3ae" />
      </Pressable>
      <Pressable disabled accessibilityRole="button" accessibilityLabel="단어 삭제 (준비 중)" style={styles.mini}>
        <Icon name="delete" size={18} color="#9aa3ae" />
      </Pressable>
    </View>
  );
}

export function WordCard({ word, number, mode, prefs, shown, onToggleField, onToggleCard }: Props) {
  const masked = (field: MaskField) => isMasked(prefs, shown, word.id, field);

  if (mode === 'list') {
    return (
      <View style={[styles.card, styles.listCard]}>
        <View style={[styles.top, styles.listTop]}>
          <View style={styles.listMain}>
            <Masked masked={masked('word')} onPress={() => onToggleField('word')} style={styles.listWordCol}>
              <AppText role="heading" style={styles.listTitle}>
                {word.word}
              </AppText>
            </Masked>
            <Masked masked={masked('meaning')} onPress={() => onToggleField('meaning')} style={styles.listMeaningCol}>
              {word.meanings.map((meaning, i) => (
                <AppText key={i} style={styles.listMeaning}>
                  {meaning}
                </AppText>
              ))}
            </Masked>
          </View>
          <CardActions />
        </View>
      </View>
    );
  }

  const rows = detailRows(word);
  const detailsMasked = masked('details');

  const renderDetail = (key: DetailKey) => {
    if (key === 'definition') {
      return word.definitions.map((definition, i) =>
        definition ? (
          <AppText key={i} style={styles.ddText}>
            <Text style={styles.ddStrong}>{word.meanings[i]}</Text> · {definition}
          </AppText>
        ) : null,
      );
    }
    if (key === 'example') {
      return (
        <ExamplePair word={word} hideWord={masked('exampleWord')} onRevealWord={() => onToggleField('exampleWord')} />
      );
    }
    return <AppText style={styles.ddText}>{word.details[key]}</AppText>;
  };

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <AppText style={styles.chapterTag}>{word.chapter}</AppText>
      <View style={styles.top}>
        <View style={styles.main}>
          <AppText style={styles.index}>WORD {String(number).padStart(2, '0')}</AppText>
          <Masked masked={masked('word')} onPress={() => onToggleField('word')}>
            <AppText role="heading" style={styles.title}>
              {word.word}
            </AppText>
          </Masked>
          <Masked masked={masked('meaning')} onPress={() => onToggleField('meaning')} style={styles.meanings}>
            {word.meanings.map((meaning, i) => (
              <AppText key={i} style={styles.meaning}>
                <Text style={styles.bullet}>• </Text>
                {meaning}
              </AppText>
            ))}
          </Masked>
        </View>
        <CardActions />
      </View>
      {rows.length > 0 && (
        <View style={styles.details}>
          {rows.map((key) => (
            <View key={key} style={styles.row}>
              <AppText style={styles.dt}>{DETAIL_LABELS[key]}</AppText>
              <Masked
                masked={detailsMasked}
                onPress={detailsMasked ? () => onToggleField('details') : undefined}
                style={styles.dd}
              >
                {renderDetail(key)}
              </Masked>
            </View>
          ))}
        </View>
      )}
      {hasMask(prefs, rows.length > 0) && (
        <Pressable accessibilityRole="button" onPress={onToggleCard} style={styles.reveal}>
          <AppText style={styles.revealText}>{cardVisible(prefs, shown, word) ? '다시 가리기' : '정답 보기'}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    boxShadow: cardShadow,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderRadius: 4,
    backgroundColor: colors.accent,
    opacity: 0.8,
  },
  chapterTag: {
    position: 'absolute',
    top: 13,
    right: 68,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', paddingLeft: 3 },
  main: { flexShrink: 1, minWidth: 0 },
  index: { marginBottom: 6, color: '#a1a9b3', fontSize: 11, fontWeight: '800', letterSpacing: 0.88 },
  title: { fontSize: 23, lineHeight: 28.75, letterSpacing: -0.575, fontWeight: '700' },
  meanings: { marginTop: 7 },
  meaning: { color: '#4e5866', fontSize: 15, lineHeight: 22.5 },
  bullet: { color: colors.accent },
  actions: { flexDirection: 'row', gap: 2, marginRight: -6 },
  mini: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  details: {
    marginTop: 14,
    marginBottom: 16,
    paddingTop: 14,
    paddingLeft: 3,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
  dt: { width: 58, fontSize: 13, lineHeight: 20.15, color: colors.muted, fontWeight: '700' },
  dd: { flex: 1, minWidth: 0 },
  ddText: { fontSize: 13, lineHeight: 20.15, color: '#3f4855' },
  ddStrong: { fontWeight: '700' },
  reveal: {
    alignSelf: 'flex-start',
    marginTop: 13,
    marginLeft: 3,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 11,
    backgroundColor: colors.accentSoft,
  },
  revealText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  listCard: { paddingVertical: 14, paddingHorizontal: 15, borderRadius: 17 },
  listTop: { alignItems: 'center' },
  listMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listWordCol: { flex: 0.75, minWidth: 105 },
  listMeaningCol: { flex: 1 },
  listTitle: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, fontWeight: '700' },
  listMeaning: { color: '#4e5866', fontSize: 14, lineHeight: 21 },
});
