import type { UserName } from './identity';

export const DEFAULT_NOTE_TITLE = 'Note';
export const NOTE_SAVE_PAUSE_MS = 400;

export interface Note {
  id: string;
  owner: UserName;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function titleOrDefault(raw: string): string {
  const trimmed = raw.trim();
  return trimmed === '' ? DEFAULT_NOTE_TITLE : trimmed;
}
