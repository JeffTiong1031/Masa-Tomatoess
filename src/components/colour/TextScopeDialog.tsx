'use client';

import Modal from '@/components/ui/Modal';

export default function TextScopeDialog({
  open,
  onClose,
  onJustThis,
  onUpdateAll,
}: {
  open: boolean;
  onClose: () => void;
  onJustThis: () => void;
  onUpdateAll: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update text colour for?"
      variant="sheet"
    >
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onJustThis}
          className="min-h-11 w-full rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
        >
          Just this event
        </button>
        <button
          type="button"
          onClick={onUpdateAll}
          className="min-h-11 w-full rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Update colour for all
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-xl px-4 text-sm font-semibold text-[var(--mt-text-muted)]"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
