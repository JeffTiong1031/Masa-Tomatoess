import type { DocCaret } from './noteEdit';

export const NOTE_SELECTION_FILL =
  'color-mix(in srgb, Highlight 32%, transparent)';

export function noteSelectionSlice(
  start: DocCaret,
  end: DocCaret,
  lineIndex: number,
  lineLength: number,
): { start: number; end: number } | null {
  if (start.index === end.index || lineIndex < start.index || lineIndex > end.index) {
    return null;
  }
  if (lineIndex === start.index) {
    return start.offset < lineLength
      ? { start: start.offset, end: lineLength }
      : null;
  }
  if (lineIndex === end.index) {
    return end.offset > 0 ? { start: 0, end: end.offset } : null;
  }
  return lineLength > 0 ? { start: 0, end: lineLength } : null;
}
