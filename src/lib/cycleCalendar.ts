import {
  cycleLength,
  periodLength,
  phaseForDay,
  sortLogs,
  type PeriodLog,
  type Phase,
} from './cycle';
import { addDays, diffDays, monthGridDates, monthOf } from './cycleDates';

const MAX_PROJECTED_CYCLES = 12;

export interface PredictedCycle {
  startDate: string;
  endDate: string;
}

export interface CalendarDay {
  date: string;
  phase: Phase | null;
  recorded: boolean;
  predicted: boolean;
  inMonth: boolean;
  isToday: boolean;
  hasSymptoms: boolean;
}

export interface HistoryRow {
  id: string;
  startDate: string;
  endDate: string | null;
  days: number | null;
  cycleLength: number | null;
}

interface Anchor {
  startDate: string;
  length: number;
  bleed: number;
}

export function predictedCycles(
  logs: PeriodLog[],
  throughDate: string,
): PredictedCycle[] {
  const sorted = sortLogs(logs);
  if (sorted.length === 0) return [];

  const length = cycleLength(logs);
  const bleed = periodLength(logs);
  const cycles: PredictedCycle[] = [];

  for (let step = 1; step <= MAX_PROJECTED_CYCLES; step += 1) {
    const startDate = addDays(sorted[0].startDate, length * step);
    if (startDate > throughDate) break;
    cycles.push({ startDate, endDate: addDays(startDate, bleed - 1) });
  }

  return cycles;
}

function recordedDates(logs: PeriodLog[], today: string): Set<string> {
  const dates = new Set<string>();
  for (const entry of logs) {
    const last = entry.endDate ?? today;
    for (let date = entry.startDate; date <= last; date = addDays(date, 1)) {
      dates.add(date);
    }
  }
  return dates;
}

function anchorsFor(logs: PeriodLog[], throughDate: string): Anchor[] {
  const sorted = sortLogs(logs).reverse();
  const length = cycleLength(logs);
  const bleed = periodLength(logs);

  const anchors: Anchor[] = sorted.map((entry, index) => {
    const next = sorted[index + 1];
    const ownBleed =
      entry.endDate === null ? bleed : diffDays(entry.endDate, entry.startDate) + 1;
    return {
      startDate: entry.startDate,
      length: next ? diffDays(next.startDate, entry.startDate) : length,
      bleed: ownBleed,
    };
  });

  for (const cycle of predictedCycles(logs, throughDate)) {
    anchors.push({ startDate: cycle.startDate, length, bleed });
  }

  return anchors;
}

export function buildCalendarMonth({
  month,
  logs,
  today,
  symptomDates,
}: {
  month: string;
  logs: PeriodLog[];
  today: string;
  symptomDates: ReadonlySet<string>;
}): CalendarDay[] {
  const dates = monthGridDates(month);
  const lastDate = dates[dates.length - 1];

  const recorded = recordedDates(logs, today);
  const predicted = new Set<string>();
  for (const cycle of predictedCycles(logs, lastDate)) {
    for (
      let date = cycle.startDate;
      date <= cycle.endDate;
      date = addDays(date, 1)
    ) {
      predicted.add(date);
    }
  }

  const anchors = anchorsFor(logs, lastDate);

  return dates.map((date) => {
    const anchor = anchors.filter((a) => a.startDate <= date).pop();
    return {
      date,
      phase: anchor
        ? phaseForDay(diffDays(date, anchor.startDate) + 1, anchor.length, anchor.bleed)
        : null,
      recorded: recorded.has(date),
      predicted: predicted.has(date) && !recorded.has(date),
      inMonth: monthOf(date) === month,
      isToday: date === today,
      hasSymptoms: symptomDates.has(date),
    };
  });
}

export function historyRows(logs: PeriodLog[]): HistoryRow[] {
  const sorted = sortLogs(logs);
  return sorted.map((entry, index) => {
    const older = sorted[index + 1];
    return {
      id: entry.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
      days:
        entry.endDate === null
          ? null
          : diffDays(entry.endDate, entry.startDate) + 1,
      cycleLength: older ? diffDays(entry.startDate, older.startDate) : null,
    };
  });
}
