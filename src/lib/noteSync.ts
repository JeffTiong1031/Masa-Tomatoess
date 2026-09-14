import type { UserName } from './identity';
import type { Note } from './note';
import { expiredBinIds } from './noteBin';
import { extraNoteIds, NOTE_CULL_FLAG, NOTE_KEEP_TITLES } from './noteCull';
import type { NoteFolder } from './noteFolder';
import { deleteFoldersRemote, fetchFolders, upsertFolders } from './noteFolderRepo';
import {
  clearPendingDelete,
  deleteFoldersLocally,
  deleteNoteLocally,
  loadFolders,
  loadNotes,
  loadPendingDeletes,
  saveFolders,
  saveNote,
} from './noteLocal';
import { mergeFolders, mergeNotes } from './noteMerge';
import { deleteNoteRemote, fetchNotes, upsertNote } from './noteRepo';

export interface NotesReconcile {
  notes: Note[];
  folders: NoteFolder[];
}

let reconcileTail: Promise<void> = Promise.resolve();

export async function forgetNote(
  id: string,
  owner: UserName,
  wasSaved = true,
): Promise<void> {
  await deleteNoteLocally(id, owner, wasSaved);
  if (wasSaved) await deleteNoteRemote(id, owner);
}

export async function forgetFolders(ids: string[]): Promise<void> {
  await deleteFoldersLocally(ids);
  await deleteFoldersRemote(ids);
}

export async function reconcileNotes(
  owner: UserName,
  nowIso: string,
): Promise<NotesReconcile> {
  const run = reconcileTail.then(() => reconcileNotesNow(owner, nowIso));
  reconcileTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function reconcileNotesNow(
  owner: UserName,
  nowIso: string,
): Promise<NotesReconcile> {
  const remoteNotes = await fetchNotes(owner);
  const remoteFolders = await fetchFolders(owner);
  const localNotes = await loadNotes(owner);
  const localFolders = await loadFolders(owner);
  const pending = await loadPendingDeletes(owner);

  let notes = mergeNotes(
    localNotes,
    remoteNotes.status === 'ok' ? remoteNotes.rows : [],
    pending,
  );
  let folders = mergeFolders(
    localFolders,
    remoteFolders.status === 'ok' ? remoteFolders.rows : [],
  );

  notes = await dropJeffExtras(owner, notes);

  if (remoteNotes.status === 'ok') {
    for (const id of pending) {
      if (await deleteNoteRemote(id, owner)) await clearPendingDelete(id);
    }
  }

  const expired = expiredBinIds(notes, folders, Date.parse(nowIso));
  for (const id of expired.noteIds) {
    await forgetNote(id, owner);
  }
  if (expired.folderIds.length > 0) {
    await deleteFoldersLocally(expired.folderIds);
    if (remoteFolders.status === 'ok') {
      await deleteFoldersRemote(expired.folderIds);
    }
  }
  const goneNotes = new Set(expired.noteIds);
  const goneFolders = new Set(expired.folderIds);
  notes = notes.filter((note) => !goneNotes.has(note.id));
  folders = folders.filter((folder) => !goneFolders.has(folder.id));

  await saveFolders(folders);
  if (remoteFolders.status === 'ok') {
    await upsertFolders(folders);
  }

  const written: Note[] = [];
  for (const note of notes) {
    /* Re-read per row, not once before the loop: deleting a tab while the
       merge is being written must not have it saved and pushed back. */
    const blocked = new Set(await loadPendingDeletes(owner));
    if (blocked.has(note.id)) continue;
    await saveNote(note);
    /* A draft is local by definition. Pushing one would put an Untitled on
       the other device that was never chosen to be kept, and a delete there
       would eat typing here. */
    if (remoteNotes.status === 'ok' && note.saved) {
      await upsertNote(note);
    }
    written.push(note);
  }

  return { notes: written, folders };
}

async function dropJeffExtras(
  owner: UserName,
  notes: Note[],
): Promise<Note[]> {
  if (owner !== 'Jeff') return notes;
  if (typeof localStorage === 'undefined') return notes;
  if (localStorage.getItem(NOTE_CULL_FLAG) === '1') return notes;
  const extras = extraNoteIds(notes, NOTE_KEEP_TITLES);
  if (extras === null) return notes;
  for (const id of extras) {
    await deleteNoteLocally(id, owner);
  }
  localStorage.setItem(NOTE_CULL_FLAG, '1');
  const gone = new Set(extras);
  return notes.filter((note) => !gone.has(note.id));
}
