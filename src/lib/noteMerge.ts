import type { Note } from './note';

export function mergeNotes(
  local: Note[],
  remote: Note[],
  pendingDeleteIds: string[],
): Note[] {
  const pending = new Set(pendingDeleteIds);
  const byId = new Map<string, Note>();
  for (const row of local) {
    if (pending.has(row.id)) continue;
    byId.set(row.id, row);
  }
  for (const row of remote) {
    if (pending.has(row.id)) continue;
    const existing = byId.get(row.id);
    if (!existing || row.updatedAt > existing.updatedAt) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
