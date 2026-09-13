'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  GraduationCap,
  HeartPulse,
  Timer,
} from 'lucide-react';
import { accentVar } from '@/components/ui/PageShell';
import {
  BANNER_TICK_MS,
  type BannerCard,
  type BannerIcon,
} from '@/lib/bannerCards';
import { nextIndex } from '@/lib/carousel';
import { filledFocusBars, filledStreakPips } from '@/lib/homeField';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const ICONS: Record<
  BannerIcon,
  typeof Timer
> = {
  timer: Timer,
  cycle: HeartPulse,
  streak: GraduationCap,
  countdown: CalendarClock,
};

function meterMarks(card: BannerCard): boolean[] {
  if (card.meter === null) return [];
  if (card.meter.kind === 'focus') return filledFocusBars(card.meter.minutes);
  return filledStreakPips(card.meter.days);
}

export default function RotatingBanner({ cards }: { cards: BannerCard[] }) {
  const [index, setIndex] = useState(0);
  const stillMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const safeIndex = Math.min(index, cards.length - 1);

  useEffect(() => {
    if (stillMotion || cards.length < 2) return;

    const id = window.setInterval(() => {
      setIndex((current) => nextIndex(current, cards.length));
    }, BANNER_TICK_MS);

    return () => window.clearInterval(id);
  }, [cards.length, stillMotion]);

  return (
    <div className="mt-soft overflow-hidden">
      <div
        className={`flex ${stillMotion ? '' : 'transition-transform duration-500 ease-out'}`}
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {cards.map((card) => {
          const Icon = ICONS[card.icon];
          const marks = meterMarks(card);
          return (
            <Link
              key={card.id}
              href={card.href}
              className="flex min-h-11 min-w-full shrink-0 items-center justify-between p-4"
              style={{
                ['--mt-accent' as string]: accentVar(card.accent),
                background:
                  'color-mix(in srgb, var(--mt-accent) 18%, var(--mt-surface))',
              }}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mt-text-muted)]">
                  {card.label}
                </div>
                <div className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
                  {card.value}
                </div>
                <div className="mt-3 flex h-1.5 items-center gap-1">
                  {marks.map((filled, markIndex) => (
                    <span
                      key={markIndex}
                      className={`h-1.5 rounded-full ${
                        card.meter?.kind === 'streak' ? 'w-3' : 'w-6'
                      }`}
                      style={{
                        background: filled
                          ? 'var(--mt-accent)'
                          : 'color-mix(in srgb, var(--mt-accent) 22%, transparent)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--mt-accent)]">
                <Icon
                  size={20}
                  strokeWidth={1.9}
                  aria-hidden
                  className="text-[var(--mt-accent-contrast)]"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
