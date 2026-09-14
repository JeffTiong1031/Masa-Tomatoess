import type { UserName } from './identity';
import {
  folderFromRow,
  rowFromFolder,
  type NoteFolder,
  type NoteFolderRow,
} from './noteFolder';
import { logRemoteError } from './remoteError';
import { supabase } from './supabase';

export type FolderFetch =
  | { status: 'ok'; rows: NoteFolder[] }
  | { status: 'missing-table' }
  | { status: 'error' };

const COLUMNS =
  'id, owner, parent_id, name, colour, position, bin_group, deleted_at, created_at, updated_at';
const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];

export async function fetchFolders(owner: UserName): Promise<FolderFetch> {
  const { data, error } = await supabase
    .from('note_folders')
    .select(COLUMNS)
    .eq('owner', owner)
    .order('position');

  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code)) return { status: 'missing-table' };
    logRemoteError('Failed to load note folders:', error);
    return { status: 'error' };
  }

  return { status: 'ok', rows: (data as NoteFolderRow[]).map(folderFromRow) };
}

export async function upsertFolders(folders: NoteFolder[]): Promise<boolean> {
  if (folders.length === 0) return true;
  const { error } = await supabase
    .from('note_folders')
    .upsert(folders.map(rowFromFolder));

  if (error) {
    logRemoteError('Failed to save a note folder:', error);
    return false;
  }
  return true;
}

export async function deleteFoldersRemote(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { error } = await supabase.from('note_folders').delete().in('id', ids);

  if (error) {
    logRemoteError('Failed to delete a note folder:', error);
    return false;
  }
  return true;
}
