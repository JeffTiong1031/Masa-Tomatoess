import { diffDays } from './cycleDates';

export interface PeriodLog {
  id: string;
  startDate: string;
  endDate: string | null;
}

export type Phase = 'menstrual' | 'follicular' | 'fertile' | 'luteal';

export type Headline =
  | { kind: 'no-data' }
  | { kind: 'period-day'; day: number }
  | { kind: 'upcoming'; days: number }
  | { kind: 'due-today' }
  | { kind: 'late'; days: number };

export type Confidence = 'none' | 'default' | 'thin' | 'learned';

export interface CycleSummary {
  headline: Headline;
  phase: Phase | null;
  dayOfCycle: number | null;
  cycleLength: number;
  periodLength: number;
  nextStart: string | null;
  confidence: Confidence;
}

export const SYMPTOMS = [
  'Cramps',
  'Headache',
  'Tired',
  'Bloating',
  'Mood',
  'Cravings',
] as const;

export type Symptom = (typeof SYMPTOMS)[number];

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

const MIN_GAP = 15;
const MAX_GAP = 60;
const MIN_PERIOD = 1;
const MAX_PERIOD = 14;
const SAMPLE_SIZE = 6;

export function sortLogs(logs: PeriodLog[]): PeriodLog[] {
  return [...logs].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  if (sorted.length % 2 === 1) return sorted[Math.floor(middle)];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function cycleGaps(logs: PeriodLog[]): number[] {
  const sorted = sortLogs(logs);
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const gap = diffDays(sorted[i].startDate, sorted[i + 1].startDate);
    if (gap >= MIN_GAP && gap <= MAX_GAP) gaps.push(gap);
  }
  return gaps.slice(0, SAMPLE_SIZE);
}

export function cycleLength(logs: PeriodLog[]): number {
  const gaps = cycleGaps(logs);
  return gaps.length === 0 ? DEFAULT_CYCLE_LENGTH : median(gaps);
}

export function periodLength(logs: PeriodLog[]): number {
  const lengths = sortLogs(logs)
    .filter((entry): entry is PeriodLog & { endDate: string } => entry.endDate !== null)
    .map((entry) => diffDays(entry.endDate, entry.startDate) + 1)
    .filter((days) => days >= MIN_PERIOD && days <= MAX_PERIOD)
    .slice(0, SAMPLE_SIZE);
  return lengths.length === 0 ? DEFAULT_PERIOD_LENGTH : median(lengths);
}

export function confidenceFor(logs: PeriodLog[]): Confidence {
  if (logs.length === 0) return 'none';
  const gaps = cycleGaps(logs).length;
  if (gaps === 0) return 'default';
  if (gaps === 1) return 'thin';
  return 'learned';
}
