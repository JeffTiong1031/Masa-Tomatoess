import { describe, expect, it } from 'vitest';
import { buildBannerCards } from './bannerCards';
import type { CalendarEvent } from './calendarEvent';
import type { CountUpEntry } from './countUpList';

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
  it('leads with period, then streak', () => {
    const cards = buildBannerCards('Period in 4 days', 6, [], [], TODAY);

    expect(cards.map((card) => card.id)).toEqual(['cycle', 'streak']);
    expect(cards[0]).toMatchObject({
      title: 'Period in 4 days',
      href: '/cycle',
      accent: 'cycle',
    });
    expect(cards[1]).toMatchObject({
      title: '6 day streak',
      href: '/study/dashboard',
      accent: 'dashboard',
    });
  });

  it('says one day, not 1 days', () => {
    const cards = buildBannerCards(null, 1, [], [], TODAY);

    expect(cards[0].title).toBe('1 day streak');
  });

  it('drops the period card when the cycle has no label yet', () => {
    const cards = buildBannerCards(null, 6, [], [], TODAY);

    expect(cards.map((card) => card.id)).toEqual(['streak']);
  });

  it('puts starred dates after the fixed cards, sorted by date', () => {
    const cards = buildBannerCards(
      'Period in 4 days',
      6,
      [event('e1', 'Exam', '2026-10-01')],
      [entry('c1', 'Together', '2025-08-09')],
      TODAY,
    );

    expect(cards.map((card) => card.id)).toEqual([
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
    );

    expect(cards[1]).toMatchObject({
      title: 'Together',
      detail: '10 days',
      href: '/countdown',
      accent: 'countdown',
    });
    expect(cards[2]).toMatchObject({ title: 'Exam', detail: '4 days' });
  });

  it('still returns the fixed cards when nothing is starred', () => {
    expect(buildBannerCards('Period today', 3, [], [], TODAY)).toHaveLength(2);
  });
});
