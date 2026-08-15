import { describe, it, expect } from 'vitest';
import {
  ALL_LINKS,
  BOTTOM_BAR_HREFS,
  FOCUS_HREFS,
  FOCUS_SEGMENTS,
  isActiveHref,
  isFocusRoute,
} from './navLinks';

describe('bottom bar', () => {
  it('has exactly three slots', () => {
    expect(BOTTOM_BAR_HREFS).toEqual(['/timer', '/calendar', '/timetable']);
  });

  it('only references routes that exist in the link table', () => {
    for (const href of BOTTOM_BAR_HREFS) {
      expect(
        ALL_LINKS.some((l) => l.href === href),
        `${href} is in the bottom bar but not in ALL_LINKS`,
      ).toBe(true);
    }
  });
});

describe('isFocusRoute', () => {
  it.each(FOCUS_HREFS)('is true on %s', (href) => {
    expect(isFocusRoute(href)).toBe(true);
  });

  it('covers all three Focus widgets', () => {
    // The regression this guards: the Focus slot points at /timer, so a
    // naive isActiveHref(pathname, '/timer') leaves it unlit on the
    // other two -- which builds and lints perfectly.
    expect(isFocusRoute('/flexible')).toBe(true);
    expect(isFocusRoute('/dashboard')).toBe(true);
    expect(isActiveHref('/flexible', '/timer')).toBe(false);
  });

  it.each(['/', '/calendar', '/timetable', '/cycle', '/finance'])(
    'is false on %s',
    (href) => {
      expect(isFocusRoute(href)).toBe(false);
    },
  );
});

describe('link table', () => {
  it('labels /timer as Focus, because it is the section entry point', () => {
    expect(ALL_LINKS.find((l) => l.href === '/timer')?.label).toBe('Focus');
  });

  it('labels the same route Timer inside the pill', () => {
    // The two labels are intentionally different. This pins that, so a
    // later "tidy-up" that unifies them fails loudly here.
    expect(FOCUS_SEGMENTS.find((s) => s.href === '/timer')?.label).toBe('Timer');
    expect(FOCUS_HREFS).toEqual(FOCUS_SEGMENTS.map((s) => s.href));
  });

  it('no longer lists /flexible or /dashboard as separate destinations', () => {
    expect(ALL_LINKS.some((l) => l.href === '/flexible')).toBe(false);
    expect(ALL_LINKS.some((l) => l.href === '/dashboard')).toBe(false);
  });

  it('has no duplicate hrefs', () => {
    const hrefs = ALL_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
