import type { AccentName } from '@/components/ui/PageShell';

export const HOME_FIELD_ACCENTS = [
  'cycle',
  'countdown',
  'timer',
  'calendar',
  'dashboard',
  'fitness',
  'timetable',
  'flexible',
] as const satisfies readonly AccentName[];

export type HomeFieldAccent = (typeof HOME_FIELD_ACCENTS)[number];

export interface HomeDecoration {
  accent: HomeFieldAccent;
  top: string;
  left: string;
  size: string;
  opacity: number;
}

const BUSY_DOTS = ['cycle', 'countdown', 'timer'] as const;

export const FOCUS_BAR_COUNT = 4;
export const STREAK_PIP_COUNT = 7;

export const HOME_BLOBS: HomeDecoration[] = [
  { accent: 'cycle', top: '-10%', left: '-10%', size: '60vh', opacity: 0.25 },
  { accent: 'countdown', top: '68%', left: '65%', size: '55vh', opacity: 0.22 },
  { accent: 'timer', top: '30%', left: '-8%', size: '40vh', opacity: 0.18 },
  { accent: 'calendar', top: '-6%', left: '58%', size: '50vh', opacity: 0.2 },
  { accent: 'dashboard', top: '62%', left: '18%', size: '45vh', opacity: 0.2 },
  { accent: 'fitness', top: '48%', left: '78%', size: '35vh', opacity: 0.18 },
  { accent: 'timetable', top: '72%', left: '42%', size: '30vh', opacity: 0.16 },
  { accent: 'flexible', top: '12%', left: '38%', size: '28vh', opacity: 0.16 },
];

export const HOME_DOTS: HomeDecoration[] = [
  { accent: 'cycle', top: '8%', left: '18%', size: '10px', opacity: 0.55 },
  { accent: 'timer', top: '14%', left: '72%', size: '8px', opacity: 0.5 },
  { accent: 'calendar', top: '22%', left: '88%', size: '12px', opacity: 0.45 },
  { accent: 'countdown', top: '28%', left: '12%', size: '9px', opacity: 0.5 },
  { accent: 'dashboard', top: '36%', left: '24%', size: '7px', opacity: 0.4 },
  { accent: 'fitness', top: '40%', left: '92%', size: '11px', opacity: 0.45 },
  { accent: 'timetable', top: '46%', left: '6%', size: '8px', opacity: 0.5 },
  { accent: 'flexible', top: '54%', left: '16%', size: '10px', opacity: 0.4 },
  { accent: 'cycle', top: '58%', left: '70%', size: '9px', opacity: 0.45 },
  { accent: 'timer', top: '64%', left: '86%', size: '8px', opacity: 0.4 },
  { accent: 'cycle', top: '70%', left: '10%', size: '11px', opacity: 0.45 },
  { accent: 'timer', top: '76%', left: '28%', size: '7px', opacity: 0.4 },
  { accent: 'calendar', top: '80%', left: '62%', size: '10px', opacity: 0.5 },
  { accent: 'countdown', top: '84%', left: '78%', size: '8px', opacity: 0.45 },
  { accent: 'dashboard', top: '18%', left: '42%', size: '6px', opacity: 0.4 },
  { accent: 'fitness', top: '88%', left: '14%', size: '9px', opacity: 0.4 },
  { accent: 'timetable', top: '10%', left: '54%', size: '8px', opacity: 0.45 },
  { accent: 'flexible', top: '32%', left: '64%', size: '7px', opacity: 0.4 },
  { accent: 'cycle', top: '50%', left: '48%', size: '6px', opacity: 0.35 },
  { accent: 'calendar', top: '6%', left: '82%', size: '9px', opacity: 0.45 },
];

export const HOME_RINGS: HomeDecoration[] = [
  { accent: 'cycle', top: '16%', left: '8%', size: '72px', opacity: 0.35 },
  { accent: 'countdown', top: '24%', left: '78%', size: '56px', opacity: 0.3 },
  { accent: 'timer', top: '44%', left: '4%', size: '64px', opacity: 0.28 },
  { accent: 'calendar', top: '8%', left: '62%', size: '80px', opacity: 0.28 },
  { accent: 'dashboard', top: '68%', left: '72%', size: '60px', opacity: 0.3 },
  { accent: 'fitness', top: '78%', left: '36%', size: '52px', opacity: 0.28 },
  { accent: 'timetable', top: '52%', left: '88%', size: '48px', opacity: 0.3 },
  { accent: 'flexible', top: '34%', left: '36%', size: '68px', opacity: 0.25 },
];

export function filledFocusBars(todayMinutes: number): boolean[] {
  const filled =
    todayMinutes === 0
      ? 0
      : Math.min(FOCUS_BAR_COUNT, Math.ceil(todayMinutes / 20));
  return Array.from({ length: FOCUS_BAR_COUNT }, (_, i) => i < filled);
}

export function filledStreakPips(streakDays: number): boolean[] {
  const filled = Math.min(STREAK_PIP_COUNT, Math.max(0, streakDays));
  return Array.from({ length: STREAK_PIP_COUNT }, (_, i) => i < filled);
}

export function busyDotAccent(index: number): (typeof BUSY_DOTS)[number] {
  return BUSY_DOTS[index % BUSY_DOTS.length];
}
