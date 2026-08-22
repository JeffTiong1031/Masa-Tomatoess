import { describe, expect, it } from 'vitest';
import { storyOrder } from './mealStory';
import type { MealEntry, MealSlot } from './meals';
import type { UserName } from './identity';

function entry(
  id: string,
  slot: MealSlot,
  atTime: string | null,
  owner: UserName = 'Jeff',
): MealEntry {
  return {
    id,
    owner,
    date: '2026-08-23',
    atTime,
    slot,
    photo: null,
    dish: id,
    calories: 500,
    source: atTime === null ? 'typed' : 'photo',
    updatedAt: '2026-08-23T00:00:00Z',
  };
}

function ids(entries: MealEntry[]): string[] {
  return entries.map((entry) => entry.id);
}

describe('storyOrder', () => {
  it('sorts supper after 4am to the end of its day', () => {
    const day = [
      entry('supper', 'snack', '01:00'),
      entry('breakfast', 'breakfast', '08:00'),
      entry('dinner', 'dinner', '19:00'),
    ];
    expect(ids(storyOrder(day))).toEqual(['breakfast', 'dinner', 'supper']);
  });

  it('interleaves two people rather than grouping them', () => {
    const day = [
      entry('jeff-dinner', 'dinner', '19:30', 'Jeff'),
      entry('rachel-breakfast', 'breakfast', '07:30', 'Rachel'),
      entry('jeff-breakfast', 'breakfast', '08:00', 'Jeff'),
      entry('rachel-lunch', 'lunch', '12:30', 'Rachel'),
    ];
    expect(ids(storyOrder(day))).toEqual([
      'rachel-breakfast',
      'jeff-breakfast',
      'rachel-lunch',
      'jeff-dinner',
    ]);
  });

  it('places a timeless entry at its slot rather than at the start', () => {
    const day = [
      entry('breakfast', 'breakfast', '08:00'),
      entry('typed-dinner', 'dinner', null),
      entry('lunch', 'lunch', '12:00'),
    ];
    expect(ids(storyOrder(day))).toEqual(['breakfast', 'lunch', 'typed-dinner']);
  });

  it('never sorts breakfast after dinner', () => {
    const day = [entry('dinner', 'dinner', null), entry('breakfast', 'breakfast', null)];
    expect(ids(storyOrder(day))).toEqual(['breakfast', 'dinner']);
  });

  it('returns a single meal unchanged', () => {
    const day = [entry('only', 'lunch', '13:00')];
    expect(ids(storyOrder(day))).toEqual(['only']);
  });

  it('does not mutate its argument', () => {
    const day = [entry('b', 'dinner', '19:00'), entry('a', 'breakfast', '08:00')];
    storyOrder(day);
    expect(ids(day)).toEqual(['b', 'a']);
  });
});
