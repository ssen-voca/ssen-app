import { Redirect } from 'expo-router';

// 참여 코드는 이제 로그인·가입 폼에서 입력한다. 옛 경로로 들어오면 내 정보로 안내한다.
export default function ClassCodeRedirect() {
  return <Redirect href="/account" />;
}
