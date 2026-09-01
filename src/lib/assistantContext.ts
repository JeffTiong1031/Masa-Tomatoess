export interface HandleMap {
  prefix: string;
  byId: Record<string, string>;
  byHandle: Record<string, string>;
  next: number;
}

export function emptyHandleMap(prefix: string): HandleMap {
  return { prefix, byId: {}, byHandle: {}, next: 1 };
}

export function assignHandles(map: HandleMap, ids: string[]): HandleMap {
  const byId = { ...map.byId };
  const byHandle = { ...map.byHandle };
  let next = map.next;

  for (const id of ids) {
    if (byId[id] !== undefined) continue;
    const handle = `${map.prefix}${next}`;
    byId[id] = handle;
    byHandle[handle] = id;
    next += 1;
  }

  return { prefix: map.prefix, byId, byHandle, next };
}

export function handleOf(map: HandleMap, id: string): string | null {
  return map.byId[id] ?? null;
}

export function idOf(map: HandleMap, handle: string): string | null {
  return map.byHandle[handle] ?? null;
}
