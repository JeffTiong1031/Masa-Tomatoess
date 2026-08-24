'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { needsManualEntry, scaleForPortion } from '@/lib/mealEstimate';
import { updateMeal } from '@/lib/mealRepo';
import type { Estimate, MealEntry, Portion } from '@/lib/meals';

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

const PORTIONS: Portion[] = ['smaller', 'normal', 'larger'];

const PORTION_LABEL: Record<Portion, string> = {
  smaller: 'Smaller',
  normal: 'Normal',
  larger: 'Larger',
};

export default function ConfirmCard({
  entry,
  estimate,
  onDone,
}: {
  entry: MealEntry;
  estimate: Estimate;
  onDone: () => void;
}) {
  const unsure = needsManualEntry(estimate.confidence);
  const [dish, setDish] = useState(unsure ? '' : estimate.dish);
  const [calories, setCalories] = useState(estimate.calories);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateMeal(entry.id, { dish: dish.trim() || estimate.dish, calories });
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4">
      <Card>
        {unsure ? (
          <>
            <p className="mb-3 text-sm font-semibold text-[var(--mt-text)]">
              I can&apos;t tell what this is — what did you eat?
            </p>
            <input
              value={dish}
              onChange={(event) => setDish(event.target.value)}
              placeholder="Dish"
              className={`mb-3 ${FIELD_CLASS}`}
            />
          </>
        ) : (
          <>
            <div className="text-base font-semibold text-[var(--mt-text)]">
              {estimate.dish}
            </div>
            <div className="mb-3 text-xs text-[var(--mt-text-muted)]">
              {estimate.detail}
            </div>
            <input
              value={dish}
              onChange={(event) => setDish(event.target.value)}
              placeholder="Dish"
              className={`mb-3 ${FIELD_CLASS}`}
            />
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PORTIONS.map((portion) => (
                <button
                  key={portion}
                  type="button"
                  onClick={() => setCalories(scaleForPortion(estimate.calories, portion))}
                  className="min-h-11 rounded-xl text-xs font-semibold text-[var(--mt-text)]"
                  style={{
                    background:
                      'color-mix(in srgb, var(--mt-accent) 30%, transparent)',
                  }}
                >
                  {PORTION_LABEL[portion]}
                </button>
              ))}
            </div>
          </>
        )}

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

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{
            background: 'var(--mt-accent)',
            color: 'var(--mt-accent-contrast)',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </Card>
    </div>
  );
}
