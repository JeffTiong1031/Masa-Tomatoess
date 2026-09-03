'use client';

import Modal from '@/components/ui/Modal';
import { WEEKDAYS, type Weekday } from '@/lib/dates';

export default function ClearDialog({
  open,
  weekday,
  isClearing,
  onClose,
  onClearDay,
  onClearWeek,
}: {
  open: boolean;
  weekday: Weekday;
  isClearing: boolean;
  onClose: () => void;
  onClearDay: () => void;
  onClearWeek: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Clear what?" variant="sheet">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={isClearing}
          onClick={onClearDay}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 py-3 text-left text-sm font-semibold text-[var(--mt-text)] disabled:opacity-50"
        >
          Just {WEEKDAYS[weekday]}
          <span className="mt-1 block text-xs font-normal text-[var(--mt-text-muted)]">
            Empties this one day. The other six are untouched.
          </span>
        </button>

        <button
          type="button"
          disabled={isClearing}
          onClick={onClearWeek}
          className="min-h-11 rounded-xl border border-[var(--mt-danger)] px-4 py-3 text-left text-sm font-semibold text-[var(--mt-danger)] disabled:opacity-50"
        >
          The whole week
          <span className="mt-1 block text-xs font-normal text-[var(--mt-text-muted)]">
            Empties all seven days. Your recurring events are not touched.
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--mt-text-muted)]"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
