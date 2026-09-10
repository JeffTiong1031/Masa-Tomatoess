import { describe, expect, it } from 'vitest';
import { nextIndex, prevIndex } from './carousel';

describe('carousel', () => {
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
