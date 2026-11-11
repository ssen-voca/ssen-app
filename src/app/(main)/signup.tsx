import { router } from 'expo-router';
import { useState } from 'react';
import { signup, type Credentials } from '../../api/auth';
import { ChoiceView } from '../../components/ChoiceView';
import { CredentialsForm } from '../../components/CredentialsForm';
import { FormButton } from '../../components/FormControls';

export default function SignupScreen() {
  const [done, setDone] = useState(false);
  // 가입만 하고 로그인은 하지 않는다. 돌려받은 토큰은 쓰지 않는다.
  const submit = async (credentials: Credentials) => {
    await signup(credentials);
    setDone(true);
  };
  if (done) {
    return (
      <ChoiceView kicker="SIGN UP" title="가입이 완료됐어요" description="이제 로그인해 주세요.">
        <FormButton label="로그인하러 가기" onPress={() => router.replace('/login')} />
      </ChoiceView>
    );
  }
  return (
    <ChoiceView
      kicker="SIGN UP"
      title={'처음이세요?\n가입해 볼게요'}
      description="학교와 이름, 휴대폰 번호 뒤 4자리만 있으면 돼요. 번호 전체는 저장하지 않아요."
    >
      <CredentialsForm submitLabel="가입하기" onSubmit={submit} linkLabel="이미 가입했어요? 로그인" linkHref="/login" />
    </ChoiceView>
  );
}
