'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
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
  const [calories, setCalories] = useState(entry.calories);
  const [slot, setSlot] = useState(entry.slot);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await updateMeal(entry.id, { dish: dish.trim(), calories, slot });
    setBusy(false);
    onDone();
  }

  async function remove() {
    setBusy(true);
    await deleteMeal(entry);
    setBusy(false);
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
            value={calories}
            onChange={(event) => setCalories(Number(event.target.value))}
            className="min-h-11 w-28 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />
          <span className="text-sm text-[var(--mt-text-muted)]">kcal</span>
        </div>

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
            disabled={busy}
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
