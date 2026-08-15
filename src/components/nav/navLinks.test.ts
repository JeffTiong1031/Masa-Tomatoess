import { describe, it, expect } from 'vitest';
import {
  ALL_LINKS,
  BOTTOM_BAR_HREFS,
  FOCUS_HREFS,
  FOCUS_SEGMENTS,
  isActiveHref,
  isFocusRoute,
  isNavLinkActive,
} from './navLinks';

/** Written out rather than derived. Asserting FOCUS_HREFS against
 *  FOCUS_HREFS (or against the list it is built from) restates the
 *  definition and holds for any contents, including an empty array. */
const EXPECTED_FOCUS_HREFS = ['/timer', '/flexible', '/dashboard'];

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
  it('lists exactly the three Focus routes', () => {
    expect(FOCUS_HREFS).toEqual(EXPECTED_FOCUS_HREFS);
  });

  it.each(EXPECTED_FOCUS_HREFS)('is true on %s', (href) => {
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

describe('isNavLinkActive', () => {
  // The rule, not any one call site. AppNav had it and NavDrawer did not,
  // which left the drawer's Focus entry dark on /flexible and /dashboard
  // -- and above 768px AppNav renders nothing, so there was no active
  // indicator anywhere in the app on those two routes. Pinning the shared
  // function is what stops a third consumer repeating the omission.
  it.each(EXPECTED_FOCUS_HREFS)(
    'lights the /timer nav entry on %s',
    (pathname) => {
      expect(isNavLinkActive(pathname, '/timer')).toBe(true);
    },
  );

  it('is what every ALL_LINKS consumer must use, because isActiveHref is not enough', () => {
    // If this ever stops being true, the ternary is redundant and the
    // shared helper can go -- but until then, bypassing it is the bug.
    expect(isActiveHref('/flexible', '/timer')).toBe(false);
    expect(isActiveHref('/dashboard', '/timer')).toBe(false);
  });

  it.each(['/', '/calendar', '/timetable', '/cycle', '/finance'])(
    'leaves the /timer nav entry dark on %s',
    (pathname) => {
      expect(isNavLinkActive(pathname, '/timer')).toBe(false);
    },
  );

  it('falls back to plain href matching for every other link', () => {
    for (const { href } of ALL_LINKS) {
      if (href === '/timer') continue;
      expect(isNavLinkActive(href, href), `${href} should be active on itself`).toBe(true);
      expect(
        isNavLinkActive('/timer', href),
        `${href} should be dark on /timer`,
      ).toBe(false);
    }
  });
});

describe('link table', () => {
  it('labels /timer as Focus, because it is the section entry point', () => {
    expect(ALL_LINKS.find((l) => l.href === '/timer')?.label).toBe('Focus');
  });

  it('labels the same route Timer inside the pill', () => {
    // The two labels are intentionally different. This pins that, so a
    // later "tidy-up" that unifies them fails loudly here.
    expect(FOCUS_SEGMENTS.find((s) => s.href === '/timer')?.label).toBe('Timer');
    expect(FOCUS_SEGMENTS.map((s) => s.href)).toEqual(EXPECTED_FOCUS_HREFS);
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
