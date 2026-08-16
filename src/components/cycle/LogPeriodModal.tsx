'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { addDays, formatShortDate } from '@/lib/cycleDates';

export type LogMode = 'start' | 'end' | 'edit';

const TITLES: Record<LogMode, string> = {
  start: 'When did it start?',
  end: 'When did it stop?',
  edit: 'Change these dates',
};

export default function LogPeriodModal({
  mode,
  today,
  initialDate,
  initialEndDate,
  error,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: {
  mode: LogMode;
  today: string;
  initialDate: string;
  initialEndDate: string | null;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (date: string, endDate: string | null) => void;
  onDelete?: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialEndDate ?? '');

  const quickSets = [
    { label: 'Today', value: today },
    { label: 'Yesterday', value: addDays(today, -1) },
    { label: '2 days ago', value: addDays(today, -2) },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={TITLES[mode]}
      variant="sheet"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-[var(--mt-border)] text-sm font-semibold text-[var(--mt-text)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(date, endDate === '' ? null : endDate)}
            className="min-h-11 flex-1 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="cycle-start-date"
            className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]"
          >
            {mode === 'end' ? 'Last day' : 'First day'}
          </label>
          <input
            id="cycle-start-date"
            type="date"
            max={today}
            value={mode === 'end' ? endDate : date}
            onChange={(e) =>
              mode === 'end' ? setEndDate(e.target.value) : setDate(e.target.value)
            }
            className="mt-1 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-base text-[var(--mt-text)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {quickSets.map((quick) => (
            <button
              key={quick.label}
              type="button"
              onClick={() =>
                mode === 'end' ? setEndDate(quick.value) : setDate(quick.value)
              }
              className="min-h-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
            >
              {quick.label}
              <span className="ml-1.5 text-[var(--mt-text-subtle)]">
                {formatShortDate(quick.value)}
              </span>
            </button>
          ))}
        </div>

        {mode === 'edit' && (
          <div>
            <label
              htmlFor="cycle-end-date"
              className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]"
            >
              Last day
            </label>
            <input
              id="cycle-end-date"
              type="date"
              max={today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-base text-[var(--mt-text)]"
            />
            <p className="mt-1 text-xs text-[var(--mt-text-subtle)]">
              Leave empty if it is still going.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--mt-danger)]" role="alert">
            {error}
          </p>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 text-sm font-semibold text-[var(--mt-danger)]"
          >
            Delete this period
          </button>
        )}
      </div>
    </Modal>
  );
}
