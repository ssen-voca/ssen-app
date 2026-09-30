import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'filter'
  | 'chevronDown'
  | 'account'
  | 'search'
  | 'viewCard'
  | 'viewList'
  | 'edit'
  | 'delete'
  | 'study'
  | 'home'
  | 'test'
  | 'add';

const SHAPES: Record<IconName, ReactNode> = {
  filter: <Path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />,
  chevronDown: <Path d="m7 10 5 5 5-5" />,
  account: (
    <>
      <Circle cx={12} cy={8} r={3} />
      <Path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="m16 16 4 4" />
    </>
  ),
  viewCard: (
    <>
      <Rect x={4} y={4} width={16} height={16} rx={3} />
      <Path d="M8 9h8M8 13h5" />
    </>
  ),
  viewList: (
    <>
      <Path d="M9 6h11M9 12h11M9 18h11" />
      <Circle cx={5} cy={6} r={1} />
      <Circle cx={5} cy={12} r={1} />
      <Circle cx={5} cy={18} r={1} />
    </>
  ),
  edit: <Path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10zM14 7l3 3" />,
  delete: <Path d="M4 7h16M9 4h6M7 7l1 13h8l1-13M10 11v5M14 11v5" />,
  study: (
    <>
      <Rect x={4} y={4} width={16} height={16} rx={3} />
      <Path d="M8 11h8M8 15h5" />
    </>
  ),
  home: (
    <>
      <Path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z" />
      <Path d="M9 20a4 4 0 0 1 4-4h6" />
    </>
  ),
  test: (
    <>
      <Path d="M9 4h6M9 20h6M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <Path d="m9 11 2 2 4-4" />
    </>
  ),
  add: <Path d="M12 5v14M5 12h14" />,
};

type Props = { name: IconName; size?: number; color: string };

export function Icon({ name, size = 24, color }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[name]}
    </Svg>
  );
}
