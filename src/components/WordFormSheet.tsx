import { router } from 'expo-router';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeId } from '../data/normalize';
import type { Word } from '../data/types';
import { buildWord, emptyForm, formFromWord, type FormValues } from '../data/wordForm';
import { chapterOptions } from '../data/wordList';
import { useWords } from '../data/WordsContext';
import { CANVAS, colors, fonts, isNarrow } from '../theme';
import { AppText } from './AppText';
import { useToast } from './Toast';

export const NOT_PERSISTED_MESSAGE = '저장소를 쓸 수 없어 이 기기에 저장되지 않아요';

type Session = { id?: string; initial: FormValues };
type WordFormContextValue = { open: (id?: string) => void };

const WordFormContext = createContext<WordFormContextValue>({ open: () => {} });

export function useWordForm(): WordFormContextValue {
  return useContext(WordFormContext);
}

export function WordFormProvider({ children }: { children: ReactNode }) {
  const { ready, words, prefs } = useWords();
  const [session, setSession] = useState<Session | null>(null);

  const open = useCallback(
    (id?: string) => {
      if (!ready) return;
      if (id === undefined) {
        const chapters = chapterOptions(words);
        setSession({ initial: emptyForm(chapters.includes(prefs.activeChapter) ? prefs.activeChapter : chapters[0]) });
        return;
      }
      const word = words.find((item) => item.id === id);
      if (word) setSession({ id, initial: formFromWord(word) });
    },
    [ready, words, prefs.activeChapter],
  );

  const value = useMemo(() => ({ open }), [open]);

  return (
    <WordFormContext.Provider value={value}>
      {children}
      {session && <WordFormSheet {...session} onClose={() => setSession(null)} />}
    </WordFormContext.Provider>
  );
}

type FieldSpec = {
  key: keyof FormValues;
  label: string;
  hint?: string;
  placeholder: string;
  rows?: number;
  full?: boolean;
  required?: boolean;
};

const PRIMARY_FIELDS: FieldSpec[] = [
  { key: 'word', label: '영단어', placeholder: '예: resilient', required: true },
  { key: 'chapter', label: '챕터', placeholder: '' },
  { key: 'meaning', label: '뜻', hint: '여러 뜻은 줄바꿈으로 입력', placeholder: '예: 회복력이 있는\n탄력 있는', rows: 3, full: true, required: true },
];

const EXTRA_FIELDS: FieldSpec[] = [
  { key: 'definition', label: '영영 풀이', hint: '한국어 뜻 순서대로 한 줄에 하나씩 입력', placeholder: 'able to recover quickly from difficulty\nable to return to its original shape', rows: 3, full: true },
  { key: 'example', label: '영어 예문', placeholder: 'She remained resilient through change.', rows: 2, full: true },
  { key: 'exampleKo', label: '한국어 예문', placeholder: '그녀는 변화 속에서도 회복력을 유지했다.', rows: 2, full: true },
  { key: 'exampleMeaning', label: '예문에서 사용된 뜻', hint: '한국어 문장에서 굵게 표시할 표현', placeholder: '예: 회복력을 유지했다', full: true },
  { key: 'synonyms', label: '동의어', placeholder: 'strong, flexible' },
  { key: 'antonyms', label: '반의어', placeholder: 'fragile' },
  { key: 'derived', label: '파생어', placeholder: 'resilience, resiliently' },
  { key: 'related', label: '유의어', placeholder: 'durable, adaptable', full: true },
];

function hovered(state: PressableStateCallbackType): boolean {
  return !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;
}

function Field({ spec, children }: { spec: FieldSpec; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>
        {spec.label}
        {spec.required && <Text style={styles.required}> *</Text>}
        {spec.hint && <Text style={styles.hint}> {spec.hint}</Text>}
      </AppText>
      {children}
    </View>
  );
}

function Input({ spec, value, onChange }: { spec: FieldSpec; value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  const multiline = !!spec.rows;
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={spec.placeholder}
      placeholderTextColor="#9aa3ae"
      accessibilityLabel={spec.label}
      aria-required={spec.required || undefined}
      autoComplete="off"
      autoCorrect={false}
      multiline={multiline}
      numberOfLines={spec.rows}
      style={[styles.input, multiline ? styles.textarea : styles.singleLine, focused && styles.inputFocus]}
    />
  );
}

function ChapterSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  if (Platform.OS === 'web') {
    return createElement(
      'select',
      {
        value,
        'aria-label': '챕터',
        onChange: (event: { target: { value: string } }) => onChange(event.target.value),
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        style: { ...WEB_SELECT, ...(focused ? WEB_SELECT_FOCUS : null) },
      },
      options.map((option) => createElement('option', { key: option, value: option }, option)),
    );
  }
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: option === value }}
          onPress={() => onChange(option)}
          style={[styles.chip, option === value && styles.chipActive]}
        >
          <AppText style={[styles.chipText, option === value && styles.chipTextActive]}>{option}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const WEB_SELECT = {
  width: '100%',
  height: 47,
  boxSizing: 'border-box',
  padding: '12px 13px',
  border: '1px solid #dfe4ea',
  borderRadius: 14,
  background: '#fafbfc',
  color: colors.text,
  fontSize: 14,
  outline: 'none',
  transition: '.2s',
} as const;

const WEB_SELECT_FOCUS = {
  borderColor: colors.accent,
  boxShadow: '0 0 0 3px rgba(23, 111, 242, 0.1)',
  background: '#fff',
} as const;

type SheetProps = Session & { onClose: () => void };

function WordFormSheet({ id, initial, onClose }: SheetProps) {
  const { words, saveWord } = useWords();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [values, setValues] = useState(initial);
  const saving = useRef(false);
  const enter = useRef(new Animated.Value(0)).current;
  const options = useMemo(() => chapterOptions(words), [words]);
  const narrow = isNarrow(width);
  const editing = id !== undefined;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [enter]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key: keyof FormValues) => (value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (saving.current) return;
    const previous: Word | undefined = id === undefined ? undefined : words.find((item) => item.id === id);
    const built = buildWord(values, id ?? makeId(), previous);
    if (!built.ok) {
      toast(built.message);
      return;
    }
    saving.current = true;
    const result = await saveWord(built.word);
    onClose();
    toast(result === 'saved' ? (editing ? '단어 정보를 수정했어요' : '새 단어를 추가했어요') : NOT_PERSISTED_MESSAGE);
    if (!editing) router.navigate('/');
  };

  const renderField = (spec: FieldSpec) => (
    <Field key={spec.key} spec={spec}>
      {spec.key === 'chapter' ? (
        <ChapterSelect value={values.chapter} options={options} onChange={set('chapter')} />
      ) : (
        <Input spec={spec} value={values[spec.key]} onChange={set(spec.key)} />
      )}
    </Field>
  );

  const renderGrid = (specs: FieldSpec[]) => {
    const rows: FieldSpec[][] = [];
    for (const spec of specs) {
      const last = rows[rows.length - 1];
      if (!narrow && !spec.full && last && last.length === 1 && !last[0].full) last.push(spec);
      else rows.push([spec]);
    }
    return (
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row[0].key} style={styles.gridRow}>
            {row.map(renderField)}
            {!narrow && row.length === 1 && !row[0].full && <View style={styles.fieldSpacer} />}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View role="dialog" aria-modal accessibilityLabel={editing ? '단어 정보 수정' : '새 단어 추가'} style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: enter }]}>
        <Pressable accessible={false} onPress={onClose} style={styles.backdropPress} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheetWrap,
          { opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [35, 0] }) }] },
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.sheet}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: 22 + insets.bottom }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <AppText style={styles.eyebrow}>WORD DETAILS</AppText>
              <AppText role="heading" style={styles.title}>
                {editing ? '단어 정보 수정' : '새 단어 추가'}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.close}>
              <AppText style={styles.closeText}>×</AppText>
            </Pressable>
          </View>

          {renderGrid(PRIMARY_FIELDS)}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText style={styles.dividerText}>추가 정보</AppText>
            <View style={styles.dividerLine} />
          </View>

          {renderGrid(EXTRA_FIELDS)}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={[styles.button, styles.ghost]}>
              <AppText style={[styles.buttonText, styles.ghostText]}>취소</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={submit}
              style={(state) => [styles.button, styles.primary, hovered(state) && styles.primaryHover]}
            >
              <AppText style={[styles.buttonText, styles.primaryText]}>저장하기</AppText>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, justifyContent: 'flex-end', paddingTop: 30 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 20, 31, 0.48)' },
  backdropPress: { flex: 1 },
  sheetWrap: { width: '100%', maxWidth: CANVAS.width, maxHeight: '92%', alignSelf: 'center' },
  sheet: {
    flexGrow: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.bg,
    boxShadow: '0 -18px 60px rgba(0, 0, 0, 0.18)',
  },
  sheetContent: { paddingTop: 9, paddingHorizontal: 20 },
  handle: { width: 38, height: 4, borderRadius: 5, backgroundColor: '#d9dde3', alignSelf: 'center', marginBottom: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { marginBottom: 2, color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.65 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.77 },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#56606e', fontSize: 30, lineHeight: 34 },
  grid: { rowGap: 14 },
  gridRow: { flexDirection: 'row', columnGap: 10 },
  field: { flex: 1, minWidth: 0 },
  fieldSpacer: { flex: 1 },
  label: { marginBottom: 7, marginLeft: 2, fontSize: 13, fontWeight: '700' },
  required: { color: colors.accent },
  hint: { color: colors.muted, fontSize: 10.8, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 14,
    backgroundColor: '#fafbfc',
    paddingVertical: 12,
    paddingHorizontal: 13,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    outlineWidth: 0,
  },
  singleLine: { height: 47 },
  // 원본의 textarea는 inline-block이라 아래에 4px 줄 여백이 생긴다.
  textarea: { textAlignVertical: 'top', marginBottom: 4 },
  inputFocus: { borderColor: colors.accent, backgroundColor: '#fff', boxShadow: '0 0 0 3px rgba(23, 111, 242, 0.1)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: '#dfe4ea', backgroundColor: '#fafbfc' },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.accent },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 19, marginBottom: 15 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: '#8a94a1', fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 9, marginTop: 20 },
  button: { minHeight: 47, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
  ghost: { flex: 0.8, backgroundColor: '#eef1f5' },
  ghostText: { color: '#5d6673' },
  primary: { flex: 1.2, backgroundColor: colors.accent },
  primaryHover: { backgroundColor: colors.accentDark },
  primaryText: { color: '#fff' },
});
