import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { withdraw } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { session, SessionExpiredError } from '../auth/session';
import { digitsOnly, validatePhoneLast4 } from '../auth/validate';
import { ChoiceView } from '../components/ChoiceView';
import { Field, FormButton, FormError, FormInput } from '../components/FormControls';
import { useToast } from '../components/Toast';

export default function WithdrawScreen() {
  const { status, user, logout } = useAuth();
  const toast = useToast();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  // 탈퇴가 끝나 로그아웃되면 비로그인 Redirect(/login)가 잠깐 보이지 않도록 화면을 비운다.
  const done = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (done.current || status === 'loading') return null;
  if (status === 'unreachable') return <Redirect href="/account" />;
  if (status !== 'authenticated' || !user) return <Redirect href="/login" />;

  if (user.role !== 'STUDENT') {
    return (
      <ChoiceView
        kicker="MY ACCOUNT"
        title={'회원 탈퇴는\n학생 계정에서 해요'}
        description="교사 계정은 서버 설정으로 관리돼요."
      />
    );
  }

  const submit = async () => {
    if (busy.current) return;
    const invalid = validatePhoneLast4(pin);
    if (invalid) {
      setError(invalid);
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await session.call((token) => withdraw(token, pin));
      // 서버에서 계정이 지워진 뒤에만 이 기기에서 로그아웃한다. 실패했을 때는 로그인을 유지한다.
      done.current = true;
      await logout();
      toast('탈퇴했어요');
      router.replace('/');
    } catch (e) {
      done.current = false;
      if (mounted.current) {
        setError(e instanceof ApiError || e instanceof SessionExpiredError ? e.message : '요청에 실패했어요');
        if (e instanceof ApiError && e.status === 403) setPin('');
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return (
    <ChoiceView
      kicker="MY ACCOUNT"
      title="정말 탈퇴할까요?"
      description="탈퇴하면 계정, 북마크, 내가 만든 단어가 모두 지워지고 되돌릴 수 없어요. 선생님이 올린 단어와 다른 친구들에게는 영향이 없어요. 같은 학교·이름으로 다시 가입할 수는 있어요."
    >
      <View>
        <Field label="휴대폰 번호 뒤 4자리">
          <FormInput
            label="휴대폰 번호 뒤 4자리"
            value={pin}
            onChangeText={(value) => setPin(digitsOnly(value))}
            onSubmit={submit}
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            secureTextEntry
            autoComplete="off"
          />
        </Field>
        <FormError message={error} />
        <FormButton label="탈퇴하기" onPress={submit} disabled={pending || pin.length < 4} style={{ marginTop: 18 }} />
        <FormButton label="취소" variant="ghost" onPress={() => router.replace('/account')} style={{ marginTop: 10 }} />
      </View>
    </ChoiceView>
  );
}
