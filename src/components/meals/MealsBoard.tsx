'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import { addDays, addMonths, formatMonthYear, monthOf } from '@/lib/dates';
import { isUserName, type UserName } from '@/lib/identity';
import { foodToday, slotForTime } from '@/lib/mealDay';
import {
  aiFailureForStatus,
  estimateFailureMessage,
  reviewFailureMessage,
} from '@/lib/aiFailure';
import { estimateForBlob } from '@/lib/mealEstimateRequest';
import { mealFetchRange } from '@/lib/mealRange';
import { resizeToPair } from '@/lib/mealImage';
import { allPending, queueMeal, syncPendingMeals } from '@/lib/mealQueue';
import { fetchDays, fetchMeals, fetchReview, saveReview } from '@/lib/mealRepo';
import { sealedDates, weekDates, weekStart } from '@/lib/mealWeek';
import type { PendingMeal } from '@/db/db';
import type { Estimate, MealDay, MealEntry, MealReview } from '@/lib/meals';
import CameraButton from './CameraButton';
import ConfirmCard from './ConfirmCard';
import DayStory from './DayStory';
import MealMonthGrid from './MealMonthGrid';
import UnfinishedDayCard from './UnfinishedDayCard';
import WeekCard from './WeekCard';

export default function MealsBoard() {
  const mounted = useHasMounted();
  const [month, setMonth] = useState('');
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [pending, setPending] = useState<PendingMeal[]>([]);
  const [days, setDays] = useState<MealDay[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [owner, setOwner] = useState<UserName | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const [confirming, setConfirming] = useState<{ entry: MealEntry; estimate: Estimate } | null>(
    null,
  );
  const [review, setReview] = useState<MealReview | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('user_name');
    queueMicrotask(() => {
      setMonth(monthOf(foodToday()));
      if (isUserName(stored)) setOwner(stored);
    });
  }, [mounted]);

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const readQueue = useCallback(async () => {
    setPending(await allPending());
  }, []);

  const load = useCallback(async () => {
    if (month === '') return;
    const now = foodToday();
    const [from, to] = mealFetchRange(month, now);
    const [meals, sealed] = await Promise.all([fetchMeals(from, to), fetchDays(from, to)]);
    if (meals) setEntries(meals);
    if (sealed) setDays(sealed);
    if (owner !== null) setReview(await fetchReview(weekStart(now), owner));
  }, [month, owner]);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      load();
      readQueue();
    });
  }, [mounted, load, readQueue]);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      syncPendingMeals().then(async (settled) => {
        await readQueue();
        if (settled.length > 0) load();
      });
    });
  }, [mounted, load, readQueue]);

  const capture = useCallback(
    async (file: File) => {
      if (owner === null) return;

      setNotice(null);

      try {
        const now = new Date();
        const { full, thumb } = await resizeToPair(file);

        await queueMeal({
          owner,
          date: foodToday(now),
          atTime: `${now.getHours()}`.padStart(2, '0') + ':' + `${now.getMinutes()}`.padStart(2, '0'),
          slot: slotForTime(now),
          full,
          thumb,
        });
        await readQueue();

        const settled = await syncPendingMeals();
        await readQueue();
        if (settled.length === 0) {
          setNotice({
            text: 'Saved on this phone. It will upload when you are back online.',
            tone: 'info',
          });
        } else {
          await load();
          const settledEntry = settled[settled.length - 1];
          const result = await estimateForBlob(full, settledEntry.slot);
          if (result.ok) {
            setConfirming({ entry: settledEntry, estimate: result.estimate });
          } else {
            setNotice({
              text: estimateFailureMessage(result.failure),
              tone: 'info',
            });
          }
        }
      } catch (err) {
        console.error('Failed to save meal photo:', err);
        setNotice({ text: 'That photo did not save. Try again.', tone: 'error' });
      }
    },
    [owner, load, readQueue],
  );

  const runReview = useCallback(async () => {
    if (owner === null || reviewing) return;
    if (review && !review.stale) return;

    setReviewing(true);
    const start = weekStart(foodToday());
    const week = weekDates(start);
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
        await saveReview(start, owner, body);
        setReview(await fetchReview(start, owner));
      } else {
        setNotice({
          text: reviewFailureMessage(aiFailureForStatus(response.status)),
          tone: 'error',
        });
      }
    } catch (err) {
      console.error('Review request failed:', err);
      setNotice({ text: reviewFailureMessage('failed'), tone: 'error' });
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
  const today = now === null ? '' : foodToday(now);
  const yesterday = today === '' ? null : addDays(today, -1);
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

      {owner && today !== '' && (
        <WeekCard
          entries={entries}
          days={days}
          owner={owner}
          today={today}
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

      {month !== '' && (
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
            pending={pending}
            today={today}
            selected={selected}
            onSelect={setSelected}
          />
        </>
      )}

      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className="fixed bottom-44 right-5 z-30 max-w-[220px] rounded-xl px-3 py-2 text-xs font-medium shadow-lg"
          style={{
            background: notice.tone === 'error' ? 'var(--mt-danger)' : 'var(--mt-accent)',
            color:
              notice.tone === 'error'
                ? 'var(--mt-danger-contrast)'
                : 'var(--mt-accent-contrast)',
          }}
        >
          {notice.text}
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
