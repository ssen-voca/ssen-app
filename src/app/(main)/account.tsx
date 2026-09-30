import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { AppText } from '../../components/AppText';
import { ChoiceCard } from '../../components/ChoiceCard';
import { ChoiceView } from '../../components/ChoiceView';
import { FormButton } from '../../components/FormControls';
import { useToast } from '../../components/Toast';
import { colors } from '../../theme';

export default function AccountScreen() {
  const { status, user, logout, retry } = useAuth();
  const toast = useToast();

  if (status === 'loading') return null;

  if (status === 'unreachable') {
    return (
      <ChoiceView kicker="MY ACCOUNT" title={'내 정보를\n불러오지 못했어요'} description="단어장은 그대로 사용할 수 있어요.">
        <View style={styles.unreachable}>
          <AppText style={styles.unreachableText}>서버에 연결할 수 없어요</AppText>
          <FormButton label="다시 시도" onPress={retry} />
        </View>
      </ChoiceView>
    );
  }

  if (status === 'authenticated' && user) {
    return (
      <ChoiceView
        kicker="MY ACCOUNT"
        title={`${user.name}님,\n안녕하세요`}
        description={user.classCode ? `수업 참여 코드: ${user.classCode}` : '아직 수업 참여 코드가 없어요.'}
      >
        <ChoiceCard
          icon="✎"
          title={user.classCode ? '수업 참여 코드 변경' : '수업 참여 코드 입력'}
          sub="선생님께 받은 코드로 수업과 연결"
          onPress={() => router.push('/class-code')}
        />
        <ChoiceCard
          icon="↩"
          title="로그아웃"
          sub="이 기기에서 로그아웃"
          onPress={() => {
            void logout();
            toast('로그아웃했어요');
          }}
        />
      </ChoiceView>
    );
  }

  return (
    <ChoiceView
      kicker="MY ACCOUNT"
      title={'내 단어장을\n더 편하게 사용해요'}
      description="로그인하고 수업 참여 코드를 등록해 보세요. 로그인 없이도 단어장은 계속 쓸 수 있어요."
    >
      <ChoiceCard icon="✓" title="로그인" sub="이름과 휴대폰 번호 뒤 4자리" onPress={() => router.push('/login')} />
      <ChoiceCard icon="＋" title="회원가입" sub="처음이라면 여기서 시작해요" onPress={() => router.push('/signup')} />
      <ChoiceCard icon="◌" title="둘러보기" sub="로그인 없이 단어장 계속 쓰기" onPress={() => router.navigate('/')} />
    </ChoiceView>
  );
}

const styles = StyleSheet.create({
  unreachable: { rowGap: 14 },
  unreachableText: { color: colors.danger, fontSize: 13 },
});
