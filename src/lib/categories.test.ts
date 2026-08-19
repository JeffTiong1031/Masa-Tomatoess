import { describe, it, expect } from 'vitest';
import {
  CATEGORY_MESSAGES,
  SWATCHES,
  affectedCount,
  swatchToken,
  validateCategory,
  type Category,
} from './categories';
import type { CalendarEvent } from './calendarEvent';

function category(id: string, name: string, swatch = 1 as const): Category {
  return { id, name, swatch, position: 0 };
}

function event(id: string, categoryId: string | null): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title: `Event ${id}`,
    date: '2026-08-25',
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown: false,
    categoryId,
  };
}

const existing = [category('a', 'Study'), category('b', 'Health')];

describe('SWATCHES', () => {
  it('has at least six entries', () => {
    expect(SWATCHES.length).toBeGreaterThanOrEqual(6);
  });

  it('is numbered contiguously from one', () => {
    expect(SWATCHES.map((s) => s.index)).toEqual(
      SWATCHES.map((_, i) => i + 1),
    );
  });

  it('names a token rather than a hex value', () => {
    for (const swatch of SWATCHES) {
      expect(swatch.token).toMatch(/^--mt-tag-\d$/);
    }
  });
});

describe('swatchToken', () => {
  it('resolves an index to its custom property', () => {
    expect(swatchToken(1)).toBe('--mt-tag-1');
  });
});

describe('validateCategory', () => {
  it('accepts a fresh name', () => {
    expect(validateCategory({ name: 'Travel', swatch: 2 }, existing, null)).toBeNull();
  });

  it('rejects a blank name', () => {
    expect(validateCategory({ name: '', swatch: 2 }, existing, null)).toBe(
      'nameRequired',
    );
  });

  it('rejects a whitespace-only name', () => {
    expect(validateCategory({ name: '   ', swatch: 2 }, existing, null)).toBe(
      'nameRequired',
    );
  });

  it('rejects a duplicate name', () => {
    expect(validateCategory({ name: 'Study', swatch: 2 }, existing, null)).toBe(
      'nameTaken',
    );
  });

  it('rejects a duplicate differing only in case', () => {
    expect(validateCategory({ name: 'study', swatch: 2 }, existing, null)).toBe(
      'nameTaken',
    );
  });

  it('rejects a duplicate differing only in surrounding space', () => {
    expect(validateCategory({ name: ' Study ', swatch: 2 }, existing, null)).toBe(
      'nameTaken',
    );
  });

  it('lets a category keep its own name while being edited', () => {
    expect(validateCategory({ name: 'Study', swatch: 2 }, existing, 'a')).toBeNull();
  });

  it('still rejects taking another category name while editing', () => {
    expect(validateCategory({ name: 'Health', swatch: 2 }, existing, 'a')).toBe(
      'nameTaken',
    );
  });

  it('rejects a swatch past the end of the ramp', () => {
    const beyond = (SWATCHES.length + 1) as 8;
    expect(validateCategory({ name: 'Travel', swatch: beyond }, existing, null)).toBe(
      'swatchOutOfRange',
    );
  });

  it('has a message for every error', () => {
    expect(Object.keys(CATEGORY_MESSAGES).sort()).toEqual([
      'nameRequired',
      'nameTaken',
      'swatchOutOfRange',
    ]);
  });
});

describe('affectedCount', () => {
  const events = [event('1', 'a'), event('2', 'a'), event('3', 'b'), event('4', null)];

  it('counts only events holding that category', () => {
    expect(affectedCount(events, 'a')).toBe(2);
  });

  it('never counts untagged events', () => {
    expect(affectedCount(events, 'c')).toBe(0);
  });
});
