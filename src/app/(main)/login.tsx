import { Redirect } from 'expo-router';
import { ChoiceView } from '../../components/ChoiceView';
import { CredentialsForm } from '../../components/CredentialsForm';
import { useAuth } from '../../auth/AuthContext';

export default function LoginScreen() {
  const { status, login } = useAuth();
  if (status === 'authenticated') return <Redirect href="/account" />;
  return (
    <ChoiceView
      kicker="LOGIN"
      title={'이름과 번호 뒤 4자리로\n로그인해요'}
      description="가입할 때 입력한 이름과 휴대폰 번호 뒤 4자리를 입력해 주세요."
    >
      <CredentialsForm submitLabel="로그인" onSubmit={login} linkLabel="처음이세요? 회원가입" linkHref="/signup" />
    </ChoiceView>
  );
}
