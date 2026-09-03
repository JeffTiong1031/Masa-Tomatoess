import {
  legacyIndexToStarterPosition,
  type ColourSwatch,
} from './colourPalette';
import { fetchPalette } from './colourRepo';
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
  swatch: number;
  swatch_id: string | null;
  text_override: string | null;
}

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

function toRule(row: RuleRow, swatchId: string): TimetableRule {
  return {
    id: row.id,
    owner: row.owner,
    weekday: row.weekday,
    title: row.title,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    swatchId,
    textOverride: row.text_override,
  };
}

async function paletteOf(
  owner: UserName,
  palettes: Map<UserName, ColourSwatch[]>,
): Promise<ColourSwatch[] | null> {
  const cached = palettes.get(owner);
  if (cached !== undefined) return cached;
  const fetched = await fetchPalette(owner, 'timetable');
  if (fetched === null) return null;
  palettes.set(owner, fetched);
  return fetched;
}

export async function fetchRules(): Promise<TimetableRule[] | null> {
  const { data, error } = await supabase
    .from('timetable_rules')
    .select(
      'id, owner, weekday, title, start_time, end_time, swatch, swatch_id, text_override',
    );

  if (error) {
    console.error('Failed to load timetable rules:', error);
    return null;
  }

  const palettes = new Map<UserName, ColourSwatch[]>();
  const rules: TimetableRule[] = [];

  for (const row of data as RuleRow[]) {
    if (row.swatch_id !== null) {
      rules.push(toRule(row, row.swatch_id));
      continue;
    }

    const position = legacyIndexToStarterPosition(row.swatch);
    if (position === null) continue;

    const palette = await paletteOf(row.owner, palettes);
    if (palette === null) return null;

    const starter = palette.find((swatch) => swatch.position === position);
    if (starter === undefined) continue;

    const { error: migrateError } = await supabase
      .from('timetable_rules')
      .update({ swatch_id: starter.id })
      .eq('id', row.id);

    if (migrateError) {
      console.error('Failed to migrate timetable rule colour:', migrateError);
      return null;
    }

    rules.push(toRule(row, starter.id));
  }

  return rules;
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
