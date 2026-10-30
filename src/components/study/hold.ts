import { Platform, type PressableProps, type ViewStyle } from 'react-native';

// 꾹 누르는 동안 글자 선택이 되지 않게 한다. userSelect는 웹에서만 동작하고 네이티브 View는 무시한다.
// (RN 타입은 userSelect를 Text에만 허용해서 캐스팅한다.)
export const HOLD_STYLE = { userSelect: 'none' } as ViewStyle;

type HoldProps = Pick<PressableProps, 'onPressIn' | 'onPressOut' | 'onLongPress'> & {
  onContextMenu?: (event: { preventDefault: () => void }) => void;
};

export function holdProps(setHeld: (held: boolean) => void): HoldProps {
  return {
    onPressIn: () => setHeld(true),
    onPressOut: () => setHeld(false),
    // react-native-web은 onLongPress가 있어야 터치 길게 누르기의 contextmenu에서 눌림을 끊지 않는다.
    onLongPress: () => {},
    ...(Platform.OS === 'web' ? { onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault() } : {}),
  };
}
