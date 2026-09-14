import type { UserName } from './identity';
import type { Note } from './note';
import {
  clearPendingDelete,
  deleteNoteLocally,
  loadNotes,
  loadPendingDeletes,
  saveNote,
} from './noteLocal';
import { mergeNotes } from './noteMerge';
import { seedPad } from './notePad';
import { deleteNoteRemote, fetchNotes, upsertNote } from './noteRepo';

let reconcileTail: Promise<void> = Promise.resolve();

export async function forgetNote(
  id: string,
  owner: UserName,
): Promise<void> {
  await deleteNoteLocally(id, owner);
  await deleteNoteRemote(id, owner);
}

export async function reconcileNotes(
  owner: UserName,
  nowIso: string,
  newId: string,
): Promise<Note[]> {
  const run = reconcileTail.then(() =>
    reconcileNotesNow(owner, nowIso, newId),
  );
  reconcileTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function reconcileNotesNow(
  owner: UserName,
  nowIso: string,
  newId: string,
): Promise<Note[]> {
  const remoteFetch = await fetchNotes(owner);
  const currentLocal = await loadNotes(owner);
  const pending = await loadPendingDeletes(owner);
  let merged = mergeNotes(
    currentLocal,
    remoteFetch.status === 'ok' ? remoteFetch.rows : [],
    pending,
  );

  if (merged.length === 0) {
    merged = seedPad(owner, nowIso, newId);
  }

  const blocked = new Set(await loadPendingDeletes(owner));
  merged = merged.filter((row) => !blocked.has(row.id));
  if (merged.length === 0) {
    merged = seedPad(owner, nowIso, newId);
  }

  if (remoteFetch.status === 'ok') {
    for (const id of blocked) {
      const deleted = await deleteNoteRemote(id, owner);
      if (deleted) {
        await clearPendingDelete(id);
      }
    }
  }

  const written: Note[] = [];
  for (const row of merged) {
    const stillGone = new Set(await loadPendingDeletes(owner));
    if (stillGone.has(row.id)) {
      continue;
    }
    await saveNote(row);
    if (remoteFetch.status === 'ok') {
      await upsertNote(row);
    }
    written.push(row);
  }

  if (written.length === 0) {
    const seed = seedPad(owner, nowIso, newId);
    await saveNote(seed[0]);
    if (remoteFetch.status === 'ok') {
      await upsertNote(seed[0]);
    }
    return seed;
  }

  return written;
}
