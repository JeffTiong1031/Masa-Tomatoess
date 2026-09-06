import type { UserName } from './identity';
import { supabase } from './supabase';
import {
  rulesFromSwatchRows,
  type RuleDraft,
  type RuleSwatchRow,
  type TimetableRule,
} from './timetableRule';

export const TIMETABLE_RULE_COLUMNS =
  'id, owner, weekday, title, start_time, end_time, swatch_id, text_override';

function toColumns(draft: RuleDraft) {
  return {
    weekday: draft.weekday,
    title: draft.title.trim(),
    start_time: draft.startTime,
    end_time: draft.endTime,
    swatch_id: draft.swatchId,
    text_override: draft.textOverride,
  };
}

export async function fetchRules(): Promise<TimetableRule[] | null> {
  const { data, error } = await supabase
    .from('timetable_rules')
    .select(TIMETABLE_RULE_COLUMNS);

  if (error) {
    console.error('Failed to load timetable rules:', error);
    return null;
  }

  return rulesFromSwatchRows(data as RuleSwatchRow[]);
}

export async function insertRule(
  owner: UserName,
  draft: RuleDraft,
): Promise<boolean> {
  const { error } = await supabase
    .from('timetable_rules')
    .insert({ owner, ...toColumns(draft) });

  if (error) {
    console.error('Failed to add timetable rule:', error);
    return false;
  }
  return true;
}

export async function updateRule(
  id: string,
  draft: RuleDraft,
): Promise<boolean> {
  const { error } = await supabase
    .from('timetable_rules')
    .update(toColumns(draft))
    .eq('id', id);

  if (error) {
    console.error('Failed to update timetable rule:', error);
    return false;
  }
  return true;
}

export async function deleteRule(id: string): Promise<boolean> {
  const { error } = await supabase.from('timetable_rules').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete timetable rule:', error);
    return false;
  }
  return true;
}

export async function deleteRulesOf(owner: UserName): Promise<boolean> {
  const { error } = await supabase
    .from('timetable_rules')
    .delete()
    .eq('owner', owner);

  if (error) {
    console.error('Failed to clear timetable rules:', error);
    return false;
  }
  return true;
}
