'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  HeartPulse,
  Timer,
} from 'lucide-react';
import { accentVar } from '@/components/ui/PageShell';
import {
  BANNER_SLIDE_MS,
  BANNER_TICK_MS,
  type BannerCard,
  type BannerIcon,
} from '@/lib/bannerCards';
import { coverStart, nextIndex, prevIndex } from '@/lib/carousel';
import { filledFocusBars, filledStreakPips } from '@/lib/homeField';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const ICONS: Record<BannerIcon, typeof Timer> = {
  timer: Timer,
  cycle: HeartPulse,
  streak: GraduationCap,
  countdown: CalendarClock,
};

const SLIDE_EASE = 'cubic-bezier(0.33, 0, 0.2, 1)';

function meterMarks(card: BannerCard): boolean[] {
  if (card.meter === null) return [];
  if (card.meter.kind === 'focus') return filledFocusBars(card.meter.minutes);
  return filledStreakPips(card.meter.days);
}

function SlideFace({ card }: { card: BannerCard }) {
  const Icon = ICONS[card.icon];
  const marks = meterMarks(card);
  return (
    <Link
      href={card.href}
      className="flex h-full min-h-11 w-full items-center justify-between p-4"
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
}

export default function RotatingBanner({ cards }: { cards: BannerCard[] }) {
  const [index, setIndex] = useState(0);
  const [cover, setCover] = useState<{ to: number; dir: 1 | -1 } | null>(null);
  const [shift, setShift] = useState(false);
  const [pausedUntil, setPausedUntil] = useState(0);
  const busyRef = useRef(false);
  const indexRef = useRef(0);
  const stillMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  indexRef.current = index;

  useEffect(() => {
    setIndex(0);
    setCover(null);
    setShift(false);
    busyRef.current = false;
  }, [cards.length]);

  useEffect(() => {
    if (!cover) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setShift(true));
    });
    const stuck = window.setTimeout(() => {
      setIndex(cover.to);
      setCover(null);
      setShift(false);
      busyRef.current = false;
    }, BANNER_SLIDE_MS + 80);
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
      window.clearTimeout(stuck);
    };
  }, [cover]);

  const go = (direction: 1 | -1) => {
    if (cards.length < 2 || busyRef.current) return;
    const from = indexRef.current;
    const to =
      direction === 1
        ? nextIndex(from, cards.length)
        : prevIndex(from, cards.length);
    if (to === from) return;
    setPausedUntil(Date.now() + BANNER_TICK_MS);
    if (stillMotion) {
      setIndex(to);
      return;
    }
    busyRef.current = true;
    setShift(false);
    setCover({ to, dir: direction });
  };

  useEffect(() => {
    if (stillMotion || cards.length < 2) return;

    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil || busyRef.current) return;
      go(1);
    }, BANNER_TICK_MS);

    return () => window.clearInterval(id);
  }, [cards.length, pausedUntil, stillMotion]);

  return (
    <div>
      <div className="mt-soft relative isolate overflow-hidden">
        <SlideFace card={cards[index]} />
        {cover ? (
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${shift ? 0 : coverStart(cover.dir)}%, 0, 0)`,
              transition: shift
                ? `transform ${BANNER_SLIDE_MS}ms ${SLIDE_EASE}`
                : 'none',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
            onTransitionEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.propertyName !== 'transform') return;
              if (!shift) return;
              setIndex(cover.to);
              setCover(null);
              setShift(false);
              busyRef.current = false;
            }}
          >
            <SlideFace card={cards[cover.to]} />
          </div>
        ) : null}
      </div>
      {cards.length > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text)]"
            style={{
              background:
                'color-mix(in srgb, var(--mt-text) 6%, var(--mt-surface))',
            }}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text)]"
            style={{
              background:
                'color-mix(in srgb, var(--mt-text) 6%, var(--mt-surface))',
            }}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
