'use client';

import Modal from '@/components/ui/Modal';
import type { CountdownDeleteChoice } from '@/lib/countdownWrite';

export default function CountdownDeleteDialog({
  title,
  isSaving,
  error,
  onChoose,
}: {
  title: string;
  isSaving: boolean;
  error: string | null;
  onChoose: (choice: CountdownDeleteChoice) => void;
}) {
  return (
    <Modal
      open
      onClose={() => onChoose('cancel')}
      title="Remove this countdown?"
      variant="sheet"
    >
      <p className="mb-4 text-sm text-[var(--mt-text-muted)]">
        {title} is a calendar event. Choose what to do with it.
      </p>
      {error && (
        <p className="mb-4 text-sm text-[var(--mt-danger)]">{error}</p>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onChoose('untick')}
          className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-60"
        >
          Remove from countdown only
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onChoose('everywhere')}
          className="min-h-11 rounded-xl border border-[var(--mt-danger)] px-4 text-sm font-semibold text-[var(--mt-danger)] disabled:opacity-60"
        >
          Delete the event everywhere
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onChoose('cancel')}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
