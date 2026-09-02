import type { Reason } from './assistantReply';

export const YEAR_RANGE = 5;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function dateProblem(value: string, today: string): Reason | null {
  if (value === '') return null;
  if (!DATE_PATTERN.test(value)) return { kind: 'badDate', value };

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { kind: 'badDate', value };
  }

  const thisYear = Number(today.slice(0, 4));
  if (year < thisYear - YEAR_RANGE || year > thisYear + YEAR_RANGE) {
    return { kind: 'yearOutOfRange', year };
  }
  return null;
}

export function timeProblem(value: string): Reason | null {
  if (value === '') return null;
  if (!TIME_PATTERN.test(value)) return { kind: 'badTime', value };

  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { kind: 'badTime', value };
  }
  return null;
}

export function duplicateHandleIn(changes: { handle: string }[]): Reason | null {
  const seen = new Set<string>();
  for (const change of changes) {
    if (change.handle === '') continue;
    if (seen.has(change.handle)) {
      return { kind: 'duplicateHandle', handle: change.handle };
    }
    seen.add(change.handle);
  }
  return null;
}
