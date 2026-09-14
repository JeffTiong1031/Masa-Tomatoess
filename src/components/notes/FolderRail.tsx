'use client';

import { ChevronDown, ChevronRight, FileText, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { folderTree, type FolderNode, type NoteFolder } from '@/lib/noteFolder';

export type FilesPane =
  | { kind: 'folder'; id: string | null }
  | { kind: 'bin' };

export const ROOT_DROP_ID = 'folder:root';
export const folderDropId = (id: string) => `folder:${id}`;

const ROW_CLASS =
  'flex min-h-11 w-full items-center gap-2.5 rounded-xl pr-3 text-left text-sm';

export default function FolderRail({
  folders,
  counts,
  binCount,
  pane,
  collapsed,
  onPane,
  onToggleCollapsed,
}: {
  folders: NoteFolder[];
  counts: Map<string | null, number>;
  binCount: number;
  pane: FilesPane;
  collapsed: Record<string, boolean>;
  onPane: (pane: FilesPane) => void;
  onToggleCollapsed: (id: string) => void;
}) {
  const tree = folderTree(folders);

  return (
    <div className="mt-soft p-2.5">
      <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--mt-text-muted)]">
        Folders
      </p>

      {tree.length === 0 && (
        <p className="px-3 py-3 text-sm text-[var(--mt-text-muted)]">
          No folders yet.
        </p>
      )}

      {tree.map((node) => (
        <FolderRow
          key={node.folder.id}
          node={node}
          counts={counts}
          pane={pane}
          collapsed={collapsed}
          onPane={onPane}
          onToggleCollapsed={onToggleCollapsed}
        />
      ))}

      <div className="mx-3 my-2.5 h-px bg-[var(--mt-border)]" aria-hidden />

      <LooseRow
        count={counts.get(null) ?? 0}
        active={pane.kind === 'folder' && pane.id === null}
        onPane={onPane}
      />

      <button
        type="button"
        onClick={() => onPane({ kind: 'bin' })}
        aria-current={pane.kind === 'bin' ? 'true' : undefined}
        className={`${ROW_CLASS} pl-3 ${
          pane.kind === 'bin'
            ? 'bg-[color-mix(in_srgb,var(--mt-accent)_30%,transparent)] font-semibold text-[var(--mt-text)]'
            : 'text-[var(--mt-text-muted)]'
        }`}
      >
        <Trash2 size={15} strokeWidth={1.8} aria-hidden />
        <span className="flex-1 truncate">Bin</span>
        {binCount > 0 && <span className="text-xs tabular-nums">{binCount}</span>}
      </button>
    </div>
  );
}

function LooseRow({
  count,
  active,
  onPane,
}: {
  count: number;
  active: boolean;
  onPane: (pane: FilesPane) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: ROOT_DROP_ID });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onPane({ kind: 'folder', id: null })}
      aria-current={active ? 'true' : undefined}
      className={`${ROW_CLASS} pl-3 ${
        active
          ? 'bg-[color-mix(in_srgb,var(--mt-accent)_30%,transparent)] font-semibold text-[var(--mt-text)]'
          : 'text-[var(--mt-text-muted)]'
      } ${isOver ? 'ring-2 ring-[var(--mt-accent)]' : ''}`}
    >
      <FileText size={15} strokeWidth={1.8} aria-hidden />
      <span className="flex-1 truncate">Not in a folder</span>
      {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
    </button>
  );
}

function FolderRow({
  node,
  counts,
  pane,
  collapsed,
  onPane,
  onToggleCollapsed,
}: {
  node: FolderNode;
  counts: Map<string | null, number>;
  pane: FilesPane;
  collapsed: Record<string, boolean>;
  onPane: (pane: FilesPane) => void;
  onToggleCollapsed: (id: string) => void;
}) {
  const { folder, depth, children } = node;
  const active = pane.kind === 'folder' && pane.id === folder.id;
  const shut = collapsed[folder.id] === true;
  const { setNodeRef, isOver } = useDroppable({ id: folderDropId(folder.id) });

  return (
    <>
      <div
        ref={setNodeRef}
        className={`flex items-center rounded-xl ${
          active
            ? 'bg-[color-mix(in_srgb,var(--mt-accent)_30%,transparent)]'
            : ''
        } ${isOver ? 'ring-2 ring-[var(--mt-accent)]' : ''}`}
        style={{ paddingLeft: `${depth * 1.125}rem` }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            aria-label={shut ? `Open ${folder.name}` : `Fold ${folder.name}`}
            aria-expanded={!shut}
            onClick={() => onToggleCollapsed(folder.id)}
            className="inline-flex size-11 shrink-0 items-center justify-center text-[var(--mt-text-muted)]"
          >
            {shut ? (
              <ChevronRight size={14} strokeWidth={2.4} aria-hidden />
            ) : (
              <ChevronDown size={14} strokeWidth={2.4} aria-hidden />
            )}
          </button>
        ) : (
          <span className="size-11 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onPane({ kind: 'folder', id: folder.id })}
          aria-current={active ? 'true' : undefined}
          className={`flex min-h-11 flex-1 items-center gap-2.5 pr-3 text-left text-sm ${
            active ? 'font-semibold' : ''
          } text-[var(--mt-text)]`}
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: folder.colour }}
            aria-hidden
          />
          <span className="flex-1 truncate">{folder.name}</span>
          {(counts.get(folder.id) ?? 0) > 0 && (
            <span className="text-xs tabular-nums text-[var(--mt-text-muted)]">
              {counts.get(folder.id)}
            </span>
          )}
        </button>
      </div>

      {!shut &&
        children.map((child) => (
          <FolderRow
            key={child.folder.id}
            node={child}
            counts={counts}
            pane={pane}
            collapsed={collapsed}
            onPane={onPane}
            onToggleCollapsed={onToggleCollapsed}
          />
        ))}
    </>
  );
}
