'use client';

import { FileText, Folder } from 'lucide-react';
import { binEntries, daysLeft, type BinEntry } from '@/lib/noteBin';
import type { Note } from '@/lib/note';
import type { NoteFolder } from '@/lib/noteFolder';

export default function BinList({
  notes,
  folders,
  nowMs,
  onRestore,
  onForget,
}: {
  notes: Note[];
  folders: NoteFolder[];
  nowMs: number;
  onRestore: (entry: BinEntry) => void;
  onForget: (entry: BinEntry) => void;
}) {
  const entries = binEntries(notes, folders);

  if (entries.length === 0) {
    return (
      <div className="mt-soft grid place-items-center gap-1 px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[var(--mt-text)]">
          The bin is empty
        </p>
        <p className="text-sm text-[var(--mt-text-muted)]">
          Anything you delete waits here for 30 days.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-soft divide-y divide-[var(--mt-border)]">
      {entries.map((entry) => (
        <div
          key={`${entry.kind}-${entry.id}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
        >
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background:
                entry.colour === null
                  ? 'color-mix(in srgb, var(--mt-text) 6%, transparent)'
                  : `color-mix(in srgb, ${entry.colour} 30%, transparent)`,
            }}
          >
            {entry.kind === 'folder' ? (
              <Folder size={15} strokeWidth={1.9} aria-hidden />
            ) : (
              <FileText size={15} strokeWidth={1.9} aria-hidden />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--mt-text)]">
              {entry.title}
            </span>
            <span className="block text-xs text-[var(--mt-text-muted)]">
              {entry.inside > 0 && `with ${entry.inside} inside · `}
              {daysLeft(entry.deletedAt, nowMs)} days left
            </span>
          </span>

          <button
            type="button"
            onClick={() => onRestore(entry)}
            className="min-h-11 rounded-xl border border-[var(--mt-border)] px-3 text-sm font-semibold text-[var(--mt-text)]"
          >
            Put back
          </button>
          <button
            type="button"
            onClick={() => onForget(entry)}
            className="min-h-11 rounded-xl px-3 text-sm text-[var(--mt-text-muted)]"
          >
            Delete for good
          </button>
        </div>
      ))}
    </div>
  );
}
