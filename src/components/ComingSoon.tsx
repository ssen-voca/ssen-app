import { ChoiceView } from './ChoiceView';

type Props = { kicker: string; title: string };

export function ComingSoon({ kicker, title }: Props) {
  return <ChoiceView kicker={kicker} title={title} description="곧 제공됩니다." />;
}
