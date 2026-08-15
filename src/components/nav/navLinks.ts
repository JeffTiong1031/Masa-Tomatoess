import {
  Home,
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

export interface NavGroup {
  title: string | null;
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    links: [
      { href: '/', label: 'Home', icon: Home, accent: 'dashboard' },
      { href: '/timer', label: 'Focus', icon: Timer, accent: 'timer' },
    ],
  },
  {
    title: 'Life',
    links: [
      { href: '/calendar', label: 'Calendar', icon: CalendarDays, accent: 'calendar' },
      { href: '/timetable', label: 'Timetable', icon: LayoutList, accent: 'timetable' },
      { href: '/cycle', label: 'Period', icon: HeartPulse, accent: 'cycle' },
      { href: '/countdown', label: 'Countdown', icon: CalendarClock, accent: 'countdown' },
      { href: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'meals' },
      { href: '/fitness', label: 'Fitness', icon: Dumbbell, accent: 'fitness' },
      { href: '/finance', label: 'Finance', icon: Wallet, accent: 'finance' },
    ],
  },
];

export const ALL_LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);

/** Bottom-bar slots on mobile: the app's three top-level sections. */
export const BOTTOM_BAR_HREFS = ['/timer', '/calendar', '/timetable'];

/** The three widgets reachable from inside Focus, in pill order.
 *
 *  The labels here are deliberately NOT the NavLink labels above:
 *  ALL_LINKS calls /timer "Focus", because that is what the drawer and
 *  bottom bar need to say. The pill needs to call the same route
 *  "Timer". Both lists live in this one file so they cannot drift. */
export const FOCUS_SEGMENTS: {
  href: string;
  label: string;
  accent: AccentName;
}[] = [
  { href: '/timer', label: 'Timer', accent: 'timer' },
  { href: '/flexible', label: 'Flexible', accent: 'flexible' },
  { href: '/dashboard', label: 'Dashboard', accent: 'dashboard' },
];

/** Just the hrefs, for active-state checks. Derived, so the pill and the
 *  bottom bar can never disagree about what counts as Focus. */
export const FOCUS_HREFS = FOCUS_SEGMENTS.map((segment) => segment.href);

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** True anywhere inside Focus. The bottom-bar Focus slot points at
 *  /timer but must light up on /flexible and /dashboard too. */
export function isFocusRoute(pathname: string): boolean {
  return FOCUS_HREFS.some((href) => isActiveHref(pathname, href));
}

/** Whether a NavLink from ALL_LINKS should read as the current page.
 *
 *  Every consumer of ALL_LINKS -- the bottom bar, the drawer, and
 *  anything added later -- must call THIS, not isActiveHref. /timer is
 *  the entry point for a whole section, so it stays lit on /flexible and
 *  /dashboard; a plain isActiveHref(pathname, '/timer') leaves it dark
 *  there, and that mistake builds, lints and type-checks cleanly. */
export function isNavLinkActive(pathname: string, href: string): boolean {
  return href === '/timer'
    ? isFocusRoute(pathname)
    : isActiveHref(pathname, href);
}
