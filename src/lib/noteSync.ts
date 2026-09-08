import type { UserName } from './identity';
import type { Note } from './note';
import {
  clearPendingDelete,
  loadNotes,
  loadPendingDeletes,
  saveNote,
} from './noteLocal';
import { mergeNotes } from './noteMerge';
import { seedPad } from './notePad';
import { deleteNoteRemote, fetchNotes, upsertNote } from './noteRepo';

export async function reconcileNotes(
  owner: UserName,
  nowIso: string,
  newId: string,
): Promise<Note[]> {
  const pending = await loadPendingDeletes(owner);
  const remoteFetch = await fetchNotes(owner);
  const currentLocal = await loadNotes(owner);
  let merged = mergeNotes(
    currentLocal,
    remoteFetch.status === 'ok' ? remoteFetch.rows : [],
    pending,
  );

  if (merged.length === 0) {
    merged = seedPad(owner, nowIso, newId);
  }

  if (remoteFetch.status === 'ok') {
    for (const id of pending) {
      const deleted = await deleteNoteRemote(id, owner);
      if (deleted) {
        await clearPendingDelete(id);
      }
    }
  }

  for (const row of merged) {
    await saveNote(row);
  }

  if (remoteFetch.status === 'ok') {
    for (const row of merged) {
      await upsertNote(row);
    }
  }

  return merged;
}
