import { ChoiceCard } from '../../components/ChoiceCard';
import { ChoiceView } from '../../components/ChoiceView';
import { useWordForm } from '../../components/WordFormSheet';
import { useWords } from '../../data/WordsContext';

export default function AddScreen() {
  const { ready } = useWords();
  const { open } = useWordForm();
  return (
    <ChoiceView kicker="YOUR VOCABULARY" title={'단어를 어떻게\n추가할까요?'} description="원하는 방법을 선택해 단어장을 채워보세요.">
      <ChoiceCard icon="＋" title="직접 입력" sub="영단어와 뜻을 하나씩 추가" disabled={!ready} onPress={() => open()} />
      <ChoiceCard
        icon="↥"
        title="사진 · 파일 가져오기"
        sub="단어장 사진, 엑셀 또는 CSV"
        label="사진 · 파일 가져오기 (준비 중)"
        disabled
      />
    </ChoiceView>
  );
}
