import { describe, expect, it } from 'vitest';
import {
  dayTotal,
  foodToday,
  intakeFor,
  isComplete,
  mealDate,
  missingSlots,
  slotForTime,
} from './mealDay';
import type { MealEntry, MealSlot } from './meals';
import type { UserName } from './identity';

function entry(
  slot: MealSlot,
  calories: number,
  date = '2026-08-23',
  owner: UserName = 'Jeff',
): MealEntry {
  return {
    id: `${owner}-${date}-${slot}-${calories}`,
    owner,
    date,
    atTime: null,
    slot,
    photo: null,
    dish: slot,
    calories,
    source: 'typed',
    updatedAt: '2026-08-23T00:00:00Z',
  };
}

function at(hour: number, minute = 0): Date {
  return new Date(2026, 7, 23, hour, minute);
}

describe('mealDate', () => {
  it('files supper before 4am under the previous day', () => {
    expect(mealDate(at(1))).toBe('2026-08-22');
  });

  it('files breakfast under the current day', () => {
    expect(mealDate(at(7))).toBe('2026-08-23');
  });

  it('starts the new day at 4am exactly', () => {
    expect(mealDate(at(4))).toBe('2026-08-23');
  });

  it('keeps 3:59am on the previous day', () => {
    expect(mealDate(at(3, 59))).toBe('2026-08-22');
  });

  it('files late evening under the current day', () => {
    expect(mealDate(at(23, 30))).toBe('2026-08-23');
  });
});

describe('foodToday', () => {
  it('still reads as yesterday at 1am', () => {
    expect(foodToday(at(1))).toBe('2026-08-22');
  });

  it('keeps 3:59am on the previous day', () => {
    expect(foodToday(at(3, 59))).toBe('2026-08-22');
  });

  it('rolls over at 4am exactly', () => {
    expect(foodToday(at(4))).toBe('2026-08-23');
  });

  it('matches the calendar date through the rest of the day', () => {
    expect(foodToday(at(12))).toBe('2026-08-23');
    expect(foodToday(at(23, 59))).toBe('2026-08-23');
  });

  it('crosses a month boundary backwards', () => {
    expect(foodToday(new Date(2026, 8, 1, 2))).toBe('2026-08-31');
  });
});

describe('slotForTime', () => {
  it('covers every band', () => {
    expect(slotForTime(at(4))).toBe('breakfast');
    expect(slotForTime(at(10, 59))).toBe('breakfast');
    expect(slotForTime(at(11))).toBe('lunch');
    expect(slotForTime(at(15, 59))).toBe('lunch');
    expect(slotForTime(at(16))).toBe('dinner');
    expect(slotForTime(at(21, 59))).toBe('dinner');
    expect(slotForTime(at(22))).toBe('snack');
    expect(slotForTime(at(3, 59))).toBe('snack');
  });
});

describe('isComplete', () => {
  it('is false without dinner', () => {
    expect(isComplete([entry('breakfast', 300), entry('lunch', 600)])).toBe(false);
  });

  it('is true with all three', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('dinner', 700)];
    expect(isComplete(day)).toBe(true);
  });

  it('does not require a snack', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('dinner', 700)];
    expect(isComplete([...day, entry('snack', 150)])).toBe(true);
  });

  it('is false for an empty day', () => {
    expect(isComplete([])).toBe(false);
  });
});

describe('missingSlots', () => {
  it('names what is absent, in meal order', () => {
    expect(missingSlots([entry('lunch', 600)])).toEqual(['breakfast', 'dinner']);
  });

  it('is empty for a complete day', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('dinner', 700)];
    expect(missingSlots(day)).toEqual([]);
  });

  it('never names snack', () => {
    expect(missingSlots([])).toEqual(['breakfast', 'lunch', 'dinner']);
  });
});

describe('dayTotal', () => {
  it('sums every entry including snacks', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('snack', 150)];
    expect(dayTotal(day)).toBe(1050);
  });

  it('is zero for an empty day', () => {
    expect(dayTotal([])).toBe(0);
  });
});

describe('intakeFor', () => {
  const mixed = [
    entry('breakfast', 300, '2026-08-23', 'Jeff'),
    entry('lunch', 600, '2026-08-23', 'Rachel'),
    entry('dinner', 700, '2026-08-22', 'Jeff'),
    entry('dinner', 800, '2026-08-23', 'Jeff'),
  ];

  it('counts one person on one day', () => {
    expect(intakeFor(mixed, '2026-08-23', 'Jeff')).toBe(1100);
  });

  it('excludes the other person', () => {
    expect(intakeFor(mixed, '2026-08-23', 'Rachel')).toBe(600);
  });

  it('is zero for a day with nothing', () => {
    expect(intakeFor(mixed, '2026-08-21', 'Jeff')).toBe(0);
  });
});
