'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { accentVar } from '@/components/ui/PageShell';
import type { BannerCard } from '@/lib/bannerCards';
import { nextIndex, prevIndex } from '@/lib/carousel';
import { filledStreakPips } from '@/lib/homeField';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const TICK_MS = 5000;
const PAUSE_MS = 10000;

export default function RotatingBanner({
  cards,
  streakDays,
}: {
  cards: BannerCard[];
  streakDays: number;
}) {
  const [index, setIndex] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const stillMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const pips = filledStreakPips(streakDays);

  useEffect(() => {
    if (stillMotion) return;

    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setIndex((current) => nextIndex(current, cards.length));
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [cards.length, pausedUntil, stillMotion]);

  const step = (move: (i: number, len: number) => number) => {
    setPausedUntil(Date.now() + PAUSE_MS);
    setIndex((current) => move(current, cards.length));
  };

  const card = cards[Math.min(index, cards.length - 1)];

  return (
    <div
      className="mt-soft flex flex-col items-center gap-3 px-3 py-4"
      style={{
        ['--mt-accent' as string]: accentVar(card.accent),
        background:
          'color-mix(in srgb, var(--mt-accent) 18%, var(--mt-surface))',
      }}
    >
      <div className="flex w-full items-center gap-1">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => step(prevIndex)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--mt-text)]"
          style={{
            background:
              'color-mix(in srgb, var(--mt-accent) 28%, var(--mt-surface))',
          }}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>

        <Link
          href={card.href}
          className="flex min-w-0 flex-1 flex-col items-center text-center"
        >
          <span className="truncate text-sm font-semibold text-[var(--mt-text)]">
            {card.title}
          </span>
          <span className="truncate text-xs text-[var(--mt-text-muted)]">
            {card.detail}
          </span>
        </Link>

        <button
          type="button"
          aria-label="Next"
          onClick={() => step(nextIndex)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--mt-text)]"
          style={{
            background:
              'color-mix(in srgb, var(--mt-accent) 28%, var(--mt-surface))',
          }}
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {pips.map((filled, pipIndex) => (
          <span
            key={pipIndex}
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: filled
                ? 'var(--mt-accent)'
                : 'color-mix(in srgb, var(--mt-accent) 28%, transparent)',
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1">
        {cards.map((dot, dotIndex) => (
          <span
            key={dot.id}
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                dotIndex === index ? 'var(--mt-text)' : 'var(--mt-border)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
