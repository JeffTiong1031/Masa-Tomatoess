'use client';

import { useIsMdUp } from '@/hooks/useMediaQuery';
import type { LinkPreview } from '@/lib/noteLink';

export function NotesLinkCard({
  preview,
  onOpen = () => {
    window.open(preview.href, '_blank', 'noopener,noreferrer');
  },
}: {
  preview: LinkPreview;
  onOpen?: () => void;
}) {
  const wide = useIsMdUp();

  return (
    <button
      type="button"
      data-note-card=""
      className={
        wide
          ? 'min-h-11 w-full max-w-sm rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-glass)] p-3 text-left'
          : 'flex min-h-11 max-w-full items-center gap-2 rounded-full border border-[var(--mt-border)] bg-[var(--mt-glass)] px-3 py-1.5 text-left'
      }
      onClick={onOpen}
    >
      <span className={wide ? 'flex gap-3' : 'flex min-w-0 items-center gap-2'}>
        <span className="size-8 shrink-0 overflow-hidden rounded-full bg-[var(--mt-accent)]">
          {preview.icon ? (
            <img
              src={preview.icon}
              alt=""
              className="size-full object-cover"
            />
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-[var(--mt-text)]">
            {preview.name}
          </span>
          <span className="block truncate text-sm text-[var(--mt-text-muted)]">
            {preview.site}
          </span>
          {wide && preview.text !== '' ? (
            <span className="mt-1 block text-sm text-[var(--mt-text)]">
              {preview.text}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
