import { WEEKDAYS, type Weekday } from './dates';
import type { UserName } from './identity';

export interface TimetableRule {
  id: string;
  owner: UserName;
  weekday: Weekday;
  title: string;
  startTime: string;
  endTime: string;
  swatchId: string;
  textOverride: string | null;
}

export interface RuleSwatchRow {
  id: string;
  owner: UserName;
  weekday: Weekday;
  title: string;
  start_time: string;
  end_time: string;
  swatch_id: string | null;
  text_override: string | null;
}

export function rulesFromSwatchRows(rows: RuleSwatchRow[]): TimetableRule[] {
  const rules: TimetableRule[] = [];
  for (const row of rows) {
    if (row.swatch_id === null) continue;
    rules.push({
      id: row.id,
      owner: row.owner,
      weekday: row.weekday,
      title: row.title,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      swatchId: row.swatch_id,
      textOverride: row.text_override,
    });
  }
  return rules;
}

export interface RuleDraft {
  weekday: Weekday;
  title: string;
  startTime: string;
  endTime: string;
  swatchId: string;
  textOverride: string | null;
}

export type RuleError =
  | { kind: 'titleRequired' }
  | { kind: 'endNotAfterStart' }
  | { kind: 'swatchRequired' }
  | { kind: 'overlaps'; title: string; startTime: string; endTime: string };

export function sortRules(rules: TimetableRule[]): TimetableRule[] {
  return [...rules].sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    const byStart = a.startTime.localeCompare(b.startTime);
    if (byStart !== 0) return byStart;
    return a.title.localeCompare(b.title);
  });
}

export function validateRule(
  draft: RuleDraft,
  owner: UserName,
  existing: TimetableRule[],
  editingId: string | null,
): RuleError | null {
  if (draft.title.trim() === '') return { kind: 'titleRequired' };
  if (draft.swatchId === '') return { kind: 'swatchRequired' };
  if (draft.endTime <= draft.startTime) return { kind: 'endNotAfterStart' };

  const clash = existing.find(
    (rule) =>
      rule.id !== editingId &&
      rule.owner === owner &&
      rule.weekday === draft.weekday &&
      rule.startTime < draft.endTime &&
      draft.startTime < rule.endTime,
  );

  if (clash === undefined) return null;

  return {
    kind: 'overlaps',
    title: clash.title,
    startTime: clash.startTime,
    endTime: clash.endTime,
  };
}

export function ruleMessage(error: RuleError, weekday: Weekday): string {
  if (error.kind === 'titleRequired') return 'Give the class a name.';
  if (error.kind === 'endNotAfterStart') {
    return 'The end time must be after the start time.';
  }
  if (error.kind === 'swatchRequired') return 'Pick a colour.';
  return `${error.title} is already at ${error.startTime}–${error.endTime} on ${WEEKDAYS[weekday]}.`;
}
