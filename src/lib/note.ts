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

export interface NoteRow {
  id: string;
  owner: UserName;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function noteFromRow(row: NoteRow): Note {
  return {
    id: row.id,
    owner: row.owner,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowFromNote(note: Note): NoteRow {
  return {
    id: note.id,
    owner: note.owner,
    title: note.title,
    body: note.body,
    sort_order: note.sortOrder,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

export function titleOrDefault(raw: string): string {
  const trimmed = raw.trim();
  return trimmed === '' ? DEFAULT_NOTE_TITLE : trimmed;
}
