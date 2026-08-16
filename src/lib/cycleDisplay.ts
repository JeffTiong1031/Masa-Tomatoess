import type { Phase } from './cycle';
import type { CalendarDay } from './cycleCalendar';
import { TINT, phaseFill } from './cycleColors';

export function isGuessedPeriod(day: CalendarDay): boolean {
  return day.phase === 'menstrual' && !day.recorded;
}

export function displayPhase(day: CalendarDay): Phase | null {
  if (day.phase === null) return null;
  return day.recorded ? 'menstrual' : day.phase;
}

export function runKey(day: CalendarDay): string {
  return `${displayPhase(day) ?? 'none'}|${day.recorded}|${isGuessedPeriod(day)}|${day.inMonth}`;
}

export function fillFor(day: CalendarDay): string {
  const phase = displayPhase(day);
  if (phase === null) return 'transparent';
  if (!day.inMonth) return phaseFill(phase, TINT.outOfMonth);
  if (day.recorded) return phaseFill(phase, TINT.period);
  if (isGuessedPeriod(day)) return phaseFill(phase, TINT.predicted);
  return phaseFill(phase, TINT.phase);
}
