import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { ChoiceView } from '../components/ChoiceView';
import { Field, FormButton, FormError, FormInput } from '../components/FormControls';
import { useToast } from '../components/Toast';
import { colors } from '../theme';
import {
  deleteClassroom,
  listClassroomStudents,
  listClassrooms,
  reissueClassroomCode,
  removeClassroomStudent,
  updateClassroom,
  type ClassroomStudent,
  type TeacherClassroom,
} from './api';

const MAX_NAME = 100;
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '요청에 실패했어요');

export default function ClassesScreen() {
  const { status, user } = useAuth();
  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/login" />;
  if (status !== 'authenticated' || user?.role !== 'TEACHER') return <Redirect href="/account" />;
  return <TeacherClasses />;
}

function Section({ title, muted, children }: { title: string; muted?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, muted && styles.sectionMuted]}>
      <AppText role="heading" style={[styles.sectionTitle, muted && styles.sectionTitleMuted]}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

type ConfirmProps = { message: string; ok: string; error?: string; busy: boolean; onConfirm: () => void; onCancel: () => void };

function Confirm({ message, ok, error = '', busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <View style={styles.confirm}>
      <AppText style={styles.confirmText}>{message}</AppText>
      <FormError message={error} />
      <View style={styles.actions}>
        <FormButton label={ok} disabled={busy} onPress={onConfirm} style={styles.action} />
        <FormButton label="취소" variant="ghost" disabled={busy} onPress={onCancel} style={styles.action} />
      </View>
    </View>
  );
}

const statusLine = (c: TeacherClassroom) => `학생 ${c.studentCount}명 · ${c.joinable ? '참여 받는 중' : '참여 닫힘'}`;

function TeacherClasses() {
  const [classrooms, setClassrooms] = useState<TeacherClassroom[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
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

  const change = (id: number, fn: (c: TeacherClassroom) => TeacherClassroom) => {
    if (mounted.current) setClassrooms((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  };
  const remove = (id: number) => {
    if (!mounted.current) return;
    setClassrooms((list) => list.filter((c) => c.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  const selected = classrooms.find((c) => c.id === selectedId) ?? null;

  return (
    <ChoiceView kicker="TEACHER" title="수업 관리" description="수업을 고르면 이름을 바꾸거나 참여를 닫고, 학생을 관리할 수 있어요.">
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
                onPress={() => setSelectedId(classroom.id)}
                style={[styles.row, checked && styles.rowSelected]}
              >
                <AppText style={styles.rowName}>{classroom.name}</AppText>
                <AppText style={styles.rowSub}>{statusLine(classroom)}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* key: 수업을 바꾸면 이전 수업의 편집·확인·늦은 응답이 통째로 사라진다. */}
      {selected && <Detail key={selected.id} classroom={selected} change={change} remove={remove} />}
    </ChoiceView>
  );
}

type Key = 'name' | 'join' | 'code' | 'student' | 'delete';
type DetailProps = {
  classroom: TeacherClassroom;
  change: (id: number, fn: (c: TeacherClassroom) => TeacherClassroom) => void;
  remove: (id: number) => void;
};

function Detail({ classroom, change, remove }: DetailProps) {
  const toast = useToast();
  const { id } = classroom;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [name, setName] = useState(classroom.name);
  const [nameInvalid, setNameInvalid] = useState('');
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [confirmingStudent, setConfirmingStudent] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [busy, setBusy] = useState<Key | null>(null);
  const busyRef = useRef<Key | null>(null);

  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [studentsState, setStudentsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [studentsError, setStudentsError] = useState('');

  const loadStudents = useCallback(async () => {
    setStudentsState('loading');
    try {
      const list = await listClassroomStudents(id);
      if (!mounted.current) return;
      setStudents(list);
      setStudentsState('ready');
    } catch (error) {
      if (!mounted.current) return;
      setStudentsError(errorMessage(error));
      setStudentsState('error');
    }
  }, [id]);
  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // 서버 호출은 한 번에 하나만(중복 제출 방지). 실패하면 그 섹션에 서버 메시지를 보여 준다.
  const run = async (key: Key, action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = key;
    setBusy(key);
    setErrors({});
    try {
      await action();
    } catch (error) {
      if (mounted.current) setErrors({ [key]: errorMessage(error) });
    } finally {
      busyRef.current = null;
      if (mounted.current) setBusy(null);
    }
  };

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) return setNameInvalid('수업 이름을 적어 주세요.');
    if (trimmed.length > MAX_NAME) return setNameInvalid(`수업 이름은 ${MAX_NAME}자까지 적을 수 있어요.`);
    setNameInvalid('');
    void run('name', async () => {
      const saved = await updateClassroom(id, { name: trimmed });
      change(id, () => saved);
      if (mounted.current) setName(saved.name);
      toast('이름을 바꿨어요');
    });
  };

  const toggleJoin = () =>
    void run('join', async () => {
      const saved = await updateClassroom(id, { joinable: !classroom.joinable });
      change(id, () => saved);
      toast(saved.joinable ? '참여를 열었어요' : '참여를 닫았어요');
    });

  const copyCode = async () => {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard) return;
    try {
      await clipboard.writeText(classroom.code);
      toast('참여 코드를 복사했어요');
    } catch {
      // 복사할 수 없는 환경이면 조용히 넘어간다.
    }
  };

  const reissue = () =>
    void run('code', async () => {
      const saved = await reissueClassroomCode(id);
      change(id, () => saved);
      if (mounted.current) setConfirmingCode(false);
      toast('새 참여 코드를 만들었어요');
    });

  const kick = (student: ClassroomStudent) =>
    void run('student', async () => {
      await removeClassroomStudent(id, student.id);
      change(id, (c) => ({ ...c, studentCount: Math.max(0, c.studentCount - 1) }));
      if (mounted.current) {
        setStudents((list) => list.filter((s) => s.id !== student.id));
        setConfirmingStudent(null);
      }
      toast('학생을 내보냈어요');
    });

  const destroy = () =>
    void run('delete', async () => {
      await deleteClassroom(id);
      toast('수업을 지웠어요');
      remove(id);
    });

  const canDelete = typed === classroom.name && busy === null;

  return (
    <>
      <Section title="이름">
        <View style={styles.stack}>
          <FormInput label="수업 이름" value={name} onChangeText={setName} onSubmit={saveName} />
          <FormError message={nameInvalid || errors.name || ''} />
          <FormButton label="이름 저장" disabled={busy !== null} onPress={saveName} />
        </View>
      </Section>

      <Section title="참여">
        <AppText style={styles.note}>
          {classroom.joinable ? '지금은 학생이 참여코드로 들어올 수 있어요.' : '지금은 참여가 닫혀 있어요. 이미 들어온 학생은 그대로예요.'}
        </AppText>
        <FormError message={errors.join ?? ''} />
        <FormButton label={classroom.joinable ? '참여 닫기' : '참여 열기'} variant="ghost" disabled={busy !== null} onPress={toggleJoin} />
      </Section>

      <Section title="참여 코드">
        <AppText style={styles.code}>{classroom.code}</AppText>
        <View style={styles.actions}>
          {Platform.OS === 'web' && <FormButton label="코드 복사" variant="ghost" onPress={() => void copyCode()} style={styles.action} />}
          <FormButton label="코드 다시 만들기" variant="ghost" disabled={busy !== null} onPress={() => setConfirmingCode(true)} style={styles.action} />
        </View>
        {confirmingCode && (
          <Confirm
            message="새 코드를 만들면 옛 코드는 더 쓸 수 없어요. 이미 들어온 학생은 그대로예요."
            ok="다시 만들기"
            error={errors.code}
            busy={busy !== null}
            onConfirm={reissue}
            onCancel={() => setConfirmingCode(false)}
          />
        )}
      </Section>

      <Section title={`학생 ${studentsState === 'ready' ? students.length : classroom.studentCount}명`}>
        {studentsState === 'loading' && <AppText style={styles.note}>학생을 불러오는 중이에요.</AppText>}
        {studentsState === 'error' && (
          <View style={styles.stack}>
            <FormError message={studentsError} />
            <FormButton label="다시 시도" variant="ghost" onPress={() => void loadStudents()} />
          </View>
        )}
        {studentsState === 'ready' && students.length === 0 && <AppText style={styles.note}>아직 들어온 학생이 없어요.</AppText>}
        <View style={styles.stack}>
          {students.map((student) => (
            <View key={student.id} style={styles.card}>
              <View style={styles.studentLine}>
                <View style={styles.studentText}>
                  <AppText style={styles.rowName}>{student.name}</AppText>
                  {student.school ? <AppText style={styles.rowSub}>{student.school}</AppText> : null}
                </View>
                <FormButton
                  label="내보내기"
                  variant="ghost"
                  disabled={busy !== null}
                  onPress={() => {
                    setErrors({});
                    setConfirmingStudent(student.id);
                  }}
                  style={styles.small}
                />
              </View>
              {confirmingStudent === student.id && (
                <Confirm
                  message={`${student.name} 학생을 수업에서 내보낼까요? 계정과 북마크는 그대로이고, 같은 참여코드로 다시 들어올 수 있어요.`}
                  ok="내보내기"
                  error={errors.student}
                  busy={busy !== null}
                  onConfirm={() => kick(student)}
                  onCancel={() => setConfirmingStudent(null)}
                />
              )}
            </View>
          ))}
        </View>
      </Section>

      <Section title="수업 삭제" muted>
        <AppText style={styles.note}>수업을 지우면 올린 단어와 학생들의 북마크가 사라지고, 학생들은 수업에서 빠져요. 되돌릴 수 없어요.</AppText>
        <View style={styles.stack}>
          <Field label="삭제할 수업 이름 확인">
            <FormInput label="삭제할 수업 이름 확인" placeholder={`수업 이름 “${classroom.name}”을(를) 그대로 입력`} value={typed} onChangeText={setTyped} />
          </Field>
          <FormError message={errors.delete ?? ''} />
          <FormButton label="수업 삭제" disabled={!canDelete} onPress={destroy} />
        </View>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionMuted: { marginTop: 12, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e9e5de' },
  sectionTitle: { marginBottom: 12, marginLeft: 2, color: colors.accent, fontSize: 13, fontWeight: '800' },
  sectionTitleMuted: { color: colors.muted },
  stack: { rowGap: 8 },
  note: { marginBottom: 8, marginLeft: 2, color: colors.muted, fontSize: 13, lineHeight: 20 },
  row: { padding: 14, borderWidth: 1, borderColor: '#e9e5de', borderRadius: 14, backgroundColor: colors.surface },
  rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowSub: { marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 18 },
  code: { marginLeft: 2, color: colors.accent, fontSize: 28, fontWeight: '800', letterSpacing: 4 },
  card: { padding: 14, borderWidth: 1, borderColor: '#e9e5de', borderRadius: 14, backgroundColor: colors.surface },
  studentLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  studentText: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1 },
  small: { minHeight: 36 },
  confirm: { marginTop: 12, marginBottom: 4 },
  confirmText: { marginLeft: 2, color: colors.danger, fontSize: 13, fontWeight: '700', lineHeight: 20 },
});
