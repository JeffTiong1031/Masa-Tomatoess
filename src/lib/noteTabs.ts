import { isLive, type Note } from './note';

/** Tabs are what you have open, in the order you opened it, not everything
 *  you own. Ids that no longer resolve are ignored rather than pruned, so a
 *  note that is still loading does not lose its place in the strip. */
export function openTabs(notes: Note[], openIds: string[]): Note[] {
  const byId = new Map(notes.filter(isLive).map((note) => [note.id, note]));
  return openIds
    .map((id) => byId.get(id))
    .filter((note): note is Note => note !== undefined);
}

export function withOpen(openIds: string[], id: string): string[] {
  return openIds.includes(id) ? openIds : [...openIds, id];
}

export function withoutOpen(openIds: string[], ids: string[]): string[] {
  const drop = new Set(ids);
  return openIds.filter((id) => !drop.has(id));
}

/** Closing the tab you were looking at lands you on its neighbour, the way
 *  every tab strip does. Closing any other tab leaves you where you are. */
export function nextActiveId(
  openIds: string[],
  closedIds: string[],
  activeId: string,
): string {
  const left = withoutOpen(openIds, closedIds);
  if (left.length === 0) return '';
  if (left.includes(activeId)) return activeId;
  const wasAt = openIds.indexOf(activeId);
  if (wasAt === -1) return left[0];
  const after = openIds
    .slice(wasAt + 1)
    .find((id) => left.includes(id));
  if (after !== undefined) return after;
  const before = openIds
    .slice(0, wasAt)
    .reverse()
    .find((id) => left.includes(id));
  return before ?? left[0];
}

/** First run after the update. Every note you own is a file now, and all of
 *  them start open, so the pad looks exactly as it did before. */
export function seedOpenIds(notes: Note[]): string[] {
  return notes
    .filter(isLive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((note) => note.id);
}
