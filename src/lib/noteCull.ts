import type { Note } from './note';

export const NOTE_KEEP_TITLES = ['jeff', 'MFF', 'hi'] as const;
export const NOTE_CULL_FLAG = 'mt-notes-keep-jeff-mff-hi';

export function extraNoteIds(
  notes: Note[],
  keepTitles: readonly string[],
): string[] | null {
  const keep = new Set(keepTitles);
  const hasKeeper = notes.some((note) => keep.has(note.title));
  if (!hasKeeper) {
    return null;
  }
  return notes.filter((note) => !keep.has(note.title)).map((note) => note.id);
}
