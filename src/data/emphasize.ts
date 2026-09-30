import type { Word } from './types';

export type Segment = { text: string; match: boolean };

function escapeRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function emphasize(text: string, term: string, english: boolean): Segment[] {
  const target = term.trim();
  if (text === '') return [];
  if (target === '') return [{ text, match: false }];
  const pattern = english
    ? new RegExp(`(^|[^A-Za-z])(${escapeRegExp(target)}(?:s|es|d|ed|ing)?)(?=$|[^A-Za-z])`, 'gi')
    : new RegExp(`(${escapeRegExp(target)})`, 'g');
  const segments: Segment[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const lead = english ? found[1].length : 0;
    const matched = english ? found[2] : found[1];
    const start = (found.index ?? 0) + lead;
    if (start > last) segments.push({ text: text.slice(last, start), match: false });
    segments.push({ text: matched, match: true });
    last = start + matched.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments;
}

export function koreanHighlight(word: Word): string {
  const candidates = [word.details.exampleMeaning, ...word.meanings.flatMap((meaning) => meaning.split(/[,;]+/))]
    .map((value) => value.trim())
    .filter(Boolean);
  return candidates.find((value) => word.details.exampleKo.includes(value)) ?? '';
}
