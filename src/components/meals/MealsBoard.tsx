'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import {
  addDays,
  addMonths,
  formatMonthYear,
  monthGridDates,
  monthOf,
  todayISO,
} from '@/lib/dates';
import { isUserName, type UserName } from '@/lib/identity';
import { mealDate, slotForTime } from '@/lib/mealDay';
import { resizeToPair } from '@/lib/mealImage';
import { queueMeal, syncPendingMeals } from '@/lib/mealQueue';
import { fetchDays, fetchMeals, fetchReview, saveReview } from '@/lib/mealRepo';
import { sealedDates, weekDates, weekStart } from '@/lib/mealWeek';
import type { Estimate, MealDay, MealEntry, MealReview } from '@/lib/meals';
import CameraButton from './CameraButton';
import ConfirmCard from './ConfirmCard';
import DayStory from './DayStory';
import MealMonthGrid from './MealMonthGrid';
import UnfinishedDayCard from './UnfinishedDayCard';
import WeekCard from './WeekCard';

function monthRange(month: string): [string, string] {
  const grid = monthGridDates(month);
  return [grid[0], grid[grid.length - 1]];
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }

  return btoa(binary);
}

async function estimateFor(entry: MealEntry, full: Blob): Promise<Estimate | null> {
  const buffer = await full.arrayBuffer();
  const image = toBase64(buffer);

  try {
    const response = await fetch('/api/meals/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, slot: entry.slot }),
    });
    if (!response.ok) return null;
    return (await response.json()) as Estimate;
  } catch {
    return null;
  }
}

export default function MealsBoard() {
  const mounted = useHasMounted();
  const [month, setMonth] = useState(() => monthOf(todayISO()));
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [days, setDays] = useState<MealDay[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [owner, setOwner] = useState<UserName | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ entry: MealEntry; estimate: Estimate } | null>(
    null,
  );
  const [review, setReview] = useState<MealReview | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('user_name');
    if (isUserName(stored)) {
      queueMicrotask(() => setOwner(stored));
    }
  }, [mounted]);

  const load = useCallback(async () => {
    const [gridFrom, gridTo] = monthRange(month);
    const yesterday = addDays(mealDate(new Date()), -1);
    const week = weekDates(weekStart(todayISO()));
    const from = [gridFrom, yesterday, week[0]].reduce((a, b) => (b < a ? b : a));
    const to = [gridTo, yesterday, week[week.length - 1]].reduce((a, b) => (b > a ? b : a));
    const [meals, sealed] = await Promise.all([fetchMeals(from, to), fetchDays(from, to)]);
    if (meals) setEntries(meals);
    if (sealed) setDays(sealed);
    if (owner !== null) setReview(await fetchReview(weekStart(todayISO()), owner));
  }, [month, owner]);

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
        if (settled.length > 0) {
          await load();
          const settledEntry = settled[settled.length - 1];
          const estimate = await estimateFor(settledEntry, full);
          if (estimate) setConfirming({ entry: settledEntry, estimate });
        }
      } catch (err) {
        console.error('Failed to save meal photo:', err);
        setCaptureError('That photo did not save. Try again.');
      }
    },
    [owner, load],
  );

  const runReview = useCallback(async () => {
    if (owner === null || reviewing) return;
    if (review && !review.stale) return;

    setReviewing(true);
    const week = weekDates(weekStart(todayISO()));
    const sealed = sealedDates(days, week, owner);
    const meals = entries
      .filter((entry) => entry.owner === owner && sealed.includes(entry.date))
      .map(({ date, slot, dish, calories }) => ({ date, slot, dish, calories }));

    try {
      const response = await fetch('/api/meals/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals, sealedCount: sealed.length }),
      });
      if (response.ok) {
        const { body } = await response.json();
        await saveReview(weekStart(todayISO()), owner, body);
        setReview(await fetchReview(weekStart(todayISO()), owner));
      }
    } catch (err) {
      console.error('Review request failed:', err);
    }

    setReviewing(false);
  }, [owner, reviewing, review, days, entries]);

  const reviewLabel = reviewing
    ? 'Reading your week…'
    : review?.stale
      ? 'Refresh'
      : review
        ? 'Reviewed'
        : 'Review my week';
  const reviewDisabled = reviewing || (review !== null && !review.stale);

  const now = mounted ? new Date() : null;
  const yesterday = now === null ? null : addDays(mealDate(now), -1);
  const yesterdaySealed =
    yesterday !== null &&
    days.some((day) => day.date === yesterday && day.owner === owner && day.sealed);
  const nudge =
    now !== null &&
    yesterday !== null &&
    owner !== null &&
    now.getHours() >= 8 &&
    !yesterdaySealed;

  return (
    <>
      {nudge && owner && yesterday && (
        <UnfinishedDayCard
          date={yesterday}
          owner={owner}
          entries={entries.filter((entry) => entry.date === yesterday && entry.owner === owner)}
          onReload={load}
        />
      )}

      {owner && (
        <WeekCard
          entries={entries}
          days={days}
          owner={owner}
          onReview={runReview}
          reviewLabel={reviewLabel}
          reviewDisabled={reviewDisabled}
        />
      )}

      {review && (
        <Card className="mb-4">
          <p className="whitespace-pre-wrap text-sm text-[var(--mt-text)]">{review.body}</p>
          {review.stale && (
            <p className="mt-2 text-xs text-[var(--mt-text-muted)]">
              Out of date — a meal changed since this was written.
            </p>
          )}
        </Card>
      )}

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
          onReload={load}
        />
      )}

      {confirming && (
        <ConfirmCard
          entry={confirming.entry}
          estimate={confirming.estimate}
          onDone={() => {
            setConfirming(null);
            void load();
          }}
        />
      )}
    </>
  );
}
