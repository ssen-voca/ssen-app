import { router } from 'expo-router';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { accountHeading } from '../../auth/accountHeading';
import { useAuth } from '../../auth/AuthContext';
import { AppText } from '../../components/AppText';
import { ChoiceCard } from '../../components/ChoiceCard';
import { ChoiceView } from '../../components/ChoiceView';
import { FormButton } from '../../components/FormControls';
import { useToast } from '../../components/Toast';
import { colors, isNarrow } from '../../theme';

export default function AccountScreen() {
  const { status, user, logout, retry } = useAuth();
  const toast = useToast();
  const { width, fontScale } = useWindowDimensions();
  const compactIllustration = isNarrow(width) || fontScale > 1.1;

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
    const teacher = user.role === 'TEACHER';
    const { title, description } = accountHeading(user);
    return (
      <ChoiceView kicker="MY ACCOUNT" title={title} description={description}>
        {teacher && <ChoiceCard icon="↑" title="단어 엑셀 올리기" sub="수업에 단어를 한꺼번에 올려요" onPress={() => router.push('/upload')} />}
        {teacher && <ChoiceCard icon="≡" title="올린 단어 관리" sub="올린 단어를 보고 고치거나 지워요" onPress={() => router.push('/manage-words')} />}
        {teacher && <ChoiceCard icon="◎" title="수업 관리" sub="이름·참여·학생을 관리해요" onPress={() => router.push('/manage-classes')} />}
        {user.role === 'STUDENT' && (
          <ChoiceCard
            icon="＋"
            title={user.classroom ? '수업 바꾸기' : '수업 참여하기'}
            sub={user.classroom ? '다른 참여코드로 옮겨요' : '선생님께 받은 참여코드로 들어가요'}
            onPress={() => router.push('/join')}
          />
        )}
        {user.role === 'STUDENT' && user.classroom && (
          <ChoiceCard icon="−" title="수업 나가기" sub="선생님이 올린 단어가 보이지 않게 돼요" onPress={() => router.push('/leave-classroom')} />
        )}
        <ChoiceCard
          icon="↩"
          title="로그아웃"
          sub="이 기기에서 로그아웃"
          onPress={() => {
            void logout();
            toast('로그아웃했어요');
          }}
        />
        {user.role === 'STUDENT' && (
          <ChoiceCard icon="✕" title="회원 탈퇴" sub="계정과 내가 만든 단어를 지워요" onPress={() => router.push('/withdraw')} />
        )}
      </ChoiceView>
    );
  }

  return (
    <ChoiceView
      kicker="MY ACCOUNT"
      title={'내 단어장을\n더 편하게 사용해요'}
      description="학교와 이름으로 로그인해 보세요. 로그인 없이도 단어장은 계속 쓸 수 있어요."
      titleIllustration={
        <Image
          source={require('../../../assets/seulki-B.png')}
          resizeMode="contain"
          accessible={false}
          aria-hidden
          style={[styles.illustration, compactIllustration && styles.compactIllustration]}
        />
      }
    >
      <ChoiceCard icon="✓" title="로그인" sub="학교, 이름, 휴대폰 번호 뒤 4자리" onPress={() => router.push('/login')} />
      <ChoiceCard icon="＋" title="회원가입" sub="처음이라면 여기서 시작해요" onPress={() => router.push('/signup')} />
      <ChoiceCard icon="◌" title="둘러보기" sub="로그인 없이 단어장 계속 쓰기" onPress={() => router.navigate('/')} />
    </ChoiceView>
  );
}

const styles = StyleSheet.create({
  illustration: { position: 'absolute', top: 67, right: 23, width: 62, height: 94, pointerEvents: 'none' },
  compactIllustration: { top: 4, width: 35, height: 52 },
  unreachable: { rowGap: 14 },
  unreachableText: { color: colors.danger, fontSize: 13 },
});
