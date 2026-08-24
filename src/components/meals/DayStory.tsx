'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { formatLongDate } from '@/lib/dates';
import { USERS } from '@/lib/identity';
import { intakeFor } from '@/lib/mealDay';
import { retryFailureMessage, type AiFailure } from '@/lib/aiFailure';
import { estimateForStoredPhoto } from '@/lib/mealEstimateRequest';
import { storyOrder } from '@/lib/mealStory';
import { photoUrl } from '@/lib/mealRepo';
import type { Estimate, MealEntry, MealPhoto } from '@/lib/meals';
import ConfirmCard from './ConfirmCard';
import MealEditor from './MealEditor';

export default function DayStory({
  date,
  entries,
  onClose,
  onReload,
}: {
  date: string;
  entries: MealEntry[];
  onClose: () => void;
  onReload: () => void;
}) {
  const ordered = storyOrder(entries);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [estimating, setEstimating] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ id: string; failure: AiFailure } | null>(null);
  const [confirming, setConfirming] = useState<{
    entry: MealEntry;
    estimate: Estimate;
  } | null>(null);

  async function estimate(entry: MealEntry, photo: MealPhoto) {
    setEstimating(entry.id);
    setFailed(null);
    const result = await estimateForStoredPhoto(photoUrl(photo.fullPath), entry.slot);
    setEstimating(null);
    if (!result.ok) {
      setFailed({ id: entry.id, failure: result.failure });
      return;
    }
    setConfirming({ entry, estimate: result.estimate });
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--mt-bg)]">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-[var(--mt-bg)] px-5 pb-3 pt-5">
        <div>
          <h2 className="text-lg font-semibold text-[var(--mt-text)]">
            {formatLongDate(date)}
          </h2>
          <div className="mt-1 flex gap-3 text-xs text-[var(--mt-text-muted)]">
            {USERS.map((user) => (
              <span key={user}>
                {user} {intakeFor(entries, date, user)} kcal
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--mt-text-muted)]"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex flex-col gap-5 px-5 pb-24">
        {ordered.length === 0 && (
          <p className="text-sm text-[var(--mt-text-muted)]">
            Nothing photographed on this day.
          </p>
        )}

        {ordered.map((entry) => {
          const photo = entry.photo;

          return (
            <article key={entry.id}>
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl(photo.fullPath)}
                  alt={entry.dish}
                  className="w-full rounded-2xl object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setEditing(entry)}
                className="mt-2 block min-h-11 w-full text-left"
              >
                <div className="text-sm font-semibold text-[var(--mt-text)]">
                  {entry.dish}
                </div>
                <div className="text-xs text-[var(--mt-text-muted)]">
                  {entry.atTime ?? entry.slot} · {entry.owner}
                  {entry.calories > 0 ? ` · ${entry.calories} kcal` : ''}
                </div>
              </button>

              {entry.calories === 0 && photo && (
                <button
                  type="button"
                  onClick={() => estimate(entry, photo)}
                  disabled={estimating !== null}
                  className="min-h-11 w-full rounded-xl text-left text-xs font-semibold text-[var(--mt-text)] disabled:opacity-60"
                >
                  {estimating === entry.id ? 'Reading the photo…' : 'Tap to estimate'}
                </button>
              )}

              {failed?.id === entry.id && (
                <p className="text-xs text-[var(--mt-danger)]">
                  {retryFailureMessage(failed.failure)}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {editing && (
        <MealEditor
          entry={editing}
          onDone={() => {
            setEditing(null);
            onReload();
          }}
        />
      )}

      {confirming && (
        <ConfirmCard
          entry={confirming.entry}
          estimate={confirming.estimate}
          onDone={() => {
            setConfirming(null);
            onReload();
          }}
        />
      )}
    </div>
  );
}
