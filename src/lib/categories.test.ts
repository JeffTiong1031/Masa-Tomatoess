import { describe, it, expect } from 'vitest';
import {
  CATEGORY_MESSAGES,
  affectedCount,
  validateCategory,
  withCategoryFills,
  type Category,
} from './categories';
import type { CalendarEvent } from './calendarEvent';

function category(id: string, name: string, swatchId = 's1'): Category {
  return { id, name, swatchId, position: 0 };
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

describe('validateCategory', () => {
  it('accepts a fresh name', () => {
    expect(
      validateCategory({ name: 'Travel', swatchId: 's2' }, existing, null),
    ).toBeNull();
  });

  it('rejects a blank name', () => {
    expect(
      validateCategory({ name: '', swatchId: 's2' }, existing, null),
    ).toBe('nameRequired');
  });

  it('rejects a whitespace-only name', () => {
    expect(
      validateCategory({ name: '   ', swatchId: 's2' }, existing, null),
    ).toBe('nameRequired');
  });

  it('rejects a duplicate name', () => {
    expect(
      validateCategory({ name: 'Study', swatchId: 's2' }, existing, null),
    ).toBe('nameTaken');
  });

  it('rejects a duplicate differing only in case', () => {
    expect(
      validateCategory({ name: 'study', swatchId: 's2' }, existing, null),
    ).toBe('nameTaken');
  });

  it('rejects a duplicate differing only in surrounding space', () => {
    expect(
      validateCategory({ name: ' Study ', swatchId: 's2' }, existing, null),
    ).toBe('nameTaken');
  });

  it('lets a category keep its own name while being edited', () => {
    expect(
      validateCategory({ name: 'Study', swatchId: 's2' }, existing, 'a'),
    ).toBeNull();
  });

  it('still rejects taking another category name while editing', () => {
    expect(
      validateCategory({ name: 'Health', swatchId: 's2' }, existing, 'a'),
    ).toBe('nameTaken');
  });

  it('refuses a missing swatch', () => {
    expect(
      validateCategory({ name: 'Travel', swatchId: '' }, existing, null),
    ).toBe('swatchRequired');
  });

  it('has a message for every error', () => {
    expect(Object.keys(CATEGORY_MESSAGES).sort()).toEqual([
      'nameRequired',
      'nameTaken',
      'swatchRequired',
    ]);
  });

  it('asks to pick a colour when none is chosen', () => {
    expect(CATEGORY_MESSAGES.swatchRequired).toBe('Pick a colour.');
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

describe('withCategoryFills', () => {
  const cats = [category('a', 'Study', 's1'), category('b', 'Health', 's2')];
  const swatches = [
    { id: 's1', fill: '#B83A3A' },
    { id: 's2', fill: '#2C5FA8' },
  ];

  it('attaches each category’s fill from the matching swatch', () => {
    expect(withCategoryFills(cats, swatches)).toEqual([
      { ...cats[0], fill: '#B83A3A' },
      { ...cats[1], fill: '#2C5FA8' },
    ]);
  });

  it('falls back to muted when the swatch is not in the map', () => {
    expect(withCategoryFills([cats[0]], []).map((item) => item.fill)).toEqual([
      'var(--mt-text-muted)',
    ]);
  });
});
