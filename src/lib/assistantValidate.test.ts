import { describe, it, expect } from 'vitest';
import { dateProblem, timeProblem, duplicateHandleIn } from './assistantValidate';

const TODAY = '2026-09-02';

describe('dateProblem', () => {
  it('accepts an empty field', () => {
    expect(dateProblem('', TODAY)).toBeNull();
  });

  it('accepts a real date', () => {
    expect(dateProblem('2026-12-14', TODAY)).toBeNull();
  });

  it('rejects a shape it cannot read', () => {
    expect(dateProblem('14 Dec', TODAY)).toEqual({ kind: 'badDate', value: '14 Dec' });
  });

  it('rejects a day that does not exist', () => {
    expect(dateProblem('2026-02-30', TODAY)).toEqual({ kind: 'badDate', value: '2026-02-30' });
  });

  it('rejects a year far in the future and names it', () => {
    expect(dateProblem('2087-12-14', TODAY)).toEqual({ kind: 'yearOutOfRange', year: 2087 });
  });

  it('rejects a year far in the past and names it', () => {
    expect(dateProblem('1999-01-01', TODAY)).toEqual({ kind: 'yearOutOfRange', year: 1999 });
  });

  it('allows exactly five years out on both sides', () => {
    expect(dateProblem('2031-09-02', TODAY)).toBeNull();
    expect(dateProblem('2021-09-02', TODAY)).toBeNull();
  });
});

describe('timeProblem', () => {
  it('accepts an empty field', () => {
    expect(timeProblem('')).toBeNull();
  });

  it('accepts a real time', () => {
    expect(timeProblem('09:30')).toBeNull();
  });

  it('rejects an impossible hour', () => {
    expect(timeProblem('25:99')).toEqual({ kind: 'badTime', value: '25:99' });
  });

  it('rejects an hour out of range on its own', () => {
    expect(timeProblem('24:00')).toEqual({ kind: 'badTime', value: '24:00' });
  });

  it('rejects a minute out of range on its own', () => {
    expect(timeProblem('12:60')).toEqual({ kind: 'badTime', value: '12:60' });
  });

  it('rejects a shape it cannot read', () => {
    expect(timeProblem('9am')).toEqual({ kind: 'badTime', value: '9am' });
  });
});

describe('duplicateHandleIn', () => {
  it('passes a plan with distinct handles', () => {
    expect(duplicateHandleIn([{ handle: 'e1' }, { handle: 'e2' }])).toBeNull();
  });

  it('ignores the empty handles that adds carry', () => {
    expect(duplicateHandleIn([{ handle: '' }, { handle: '' }])).toBeNull();
  });

  it('names the handle used twice', () => {
    expect(duplicateHandleIn([{ handle: 'e3' }, { handle: 'e3' }])).toEqual({
      kind: 'duplicateHandle',
      handle: 'e3',
    });
  });
});
