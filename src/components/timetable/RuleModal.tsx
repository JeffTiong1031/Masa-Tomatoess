'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { SWATCHES, swatchToken, type SwatchIndex } from '@/lib/categories';
import { WEEKDAYS, type Weekday } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import {
  ruleMessage,
  validateRule,
  type RuleDraft,
  type TimetableRule,
} from '@/lib/timetableRule';

const FIELD =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]';

export default function RuleModal({
  open,
  owner,
  editing,
  rules,
  isSaving,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  owner: UserName;
  editing: TimetableRule | null;
  rules: TimetableRule[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: RuleDraft) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<RuleDraft>(() =>
    editing === null
      ? { weekday: 0, title: '', startTime: '09:00', endTime: '10:00', swatch: 1 }
      : {
          weekday: editing.weekday,
          title: editing.title,
          startTime: editing.startTime,
          endTime: editing.endTime,
          swatch: editing.swatch,
        },
  );
  const [problem, setProblem] = useState<string | null>(null);

  const patch = (next: Partial<RuleDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setProblem(null);
  };

  const submit = () => {
    const found = validateRule(draft, owner, rules, editing?.id ?? null);
    if (found !== null) {
      setProblem(ruleMessage(found, draft.weekday));
      return;
    }
    onSave(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing === null ? 'Add recurring event' : 'Edit recurring event'}
      variant="sheet"
    >
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
          Day
          <select
            value={draft.weekday}
            onChange={(e) => patch({ weekday: Number(e.target.value) as Weekday })}
            className={`mt-1 ${FIELD}`}
          >
            {WEEKDAYS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
            Starts
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => patch({ startTime: e.target.value })}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
            Ends
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => patch({ endTime: e.target.value })}
              className={`mt-1 ${FIELD}`}
            />
          </label>
        </div>

        <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
          Name
          <input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Data Structures"
            className={`mt-1 ${FIELD}`}
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-[var(--mt-text-muted)]">
            Colour
          </legend>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch.index}
                type="button"
                aria-label={`Colour ${swatch.index}`}
                aria-pressed={draft.swatch === swatch.index}
                onClick={() => patch({ swatch: swatch.index as SwatchIndex })}
                className={`h-11 w-11 rounded-xl ${
                  draft.swatch === swatch.index
                    ? 'ring-2 ring-[var(--mt-text)] ring-offset-2 ring-offset-[var(--mt-surface)]'
                    : ''
                }`}
                style={{ background: `var(${swatchToken(swatch.index)})` }}
              />
            ))}
          </div>
        </fieldset>

        {(problem ?? error) !== null && (
          <p className="text-sm text-[var(--mt-danger)]" role="alert">
            {problem ?? error}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          {editing !== null && (
            <button
              type="button"
              onClick={() => onDelete(editing.id)}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--mt-danger)]"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving}
            className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
