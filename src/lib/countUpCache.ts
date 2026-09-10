import type { CountUpEntry } from './countUpList';

interface PersistedTracker {
  state?: {
    mode?: 'countdown' | 'countup';
    entries?: CountUpEntry[];
  };
  version?: number;
}

export function localCountUpCache(raw: string | null): CountUpEntry[] {
  if (raw === null) return [];
  const parsed = JSON.parse(raw) as PersistedTracker;
  return parsed.state?.entries ?? [];
}

export function withoutLocalCountUpEntries(raw: string | null): string | null {
  if (raw === null) return null;
  const parsed = JSON.parse(raw) as PersistedTracker;
  if (parsed.state === undefined) return raw;
  return JSON.stringify({
    ...parsed,
    state: { mode: parsed.state.mode ?? 'countdown' },
  });
}
