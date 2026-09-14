'use client';

import { useState } from 'react';
import { ChevronDown, FolderPlus } from 'lucide-react';
import { folderChoices, type NoteFolder } from '@/lib/noteFolder';

/** The list opens in the flow rather than floating over it. Both places
 *  this is used sit inside a Modal whose body scrolls, and an absolutely
 *  positioned menu gets clipped by that scroll box. */
export default function FolderPicker({
  label,
  folders,
  value,
  noneLabel,
  excludeId,
  onChange,
  onAddFolder,
}: {
  label: string;
  folders: NoteFolder[];
  value: string | null;
  noneLabel: string;
  excludeId?: string;
  onChange: (id: string | null) => void;
  onAddFolder?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const choices = folderChoices(folders, excludeId);
  const chosen = choices.find((choice) => choice.id === value) ?? null;

  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-[var(--mt-text-muted)]">
        {label}
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-left text-sm text-[var(--mt-text)]"
      >
        {chosen === null ? (
          <span className="flex-1 text-[var(--mt-text-muted)]">{noneLabel}</span>
        ) : (
          <>
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: chosen.colour }}
              aria-hidden
            />
            <span className="flex-1 truncate">{chosen.name}</span>
          </>
        )}
        <ChevronDown size={15} className="shrink-0 text-[var(--mt-text-muted)]" aria-hidden />
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl border border-[var(--mt-border)] p-1.5">
          <button
            type="button"
            onClick={() => pick(null)}
            className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm ${
              value === null
                ? 'bg-[color-mix(in_srgb,var(--mt-accent)_30%,transparent)] font-semibold text-[var(--mt-text)]'
                : 'text-[var(--mt-text-muted)]'
            }`}
          >
            {noneLabel}
          </button>
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => pick(choice.id)}
              style={{ paddingLeft: `${0.75 + choice.depth * 1}rem` }}
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg pr-3 text-left text-sm ${
                value === choice.id
                  ? 'bg-[color-mix(in_srgb,var(--mt-accent)_30%,transparent)] font-semibold'
                  : ''
              } text-[var(--mt-text)]`}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: choice.colour }}
                aria-hidden
              />
              <span className="truncate">{choice.name}</span>
            </button>
          ))}
          {onAddFolder !== undefined && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAddFolder();
              }}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-[var(--mt-text-muted)]"
            >
              <FolderPlus size={15} aria-hidden />
              New folder…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
