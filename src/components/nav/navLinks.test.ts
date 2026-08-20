import { describe, it, expect } from 'vitest';
import {
  ALL_LINKS,
  BOTTOM_BAR_HREFS,
  FOCUS_HREFS,
  FOCUS_SEGMENTS,
  STUDY_PANEL,
  isActiveHref,
  isFocusRoute,
  isHubRoute,
  isStudyRoute,
} from './navLinks';

/** Written out rather than derived. Asserting FOCUS_HREFS against
 *  FOCUS_HREFS (or against the list it is built from) restates the
 *  definition and holds for any contents, including an empty array. */
const EXPECTED_FOCUS_HREFS = [
  '/study/timer',
  '/study/flexible',
  '/study/dashboard',
];

describe('menu', () => {
  /* The ask was explicit: Study sits with Period, Countdown, Meals,
     Fitness and Finance, not above them under a heading. A flat list is
     the whole point, so a NAV_GROUPS-style shape coming back would be a
     regression even though nothing would visibly break. */
  it('is one flat list of links, not groups', () => {
    for (const link of ALL_LINKS) {
      expect(typeof link.href, `${JSON.stringify(link)} is not a link`).toBe(
        'string',
      );
      expect(link).not.toHaveProperty('links');
    }
  });

  it('carries Study alongside the life sections', () => {
    expect(ALL_LINKS.map((l) => l.href)).toEqual([
      '/',
      '/study',
      '/cycle',
      '/countdown',
      '/meals',
      '/fitness',
      '/finance',
    ]);
  });

  /* Both moved inside Study and are reached from STUDY_PANEL. Leaving
     them here too would give one page two entry points at different
     depths, which is what "don't split the sections" was about. */
  it('no longer lists Calendar or Timetable as top-level destinations', () => {
    expect(ALL_LINKS.some((l) => l.href === '/calendar')).toBe(false);
    expect(ALL_LINKS.some((l) => l.href === '/timetable')).toBe(false);
  });

  it('does not list the Focus widgets separately either', () => {
    for (const href of EXPECTED_FOCUS_HREFS) {
      expect(ALL_LINKS.some((l) => l.href === href)).toBe(false);
    }
  });

  it('has no duplicate hrefs', () => {
    const hrefs = ALL_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('bottom bar', () => {
  it('has exactly three slots', () => {
    expect(BOTTOM_BAR_HREFS).toHaveLength(3);
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

describe('study panel', () => {
  it('is the three things you can be doing in a study session', () => {
    expect(STUDY_PANEL.map((s) => s.href)).toEqual([
      '/study/timer',
      '/study/calendar',
      '/study/timetable',
    ]);
  });

  it('points only at routes inside Study', () => {
    for (const { href } of STUDY_PANEL) {
      expect(isStudyRoute(href), `${href} is not under /study`).toBe(true);
    }
  });

  /* The panel's Focus tab and the pill's Timer segment are the same
     route under two labels, deliberately. Pinning both stops a later
     tidy-up unifying them. */
  it('calls /study/timer "Focus", where the pill calls it "Timer"', () => {
    expect(STUDY_PANEL.find((s) => s.href === '/study/timer')?.label).toBe(
      'Focus',
    );
    expect(FOCUS_SEGMENTS.find((s) => s.href === '/study/timer')?.label).toBe(
      'Timer',
    );
  });
});

describe('isHubRoute', () => {
  it('is true only on /', () => {
    expect(isHubRoute('/')).toBe(true);
  });

  it.each([
    '/study',
    '/study/timer',
    '/study/flexible',
    '/study/dashboard',
    '/cycle',
    '/countdown',
    '/meals',
    '/fitness',
    '/finance',
  ])('is false on %s', (path) => {
    expect(isHubRoute(path)).toBe(false);
  });
});

describe('isStudyRoute', () => {
  it.each([
    '/study',
    '/study/timer',
    '/study/flexible',
    '/study/dashboard',
    '/study/calendar',
    '/study/timetable',
  ])('is true on %s', (path) => {
    expect(isStudyRoute(path)).toBe(true);
  });

  it.each(['/', '/cycle', '/finance', '/studying'])(
    'is false on %s',
    (path) => {
      expect(isStudyRoute(path)).toBe(false);
    },
  );
});

describe('isFocusRoute', () => {
  it('lists exactly the three Focus widgets', () => {
    expect(FOCUS_HREFS).toEqual(EXPECTED_FOCUS_HREFS);
  });

  it.each(EXPECTED_FOCUS_HREFS)('is true on %s', (href) => {
    expect(isFocusRoute(href)).toBe(true);
  });

  /* FocusPill renders on exactly these routes and returns null
     elsewhere. Calendar and Timeline are inside Study but outside
     Focus, and they use .mt-page-pad -- which carries its own hamburger
     clearance. A page that wore .mt-page-pad-focus without the pill
     above it would slide under the fixed hamburger. */
  it.each(['/study', '/study/calendar', '/study/timetable'])(
    'is false on %s, which is inside Study but wears no pill',
    (href) => {
      expect(isStudyRoute(href)).toBe(true);
      expect(isFocusRoute(href)).toBe(false);
    },
  );
});

describe('isActiveHref', () => {
  /* The nesting is what retired isNavLinkActive(). /timer, /flexible
     and /dashboard used to be unrelated top-level routes, so lighting
     the section entry took a hand-written special case that NavDrawer
     forgot to call. Now the URL says it, and plain prefix matching is
     enough -- this is the test that would fail if the routes were ever
     flattened back out. */
  it.each([
    '/study',
    '/study/timer',
    '/study/flexible',
    '/study/dashboard',
    '/study/calendar',
    '/study/timetable',
  ])('lights the Study menu entry on %s', (pathname) => {
    expect(isActiveHref(pathname, '/study')).toBe(true);
  });

  it('keeps Home exact, so it does not light everywhere', () => {
    expect(isActiveHref('/', '/')).toBe(true);
    expect(isActiveHref('/study/timer', '/')).toBe(false);
    expect(isActiveHref('/cycle', '/')).toBe(false);
  });

  it('leaves the other sections dark inside Study', () => {
    for (const { href } of ALL_LINKS) {
      if (href === '/study') continue;
      expect(
        isActiveHref('/study/timer', href),
        `${href} should be dark on /study/timer`,
      ).toBe(false);
    }
  });

  it('is active on itself for every link', () => {
    for (const { href } of ALL_LINKS) {
      expect(isActiveHref(href, href), `${href} should be active on itself`).toBe(
        true,
      );
    }
  });
});
