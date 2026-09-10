import { formatTrackerDays } from './dayCount';

export interface CountUpEntry {
  id: string;
  label: string;
  date: string;
}

export interface CountUpRow {
  id: string;
  title: string;
  date: string;
  display: string;
}

export const TOGETHER_SEED: CountUpEntry = {
  id: 'together-seed',
  label: 'Together',
  date: '2025-08-09',
};

export function addCountUp(
  entries: CountUpEntry[],
  label: string,
  date: string,
  id: string,
): CountUpEntry[] {
  return [...entries, { id, label: label.trim(), date }];
}

export function removeCountUp(
  entries: CountUpEntry[],
  id: string,
): CountUpEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function updateCountUp(
  entries: CountUpEntry[],
  id: string,
  label: string,
  date: string,
): CountUpEntry[] {
  return entries.map((entry) =>
    entry.id === id ? { ...entry, label: label.trim(), date } : entry,
  );
}

export function countUpRows(
  entries: CountUpEntry[],
  today: string,
): CountUpRow[] {
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      id: entry.id,
      title: entry.label,
      date: entry.date,
      display: formatTrackerDays('countup', entry.date, today),
    }));
}
