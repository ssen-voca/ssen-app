import { router } from 'expo-router';
import type { Credentials } from '../../api/auth';
import { ChoiceView } from '../../components/ChoiceView';
import { CredentialsForm } from '../../components/CredentialsForm';
import { useAuth } from '../../auth/AuthContext';

export default function SignupScreen() {
  const { signup } = useAuth();
  const submit = async (credentials: Credentials) => {
    await signup(credentials);
    router.replace('/account');
  };
  return (
    <ChoiceView
      kicker="SIGN UP"
      title={'처음이세요?\n가입해 볼게요'}
      description="선생님께 받은 참여 코드와 이름, 휴대폰 번호 뒤 4자리만 있으면 돼요. 번호 전체는 저장하지 않아요."
    >
      <CredentialsForm submitLabel="가입하기" onSubmit={submit} linkLabel="이미 가입했어요? 로그인" linkHref="/login" />
    </ChoiceView>
  );
}
