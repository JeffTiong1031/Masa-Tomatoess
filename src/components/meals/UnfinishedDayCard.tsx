'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { formatLongDate } from '@/lib/dates';
import { missingSlots } from '@/lib/mealDay';
import { insertMeal, sealDay } from '@/lib/mealRepo';
import type { UserName } from '@/lib/identity';
import type { Estimate, MealEntry, MealSlot } from '@/lib/meals';

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

export default function UnfinishedDayCard({
  date,
  owner,
  entries,
  onReload,
}: {
  date: string;
  owner: UserName;
  entries: MealEntry[];
  onReload: () => void;
}) {
  const missing = missingSlots(entries);
  const [slot, setSlot] = useState<MealSlot>(missing[0] ?? 'snack');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function addTyped() {
    setBusy(true);

    let estimate: Estimate | null = null;
    try {
      const response = await fetch('/api/meals/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, slot }),
      });
      if (response.ok) estimate = (await response.json()) as Estimate;
    } catch {
      estimate = null;
    }

    await insertMeal({
      owner,
      date,
      atTime: null,
      slot,
      photo: null,
      dish: estimate?.dish ?? text,
      calories: estimate?.calories ?? 0,
      source: 'typed',
    });

    setText('');
    setBusy(false);
    onReload();
  }

  async function seal() {
    setBusy(true);
    await sealDay(date, owner);
    setBusy(false);
    onReload();
  }

  return (
    <Card className="mb-4">
      <div className="text-sm font-semibold text-[var(--mt-text)]">
        {formatLongDate(date)} looks unfinished
      </div>
      <p className="mb-3 mt-1 text-xs text-[var(--mt-text-muted)]">
        {missing.length > 0
          ? `No ${missing.join(' or ')} recorded. Add what you ate, or seal the day as it is.`
          : 'Seal the day so it counts toward your week.'}
      </p>

      {missing.length > 0 && (
        <>
          <div className="mb-2 flex gap-2">
            {missing.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSlot(option)}
                className="min-h-11 flex-1 rounded-xl text-[11px] font-semibold capitalize text-[var(--mt-text)]"
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

          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Half a plate of nasi lemak with fried chicken"
            className={`mb-2 ${FIELD_CLASS}`}
          />

          <button
            type="button"
            onClick={addTyped}
            disabled={busy || text.trim() === ''}
            className="mb-2 min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{
              background: 'color-mix(in srgb, var(--mt-accent) 45%, transparent)',
              color: 'var(--mt-text)',
            }}
          >
            Add it
          </button>
        </>
      )}

      <button
        type="button"
        onClick={seal}
        disabled={busy}
        className="min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
        style={{
          background: 'var(--mt-accent)',
          color: 'var(--mt-accent-contrast)',
        }}
      >
        That&apos;s everything
      </button>
    </Card>
  );
}
