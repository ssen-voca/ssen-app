import { Platform } from 'react-native';

export const colors = {
  page: '#f4f5f4',
  bg: '#f5f2eb',
  surface: '#fffefd',
  text: '#24302e',
  muted: '#8b9692',
  line: '#e7e3dc',
  accent: '#2d7b71',
  accentDark: '#21665f',
  accentSoft: '#eaf4f0',
  danger: '#ef4e4e',
};

export const cardShadow = '0 10px 24px rgba(38, 48, 42, 0.07)';

// 한글 가독성이 좋은 Pretendard. 웹에서는 src/app/_layout.tsx에서 CSS를 불러오고, 못 불러오면 시스템 한글 글꼴로 대체된다.
const SANS_WEB =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Segoe UI", sans-serif';

export const fonts = {
  body: Platform.select({ web: SANS_WEB, default: undefined }),
  // 표제어·제목도 같은 글꼴을 쓴다(예전 serif에서 변경). 값 이름은 그대로 두어 사용처를 바꾸지 않는다.
  serif: Platform.select({ web: SANS_WEB, default: undefined }),
};

export const CANVAS = { width: 402, height: 874, radius: 28 };

export function isFramed(viewportWidth: number): boolean {
  return viewportWidth > CANVAS.width;
}

export function isNarrow(viewportWidth: number): boolean {
  return viewportWidth <= 380;
}
