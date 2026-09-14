import type { UserName } from './identity';

export const DEFAULT_FOLDER_NAME = 'Folder';
export const DEFAULT_FOLDER_COLOUR = '#4F7A2A';

export interface NoteFolder {
  id: string;
  owner: UserName;
  parentId: string | null;
  name: string;
  colour: string;
  position: number;
  binGroup: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFolderRow {
  id: string;
  owner: UserName;
  parent_id: string | null;
  name: string;
  colour: string;
  position: number;
  bin_group: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function folderFromRow(row: NoteFolderRow): NoteFolder {
  return {
    id: row.id,
    owner: row.owner,
    parentId: row.parent_id,
    name: row.name,
    colour: row.colour,
    position: row.position,
    binGroup: row.bin_group,
    deletedAt:
      row.deleted_at === null ? null : new Date(row.deleted_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export function rowFromFolder(folder: NoteFolder): NoteFolderRow {
  return {
    id: folder.id,
    owner: folder.owner,
    parent_id: folder.parentId,
    name: folder.name,
    colour: folder.colour,
    position: folder.position,
    bin_group: folder.binGroup,
    deleted_at: folder.deletedAt,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  };
}

export function folderNameOrDefault(raw: string): string {
  const trimmed = raw.trim();
  return trimmed === '' ? DEFAULT_FOLDER_NAME : trimmed;
}

export function liveFolders(folders: NoteFolder[]): NoteFolder[] {
  return folders.filter((folder) => folder.deletedAt === null);
}

export function nextFolderPosition(
  folders: NoteFolder[],
  parentId: string | null,
): number {
  const siblings = folders.filter((folder) => folder.parentId === parentId);
  if (siblings.length === 0) return 100;
  return Math.max(...siblings.map((folder) => folder.position)) + 100;
}

export function newFolder(
  id: string,
  owner: UserName,
  name: string,
  colour: string,
  parentId: string | null,
  position: number,
  nowIso: string,
): NoteFolder {
  return {
    id,
    owner,
    parentId,
    name: folderNameOrDefault(name),
    colour,
    position,
    binGroup: null,
    deletedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export interface FolderNode {
  folder: NoteFolder;
  depth: number;
  children: FolderNode[];
}

/** Nests the flat rows. A row whose parent is missing (binned, or a sync
 *  that landed out of order) is treated as top level rather than dropped,
 *  so a folder can never become unreachable. */
export function folderTree(folders: NoteFolder[]): FolderNode[] {
  const live = liveFolders(folders);
  const present = new Set(live.map((folder) => folder.id));
  const byParent = new Map<string | null, NoteFolder[]>();

  for (const folder of live) {
    const key =
      folder.parentId !== null && present.has(folder.parentId)
        ? folder.parentId
        : null;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(folder);
    else byParent.set(key, [folder]);
  }

  const build = (parentId: string | null, depth: number): FolderNode[] =>
    [...(byParent.get(parentId) ?? [])]
      .sort(byPositionThenName)
      .map((folder) => ({
        folder,
        depth,
        children: build(folder.id, depth + 1),
      }));

  return build(null, 0);
}

function byPositionThenName(a: NoteFolder, b: NoteFolder): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.name.localeCompare(b.name);
}

export function flattenTree(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

/** Every folder under this one, itself included. What a bin action has to
 *  stamp, and what "Inside" may not offer as a destination. */
export function folderAndDescendantIds(
  folders: NoteFolder[],
  id: string,
): string[] {
  const children = new Map<string | null, string[]>();
  for (const folder of folders) {
    const bucket = children.get(folder.parentId);
    if (bucket) bucket.push(folder.id);
    else children.set(folder.parentId, [folder.id]);
  }

  const out: string[] = [];
  const walk = (current: string) => {
    out.push(current);
    for (const child of children.get(current) ?? []) walk(child);
  };
  walk(id);
  return out;
}

export function folderById(
  folders: NoteFolder[],
  id: string | null,
): NoteFolder | null {
  if (id === null) return null;
  return folders.find((folder) => folder.id === id) ?? null;
}

export function folderTrail(
  folders: NoteFolder[],
  id: string | null,
): NoteFolder[] {
  const trail: NoteFolder[] = [];
  const seen = new Set<string>();
  let current = folderById(folders, id);
  while (current !== null && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = folderById(folders, current.parentId);
  }
  return trail;
}

export interface FolderChoice {
  id: string;
  name: string;
  colour: string;
  depth: number;
}

/** The "Inside" and "Folder" dropdowns. `excludeId` drops that folder and
 *  everything under it, which is what stops a folder being moved into its
 *  own child. */
export function folderChoices(
  folders: NoteFolder[],
  excludeId?: string,
): FolderChoice[] {
  const live = liveFolders(folders);
  const banned =
    excludeId === undefined
      ? new Set<string>()
      : new Set(folderAndDescendantIds(live, excludeId));

  return flattenTree(folderTree(live))
    .filter((node) => !banned.has(node.folder.id))
    .map((node) => ({
      id: node.folder.id,
      name: node.folder.name,
      colour: node.folder.colour,
      depth: node.depth,
    }));
}
