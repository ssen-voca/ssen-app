import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { joinClassroom } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { session, SessionExpiredError } from '../auth/session';
import { filterClassCodeInput, normalizeClassCode, validateClassCode } from '../auth/validate';
import { useBookmarks } from '../bookmarks/BookmarksContext';
import { ChoiceView } from '../components/ChoiceView';
import { Field, FormButton, FormError, FormInput } from '../components/FormControls';
import { useToast } from '../components/Toast';

export default function JoinScreen() {
  const { status, user, refreshUser } = useAuth();
  const { reload } = useBookmarks();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (status === 'loading') return null;
  if (status === 'unreachable') return <Redirect href="/account" />;
  if (status !== 'authenticated' || !user) return <Redirect href="/login" />;

  if (user.role !== 'STUDENT') {
    return (
      <ChoiceView
        kicker="CLASS"
        title={'수업 참여는\n학생 계정으로 해요'}
        description="교사 계정은 참여코드를 입력하지 않아요. 학생 계정으로 로그인하면 수업에 참여할 수 있어요."
      />
    );
  }

  const submit = async () => {
    if (busy.current) return;
    const invalid = validateClassCode(code);
    if (invalid) {
      setError(invalid);
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const classroom = await session.call((token) => joinClassroom(token, normalizeClassCode(code)));
      // 참여는 이미 끝났다. 사용자 정보 갱신이 실패해도 오류로 보이지 않고, 다음 실행 때 반영된다.
      try {
        await refreshUser();
      } catch {}
      reload();
      toast(`${classroom.name} 수업에 참여했어요`);
      router.replace('/');
    } catch (e) {
      if (mounted.current) setError(e instanceof ApiError || e instanceof SessionExpiredError ? e.message : '요청에 실패했어요');
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return (
    <ChoiceView
      kicker="CLASS"
      title={'수업 참여코드를\n입력해요'}
      description={
        '선생님께 받은 6자리 코드를 입력하면 선생님이 올린 단어장을 볼 수 있어요.' +
        (user.classroom ? ` 지금은 ${user.classroom.name} 수업에 있어요. 다른 코드를 입력하면 수업이 바뀌어요.` : '')
      }
    >
      <View>
        <Field label="참여 코드">
          <FormInput
            label="참여 코드"
            value={code}
            // maxLength는 걸지 않는다: 공백이 낀 코드를 붙여 넣으면 브라우저가 공백까지 세어 마지막 글자를 잘라 버린다. 6자 제한은 필터가 한다.
            onChangeText={(value) => setCode(filterClassCodeInput(value))}
            onSubmit={submit}
            placeholder="예: ABC234"
            autoCapitalize="characters"
          />
        </Field>
        <FormError message={error} />
        <FormButton label="수업 참여하기" onPress={submit} disabled={pending} style={{ marginTop: 18 }} />
      </View>
    </ChoiceView>
  );
}
