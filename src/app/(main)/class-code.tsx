import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { SessionExpiredError } from '../../auth/session';
import { ChoiceView } from '../../components/ChoiceView';
import { Field, FormButton, FormError, FormInput } from '../../components/FormControls';
import { useToast } from '../../components/Toast';

export default function ClassCodeScreen() {
  const { status, saveClassCode } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/login" />;
  if (status === 'unreachable') return <Redirect href="/account" />;

  const submit = async () => {
    if (busy.current) return;
    const trimmed = code.trim();
    if (trimmed === '') {
      setError('참여 코드를 입력해 주세요');
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await saveClassCode(trimmed);
      toast('수업 참여 코드를 저장했어요');
      router.replace('/account');
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        // 인증 상태가 anonymous로 바뀌어 이 화면은 곧 /login으로 넘어가므로 메시지는 토스트로 남긴다.
        toast('로그인이 만료됐어요. 다시 로그인해 주세요');
      } else {
        setError(e instanceof ApiError ? e.message : '요청에 실패했어요');
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return (
    <ChoiceView
      kicker="CLASS CODE"
      title={'수업 참여 코드를\n입력해 주세요'}
      description="선생님께 받은 참여 코드를 입력하면 수업과 연결돼요. 나중에 내 정보에서도 입력할 수 있어요."
    >
      <Field label="참여 코드">
        <FormInput label="참여 코드" value={code} onChangeText={setCode} onSubmit={submit} maxLength={50} placeholder="예: ABC123" />
      </Field>
      <FormError message={error} />
      <View style={styles.actions}>
        <FormButton label="확인" onPress={submit} disabled={pending} />
        <FormButton label="나중에 하기" variant="ghost" onPress={() => router.replace('/account')} />
      </View>
    </ChoiceView>
  );
}

const styles = StyleSheet.create({
  actions: { rowGap: 9, marginTop: 18 },
});
