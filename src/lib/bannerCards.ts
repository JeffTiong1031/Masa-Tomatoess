import type { CalendarEvent } from './calendarEvent';
import type { CountUpEntry } from './countUpList';
import { formatTrackerDays, type TrackerMode } from './dayCount';

export const BANNER_TICK_MS = 5000;
export const BANNER_SLIDE_MS = 1000;

export type BannerAccent = 'timer' | 'cycle' | 'dashboard' | 'countdown';

export type BannerIcon = 'timer' | 'cycle' | 'streak' | 'countdown';

export type BannerMeter =
  | { kind: 'focus'; minutes: number }
  | { kind: 'streak'; days: number }
  | null;

export interface BannerCard {
  id: string;
  label: string;
  value: string;
  href: string;
  accent: BannerAccent;
  icon: BannerIcon;
  meter: BannerMeter;
}

interface Starred {
  id: string;
  title: string;
  date: string;
  mode: TrackerMode;
}

function streakValue(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

export function buildBannerCards(
  cycleLabel: string | null,
  streakDays: number,
  pinnedEvents: CalendarEvent[],
  pinnedCountUps: CountUpEntry[],
  today: string,
  todayMinutes: number,
): BannerCard[] {
  const cards: BannerCard[] = [
    {
      id: 'today',
      label: 'Today',
      value: `${todayMinutes} min`,
      href: '/study/timer',
      accent: 'timer',
      icon: 'timer',
      meter: { kind: 'focus', minutes: todayMinutes },
    },
  ];

  if (cycleLabel !== null) {
    cards.push({
      id: 'cycle',
      label: 'Period',
      value: cycleLabel,
      href: '/cycle',
      accent: 'cycle',
      icon: 'cycle',
      meter: null,
    });
  }

  cards.push({
    id: 'streak',
    label: 'Streak',
    value: streakValue(streakDays),
    href: '/study/dashboard',
    accent: 'dashboard',
    icon: 'streak',
    meter: { kind: 'streak', days: streakDays },
  });

  const starred: Starred[] = [
    ...pinnedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      mode: 'countdown' as const,
    })),
    ...pinnedCountUps.map((entry) => ({
      id: entry.id,
      title: entry.label,
      date: entry.date,
      mode: 'countup' as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return [
    ...cards,
    ...starred.map((item) => ({
      id: item.id,
      label: item.title,
      value: formatTrackerDays(item.mode, item.date, today),
      href: '/countdown',
      accent: 'countdown' as const,
      icon: 'countdown' as const,
      meter: null,
    })),
  ];
}
