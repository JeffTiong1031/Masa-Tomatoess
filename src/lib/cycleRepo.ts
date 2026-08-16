import { supabase } from './supabase';
import type { PeriodLog } from './cycle';

interface PeriodRow {
  id: string;
  start_date: string;
  end_date: string | null;
}

interface SymptomRow {
  date: string;
  symptoms: string[];
}

export async function fetchPeriods(): Promise<PeriodLog[] | null> {
  const { data, error } = await supabase
    .from('cycle_periods')
    .select('id, start_date, end_date')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Failed to load cycle periods:', error);
    return null;
  }

  return (data as PeriodRow[]).map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}

export async function fetchSymptoms(
  from: string,
  to: string,
): Promise<Record<string, string[]> | null> {
  const { data, error } = await supabase
    .from('cycle_symptoms')
    .select('date, symptoms')
    .gte('date', from)
    .lte('date', to);

  if (error) {
    console.error('Failed to load cycle symptoms:', error);
    return null;
  }

  const byDate: Record<string, string[]> = {};
  for (const row of data as SymptomRow[]) byDate[row.date] = row.symptoms;
  return byDate;
}

export async function insertPeriod(startDate: string): Promise<boolean> {
  const { error } = await supabase
    .from('cycle_periods')
    .insert({ start_date: startDate });

  if (error) {
    console.error('Failed to log period start:', error);
    return false;
  }
  return true;
}

export async function updatePeriod(
  id: string,
  startDate: string,
  endDate: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from('cycle_periods')
    .update({
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update period:', error);
    return false;
  }
  return true;
}

export async function deletePeriod(id: string): Promise<boolean> {
  const { error } = await supabase.from('cycle_periods').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete period:', error);
    return false;
  }
  return true;
}

export async function saveSymptoms(
  date: string,
  symptoms: string[],
): Promise<boolean> {
  const { error } = await supabase.from('cycle_symptoms').upsert(
    { date, symptoms, updated_at: new Date().toISOString() },
    { onConflict: 'date' },
  );

  if (error) {
    console.error('Failed to save symptoms:', error);
    return false;
  }
  return true;
}
