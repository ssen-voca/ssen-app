import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { leaveClassroom } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { session, SessionExpiredError } from '../auth/session';
import { useBookmarks } from '../bookmarks/BookmarksContext';
import { ChoiceView } from '../components/ChoiceView';
import { FormButton, FormError } from '../components/FormControls';
import { useToast } from '../components/Toast';

export default function LeaveScreen() {
  const { status, user, refreshUser } = useAuth();
  const { reload } = useBookmarks();
  const toast = useToast();
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
    return <ChoiceView kicker="CLASS" title={'수업 나가기는\n학생 계정에서 해요'} description="교사 계정은 수업에 속하지 않아요." />;
  }

  if (!user.classroom) {
    return (
      <ChoiceView
        kicker="CLASS"
        title={'지금 속한 수업이\n없어요'}
        description="선생님께 받은 참여코드를 입력하면 수업에 들어갈 수 있어요."
      >
        <FormButton label="수업 참여하기" onPress={() => router.push('/join')} />
      </ChoiceView>
    );
  }

  const submit = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await session.call((token) => leaveClassroom(token));
      // 나가기는 이미 끝났다. 사용자 정보 갱신이 실패해도 오류로 보이지 않고, 다음 실행 때 반영된다.
      try {
        await refreshUser();
      } catch {}
      reload();
      toast('수업에서 나갔어요');
      router.replace('/account');
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
      title={'수업에서\n나갈까요?'}
      description={`${user.classroom.name} 수업에서 나가면 선생님이 올린 단어가 보이지 않아요. 내가 만든 단어와 북마크는 그대로이고, 같은 참여코드로 다시 들어오면 돌아와요.`}
    >
      <View>
        <FormError message={error} />
        <FormButton label="수업 나가기" onPress={submit} disabled={pending} />
        <FormButton label="취소" variant="ghost" onPress={() => router.replace('/account')} style={{ marginTop: 10 }} />
      </View>
    </ChoiceView>
  );
}
