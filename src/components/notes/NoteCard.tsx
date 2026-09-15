'use client';

import { useDraggable } from '@dnd-kit/core';
import { FileText, MoreHorizontal } from 'lucide-react';
import type { Note } from '@/lib/note';
import { notePreview } from '@/lib/noteFiles';
import type { NoteFolder } from '@/lib/noteFolder';
import { whenTouched } from '@/lib/noteWhen';

export function NoteDragTag({ title }: { title: string }) {
  return (
    <div
      aria-hidden
      className="flex max-w-[14rem] items-center gap-2 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] py-2 pl-3 pr-3.5 text-sm font-semibold text-[var(--mt-text)] shadow-[0_8px_24px_color-mix(in_srgb,var(--mt-text)_16%,transparent)]"
    >
      <FileText size={15} strokeWidth={1.8} />
      <span className="truncate">{title}</span>
    </div>
  );
}

export default function NoteCard({
  note,
  folder,
  nowMs,
  showFolderName,
  onOpen,
  onMenu,
}: {
  note: Note;
  folder: NoteFolder | null;
  nowMs: number;
  showFolderName: boolean;
  onOpen: () => void;
  onMenu: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
  });
  const lines = notePreview(note.body);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-[18px] border border-[var(--mt-border)] bg-[var(--mt-surface)] ${
        isDragging ? 'opacity-35' : ''
      }`}
    >
      <div
        className={`flex items-start gap-1 pl-4 pr-1 pt-3 ${
          isDragging ? 'invisible' : ''
        }`}
      >
        <button
          type="button"
          onClick={onOpen}
          {...attributes}
          {...listeners}
          className="min-h-11 flex-1 cursor-pointer touch-manipulation text-left text-sm font-semibold text-[var(--mt-text)]"
        >
          <span className="line-clamp-2">{note.title}</span>
        </button>
        <button
          type="button"
          aria-label={`More for ${note.title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onMenu}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--mt-text-muted)]"
        >
          <MoreHorizontal size={17} aria-hidden />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpen}
        {...attributes}
        {...listeners}
        className={`flex flex-1 cursor-pointer touch-manipulation flex-col gap-1.5 px-4 pb-3 pt-1 text-left ${
          isDragging ? 'invisible' : ''
        }`}
      >
        {lines.length === 0 ? (
          <span className="text-xs text-[var(--mt-text-subtle)]">Empty</span>
        ) : (
          <span className="flex flex-1 flex-col gap-0.5">
            {lines.map((line, index) => (
              <span
                key={index}
                className="flex items-center gap-2 text-xs leading-snug text-[var(--mt-text-muted)]"
              >
                {line.checked !== null && (
                  <span
                    className={`size-3 shrink-0 rounded-[3px] border ${
                      line.checked
                        ? 'border-[var(--mt-text)] bg-[var(--mt-text)]'
                        : 'border-[var(--mt-text-muted)]'
                    }`}
                    aria-hidden
                  />
                )}
                <span
                  className={`truncate ${
                    line.checked === true ? 'line-through' : ''
                  }`}
                >
                  {line.text}
                </span>
              </span>
            ))}
          </span>
        )}

        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--mt-text-muted)]">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{
              background: folder?.colour ?? 'var(--mt-border)',
            }}
            aria-hidden
          />
          {showFolderName && folder !== null && <span>{folder.name} · </span>}
          <span>{whenTouched(note.updatedAt, nowMs)}</span>
        </span>
      </button>
    </div>
  );
}
