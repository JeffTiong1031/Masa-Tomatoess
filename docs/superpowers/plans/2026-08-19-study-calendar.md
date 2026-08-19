# Study Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inert `/study/calendar` mock with a real shared calendar — add, edit and delete dated events, view them by week, month or year, filter by person and category, and search across all of them.

**Architecture:** One Supabase table of events plus one of categories, read whole into a single client board component (`CalendarBoard`) which owns all state. Every view is a navigator that selects a date; a shared day panel renders it. All rules worth asserting live in pure modules under `src/lib/` because Vitest here has no DOM and cannot render components.

**Tech Stack:** Next.js 16.2 (App Router), React 19.2, TypeScript strict, Tailwind v4, `@supabase/supabase-js`, `react-activity-calendar`, `lucide-react`, Vitest.

**Spec:** [docs/superpowers/specs/2026-08-19-study-calendar-design.md](../specs/2026-08-19-study-calendar-design.md)

## Global Constraints

- **Next.js 16.2 is not the Next.js in your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before writing any App Router code.
- **Do not write comments.** Names and structure carry the meaning. Measured values that would have been a comment go into a test assertion instead.
- **Never hardcode a colour.** Components reference `--mt-*` semantic tokens. Raw `--mac-*` hues stay inside `src/app/globals.css`. The only exception is a library that consumes a literal before CSS resolves (`react-activity-calendar`'s `theme` prop); those literals live in `src/lib/heatmapTheme.ts` and are pinned to their token by a test.
- **Avoid overly defensive programming.** No guards for states the types already exclude.
- **Avoid instance checks.** No `instanceof`, no `typeof` branching to discriminate shapes. Model the union.
- **Handle exceptions only where there is something to do about them.** The repo catches because the network fails. Pure functions do not.
- Server Components by default. `'use client'` only on the leaf that needs it.
- Touch targets at least 44px (`min-h-11`).
- `min-h-dvh`, never `h-screen`. Grid over flex percentage maths.
- Tests sit beside their source as `*.test.ts`. Vitest runs pure functions only — no DOM environment, no component rendering.
- **Commits carry no `Co-Authored-By` trailer and no generated-with attribution.** Commit as Jeff's account only.
- Dates are `YYYY-MM-DD` strings and times are `HH:MM` strings, end to end. No `Date` object crosses a function boundary.
- Moving or deleting files under `src/app/` fails while the dev server runs. Stop it first.

**Commands:**

```bash
npm test
```

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/lib/dates.ts` | Renamed from `cycleDates.ts`. String date arithmetic, shared by cycle and calendar. |
| `src/lib/calendarEvent.ts` | Event types, day sorting, span occupancy, timeline hour range. |
| `src/lib/calendarViews.ts` | Week dates, per-date counts, dot clamping, person/category filtering. |
| `src/lib/calendarSearch.ts` | Query matching and date grouping. |
| `src/lib/categories.ts` | Swatch table, category validation, affected-count for delete. |
| `src/lib/eventForm.ts` | Draft validation and the draft→`EventTiming` conversion. |
| `src/lib/countdownList.ts` | Ticked, future-only, soonest-first rows with `daysUntil`. |
| `src/lib/calendarRepo.ts` | Supabase reads and writes. The only module that talks to the network. |
| `src/components/calendar/CalendarBoard.tsx` | The single stateful component. Owns everything. |
| `src/components/calendar/ViewSwitcher.tsx` | Week/Month/Year and the search control. |
| `src/components/calendar/FilterStrip.tsx` | Person segments then category chips, one scrolling row. |
| `src/components/calendar/WeekRail.tsx` | Seven date bubbles with dots. |
| `src/components/calendar/DayPanel.tsx` | The shared detail surface. |
| `src/components/calendar/EventBlock.tsx` | One event, filled or outlined, with its category dot. |
| `src/components/calendar/MonthGrid.tsx` | 7×6 grid, dots only. |
| `src/components/calendar/YearHeatmap.tsx` | Density squares. |
| `src/components/calendar/SearchResults.tsx` | Date-grouped match list. |
| `src/components/calendar/EventModal.tsx` | Add, edit, delete one event. |
| `src/components/calendar/CategoryManager.tsx` | Category CRUD. |
| `src/components/countdown/CountdownBoard.tsx` | The countdown view over ticked events. |

**Modified:** `src/app/globals.css` (swatch tokens), `src/lib/heatmapTheme.ts` (+ its test), `src/lib/supabase.ts` (DDL comment), `src/app/study/calendar/page.tsx`, `src/app/(life)/countdown/page.tsx`, and the eleven files importing `cycleDates`.

**Deleted:** `src/lib/cycleDates.ts`, `src/lib/cycleDates.test.ts` (renamed, not removed).

---

### Task 1: Rename `cycleDates` to `dates`

Spec D66. Pure refactor with no behaviour change — the whole point is that the existing suite still passes untouched.

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/dates.test.ts` (both by `git mv`)
- Delete: `src/lib/cycleDates.ts`, `src/lib/cycleDates.test.ts`
- Modify: `src/components/cycle/CycleBoard.tsx`, `src/components/cycle/CycleCalendar.tsx`, `src/components/cycle/CycleRing.tsx`, `src/components/cycle/LogPeriodModal.tsx`, `src/components/cycle/PeriodHistory.tsx`, `src/components/cycle/SymptomChips.tsx`, `src/components/HubGrid.tsx`, `src/lib/cycle.ts`, `src/lib/cycle.test.ts`, `src/lib/cycleCalendar.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/lib/dates.ts` exporting `WEEKDAYS_SHORT`, `todayISO(now?: Date): string`, `addDays(date: string, days: number): string`, `diffDays(later: string, earlier: string): number`, `monthOf(date: string): string`, `addMonths(month: string, count: number): string`, `weekdayIndex(date: string): number`, `monthGridDates(month: string): string[]`, `formatMonthYear(month: string): string`, `formatShortDate(date: string): string`, `formatLongDate(date: string): string`. Every later task imports from here.

- [ ] **Step 1: Record the green baseline**

Run: `npm test`
Expected: PASS. Note the number of passing tests — it must be identical at Step 5.

- [ ] **Step 2: Move both files**

```bash
git mv src/lib/cycleDates.ts src/lib/dates.ts
git mv src/lib/cycleDates.test.ts src/lib/dates.test.ts
```

- [ ] **Step 3: Repoint every import**

In `src/lib/dates.test.ts` the import is relative — change `from './cycleDates'` to `from './dates'`.

The other ten files import by alias. In each, change `from '@/lib/cycleDates'` to `from '@/lib/dates'`:

```bash
grep -rln "cycleDates" src
```

Every path that command prints must be edited. Re-run it afterwards; it must print nothing.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: PASS, with the same test count as Step 1. A drop means a file was missed.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add -A src/lib src/components
git commit -m "refactor: rename cycleDates to dates for shared use"
```

---

### Task 2: The category swatch ramp

Spec D75, D77, D78, §7. This comes before the database task because the number of swatches that survive the separation check is written into the DDL's check constraint.

The eight candidate values below are a **starting point, not an answer**. The test is the authority. If a pair fails, adjust the hues or drop the count — never lower the thresholds.

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/tagSwatches.test.ts`

**Interfaces:**
- Consumes: `contrastRatio`, `deltaE76` from `src/lib/color.ts`.
- Produces: CSS custom properties `--mac-tag-1` … `--mac-tag-8` on `:root`, and `--mt-tag-1` … `--mt-tag-8` in the light mood block aliasing them. Task 7 maps swatch indices to the `--mt-tag-*` names.

- [ ] **Step 1: Write the failing test**

Create `src/lib/tagSwatches.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio, deltaE76 } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const WHITE = '#FFFFFF';
const CREAM = '#FDF8F3';

const MIN_MARK_CONTRAST = 3;
const MIN_DELTA_E = 20;

function readSwatches(): string[] {
  const found: string[] = [];
  const pattern = /--mac-tag-(\d):\s*(#[0-9A-Fa-f]{6})/g;
  let match = pattern.exec(CSS);
  while (match !== null) {
    found[Number(match[1]) - 1] = match[2];
    match = pattern.exec(CSS);
  }
  return found;
}

describe('category swatches', () => {
  const swatches = readSwatches();

  it('declares a contiguous run of at least six', () => {
    expect(swatches.length).toBeGreaterThanOrEqual(6);
    expect(swatches.every((value) => typeof value === 'string')).toBe(true);
  });

  it('is aliased by a --mt-tag-N token for every --mac-tag-N', () => {
    for (let index = 1; index <= swatches.length; index += 1) {
      expect(CSS).toContain(`--mt-tag-${index}: var(--mac-tag-${index})`);
    }
  });

  it('clears 3:1 as a mark on both surfaces', () => {
    for (const swatch of swatches) {
      expect(contrastRatio(swatch, WHITE)).toBeGreaterThanOrEqual(
        MIN_MARK_CONTRAST,
      );
      expect(contrastRatio(swatch, CREAM)).toBeGreaterThanOrEqual(
        MIN_MARK_CONTRAST,
      );
    }
  });

  it('separates every pair by deltaE', () => {
    for (let a = 0; a < swatches.length; a += 1) {
      for (let b = a + 1; b < swatches.length; b += 1) {
        expect(deltaE76(swatches[a], swatches[b])).toBeGreaterThanOrEqual(
          MIN_DELTA_E,
        );
      }
    }
  });

  it('is distinct from every section accent', () => {
    const accents = /--mac-accent-[a-z]+:\s*(#[0-9A-Fa-f]{6})/g;
    const values: string[] = [];
    let match = accents.exec(CSS);
    while (match !== null) {
      values.push(match[1]);
      match = accents.exec(CSS);
    }
    for (const swatch of swatches) {
      for (const accent of values) {
        expect(deltaE76(swatch, accent)).toBeGreaterThan(10);
      }
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/tagSwatches.test.ts`
Expected: FAIL on the first assertion — no `--mac-tag-*` tokens exist yet, so `swatches.length` is 0.

- [ ] **Step 3: Add the candidate tokens**

In `src/app/globals.css`, add to the `:root` block immediately after the `--mac-rank-bronze-dark` line:

```css
  --mac-tag-1: #B83A3A;
  --mac-tag-2: #A05A12;
  --mac-tag-3: #4F7A2A;
  --mac-tag-4: #17706A;
  --mac-tag-5: #2C5FA8;
  --mac-tag-6: #5B3FA0;
  --mac-tag-7: #A63478;
  --mac-tag-8: #5A5560;
```

Then, in the light mood block (the one beginning `--mt-bg: var(--mac-cream);`), add after `--mt-rank-bronze`:

```css
  --mt-tag-1: var(--mac-tag-1);
  --mt-tag-2: var(--mac-tag-2);
  --mt-tag-3: var(--mac-tag-3);
  --mt-tag-4: var(--mac-tag-4);
  --mt-tag-5: var(--mac-tag-5);
  --mt-tag-6: var(--mac-tag-6);
  --mt-tag-7: var(--mac-tag-7);
  --mt-tag-8: var(--mac-tag-8);
```

Add the same `--mt-tag-*` aliases to the dark mood block, so the token set is complete in both moods even though every route currently renders light.

- [ ] **Step 4: Run the test and tune until green**

Run: `npx vitest run src/lib/tagSwatches.test.ts`

If a pair fails the deltaE check, the fix order is:
1. Push the two colours apart in lightness (the L\* term dominates deltaE76), not in hue.
2. If that breaks the 3:1 mark contrast, drop the weaker of the pair and renumber so the run stays contiguous from 1.
3. Only then reduce the count. Six is the floor asserted by the first test.

**Do not lower `MIN_DELTA_E` or `MIN_MARK_CONTRAST`.** Eight swatches that read as four is a broken feature wearing a passing test.

Expected: PASS.

- [ ] **Step 5: Record the surviving count**

Note how many `--mac-tag-*` tokens ended up declared. Task 3's `check (swatch between 1 and N)` uses that number, and Task 7's `SWATCHES` array must have exactly that many entries.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS. `accents.test.ts` also reads `globals.css`; confirm the new tokens did not disturb its regex (it matches `--mac-accent-*` only).

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/lib/tagSwatches.test.ts
git commit -m "feat: add measured category swatch tokens"
```

---

### Task 3: The database schema

Spec §3. The app never creates tables; this task writes the SQL Jeff runs himself, into the comment block where the other schemas already live.

**Files:**
- Modify: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: the surviving swatch count from Task 2.
- Produces: tables `calendar_categories` and `calendar_events` in Supabase, once Jeff runs the SQL.

- [ ] **Step 1: Append the schema to the comment block**

In `src/lib/supabase.ts`, inside the existing `/* … */` block at the bottom of the file, after the cycle tracking section, add — replacing `8` in the `swatch` check with the count from Task 2 Step 5:

```sql
Supabase schema for the calendar (calendar spec §3). Events carry an owner
because each person's are shown separately; categories do not, because the
list is shared.

```sql
create table calendar_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(trim(name)) > 0),
  swatch     smallint not null check (swatch between 1 and 8),
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

create table calendar_events (
  id          uuid primary key default gen_random_uuid(),
  owner       text not null check (owner in ('Jeff', 'Rachel')),
  title       text not null check (length(trim(title)) > 0),
  date        date not null,
  end_date    date,
  start_time  time,
  end_time    time,
  notes       text,
  countdown   boolean not null default false,
  category_id uuid references calendar_categories (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint calendar_events_end_after_start
    check (end_date is null or end_date >= date),
  constraint calendar_events_end_time_needs_start
    check (end_time is null or start_time is not null),
  constraint calendar_events_time_order
    check (end_time is null or end_time > start_time),
  constraint calendar_events_span_is_all_day
    check (end_date is null or start_time is null)
);

create index calendar_events_date_idx on calendar_events (date);

alter table calendar_events enable row level security;
alter table calendar_categories enable row level security;

create policy "anon reads calendar_events"
  on calendar_events for select to anon using (true);
create policy "anon writes calendar_events"
  on calendar_events for all to anon using (true) with check (true);

create policy "anon reads calendar_categories"
  on calendar_categories for select to anon using (true);
create policy "anon writes calendar_categories"
  on calendar_categories for all to anon using (true) with check (true);
```
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output. The change is inside a comment, so a failure means the block was closed by accident — check for a stray `*/`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "docs: add the calendar schema to the supabase notes"
```

- [ ] **Step 4: Hand the SQL to Jeff**

Tell him the calendar tables need creating before the page will load anything, and that the SQL is at the bottom of `src/lib/supabase.ts`. Do not attempt to run it.

---

### Task 4: Event types and day logic

Spec D57, D58, D60, D68, §4.

**Files:**
- Create: `src/lib/calendarEvent.ts`, `src/lib/calendarEvent.test.ts`

**Interfaces:**
- Consumes: `addDays`, `diffDays` from `src/lib/dates.ts`; `UserName` from `src/lib/identity.ts`.
- Produces:
  - `type EventTiming = { kind: 'allDay'; endDate: string | null } | { kind: 'moment'; startTime: string } | { kind: 'span'; startTime: string; endTime: string }`
  - `interface CalendarEvent { id: string; owner: UserName; title: string; date: string; timing: EventTiming; notes: string | null; countdown: boolean; categoryId: string | null }`
  - `sortDay(events: CalendarEvent[]): CalendarEvent[]`
  - `occursOn(event: CalendarEvent, date: string): boolean`
  - `timelineHours(events: CalendarEvent[]): { from: number; to: number } | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/calendarEvent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  occursOn,
  sortDay,
  timelineHours,
  type CalendarEvent,
  type EventTiming,
} from './calendarEvent';

function event(
  id: string,
  title: string,
  date: string,
  timing: EventTiming,
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

const allDay = (endDate: string | null = null): EventTiming => ({
  kind: 'allDay',
  endDate,
});
const moment = (startTime: string): EventTiming => ({ kind: 'moment', startTime });
const span = (startTime: string, endTime: string): EventTiming => ({
  kind: 'span',
  startTime,
  endTime,
});

describe('sortDay', () => {
  it('puts all-day events before timed ones', () => {
    const timed = event('1', 'Dentist', '2026-08-25', moment('10:00'));
    const whole = event('2', 'Penang', '2026-08-25', allDay());
    expect(sortDay([timed, whole]).map((e) => e.id)).toEqual(['2', '1']);
  });

  it('orders timed events by start time', () => {
    const evening = event('1', 'Dinner', '2026-08-25', span('19:30', '21:00'));
    const morning = event('2', 'Dentist', '2026-08-25', moment('10:00'));
    expect(sortDay([evening, morning]).map((e) => e.id)).toEqual(['2', '1']);
  });

  it('breaks a tie on title so the order is stable', () => {
    const b = event('1', 'Beta', '2026-08-25', moment('10:00'));
    const a = event('2', 'Alpha', '2026-08-25', moment('10:00'));
    expect(sortDay([b, a]).map((e) => e.id)).toEqual(['2', '1']);
  });

  it('does not mutate its argument', () => {
    const input = [
      event('1', 'Dentist', '2026-08-25', moment('10:00')),
      event('2', 'Penang', '2026-08-25', allDay()),
    ];
    sortDay(input);
    expect(input.map((e) => e.id)).toEqual(['1', '2']);
  });
});

describe('occursOn', () => {
  it('matches its own date', () => {
    const e = event('1', 'Dentist', '2026-08-25', moment('10:00'));
    expect(occursOn(e, '2026-08-25')).toBe(true);
    expect(occursOn(e, '2026-08-26')).toBe(false);
  });

  it('covers every day of a span including both ends', () => {
    const e = event('1', 'Penang', '2026-08-22', allDay('2026-08-24'));
    expect(occursOn(e, '2026-08-22')).toBe(true);
    expect(occursOn(e, '2026-08-23')).toBe(true);
    expect(occursOn(e, '2026-08-24')).toBe(true);
  });

  it('excludes the days either side of a span', () => {
    const e = event('1', 'Penang', '2026-08-22', allDay('2026-08-24'));
    expect(occursOn(e, '2026-08-21')).toBe(false);
    expect(occursOn(e, '2026-08-25')).toBe(false);
  });

  it('treats a null end date as a single day', () => {
    const e = event('1', 'Penang', '2026-08-22', allDay(null));
    expect(occursOn(e, '2026-08-23')).toBe(false);
  });
});

describe('timelineHours', () => {
  it('returns null when nothing is timed', () => {
    expect(timelineHours([event('1', 'Penang', '2026-08-22', allDay())])).toBeNull();
  });

  it('returns null for an empty day', () => {
    expect(timelineHours([])).toBeNull();
  });

  it('spans the earliest start to the hour after the latest end', () => {
    const events = [
      event('1', 'Dentist', '2026-08-25', span('10:00', '11:00')),
      event('2', 'Dinner', '2026-08-25', span('19:30', '21:00')),
    ];
    expect(timelineHours(events)).toEqual({ from: 10, to: 22 });
  });

  it('widens a lone event to the three-hour minimum', () => {
    const events = [event('1', 'Dentist', '2026-08-25', span('10:00', '11:00'))];
    expect(timelineHours(events)).toEqual({ from: 10, to: 13 });
  });

  it('counts a moment as one hour long', () => {
    const events = [event('1', 'Dentist', '2026-08-25', moment('10:00'))];
    expect(timelineHours(events)).toEqual({ from: 10, to: 13 });
  });

  it('ignores all-day events when picking the range', () => {
    const events = [
      event('1', 'Penang', '2026-08-25', allDay()),
      event('2', 'Dentist', '2026-08-25', span('10:00', '11:00')),
    ];
    expect(timelineHours(events)).toEqual({ from: 10, to: 13 });
  });

  it('never runs past midnight', () => {
    const events = [event('1', 'Late', '2026-08-25', span('22:00', '23:30'))];
    expect(timelineHours(events)).toEqual({ from: 21, to: 24 });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/calendarEvent.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/calendarEvent.ts`:

```ts
import { addDays } from './dates';
import type { UserName } from './identity';

export type EventTiming =
  | { kind: 'allDay'; endDate: string | null }
  | { kind: 'moment'; startTime: string }
  | { kind: 'span'; startTime: string; endTime: string };

export interface CalendarEvent {
  id: string;
  owner: UserName;
  title: string;
  date: string;
  timing: EventTiming;
  notes: string | null;
  countdown: boolean;
  categoryId: string | null;
}

const MIN_SPAN_HOURS = 3;
const HOURS_IN_DAY = 24;

function startKey(timing: EventTiming): string {
  return timing.kind === 'allDay' ? '' : timing.startTime;
}

function hourOf(time: string): number {
  return Number(time.slice(0, 2));
}

function endHourOf(timing: EventTiming): number {
  if (timing.kind === 'moment') return hourOf(timing.startTime) + 1;
  if (timing.kind === 'span') {
    const hour = hourOf(timing.endTime);
    return timing.endTime.slice(3) === '00' ? hour : hour + 1;
  }
  return 0;
}

export function sortDay(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const byStart = startKey(a.timing).localeCompare(startKey(b.timing));
    if (byStart !== 0) return byStart;
    return a.title.localeCompare(b.title);
  });
}

export function occursOn(event: CalendarEvent, date: string): boolean {
  if (event.timing.kind !== 'allDay' || event.timing.endDate === null) {
    return event.date === date;
  }
  return date >= event.date && date <= event.timing.endDate;
}

export function timelineHours(
  events: CalendarEvent[],
): { from: number; to: number } | null {
  const timed = events.filter((event) => event.timing.kind !== 'allDay');
  if (timed.length === 0) return null;

  const starts = timed.map((event) => hourOf(startKey(event.timing)));
  const ends = timed.map((event) => endHourOf(event.timing));

  let from = Math.min(...starts);
  let to = Math.max(...ends);

  while (to - from < MIN_SPAN_HOURS) {
    if (to < HOURS_IN_DAY) to += 1;
    else from -= 1;
  }

  return { from, to };
}
```

Note `addDays` is imported but unused after this implementation — `occursOn` compares strings directly, which is correct because `YYYY-MM-DD` sorts lexicographically. Remove the import.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/calendarEvent.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint`
Expected: no errors. An unused-import warning for `addDays` means Step 3's note was missed.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/calendarEvent.ts src/lib/calendarEvent.test.ts
git commit -m "feat: add calendar event types and day logic"
```

---

### Task 5: View shapes and filtering

Spec D61, D67, §4.

**Files:**
- Create: `src/lib/calendarViews.ts`, `src/lib/calendarViews.test.ts`

**Interfaces:**
- Consumes: `addDays`, `weekdayIndex` from `src/lib/dates.ts`; `CalendarEvent`, `occursOn` from `src/lib/calendarEvent.ts`; `UserName` from `src/lib/identity.ts`.
- Produces:
  - `type OwnerFilter = UserName | 'both'`
  - `weekDates(date: string): string[]` — always seven, Monday first
  - `countsByDate(events: CalendarEvent[], dates: string[]): Record<string, number>`
  - `monthDots(count: number): number`
  - `applyFilters(events: CalendarEvent[], filters: { owner: OwnerFilter; categoryIds: string[] }): CalendarEvent[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/calendarViews.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  countsByDate,
  monthDots,
  weekDates,
} from './calendarViews';
import type { CalendarEvent, EventTiming } from './calendarEvent';
import type { UserName } from './identity';

function event(
  id: string,
  date: string,
  timing: EventTiming,
  owner: UserName = 'Jeff',
  categoryId: string | null = null,
): CalendarEvent {
  return {
    id,
    owner,
    title: `Event ${id}`,
    date,
    timing,
    notes: null,
    countdown: false,
    categoryId,
  };
}

const allDay = (endDate: string | null = null): EventTiming => ({
  kind: 'allDay',
  endDate,
});
const moment = (startTime: string): EventTiming => ({ kind: 'moment', startTime });

describe('weekDates', () => {
  it('returns seven dates starting on Monday', () => {
    expect(weekDates('2026-08-25')).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ]);
  });

  it('returns the same week whichever day of it is given', () => {
    expect(weekDates('2026-08-30')).toEqual(weekDates('2026-08-24'));
  });

  it('crosses a month boundary', () => {
    expect(weekDates('2026-09-01')[0]).toBe('2026-08-31');
  });

  it('crosses a year boundary', () => {
    expect(weekDates('2027-01-01')[0]).toBe('2026-12-28');
  });
});

describe('countsByDate', () => {
  it('counts one event on its own date', () => {
    const events = [event('1', '2026-08-25', moment('10:00'))];
    expect(countsByDate(events, ['2026-08-25'])).toEqual({ '2026-08-25': 1 });
  });

  it('counts a span once on each day it covers', () => {
    const events = [event('1', '2026-08-22', allDay('2026-08-24'))];
    const dates = ['2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25'];
    expect(countsByDate(events, dates)).toEqual({
      '2026-08-22': 1,
      '2026-08-23': 1,
      '2026-08-24': 1,
      '2026-08-25': 0,
    });
  });

  it('gives every requested date a key, including empty ones', () => {
    expect(countsByDate([], ['2026-08-25'])).toEqual({ '2026-08-25': 0 });
  });
});

describe('monthDots', () => {
  it('passes small counts through', () => {
    expect(monthDots(0)).toBe(0);
    expect(monthDots(2)).toBe(2);
  });

  it('clamps at three', () => {
    expect(monthDots(3)).toBe(3);
    expect(monthDots(9)).toBe(3);
  });
});

describe('applyFilters', () => {
  const jeff = event('1', '2026-08-25', moment('10:00'), 'Jeff', 'study');
  const rachel = event('2', '2026-08-25', moment('11:00'), 'Rachel', 'health');
  const untagged = event('3', '2026-08-25', moment('12:00'), 'Jeff', null);
  const all = [jeff, rachel, untagged];

  it('keeps everything when the owner filter is both and no category is chosen', () => {
    expect(applyFilters(all, { owner: 'both', categoryIds: [] })).toHaveLength(3);
  });

  it('keeps only one person', () => {
    const result = applyFilters(all, { owner: 'Rachel', categoryIds: [] });
    expect(result.map((e) => e.id)).toEqual(['2']);
  });

  it('keeps only the chosen categories', () => {
    const result = applyFilters(all, { owner: 'both', categoryIds: ['study'] });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });

  it('excludes untagged events when a category filter is active', () => {
    const result = applyFilters(all, { owner: 'both', categoryIds: ['health'] });
    expect(result.map((e) => e.id)).toEqual(['2']);
  });

  it('combines both filters', () => {
    const result = applyFilters(all, { owner: 'Jeff', categoryIds: ['health'] });
    expect(result).toEqual([]);
  });

  it('removes a filtered event from the counts as well as the list', () => {
    const kept = applyFilters(all, { owner: 'Rachel', categoryIds: [] });
    expect(countsByDate(kept, ['2026-08-25'])).toEqual({ '2026-08-25': 1 });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/calendarViews.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/calendarViews.ts`:

```ts
import { addDays, weekdayIndex } from './dates';
import { occursOn, type CalendarEvent } from './calendarEvent';
import type { UserName } from './identity';

const DAYS_IN_WEEK = 7;
const MAX_DOTS = 3;

export type OwnerFilter = UserName | 'both';

export interface ViewFilters {
  owner: OwnerFilter;
  categoryIds: string[];
}

export function weekDates(date: string): string[] {
  const monday = addDays(date, -weekdayIndex(date));
  return Array.from({ length: DAYS_IN_WEEK }, (_, index) =>
    addDays(monday, index),
  );
}

export function countsByDate(
  events: CalendarEvent[],
  dates: string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const date of dates) {
    counts[date] = events.filter((event) => occursOn(event, date)).length;
  }
  return counts;
}

export function monthDots(count: number): number {
  return Math.min(count, MAX_DOTS);
}

export function applyFilters(
  events: CalendarEvent[],
  filters: ViewFilters,
): CalendarEvent[] {
  return events.filter((event) => {
    if (filters.owner !== 'both' && event.owner !== filters.owner) return false;
    if (filters.categoryIds.length === 0) return true;
    return (
      event.categoryId !== null &&
      filters.categoryIds.includes(event.categoryId)
    );
  });
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/calendarViews.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarViews.ts src/lib/calendarViews.test.ts
git commit -m "feat: add calendar view shapes and filtering"
```

---

### Task 6: Search

Spec D72, §4.

**Files:**
- Create: `src/lib/calendarSearch.ts`, `src/lib/calendarSearch.test.ts`

**Interfaces:**
- Consumes: `CalendarEvent`, `sortDay` from `src/lib/calendarEvent.ts`.
- Produces:
  - `searchEvents(events: CalendarEvent[], query: string): CalendarEvent[]`
  - `interface DateGroup { date: string; events: CalendarEvent[] }`
  - `groupByDate(events: CalendarEvent[]): DateGroup[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/calendarSearch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { groupByDate, searchEvents } from './calendarSearch';
import type { CalendarEvent } from './calendarEvent';

function event(
  id: string,
  title: string,
  date: string,
  notes: string | null = null,
): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title,
    date,
    timing: { kind: 'moment', startTime: '10:00' },
    notes,
    countdown: false,
    categoryId: null,
  };
}

const events = [
  event('1', 'Dentist', '2026-08-25', 'Bring the referral letter'),
  event('2', 'Dinner with Rachel', '2026-08-26'),
  event('3', 'Lecture', '2026-08-25', 'Dentistry module'),
];

describe('searchEvents', () => {
  it('returns nothing for a blank query', () => {
    expect(searchEvents(events, '')).toEqual([]);
  });

  it('returns nothing for a whitespace-only query', () => {
    expect(searchEvents(events, '   ')).toEqual([]);
  });

  it('matches titles case-insensitively', () => {
    expect(searchEvents(events, 'DINNER').map((e) => e.id)).toEqual(['2']);
  });

  it('matches notes as well as titles', () => {
    expect(searchEvents(events, 'referral').map((e) => e.id)).toEqual(['1']);
  });

  it('returns an event matching in both places exactly once', () => {
    const both = [event('4', 'Dentist', '2026-08-27', 'Dentist again')];
    expect(searchEvents(both, 'dentist')).toHaveLength(1);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(searchEvents(events, '  lecture  ').map((e) => e.id)).toEqual(['3']);
  });

  it('tolerates a null notes field', () => {
    expect(searchEvents(events, 'rachel').map((e) => e.id)).toEqual(['2']);
  });

  it('matches a substring across several events', () => {
    expect(searchEvents(events, 'dent').map((e) => e.id).sort()).toEqual([
      '1',
      '3',
    ]);
  });
});

describe('groupByDate', () => {
  it('groups by date in ascending order', () => {
    expect(groupByDate(events).map((group) => group.date)).toEqual([
      '2026-08-25',
      '2026-08-26',
    ]);
  });

  it('sorts within a group', () => {
    const group = groupByDate(events)[0];
    expect(group.events.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('returns nothing for no events', () => {
    expect(groupByDate([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/calendarSearch.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/calendarSearch.ts`:

```ts
import { sortDay, type CalendarEvent } from './calendarEvent';

export interface DateGroup {
  date: string;
  events: CalendarEvent[];
}

export function searchEvents(
  events: CalendarEvent[],
  query: string,
): CalendarEvent[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];

  return events.filter((event) => {
    const haystack = `${event.title} ${event.notes ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function groupByDate(events: CalendarEvent[]): DateGroup[] {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const existing = byDate.get(event.date);
    if (existing) existing.push(event);
    else byDate.set(event.date, [event]);
  }

  return [...byDate.keys()]
    .sort()
    .map((date) => ({ date, events: sortDay(byDate.get(date)!) }));
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/calendarSearch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarSearch.ts src/lib/calendarSearch.test.ts
git commit -m "feat: add calendar search and date grouping"
```

---

### Task 7: Categories

Spec D73, D74, D75, §4. `SWATCHES` must have exactly as many entries as Task 2 shipped tokens.

**Files:**
- Create: `src/lib/categories.ts`, `src/lib/categories.test.ts`

**Interfaces:**
- Consumes: `CalendarEvent` from `src/lib/calendarEvent.ts`; the `--mt-tag-*` tokens from Task 2.
- Produces:
  - `type SwatchIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8`
  - `const SWATCHES: readonly { index: SwatchIndex; token: string }[]`
  - `interface Category { id: string; name: string; swatch: SwatchIndex; position: number }`
  - `interface CategoryDraft { name: string; swatch: SwatchIndex }`
  - `type CategoryError = 'nameRequired' | 'nameTaken' | 'swatchOutOfRange'`
  - `const CATEGORY_MESSAGES: Record<CategoryError, string>`
  - `validateCategory(draft: CategoryDraft, existing: Category[], editingId: string | null): CategoryError | null`
  - `affectedCount(events: CalendarEvent[], categoryId: string): number`
  - `swatchToken(swatch: SwatchIndex): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  CATEGORY_MESSAGES,
  SWATCHES,
  affectedCount,
  swatchToken,
  validateCategory,
  type Category,
} from './categories';
import type { CalendarEvent } from './calendarEvent';

function category(id: string, name: string, swatch = 1 as const): Category {
  return { id, name, swatch, position: 0 };
}

function event(id: string, categoryId: string | null): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title: `Event ${id}`,
    date: '2026-08-25',
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown: false,
    categoryId,
  };
}

const existing = [category('a', 'Study'), category('b', 'Health')];

describe('SWATCHES', () => {
  it('has at least six entries', () => {
    expect(SWATCHES.length).toBeGreaterThanOrEqual(6);
  });

  it('is numbered contiguously from one', () => {
    expect(SWATCHES.map((s) => s.index)).toEqual(
      SWATCHES.map((_, i) => i + 1),
    );
  });

  it('names a token rather than a hex value', () => {
    for (const swatch of SWATCHES) {
      expect(swatch.token).toMatch(/^--mt-tag-\d$/);
    }
  });
});

describe('swatchToken', () => {
  it('resolves an index to its custom property', () => {
    expect(swatchToken(1)).toBe('--mt-tag-1');
  });
});

describe('validateCategory', () => {
  it('accepts a fresh name', () => {
    expect(validateCategory({ name: 'Travel', swatch: 2 }, existing, null)).toBeNull();
  });

  it('rejects a blank name', () => {
    expect(validateCategory({ name: '', swatch: 2 }, existing, null)).toBe(
      'nameRequired',
    );
  });

  it('rejects a whitespace-only name', () => {
    expect(validateCategory({ name: '   ', swatch: 2 }, existing, null)).toBe(
      'nameRequired',
    );
  });

  it('rejects a duplicate name', () => {
    expect(validateCategory({ name: 'Study', swatch: 2 }, existing, null)).toBe(
      'nameTaken',
    );
  });

  it('rejects a duplicate differing only in case', () => {
    expect(validateCategory({ name: 'study', swatch: 2 }, existing, null)).toBe(
      'nameTaken',
    );
  });

  it('rejects a duplicate differing only in surrounding space', () => {
    expect(validateCategory({ name: ' Study ', swatch: 2 }, existing, null)).toBe(
      'nameTaken',
    );
  });

  it('lets a category keep its own name while being edited', () => {
    expect(validateCategory({ name: 'Study', swatch: 2 }, existing, 'a')).toBeNull();
  });

  it('still rejects taking another category name while editing', () => {
    expect(validateCategory({ name: 'Health', swatch: 2 }, existing, 'a')).toBe(
      'nameTaken',
    );
  });

  it('rejects a swatch past the end of the ramp', () => {
    const beyond = (SWATCHES.length + 1) as 8;
    expect(validateCategory({ name: 'Travel', swatch: beyond }, existing, null)).toBe(
      'swatchOutOfRange',
    );
  });

  it('has a message for every error', () => {
    expect(Object.keys(CATEGORY_MESSAGES).sort()).toEqual([
      'nameRequired',
      'nameTaken',
      'swatchOutOfRange',
    ]);
  });
});

describe('affectedCount', () => {
  const events = [event('1', 'a'), event('2', 'a'), event('3', 'b'), event('4', null)];

  it('counts only events holding that category', () => {
    expect(affectedCount(events, 'a')).toBe(2);
  });

  it('never counts untagged events', () => {
    expect(affectedCount(events, 'c')).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/categories.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/categories.ts`. **Trim the `SWATCHES` array to the number of tokens Task 2 actually shipped** — if only seven survived, the array has seven entries and the `SwatchIndex` union stops at `7`:

```ts
import type { CalendarEvent } from './calendarEvent';

export type SwatchIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const SWATCHES: readonly { index: SwatchIndex; token: string }[] = [
  { index: 1, token: '--mt-tag-1' },
  { index: 2, token: '--mt-tag-2' },
  { index: 3, token: '--mt-tag-3' },
  { index: 4, token: '--mt-tag-4' },
  { index: 5, token: '--mt-tag-5' },
  { index: 6, token: '--mt-tag-6' },
  { index: 7, token: '--mt-tag-7' },
  { index: 8, token: '--mt-tag-8' },
] as const;

export interface Category {
  id: string;
  name: string;
  swatch: SwatchIndex;
  position: number;
}

export interface CategoryDraft {
  name: string;
  swatch: SwatchIndex;
}

export type CategoryError = 'nameRequired' | 'nameTaken' | 'swatchOutOfRange';

export const CATEGORY_MESSAGES: Record<CategoryError, string> = {
  nameRequired: 'Give the category a name.',
  nameTaken: 'You already have a category with that name.',
  swatchOutOfRange: 'Pick one of the colours shown.',
};

export function swatchToken(swatch: SwatchIndex): string {
  return `--mt-tag-${swatch}`;
}

export function validateCategory(
  draft: CategoryDraft,
  existing: Category[],
  editingId: string | null,
): CategoryError | null {
  const name = draft.name.trim();
  if (name === '') return 'nameRequired';

  const taken = existing.some(
    (category) =>
      category.id !== editingId &&
      category.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (taken) return 'nameTaken';

  const known = SWATCHES.some((swatch) => swatch.index === draft.swatch);
  if (!known) return 'swatchOutOfRange';

  return null;
}

export function affectedCount(
  events: CalendarEvent[],
  categoryId: string,
): number {
  return events.filter((event) => event.categoryId === categoryId).length;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/categories.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.ts src/lib/categories.test.ts
git commit -m "feat: add category model and validation"
```

---

### Task 8: The event form rules

Spec D57, D58, §4.

**Files:**
- Create: `src/lib/eventForm.ts`, `src/lib/eventForm.test.ts`

**Interfaces:**
- Consumes: `EventTiming` from `src/lib/calendarEvent.ts`.
- Produces:
  - `interface EventDraft { title: string; date: string; allDay: boolean; endDate: string; startTime: string; endTime: string; notes: string; countdown: boolean; categoryId: string | null }`
  - `type EventField = 'title' | 'date' | 'endDate' | 'startTime' | 'endTime'`
  - `type EventError = { field: EventField; message: string }`
  - `validate(draft: EventDraft): EventError | null`
  - `toTiming(draft: EventDraft): EventTiming`

- [ ] **Step 1: Write the failing test**

Create `src/lib/eventForm.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toTiming, validate, type EventDraft } from './eventForm';

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: 'Dentist',
    date: '2026-08-25',
    allDay: false,
    endDate: '',
    startTime: '10:00',
    endTime: '11:00',
    notes: '',
    countdown: false,
    categoryId: null,
    ...overrides,
  };
}

describe('validate', () => {
  it('accepts a well-formed draft', () => {
    expect(validate(draft())).toBeNull();
  });

  it('rejects a blank title', () => {
    expect(validate(draft({ title: '   ' }))?.field).toBe('title');
  });

  it('rejects a missing date', () => {
    expect(validate(draft({ date: '' }))?.field).toBe('date');
  });

  it('rejects an end time before its start', () => {
    expect(validate(draft({ startTime: '11:00', endTime: '10:00' }))?.field).toBe(
      'endTime',
    );
  });

  it('rejects an end time equal to its start', () => {
    expect(validate(draft({ startTime: '10:00', endTime: '10:00' }))?.field).toBe(
      'endTime',
    );
  });

  it('rejects an end time with no start time', () => {
    expect(validate(draft({ startTime: '', endTime: '11:00' }))?.field).toBe(
      'startTime',
    );
  });

  it('accepts a start time with no end time', () => {
    expect(validate(draft({ endTime: '' }))).toBeNull();
  });

  it('accepts an all-day event with no times', () => {
    expect(
      validate(draft({ allDay: true, startTime: '', endTime: '' })),
    ).toBeNull();
  });

  it('rejects an end date before its start date', () => {
    expect(
      validate(
        draft({
          allDay: true,
          startTime: '',
          endTime: '',
          endDate: '2026-08-24',
        }),
      )?.field,
    ).toBe('endDate');
  });

  it('accepts an end date equal to its start date', () => {
    expect(
      validate(
        draft({
          allDay: true,
          startTime: '',
          endTime: '',
          endDate: '2026-08-25',
        }),
      ),
    ).toBeNull();
  });

  it('rejects an end date on a timed event', () => {
    expect(validate(draft({ endDate: '2026-08-26' }))?.field).toBe('endDate');
  });

  it('carries a message with every error', () => {
    expect(validate(draft({ title: '' }))?.message.length).toBeGreaterThan(0);
  });
});

describe('toTiming', () => {
  it('makes an all-day timing when there are no times', () => {
    expect(
      toTiming(draft({ allDay: true, startTime: '', endTime: '' })),
    ).toEqual({ kind: 'allDay', endDate: null });
  });

  it('carries the end date onto an all-day timing', () => {
    expect(
      toTiming(
        draft({
          allDay: true,
          startTime: '',
          endTime: '',
          endDate: '2026-08-27',
        }),
      ),
    ).toEqual({ kind: 'allDay', endDate: '2026-08-27' });
  });

  it('makes a moment from a start time alone', () => {
    expect(toTiming(draft({ endTime: '' }))).toEqual({
      kind: 'moment',
      startTime: '10:00',
    });
  });

  it('makes a span from both times', () => {
    expect(toTiming(draft())).toEqual({
      kind: 'span',
      startTime: '10:00',
      endTime: '11:00',
    });
  });

  it('treats a blank end date as none', () => {
    expect(
      toTiming(draft({ allDay: true, startTime: '', endTime: '', endDate: '' })),
    ).toEqual({ kind: 'allDay', endDate: null });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/eventForm.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/eventForm.ts`:

```ts
import type { EventTiming } from './calendarEvent';

export interface EventDraft {
  title: string;
  date: string;
  allDay: boolean;
  endDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  countdown: boolean;
  categoryId: string | null;
}

export type EventField = 'title' | 'date' | 'endDate' | 'startTime' | 'endTime';

export interface EventError {
  field: EventField;
  message: string;
}

export function validate(draft: EventDraft): EventError | null {
  if (draft.title.trim() === '') {
    return { field: 'title', message: 'Give the event a name.' };
  }

  if (draft.date === '') {
    return { field: 'date', message: 'Pick a date.' };
  }

  if (draft.endTime !== '' && draft.startTime === '') {
    return {
      field: 'startTime',
      message: 'Add a start time, or clear the end time.',
    };
  }

  if (draft.endTime !== '' && draft.endTime <= draft.startTime) {
    return { field: 'endTime', message: 'The end time must be after the start.' };
  }

  if (draft.endDate !== '' && draft.startTime !== '') {
    return {
      field: 'endDate',
      message: 'Only all-day events can run across several days.',
    };
  }

  if (draft.endDate !== '' && draft.endDate < draft.date) {
    return { field: 'endDate', message: 'The last day cannot be before the first.' };
  }

  return null;
}

export function toTiming(draft: EventDraft): EventTiming {
  if (draft.startTime === '') {
    return { kind: 'allDay', endDate: draft.endDate === '' ? null : draft.endDate };
  }
  if (draft.endTime === '') {
    return { kind: 'moment', startTime: draft.startTime };
  }
  return { kind: 'span', startTime: draft.startTime, endTime: draft.endTime };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/eventForm.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eventForm.ts src/lib/eventForm.test.ts
git commit -m "feat: add event draft validation and timing conversion"
```

---

### Task 9: The countdown list

Spec D52, §6.

**Files:**
- Create: `src/lib/countdownList.ts`, `src/lib/countdownList.test.ts`

**Interfaces:**
- Consumes: `diffDays` from `src/lib/dates.ts`; `CalendarEvent` from `src/lib/calendarEvent.ts`.
- Produces:
  - `interface CountdownRow { id: string; title: string; date: string; daysUntil: number }`
  - `countdownRows(events: CalendarEvent[], today: string): CountdownRow[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/countdownList.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { countdownRows } from './countdownList';
import type { CalendarEvent } from './calendarEvent';

function event(
  id: string,
  title: string,
  date: string,
  countdown: boolean,
): CalendarEvent {
  return {
    id,
    owner: 'Jeff',
    title,
    date,
    timing: { kind: 'allDay', endDate: null },
    notes: null,
    countdown,
    categoryId: null,
  };
}

const today = '2026-08-19';

describe('countdownRows', () => {
  it('keeps only ticked events', () => {
    const events = [
      event('1', 'Anniversary', '2026-09-12', true),
      event('2', 'Dentist', '2026-09-13', false),
    ];
    expect(countdownRows(events, today).map((row) => row.id)).toEqual(['1']);
  });

  it('drops events already past', () => {
    const events = [event('1', 'Last month', '2026-07-01', true)];
    expect(countdownRows(events, today)).toEqual([]);
  });

  it('keeps today at zero days', () => {
    const events = [event('1', 'Today', today, true)];
    expect(countdownRows(events, today)[0].daysUntil).toBe(0);
  });

  it('never returns a negative number', () => {
    const events = [
      event('1', 'Past', '2026-01-01', true),
      event('2', 'Future', '2026-12-01', true),
    ];
    for (const row of countdownRows(events, today)) {
      expect(row.daysUntil).toBeGreaterThanOrEqual(0);
    }
  });

  it('orders soonest first', () => {
    const events = [
      event('1', 'Later', '2026-11-03', true),
      event('2', 'Sooner', '2026-09-12', true),
    ];
    expect(countdownRows(events, today).map((row) => row.id)).toEqual(['2', '1']);
  });

  it('counts the days between', () => {
    const events = [event('1', 'Anniversary', '2026-08-29', true)];
    expect(countdownRows(events, today)[0].daysUntil).toBe(10);
  });

  it('returns nothing when nothing is ticked', () => {
    expect(countdownRows([event('1', 'Dentist', '2026-09-13', false)], today)).toEqual(
      [],
    );
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/countdownList.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/countdownList.ts`:

```ts
import { diffDays } from './dates';
import type { CalendarEvent } from './calendarEvent';

export interface CountdownRow {
  id: string;
  title: string;
  date: string;
  daysUntil: number;
}

export function countdownRows(
  events: CalendarEvent[],
  today: string,
): CountdownRow[] {
  return events
    .filter((event) => event.countdown && event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      daysUntil: diffDays(event.date, today),
    }));
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/countdownList.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `npm test`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/countdownList.ts src/lib/countdownList.test.ts
git commit -m "feat: add the countdown list"
```

---

### Task 10: The repository

Spec §3. No test — this is a thin Supabase wrapper with no logic worth asserting, matching `cycleRepo.ts` which likewise has none. It is verified by the page loading in Task 16.

**Files:**
- Create: `src/lib/calendarRepo.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`; `CalendarEvent`, `EventTiming` from `src/lib/calendarEvent.ts`; `Category`, `SwatchIndex` from `src/lib/categories.ts`; `UserName` from `src/lib/identity.ts`.
- Produces:
  - `fetchEvents(): Promise<CalendarEvent[] | null>`
  - `insertEvent(input: EventInput): Promise<boolean>`
  - `updateEvent(id: string, input: EventInput): Promise<boolean>`
  - `deleteEvent(id: string): Promise<boolean>`
  - `fetchCategories(): Promise<Category[] | null>`
  - `insertCategory(name: string, swatch: SwatchIndex, position: number): Promise<boolean>`
  - `updateCategory(id: string, name: string, swatch: SwatchIndex): Promise<boolean>`
  - `deleteCategory(id: string): Promise<boolean>`
  - `interface EventInput { owner: UserName; title: string; date: string; timing: EventTiming; notes: string | null; countdown: boolean; categoryId: string | null }`

- [ ] **Step 1: Write the module**

Create `src/lib/calendarRepo.ts`:

```ts
import { supabase } from './supabase';
import type { CalendarEvent, EventTiming } from './calendarEvent';
import type { Category, SwatchIndex } from './categories';
import type { UserName } from './identity';

interface EventRow {
  id: string;
  owner: UserName;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  countdown: boolean;
  category_id: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  swatch: SwatchIndex;
  position: number;
}

export interface EventInput {
  owner: UserName;
  title: string;
  date: string;
  timing: EventTiming;
  notes: string | null;
  countdown: boolean;
  categoryId: string | null;
}

function trimTime(value: string | null): string | null {
  return value === null ? null : value.slice(0, 5);
}

function toTiming(row: EventRow): EventTiming {
  const start = trimTime(row.start_time);
  if (start === null) return { kind: 'allDay', endDate: row.end_date };

  const end = trimTime(row.end_time);
  if (end === null) return { kind: 'moment', startTime: start };

  return { kind: 'span', startTime: start, endTime: end };
}

function toColumns(input: EventInput) {
  const { timing } = input;
  return {
    owner: input.owner,
    title: input.title.trim(),
    date: input.date,
    end_date: timing.kind === 'allDay' ? timing.endDate : null,
    start_time: timing.kind === 'allDay' ? null : timing.startTime,
    end_time: timing.kind === 'span' ? timing.endTime : null,
    notes: input.notes,
    countdown: input.countdown,
    category_id: input.categoryId,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchEvents(): Promise<CalendarEvent[] | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(
      'id, owner, title, date, end_date, start_time, end_time, notes, countdown, category_id',
    )
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load calendar events:', error);
    return null;
  }

  return (data as EventRow[]).map((row) => ({
    id: row.id,
    owner: row.owner,
    title: row.title,
    date: row.date,
    timing: toTiming(row),
    notes: row.notes,
    countdown: row.countdown,
    categoryId: row.category_id,
  }));
}

export async function insertEvent(input: EventInput): Promise<boolean> {
  const { error } = await supabase.from('calendar_events').insert(toColumns(input));

  if (error) {
    console.error('Failed to add event:', error);
    return false;
  }
  return true;
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_events')
    .update(toColumns(input))
    .eq('id', id);

  if (error) {
    console.error('Failed to update event:', error);
    return false;
  }
  return true;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete event:', error);
    return false;
  }
  return true;
}

export async function fetchCategories(): Promise<Category[] | null> {
  const { data, error } = await supabase
    .from('calendar_categories')
    .select('id, name, swatch, position')
    .order('position', { ascending: true });

  if (error) {
    console.error('Failed to load categories:', error);
    return null;
  }

  return data as CategoryRow[];
}

export async function insertCategory(
  name: string,
  swatch: SwatchIndex,
  position: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_categories')
    .insert({ name: name.trim(), swatch, position });

  if (error) {
    console.error('Failed to add category:', error);
    return false;
  }
  return true;
}

export async function updateCategory(
  id: string,
  name: string,
  swatch: SwatchIndex,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_categories')
    .update({ name: name.trim(), swatch })
    .eq('id', id);

  if (error) {
    console.error('Failed to update category:', error);
    return false;
  }
  return true;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabase.from('calendar_categories').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete category:', error);
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/calendarRepo.ts
git commit -m "feat: add the calendar repository"
```

---

### Task 11: The year heatmap ramp

Spec D62, D71, §7. The existing ramp is derived on the dashboard accent's purple; the calendar's is pink.

**Files:**
- Modify: `src/lib/heatmapTheme.ts`, `src/lib/heatmapTheme.test.ts`

**Interfaces:**
- Consumes: `contrastRatio`, `lightness` from `src/lib/color.ts` (in the test).
- Produces: `CALENDAR_HEATMAP_RAMP: readonly string[]` — five entries, element 0 being the empty level.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/heatmapTheme.test.ts`:

```ts
describe('calendar heatmap ramp', () => {
  it('has five levels', () => {
    expect(CALENDAR_HEATMAP_RAMP).toHaveLength(5);
  });

  it('darkens as activity rises', () => {
    for (let index = 1; index < CALENDAR_HEATMAP_RAMP.length; index += 1) {
      expect(lightness(CALENDAR_HEATMAP_RAMP[index])).toBeLessThan(
        lightness(CALENDAR_HEATMAP_RAMP[index - 1]),
      );
    }
  });

  it('separates adjacent levels', () => {
    for (let index = 1; index < CALENDAR_HEATMAP_RAMP.length; index += 1) {
      expect(
        contrastRatio(
          CALENDAR_HEATMAP_RAMP[index],
          CALENDAR_HEATMAP_RAMP[index - 1],
        ),
      ).toBeGreaterThanOrEqual(MIN_ADJACENT_CONTRAST);
    }
  });

  it('keeps the empty level visible on the card', () => {
    expect(
      contrastRatio(CALENDAR_HEATMAP_RAMP[0], HEATMAP_SURFACE),
    ).toBeGreaterThanOrEqual(MIN_EMPTY_VS_SURFACE);
  });

  it('is a different ramp from the dashboard', () => {
    expect(CALENDAR_HEATMAP_RAMP[4]).not.toBe(HEATMAP_RAMP[4]);
  });
});
```

Add `CALENDAR_HEATMAP_RAMP` to the existing import from `./heatmapTheme` at the top of that file.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/heatmapTheme.test.ts`
Expected: FAIL — `CALENDAR_HEATMAP_RAMP` is not exported.

- [ ] **Step 3: Add the ramp**

Append to `src/lib/heatmapTheme.ts`:

```ts
export const CALENDAR_HEATMAP_RAMP = [
  '#F6E9F4',
  '#E4C0DD',
  '#C994C0',
  '#A4669B',
  '#743C6C',
] as const;
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/heatmapTheme.test.ts`
Expected: PASS. If the adjacent-contrast or lightness-order assertions fail, adjust the middle three values along the same hue line — do not change the thresholds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/heatmapTheme.ts src/lib/heatmapTheme.test.ts
git commit -m "feat: add the calendar heatmap ramp"
```

---

### Task 12: The event block and day panel

Spec D60, D63, D67, D68, D77, §5, §7. No unit tests — Vitest has no DOM here. Verified by typecheck, lint, and the browser pass in Task 16.

**Files:**
- Create: `src/components/calendar/EventBlock.tsx`, `src/components/calendar/DayPanel.tsx`

**Interfaces:**
- Consumes: `CalendarEvent`, `sortDay`, `timelineHours` from `src/lib/calendarEvent.ts`; `Category`, `swatchToken` from `src/lib/categories.ts`; `formatLongDate` from `src/lib/dates.ts`.
- Produces:
  - `EventBlock({ event, category, isOwn, onOpen }: { event: CalendarEvent; category: Category | null; isOwn: boolean; onOpen: (event: CalendarEvent) => void })`
  - `DayPanel({ date, events, categories, signedInAs, onOpen }: { date: string; events: CalendarEvent[]; categories: Category[]; signedInAs: UserName; onOpen: (event: CalendarEvent) => void })`

- [ ] **Step 1: Write `EventBlock`**

Create `src/components/calendar/EventBlock.tsx`:

```tsx
import type { CalendarEvent } from '@/lib/calendarEvent';
import { swatchToken, type Category } from '@/lib/categories';

function timeLabel(event: CalendarEvent): string {
  if (event.timing.kind === 'allDay') return 'All day';
  if (event.timing.kind === 'moment') return event.timing.startTime;
  return `${event.timing.startTime} – ${event.timing.endTime}`;
}

export default function EventBlock({
  event,
  category,
  isOwn,
  onOpen,
}: {
  event: CalendarEvent;
  category: Category | null;
  isOwn: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  const description = `${event.title}, ${timeLabel(event)}${
    isOwn ? '' : ', Rachel’s'
  }`;

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={description}
      className="flex min-h-11 w-full flex-col items-start justify-center rounded-xl px-3 py-2 text-left"
      style={{
        background: isOwn
          ? 'color-mix(in srgb, var(--mt-accent) 32%, var(--mt-surface))'
          : 'var(--mt-surface)',
        border: isOwn ? 'none' : '1.5px solid var(--mt-accent)',
      }}
    >
      <span className="flex items-center gap-2">
        {category && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: `var(${swatchToken(category.swatch)})` }}
            aria-hidden
          />
        )}
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {event.title}
        </span>
      </span>
      <span className="mt-0.5 text-xs text-[var(--mt-text-muted)]">
        {timeLabel(event)}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Write `DayPanel`**

Create `src/components/calendar/DayPanel.tsx`:

```tsx
import type { CalendarEvent } from '@/lib/calendarEvent';
import { sortDay, timelineHours } from '@/lib/calendarEvent';
import type { Category } from '@/lib/categories';
import { formatLongDate } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import EventBlock from './EventBlock';

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function hourOf(event: CalendarEvent): number {
  if (event.timing.kind === 'allDay') return 0;
  return Number(event.timing.startTime.slice(0, 2));
}

export default function DayPanel({
  date,
  events,
  categories,
  signedInAs,
  onOpen,
}: {
  date: string;
  events: CalendarEvent[];
  categories: Category[];
  signedInAs: UserName;
  onOpen: (event: CalendarEvent) => void;
}) {
  const ordered = sortDay(events);
  const allDay = ordered.filter((event) => event.timing.kind === 'allDay');
  const timed = ordered.filter((event) => event.timing.kind !== 'allDay');
  const range = timelineHours(ordered);

  const categoryOf = (event: CalendarEvent) =>
    categories.find((item) => item.id === event.categoryId) ?? null;

  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-[var(--mt-text)]">
        {formatLongDate(date)}
      </div>

      {allDay.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {allDay.map((event) => (
            <EventBlock
              key={event.id}
              event={event}
              category={categoryOf(event)}
              isOwn={event.owner === signedInAs}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}

      {range === null ? (
        <p className="py-4 text-sm text-[var(--mt-text-muted)]">
          {allDay.length > 0 ? 'Nothing else on.' : 'Nothing on.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {Array.from({ length: range.to - range.from }, (_, offset) => {
            const hour = range.from + offset;
            const inHour = timed.filter((event) => hourOf(event) === hour);
            return (
              <div
                key={hour}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 border-t border-[var(--mt-border)] pt-2"
              >
                <span className="text-xs text-[var(--mt-text-subtle)]">
                  {pad(hour)}:00
                </span>
                <div className="flex flex-col gap-2">
                  {inHour.map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      category={categoryOf(event)}
                      isOwn={event.owner === signedInAs}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/EventBlock.tsx src/components/calendar/DayPanel.tsx
git commit -m "feat: add the calendar day panel"
```

---

### Task 13: The three navigators

Spec D59, D61, D62, D63, §5.

**Files:**
- Create: `src/components/calendar/WeekRail.tsx`, `src/components/calendar/MonthGrid.tsx`, `src/components/calendar/YearHeatmap.tsx`

**Interfaces:**
- Consumes: `weekDates`, `countsByDate`, `monthDots` from `src/lib/calendarViews.ts`; `monthGridDates`, `monthOf`, `formatMonthYear`, `WEEKDAYS_SHORT`, `addDays` from `src/lib/dates.ts`; `CALENDAR_HEATMAP_RAMP` from `src/lib/heatmapTheme.ts`; `CalendarEvent` from `src/lib/calendarEvent.ts`.
- Produces:
  - `WeekRail({ selectedDate, today, events, onSelect })`
  - `MonthGrid({ month, selectedDate, today, events, onSelect, onMonth })`
  - `YearHeatmap({ year, events, onSelect })`

- [ ] **Step 1: Write `WeekRail`**

Create `src/components/calendar/WeekRail.tsx`:

```tsx
import type { CalendarEvent } from '@/lib/calendarEvent';
import { countsByDate, monthDots, weekDates } from '@/lib/calendarViews';
import { WEEKDAYS_SHORT } from '@/lib/dates';

export default function WeekRail({
  selectedDate,
  today,
  events,
  onSelect,
}: {
  selectedDate: string;
  today: string;
  events: CalendarEvent[];
  onSelect: (date: string) => void;
}) {
  const dates = weekDates(selectedDate);
  const counts = countsByDate(events, dates);

  return (
    <div className="grid grid-cols-7 gap-1">
      {dates.map((date, index) => {
        const selected = date === selectedDate;
        const dots = monthDots(counts[date]);

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(date)}
            aria-pressed={selected}
            aria-label={`${WEEKDAYS_SHORT[index]} ${Number(date.slice(8))}, ${
              counts[date]
            } events`}
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-1"
            style={
              selected
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            <span className="text-[10px] font-semibold uppercase text-[var(--mt-text-subtle)]">
              {WEEKDAYS_SHORT[index].slice(0, 1)}
            </span>
            {date === today && !selected ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mt-text)] text-xs font-semibold text-[var(--mt-surface)]">
                {Number(date.slice(8))}
              </span>
            ) : (
              <span className="text-sm text-[var(--mt-text)]">
                {Number(date.slice(8))}
              </span>
            )}
            <span className="flex h-1.5 items-center gap-0.5">
              {Array.from({ length: dots }, (_, dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--mt-text-muted)]"
                  aria-hidden
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write `MonthGrid`**

Create `src/components/calendar/MonthGrid.tsx`:

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '@/lib/calendarEvent';
import { countsByDate, monthDots } from '@/lib/calendarViews';
import {
  WEEKDAYS_SHORT,
  formatMonthYear,
  monthGridDates,
  monthOf,
} from '@/lib/dates';

export default function MonthGrid({
  month,
  selectedDate,
  today,
  events,
  onSelect,
  onMonth,
}: {
  month: string;
  selectedDate: string;
  today: string;
  events: CalendarEvent[];
  onSelect: (date: string) => void;
  onMonth: (step: -1 | 1) => void;
}) {
  const dates = monthGridDates(month);
  const counts = countsByDate(events, dates);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonth(-1)}
          aria-label="Previous month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          onClick={() => onMonth(1)}
          aria-label="Next month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

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
        {dates.map((date) => {
          const inMonth = monthOf(date) === month;
          const selected = date === selectedDate;
          const dots = monthDots(counts[date]);

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={selected}
              aria-label={`${date}, ${counts[date]} events`}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl"
              style={{
                background: selected ? 'var(--mt-accent)' : undefined,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              {date === today && !selected ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mt-text)] text-xs font-semibold text-[var(--mt-surface)]">
                  {Number(date.slice(8))}
                </span>
              ) : (
                <span className="text-xs text-[var(--mt-text)]">
                  {Number(date.slice(8))}
                </span>
              )}
              <span className="flex h-1.5 items-center gap-0.5">
                {Array.from({ length: dots }, (_, dot) => (
                  <span
                    key={dot}
                    className="h-1 w-1 rounded-full bg-[var(--mt-text-muted)]"
                    aria-hidden
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `YearHeatmap`**

Create `src/components/calendar/YearHeatmap.tsx`:

```tsx
'use client';

import { ActivityCalendar } from 'react-activity-calendar';
import type { CalendarEvent } from '@/lib/calendarEvent';
import { countsByDate } from '@/lib/calendarViews';
import { addDays } from '@/lib/dates';
import { CALENDAR_HEATMAP_RAMP } from '@/lib/heatmapTheme';

const CALENDAR_THEME = {
  light: [...CALENDAR_HEATMAP_RAMP],
  dark: [...CALENDAR_HEATMAP_RAMP],
};

const MAX_LEVEL = 4;

function yearDates(year: number): string[] {
  const dates: string[] = [];
  const last = `${year}-12-31`;
  for (let date = `${year}-01-01`; date <= last; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export default function YearHeatmap({
  year,
  events,
  onSelect,
}: {
  year: number;
  events: CalendarEvent[];
  onSelect: (date: string) => void;
}) {
  const dates = yearDates(year);
  const counts = countsByDate(events, dates);
  const data = dates.map((date) => ({
    date,
    count: counts[date],
    level: Math.min(counts[date], MAX_LEVEL),
  }));

  return (
    <ActivityCalendar
      data={data}
      theme={CALENDAR_THEME}
      colorScheme="light"
      blockSize={10}
      blockMargin={3}
      fontSize={11}
      maxLevel={MAX_LEVEL}
      eventHandlers={{
        onClick: () => (activity) => onSelect(activity.date),
      }}
      labels={{
        legend: { less: 'Quiet', more: 'Busy' },
        months: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ],
      }}
    />
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output. If `eventHandlers` or `maxLevel` do not typecheck, check the installed `react-activity-calendar` API:

```bash
cat node_modules/react-activity-calendar/dist/index.d.ts
```

Adapt to what that file declares rather than to what this plan assumed.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/WeekRail.tsx src/components/calendar/MonthGrid.tsx src/components/calendar/YearHeatmap.tsx
git commit -m "feat: add the calendar week, month and year navigators"
```

---

### Task 14: The event modal

Spec D54, D64, D69, §5.

**Files:**
- Create: `src/components/calendar/EventModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/ui/Modal`; `EventDraft`, `EventError`, `validate` from `src/lib/eventForm.ts`; `Category`, `swatchToken` from `src/lib/categories.ts`.
- Produces: `EventModal({ draft, categories, canEdit, isEditing, isSaving, saveError, onChange, onSave, onDelete, onClose })` where `onChange` takes a full `EventDraft`.

- [ ] **Step 1: Write the component**

Create `src/components/calendar/EventModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { swatchToken, type Category } from '@/lib/categories';
import { validate, type EventDraft, type EventField } from '@/lib/eventForm';

const FIELD_CLASS =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

const LABEL_CLASS =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]';

export default function EventModal({
  draft,
  categories,
  canEdit,
  isEditing,
  isSaving,
  saveError,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  draft: EventDraft;
  categories: Category[];
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  saveError: string | null;
  onChange: (draft: EventDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [fieldError, setFieldError] = useState<{
    field: EventField;
    message: string;
  } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setFieldError(null);
    onChange({ ...draft, [key]: value });
  };

  const toggleAllDay = (allDay: boolean) => {
    setFieldError(null);
    onChange(
      allDay
        ? { ...draft, allDay, startTime: '', endTime: '' }
        : { ...draft, allDay, endDate: '' },
    );
  };

  const handleSave = () => {
    const problem = validate(draft);
    if (problem) {
      setFieldError(problem);
      return;
    }
    onSave();
  };

  const errorFor = (field: EventField) =>
    fieldError?.field === field ? fieldError.message : null;

  const title = canEdit ? (isEditing ? 'Edit event' : 'Add event') : draft.title;

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      variant="sheet"
      footer={
        canEdit ? (
          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (confirmingDelete) onDelete();
                  else setConfirmingDelete(true);
                }}
                disabled={isSaving}
                className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-danger)]"
              >
                {confirmingDelete ? 'Delete — are you sure?' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="min-h-11 flex-1 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : null
      }
    >
      {!canEdit && (
        <p className="mb-4 text-sm text-[var(--mt-text-muted)]">
          This one is Rachel’s, so it is here to read rather than change.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="event-title">
            What
          </label>
          <input
            id="event-title"
            type="text"
            value={draft.title}
            disabled={!canEdit}
            onChange={(e) => set('title', e.target.value)}
            className={FIELD_CLASS}
          />
          {errorFor('title') && (
            <p className="mt-1 text-xs text-[var(--mt-danger)]">
              {errorFor('title')}
            </p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="event-date">
            When
          </label>
          <input
            id="event-date"
            type="date"
            value={draft.date}
            disabled={!canEdit}
            onChange={(e) => set('date', e.target.value)}
            className={FIELD_CLASS}
          />
          {errorFor('date') && (
            <p className="mt-1 text-xs text-[var(--mt-danger)]">
              {errorFor('date')}
            </p>
          )}
        </div>

        <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-[var(--mt-text)]">
          All day
          <input
            type="checkbox"
            checked={draft.allDay}
            disabled={!canEdit}
            onChange={(e) => toggleAllDay(e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        {draft.allDay ? (
          <div>
            <label className={LABEL_CLASS} htmlFor="event-end-date">
              Last day (leave blank for one day)
            </label>
            <input
              id="event-end-date"
              type="date"
              value={draft.endDate}
              disabled={!canEdit}
              onChange={(e) => set('endDate', e.target.value)}
              className={FIELD_CLASS}
            />
            {errorFor('endDate') && (
              <p className="mt-1 text-xs text-[var(--mt-danger)]">
                {errorFor('endDate')}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} htmlFor="event-start">
                Starts
              </label>
              <input
                id="event-start"
                type="time"
                value={draft.startTime}
                disabled={!canEdit}
                onChange={(e) => set('startTime', e.target.value)}
                className={FIELD_CLASS}
              />
              {errorFor('startTime') && (
                <p className="mt-1 text-xs text-[var(--mt-danger)]">
                  {errorFor('startTime')}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="event-end">
                Ends
              </label>
              <input
                id="event-end"
                type="time"
                value={draft.endTime}
                disabled={!canEdit}
                onChange={(e) => set('endTime', e.target.value)}
                className={FIELD_CLASS}
              />
              {errorFor('endTime') && (
                <p className="mt-1 text-xs text-[var(--mt-danger)]">
                  {errorFor('endTime')}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <span className={LABEL_CLASS}>Category</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set('categoryId', null)}
              disabled={!canEdit}
              aria-pressed={draft.categoryId === null}
              className="min-h-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
              style={
                draft.categoryId === null
                  ? { background: 'var(--mt-accent)' }
                  : undefined
              }
            >
              None
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => set('categoryId', category.id)}
                disabled={!canEdit}
                aria-pressed={draft.categoryId === category.id}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
                style={
                  draft.categoryId === category.id
                    ? { background: 'var(--mt-accent)' }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: `var(${swatchToken(category.swatch)})` }}
                  aria-hidden
                />
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="event-notes">
            Remarks
          </label>
          <textarea
            id="event-notes"
            value={draft.notes}
            disabled={!canEdit}
            rows={3}
            onChange={(e) => set('notes', e.target.value)}
            className="w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-3 text-sm text-[var(--mt-text)]"
          />
        </div>

        <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-[var(--mt-text)]">
          Count down to this
          <input
            type="checkbox"
            checked={draft.countdown}
            disabled={!canEdit}
            onChange={(e) => set('countdown', e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        {saveError && (
          <p className="text-sm text-[var(--mt-danger)]">{saveError}</p>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/EventModal.tsx
git commit -m "feat: add the event modal"
```

---

### Task 15: Chrome — switcher, filters, search results, category manager

Spec D67, D69, D72, D76, §5.

**Files:**
- Create: `src/components/calendar/ViewSwitcher.tsx`, `src/components/calendar/FilterStrip.tsx`, `src/components/calendar/SearchResults.tsx`, `src/components/calendar/CategoryManager.tsx`

**Interfaces:**
- Consumes: `OwnerFilter` from `src/lib/calendarViews.ts`; `DateGroup` from `src/lib/calendarSearch.ts`; `Category`, `CategoryDraft`, `SWATCHES`, `swatchToken`, `validateCategory`, `CATEGORY_MESSAGES`, `affectedCount` from `src/lib/categories.ts`; `formatLongDate` from `src/lib/dates.ts`.
- Produces:
  - `type CalendarView = 'week' | 'month' | 'year'`, exported from `ViewSwitcher.tsx`
  - `ViewSwitcher({ view, query, onView, onQuery })`
  - `FilterStrip({ owner, categories, categoryIds, onOwner, onToggleCategory, onManage })`
  - `SearchResults({ groups, today, categories, signedInAs, onOpen })`
  - `CategoryManager({ categories, events, isSaving, onAdd, onRename, onDelete, onClose })`

- [ ] **Step 1: Write `ViewSwitcher`**

Create `src/components/calendar/ViewSwitcher.tsx`:

```tsx
'use client';

import { Search, X } from 'lucide-react';

export type CalendarView = 'week' | 'month' | 'year';

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function ViewSwitcher({
  view,
  query,
  onView,
  onQuery,
}: {
  view: CalendarView;
  query: string;
  onView: (view: CalendarView) => void;
  onQuery: (query: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onView(key)}
            aria-pressed={view === key}
            className={`min-h-11 flex-1 rounded-full text-xs font-semibold ${
              view === key ? '' : 'text-[var(--mt-text-muted)]'
            }`}
            style={
              view === key
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 text-[var(--mt-text-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search events"
          className="min-h-11 w-32 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] pl-9 pr-8 text-sm text-[var(--mt-text)]"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => onQuery('')}
            aria-label="Clear search"
            className="absolute right-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `FilterStrip`**

Create `src/components/calendar/FilterStrip.tsx`:

```tsx
'use client';

import { SlidersHorizontal } from 'lucide-react';
import { swatchToken, type Category } from '@/lib/categories';
import type { OwnerFilter } from '@/lib/calendarViews';
import { USERS } from '@/lib/identity';

export default function FilterStrip({
  owner,
  categories,
  categoryIds,
  onOwner,
  onToggleCategory,
  onManage,
}: {
  owner: OwnerFilter;
  categories: Category[];
  categoryIds: string[];
  onOwner: (owner: OwnerFilter) => void;
  onToggleCategory: (id: string) => void;
  onManage: () => void;
}) {
  const options: OwnerFilter[] = [...USERS, 'both'];

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onOwner(option)}
            aria-pressed={owner === option}
            className="min-h-11 shrink-0 rounded-full border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
            style={
              owner === option
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            {option === 'both' ? 'Both' : option}
          </button>
        ))}

        {categories.length > 0 && (
          <span
            className="my-2 w-px shrink-0 bg-[var(--mt-border)]"
            aria-hidden
          />
        )}

        {categories.map((category) => {
          const active = categoryIds.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onToggleCategory(category.id)}
              aria-pressed={active}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
              style={active ? { background: 'var(--mt-accent)' } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: `var(${swatchToken(category.swatch)})` }}
                aria-hidden
              />
              {category.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onManage}
        aria-label="Manage categories"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-[var(--mt-border)] text-[var(--mt-text-muted)]"
      >
        <SlidersHorizontal size={16} aria-hidden />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write `SearchResults`**

Create `src/components/calendar/SearchResults.tsx`:

```tsx
import type { DateGroup } from '@/lib/calendarSearch';
import type { CalendarEvent } from '@/lib/calendarEvent';
import type { Category } from '@/lib/categories';
import { formatLongDate } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import EventBlock from './EventBlock';

export default function SearchResults({
  groups,
  today,
  categories,
  signedInAs,
  onOpen,
}: {
  groups: DateGroup[];
  today: string;
  categories: Category[];
  signedInAs: UserName;
  onOpen: (event: CalendarEvent) => void;
}) {
  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--mt-text-muted)]">
        Nothing matches that.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.date} style={{ opacity: group.date < today ? 0.55 : 1 }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]">
            {formatLongDate(group.date)}
          </div>
          <div className="flex flex-col gap-2">
            {group.events.map((event) => (
              <EventBlock
                key={event.id}
                event={event}
                category={
                  categories.find((item) => item.id === event.categoryId) ?? null
                }
                isOwn={event.owner === signedInAs}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write `CategoryManager`**

Create `src/components/calendar/CategoryManager.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { CalendarEvent } from '@/lib/calendarEvent';
import {
  CATEGORY_MESSAGES,
  SWATCHES,
  affectedCount,
  swatchToken,
  validateCategory,
  type Category,
  type SwatchIndex,
} from '@/lib/categories';

export default function CategoryManager({
  categories,
  events,
  isSaving,
  onAdd,
  onRename,
  onDelete,
  onClose,
}: {
  categories: Category[];
  events: CalendarEvent[];
  isSaving: boolean;
  onAdd: (name: string, swatch: SwatchIndex) => void;
  onRename: (id: string, name: string, swatch: SwatchIndex) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [swatch, setSwatch] = useState<SwatchIndex>(SWATCHES[0].index);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleAdd = () => {
    const problem = validateCategory({ name, swatch }, categories, null);
    if (problem) {
      setError(CATEGORY_MESSAGES[problem]);
      return;
    }
    setError(null);
    setName('');
    onAdd(name, swatch);
  };

  return (
    <Modal open onClose={onClose} title="Categories" variant="sheet">
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: `var(${swatchToken(category.swatch)})` }}
                aria-hidden
              />
              <input
                type="text"
                value={category.name}
                aria-label={`Rename ${category.name}`}
                onChange={(e) =>
                  onRename(category.id, e.target.value, category.swatch)
                }
                className="min-h-11 flex-1 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
              />
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (confirmingId === category.id) {
                    onDelete(category.id);
                    setConfirmingId(null);
                  } else {
                    setConfirmingId(category.id);
                  }
                }}
                aria-label={`Delete ${category.name}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[var(--mt-border)] px-3 text-xs font-semibold text-[var(--mt-danger)]"
              >
                {confirmingId === category.id ? (
                  `${affectedCount(events, category.id)} lose this tag — sure?`
                ) : (
                  <Trash2 size={16} aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--mt-border)] pt-4">
          <label
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]"
            htmlFor="category-name"
          >
            New category
          </label>
          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {SWATCHES.map((option) => (
              <button
                key={option.index}
                type="button"
                onClick={() => setSwatch(option.index)}
                aria-label={`Colour ${option.index}`}
                aria-pressed={swatch === option.index}
                className="h-11 w-11 rounded-full"
                style={{
                  background: `var(${option.token})`,
                  outline:
                    swatch === option.index ? '2px solid var(--mt-focus)' : undefined,
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-[var(--mt-danger)]">{error}</p>}

          <button
            type="button"
            onClick={handleAdd}
            disabled={isSaving}
            className="mt-3 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
          >
            Add category
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar
git commit -m "feat: add calendar chrome and category management"
```

---

### Task 16: The board and the page

Spec D53, D55, D63, D70, §5. This is the task that makes the feature real; it is also the first time anything renders.

**Files:**
- Create: `src/components/calendar/CalendarBoard.tsx`
- Modify: `src/app/study/calendar/page.tsx`

**Interfaces:**
- Consumes: everything built so far.
- Produces: a working `/study/calendar`.

- [ ] **Step 1: Write `CalendarBoard`**

Create `src/components/calendar/CalendarBoard.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import { occursOn, type CalendarEvent } from '@/lib/calendarEvent';
import { applyFilters, type OwnerFilter } from '@/lib/calendarViews';
import { groupByDate, searchEvents } from '@/lib/calendarSearch';
import {
  deleteCategory,
  deleteEvent,
  fetchCategories,
  fetchEvents,
  insertCategory,
  insertEvent,
  updateCategory,
  updateEvent,
} from '@/lib/calendarRepo';
import type { Category, SwatchIndex } from '@/lib/categories';
import { addMonths, monthGridDates, monthOf, todayISO } from '@/lib/dates';
import { toTiming, type EventDraft } from '@/lib/eventForm';
import { isUserName, type UserName } from '@/lib/identity';
import CategoryManager from './CategoryManager';
import DayPanel from './DayPanel';
import EventModal from './EventModal';
import FilterStrip from './FilterStrip';
import MonthGrid from './MonthGrid';
import SearchResults from './SearchResults';
import ViewSwitcher, { type CalendarView } from './ViewSwitcher';
import WeekRail from './WeekRail';
import YearHeatmap from './YearHeatmap';

function blankDraft(date: string): EventDraft {
  return {
    title: '',
    date,
    allDay: false,
    endDate: '',
    startTime: '',
    endTime: '',
    notes: '',
    countdown: false,
    categoryId: null,
  };
}

function draftOf(event: CalendarEvent): EventDraft {
  const { timing } = event;
  return {
    title: event.title,
    date: event.date,
    allDay: timing.kind === 'allDay',
    endDate: timing.kind === 'allDay' ? (timing.endDate ?? '') : '',
    startTime: timing.kind === 'allDay' ? '' : timing.startTime,
    endTime: timing.kind === 'span' ? timing.endTime : '',
    notes: event.notes ?? '',
    countdown: event.countdown,
    categoryId: event.categoryId,
  };
}

type ModalState =
  | { mode: 'add' }
  | { mode: 'edit'; event: CalendarEvent };

export default function CalendarBoard() {
  const mounted = useHasMounted();

  const [signedInAs, setSignedInAs] = useState<UserName>('Jeff');
  const [view, setView] = useState<CalendarView>('week');
  const [owner, setOwner] = useState<OwnerFilter>('Jeff');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const [today, setToday] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [month, setMonth] = useState('');

  const [modal, setModal] = useState<ModalState | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('user_name');
    const name: UserName = isUserName(stored) ? stored : 'Jeff';
    const now = todayISO();
    queueMicrotask(() => {
      setSignedInAs(name);
      setOwner(name);
      setToday(now);
      setSelectedDate(now);
      setMonth(monthOf(now));
    });
  }, [mounted]);

  const load = useCallback(async () => {
    const [rows, cats] = await Promise.all([fetchEvents(), fetchCategories()]);
    if (rows === null || cats === null) {
      setFailed(true);
      return;
    }
    setEvents(rows);
    setCategories(cats);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      load();
    });
  }, [mounted, load]);

  const visible = useMemo(
    () => applyFilters(events, { owner, categoryIds }),
    [events, owner, categoryIds],
  );

  const matches = useMemo(
    () => groupByDate(searchEvents(visible, query)),
    [visible, query],
  );

  const dayEvents = useMemo(
    () => visible.filter((event) => occursOn(event, selectedDate)),
    [visible, selectedDate],
  );

  const yearEvents = useMemo(() => visible, [visible]);

  const openAdd = () => {
    setDraft(blankDraft(selectedDate));
    setSaveError(null);
    setModal({ mode: 'add' });
  };

  const openEvent = (event: CalendarEvent) => {
    setDraft(draftOf(event));
    setSaveError(null);
    setModal({ mode: 'edit', event });
  };

  const closeModal = () => {
    setModal(null);
    setDraft(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (draft === null || modal === null) return;

    setIsSaving(true);
    setSaveError(null);

    const input = {
      owner: modal.mode === 'edit' ? modal.event.owner : signedInAs,
      title: draft.title.trim(),
      date: draft.date,
      timing: toTiming(draft),
      notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
      countdown: draft.countdown,
      categoryId: draft.categoryId,
    };

    const ok =
      modal.mode === 'add'
        ? await insertEvent(input)
        : await updateEvent(modal.event.id, input);

    setIsSaving(false);

    if (!ok) {
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }

    await load();
    closeModal();
  };

  const handleDelete = async () => {
    if (modal === null || modal.mode !== 'edit') return;
    setIsSaving(true);
    const ok = await deleteEvent(modal.event.id);
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not delete. Check your connection and try again.');
      return;
    }
    await load();
    closeModal();
  };

  const handleAddCategory = async (name: string, swatch: SwatchIndex) => {
    setIsSaving(true);
    await insertCategory(name, swatch, categories.length);
    setIsSaving(false);
    await load();
  };

  const handleRenameCategory = async (
    id: string,
    name: string,
    swatch: SwatchIndex,
  ) => {
    setCategories((current) =>
      current.map((item) => (item.id === id ? { ...item, name } : item)),
    );
    await updateCategory(id, name, swatch);
  };

  const handleDeleteCategory = async (id: string) => {
    setIsSaving(true);
    await deleteCategory(id);
    setIsSaving(false);
    setCategoryIds((current) => current.filter((item) => item !== id));
    await load();
  };

  if (!mounted || (!loaded && !failed)) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      </Card>
    );
  }

  if (failed) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text)]">Could not load.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            load();
          }}
          className="mt-3 min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Try again
        </button>
      </Card>
    );
  }

  const searching = query.trim() !== '';

  return (
    <div className="mb-4 flex flex-col gap-4">
      <ViewSwitcher
        view={view}
        query={query}
        onView={setView}
        onQuery={setQuery}
      />

      <FilterStrip
        owner={owner}
        categories={categories}
        categoryIds={categoryIds}
        onOwner={setOwner}
        onToggleCategory={(id) =>
          setCategoryIds((current) =>
            current.includes(id)
              ? current.filter((item) => item !== id)
              : [...current, id],
          )
        }
        onManage={() => setManagingCategories(true)}
      />

      {searching ? (
        <Card>
          <SearchResults
            groups={matches}
            today={today}
            categories={categories}
            signedInAs={signedInAs}
            onOpen={openEvent}
          />
        </Card>
      ) : (
        <>
          <Card>
            {view === 'week' && (
              <WeekRail
                selectedDate={selectedDate}
                today={today}
                events={visible}
                onSelect={setSelectedDate}
              />
            )}
            {view === 'month' && (
              <MonthGrid
                month={month}
                selectedDate={selectedDate}
                today={today}
                events={visible}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setMonth(monthOf(date));
                }}
                onMonth={(step) =>
                  setMonth((current) => addMonths(current, step))
                }
              />
            )}
            {view === 'year' && (
              <div className="min-w-0 overflow-x-auto">
                <YearHeatmap
                  year={Number(selectedDate.slice(0, 4))}
                  events={yearEvents}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setMonth(monthOf(date));
                    setView('week');
                  }}
                />
              </div>
            )}
          </Card>

          <Card>
            <DayPanel
              date={selectedDate}
              events={dayEvents}
              categories={categories}
              signedInAs={signedInAs}
              onOpen={openEvent}
            />
          </Card>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
          >
            <Plus size={18} aria-hidden />
            Add event
          </button>
        </>
      )}

      {modal && draft && (
        <EventModal
          draft={draft}
          categories={categories}
          canEdit={modal.mode === 'add' || modal.event.owner === signedInAs}
          isEditing={modal.mode === 'edit'}
          isSaving={isSaving}
          saveError={saveError}
          onChange={setDraft}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}

      {managingCategories && (
        <CategoryManager
          categories={categories}
          events={events}
          isSaving={isSaving}
          onAdd={handleAddCategory}
          onRename={handleRenameCategory}
          onDelete={handleDeleteCategory}
          onClose={() => {
            setManagingCategories(false);
            load();
          }}
        />
      )}
    </div>
  );
}
```

Note `monthGridDates` is imported but unused — remove it from the import list.

- [ ] **Step 2: Replace the page**

Overwrite `src/app/study/calendar/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import CalendarBoard from '@/components/calendar/CalendarBoard';

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      subtitle="What's happening, and when"
      accent="calendar"
    >
      <CalendarBoard />
    </PageShell>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verify in the browser**

Start the dev server through the preview tooling — never a raw shell command. Open `/study/calendar` and check:

1. The page loads without a console error. If the tables do not exist yet it shows "Could not load" — that is correct behaviour, and Jeff needs to run the SQL from Task 3.
2. Add an event with a start and end time. It appears in the day panel with its times.
3. Add an all-day event with a last day two days later. It appears in the all-day bar on all three days.
4. A day with nothing on shows "Nothing on", not an empty grid of hours.
5. Switch to Month, tap a day, confirm the panel below follows.
6. Switch to Year, tap a busy square, confirm it lands on that day in Week.
7. Add a category, tag an event with it, confirm the dot shows.
8. Delete that category, confirm the count in the confirm text is right and the event survives untagged.
9. Type in the search box; results replace the calendar. Clear it; the calendar returns.
10. Read the console — no React key warnings, no hydration mismatch.

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/CalendarBoard.tsx src/app/study/calendar/page.tsx
git commit -m "feat: build the calendar page on real data"
```

---

### Task 17: Countdown reads the calendar

Spec D52, §6.

**Files:**
- Create: `src/components/countdown/CountdownBoard.tsx`
- Modify: `src/app/(life)/countdown/page.tsx`

**Interfaces:**
- Consumes: `fetchEvents` from `src/lib/calendarRepo.ts`; `countdownRows` from `src/lib/countdownList.ts`; `todayISO`, `formatShortDate` from `src/lib/dates.ts`.
- Produces: `/countdown` showing ticked events.

- [ ] **Step 1: Write `CountdownBoard`**

Create `src/components/countdown/CountdownBoard.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import { fetchEvents } from '@/lib/calendarRepo';
import { countdownRows, type CountdownRow } from '@/lib/countdownList';
import { formatShortDate, todayISO } from '@/lib/dates';

export default function CountdownBoard() {
  const mounted = useHasMounted();
  const [rows, setRows] = useState<CountdownRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const events = await fetchEvents();
    if (events === null) {
      setFailed(true);
      return;
    }
    setRows(countdownRows(events, todayISO()));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      load();
    });
  }, [mounted, load]);

  if (!mounted || (!loaded && !failed)) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      </Card>
    );
  }

  if (failed) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text)]">Could not load.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            load();
          }}
          className="mt-3 min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Try again
        </button>
      </Card>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      {rows.length === 0 ? (
        <Card>
          <p className="text-base font-medium text-[var(--mt-text)]">
            Nothing to count down to yet
          </p>
          <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
            Tick “count down to this” on an event and it turns up here.
          </p>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-[var(--mt-text)]">
                  {row.title}
                </div>
                <div className="mt-0.5 text-sm text-[var(--mt-text-muted)]">
                  {formatShortDate(row.date)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-semibold text-[var(--mt-text)]">
                  {row.daysUntil}
                </div>
                <div className="text-xs text-[var(--mt-text-subtle)]">
                  {row.daysUntil === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}

      <Link
        href="/study/calendar"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
      >
        Add a date in the calendar
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Replace the page**

Overwrite `src/app/(life)/countdown/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import CountdownBoard from '@/components/countdown/CountdownBoard';

export default function CountdownPage() {
  return (
    <PageShell
      title="Countdown"
      subtitle="Dates we're counting down to"
      accent="countdown"
    >
      <CountdownBoard />
    </PageShell>
  );
}
```

- [ ] **Step 3: Typecheck, lint, test**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Verify in the browser**

Open `/countdown`. Tick "count down to this" on a future event in the calendar, return here, and confirm it appears with the right number of days. Confirm a past ticked event does not appear.

- [ ] **Step 5: Commit**

```bash
git add src/components/countdown src/app/\(life\)/countdown/page.tsx
git commit -m "feat: build countdown on calendar events"
```

---

### Task 18: Contrast measurement and the verification checklist

Spec §7. The palette work is specified but unmeasured until now, and the rank badges shipped at 4.35:1 precisely because this step was skipped.

**Files:**
- Create: `src/lib/calendarContrast.test.ts`, `docs/superpowers/verification/2026-08-19-study-calendar.md`

**Interfaces:**
- Consumes: `contrastRatio` from `src/lib/color.ts`.
- Produces: an assertion that the event block's text clears AA on the tint it actually sits on.

- [ ] **Step 1: Write the failing test**

The event block fills with `color-mix(in srgb, var(--mt-accent) 32%, var(--mt-surface))`. Under the calendar section that resolves to 32% of `#FFB5F4` over `#FFFFFF`. Create `src/lib/calendarContrast.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToRgb } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const TINT = 0.32;
const MIN_BODY_CONTRAST = 4.5;
const MIN_MARK_CONTRAST = 3;

function readToken(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  return match![1];
}

function pad(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function mix(over: string, under: string, ratio: number): string {
  const a = hexToRgb(over);
  const b = hexToRgb(under);
  const blend = (x: number, y: number) => Math.round(x * ratio + y * (1 - ratio));
  return `#${pad(blend(a.r, b.r))}${pad(blend(a.g, b.g))}${pad(blend(a.b, b.b))}`;
}

describe('event block contrast', () => {
  const accent = readToken('--mac-accent-calendar');
  const white = readToken('--mac-white');
  const cocoa = readToken('--mac-cocoa');
  const cocoaMuted = readToken('--mac-cocoa-muted');
  const fill = mix(accent, white, TINT);

  it('clears AA for the event title on the tint', () => {
    expect(contrastRatio(cocoa, fill)).toBeGreaterThanOrEqual(MIN_BODY_CONTRAST);
  });

  it('clears AA for the time line on the tint', () => {
    expect(contrastRatio(cocoaMuted, fill)).toBeGreaterThanOrEqual(
      MIN_BODY_CONTRAST,
    );
  });

  it('keeps the outline visible for the partner treatment', () => {
    expect(contrastRatio(accent, white)).toBeGreaterThanOrEqual(
      MIN_MARK_CONTRAST,
    );
  });

  it('keeps every swatch readable as a dot on the tint', () => {
    const pattern = /--mac-tag-\d:\s*(#[0-9A-Fa-f]{6})/g;
    let match = pattern.exec(CSS);
    while (match !== null) {
      expect(contrastRatio(match[1], fill)).toBeGreaterThanOrEqual(
        MIN_MARK_CONTRAST,
      );
      match = pattern.exec(CSS);
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/lib/calendarContrast.test.ts`

Two outcomes are both informative:

- **PASS** — the treatments as specified are safe. Move on.
- **FAIL on the outline test** — `#FFB5F4` is a pastel and may not reach 3:1 against white on its own. If so, the partner outline must use a deeper sibling rather than the raw accent. Add `--mac-accent-calendar-deep` to `globals.css`, alias it as `--mt-accent-deep` in both mood blocks, point the test at it, and change `EventBlock`'s border in Task 12's file to `1.5px solid var(--mt-accent-deep)`. **Do not lower the threshold.**
- **FAIL on a title or time test** — raise the tint percentage in `EventBlock` (32% → 24% → 18%) until it passes, since a paler fill leaves more contrast for the ink. Update `TINT` in the test to match whatever the component uses.

Iterate until green.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Write the human verification checklist**

Create `docs/superpowers/verification/2026-08-19-study-calendar.md`, following the shape of the cycle checklist already in that folder:

```markdown
# Study calendar — human verification

Run through this on a phone, signed in as Jeff, with the Supabase tables created.

## Adding

- [ ] "Add event" opens the pop-up with today's date already filled in.
- [ ] Saving without a name shows "Give the event a name" under the name box, and does not close.
- [ ] An event saved with 10:00–11:00 shows in the day panel with both times.
- [ ] Flicking "all day" hides the time boxes and shows "last day".
- [ ] An end time before its start is refused with the message beside the end box.
- [ ] An end date before its start date is refused.

## Reading

- [ ] A day with nothing on says "Nothing on" rather than showing empty hours.
- [ ] A day with one event at 10:00 shows roughly three hours of timeline, not 24.
- [ ] An all-day event spanning three days shows on all three.
- [ ] Week: tapping a date bubble changes the panel below.
- [ ] Month: tapping a day changes the panel below; days outside the month are dimmed.
- [ ] Year: tapping a busy square lands on that day in Week view.
- [ ] Today is marked in both the rail and the month grid.

## Two people

- [ ] The person filter opens on Jeff.
- [ ] Rachel's events show outlined rather than filled.
- [ ] Tapping one of Rachel's events opens it with no Save button and a line saying so.
- [ ] Switching to Rachel then Both changes what is shown, and the dots change with it.

## Categories

- [ ] Adding a category with an existing name (in any casing) is refused.
- [ ] A tagged event shows a dot in its category's colour.
- [ ] Every swatch is distinguishable from every other at dot size, on a phone, at arm's length.
- [ ] Deleting a category names the correct number of events in the confirm.
- [ ] After deleting, those events are still there, just untagged.
- [ ] Renaming a category updates the chip, the event dots and the pop-up at once.

## Search

- [ ] Typing replaces the calendar with results.
- [ ] Searching a word that only appears in remarks finds the event.
- [ ] Past matches appear dimmed rather than missing.
- [ ] Clearing the box brings the calendar back where it was.

## Countdown

- [ ] An event ticked "count down to this" appears at /countdown.
- [ ] The day count is right, and today reads 0.
- [ ] A past ticked event does not appear.
- [ ] With nothing ticked, the page explains how to add one.

## Everything else

- [ ] No hydration warning in the console on first load.
- [ ] The page does not scroll sideways at 375px wide.
- [ ] Every button is comfortably tappable with a thumb.
- [ ] Turning the network off and saving shows an error and keeps what was typed.
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarContrast.test.ts docs/superpowers/verification/2026-08-19-study-calendar.md
git commit -m "test: pin calendar contrast and add the verification checklist"
```

- [ ] **Step 6: Final gate**

Run: `npm test`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: a successful production build. This is the first check that the Server/Client component split is right — a `'use client'` missing from a component using hooks fails here and nowhere earlier.

Then walk the checklist from Step 4 with Jeff. Do not claim the feature is done before that walk happens.

---

## Self-Review

**Spec coverage:**

| Spec | Task |
|---|---|
| §1 context, replacing the mock | 16 |
| §2 D52 one table, no countdown store | 3, 17 |
| D53 owner stamped from sign-in | 16 |
| D54 partner read-only | 14, 16 |
| D55 online only, failed save keeps input | 10, 16 |
| D56 plain strings | 4, 8, 10 |
| D57 three timing shapes | 4, 8 |
| D58 spans are all-day only | 3, 4, 8 |
| D59 rail, not seven columns | 13 |
| D60 hours between first and last | 4, 12 |
| D61 dots, never names | 5, 13 |
| D62 year as density | 11, 13 |
| D63 one day panel, three navigators | 12, 13, 16 |
| D64 one modal | 14 |
| D65 no repeats | not built, by design |
| D66 dates.ts rename | 1 |
| D67 filter defaults to signed-in | 5, 15, 16 |
| D68 stacking, no collision layout | 4, 12 |
| D69 two-tap delete | 14, 15 |
| D70 view and date not persisted | 16 |
| D71 calendar heatmap ramp | 11 |
| D72 search across everything | 6, 15, 16 |
| D73 categories by reference | 3, 7, 10 |
| D74 delete nulls the reference | 3, 7, 15 |
| D75 swatches not a picker | 2, 7, 15 |
| D76 managed on the calendar page | 15 |
| D77 dot for category, fill for owner | 12 |
| D78 deeper ramp, not the pastels | 2 |
| §3 data model | 3, 4, 7, 10 |
| §4 lib modules | 4, 5, 6, 7, 8, 9 |
| §5 components | 12, 13, 14, 15, 16 |
| §6 countdown | 9, 17 |
| §7 colours and contrast | 2, 11, 18 |
| §8 testing | 4–9, 11, 18 |
| §9 out of scope | nothing built |

No gaps.

**Type consistency:** `CalendarEvent`, `EventTiming`, `Category`, `SwatchIndex`, `EventDraft`, `OwnerFilter`, `CalendarView`, `DateGroup`, `CountdownRow` and `EventInput` are each defined in exactly one task and imported by name everywhere after. `swatchToken` returns the property name without `var()`, and every call site wraps it — checked in Tasks 12, 14, 15.

**Known risks flagged inside the plan rather than hidden:**

1. Task 2's eight swatches may not all clear deltaE 20. The plan says drop the count, never the threshold, and Tasks 3 and 7 both depend on the surviving number.
2. Task 18 may find `#FFB5F4` fails 3:1 as an outline. The remedy — a deeper sibling token — is written out rather than left to judgment.
3. Task 13's `react-activity-calendar` props (`maxLevel`, `eventHandlers`) are written from the installed version's expected API; the step says to read `node_modules/react-activity-calendar/dist/index.d.ts` and adapt rather than guess.
