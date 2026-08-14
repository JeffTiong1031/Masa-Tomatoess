import {
  Home,
  Timer,
  Clock3,
  LayoutDashboard,
  HeartPulse,
  CalendarClock,
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
    links: [{ href: '/', label: 'Home', icon: Home, accent: 'dashboard' }],
  },
  {
    title: 'Focus',
    links: [
      { href: '/timer', label: 'Timer', icon: Timer, accent: 'timer' },
      { href: '/flexible', label: 'Flexible', icon: Clock3, accent: 'flexible' },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: 'dashboard' },
    ],
  },
  {
    title: 'Life',
    links: [
      { href: '/cycle', label: 'Period', icon: HeartPulse, accent: 'cycle' },
      { href: '/countdown', label: 'Countdown', icon: CalendarClock, accent: 'countdown' },
      { href: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'meals' },
      { href: '/fitness', label: 'Fitness', icon: Dumbbell, accent: 'fitness' },
      { href: '/finance', label: 'Finance', icon: Wallet, accent: 'finance' },
    ],
  },
];

export const ALL_LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);

/** Bottom-bar slots on mobile. The five Life sections are drawer-only. */
export const BOTTOM_BAR_HREFS = ['/', '/timer', '/flexible', '/dashboard'];

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}
