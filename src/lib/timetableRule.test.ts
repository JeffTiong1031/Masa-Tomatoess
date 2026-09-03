import { describe, expect, it } from 'vitest';
import {
  ruleMessage,
  sortRules,
  validateRule,
  type RuleDraft,
  type TimetableRule,
} from './timetableRule';

function rule(over: Partial<TimetableRule> = {}): TimetableRule {
  return {
    id: 'r1',
    owner: 'Jeff',
    weekday: 3,
    title: 'Maths',
    startTime: '09:00',
    endTime: '11:00',
    swatch: 1,
    ...over,
  };
}

function draft(over: Partial<RuleDraft> = {}): RuleDraft {
  return {
    weekday: 3,
    title: 'Physics',
    startTime: '13:00',
    endTime: '15:00',
    swatch: 2,
    ...over,
  };
}

describe('validateRule', () => {
  it('rejects an empty title', () => {
    expect(validateRule(draft({ title: '' }), 'Jeff', [], null)).toEqual({
      kind: 'titleRequired',
    });
  });

  it('rejects a title that is only whitespace', () => {
    expect(validateRule(draft({ title: '   ' }), 'Jeff', [], null)).toEqual({
      kind: 'titleRequired',
    });
  });

  it('rejects an end before the start', () => {
    const bad = draft({ startTime: '15:00', endTime: '13:00' });
    expect(validateRule(bad, 'Jeff', [], null)).toEqual({
      kind: 'endNotAfterStart',
    });
  });

  it('rejects an end equal to the start', () => {
    const bad = draft({ startTime: '13:00', endTime: '13:00' });
    expect(validateRule(bad, 'Jeff', [], null)).toEqual({
      kind: 'endNotAfterStart',
    });
  });

  it('rejects a partial overlap and names what it clashed with', () => {
    const clash = draft({ startTime: '10:00', endTime: '12:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)).toEqual({
      kind: 'overlaps',
      title: 'Maths',
      startTime: '09:00',
      endTime: '11:00',
    });
  });

  it('rejects a new rule fully inside an existing one', () => {
    const clash = draft({ startTime: '09:30', endTime: '10:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)?.kind).toBe('overlaps');
  });

  it('rejects a new rule that fully contains an existing one', () => {
    const clash = draft({ startTime: '08:00', endTime: '12:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)?.kind).toBe('overlaps');
  });

  it('rejects an identical span', () => {
    const clash = draft({ startTime: '09:00', endTime: '11:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)?.kind).toBe('overlaps');
  });

  it('allows two rules that merely touch', () => {
    const after = draft({ startTime: '11:00', endTime: '12:00' });
    expect(validateRule(after, 'Jeff', [rule()], null)).toBeNull();
  });

  it('allows the same span on a different weekday', () => {
    const elsewhere = draft({ weekday: 4, startTime: '09:00', endTime: '11:00' });
    expect(validateRule(elsewhere, 'Jeff', [rule()], null)).toBeNull();
  });

  it('allows the same span belonging to the other person', () => {
    const mine = draft({ startTime: '09:00', endTime: '11:00' });
    expect(validateRule(mine, 'Rachel', [rule()], null)).toBeNull();
  });

  it('does not clash a rule with itself while editing', () => {
    const same = draft({ startTime: '09:00', endTime: '11:00' });
    expect(validateRule(same, 'Jeff', [rule()], 'r1')).toBeNull();
  });
});

describe('ruleMessage', () => {
  it('names the clash, its time and its day', () => {
    const error = {
      kind: 'overlaps' as const,
      title: 'Maths',
      startTime: '09:00',
      endTime: '11:00',
    };
    expect(ruleMessage(error, 3)).toBe(
      'Maths is already at 09:00–11:00 on Thursday.',
    );
  });

  it('has a sentence for every error kind', () => {
    expect(ruleMessage({ kind: 'titleRequired' }, 0)).toMatch(/name/i);
    expect(ruleMessage({ kind: 'endNotAfterStart' }, 0)).toMatch(/after/i);
  });
});

describe('sortRules', () => {
  it('orders by weekday, then start time, then title', () => {
    const rules = [
      rule({ id: 'c', weekday: 4, startTime: '09:00', endTime: '10:00', title: 'C' }),
      rule({ id: 'b', weekday: 3, startTime: '13:00', endTime: '14:00', title: 'B' }),
      rule({ id: 'a', weekday: 3, startTime: '09:00', endTime: '10:00', title: 'A' }),
    ];
    expect(sortRules(rules).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate its argument', () => {
    const rules = [rule({ id: 'x', weekday: 5 }), rule({ id: 'y', weekday: 1 })];
    sortRules(rules);
    expect(rules.map((r) => r.id)).toEqual(['x', 'y']);
  });
});
