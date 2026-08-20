import {
  Home,
  GraduationCap,
  Timer,
  HeartPulse,
  CalendarClock,
  CalendarDays,
  LayoutList,
  UtensilsCrossed,
  Dumbbell,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { AccentName } from '@/components/ui/PageShell';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: AccentName;
}

/** The menu, as one flat list. There are deliberately no group headings:
 *  Study sits alongside Period, Countdown, Meals, Fitness and Finance as
 *  a peer, and splitting them under a "Life" heading made Study read as
 *  a different KIND of thing than the rest of the app.
 *
 *  Calendar and Timetable are absent on purpose -- they moved inside
 *  Study and are reached from its own panel (STUDY_PANEL below), not
 *  from here. */
export const ALL_LINKS: NavLink[] = [
  { href: '/', label: 'Home', icon: Home, accent: 'dashboard' },
  { href: '/study', label: 'Study', icon: GraduationCap, accent: 'timer' },
  { href: '/cycle', label: 'Period', icon: HeartPulse, accent: 'cycle' },
  { href: '/countdown', label: 'Countdown', icon: CalendarClock, accent: 'countdown' },
  { href: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'meals' },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, accent: 'fitness' },
  { href: '/finance', label: 'Finance', icon: Wallet, accent: 'finance' },
];

/** Bottom-bar slots on mobile, outside Study. Inside Study the section's
 *  own panel takes the bottom edge instead -- see StudyPanel. */
export const BOTTOM_BAR_HREFS = ['/', '/study', '/cycle'];

/** Study's lower panel: the three things you can be doing in a study
 *  session. Focus is the entry point to the timer widgets, which have a
 *  second level of their own (FOCUS_SEGMENTS). */
export const STUDY_PANEL: NavLink[] = [
  { href: '/study/timer', label: 'Focus', icon: Timer, accent: 'timer' },
  { href: '/study/calendar', label: 'Calendar', icon: CalendarDays, accent: 'calendar' },
  { href: '/study/timetable', label: 'Timeline', icon: LayoutList, accent: 'timetable' },
];

/** The three widgets behind Study's Focus tab, in pill order.
 *
 *  The labels are deliberately NOT the panel's: STUDY_PANEL calls
 *  /study/timer "Focus", because that is what the section tab means.
 *  The pill needs to call the same route "Timer". Both lists live in
 *  this one file so they cannot drift. */
export const FOCUS_SEGMENTS: {
  href: string;
  label: string;
  accent: AccentName;
}[] = [
  { href: '/study/timer', label: 'Timer', accent: 'timer' },
  { href: '/study/flexible', label: 'Flexible', accent: 'flexible' },
  { href: '/study/dashboard', label: 'Dashboard', accent: 'dashboard' },
];

/** Just the hrefs, for active-state checks. Derived, so the pill and the
 *  panel can never disagree about what counts as Focus. */
export const FOCUS_HREFS = FOCUS_SEGMENTS.map((segment) => segment.href);

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function isHubRoute(pathname: string): boolean {
  return pathname === '/';
}

/** Anywhere inside Study, including /study itself. */
export function isStudyRoute(pathname: string): boolean {
  return isActiveHref(pathname, '/study');
}

/** True on the three timer widgets, which are the only Study routes that
 *  wear the Focus pill. /study/calendar and /study/timetable are inside
 *  Study but outside Focus, and must not show it. */
export function isFocusRoute(pathname: string): boolean {
  return FOCUS_HREFS.some((href) => isActiveHref(pathname, href));
}

/* There is deliberately no isNavLinkActive() here any more.
 *
 * It existed because /timer, /flexible and /dashboard were three
 * unrelated top-level routes, so lighting the section entry required a
 * hand-written special case that every consumer had to remember to call
 * -- and NavDrawer forgot, leaving no active indicator at all above
 * 768px. Nesting them under /study makes the URL express the same fact,
 * so plain isActiveHref(pathname, '/study') now lights Study on every
 * one of its children. The special case is not simplified, it is gone. */
