import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { ChoiceView } from '../components/ChoiceView';
import { Field, FormButton, FormError, FormInput } from '../components/FormControls';
import { useToast } from '../components/Toast';
import type { Word } from '../data/types';
import { buildWord, formFromWord, type FormValues } from '../data/wordForm';
import { colors } from '../theme';
import { deleteChapter, deleteClassroomWord, getClassroomWords, listClassrooms, updateClassroomWord, type TeacherClassroom } from './api';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '요청에 실패했어요');
const WORD_WARNING = '학생이 북마크한 단어도 함께 사라져요.';

export default function WordsScreen() {
  const { status, user } = useAuth();
  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/login" />;
  if (status !== 'authenticated' || user?.role !== 'TEACHER') return <Redirect href="/account" />;
  return <TeacherWords />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText role="heading" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function meaningLine(word: Word): string {
  return word.meanings.map((meaning, i) => [word.partsOfSpeech?.[i], meaning].filter(Boolean).join(' ')).join(' / ');
}

function Confirm({ message, error, busy, onConfirm, onCancel }: { message: string; error: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <View style={styles.confirm}>
      <AppText style={styles.confirmText}>{message}</AppText>
      <FormError message={error} />
      <View style={styles.actions}>
        <FormButton label="지우기" disabled={busy} onPress={onConfirm} style={styles.action} />
        <FormButton label="취소" variant="ghost" disabled={busy} onPress={onCancel} style={styles.action} />
      </View>
    </View>
  );
}

type EditProps = { word: Word; save: (word: Word) => Promise<string>; onCancel: () => void };

function EditForm({ word, save, onCancel }: EditProps) {
  const [values, setValues] = useState<FormValues>(() => formFromWord(word));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const set = (key: keyof FormValues) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (busy.current) return;
    const built = buildWord(values, word.id, word);
    if (!built.ok) return setError(built.message);
    busy.current = true;
    setSaving(true);
    setError('');
    const message = await save(built.word);
    busy.current = false;
    if (!mounted.current) return;
    setSaving(false);
    setError(message);
  };

  return (
    <View style={styles.form}>
      <Field label="영단어" required>
        <FormInput label="영단어" required value={values.word} onChangeText={set('word')} />
      </Field>
      <Field label="뜻" hint="여러 뜻은 줄바꿈으로 입력" required>
        <FormInput label="뜻" required rows={3} value={values.meaning} onChangeText={set('meaning')} />
      </Field>
      <Field label="뜻별 동의어" hint="뜻 순서대로 한 줄씩, 여러 개는 쉼표로">
        <FormInput label="뜻별 동의어" rows={3} value={values.synonyms} onChangeText={set('synonyms')} />
      </Field>
      <Field label="영어 예문">
        <FormInput label="영어 예문" rows={2} value={values.example} onChangeText={set('example')} />
      </Field>
      <Field label="한국어 예문">
        <FormInput label="한국어 예문" rows={2} value={values.exampleKo} onChangeText={set('exampleKo')} />
      </Field>
      <Field label="예문에서 사용된 뜻" hint="한국어 문장에서 가려 둘 표현">
        <FormInput label="예문에서 사용된 뜻" value={values.exampleMeaning} onChangeText={set('exampleMeaning')} />
      </Field>
      <AppText style={styles.note}>{`차시는 바꿀 수 없어요: ${word.chapter}`}</AppText>
      <FormError message={error} />
      <View style={styles.actions}>
        <FormButton label="저장" disabled={saving} onPress={() => void submit()} style={styles.action} />
        <FormButton label="취소" variant="ghost" disabled={saving} onPress={onCancel} style={styles.action} />
      </View>
    </View>
  );
}

type Confirming = { type: 'word'; id: string } | { type: 'chapter'; chapter: string };
type Group = { chapter: string; words: Word[] };

function TeacherWords() {
  const toast = useToast();
  const [classrooms, setClassrooms] = useState<TeacherClassroom[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [words, setWords] = useState<Word[]>([]);
  const [wordsState, setWordsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [wordsError, setWordsError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [confirmError, setConfirmError] = useState('');
  const [deleting, setDeleting] = useState(false);
  // 수업을 다시 고르면 앞선 요청의 응답은 버린다.
  const picked = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const list = await listClassrooms();
      if (!mounted.current) return;
      setClassrooms(list);
      setLoadState('ready');
    } catch (error) {
      if (!mounted.current) return;
      setLoadError(errorMessage(error));
      setLoadState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: number) => {
    const mine = ++picked.current;
    setSelectedId(id);
    setWords([]);
    setEditingId(null);
    setConfirming(null);
    setConfirmError('');
    setDeleting(false);
    setWordsError('');
    setWordsState('loading');
    try {
      const list = await getClassroomWords(id);
      if (picked.current !== mine || !mounted.current) return;
      setWords(list);
      setWordsState('ready');
    } catch (error) {
      if (picked.current !== mine || !mounted.current) return;
      setWordsError(errorMessage(error));
      setWordsState('error');
    }
  };

  // 서버 오류 메시지를 돌려주고(빈 문자열이면 성공), 목록 갱신은 여기서 한다.
  const save = async (word: Word): Promise<string> => {
    const mine = picked.current;
    try {
      const saved = await updateClassroomWord(selectedId!, word);
      if (picked.current !== mine || !mounted.current) return '';
      setWords((list) => list.map((item) => (item.id === saved.id ? saved : item)));
      setEditingId((current) => (current === saved.id ? null : current));
      toast('단어를 고쳤어요');
      return '';
    } catch (error) {
      return picked.current === mine ? errorMessage(error) : '';
    }
  };

  const remove = async () => {
    if (!confirming || deleting) return;
    const mine = picked.current;
    const target = confirming;
    setDeleting(true);
    setConfirmError('');
    try {
      if (target.type === 'word') await deleteClassroomWord(selectedId!, target.id);
      else await deleteChapter(selectedId!, target.chapter);
      if (picked.current !== mine || !mounted.current) return;
      setWords((list) => list.filter((item) => (target.type === 'word' ? item.id !== target.id : item.chapter !== target.chapter)));
      setConfirming(null);
      toast(target.type === 'word' ? '단어를 지웠어요' : `${target.chapter} 차시를 지웠어요`);
    } catch (error) {
      if (picked.current === mine && mounted.current) setConfirmError(errorMessage(error));
    } finally {
      if (picked.current === mine && mounted.current) setDeleting(false);
    }
  };

  const ask = (target: Confirming) => {
    setEditingId(null);
    setConfirmError('');
    setConfirming(target);
  };

  const groups = useMemo(() => {
    const byChapter = new Map<string, Group>();
    for (const word of words) {
      const group = byChapter.get(word.chapter) ?? { chapter: word.chapter, words: [] };
      group.words.push(word);
      byChapter.set(word.chapter, group);
    }
    return [...byChapter.values()];
  }, [words]);

  const selected = classrooms.find((c) => c.id === selectedId) ?? null;
  const cancel = () => {
    setConfirming(null);
    setConfirmError('');
  };

  return (
    <ChoiceView kicker="TEACHER" title="올린 단어 관리" description="수업을 고르면 올린 단어를 보고 고치거나 지울 수 있어요.">
      <Section title="수업">
        {loadState === 'loading' && <AppText style={styles.note}>수업을 불러오는 중이에요.</AppText>}
        {loadState === 'error' && (
          <View style={styles.stack}>
            <FormError message={loadError} />
            <FormButton label="다시 시도" variant="ghost" onPress={() => void load()} />
          </View>
        )}
        {loadState === 'ready' && classrooms.length === 0 && <AppText style={styles.note}>아직 만든 수업이 없어요.</AppText>}
        <View accessibilityRole="radiogroup" style={styles.stack}>
          {classrooms.map((classroom) => {
            const checked = classroom.id === selectedId;
            return (
              <Pressable
                key={classroom.id}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                onPress={() => void open(classroom.id)}
                style={[styles.row, checked && styles.rowSelected]}
              >
                <AppText style={styles.rowName}>{classroom.name}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {selected && (
        <Section title="단어">
          {wordsState === 'loading' && <AppText style={styles.note}>단어를 불러오는 중이에요.</AppText>}
          {wordsState === 'error' && (
            <View style={styles.stack}>
              <FormError message={wordsError} />
              <FormButton label="다시 시도" variant="ghost" onPress={() => void open(selected.id)} />
            </View>
          )}
          {wordsState === 'ready' && groups.length === 0 && <AppText style={styles.note}>아직 올린 단어가 없어요.</AppText>}
          {groups.map(({ chapter, words: inChapter }) => (
            <View key={chapter} style={styles.group}>
              <View style={styles.groupHeader}>
                <AppText style={styles.groupTitle}>{`${chapter} · ${inChapter.length}단어`}</AppText>
                <FormButton label="차시 삭제" variant="ghost" disabled={deleting} onPress={() => ask({ type: 'chapter', chapter })} style={styles.small} />
              </View>
              {confirming?.type === 'chapter' && confirming.chapter === chapter && (
                <Confirm
                  message={`${chapter}의 단어 ${inChapter.length}개를 모두 지울까요? 학생이 북마크한 단어도 함께 사라지고 되돌릴 수 없어요.`}
                  error={confirmError}
                  busy={deleting}
                  onConfirm={() => void remove()}
                  onCancel={cancel}
                />
              )}
              <View style={styles.stack}>
                {inChapter.map((word) => (
                  <View key={word.id} style={styles.card}>
                    <AppText style={styles.wordName}>{word.number !== undefined ? `${word.number}. ${word.word}` : word.word}</AppText>
                    <AppText style={styles.meaning}>{meaningLine(word)}</AppText>
                    <View style={styles.actions}>
                      <FormButton
                        label="수정"
                        variant="ghost"
                        disabled={deleting}
                        onPress={() => {
                          cancel();
                          setEditingId(word.id);
                        }}
                        style={styles.small}
                      />
                      <FormButton label="삭제" variant="ghost" disabled={deleting} onPress={() => ask({ type: 'word', id: word.id })} style={styles.small} />
                    </View>
                    {confirming?.type === 'word' && confirming.id === word.id && (
                      <Confirm
                        message={`이 단어를 지울까요? ${WORD_WARNING}`}
                        error={confirmError}
                        busy={deleting}
                        onConfirm={() => void remove()}
                        onCancel={cancel}
                      />
                    )}
                    {editingId === word.id && <EditForm key={word.id} word={word} save={save} onCancel={() => setEditingId(null)} />}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </Section>
      )}
    </ChoiceView>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionTitle: { marginBottom: 12, marginLeft: 2, color: colors.accent, fontSize: 13, fontWeight: '800' },
  stack: { rowGap: 8 },
  note: { marginBottom: 8, marginLeft: 2, color: colors.muted, fontSize: 13, lineHeight: 20 },
  row: { padding: 14, borderWidth: 1, borderColor: '#e9e5de', borderRadius: 14, backgroundColor: colors.surface },
  rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  rowName: { fontSize: 14, fontWeight: '700' },
  group: { marginBottom: 22 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginLeft: 2 },
  groupTitle: { flex: 1, fontSize: 14, fontWeight: '800' },
  card: { padding: 14, borderWidth: 1, borderColor: '#e9e5de', borderRadius: 14, backgroundColor: colors.surface },
  wordName: { fontSize: 14, fontWeight: '700' },
  meaning: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1 },
  small: { minHeight: 36 },
  confirm: { marginTop: 12, marginBottom: 4 },
  confirmText: { marginLeft: 2, color: colors.danger, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  form: { marginTop: 14, rowGap: 14 },
});
