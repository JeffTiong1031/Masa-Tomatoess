import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  ALL_LINKS,
  FOCUS_HREFS,
  FOCUS_SEGMENTS,
  hubDoors,
  isActiveHref,
  isFocusRoute,
  isHubRoute,
  isStudyRoute,
} from './navLinks';

const CONFIG = readFileSync(
  path.resolve(process.cwd(), 'next.config.ts'),
  'utf8',
);

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
      '/timetable',
      '/todo',
      '/calendar',
      '/cycle',
      '/countdown',
      '/meals',
      '/fitness',
      '/finance',
    ]);
  });

  /* Calendar, Timetable and To-do are peers of Period and Finance.
     Nesting To-do under /timetable made prefix matching light Timetable
     on the task list, and hid the door from Home and the menu. */
  it('lists Calendar, Timetable and To-do as top-level destinations', () => {
    expect(ALL_LINKS.some((l) => l.href === '/calendar')).toBe(true);
    expect(ALL_LINKS.some((l) => l.href === '/timetable')).toBe(true);
    expect(ALL_LINKS.some((l) => l.href === '/todo')).toBe(true);
    expect(ALL_LINKS.some((l) => l.href === '/timetable/todo')).toBe(false);
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

  it('does not add Notes as a destination', () => {
    expect(ALL_LINKS.map((l) => l.href)).not.toContain('/notes');
    expect(ALL_LINKS.map((l) => l.label)).not.toContain('Notes');
  });
});

describe('hubDoors', () => {
  it('lists every section door and never Home', () => {
    expect(hubDoors().map((link) => link.href)).toEqual([
      '/study',
      '/timetable',
      '/todo',
      '/calendar',
      '/cycle',
      '/countdown',
      '/meals',
      '/fitness',
      '/finance',
    ]);
  });

  it('puts an icon on the To-do door', () => {
    const todo = hubDoors().find((link) => link.href === '/todo');
    expect(todo?.label).toBe('To-do');
    expect(todo?.icon).toBeDefined();
    expect(todo?.accent).toBe('todo');
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
    '/calendar',
    '/timetable',
    '/todo',
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
  it.each(['/study', '/study/timer', '/study/flexible', '/study/dashboard'])(
    'is true on %s',
    (path) => {
      expect(isStudyRoute(path)).toBe(true);
    },
  );

  it.each([
    '/',
    '/cycle',
    '/finance',
    '/studying',
    '/calendar',
    '/timetable',
    '/todo',
  ])('is false on %s', (path) => {
    expect(isStudyRoute(path)).toBe(false);
  });
});

describe('isFocusRoute', () => {
  it('lists exactly the three Focus widgets', () => {
    expect(FOCUS_HREFS).toEqual(EXPECTED_FOCUS_HREFS);
  });

  it.each(EXPECTED_FOCUS_HREFS)('is true on %s', (href) => {
    expect(isFocusRoute(href)).toBe(true);
  });

  /* FocusPill renders on exactly these routes and returns null
     elsewhere. /study itself only redirects. Calendar and Timetable
     are their own sections, and they use .mt-page-pad -- which carries
     its own hamburger clearance. A page that wore .mt-page-pad-focus
     without the pill above it would slide under the fixed hamburger. */
  it.each(['/study', '/calendar', '/timetable', '/todo'])(
    'is false on %s, which wears no pill',
    (href) => {
      expect(isFocusRoute(href)).toBe(false);
    },
  );

  it('calls /study/timer "Timer"', () => {
    expect(FOCUS_SEGMENTS.find((s) => s.href === '/study/timer')?.label).toBe(
      'Timer',
    );
  });
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
  ])('lights the Study menu entry on %s', (pathname) => {
    expect(isActiveHref(pathname, '/study')).toBe(true);
  });

  it.each(['/calendar', '/timetable', '/todo'])(
    'does not light Study on %s',
    (pathname) => {
      expect(isActiveHref(pathname, '/study')).toBe(false);
    },
  );

  it('lights Timetable only on Timetable, not on To-do', () => {
    expect(isActiveHref('/timetable', '/timetable')).toBe(true);
    expect(isActiveHref('/todo', '/timetable')).toBe(false);
    expect(isActiveHref('/timetable', '/todo')).toBe(false);
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

describe('the old nested to-do path', () => {
  it('sends /timetable/todo to /todo and does not bounce /todo away', () => {
    expect(CONFIG).toContain("source: '/timetable/todo'");
    expect(CONFIG).toContain("destination: '/todo'");
    expect(CONFIG).not.toMatch(/source:\s*'\/todo'/);
  });
});
