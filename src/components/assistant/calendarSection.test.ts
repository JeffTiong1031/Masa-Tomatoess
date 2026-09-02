import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchEvents: vi.fn() }));

vi.mock('@/lib/calendarRepo', () => ({
  fetchEvents: mocks.fetchEvents,
  deleteEvent: vi.fn(),
  insertEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

import { calendarSection } from './calendarSection';
import type { CalendarEvent } from '@/lib/calendarEvent';
import type { UserName } from '@/lib/identity';

function event(owner: UserName, id: string): CalendarEvent {
  return {
    id,
    owner,
    title: 'Flight',
    date: '2026-09-10',
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown: false,
    categoryId: null,
  };
}

describe('calendarSection.fetchFresh', () => {
  it('keeps only the rows owned by the requesting user', async () => {
    mocks.fetchEvents.mockResolvedValue([event('Jeff', 'e1'), event('Rachel', 'e2')]);
    const section = calendarSection({ categories: [], month: '2026-09' });

    const rows = await section.fetchFresh('Jeff');

    expect(rows).toEqual([event('Jeff', 'e1')]);
  });

  it('passes a failed fetch straight through as null', async () => {
    mocks.fetchEvents.mockResolvedValue(null);
    const section = calendarSection({ categories: [], month: '2026-09' });

    expect(await section.fetchFresh('Jeff')).toBeNull();
  });
});
