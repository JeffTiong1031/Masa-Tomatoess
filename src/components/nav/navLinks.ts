import {
  Home,
  GraduationCap,
  ListChecks,
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
 *  Study sits alongside Timetable, Calendar, Period, Countdown, Meals,
 *  Fitness and Finance as a peer, and splitting them under a "Life"
 *  heading made Study read as a different KIND of thing than the rest
 *  of the app.
 *
 *  To-do is absent on purpose -- it lives inside Timetable and is
 *  reached from its own panel (TIMETABLE_PANEL below), not from here. */
export const ALL_LINKS: NavLink[] = [
  { href: '/', label: 'Home', icon: Home, accent: 'dashboard' },
  { href: '/study', label: 'Study', icon: GraduationCap, accent: 'timer' },
  { href: '/timetable', label: 'Timetable', icon: LayoutList, accent: 'timetable' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, accent: 'calendar' },
  { href: '/cycle', label: 'Period', icon: HeartPulse, accent: 'cycle' },
  { href: '/countdown', label: 'Countdown', icon: CalendarClock, accent: 'countdown' },
  { href: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'meals' },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, accent: 'fitness' },
  { href: '/finance', label: 'Finance', icon: Wallet, accent: 'finance' },
];

/** Timetable's lower panel: the two views inside the section. The
 *  drawer lists the section once, as Timetable; this is how you switch
 *  between the week grid and the task list. */
export const TIMETABLE_PANEL: NavLink[] = [
  { href: '/timetable', label: 'Timetable', icon: LayoutList, accent: 'timetable' },
  { href: '/timetable/todo', label: 'To-do', icon: ListChecks, accent: 'todo' },
];

/** The three widgets behind Study, in pill order. FocusPill is Study's
 *  only navigation -- there is no lower panel. */
export const FOCUS_SEGMENTS: {
  href: string;
  label: string;
  accent: AccentName;
}[] = [
  { href: '/study/timer', label: 'Timer', accent: 'timer' },
  { href: '/study/flexible', label: 'Flexible', accent: 'flexible' },
  { href: '/study/dashboard', label: 'Dashboard', accent: 'dashboard' },
];

/** Just the hrefs, for active-state checks. Derived, so consumers
 *  cannot disagree about what counts as Focus. */
export const FOCUS_HREFS = FOCUS_SEGMENTS.map((segment) => segment.href);

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function isHubRoute(pathname: string): boolean {
  return pathname === '/';
}

export function hubDoors(): NavLink[] {
  return ALL_LINKS.filter((link) => link.href !== '/');
}

/** Anywhere inside Study, including /study itself. */
export function isStudyRoute(pathname: string): boolean {
  return isActiveHref(pathname, '/study');
}

/** True on the three timer widgets, which are the only Study routes that
 *  wear the Focus pill. /study itself only ever redirects into
 *  /study/timer, and must not show it. */
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
