import type { UserName } from './identity';
import {
  DRAFT_NOTE_TITLE,
  titleOrDefault,
  type Note,
} from './note';

export { titleOrDefault };

export function nextSortOrder(notes: Note[]): number {
  if (notes.length === 0) return 100;
  return Math.max(...notes.map((note) => note.sortOrder)) + 100;
}

/** A fresh note starts as a draft: on this device, in no folder, and out
 *  of the files page until it is saved. */
export function newDraft(
  notes: Note[],
  owner: UserName,
  nowIso: string,
  id: string,
): Note {
  return {
    id,
    owner,
    title: DRAFT_NOTE_TITLE,
    body: '',
    sortOrder: nextSortOrder(notes),
    createdAt: nowIso,
    updatedAt: nowIso,
    folderId: null,
    saved: false,
    binGroup: null,
    deletedAt: null,
  };
}

export function isActiveNoteOwnedBy(
  notes: Note[],
  activeId: string,
  owner: UserName,
): boolean {
  return notes.some((note) => note.id === activeId && note.owner === owner);
}

export function renameNote(
  notes: Note[],
  id: string,
  rawTitle: string,
  nowIso: string,
): Note[] {
  return notes.map((note) =>
    note.id === id
      ? { ...note, title: titleOrDefault(rawTitle), updatedAt: nowIso }
      : note,
  );
}

export function patchNotes(notes: Note[], patches: Note[]): Note[] {
  if (patches.length === 0) return notes;
  const byId = new Map(patches.map((note) => [note.id, note]));
  const merged = notes.map((note) => byId.get(note.id) ?? note);
  const known = new Set(notes.map((note) => note.id));
  return [...merged, ...patches.filter((note) => !known.has(note.id))];
}

export function dropNotes(notes: Note[], ids: string[]): Note[] {
  const drop = new Set(ids);
  return notes.filter((note) => !drop.has(note.id));
}
