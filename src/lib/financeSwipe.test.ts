import { describe, expect, it } from 'vitest';
import { swipeOutcome } from './financeSwipe';

describe('swiping a row', () => {
  it('springs back under a third of the width', () => {
    expect(swipeOutcome(-99, 0, 300)).toBe('spring');
  });

  it('deletes past a third of the width', () => {
    expect(swipeOutcome(-100, 4, 300)).toBe('delete');
  });

  it('springs back when swiped the other way', () => {
    expect(swipeOutcome(200, 0, 300)).toBe('spring');
  });

  it('treats a mostly vertical drag as a scroll', () => {
    expect(swipeOutcome(-120, 160, 300)).toBe('scroll');
  });
});
