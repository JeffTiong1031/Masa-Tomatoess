'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHasMounted } from '@/hooks/useHasMounted';
import {
  addMonths,
  formatMonthYear,
  monthOf,
  todayISO,
} from '@/lib/dates';
import { isUserName, type UserName } from '@/lib/identity';
import { mealDate, slotForTime } from '@/lib/mealDay';
import { resizeToPair } from '@/lib/mealImage';
import { queueMeal, syncPendingMeals } from '@/lib/mealQueue';
import { fetchMeals } from '@/lib/mealRepo';
import type { MealEntry } from '@/lib/meals';
import CameraButton from './CameraButton';
import DayStory from './DayStory';
import MealMonthGrid from './MealMonthGrid';

function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${addMonths(month, 1)}-01`];
}

export default function MealsBoard() {
  const mounted = useHasMounted();
  const [month, setMonth] = useState(() => monthOf(todayISO()));
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [owner, setOwner] = useState<UserName | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('user_name');
    if (isUserName(stored)) {
      queueMicrotask(() => setOwner(stored));
    }
  }, [mounted]);

  const load = useCallback(async () => {
    const [from, to] = monthRange(month);
    const meals = await fetchMeals(from, to);
    if (meals) setEntries(meals);
  }, [month]);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      load();
    });
  }, [mounted, load]);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      syncPendingMeals().then((settled) => {
        if (settled.length > 0) load();
      });
    });
  }, [mounted, load]);

  const capture = useCallback(
    async (file: File) => {
      if (owner === null) return;

      setCaptureError(null);

      try {
        const now = new Date();
        const { full, thumb } = await resizeToPair(file);

        await queueMeal({
          owner,
          date: mealDate(now),
          atTime: `${now.getHours()}`.padStart(2, '0') + ':' + `${now.getMinutes()}`.padStart(2, '0'),
          slot: slotForTime(now),
          full,
          thumb,
        });

        const settled = await syncPendingMeals();
        if (settled.length > 0) await load();
      } catch (err) {
        console.error('Failed to save meal photo:', err);
        setCaptureError('That photo did not save. Try again.');
      }
    },
    [owner, load],
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text-muted)]"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text-muted)]"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <MealMonthGrid
        month={month}
        entries={entries}
        selected={selected}
        onSelect={setSelected}
      />

      {captureError && (
        <div
          role="alert"
          className="fixed bottom-44 right-5 z-30 max-w-[220px] rounded-xl px-3 py-2 text-xs font-medium shadow-lg"
          style={{
            background: 'var(--mt-danger)',
            color: 'var(--mt-danger-contrast)',
          }}
        >
          {captureError}
        </div>
      )}

      <CameraButton onCapture={capture} />

      {selected && (
        <DayStory
          date={selected}
          entries={entries.filter((entry) => entry.date === selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
