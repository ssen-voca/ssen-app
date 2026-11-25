import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { ChoiceView } from '../components/ChoiceView';
import { FormButton, FormError, FormInput } from '../components/FormControls';
import { useToast } from '../components/Toast';
import { colors } from '../theme';
import { createClassroom, getClassroomWords, listClassrooms, publishWords, type TeacherClassroom } from './api';
import type { Word } from '../data/types';
import { parseWorkbook, type ParseIssue, type ParseResult } from './excel';
import { readWorkbook } from './readWorkbook';

const MAX_NAME = 100;
const MAX_ISSUES = 20;
const MAX_REMOVED = 20;
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '요청에 실패했어요');

type Removal = { state: 'idle' | 'loading' | 'ready' | 'error'; words: Word[]; error: string };
const NO_REMOVAL: Removal = { state: 'idle', words: [], error: '' };
const wordKey = (word: Word) => `${word.chapter}\u0000${word.word.trim().toLowerCase()}`;

// 지워질 단어: 파일에 들어 있는 차시의 현재 단어 중, 같은 차시의 파일 단어에 없는 것(서버와 같은 비교).
function removedWords(current: Word[], uploaded: Word[]): Word[] {
  const chapters = new Set(uploaded.map((word) => word.chapter));
  const keep = new Set(uploaded.map(wordKey));
  return current.filter((word) => chapters.has(word.chapter) && !keep.has(wordKey(word)));
}

export default function UploadScreen() {
  const { status, user } = useAuth();
  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/login" />;
  if (status !== 'authenticated' || user?.role !== 'TEACHER') return <Redirect href="/account" />;
  return <TeacherUpload />;
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

function Issues({ issues, color }: { issues: ParseIssue[]; color?: string }) {
  if (issues.length === 0) return null;
  const style = [styles.issue, color ? { color } : null];
  return (
    <View style={styles.issues}>
      {issues.slice(0, MAX_ISSUES).map((issue, index) => (
        <AppText key={index} style={style}>
          {[issue.sheet, issue.row ? `${issue.row}행` : '', issue.message].filter(Boolean).join(' · ')}
        </AppText>
      ))}
      {issues.length > MAX_ISSUES && <AppText style={style}>{`외 ${issues.length - MAX_ISSUES}개`}</AppText>}
    </View>
  );
}

function TeacherUpload() {
  const toast = useToast();
  const [classrooms, setClassrooms] = useState<TeacherClassroom[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [creating, setCreating] = useState(false);

  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [readError, setReadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [result, setResult] = useState('');
  const [replace, setReplace] = useState(false);
  const [removal, setRemoval] = useState<Removal>(NO_REMOVAL);
  // 파일을 다시 고르면 앞선 읽기 결과는 버린다.
  const picked = useRef(0);
  const input = useRef<HTMLInputElement>(null);
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

  const selected = classrooms.find((c) => c.id === selectedId) ?? null;
  const hasErrors = !!parsed && parsed.errors.length > 0;

  // 교체를 켜면 현재 단어를 불러와 지워질 단어를 계산한다. 파일·수업·토글이 바뀌면 앞선 계산은 버린다.
  useEffect(() => {
    if (!replace || selectedId === null || !parsed || hasErrors) {
      setRemoval(NO_REMOVAL);
      return;
    }
    let stale = false;
    setRemoval({ state: 'loading', words: [], error: '' });
    getClassroomWords(selectedId).then(
      (current) => {
        if (!stale) setRemoval({ state: 'ready', words: removedWords(current, parsed.words), error: '' });
      },
      (error) => {
        if (!stale) setRemoval({ state: 'error', words: [], error: errorMessage(error) });
      },
    );
    return () => {
      stale = true;
    };
  }, [replace, selectedId, parsed, hasErrors]);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setNameError('수업 이름을 적어 주세요.');
    if (trimmed.length > MAX_NAME) return setNameError(`수업 이름은 ${MAX_NAME}자까지 적을 수 있어요.`);
    setNameError('');
    setCreating(true);
    try {
      const created = await createClassroom(trimmed);
      if (!mounted.current) return;
      setClassrooms((list) => [...list, created]);
      setSelectedId(created.id);
      setName('');
    } catch (error) {
      if (mounted.current) setNameError(errorMessage(error));
    } finally {
      if (mounted.current) setCreating(false);
    }
  };

  const choose = async (file: File) => {
    const mine = ++picked.current;
    setFileName(file.name);
    setParsed(null);
    setReadError('');
    setUploadError('');
    setResult('');
    setReplace(false);
    try {
      const next = parseWorkbook(await readWorkbook(file));
      if (picked.current === mine && mounted.current) setParsed(next);
    } catch (error) {
      if (picked.current === mine && mounted.current) setReadError(errorMessage(error));
    }
  };

  const upload = async () => {
    if (!selected || !parsed) return;
    setUploading(true);
    setUploadError('');
    try {
      const { created, updated, deleted = 0 } = await (replace
        ? publishWords(selected.id, parsed.words, { replace: true })
        : publishWords(selected.id, parsed.words));
      if (!mounted.current) return;
      const message = replace ? `새로 ${created}개, 고친 ${updated}개, 지운 ${deleted}개를 올렸어요.` : `새로 ${created}개, 고친 ${updated}개를 올렸어요.`;
      picked.current++;
      setResult(message);
      setParsed(null);
      setFileName('');
      toast(message);
    } catch (error) {
      if (mounted.current) setUploadError(errorMessage(error));
    } finally {
      if (mounted.current) setUploading(false);
    }
  };

  const words = parsed?.words ?? [];
  const replaceReady = !replace || removal.state === 'ready';
  const canUpload = !!selected && !!parsed && !hasErrors && words.length > 0 && !uploading && replaceReady;
  const uploadLabel = hasErrors
    ? '오류가 있어 올릴 수 없어요'
    : !replace
      ? `${words.length}개 단어 올리기`
      : removal.state === 'ready'
        ? `${words.length}개 올리고 ${removal.words.length}개 지우기`
        : removal.state === 'error'
          ? '지워질 단어를 확인하지 못해 올릴 수 없어요'
          : '지워질 단어를 확인하는 중이에요';

  return (
    <ChoiceView kicker="TEACHER" title="단어 올리기" description="수업을 고르고 엑셀 파일을 올리면 그 수업 학생들의 단어장에 들어가요.">
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
              </Pressable>
            );
          })}
        </View>
        {selected && <AppText style={styles.code}>{`참여 코드 ${selected.code}`}</AppText>}
        <View style={styles.create}>
          <FormInput label="수업 이름" placeholder="새 수업 이름" value={name} onChangeText={setName} onSubmit={() => void create()} />
          <FormError message={nameError} />
          <FormButton label="수업 만들기" variant="ghost" disabled={creating} onPress={() => void create()} style={styles.createButton} />
        </View>
      </Section>

      <Section title="엑셀 파일">
        {Platform.OS === 'web' ? (
          <View style={styles.stack}>
            <input
              ref={input}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                // 같은 파일을 다시 골라도 change가 일어나도록 비운다.
                event.target.value = '';
                if (file) void choose(file);
              }}
            />
            <FormButton label="엑셀 파일 고르기" variant="ghost" onPress={() => input.current?.click()} />
            {fileName !== '' && <AppText style={styles.note}>{fileName}</AppText>}
            <FormError message={readError} />
          </View>
        ) : (
          <AppText style={styles.note}>엑셀 올리기는 웹에서만 쓸 수 있어요. 컴퓨터 브라우저에서 열어 주세요.</AppText>
        )}
      </Section>

      {parsed && (
        <Section title="미리보기">
          {parsed.weeks.map(({ week, count }) => (
            <AppText key={week} style={styles.summary}>{`${week} · ${count}단어`}</AppText>
          ))}
          {!hasErrors && <AppText style={styles.total}>{`총 ${words.length}개 단어`}</AppText>}
          <Issues issues={parsed.warnings} />
          <Issues issues={parsed.errors} color={colors.danger} />
          {hasErrors && <AppText style={styles.blocked}>오류를 고친 뒤 파일을 다시 골라 주세요.</AppText>}
          {!hasErrors && (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: replace }}
              onPress={() => setReplace((on) => !on)}
              style={[styles.toggle, replace && styles.rowSelected]}
            >
              <View style={[styles.box, replace && styles.boxChecked]}>{replace && <AppText style={styles.check}>✓</AppText>}</View>
              <AppText style={styles.toggleText}>이 파일에 없는 단어는 지우기 (차시 단위로 교체)</AppText>
            </Pressable>
          )}
          {!hasErrors && replace && removal.state === 'loading' && <AppText style={styles.note}>지워질 단어를 확인하는 중이에요.</AppText>}
          {!hasErrors && replace && removal.state === 'error' && <FormError message={`지워질 단어를 불러오지 못했어요. ${removal.error} 교체를 끄면 올릴 수 있어요.`} />}
          {!hasErrors && replace && removal.state === 'ready' && (
            <View style={styles.issues}>
              <AppText style={styles.removed}>{removal.words.length > 0 ? `지워질 단어 ${removal.words.length}개` : '지워질 단어가 없어요.'}</AppText>
              {removal.words.slice(0, MAX_REMOVED).map((word) => (
                <AppText key={word.id} style={styles.removedWord}>{`${word.chapter} · ${word.word}`}</AppText>
              ))}
              {removal.words.length > MAX_REMOVED && <AppText style={styles.removedWord}>{`외 ${removal.words.length - MAX_REMOVED}개`}</AppText>}
              {removal.words.length > 0 && <AppText style={styles.removed}>학생이 북마크한 단어도 함께 사라져요.</AppText>}
            </View>
          )}
        </Section>
      )}

      <Section title="올리기">
        <FormButton label={uploadLabel} disabled={!canUpload} onPress={() => void upload()} />
        <FormError message={uploadError} />
        {result !== '' && <AppText style={styles.result}>{result}</AppText>}
      </Section>
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
  code: { marginTop: 12, marginLeft: 2, color: colors.accent, fontSize: 13, fontWeight: '700' },
  create: { marginTop: 16 },
  createButton: { marginTop: 10 },
  summary: { marginLeft: 2, fontSize: 14, lineHeight: 22 },
  total: { marginTop: 4, marginLeft: 2, fontSize: 14, fontWeight: '800' },
  issues: { marginTop: 12, rowGap: 4 },
  issue: { marginLeft: 2, color: colors.muted, fontSize: 12, lineHeight: 18 },
  blocked: { marginTop: 12, marginLeft: 2, color: colors.danger, fontSize: 13, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#e9e5de', borderRadius: 14, backgroundColor: colors.surface },
  box: { width: 20, height: 20, borderWidth: 1, borderColor: '#c9c5d3', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  boxChecked: { borderColor: colors.accent, backgroundColor: colors.accent },
  check: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 16 },
  toggleText: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  removed: { marginLeft: 2, color: colors.danger, fontSize: 13, fontWeight: '700' },
  removedWord: { marginLeft: 2, color: colors.danger, fontSize: 12, lineHeight: 18 },
  result: { marginTop: 12, marginLeft: 2, color: colors.accent, fontSize: 13, fontWeight: '700' },
});
