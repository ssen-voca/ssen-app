import { Platform, type PressableProps, type ViewStyle } from 'react-native';

// 꾹 누르는 동안 글자 선택이나 길게 누르기 메뉴가 뜨지 않게 한다. (RN 타입은 userSelect를 Text에만 허용하지만 웹/네이티브 View에서도 동작한다.)
export const HOLD_STYLE = { userSelect: 'none' } as ViewStyle;

type HoldProps = Pick<PressableProps, 'onPressIn' | 'onPressOut'> & {
  onContextMenu?: (event: { preventDefault: () => void }) => void;
};

export function holdProps(setHeld: (held: boolean) => void): HoldProps {
  return {
    onPressIn: () => setHeld(true),
    onPressOut: () => setHeld(false),
    ...(Platform.OS === 'web' ? { onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault() } : {}),
  };
}
