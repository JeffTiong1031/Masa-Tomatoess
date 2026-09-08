import type { UserName } from './identity';
import {
  DEFAULT_NOTE_TITLE,
  titleOrDefault,
  type Note,
} from './note';

export { titleOrDefault };

export function nextSortOrder(notes: Note[]): number {
  if (notes.length === 0) return 100;
  return Math.max(...notes.map((note) => note.sortOrder)) + 100;
}

export function seedPad(owner: UserName, nowIso: string, id: string): Note[] {
  return [
    {
      id,
      owner,
      title: DEFAULT_NOTE_TITLE,
      body: '',
      sortOrder: 100,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

export function addNote(
  notes: Note[],
  owner: UserName,
  nowIso: string,
  id: string,
): Note[] {
  return [
    ...notes,
    {
      id,
      owner,
      title: DEFAULT_NOTE_TITLE,
      body: '',
      sortOrder: nextSortOrder(notes),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
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

export function removeNote(
  notes: Note[],
  id: string,
  owner: UserName,
  nowIso: string,
  replacementId: string,
): Note[] {
  const left = notes.filter((note) => note.id !== id);
  if (left.length > 0) return left;
  return seedPad(owner, nowIso, replacementId);
}
