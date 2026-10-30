import { Pressable, StyleSheet, View, type PressableStateCallbackType } from 'react-native';
import { isMasked } from '../../data/mask';
import type { MaskField, Prefs, ShownMap, Word } from '../../data/types';
import { cardShadow, colors } from '../../theme';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { Masked } from '../Masked';

type Props = {
  word: Word;
  prefs: Prefs;
  shown: ShownMap;
  onToggleField: (field: MaskField) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const hovered = (state: PressableStateCallbackType) => !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

function MiniButton({ icon, label, onPress }: { icon: 'edit' | 'delete'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={(state) => [styles.mini, hovered(state) && styles.miniHover]}
    >
      {(state) => <Icon name={icon} size={18} color={hovered(state) ? colors.text : '#9aa3ae'} />}
    </Pressable>
  );
}

export function WordRow({ word, prefs, shown, onToggleField, onOpen, onEdit, onDelete }: Props) {
  const wordMasked = isMasked(prefs, shown, word.id, 'word');
  const meaningMasked = isMasked(prefs, shown, word.id, 'meaning');

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={wordMasked ? '가려진 영단어 보기' : `${word.word} 학습하기`}
        onPress={() => (wordMasked ? onToggleField('word') : onOpen())}
        style={styles.wordCol}
      >
        <Masked masked={wordMasked}>
          <AppText role="heading" style={styles.title}>
            {word.word}
          </AppText>
        </Masked>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={meaningMasked ? '가려진 뜻 보기' : `${word.word} 학습하기`}
        onPress={() => (meaningMasked ? onToggleField('meaning') : onOpen())}
        style={styles.meaningCol}
      >
        <Masked masked={meaningMasked}>
          <AppText numberOfLines={1} style={styles.meaning}>
            {word.meanings.join(' · ')}
          </AppText>
        </Masked>
      </Pressable>
      <View style={styles.actions}>
        <MiniButton icon="edit" label="단어 수정" onPress={onEdit} />
        <MiniButton icon="delete" label="단어 삭제" onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: cardShadow,
  },
  wordCol: { flex: 0.75, minWidth: 105 },
  meaningCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, fontWeight: '700' },
  meaning: { color: '#4e5866', fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 2, marginRight: -6 },
  mini: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniHover: { backgroundColor: colors.bg },
});
