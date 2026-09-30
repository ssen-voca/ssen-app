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
};

export const cardShadow = '0 10px 24px rgba(38, 48, 42, 0.07)';

export const fonts = {
  body: Platform.select({
    web: 'Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: undefined,
  }),
  serif: Platform.select({ web: 'Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' }),
};

export const CANVAS = { width: 402, height: 874, radius: 28 };

export function isFramed(viewportWidth: number): boolean {
  return viewportWidth > CANVAS.width;
}

export function isNarrow(viewportWidth: number): boolean {
  return viewportWidth <= 380;
}
