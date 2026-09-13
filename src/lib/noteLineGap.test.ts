import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTE_LINE_GAP,
  NOTE_LINE_GAPS,
  NOTE_LINE_GAP_STYLE,
  isNoteLineGap,
  noteLineGapStyle,
  noteTickLineBox,
  noteTickLineEm,
} from './noteLineGap';

describe('note line gaps', () => {
  it('offers four sizes and starts on the smallest', () => {
    expect(NOTE_LINE_GAPS).toEqual(['tight', 'snug', 'roomy', 'wide']);
    expect(DEFAULT_NOTE_LINE_GAP).toBe('tight');
    expect(NOTE_LINE_GAP_STYLE.tight.paddingBlock).toBe(0);
  });

  it('grows padding and line height on each step', () => {
    for (let index = 1; index < NOTE_LINE_GAPS.length; index += 1) {
      const smaller = NOTE_LINE_GAP_STYLE[NOTE_LINE_GAPS[index - 1]];
      const larger = NOTE_LINE_GAP_STYLE[NOTE_LINE_GAPS[index]];
      expect(larger.paddingBlock).toBeGreaterThan(smaller.paddingBlock);
      expect(larger.lineHeight).toBeGreaterThan(smaller.lineHeight);
    }
  });

  it('accepts only those four names', () => {
    expect(isNoteLineGap('tight')).toBe(true);
    expect(isNoteLineGap('huge')).toBe(false);
    expect(noteLineGapStyle('snug')).toEqual(NOTE_LINE_GAP_STYLE.snug);
  });

  it('sizes the tick to one line so its centre matches the words at every gap', () => {
    const font = 16;
    const oldTick = 44;
    for (const name of NOTE_LINE_GAPS) {
      const line = font * noteLineGapStyle(name).lineHeight;
      const tick = font * noteTickLineEm(name);
      expect(tick).toBe(line);
      expect(tick / 2).toBe(line / 2);
      expect(oldTick / 2).not.toBe(line / 2);
      expect(noteTickLineBox(name)).toEqual({
        height: `${noteLineGapStyle(name).lineHeight}em`,
      });
    }
  });
});
