# Home Calendar Card and Rotating Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hub's Streak tile with a calendar card that shows today's merged agenda and a banner that rotates through the period countdown, the study streak, and any starred countdown or count-up dates.

**Architecture:** All decisions live in pure `src/lib/*.ts` modules with Vitest tests, because this repo has no DOM test environment. `HubGrid` stays the only fetching component on the hub and passes plain data down to two new presentational client components. The star flag is read and written through two narrow repo functions per table so no existing type or write path grows a field.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript strict, Tailwind v4 with `--mt-*` custom properties, Supabase, Dexie, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-11-home-calendar-banner-design.md`

## Global Constraints

- Never hardcode a colour. Components reference `--mt-*` tokens only; raw `--mac-*` hues stay in `globals.css`.
- Do not write comments in new code.
- No `instanceof`, no `typeof` shape branching. Model unions properly.
- No defensive guards for states the types already exclude.
- Catch only where there is something to do about it: Supabase and IndexedDB calls, not pure functions.
- Server Components by default; `'use client'` only on the leaf that needs it.
- Touch targets at least 44px. `min-h-dvh`, never `h-screen`.
- Tests sit beside their source as `*.test.ts`. Vitest runs pure functions only.
- Every commit is authored by Jeff alone. No `Co-Authored-By`, no generated-with trailer.
- The database column already exists in Supabase; `pinned boolean not null default false` on `calendar_events` and `count_up_entries`. Do not write migration code.
- Agenda row limit is 4. Auto-advance interval is 5000ms. Post-press pause is 10000ms.
- To-do route is `/timetable/todo`, not `/todo`.

---

### Task 1: Today's agenda merge

**Files:**
- Create: `src/lib/todayAgenda.ts`
- Test: `src/lib/todayAgenda.test.ts`

**Interfaces:**
- Consumes: `CalendarEvent` and `occursOn` from `src/lib/calendarEvent.ts`, `Todo` from `src/lib/todo.ts`
- Produces: `AgendaItem`, `Agenda`, `buildAgenda(events: CalendarEvent[], todos: Todo[], today: string, limit: number): Agenda`

- [ ] **Step 1: Write the failing test**

Create `src/lib/todayAgenda.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildAgenda } from './todayAgenda';
import type { CalendarEvent } from './calendarEvent';
import type { Todo } from './todo';

function event(
  id: string,
  title: string,
  date: string,
  timing: CalendarEvent['timing'],
): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title,
    date,
    timing,
    notes: null,
    countdown: false,
    categoryId: null,
  };
}

function todo(
  id: string,
  title: string,
  dueDate: string | null,
  dueTime: string | null,
  done = false,
): Todo {
  const base = {
    id,
    owner: 'Jeff' as const,
    title,
    dueDate,
    dueTime,
    sortOrder: 0,
    priority: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  return done
    ? { ...base, done: true, completedAt: '2026-09-11T09:00:00.000Z' }
    : { ...base, done: false, completedAt: null };
}

const TODAY = '2026-09-11';

describe('buildAgenda', () => {
  it('puts a timed event before an all-day event', () => {
    const events = [
      event('a', 'Holiday', TODAY, { kind: 'allDay', endDate: null }),
      event('b', 'Class', TODAY, { kind: 'moment', startTime: '09:00' }),
    ];

    const agenda = buildAgenda(events, [], TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual([
      'Class',
      'Holiday',
    ]);
  });

  it('orders timed events by start time', () => {
    const events = [
      event('a', 'Gym', TODAY, { kind: 'moment', startTime: '14:00' }),
      event('b', 'Class', TODAY, { kind: 'span', startTime: '09:00', endTime: '11:00' }),
    ];

    const agenda = buildAgenda(events, [], TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual(['Class', 'Gym']);
  });

  it('puts every event before every to-do', () => {
    const events = [
      event('a', 'Holiday', TODAY, { kind: 'allDay', endDate: null }),
    ];
    const todos = [todo('t1', 'Buy milk', TODAY, '07:00')];

    const agenda = buildAgenda(events, todos, TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual([
      'Holiday',
      'Buy milk',
    ]);
  });

  it('puts an overdue to-do above one due today and marks it late', () => {
    const todos = [
      todo('t1', 'Buy milk', TODAY, '07:00'),
      todo('t2', 'Email Dr Lim', '2026-09-08', null),
    ];

    const agenda = buildAgenda([], todos, TODAY, 4);

    expect(agenda.items.map((item) => item.title)).toEqual([
      'Email Dr Lim',
      'Buy milk',
    ]);
    expect(agenda.items[0]).toMatchObject({ kind: 'todo', late: true });
    expect(agenda.items[1]).toMatchObject({ kind: 'todo', late: false });
  });

  it('drops a finished to-do due today', () => {
    const todos = [todo('t1', 'Buy milk', TODAY, null, true)];

    const agenda = buildAgenda([], todos, TODAY, 4);

    expect(agenda.items).toEqual([]);
    expect(agenda.hiddenCount).toBe(0);
  });

  it('drops an event on another day', () => {
    const events = [
      event('a', 'Trip', '2026-09-20', { kind: 'allDay', endDate: null }),
    ];

    expect(buildAgenda(events, [], TODAY, 4).items).toEqual([]);
  });

  it('keeps a multi-day event that spans today', () => {
    const events = [
      event('a', 'Trip', '2026-09-09', { kind: 'allDay', endDate: '2026-09-13' }),
    ];

    expect(buildAgenda(events, [], TODAY, 4).items).toHaveLength(1);
  });

  it('shows four rows and counts the rest as hidden', () => {
    const events = [
      event('a', 'One', TODAY, { kind: 'moment', startTime: '08:00' }),
      event('b', 'Two', TODAY, { kind: 'moment', startTime: '09:00' }),
      event('c', 'Three', TODAY, { kind: 'moment', startTime: '10:00' }),
      event('d', 'Four', TODAY, { kind: 'moment', startTime: '11:00' }),
      event('e', 'Five', TODAY, { kind: 'moment', startTime: '12:00' }),
    ];

    const agenda = buildAgenda(events, [], TODAY, 4);

    expect(agenda.items).toHaveLength(4);
    expect(agenda.hiddenCount).toBe(1);
  });

  it('sends more to the to-do page when every hidden row is a to-do', () => {
    const events = [
      event('a', 'One', TODAY, { kind: 'moment', startTime: '08:00' }),
    ];
    const todos = [
      todo('t1', 'A', TODAY, '09:00'),
      todo('t2', 'B', TODAY, '10:00'),
      todo('t3', 'C', TODAY, '11:00'),
      todo('t4', 'D', TODAY, '12:00'),
    ];

    expect(buildAgenda(events, todos, TODAY, 4).moreHref).toBe(
      '/timetable/todo',
    );
  });

  it('sends more to the calendar when a hidden row is an event', () => {
    const events = [
      event('a', 'One', TODAY, { kind: 'moment', startTime: '08:00' }),
      event('b', 'Two', TODAY, { kind: 'moment', startTime: '09:00' }),
      event('c', 'Three', TODAY, { kind: 'moment', startTime: '10:00' }),
      event('d', 'Four', TODAY, { kind: 'moment', startTime: '11:00' }),
      event('e', 'Five', TODAY, { kind: 'moment', startTime: '12:00' }),
    ];

    expect(buildAgenda(events, [], TODAY, 4).moreHref).toBe('/calendar');
  });

  it('reports the calendar as the more link when nothing is hidden', () => {
    const agenda = buildAgenda([], [], TODAY, 4);

    expect(agenda.hiddenCount).toBe(0);
    expect(agenda.moreHref).toBe('/calendar');
  });

  it('labels chips by kind', () => {
    const events = [
      event('a', 'Class', TODAY, { kind: 'moment', startTime: '09:00' }),
      event('b', 'Holiday', TODAY, { kind: 'allDay', endDate: null }),
    ];
    const todos = [
      todo('t1', 'Buy milk', TODAY, null),
      todo('t2', 'Email', '2026-09-08', null),
    ];

    const agenda = buildAgenda(events, todos, TODAY, 4);

    expect(agenda.items.map((item) => item.chip)).toEqual([
      '09:00',
      'all day',
      'to-do',
      'Late',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/lib/todayAgenda.test.ts`
Expected: FAIL, cannot find module `./todayAgenda`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/todayAgenda.ts`:

```ts
import { occursOn, type CalendarEvent } from './calendarEvent';
import type { Todo } from './todo';

export type AgendaItem =
  | { kind: 'event'; id: string; title: string; chip: string }
  | { kind: 'todo'; id: string; title: string; chip: string; late: boolean };

export interface Agenda {
  items: AgendaItem[];
  hiddenCount: number;
  moreHref: string;
}

const LAST = '99:99';

function eventChip(event: CalendarEvent): string {
  return event.timing.kind === 'allDay' ? 'all day' : event.timing.startTime;
}

function eventSortKey(event: CalendarEvent): string {
  return event.timing.kind === 'allDay' ? LAST : event.timing.startTime;
}

function eventItems(events: CalendarEvent[], today: string): AgendaItem[] {
  return events
    .filter((event) => occursOn(event, today))
    .sort((a, b) => {
      const byTime = eventSortKey(a).localeCompare(eventSortKey(b));
      return byTime === 0 ? a.title.localeCompare(b.title) : byTime;
    })
    .map((event) => ({
      kind: 'event',
      id: event.id,
      title: event.title,
      chip: eventChip(event),
    }));
}

function todoItems(todos: Todo[], today: string): AgendaItem[] {
  return todos
    .filter((item) => !item.done)
    .filter((item) => item.dueDate !== null && item.dueDate <= today)
    .sort((a, b) => {
      const byDate = (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
      if (byDate !== 0) return byDate;
      const byTime = (a.dueTime ?? LAST).localeCompare(b.dueTime ?? LAST);
      return byTime === 0 ? a.sortOrder - b.sortOrder : byTime;
    })
    .map((item) => {
      const late = item.dueDate !== today;
      return {
        kind: 'todo',
        id: item.id,
        title: item.title,
        chip: late ? 'Late' : 'to-do',
        late,
      };
    });
}

export function buildAgenda(
  events: CalendarEvent[],
  todos: Todo[],
  today: string,
  limit: number,
): Agenda {
  const all = [...eventItems(events, today), ...todoItems(todos, today)];
  const hidden = all.slice(limit);
  const onlyTodosHidden =
    hidden.length > 0 && hidden.every((item) => item.kind === 'todo');

  return {
    items: all.slice(0, limit),
    hiddenCount: hidden.length,
    moreHref: onlyTodosHidden ? '/timetable/todo' : '/calendar',
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/lib/todayAgenda.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/todayAgenda.ts src/lib/todayAgenda.test.ts
git commit -m "feat(home): merge today's events and to-dos into one agenda"
```

---

### Task 2: Month grid cells

**Files:**
- Create: `src/lib/monthGrid.ts`
- Test: `src/lib/monthGrid.test.ts`

**Interfaces:**
- Consumes: `monthGridDates`, `monthOf` from `src/lib/dates.ts`; `occursOn`, `CalendarEvent`; `Todo`
- Produces: `MonthCell`, `busyDates(events: CalendarEvent[], todos: Todo[], dates: string[]): Set<string>`, `buildMonthGrid(today: string, busy: Set<string>): MonthCell[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/monthGrid.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMonthGrid, busyDates } from './monthGrid';
import { monthGridDates } from './dates';
import type { CalendarEvent } from './calendarEvent';
import type { Todo } from './todo';

function event(id: string, date: string): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title: 'Thing',
    date,
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown: false,
    categoryId: null,
  };
}

function todo(id: string, dueDate: string | null, done = false): Todo {
  const base = {
    id,
    owner: 'Jeff' as const,
    title: 'Thing',
    dueDate,
    dueTime: null,
    sortOrder: 0,
    priority: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  return done
    ? { ...base, done: true, completedAt: '2026-09-11T09:00:00.000Z' }
    : { ...base, done: false, completedAt: null };
}

describe('buildMonthGrid', () => {
  it('returns 42 cells', () => {
    expect(buildMonthGrid('2026-09-11', new Set())).toHaveLength(42);
  });

  it('flags exactly one cell as today', () => {
    const cells = buildMonthGrid('2026-09-11', new Set());
    const todays = cells.filter((cell) => cell.isToday);

    expect(todays).toHaveLength(1);
    expect(todays[0].date).toBe('2026-09-11');
    expect(todays[0].day).toBe(11);
  });

  it('marks days outside the month', () => {
    const cells = buildMonthGrid('2026-09-11', new Set());

    expect(cells[0].inMonth).toBe(false);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it('flags a busy day and leaves the others alone', () => {
    const cells = buildMonthGrid('2026-09-11', new Set(['2026-09-14']));
    const busy = cells.filter((cell) => cell.hasItems);

    expect(busy).toHaveLength(1);
    expect(busy[0].date).toBe('2026-09-14');
  });
});

describe('busyDates', () => {
  const dates = monthGridDates('2026-09');

  it('collects event days and open to-do days', () => {
    const result = busyDates(
      [event('a', '2026-09-14')],
      [todo('t1', '2026-09-16')],
      dates,
    );

    expect([...result].sort()).toEqual(['2026-09-14', '2026-09-16']);
  });

  it('ignores finished to-dos and to-dos with no date', () => {
    const result = busyDates(
      [],
      [todo('t1', '2026-09-16', true), todo('t2', null)],
      dates,
    );

    expect(result.size).toBe(0);
  });

  it('marks every day a multi-day event covers', () => {
    const spanning: CalendarEvent = {
      ...event('a', '2026-09-14'),
      timing: { kind: 'allDay', endDate: '2026-09-16' },
    };

    const result = busyDates([spanning], [], dates);

    expect([...result].sort()).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/lib/monthGrid.test.ts`
Expected: FAIL, cannot find module `./monthGrid`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/monthGrid.ts`:

```ts
import { occursOn, type CalendarEvent } from './calendarEvent';
import { monthGridDates, monthOf } from './dates';
import type { Todo } from './todo';

export interface MonthCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  hasItems: boolean;
}

export function busyDates(
  events: CalendarEvent[],
  todos: Todo[],
  dates: string[],
): Set<string> {
  const busy = new Set<string>();

  for (const date of dates) {
    if (events.some((event) => occursOn(event, date))) busy.add(date);
  }

  for (const item of todos) {
    if (item.done || item.dueDate === null) continue;
    if (dates.includes(item.dueDate)) busy.add(item.dueDate);
  }

  return busy;
}

export function buildMonthGrid(today: string, busy: Set<string>): MonthCell[] {
  const month = monthOf(today);

  return monthGridDates(month).map((date) => ({
    date,
    day: Number(date.slice(8)),
    inMonth: monthOf(date) === month,
    isToday: date === today,
    hasItems: busy.has(date),
  }));
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/lib/monthGrid.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthGrid.ts src/lib/monthGrid.test.ts
git commit -m "feat(home): build the hub month grid cells"
```

---

### Task 3: Banner cards and wrap-around

**Files:**
- Create: `src/lib/bannerCards.ts`, `src/lib/carousel.ts`
- Test: `src/lib/bannerCards.test.ts`, `src/lib/carousel.test.ts`

**Interfaces:**
- Consumes: `CalendarEvent`, `CountUpEntry` from `src/lib/countUpList.ts`, `formatTrackerDays` from `src/lib/dayCount.ts`
- Produces: `BannerCard` (`{ id, title, detail, href, accent }` where `accent` is `'cycle' | 'dashboard' | 'countdown'`), `buildBannerCards(cycleLabel: string | null, streakDays: number, pinnedEvents: CalendarEvent[], pinnedCountUps: CountUpEntry[], today: string): BannerCard[]`, `nextIndex(index: number, length: number): number`, `prevIndex(index: number, length: number): number`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/carousel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { nextIndex, prevIndex } from './carousel';

describe('carousel', () => {
  it('steps forward', () => {
    expect(nextIndex(0, 3)).toBe(1);
  });

  it('wraps the last card round to the first', () => {
    expect(nextIndex(2, 3)).toBe(0);
  });

  it('steps back', () => {
    expect(prevIndex(2, 3)).toBe(1);
  });

  it('wraps the first card round to the last', () => {
    expect(prevIndex(0, 3)).toBe(2);
  });

  it('stays on a single card', () => {
    expect(nextIndex(0, 1)).toBe(0);
    expect(prevIndex(0, 1)).toBe(0);
  });

  it('stays at zero with no cards', () => {
    expect(nextIndex(0, 0)).toBe(0);
    expect(prevIndex(0, 0)).toBe(0);
  });
});
```

Create `src/lib/bannerCards.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/lib/carousel.test.ts src/lib/bannerCards.test.ts`
Expected: FAIL, both modules missing.

- [ ] **Step 3: Write the implementations**

Create `src/lib/carousel.ts`:

```ts
export function nextIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return (index + 1) % length;
}

export function prevIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return (index - 1 + length) % length;
}
```

Create `src/lib/bannerCards.ts`:

```ts
import type { CalendarEvent } from './calendarEvent';
import type { CountUpEntry } from './countUpList';
import { formatTrackerDays, type TrackerMode } from './dayCount';

export type BannerAccent = 'cycle' | 'dashboard' | 'countdown';

export interface BannerCard {
  id: string;
  title: string;
  detail: string;
  href: string;
  accent: BannerAccent;
}

interface Starred {
  id: string;
  title: string;
  date: string;
  mode: TrackerMode;
}

function streakTitle(days: number): string {
  return days === 1 ? '1 day streak' : `${days} day streak`;
}

export function buildBannerCards(
  cycleLabel: string | null,
  streakDays: number,
  pinnedEvents: CalendarEvent[],
  pinnedCountUps: CountUpEntry[],
  today: string,
): BannerCard[] {
  const fixed: BannerCard[] = [];

  if (cycleLabel !== null) {
    fixed.push({
      id: 'cycle',
      title: cycleLabel,
      detail: 'Open Period',
      href: '/cycle',
      accent: 'cycle',
    });
  }

  fixed.push({
    id: 'streak',
    title: streakTitle(streakDays),
    detail: 'Open Study',
    href: '/study/dashboard',
    accent: 'dashboard',
  });

  const starred: Starred[] = [
    ...pinnedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      mode: 'countdown' as const,
    })),
    ...pinnedCountUps.map((entry) => ({
      id: entry.id,
      title: entry.label,
      date: entry.date,
      mode: 'countup' as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return [
    ...fixed,
    ...starred.map((item) => ({
      id: item.id,
      title: item.title,
      detail: formatTrackerDays(item.mode, item.date, today),
      href: '/countdown',
      accent: 'countdown' as const,
    })),
  ];
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run src/lib/carousel.test.ts src/lib/bannerCards.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bannerCards.ts src/lib/bannerCards.test.ts src/lib/carousel.ts src/lib/carousel.test.ts
git commit -m "feat(home): order the banner cards and wrap the carousel index"
```

---

### Task 4: Read and write the star flag

**Files:**
- Modify: `src/lib/calendarRepo.ts`, `src/lib/countUpRepo.ts`

**Interfaces:**
- Produces: `fetchPinnedEventIds(owner: UserName): Promise<Set<string>>`, `setEventPinned(id: string, pinned: boolean): Promise<boolean>`, `fetchPinnedCountUpIds(owner: UserName): Promise<Set<string>>`, `setCountUpPinned(id: string, owner: UserName, pinned: boolean): Promise<boolean>`

There is no test here. Vitest in this repo has no Supabase double and does not touch the network; these four functions are thin wrappers whose behaviour is the query itself. The behaviour that matters is asserted in Task 3 and exercised by hand in Task 10.

- [ ] **Step 1: Add the calendar functions**

Append to `src/lib/calendarRepo.ts`:

```ts
export async function fetchPinnedEventIds(
  owner: UserName,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('owner', owner)
    .eq('pinned', true);

  if (error) {
    console.error('Failed to load starred dates:', error);
    return new Set();
  }

  return new Set((data as { id: string }[]).map((row) => row.id));
}

export async function setEventPinned(
  id: string,
  pinned: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_events')
    .update({ pinned, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to star a date:', error);
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Add the count-up functions**

Append to `src/lib/countUpRepo.ts`:

```ts
export async function fetchPinnedCountUpIds(
  owner: UserName,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('count_up_entries')
    .select('id')
    .eq('owner', owner)
    .eq('pinned', true);

  if (error) {
    console.error('Failed to load starred count-up dates:', error);
    return new Set();
  }

  return new Set((data as { id: string }[]).map((row) => row.id));
}

export async function setCountUpPinned(
  id: string,
  owner: UserName,
  pinned: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from('count_up_entries')
    .update({ pinned, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner', owner);

  if (error) {
    console.error('Failed to star a count-up date:', error);
    return false;
  }
  return true;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/calendarRepo.ts src/lib/countUpRepo.ts
git commit -m "feat(countdown): read and write the banner star flag"
```

---

### Task 5: Star button on the countdown board

**Files:**
- Modify: `src/components/countdown/CountdownBoard.tsx`

**Interfaces:**
- Consumes: `fetchPinnedEventIds`, `setEventPinned`, `fetchPinnedCountUpIds`, `setCountUpPinned` from Task 4

- [ ] **Step 1: Add the imports**

In `src/components/countdown/CountdownBoard.tsx`, extend the existing import blocks:

```ts
import { Star, Trash2 } from 'lucide-react';
```

```ts
import {
  deleteEvent,
  fetchEvents,
  fetchPinnedEventIds,
  insertEvent,
  setEventPinned,
  updateEvent,
} from '@/lib/calendarRepo';
```

```ts
import {
  deleteCountUpEntry,
  fetchPinnedCountUpIds,
  insertCountUpEntry,
  loadCountUpList,
  setCountUpPinned,
  updateCountUpEntry,
} from '@/lib/countUpRepo';
```

- [ ] **Step 2: Hold the starred ids**

Beside the other `useState` calls in `CountdownBoard`:

```ts
const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
```

Load them whenever the owner is known, next to the existing loaders:

```ts
const loadPinned = useCallback(async (who: UserName) => {
  const [events, entries] = await Promise.all([
    fetchPinnedEventIds(who),
    fetchPinnedCountUpIds(who),
  ]);
  setPinnedIds(new Set([...events, ...entries]));
}, []);
```

Call `loadPinned(owner)` from the same effect that already calls `loadEvents()` and `loadCountUp(owner)`.

- [ ] **Step 3: Add the toggle**

```ts
const toggleStar = async (id: string) => {
  const starred = pinnedIds.has(id);
  const next = new Set(pinnedIds);

  if (starred) next.delete(id);
  else next.add(id);
  setPinnedIds(next);

  const saved =
    mode === 'countdown'
      ? await setEventPinned(id, !starred)
      : await setCountUpPinned(id, owner, !starred);

  if (!saved) setPinnedIds(pinnedIds);
};
```

- [ ] **Step 4: Add the button to each row**

Inside the row's `<div className="flex items-center gap-2">`, immediately before the delete button:

```tsx
<button
  type="button"
  aria-label={
    pinnedIds.has(row.id)
      ? `Take ${row.title} off the home banner`
      : `Show ${row.title} on the home banner`
  }
  aria-pressed={pinnedIds.has(row.id)}
  onClick={() => toggleStar(row.id)}
  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
>
  <Star
    size={18}
    aria-hidden
    fill={pinnedIds.has(row.id) ? 'var(--mt-accent)' : 'none'}
    style={pinnedIds.has(row.id) ? { color: 'var(--mt-text)' } : undefined}
  />
</button>
```

- [ ] **Step 5: Check it compiles and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/countdown/CountdownBoard.tsx
git commit -m "feat(countdown): star a date to show it on the home banner"
```

---

### Task 6: The calendar card

**Files:**
- Create: `src/components/home/TodayCalendarCard.tsx`

**Interfaces:**
- Consumes: `Agenda` from Task 1, `MonthCell` from Task 2, `WEEKDAYS`, `WEEKDAYS_SHORT`, `formatMonthYear`, `weekdayIndex`, `monthOf` from `src/lib/dates.ts`
- Produces: default export `TodayCalendarCard({ today, agenda, cells }: { today: string; agenda: Agenda; cells: MonthCell[] })`

The component fetches nothing and holds no state. Everything it draws comes from props, which is why every rule it follows is already tested in Tasks 1 and 2.

- [ ] **Step 1: Write the component**

Create `src/components/home/TodayCalendarCard.tsx`:

```tsx
import Link from 'next/link';
import type { Agenda } from '@/lib/todayAgenda';
import type { MonthCell } from '@/lib/monthGrid';
import {
  WEEKDAYS,
  WEEKDAYS_SHORT,
  formatMonthYear,
  weekdayIndex,
} from '@/lib/dates';

function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${formatMonthYear(`${year}-${`${month}`.padStart(2, '0')}`)}`;
}

export default function TodayCalendarCard({
  today,
  agenda,
  cells,
}: {
  today: string;
  agenda: Agenda;
  cells: MonthCell[];
}) {
  return (
    <section
      className="mt-soft mb-6 grid gap-6 p-5 sm:grid-cols-2"
      style={{ ['--mt-accent' as string]: 'var(--mac-accent-calendar)' }}
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {WEEKDAYS[weekdayIndex(today)]}
        </h2>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          {longDate(today)}
        </p>

        <div className="my-4 h-px bg-[var(--mt-border)]" />

        {agenda.items.length === 0 ? (
          <p className="text-sm text-[var(--mt-text-muted)]">Nothing today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agenda.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span
                  className="inline-flex min-w-16 shrink-0 justify-center rounded-full px-2 py-1 text-xs font-semibold text-[var(--mt-text)]"
                  style={{
                    background:
                      item.kind === 'todo' && item.late
                        ? 'color-mix(in srgb, var(--mt-danger) 16%, transparent)'
                        : 'color-mix(in srgb, var(--mt-accent) 40%, transparent)',
                  }}
                >
                  {item.chip}
                </span>
                <span className="truncate text-sm text-[var(--mt-text)]">
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        )}

        {agenda.hiddenCount > 0 && (
          <Link
            href={agenda.moreHref}
            className="mt-3 inline-flex min-h-11 items-center text-sm text-[var(--mt-text-muted)]"
          >
            +{agenda.hiddenCount} more
          </Link>
        )}
      </div>

      <div>
        <div className="mb-2 grid grid-cols-7">
          {WEEKDAYS_SHORT.map((label) => (
            <span
              key={label}
              className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--mt-text-subtle)]"
            >
              {label.slice(0, 1)}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <Link
              key={cell.date}
              href={`/calendar?date=${cell.date}`}
              aria-label={cell.date}
              aria-current={cell.isToday ? 'date' : undefined}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl"
              style={{ opacity: cell.inMonth ? 1 : 0.35 }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-[var(--mt-text)]"
                style={
                  cell.isToday ? { background: 'var(--mt-accent)' } : undefined
                }
              >
                {cell.day}
              </span>
              <span className="flex h-1.5 items-center">
                {cell.hasItems && (
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'var(--mt-text-muted)' }}
                    aria-hidden
                  />
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/TodayCalendarCard.tsx
git commit -m "feat(home): draw the calendar card"
```

---

### Task 7: The rotating banner

**Files:**
- Create: `src/components/home/RotatingBanner.tsx`

**Interfaces:**
- Consumes: `BannerCard` from Task 3, `nextIndex`, `prevIndex` from Task 3, `accentVar` from `src/components/ui/PageShell.tsx`
- Produces: default export `RotatingBanner({ cards }: { cards: BannerCard[] })`

- [ ] **Step 1: Write the component**

Create `src/components/home/RotatingBanner.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { accentVar } from '@/components/ui/PageShell';
import type { BannerCard } from '@/lib/bannerCards';
import { nextIndex, prevIndex } from '@/lib/carousel';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const TICK_MS = 5000;
const PAUSE_MS = 10000;

export default function RotatingBanner({ cards }: { cards: BannerCard[] }) {
  const [index, setIndex] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const stillMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

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
      className="mt-soft flex flex-col items-center gap-1 px-1 py-3"
      style={{ ['--mt-accent' as string]: accentVar(card.accent) }}
    >
      <div className="flex w-full items-center gap-1">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => step(prevIndex)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
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
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
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
```

`useMediaQuery(query: string): boolean` is a named export of `src/hooks/useMediaQuery.ts` and starts `false` before the effect runs, so the banner rotates on the first tick and stops if the viewer asked for reduced motion. That is the right way round: the still setting wins as soon as it is known.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/RotatingBanner.tsx
git commit -m "feat(home): rotate the banner cards every five seconds"
```

---

### Task 8: Wire the hub

**Files:**
- Modify: `src/components/HubGrid.tsx`

**Interfaces:**
- Consumes: everything built in Tasks 1, 2, 3, 4, 6, 7

- [ ] **Step 1: Add the imports**

```ts
import { fetchEvents, fetchPinnedEventIds } from '@/lib/calendarRepo';
import { fetchTodos } from '@/lib/todoRepo';
import { fetchCountUpEntries, fetchPinnedCountUpIds } from '@/lib/countUpRepo';
import { buildAgenda } from '@/lib/todayAgenda';
import { buildMonthGrid, busyDates } from '@/lib/monthGrid';
import { buildBannerCards } from '@/lib/bannerCards';
import { monthGridDates, monthOf, todayISO } from '@/lib/dates';
import { isUserName, type UserName } from '@/lib/identity';
import type { CalendarEvent } from '@/lib/calendarEvent';
import type { Todo } from '@/lib/todo';
import type { CountUpEntry } from '@/lib/countUpList';
import TodayCalendarCard from '@/components/home/TodayCalendarCard';
import RotatingBanner from '@/components/home/RotatingBanner';
```

`todayISO` is already imported; do not import it twice.

- [ ] **Step 2: Fetch the new data**

Add beside the existing `cycleLogs` state:

```ts
const [events, setEvents] = useState<CalendarEvent[]>([]);
const [todos, setTodos] = useState<Todo[]>([]);
const [countUps, setCountUps] = useState<CountUpEntry[]>([]);
const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
```

Extend the existing mounted effect:

```ts
useEffect(() => {
  if (!mounted) return;
  const stored = localStorage.getItem('user_name');
  const owner: UserName = isUserName(stored) ? stored : 'Jeff';

  (async () => {
    const [rows, eventRows, todoResult, entryRows, pinnedEvents, pinnedEntries] =
      await Promise.all([
        fetchPeriods(),
        fetchEvents(),
        fetchTodos(owner),
        fetchCountUpEntries(owner),
        fetchPinnedEventIds(owner),
        fetchPinnedCountUpIds(owner),
      ]);

    if (rows) setCycleLogs(rows);
    if (eventRows) setEvents(eventRows.filter((row) => row.owner === owner));
    if (todoResult.status === 'ok') setTodos(todoResult.rows);
    if (entryRows) setCountUps(entryRows);
    setPinnedIds(new Set([...pinnedEvents, ...pinnedEntries]));
  })();
}, [mounted]);
```

- [ ] **Step 3: Derive what the two components need**

Above the `return`:

```ts
const today = mounted ? todayISO() : '';
const agenda = buildAgenda(events, todos, today, 4);
const cells = mounted
  ? buildMonthGrid(
      today,
      busyDates(events, todos, monthGridDates(monthOf(today))),
    )
  : [];
const cards = buildBannerCards(
  cycleLabel,
  stats.streakDays,
  events.filter((event) => pinnedIds.has(event.id)),
  countUps.filter((entry) => pinnedIds.has(entry.id)),
  today,
);
```

- [ ] **Step 4: Change what the hub renders**

Replace the two-tile grid:

```tsx
<div className="mb-6 grid grid-cols-2 gap-3">
  <StatTile label="Today" value={`${stats.todayMinutes} min`} accent="timer" />
  <StatTile
    label="Streak"
    value={stats.streakDays === 1 ? '1 day' : `${stats.streakDays} days`}
    accent="dashboard"
  />
</div>
```

with the calendar card followed by the Today tile and banner side by side:

```tsx
{mounted && (
  <TodayCalendarCard today={today} agenda={agenda} cells={cells} />
)}

<div className="mb-6 grid gap-3 sm:grid-cols-[1fr_2fr]">
  <StatTile label="Today" value={`${stats.todayMinutes} min`} accent="timer" />
  <RotatingBanner cards={cards} />
</div>
```

- [ ] **Step 5: Typecheck, lint, and run the whole suite**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/HubGrid.tsx
git commit -m "feat(home): show the calendar card and rotating banner on the hub"
```

---

### Task 9: Open the calendar on a chosen day

**Files:**
- Modify: `src/components/calendar/CalendarBoard.tsx`, `src/app/(life)/calendar/page.tsx`

**Interfaces:**
- Consumes: `useSearchParams` from `next/navigation`

Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` before starting. The rule that matters: a prerendered route client-renders everything up to the nearest Suspense boundary once this hook is used, so the page must supply one.

- [ ] **Step 1: Read the date from the URL**

In `src/components/calendar/CalendarBoard.tsx`, add to the imports:

```ts
import { useSearchParams } from 'next/navigation';
```

Inside the component, above the existing date state:

```ts
const searchParams = useSearchParams();
const requestedDate = searchParams.get('date');
const startDate =
  requestedDate !== null && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : todayISO();
```

Seed the existing selected-date and month state from `startDate` instead of `todayISO()`. Leave every other use of `todayISO()` alone: today is still today even when you are looking at another day.

- [ ] **Step 2: Give the page a Suspense boundary**

Rewrite `src/app/(life)/calendar/page.tsx`:

```tsx
import { Suspense } from 'react';
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import CalendarBoard from '@/components/calendar/CalendarBoard';

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      subtitle="What's happening, and when"
      accent="calendar"
    >
      <Suspense
        fallback={
          <Card>
            <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
          </Card>
        }
      >
        <CalendarBoard />
      </Suspense>
    </PageShell>
  );
}
```

- [ ] **Step 3: Build, because this is the step that catches a missing boundary**

Run: `npm run build`
Expected: build succeeds with no prerender error mentioning `useSearchParams`.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/CalendarBoard.tsx "src/app/(life)/calendar/page.tsx"
git commit -m "feat(calendar): open on the day named in the address"
```

---

### Task 10: Pin the new colour pairs and verify the lot

**Files:**
- Modify: `src/lib/accents.test.ts`

**Interfaces:**
- Consumes: `contrastRatio` from `src/lib/color.ts`, and the file-local `readAccents()` helper already in `accents.test.ts`

`accents.test.ts` reads its values out of `globals.css` rather than hardcoding hexes, so retuning a token fails the test loudly. Keep that. Hardcoding `#FFB5F4` here would pass forever, including after someone changes the token.

- [ ] **Step 1: Write the failing test**

Add `contrastRatio` to the existing `color` import at the top of `src/lib/accents.test.ts`:

```ts
import { contrastRatio, deltaE76, hueDistance } from './color';
```

Then append:

```ts
describe('home calendar card', () => {
  function readToken(name: string): string {
    const match = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
    return match![1];
  }

  it('keeps cocoa readable on the today pill', () => {
    const ratio = contrastRatio(
      readToken('mac-cocoa'),
      readAccents()['calendar'],
    );

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the late chip text readable on white', () => {
    const ratio = contrastRatio(
      readToken('mac-danger-deep'),
      readToken('mac-white'),
    );

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 3: Run it**

Run: `npx vitest run src/lib/accents.test.ts`
Expected: PASS. Ratios are 8.18:1 and 4.96:1. If it fails, the token values in `globals.css` moved and the design needs revisiting, not the assertion loosening.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: all four pass. Paste the real output into the report; do not summarise a run you did not do.

- [ ] **Step 5: Check it by hand in the browser**

Start the app with the project's preview tooling, never a raw `npm run dev` in a shell, then confirm:

1. The hub shows today's weekday, date, month grid and agenda.
2. A day number opens `/calendar` on that day.
3. The banner advances about every 5 seconds and wraps past the last card.
4. A chevron press moves one card and the auto-advance holds for 10 seconds.
5. Period opens `/cycle`, streak opens `/study/dashboard`.
6. Starring a date on `/countdown` makes it appear in the banner after a reload.
7. At 400px wide the Today tile and banner stack and nothing scrolls sideways.

- [ ] **Step 6: Commit**

```bash
git add src/lib/accents.test.ts
git commit -m "test(palette): pin the calendar card colour pairs"
```

---

## Notes for whoever executes this

- `fetchEvents()` returns both people's events. Task 8 filters to the signed-in owner. Do not remove that filter.
- `fetchTodos` returns a `TodoFetch` union, and `missing-table` is a real state on a fresh database. Treat anything that is not `status: 'ok'` as an empty list and let the page render.
- The star flag deliberately never reaches `CalendarEvent`, `EventInput` or `toColumns`. If you find yourself adding `pinned` to a type, stop and re-read the spec's database section.
- `useHasMounted` guards every wall-clock and `localStorage` read on the hub. `todayISO()` must not be called during the first render.
- The banner's card list grows once the starred dates arrive, and the index is clamped rather than reset so the card you are reading does not jump under you when that happens.
