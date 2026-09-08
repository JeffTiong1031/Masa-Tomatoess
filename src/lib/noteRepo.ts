import type { UserName } from './identity';
import { noteFromRow, rowFromNote, type Note, type NoteRow } from './note';
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
    console.error('Failed to load notes:', error);
    return { status: 'error' };
  }

  return { status: 'ok', rows: (data as NoteRow[]).map(noteFromRow) };
}

export async function upsertNote(note: Note): Promise<boolean> {
  const { error } = await supabase.from('notes').upsert(rowFromNote(note));

  if (error) {
    console.error('Failed to save a note:', error);
    return false;
  }
  return true;
}

export async function deleteNoteRemote(
  id: string,
  owner: UserName,
): Promise<boolean> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('owner', owner);

  if (error) {
    console.error('Failed to delete a note:', error);
    return false;
  }
  return true;
}
