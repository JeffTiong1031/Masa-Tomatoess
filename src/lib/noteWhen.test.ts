import { describe, it, expect } from 'vitest';
import { whenTouched } from './noteWhen';

/** Local time on purpose: "yesterday" is a calendar fact about where the
 *  reader is, not a UTC one. */
function at(local: string): number {
  return new Date(local).getTime();
}

describe('whenTouched', () => {
  const now = at('2026-09-15T14:00:00');

  it('says just now inside the first minute', () => {
    expect(whenTouched(new Date(now - 30 * 1000).toISOString(), now)).toBe(
      'Just now',
    );
  });

  it('counts minutes, then hours', () => {
    expect(whenTouched(new Date(now - 5 * 60_000).toISOString(), now)).toBe(
      '5 min ago',
    );
    expect(whenTouched(new Date(now - 3 * 3_600_000).toISOString(), now)).toBe(
      '3 hours ago',
    );
  });

  /* 13 hours earlier is last night, and "13 hours ago" is not how anyone
     reads a note they wrote before bed. */
  it('calls last night yesterday, not thirteen hours', () => {
    expect(whenTouched(new Date(at('2026-09-14T23:00:00')).toISOString(), now)).toBe(
      'Yesterday',
    );
  });

  it('counts days inside the week', () => {
    expect(whenTouched(new Date(at('2026-09-12T14:00:00')).toISOString(), now)).toBe(
      '3 days ago',
    );
  });

  it('rounds out to weeks, then months', () => {
    expect(whenTouched(new Date(at('2026-09-07T14:00:00')).toISOString(), now)).toBe(
      'Last week',
    );
    expect(whenTouched(new Date(at('2026-08-25T14:00:00')).toISOString(), now)).toBe(
      '3 weeks ago',
    );
    expect(whenTouched(new Date(at('2026-07-15T14:00:00')).toISOString(), now)).toBe(
      '2 months ago',
    );
  });

  it('gives up politely past a year', () => {
    expect(whenTouched(new Date(at('2024-01-01T14:00:00')).toISOString(), now)).toBe(
      'Over a year ago',
    );
  });
});
