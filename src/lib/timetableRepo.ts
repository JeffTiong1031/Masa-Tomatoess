import type { SwatchIndex } from './categories';
import type { Weekday } from './dates';
import type { UserName } from './identity';
import { supabase } from './supabase';
import type { RuleDraft, TimetableRule } from './timetableRule';

interface RuleRow {
  id: string;
  owner: UserName;
  weekday: Weekday;
  title: string;
  start_time: string;
  end_time: string;
  swatch: SwatchIndex;
}

function toColumns(draft: RuleDraft) {
  return {
    weekday: draft.weekday,
    title: draft.title.trim(),
    start_time: draft.startTime,
    end_time: draft.endTime,
    swatch: draft.swatch,
  };
}

export async function fetchRules(): Promise<TimetableRule[] | null> {
  const { data, error } = await supabase
    .from('timetable_rules')
    .select('id, owner, weekday, title, start_time, end_time, swatch');

  if (error) {
    console.error('Failed to load timetable rules:', error);
    return null;
  }

  return (data as RuleRow[]).map((row) => ({
    id: row.id,
    owner: row.owner,
    weekday: row.weekday,
    title: row.title,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    swatch: row.swatch,
  }));
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
