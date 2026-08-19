'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { swatchToken, type Category } from '@/lib/categories';
import { validate, type EventDraft, type EventField } from '@/lib/eventForm';
import type { UserName } from '@/lib/identity';

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

const LABEL_CLASS =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]';

export default function EventModal({
  draft,
  categories,
  owner,
  canEdit,
  isEditing,
  isSaving,
  saveError,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  draft: EventDraft;
  categories: Category[];
  owner: UserName;
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  saveError: string | null;
  onChange: (draft: EventDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [fieldError, setFieldError] = useState<{
    field: EventField;
    message: string;
  } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setFieldError(null);
    onChange({ ...draft, [key]: value });
  };

  const toggleAllDay = (allDay: boolean) => {
    setFieldError(null);
    onChange(
      allDay
        ? { ...draft, allDay, startTime: '', endTime: '' }
        : { ...draft, allDay, endDate: '' },
    );
  };

  const handleSave = () => {
    const problem = validate(draft);
    if (problem) {
      setFieldError(problem);
      return;
    }
    onSave();
  };

  const errorFor = (field: EventField) =>
    fieldError?.field === field ? fieldError.message : null;

  const title = canEdit ? (isEditing ? 'Edit event' : 'Add event') : draft.title;

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      variant="sheet"
      footer={
        canEdit ? (
          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (confirmingDelete) onDelete();
                  else setConfirmingDelete(true);
                }}
                disabled={isSaving}
                className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-danger)]"
              >
                {confirmingDelete ? 'Delete — are you sure?' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="min-h-11 flex-1 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : null
      }
    >
      {!canEdit && (
        <p className="mb-4 text-sm text-[var(--mt-text-muted)]">
          This one is {owner}’s, so it is here to read rather than change.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="event-title">
            What
          </label>
          <input
            id="event-title"
            type="text"
            value={draft.title}
            disabled={!canEdit}
            onChange={(e) => set('title', e.target.value)}
            className={FIELD_CLASS}
          />
          {errorFor('title') && (
            <p className="mt-1 text-xs text-[var(--mt-danger)]">
              {errorFor('title')}
            </p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="event-date">
            When
          </label>
          <input
            id="event-date"
            type="date"
            value={draft.date}
            disabled={!canEdit}
            onChange={(e) => set('date', e.target.value)}
            className={FIELD_CLASS}
          />
          {errorFor('date') && (
            <p className="mt-1 text-xs text-[var(--mt-danger)]">
              {errorFor('date')}
            </p>
          )}
        </div>

        <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-[var(--mt-text)]">
          All day
          <input
            type="checkbox"
            checked={draft.allDay}
            disabled={!canEdit}
            onChange={(e) => toggleAllDay(e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        {draft.allDay ? (
          <div>
            <label className={LABEL_CLASS} htmlFor="event-end-date">
              Last day (leave blank for one day)
            </label>
            <input
              id="event-end-date"
              type="date"
              value={draft.endDate}
              disabled={!canEdit}
              onChange={(e) => set('endDate', e.target.value)}
              className={FIELD_CLASS}
            />
            {errorFor('endDate') && (
              <p className="mt-1 text-xs text-[var(--mt-danger)]">
                {errorFor('endDate')}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} htmlFor="event-start">
                Starts
              </label>
              <input
                id="event-start"
                type="time"
                value={draft.startTime}
                disabled={!canEdit}
                onChange={(e) => set('startTime', e.target.value)}
                className={FIELD_CLASS}
              />
              {errorFor('startTime') && (
                <p className="mt-1 text-xs text-[var(--mt-danger)]">
                  {errorFor('startTime')}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="event-end">
                Ends
              </label>
              <input
                id="event-end"
                type="time"
                value={draft.endTime}
                disabled={!canEdit}
                onChange={(e) => set('endTime', e.target.value)}
                className={FIELD_CLASS}
              />
              {errorFor('endTime') && (
                <p className="mt-1 text-xs text-[var(--mt-danger)]">
                  {errorFor('endTime')}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <span className={LABEL_CLASS}>Category</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set('categoryId', null)}
              disabled={!canEdit}
              aria-pressed={draft.categoryId === null}
              className="min-h-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
              style={
                draft.categoryId === null
                  ? { background: 'var(--mt-accent)' }
                  : undefined
              }
            >
              None
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => set('categoryId', category.id)}
                disabled={!canEdit}
                aria-pressed={draft.categoryId === category.id}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
                style={
                  draft.categoryId === category.id
                    ? { background: 'var(--mt-accent)' }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: `var(${swatchToken(category.swatch)})` }}
                  aria-hidden
                />
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="event-notes">
            Remarks
          </label>
          <textarea
            id="event-notes"
            value={draft.notes}
            disabled={!canEdit}
            rows={3}
            onChange={(e) => set('notes', e.target.value)}
            className="w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-3 text-sm text-[var(--mt-text)]"
          />
        </div>

        <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-[var(--mt-text)]">
          Count down to this
          <input
            type="checkbox"
            checked={draft.countdown}
            disabled={!canEdit}
            onChange={(e) => set('countdown', e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        {saveError && (
          <p className="text-sm text-[var(--mt-danger)]">{saveError}</p>
        )}
      </div>
    </Modal>
  );
}
