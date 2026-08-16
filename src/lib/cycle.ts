import { addDays, diffDays } from './cycleDates';

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

export function phaseForDay(
  day: number,
  cycleLen: number,
  periodLen: number,
): Phase {
  const ovulationDay = Math.max(cycleLen - 14, periodLen + 4);
  const fertileStart = ovulationDay - 3;
  const fertileEnd = Math.min(ovulationDay + 1, cycleLen);

  if (day <= periodLen) return 'menstrual';
  if (day >= fertileStart && day <= fertileEnd) return 'fertile';
  if (day < fertileStart) return 'follicular';
  return 'luteal';
}

function coveringLog(sorted: PeriodLog[], today: string): PeriodLog | undefined {
  return sorted.find(
    (entry) =>
      today >= entry.startDate &&
      (entry.endDate === null || today <= entry.endDate),
  );
}

function headlineFor(
  sorted: PeriodLog[],
  today: string,
  nextStart: string,
): Headline {
  const covering = coveringLog(sorted, today);
  if (covering) {
    return { kind: 'period-day', day: diffDays(today, covering.startDate) + 1 };
  }
  const days = diffDays(nextStart, today);
  if (days > 0) return { kind: 'upcoming', days };
  if (days === 0) return { kind: 'due-today' };
  return { kind: 'late', days: -days };
}

export function summarizeCycle(
  logs: PeriodLog[],
  today: string,
): CycleSummary {
  const sorted = sortLogs(logs);
  const length = cycleLength(logs);
  const bleed = periodLength(logs);

  if (sorted.length === 0) {
    return {
      headline: { kind: 'no-data' },
      phase: null,
      dayOfCycle: null,
      cycleLength: length,
      periodLength: bleed,
      nextStart: null,
      confidence: 'none',
    };
  }

  const latest = sorted[0];
  const nextStart = addDays(latest.startDate, length);
  const headline = headlineFor(sorted, today, nextStart);
  const dayOfCycle = diffDays(today, latest.startDate) + 1;

  return {
    headline,
    phase:
      headline.kind === 'period-day'
        ? 'menstrual'
        : phaseForDay(dayOfCycle, length, bleed),
    dayOfCycle,
    cycleLength: length,
    periodLength: bleed,
    nextStart,
    confidence: confidenceFor(logs),
  };
}

export function hubCycleLabel(summary: CycleSummary): string {
  const { headline } = summary;
  switch (headline.kind) {
    case 'no-data':
      return 'Not set up yet';
    case 'period-day':
      return `Day ${headline.day} of period`;
    case 'upcoming':
      return headline.days === 1
        ? 'Period in 1 day'
        : `Period in ${headline.days} days`;
    case 'due-today':
      return 'Period today';
    case 'late':
      return headline.days === 1 ? '1 day late' : `${headline.days} days late`;
  }
}

export type ValidationError =
  | 'future-date'
  | 'end-before-start'
  | 'start-before-previous'
  | 'duplicate-start';

export const VALIDATION_MESSAGES: Record<ValidationError, string> = {
  'future-date': 'That day has not happened yet.',
  'end-before-start': 'It cannot stop before it started.',
  'start-before-previous': 'That is earlier than the period already logged.',
  'duplicate-start': 'That day is already logged.',
};

export function validateStart(
  startDate: string,
  logs: PeriodLog[],
  today: string,
  editingId: string | null,
): ValidationError | null {
  if (startDate > today) return 'future-date';

  const others = logs.filter((entry) => entry.id !== editingId);
  if (others.some((entry) => entry.startDate === startDate)) {
    return 'duplicate-start';
  }

  const previous = sortLogs(others)[0];
  if (previous && startDate < previous.startDate) {
    return 'start-before-previous';
  }

  return null;
}

export function validateEnd(
  endDate: string,
  startDate: string,
  today: string,
): ValidationError | null {
  if (endDate > today) return 'future-date';
  if (endDate < startDate) return 'end-before-start';
  return null;
}
