'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  validateTrackerForm,
  type TrackerDateForm,
} from '@/lib/countdownWrite';
import type { TrackerMode } from '@/lib/dayCount';

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

const LABEL_CLASS =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]';

export default function TrackerFormModal({
  mode,
  isEditing,
  initial,
  isSaving,
  error,
  onClose,
  onSave,
}: {
  mode: TrackerMode;
  isEditing: boolean;
  initial: TrackerDateForm;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (form: TrackerDateForm) => void;
}) {
  const [form, setForm] = useState<TrackerDateForm>(initial);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const set = <K extends keyof TrackerDateForm>(key: K, value: TrackerDateForm[K]) => {
    setFieldError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const title = isEditing
    ? mode === 'countdown'
      ? 'Edit countdown'
      : 'Edit date'
    : mode === 'countdown'
      ? 'Add a countdown'
      : 'Add a date';

  const handleSave = () => {
    const problem = validateTrackerForm(form);
    if (problem) {
      setFieldError(problem);
      return;
    }
    onSave(form);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
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
            onClick={handleSave}
            className="min-h-11 flex-1 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="tracker-title">
            {mode === 'countup' ? 'Label' : 'Title'}
          </label>
          <input
            id="tracker-title"
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="tracker-date">
            Date
          </label>
          <input
            id="tracker-date"
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        {mode === 'countdown' && (
          <div>
            <label className={LABEL_CLASS} htmlFor="tracker-time">
              Time (optional)
            </label>
            <input
              id="tracker-time"
              type="time"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              className={FIELD_CLASS}
            />
            <p className="mt-1 text-xs text-[var(--mt-text-muted)]">
              Leave blank for an all-day event.
            </p>
          </div>
        )}
        {(fieldError || error) && (
          <p className="text-sm text-[var(--mt-danger)]">{fieldError ?? error}</p>
        )}
      </div>
    </Modal>
  );
}
