import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeEntries, type TimetableEntry } from '@/lib/timetable';

interface DraftRow {
  id: number;
  time: string;
  activity: string;
}

export default function TimetableEditor({
  initialEntries,
  isSaving,
  error,
  onCancel,
  onSave,
}: {
  initialEntries: TimetableEntry[];
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (entries: TimetableEntry[]) => void;
}) {
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initialEntries.length > 0
      ? initialEntries.map((entry, index) => ({ id: index, ...entry }))
      : [{ id: 0, time: '', activity: '' }],
  );
  const [focusId, setFocusId] = useState<number | null>(null);
  const nextId = useRef(Math.max(initialEntries.length, 1));

  const addRow = () => {
    const id = nextId.current++;
    setRows((current) => [...current, { id, time: '', activity: '' }]);
    setFocusId(id);
  };

  const updateRow = (id: number, patch: Partial<DraftRow>) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (id: number) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const inputClass =
    'min-h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-[7rem_1fr_auto] gap-2">
            <label className="sr-only" htmlFor={`time-${row.id}`}>
              Time for row {index + 1}
            </label>
            <input
              id={`time-${row.id}`}
              value={row.time}
              autoFocus={row.id === focusId}
              onChange={(e) => updateRow(row.id, { time: e.target.value })}
              placeholder="9-11am"
              className={inputClass}
            />
            <label className="sr-only" htmlFor={`activity-${row.id}`}>
              Activity for row {index + 1}
            </label>
            <input
              id={`activity-${row.id}`}
              value={row.activity}
              onChange={(e) => updateRow(row.id, { activity: e.target.value })}
              placeholder="Lectures"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove row ${index + 1}`}
              className="flex min-h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text-subtle)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="min-h-11 rounded-xl border border-dashed border-[var(--mt-border)] text-sm font-semibold text-[var(--mt-text-muted)]"
      >
        Add row
      </button>

      {error && (
        <p className="text-sm text-[var(--mt-danger)]" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRows([])}
          className="min-h-11 px-2 text-sm text-[var(--mt-text-subtle)]"
        >
          Clear all
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onSave(
              normalizeEntries(
                rows.map((row) => ({ time: row.time, activity: row.activity })),
              ),
            )
          }
          className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
