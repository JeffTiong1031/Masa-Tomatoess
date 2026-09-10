import type { CountUpEntry } from './countUpList';
import type { UserName } from './identity';
import { supabase } from './supabase';

const COLUMNS = 'id, owner, label, date';

interface CountUpRow {
  id: string;
  owner: UserName;
  label: string;
  date: string;
}

function toEntry(row: CountUpRow): CountUpEntry {
  return { id: row.id, label: row.label, date: row.date };
}

export function togetherSeedRow(owner: UserName) {
  return {
    owner,
    label: 'Together',
    date: '2025-08-09',
  };
}

export async function fetchCountUpEntries(
  owner: UserName,
): Promise<CountUpEntry[] | null> {
  const { data, error } = await supabase
    .from('count_up_entries')
    .select(COLUMNS)
    .eq('owner', owner)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load count-up dates:', error);
    return null;
  }

  return (data as CountUpRow[]).map(toEntry);
}

export async function fetchCountUpInitialized(
  owner: UserName,
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('count_up_state')
    .select('owner')
    .eq('owner', owner)
    .maybeSingle();

  if (error) {
    console.error('Failed to load count-up state:', error);
    return null;
  }

  return data !== null;
}

export async function markCountUpInitialized(
  owner: UserName,
): Promise<boolean> {
  const { error } = await supabase
    .from('count_up_state')
    .upsert({ owner }, { onConflict: 'owner' });

  if (error) {
    console.error('Failed to save count-up state:', error);
    return false;
  }

  return true;
}

export async function insertCountUpEntry(
  owner: UserName,
  label: string,
  date: string,
): Promise<CountUpEntry | null> {
  const { data, error } = await supabase
    .from('count_up_entries')
    .insert({ owner, label: label.trim(), date })
    .select(COLUMNS)
    .single();

  if (error) {
    console.error('Failed to add a count-up date:', error);
    return null;
  }

  return toEntry(data as CountUpRow);
}

export async function updateCountUpEntry(
  id: string,
  owner: UserName,
  label: string,
  date: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('count_up_entries')
    .update({
      label: label.trim(),
      date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner', owner);

  if (error) {
    console.error('Failed to edit a count-up date:', error);
    return false;
  }
  return true;
}

export async function deleteCountUpEntry(
  id: string,
  owner: UserName,
): Promise<boolean> {
  const { error } = await supabase
    .from('count_up_entries')
    .delete()
    .eq('id', id)
    .eq('owner', owner);

  if (error) {
    console.error('Failed to delete a count-up date:', error);
    return false;
  }
  return true;
}

const inflight = new Map<UserName, Promise<CountUpEntry[] | null>>();

export async function loadCountUpList(
  owner: UserName,
  fallback: CountUpEntry[],
): Promise<CountUpEntry[] | null> {
  const pending = inflight.get(owner);
  if (pending) return pending;
  const promise = loadCountUpListOnce(owner, fallback).finally(() => {
    inflight.delete(owner);
  });
  inflight.set(owner, promise);
  return promise;
}

function leftoverMissingFrom(
  fallback: CountUpEntry[],
  existing: CountUpEntry[],
): CountUpEntry[] {
  return fallback.filter(
    (item) =>
      !existing.some(
        (row) => row.label === item.label && row.date === item.date,
      ),
  );
}

async function insertAll(
  owner: UserName,
  entries: CountUpEntry[],
): Promise<boolean> {
  for (const entry of entries) {
    const saved = await insertCountUpEntry(owner, entry.label, entry.date);
    if (saved === null) return false;
  }
  return true;
}

async function loadCountUpListOnce(
  owner: UserName,
  fallback: CountUpEntry[],
): Promise<CountUpEntry[] | null> {
  const existing = await fetchCountUpEntries(owner);
  if (existing === null) return null;
  if (existing.length > 0) {
    if (!(await markCountUpInitialized(owner))) return null;
    const extra = leftoverMissingFrom(fallback, existing);
    if (!(await insertAll(owner, extra))) return null;
    if (extra.length === 0) return existing;
    return fetchCountUpEntries(owner);
  }

  const initialized = await fetchCountUpInitialized(owner);
  if (initialized === null) return null;
  if (initialized) return [];

  const seed = togetherSeedRow(owner);
  const toAdd =
    fallback.length > 0
      ? fallback
      : [{ id: '', label: seed.label, date: seed.date }];

  if (!(await insertAll(owner, toAdd))) return null;
  if (!(await markCountUpInitialized(owner))) return null;
  return fetchCountUpEntries(owner);
}
