import { db, type NoteFolderRecord, type NoteRecord } from '@/db/db';
import type { UserName } from '@/lib/identity';
import type { Note } from '@/lib/note';
import type { NoteFolder } from '@/lib/noteFolder';

function toNote(row: NoteRecord): Note {
  return {
    id: row.id,
    owner: row.owner,
    title: row.title,
    body: row.body,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    folderId: row.folderId ?? null,
    saved: row.saved ?? true,
    binGroup: row.binGroup ?? null,
    deletedAt: row.deletedAt ?? null,
  };
}

function toFolder(row: NoteFolderRecord): NoteFolder {
  return {
    id: row.id,
    owner: row.owner,
    parentId: row.parentId,
    name: row.name,
    colour: row.colour,
    position: row.position,
    binGroup: row.binGroup,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function loadNotes(owner: UserName): Promise<Note[]> {
  try {
    const rows = await db.notes.where('owner').equals(owner).sortBy('sortOrder');
    return rows.map(toNote);
  } catch (error) {
    console.error('Failed to load notes:', error);
    return [];
  }
}

export async function saveNote(note: Note): Promise<boolean> {
  try {
    await db.notes.put(note);
    return true;
  } catch (error) {
    console.error('Failed to save note:', error);
    return false;
  }
}

export async function saveNotes(notes: Note[]): Promise<boolean> {
  if (notes.length === 0) return true;
  try {
    await db.notes.bulkPut(notes);
    return true;
  } catch (error) {
    console.error('Failed to save notes:', error);
    return false;
  }
}

/** A draft was never in the cloud, so there is nothing to queue a remote
 *  delete for. Queueing one anyway would have the sync layer chase a row
 *  that does not exist on every reconcile. */
export async function deleteNoteLocally(
  id: string,
  owner: UserName,
  wasSaved = true,
): Promise<boolean> {
  try {
    await db.transaction('rw', db.notes, db.pendingNoteDeletes, async () => {
      await db.notes.delete(id);
      if (wasSaved) await db.pendingNoteDeletes.put({ id, owner });
    });
    return true;
  } catch (error) {
    console.error('Failed to delete note locally:', error);
    return false;
  }
}

export async function loadPendingDeletes(owner: UserName): Promise<string[]> {
  try {
    const rows = await db.pendingNoteDeletes.where('owner').equals(owner).toArray();
    return rows.map((row) => row.id);
  } catch (error) {
    console.error('Failed to load pending note deletes:', error);
    return [];
  }
}

export async function clearPendingDelete(id: string): Promise<void> {
  try {
    await db.pendingNoteDeletes.delete(id);
  } catch (error) {
    console.error('Failed to clear pending note delete:', error);
  }
}

export async function loadFolders(owner: UserName): Promise<NoteFolder[]> {
  try {
    const rows = await db.noteFolders.where('owner').equals(owner).toArray();
    return rows.map(toFolder);
  } catch (error) {
    console.error('Failed to load note folders:', error);
    return [];
  }
}

export async function saveFolders(folders: NoteFolder[]): Promise<boolean> {
  if (folders.length === 0) return true;
  try {
    await db.noteFolders.bulkPut(folders);
    return true;
  } catch (error) {
    console.error('Failed to save note folders:', error);
    return false;
  }
}

export async function deleteFoldersLocally(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  try {
    await db.noteFolders.bulkDelete(ids);
    return true;
  } catch (error) {
    console.error('Failed to delete note folders locally:', error);
    return false;
  }
}
