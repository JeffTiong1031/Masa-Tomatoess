import type { UserName } from './identity';

export const DEFAULT_NOTE_TITLE = 'Note';
export const DRAFT_NOTE_TITLE = 'Untitled';
export const NOTE_SAVE_PAUSE_MS = 400;

export interface Note {
  id: string;
  owner: UserName;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  /** A draft lives only on the device that typed it. Being in the cloud
   *  table is what "saved" means, so this never crosses the network. */
  saved: boolean;
  binGroup: string | null;
  deletedAt: string | null;
}

export interface NoteRow {
  id: string;
  owner: UserName;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
  bin_group: string | null;
  deleted_at: string | null;
}

export function noteFromRow(row: NoteRow): Note {
  return {
    id: row.id,
    owner: row.owner,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    folderId: row.folder_id,
    saved: true,
    binGroup: row.bin_group,
    deletedAt:
      row.deleted_at === null ? null : new Date(row.deleted_at).toISOString(),
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
    folder_id: note.folderId,
    bin_group: note.binGroup,
    deleted_at: note.deletedAt,
  };
}

export function titleOrDefault(raw: string): string {
  const trimmed = raw.trim();
  return trimmed === '' ? DEFAULT_NOTE_TITLE : trimmed;
}

export function isLive(note: Note): boolean {
  return note.deletedAt === null;
}
