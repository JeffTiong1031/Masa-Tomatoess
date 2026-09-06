'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SwatchAddSheet from '@/components/colour/SwatchAddSheet';
import Modal from '@/components/ui/Modal';
import type { CalendarEvent } from '@/lib/calendarEvent';
import {
  CATEGORY_MESSAGES,
  affectedCount,
  validateCategory,
  type Category,
} from '@/lib/categories';
import {
  STARTER_FILLS,
  canDeleteSwatch,
  type ColourSwatch,
} from '@/lib/colourPalette';
import { deleteSwatch, insertSwatch } from '@/lib/colourRepo';
import type { UserName } from '@/lib/identity';

export default function CategoryManager({
  categories,
  events,
  swatches,
  owner,
  isSaving,
  onAdd,
  onRename,
  onDelete,
  onSwatchesChange,
  onClose,
}: {
  categories: Category[];
  events: CalendarEvent[];
  swatches: ColourSwatch[];
  owner: UserName;
  isSaving: boolean;
  onAdd: (name: string, swatchId: string) => void;
  onRename: (id: string, name: string, swatchId: string) => void;
  onDelete: (id: string) => void;
  onSwatchesChange: (swatches: ColourSwatch[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [swatchId, setSwatchId] = useState(swatches[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(
    null,
  );
  const [addOpen, setAddOpen] = useState(false);

  const fillOf = (id: string) =>
    swatches.find((item) => item.id === id)?.fill ?? 'var(--mt-text-muted)';

  const handleAdd = () => {
    const problem = validateCategory({ name, swatchId }, categories, null);
    if (problem) {
      setError(CATEGORY_MESSAGES[problem]);
      return;
    }
    setError(null);
    setName('');
    onAdd(name, swatchId);
  };

  const commitRename = (category: Category) => {
    const next = drafts[category.id];
    if (next === undefined || next === category.name) return;

    const problem = validateCategory(
      { name: next, swatchId: category.swatchId },
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
    onRename(category.id, next, category.swatchId);
  };

  const addColour = async (fill: string, textColor: string | null) => {
    const created = await insertSwatch(owner, 'calendar', fill, textColor);
    if (created === null) {
      setError('Could not add a colour. Check your connection and try again.');
      return;
    }
    onSwatchesChange([...swatches, created]);
    setSwatchId(created.id);
    setAddOpen(false);
  };

  const removeColour = async () => {
    if (swatchId === '') return;
    const usedIds = categories.map((category) => category.swatchId);
    if (!canDeleteSwatch(swatchId, usedIds)) {
      const used = usedIds.filter((id) => id === swatchId).length;
      alert(
        used === 1
          ? 'This colour is still used by 1 category.'
          : `This colour is still used by ${used} categories.`,
      );
      return;
    }
    const ok = await deleteSwatch(swatchId);
    if (!ok) {
      setError('Could not delete the colour. Check your connection and try again.');
      return;
    }
    const remaining = swatches.filter((item) => item.id !== swatchId);
    onSwatchesChange(remaining);
    setSwatchId(remaining[0]?.id ?? '');
  };

  return (
    <>
      <Modal open onClose={onClose} title="Categories" variant="sheet">
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: fillOf(category.swatchId) }}
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={drafts[category.id] ?? category.name}
                    aria-label={`Rename ${category.name}`}
                    onChange={(e) => {
                      setRowError(null);
                      setConfirmingId(null);
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
                setConfirmingId(null);
              }}
              className="min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
            />

            <fieldset className="mt-3">
              <legend className="mb-2 text-xs font-semibold text-[var(--mt-text-muted)]">
                Colour
              </legend>
              <div className="flex flex-wrap gap-2">
                {swatches.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    aria-label="Colour"
                    aria-pressed={swatchId === swatch.id}
                    onClick={() => {
                      setSwatchId(swatch.id);
                      setError(null);
                      setConfirmingId(null);
                    }}
                    className={`h-11 w-11 rounded-xl ${
                      swatchId === swatch.id
                        ? 'ring-2 ring-[var(--mt-text)] ring-offset-2 ring-offset-[var(--mt-surface)]'
                        : ''
                    }`}
                    style={{ background: swatch.fill }}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Add colour"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[var(--mt-border)] text-[var(--mt-text-muted)]"
                >
                  <Plus size={20} aria-hidden />
                </button>
              </div>
              {swatchId !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    void removeColour();
                  }}
                  className="mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--mt-danger)]"
                >
                  Delete colour
                </button>
              )}
            </fieldset>

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

      <SwatchAddSheet
        open={addOpen}
        kind="calendar"
        title={name.trim() === '' ? 'Category' : name}
        initialFill={STARTER_FILLS[0]}
        onClose={() => setAddOpen(false)}
        onConfirm={addColour}
      />
    </>
  );
}
