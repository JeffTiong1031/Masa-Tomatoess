export const NOTE_LINE_GAPS = ['tight', 'snug', 'roomy', 'wide'] as const;

export type NoteLineGap = (typeof NOTE_LINE_GAPS)[number];

export const DEFAULT_NOTE_LINE_GAP: NoteLineGap = 'tight';

export const NOTE_LINE_GAP_LABEL: Record<NoteLineGap, string> = {
  tight: 'Tight',
  snug: 'Snug',
  roomy: 'Roomy',
  wide: 'Wide',
};

export const NOTE_LINE_GAP_STYLE: Record<
  NoteLineGap,
  { lineHeight: number; paddingBlock: number }
> = {
  tight: { lineHeight: 1.3, paddingBlock: 0 },
  snug: { lineHeight: 1.5, paddingBlock: 4 },
  roomy: { lineHeight: 1.8, paddingBlock: 10 },
  wide: { lineHeight: 2.2, paddingBlock: 16 },
};

export function isNoteLineGap(value: string): value is NoteLineGap {
  return NOTE_LINE_GAPS.some((gap) => gap === value);
}

export function noteLineGapStyle(gap: NoteLineGap): {
  lineHeight: number;
  paddingBlock: number;
} {
  return NOTE_LINE_GAP_STYLE[gap];
}
