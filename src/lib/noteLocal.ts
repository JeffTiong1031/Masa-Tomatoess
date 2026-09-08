import { db, type NoteRecord } from '@/db/db';
import type { UserName } from '@/lib/identity';
import type { Note } from '@/lib/note';

function toNote(row: NoteRecord): Note {
  return {
    id: row.id,
    owner: row.owner,
    title: row.title,
    body: row.body,
    sortOrder: row.sortOrder,
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

export async function deleteNoteLocally(
  id: string,
  owner: UserName,
): Promise<boolean> {
  try {
    await db.transaction('rw', db.notes, db.pendingNoteDeletes, async () => {
      await db.notes.delete(id);
      await db.pendingNoteDeletes.put({ id, owner });
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
