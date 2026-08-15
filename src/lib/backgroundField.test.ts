import { describe, expect, it } from 'vitest';
import {
  backgroundFieldFor,
  themedRoutesAreFocusRoutes,
} from '@/lib/backgroundField';
import { ALL_LINKS, FOCUS_HREFS, STUDY_PANEL } from '@/components/nav/navLinks';

describe('backgroundFieldFor', () => {
  it('gives all three Focus widgets the themed backdrop', () => {
    expect(backgroundFieldFor('/study/timer')).toBe('themed');
    expect(backgroundFieldFor('/study/flexible')).toBe('themed');
    expect(backgroundFieldFor('/study/dashboard')).toBe('themed');
  });

  it('keeps nested timing routes themed', () => {
    expect(backgroundFieldFor('/study/timer/settings')).toBe('themed');
  });

  /* Calendar and Timeline are inside Study but are not part of a focus
     session, and the wallpaper is the session's furniture. /study
     itself only ever redirects. */
  it.each(['/study', '/study/calendar', '/study/timetable'])(
    'keeps %s on the plain field',
    (path) => {
      expect(backgroundFieldFor(path)).toBe('plain');
    },
  );

  /* Every themed route is a Focus route and vice versa, which is what
     makes "the wallpaper marks a focus session" a rule rather than a
     coincidence of two hand-maintained lists. */
  it('themes exactly the Focus routes, no more and no less', () => {
    for (const href of FOCUS_HREFS) {
      expect(backgroundFieldFor(href), `${href} should be themed`).toBe('themed');
    }
  });

  it('gives every top-level menu destination the plain field', () => {
    for (const { href } of ALL_LINKS) {
      if (href === '/study') continue; // redirects into /study/timer
      expect(
        backgroundFieldFor(href),
        `${href} should be on the plain field`,
      ).toBe('plain');
    }
  });

  /* The old /timer and /flexible paths. Leaving these themed after the
     move would have quietly stranded the wallpaper on dead URLs while
     the real routes fell through to the plain field. */
  it.each(['/timer', '/flexible'])(
    'does not still theme the pre-move path %s',
    (path) => {
      expect(backgroundFieldFor(path)).toBe('plain');
    },
  );

  it('only offers a wallpaper on routes that are inside Focus', () => {
    expect(themedRoutesAreFocusRoutes()).toBe(true);
  });

  /* Study's own panel must never land the user somewhere the backdrop
     changes out from under them mid-section. Focus is the one panel tab
     that may carry a photo. */
  it('keeps both non-Focus panel tabs on the plain field', () => {
    for (const { href, label } of STUDY_PANEL) {
      if (label === 'Focus') continue;
      expect(backgroundFieldFor(href), `${label} should be plain`).toBe('plain');
    }
  });
});
