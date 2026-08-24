'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { readCalories } from '@/lib/mealEstimate';
import { deleteMeal, updateMeal } from '@/lib/mealRepo';
import type { MealEntry, MealSlot } from '@/lib/meals';

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealEditor({
  entry,
  onDone,
}: {
  entry: MealEntry;
  onDone: () => void;
}) {
  const [dish, setDish] = useState(entry.dish);
  const [calories, setCalories] = useState<number | null>(
    entry.calories > 0 ? entry.calories : null,
  );
  const [slot, setSlot] = useState(entry.slot);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSave = dish.trim() !== '' && calories !== null;

  async function save() {
    if (calories === null) return;
    setBusy(true);
    setFailed(false);
    const saved = await updateMeal(entry.id, { dish: dish.trim(), calories, slot });
    setBusy(false);
    if (saved === null) {
      setFailed(true);
      return;
    }
    onDone();
  }

  async function remove() {
    setBusy(true);
    setFailed(false);
    const removed = await deleteMeal(entry);
    setBusy(false);
    if (!removed) {
      setFailed(true);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <Card>
        <input
          value={dish}
          onChange={(event) => setDish(event.target.value)}
          placeholder="Dish"
          className={`mb-3 ${FIELD_CLASS}`}
        />

        <div className="mb-3 grid grid-cols-4 gap-2">
          {SLOTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSlot(option)}
              className="min-h-11 rounded-xl text-[11px] font-semibold capitalize text-[var(--mt-text)]"
              style={{
                background:
                  option === slot
                    ? 'color-mix(in srgb, var(--mt-accent) 45%, transparent)'
                    : 'var(--mt-surface)',
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={calories ?? ''}
            onChange={(event) => setCalories(readCalories(event.target.value))}
            className="min-h-11 w-28 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />
          <span className="text-sm text-[var(--mt-text-muted)]">kcal</span>
        </div>

        {failed && (
          <p className="mb-3 text-xs text-[var(--mt-danger)]">
            That did not go through. Try again.
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="min-h-11 rounded-xl text-sm font-semibold text-[var(--mt-danger)] disabled:opacity-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="min-h-11 rounded-xl text-sm font-semibold text-[var(--mt-text-muted)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !canSave}
            className="min-h-11 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{
              background: 'var(--mt-accent)',
              color: 'var(--mt-accent-contrast)',
            }}
          >
            Save
          </button>
        </div>
      </Card>
    </div>
  );
}
