'use client';

import { useEffect, useRef, useState } from 'react';
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
import {
  BANNER_SWIPE_PX,
  loopHome,
  loopedCards,
  snapLoop,
  stepLoop,
  swipeDirection,
} from '@/lib/carousel';
import { filledFocusBars, filledStreakPips } from '@/lib/homeField';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const ICONS: Record<BannerIcon, typeof Timer> = {
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
  const [index, setIndex] = useState(() => loopHome(cards.length));
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [pausedUntil, setPausedUntil] = useState(0);
  const stillMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const slides = loopedCards(cards);
  const startRef = useRef<number | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    setIndex(loopHome(cards.length));
    setDrag(0);
  }, [cards.length]);

  useEffect(() => {
    if (!quiet) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setQuiet(false));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [quiet]);

  useEffect(() => {
    if (stillMotion || cards.length < 2) return;

    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setIndex((current) => {
        const stepped = stepLoop(current, cards.length, 1);
        return stepped.index;
      });
    }, BANNER_TICK_MS);

    return () => window.clearInterval(id);
  }, [cards.length, pausedUntil, stillMotion]);

  const go = (direction: 1 | -1) => {
    setPausedUntil(Date.now() + BANNER_TICK_MS);
    setIndex((current) => {
      const stepped = stepLoop(current, cards.length, direction);
      return stillMotion && stepped.snap !== null ? stepped.snap : stepped.index;
    });
  };

  const finishDrag = (dx: number) => {
    const step = swipeDirection(dx, BANNER_SWIPE_PX);
    setDrag(0);
    startRef.current = null;
    if (step === 0) return;
    go(step);
  };

  return (
    <div
      className="mt-soft touch-pan-y select-none overflow-hidden"
      onPointerDown={(event) => {
        if (cards.length < 2 || event.button !== 0) return;
        startRef.current = event.clientX;
        draggedRef.current = false;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = startRef.current;
        if (start === null) return;
        const dx = event.clientX - start;
        if (Math.abs(dx) > 8) draggedRef.current = true;
        setDrag(dx);
      }}
      onPointerUp={(event) => {
        if (startRef.current === null) return;
        setDragging(false);
        finishDrag(event.clientX - startRef.current);
      }}
      onPointerCancel={() => {
        startRef.current = null;
        setDragging(false);
        setDrag(0);
      }}
    >
      <div
        className={`flex ${
          stillMotion || quiet || dragging
            ? ''
            : 'transition-transform duration-500 ease-out'
        }`}
        style={{
          transform: `translateX(calc(-${index * 100}% + ${drag}px))`,
        }}
        onTransitionEnd={() => {
          const snap = snapLoop(index, cards.length);
          if (snap === null) return;
          setQuiet(true);
          setIndex(snap);
        }}
      >
        {slides.map((card, slideIndex) => {
          const Icon = ICONS[card.icon];
          const marks = meterMarks(card);
          return (
            <Link
              key={`${card.id}-${slideIndex}`}
              href={card.href}
              className="flex min-h-11 min-w-full shrink-0 items-center justify-between p-4"
              style={{
                ['--mt-accent' as string]: accentVar(card.accent),
                background:
                  'color-mix(in srgb, var(--mt-accent) 18%, var(--mt-surface))',
              }}
              onClick={(event) => {
                if (draggedRef.current) event.preventDefault();
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
