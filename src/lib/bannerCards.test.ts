import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BANNER_TICK_MS, buildBannerCards } from './bannerCards';
import type { CalendarEvent } from './calendarEvent';
import type { CountUpEntry } from './countUpList';

const BANNER = readFileSync(
  path.resolve(process.cwd(), 'src/components/home/RotatingBanner.tsx'),
  'utf8',
);
const HUB = readFileSync(
  path.resolve(process.cwd(), 'src/components/HubGrid.tsx'),
  'utf8',
);

const TODAY = '2026-09-11';

function event(id: string, title: string, date: string): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title,
    date,
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown: true,
    categoryId: null,
  };
}

function entry(id: string, label: string, date: string): CountUpEntry {
  return { id, label, date };
}

describe('buildBannerCards', () => {
  it('leads with today, then period, then streak', () => {
    const cards = buildBannerCards('Period in 4 days', 6, [], [], TODAY, 0);

    expect(cards.map((card) => card.id)).toEqual(['today', 'cycle', 'streak']);
    expect(cards[0]).toMatchObject({
      label: 'Today',
      value: '0 min',
      href: '/study/timer',
      accent: 'timer',
      icon: 'timer',
    });
    expect(cards[1]).toMatchObject({
      label: 'Period',
      value: 'Period in 4 days',
      href: '/cycle',
      accent: 'cycle',
      icon: 'cycle',
    });
    expect(cards[2]).toMatchObject({
      label: 'Streak',
      value: '6 days',
      href: '/study/dashboard',
      accent: 'dashboard',
      icon: 'streak',
    });
  });

  it('says one day, not 1 days', () => {
    const cards = buildBannerCards(null, 1, [], [], TODAY, 12);

    expect(cards.find((card) => card.id === 'streak')?.value).toBe('1 day');
    expect(cards[0].value).toBe('12 min');
  });

  it('drops the period card when the cycle has no label yet', () => {
    const cards = buildBannerCards(null, 6, [], [], TODAY, 0);

    expect(cards.map((card) => card.id)).toEqual(['today', 'streak']);
  });

  it('puts starred dates after the fixed cards, sorted by date', () => {
    const cards = buildBannerCards(
      'Period in 4 days',
      6,
      [event('e1', 'Exam', '2026-10-01')],
      [entry('c1', 'Together', '2025-08-09')],
      TODAY,
      0,
    );

    expect(cards.map((card) => card.id)).toEqual([
      'today',
      'cycle',
      'streak',
      'c1',
      'e1',
    ]);
  });

  it('counts down to an event and up from a count-up', () => {
    const cards = buildBannerCards(
      null,
      0,
      [event('e1', 'Exam', '2026-09-15')],
      [entry('c1', 'Together', '2026-09-01')],
      TODAY,
      0,
    );

    expect(cards[2]).toMatchObject({
      label: 'Together',
      value: '10 days',
      href: '/countdown',
      accent: 'countdown',
      icon: 'countdown',
    });
    expect(cards[3]).toMatchObject({ label: 'Exam', value: '4 days' });
  });

  it('still returns today and streak when nothing is starred', () => {
    expect(buildBannerCards('Period today', 3, [], [], TODAY, 0)).toHaveLength(
      3,
    );
  });

  it('holds each card for five seconds', () => {
    expect(BANNER_TICK_MS).toBe(5000);
  });
});

describe('the home banner', () => {
  it('is the only today card and still opens a page when tapped', () => {
    expect(HUB).toContain('RotatingBanner');
    expect(HUB).not.toContain('HomeFocusTile');
    expect(BANNER).toContain('href={card.href}');
    expect(BANNER).not.toContain('ChevronLeft');
    expect(BANNER).not.toContain('aria-label="Previous"');
    expect(BANNER).toContain('transition-transform');
  });
});
