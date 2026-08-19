'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { CalendarEvent } from '@/lib/calendarEvent';
import {
  CATEGORY_MESSAGES,
  SWATCHES,
  affectedCount,
  swatchToken,
  validateCategory,
  type Category,
  type SwatchIndex,
} from '@/lib/categories';

export default function CategoryManager({
  categories,
  events,
  isSaving,
  onAdd,
  onRename,
  onDelete,
  onClose,
}: {
  categories: Category[];
  events: CalendarEvent[];
  isSaving: boolean;
  onAdd: (name: string, swatch: SwatchIndex) => void;
  onRename: (id: string, name: string, swatch: SwatchIndex) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [swatch, setSwatch] = useState<SwatchIndex>(SWATCHES[0].index);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(
    null,
  );

  const handleAdd = () => {
    const problem = validateCategory({ name, swatch }, categories, null);
    if (problem) {
      setError(CATEGORY_MESSAGES[problem]);
      return;
    }
    setError(null);
    setName('');
    onAdd(name, swatch);
  };

  const commitRename = (category: Category) => {
    const next = drafts[category.id];
    if (next === undefined || next === category.name) return;

    const problem = validateCategory(
      { name: next, swatch: category.swatch },
      categories,
      category.id,
    );
    if (problem) {
      setRowError({ id: category.id, message: CATEGORY_MESSAGES[problem] });
      return;
    }

    setRowError(null);
    setDrafts((all) => {
      const rest = { ...all };
      delete rest[category.id];
      return rest;
    });
    onRename(category.id, next, category.swatch);
  };

  return (
    <Modal open onClose={onClose} title="Categories" variant="sheet">
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <li key={category.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: `var(${swatchToken(category.swatch)})` }}
                  aria-hidden
                />
                <input
                  type="text"
                  value={drafts[category.id] ?? category.name}
                  aria-label={`Rename ${category.name}`}
                  onChange={(e) => {
                    setRowError(null);
                    setDrafts((all) => ({ ...all, [category.id]: e.target.value }));
                  }}
                  onBlur={() => commitRename(category)}
                  className="min-h-11 flex-1 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    if (confirmingId === category.id) {
                      onDelete(category.id);
                      setConfirmingId(null);
                    } else {
                      setConfirmingId(category.id);
                    }
                  }}
                  aria-label={`Delete ${category.name}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[var(--mt-border)] px-3 text-xs font-semibold text-[var(--mt-danger)]"
                >
                  {confirmingId === category.id ? (
                    `${affectedCount(events, category.id)} lose this tag — sure?`
                  ) : (
                    <Trash2 size={16} aria-hidden />
                  )}
                </button>
              </div>
              {rowError?.id === category.id && (
                <p className="text-xs text-[var(--mt-danger)]">
                  {rowError.message}
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--mt-border)] pt-4">
          <label
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]"
            htmlFor="category-name"
          >
            New category
          </label>
          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {SWATCHES.map((option) => (
              <button
                key={option.index}
                type="button"
                onClick={() => setSwatch(option.index)}
                aria-label={`Colour ${option.index}`}
                aria-pressed={swatch === option.index}
                className="h-11 w-11 rounded-full"
                style={{
                  background: `var(${option.token})`,
                  outline:
                    swatch === option.index ? '2px solid var(--mt-focus)' : undefined,
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-[var(--mt-danger)]">{error}</p>}

          <button
            type="button"
            onClick={handleAdd}
            disabled={isSaving}
            className="mt-3 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
          >
            Add category
          </button>
        </div>
      </div>
    </Modal>
  );
}
