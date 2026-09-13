import { describe, expect, it } from 'vitest';
import {
  coverStart,
  loopHome,
  loopedCards,
  nextIndex,
  prevIndex,
  snapLoop,
  stepLoop,
} from './carousel';

describe('carousel', () => {
  it('brings the next card in from the right and the previous from the left', () => {
    expect(coverStart(1)).toBe(100);
    expect(coverStart(-1)).toBe(-100);
  });

  it('steps forward', () => {
    expect(nextIndex(0, 3)).toBe(1);
  });

  it('wraps the last card round to the first', () => {
    expect(nextIndex(2, 3)).toBe(0);
  });

  it('steps back', () => {
    expect(prevIndex(2, 3)).toBe(1);
  });

  it('wraps the first card round to the last', () => {
    expect(prevIndex(0, 3)).toBe(2);
  });

  it('stays on a single card', () => {
    expect(nextIndex(0, 1)).toBe(0);
    expect(prevIndex(0, 1)).toBe(0);
  });

  it('stays at zero with no cards', () => {
    expect(nextIndex(0, 0)).toBe(0);
    expect(prevIndex(0, 0)).toBe(0);
  });
});

describe('looped cards', () => {
  it('pins a copy of the last card in front and the first card at the end', () => {
    expect(loopedCards(['today', 'baby'])).toEqual([
      'baby',
      'today',
      'baby',
      'today',
    ]);
    expect(loopHome(2)).toBe(1);
  });

  it('keeps sliding left from the last card onto a copy of the first', () => {
    expect(stepLoop(2, 2, 1)).toEqual({ index: 3, snap: 1 });
  });

  it('keeps sliding right from the first card onto a copy of the last', () => {
    expect(stepLoop(1, 2, -1)).toEqual({ index: 0, snap: 2 });
  });

  it('does not wrap a middle step', () => {
    expect(stepLoop(1, 3, 1)).toEqual({ index: 2, snap: null });
  });

  it('snaps the copied first card back to the real first card', () => {
    expect(snapLoop(3, 2)).toBe(1);
    expect(snapLoop(0, 2)).toBe(2);
    expect(snapLoop(2, 2)).toBeNull();
  });
});
