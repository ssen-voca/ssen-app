import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { ChoiceView } from '../components/ChoiceView';
import { FormButton, FormError, FormInput } from '../components/FormControls';
import { useToast } from '../components/Toast';
import { colors } from '../theme';
import { createClassroom, listClassrooms, publishWords, type TeacherClassroom } from './api';
import { parseWorkbook, type ParseIssue, type ParseResult } from './excel';
import { readWorkbook } from './readWorkbook';

const MAX_NAME = 100;
const MAX_ISSUES = 20;
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '요청에 실패했어요');

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
      const { created, updated } = await publishWords(selected.id, parsed.words);
      if (!mounted.current) return;
      const message = `새로 ${created}개, 고친 ${updated}개를 올렸어요.`;
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

  const hasErrors = !!parsed && parsed.errors.length > 0;
  const words = parsed?.words ?? [];
  const canUpload = !!selected && !!parsed && !hasErrors && words.length > 0 && !uploading;

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
        </Section>
      )}

      <Section title="올리기">
        <FormButton label={hasErrors ? '오류가 있어 올릴 수 없어요' : `${words.length}개 단어 올리기`} disabled={!canUpload} onPress={() => void upload()} />
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
  result: { marginTop: 12, marginLeft: 2, color: colors.accent, fontSize: 13, fontWeight: '700' },
});
