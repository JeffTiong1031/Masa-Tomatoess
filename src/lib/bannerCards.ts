import type { CalendarEvent } from './calendarEvent';
import type { CountUpEntry } from './countUpList';
import { formatTrackerDays, type TrackerMode } from './dayCount';

export type BannerAccent = 'cycle' | 'dashboard' | 'countdown';

export interface BannerCard {
  id: string;
  title: string;
  detail: string;
  href: string;
  accent: BannerAccent;
}

interface Starred {
  id: string;
  title: string;
  date: string;
  mode: TrackerMode;
}

function streakTitle(days: number): string {
  return days === 1 ? '1 day streak' : `${days} day streak`;
}

export function buildBannerCards(
  cycleLabel: string | null,
  streakDays: number,
  pinnedEvents: CalendarEvent[],
  pinnedCountUps: CountUpEntry[],
  today: string,
): BannerCard[] {
  const fixed: BannerCard[] = [];

  if (cycleLabel !== null) {
    fixed.push({
      id: 'cycle',
      title: cycleLabel,
      detail: 'Open Period',
      href: '/cycle',
      accent: 'cycle',
    });
  }

  fixed.push({
    id: 'streak',
    title: streakTitle(streakDays),
    detail: 'Open Study',
    href: '/study/dashboard',
    accent: 'dashboard',
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
    ...fixed,
    ...starred.map((item) => ({
      id: item.id,
      title: item.title,
      detail: formatTrackerDays(item.mode, item.date, today),
      href: '/countdown',
      accent: 'countdown' as const,
    })),
  ];
}
