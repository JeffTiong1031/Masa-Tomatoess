import { sortRules, type TimetableRule } from './timetableRule';

const DEFAULT_FROM = 8;
const DEFAULT_TO = 18;
const DAYS_IN_WEEK = 7;

function startHourOf(time: string): number {
  return Number(time.slice(0, 2));
}

function endHourOf(time: string): number {
  const hour = Number(time.slice(0, 2));
  return time.slice(3) === '00' ? hour : hour + 1;
}

export function gridHours(rules: TimetableRule[]): { from: number; to: number } {
  return {
    from: Math.min(DEFAULT_FROM, ...rules.map((rule) => startHourOf(rule.startTime))),
    to: Math.max(DEFAULT_TO, ...rules.map((rule) => endHourOf(rule.endTime))),
  };
}

export function rulesByWeekday(rules: TimetableRule[]): TimetableRule[][] {
  const days: TimetableRule[][] = Array.from({ length: DAYS_IN_WEEK }, () => []);
  for (const rule of sortRules(rules)) days[rule.weekday].push(rule);
  return days;
}

export function rowSpanOf(
  rule: TimetableRule,
  from: number,
): { startRow: number; endRow: number } {
  return {
    startRow: startHourOf(rule.startTime) - from + 1,
    endRow: endHourOf(rule.endTime) - from + 1,
  };
}
