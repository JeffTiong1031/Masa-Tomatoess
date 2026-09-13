import type { UserName } from './identity';
import { noteFromRow, rowFromNote, type Note, type NoteRow } from './note';
import { logRemoteError } from './remoteError';
import { supabase } from './supabase';

export type NoteFetch =
  | { status: 'ok'; rows: Note[] }
  | { status: 'missing-table' }
  | { status: 'error' };

const COLUMNS = 'id, owner, title, body, sort_order, created_at, updated_at';
const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];

export async function fetchNotes(owner: UserName): Promise<NoteFetch> {
  const { data, error } = await supabase
    .from('notes')
    .select(COLUMNS)
    .eq('owner', owner)
    .order('sort_order');

  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code)) return { status: 'missing-table' };
    logRemoteError('Failed to load notes:', error);
    return { status: 'error' };
  }

  return { status: 'ok', rows: (data as NoteRow[]).map(noteFromRow) };
}

export async function upsertNote(note: Note): Promise<boolean> {
  const { error } = await supabase.from('notes').upsert(rowFromNote(note));

  if (error) {
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
