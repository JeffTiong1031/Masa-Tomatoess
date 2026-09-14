import type { UserName } from './identity';
import { noteFromRow, rowFromNote, type Note, type NoteRow } from './note';
import { logRemoteError } from './remoteError';
import { supabase } from './supabase';

export type NoteFetch =
  | { status: 'ok'; rows: Note[] }
  | { status: 'missing-table' }
  | { status: 'error' };

const COLUMNS =
  'id, owner, title, body, sort_order, created_at, updated_at, folder_id, bin_group, deleted_at';
const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];
const MISSING_COLUMN_CODES = ['42703', 'PGRST204'];

/** Columns as they were before folders existed. Jeff runs the SQL by hand,
 *  so between a deploy and that paste the table has no folder_id -- and a
 *  hard failure there would stop notes syncing at all, which is worse than
 *  folders staying on one device for an afternoon. */
const LEGACY_COLUMNS = 'id, owner, title, body, sort_order, created_at, updated_at';

type LegacyNoteRow = Omit<NoteRow, 'folder_id' | 'bin_group' | 'deleted_at'>;

function fromLegacyRow(row: LegacyNoteRow): Note {
  return noteFromRow({
    ...row,
    folder_id: null,
    bin_group: null,
    deleted_at: null,
  });
}

function legacyRowFromNote(note: Note): LegacyNoteRow {
  const { folder_id, bin_group, deleted_at, ...rest } = rowFromNote(note);
  void folder_id;
  void bin_group;
  void deleted_at;
  return rest;
}

export async function fetchNotes(owner: UserName): Promise<NoteFetch> {
  const { data, error } = await supabase
    .from('notes')
    .select(COLUMNS)
    .eq('owner', owner)
    .order('sort_order');

  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code)) return { status: 'missing-table' };
    if (MISSING_COLUMN_CODES.includes(error.code)) return fetchNotesLegacy(owner);
    logRemoteError('Failed to load notes:', error);
    return { status: 'error' };
  }

  return { status: 'ok', rows: (data as NoteRow[]).map(noteFromRow) };
}

async function fetchNotesLegacy(owner: UserName): Promise<NoteFetch> {
  const { data, error } = await supabase
    .from('notes')
    .select(LEGACY_COLUMNS)
    .eq('owner', owner)
    .order('sort_order');

  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code)) return { status: 'missing-table' };
    logRemoteError('Failed to load notes:', error);
    return { status: 'error' };
  }

  return { status: 'ok', rows: (data as LegacyNoteRow[]).map(fromLegacyRow) };
}

export async function upsertNote(note: Note): Promise<boolean> {
  const { error } = await supabase.from('notes').upsert(rowFromNote(note));

  if (error) {
    if (MISSING_COLUMN_CODES.includes(error.code)) {
      const legacy = await supabase.from('notes').upsert(legacyRowFromNote(note));
      if (legacy.error) {
        logRemoteError('Failed to save a note:', legacy.error);
        return false;
      }
      return true;
    }
    logRemoteError('Failed to save a note:', error);
    return false;
  }
  return true;
}

export async function deleteNoteRemote(
  id: string,
  owner: UserName,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('owner', owner)
    .select('id');

  if (error) {
    logRemoteError('Failed to delete a note:', error);
    return false;
  }
  if ((data?.length ?? 0) > 0) return true;

  const leftover = await supabase
    .from('notes')
    .select('id')
    .eq('id', id)
    .eq('owner', owner)
    .maybeSingle();

  if (leftover.error) {
    logRemoteError('Failed to delete a note:', leftover.error);
    return false;
  }
  return leftover.data === null;
}
