import { describe, it, expect } from 'vitest';
import { EMPTY_DATE_HINT, formatDateInputDisplay } from './dateInputHint';

describe('formatDateInputDisplay', () => {
  it('shows dd/mm/yyyy when the date field is empty so phones still have a visible cue', () => {
    expect(formatDateInputDisplay('')).toBe(EMPTY_DATE_HINT);
    expect(EMPTY_DATE_HINT).toBe('dd/mm/yyyy');
  });

  it('shows the chosen day in dd/mm/yyyy once a date is set', () => {
    expect(formatDateInputDisplay('2026-09-08')).toBe('08/09/2026');
  });
});
