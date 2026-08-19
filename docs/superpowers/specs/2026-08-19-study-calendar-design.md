# Study calendar — design

**Date:** 2026-08-19
**Status:** Awaiting review
**Builds on:** [2026-08-16-cycle-tracking-design.md](2026-08-16-cycle-tracking-design.md)

## 1. Context

`/study/calendar` ships today as a picture. The month grid is a hardcoded August
2026 with a comment explaining that the five leading blanks exist so the weekday
alignment is not wrong at a glance. Three sample events sit below it under
`SampleChip`, and the "Add event" button is `disabled` above a `ComingSoon` note.
Nothing saves.

This spec replaces all of it. One person adds an event — a title, a date, times,
remarks — and it appears in the calendar for both of them. It is the third
mutable shared feature after Timetable and Cycle, and it reuses their shape:
Supabase-only, no Dexie, client reads and writes, plain-string dates.

Two things distinguish it.

**It absorbs Countdown.** `/countdown` ships as its own inert list of named dates.
Rather than build a second store with the same shape, an event carries a
`countdown` flag and `/countdown` becomes a view over the calendar's rows. There
is one "add" screen in the app, not two.

**It rejects the seven-column week grid.** The user's stated complaint is that
Google Calendar is too complicated to read. A seven-column time grid at phone
width gives each day well under the 44px minimum touch target, and far less than
a word needs. The week view here is a rail of seven date bubbles above a
single day drawn at full width (§5). This is a deliberate refusal of the familiar
shape, and §2 records why.

Timetable is untouched and stays separate. It holds a daily routine; this holds
dated events. They are not the same thing and are not merged.

## 2. Decisions

Numbering continues from the cycle spec (D31–D51 there).

| # | Decision | Rationale |
|---|---|---|
| **D52** | One table, `calendar_events`, holding every event regardless of section. There is no separate countdown table. | User decision. Countdown and Calendar were about to store the same four fields behind two different buttons. A flag on a row costs nothing; a second table costs a second add form, a second repo, and a permanent question about which one a date belongs in. |
| **D53** | An event's `owner` is stamped from the signed-in name at save time. The add form **never asks whose it is**. | User decision, stated directly: "I don't want when I add an event I need to choose." The name comes from `localStorage.user_name`, the same source `focus_sessions` and `timetables` already stamp from. |
| **D54** | The partner's events are **visible and read-only**. Read-only is enforced in the UI only; the Supabase policy stays open to `anon`, as for `timetables` and `cycle_*`. | Identity here is a name tapped at a shared password gate (`Gatekeeper`), not an account. A row-level rule keyed on it would be theatre. The UI rule is honest about being a convention between two people. |
| **D55** | **Online only.** No Dexie table, no write queue. On a failed save the modal stays open with the input intact and shows the error inline. | Restates D45. The timer needs offline because a session starts away from signal; a calendar is read far more than written and written at a keyboard. A second copy of the data would buy little and cost a merge model for two writers. |
| **D56** | Dates and times are **plain strings** end to end — `YYYY-MM-DD` and `HH:MM`. No `Date` object crosses a function boundary, no value is ever stored as a UTC instant. | Restates D47 and extends it to clock times. Storing "19:30" as an instant is how an evening event lands on the wrong day. Both people are in one timezone; the app never needs to know which one. |
| **D57** | Times are optional, giving an event exactly **three shapes**: all-day (no times), a moment (start only), a span (start and end). Modelled as a discriminated union in the client type, not as two nullable fields checked ad hoc. | An end time with no start is not a thing. Making it unrepresentable is cheaper than validating against it everywhere it could appear. |
| **D58** | An **all-day** event may span dates via `end_date`. A **timed** event may not. | User decision. "Trip to Penang" is a real two-day case; a meeting running from Tuesday 15:00 to Thursday 10:00 is not. Allowing spans only where they occur keeps the three views free of a "this one started somewhere else" rule for timed blocks. |
| **D59** | Week is a **seven-bubble date rail above one full-width day**, not a seven-column time grid. | The whole request was "easier to see than Google". At phone width, seven columns render events as unlabelled colour smudges. The rail keeps the week legible for navigation and gives the day the full width for words. Cost, accepted: two days cannot be compared side by side. |
| **D60** | The day timeline draws **only the hours between the first and last timed event**, with a minimum span of 3 hours. A day with no timed events draws **no grid at all** — one line of text. | This is the concrete difference from Google, which draws all 24 hours and makes you scroll past an empty night. A grid of empty hours is chrome that conveys nothing; the sentence conveys the same fact in one line. |
| **D61** | The month grid shows **dots, never event names**. Up to three dots, then nothing further. | A month cell is roughly 45px wide. A title inside it truncates to about four characters, which reads as noise and cannot be distinguished from another four-character truncation. A dot answers "is anything on" honestly and at a glance. |
| **D62** | Year is a **density heatmap** — a square per day, deeper where more is on — not twelve mini month grids. | User decision. Twelve grids is the thing that makes Google's year view unreadable, and shrinking it further cannot fix it. The question a year answers is "which weeks are packed", which is a density question. Reuses `react-activity-calendar`, already a dependency. |
| **D63** | All three views are **navigators onto the same day panel**. Tapping a rail bubble, a month cell, or a heatmap square selects a date; the panel below always renders that date the same way. | One readable surface built once, reached three ways. The alternative — each view rendering its own detail treatment — is three times the code and three chances for them to drift. |
| **D64** | **One modal** serves add, edit, and delete. Tapping an existing event opens it prefilled. | The add form and the edit form differ only in whether the fields start empty. Two components would be one component and a copy of it. |
| **D65** | **No repeating events in version 1.** | A repeat is not a row, it is a rule, and a rule immediately demands "skip this one occurrence" and "change it from here onward" — realistically half the build for a feature not yet asked for. Weekly routine already has a home in Timetable. |
| **D66** | `lib/cycleDates.ts` is renamed to **`lib/dates.ts`**, imports updated at its existing call sites. | The module is `addDays`, `monthGridDates`, `weekdayIndex`, `formatMonthYear` — string date arithmetic with nothing cycle-specific in it. The calendar needs all of it. Copying it would create two places for a weekday-offset bug to live. |
| **D67** | Whose events you see is a **three-state filter — Both / Jeff / Rachel — defaulting to Both**. Ownership is shown by **fill versus outline**, not by hue alone. | Seeing both is half the point of a shared calendar, so it is the default. Distinguishing two owners by hue would need a second colour inside a section that owns exactly one accent; fill-versus-outline needs none, and does not depend on colour vision. |
| **D68** | Two events at overlapping times **stack vertically** in sort order. There is no side-by-side collision layout. | Collision layout is the most intricate part of a time grid, and it exists to preserve horizontal position, which a single-day full-width panel does not use. Stacking is correct here, not a simplification. |
| **D69** | Delete asks for confirmation **inside the modal**, by the button becoming "Delete — are you sure?" rather than opening a second dialog. | A modal opening a modal is the one interaction the app does not have anywhere else. The two-tap button is reversible by closing, which a browser `confirm()` is not. |
| **D70** | The selected date and the chosen view live in component state and are **not persisted**. The page opens on today, in Week. | Unlike the cycle page's ring/calendar toggle (D49), there is no stable preference to remember here — the answer to "which day" is nearly always today, and the answer to "which view" changes with the question being asked. |
| **D71** | The year heatmap gets its **own ramp** on the calendar accent's hue, added to `heatmapTheme.ts` and pinned to its token in `heatmapTheme.test.ts`. | The existing `HEATMAP_RAMP` is derived on the dashboard accent's hue line. Reusing it would put a lilac heatmap inside a pink section. Pinning follows the existing rule: a retuned token must fail a test, not silently leave a chart on a colour that is no longer real. |

## 3. Data model

### Supabase

Added to the comment block in `lib/supabase.ts`, alongside the existing schemas.
Jeff runs this himself; the app never creates tables.

```sql
create table calendar_events (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null check (owner in ('Jeff', 'Rachel')),
  title      text not null check (length(trim(title)) > 0),
  date       date not null,
  end_date   date,
  start_time time,
  end_time   time,
  notes      text,
  countdown  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

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

create policy "anon reads calendar_events"
  on calendar_events for select to anon using (true);
create policy "anon writes calendar_events"
  on calendar_events for all to anon using (true) with check (true);
```

The four check constraints are D57 and D58 written where they cannot be bypassed.
`calendar_events_span_is_all_day` is the one that enforces "only all-day events
span dates"; without it a timed multi-day row could be inserted and every view
would then need a rule for it.

### Client types

```ts
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
}
```

`EventTiming` is D57. The row's four nullable time columns collapse into this
union once, in the repo, and nothing downstream branches on nullability again.

`lib/calendarRepo.ts` mirrors `cycleRepo.ts`: `fetchEvents(from, to)`,
`insertEvent`, `updateEvent`, `deleteEvent`. Each logs and returns `null` or
`false` on error; the caller decides what to show.

## 4. The logic — `lib/`

Vitest runs pure functions with no DOM, so every rule worth asserting lives in a
module rather than a component.

### `lib/calendarEvent.ts`

- `sortDay(events)` — all-day first, then by start time, then by title. Stable, so
  D68's stacking order is defined rather than incidental.
- `occursOn(event, date)` — true for the event's own date, and for every date
  covered by an all-day span.
- `timelineHours(events)` — returns `null` when no timed event exists (D60), else
  `{ from, to }` in whole hours: `from` is the hour of the earliest start, `to`
  the hour after the latest end, where a `moment` counts as one hour. Widened to
  a minimum span of 3 so a single mid-morning event does not render as a sliver.

### `lib/calendarViews.ts`

- `weekDates(date)` — the seven `YYYY-MM-DD` strings of the Monday-based week
  containing `date`, via `weekdayIndex` from `dates.ts`.
- `countsByDate(events, dates)` — how many events fall on each date, spans
  counted on every day they cover. Feeds the rail dots, the month dots, and the
  year heatmap from one function.
- `monthDots(count)` — `count` clamped to 3 (D61).

### `lib/eventForm.ts`

- `validate(draft)` — a required non-blank title; `end_time` after `start_time`;
  `end_time` only with a `start_time`; `end_date` not before `date`; `end_date`
  only on an all-day event. Returns field-keyed messages, so the modal shows the
  error beside the box that caused it.
- `toTiming(draft)` — blank times become `allDay`, a start alone becomes
  `moment`, both become `span`. The one place the three shapes are constructed.

### `lib/countdownList.ts`

- `countdownRows(events, today)` — events with `countdown` true, dropping any
  whose date is past, soonest first, each carrying `daysUntil` computed by
  `diffDays` on strings. Never returns a negative number.

## 5. Components

`src/components/calendar/`, following the `cycle/` layout: a client board owning
state, dumb children under it.

- **`CalendarBoard.tsx`** — `'use client'`. Owns the selected date, the view, the
  person filter, and the fetched events. The only stateful component.
- **`ViewSwitcher.tsx`** — `Week | Month | Year`, and `Both | Jeff | Rachel`.
- **`WeekRail.tsx`** — seven date bubbles, a dot where something is on, today
  marked as the cycle calendar marks it. Each bubble is a 44px target.
- **`DayPanel.tsx`** — the shared detail surface (D63): an all-day bar at the top,
  then either the hour timeline or D60's single line. A span event's block is
  proportional to its length; a `moment` renders at a fixed height.
- **`MonthGrid.tsx`** — 7×6 from `monthGridDates`, dots only.
- **`YearHeatmap.tsx`** — `ActivityCalendar` on the new ramp, a square per day.
- **`EventModal.tsx`** — the `ui/Modal`. Title, date, an "all day" switch that
  hides the time boxes, start, end, end date when all-day, notes, and the
  countdown tick. Add, edit and delete (D64, D69). Opens read-only with no save
  button when the event's owner is not the signed-in name (D54).

`src/app/study/calendar/page.tsx` becomes a Server Component rendering
`PageShell` with `accent="calendar"` and `CalendarBoard` inside — the same
reduction the cycle page made.

## 6. Countdown

`/countdown` currently holds a hardcoded `EVENTS` array and a disabled button. It
becomes a view over `countdownRows` (§4): the same card, the same big day number,
now from real rows. Its "Add date" button opens `EventModal` with the countdown
tick already on. No new store, no new table (D52).

The empty state points at the calendar rather than at nothing: a ticked event is
the only way a row appears here.

## 7. Colours and contrast

The section accent is `--mt-accent`, set by `PageShell` to the calendar accent
`#FFB5F4`. Every colour below is a token reference; no literal enters a component
(the heatmap ramp excepted, per D71, because `react-activity-calendar` reads a
literal `theme` prop before CSS resolves).

- Your events: a tint of `--mt-accent` behind `--mt-text`, built the way
  `phaseFill` builds the cycle tints.
- Rachel's events: the same shape, outlined in `--mt-accent` on `--mt-surface`
  (D67).
- The dots follow the same fill/outline split.

Both treatments must be measured against what the text actually sits on before
ship — a tint on the white card, not the token in isolation. Target is 4.5:1 for
the title and time text, 3:1 for the dots and outlines as non-text graphics. The
rank badges shipped at 4.35:1 by skipping exactly this step.

The heatmap ramp needs five levels including the empty level, darkening as
activity rises, derived on the calendar accent's hue line — the construction
described in `heatmapTheme.ts`, with the calendar's hue substituted.

## 8. Testing

Failing-first, per the project rule.

| Module | What is asserted |
|---|---|
| `calendarEvent.test.ts` | `sortDay` puts all-day first and is stable across equal keys; `occursOn` covers every day of a span and neither day outside it; `timelineHours` returns `null` for an all-day-only day, widens a lone event to 3 hours, and spans first-start to last-end for a mixed day. |
| `calendarViews.test.ts` | `weekDates` returns Monday-first and holds across a month boundary and across a year boundary; `countsByDate` counts a span on each covered day exactly once; `monthDots` clamps at 3. |
| `eventForm.test.ts` | Each validation rule fails on its own case and passes otherwise; `toTiming` produces each of the three shapes from the corresponding draft. |
| `countdownList.test.ts` | A past date is dropped; today is 0 days, never negative; order is soonest first; unticked events never appear. |
| `heatmapTheme.test.ts` | The new ramp's five entries pin to their tokens in `globals.css` (existing file, extended). |

No component rendering, matching the existing suite.

## 9. Out of scope

Repeating events (D65). Reminders and notifications. Dragging an event to a new
time. Search. Categories or tags. Attachments. Importing from another calendar.
The seven-column week grid (D59) — structured so it could be added later as a
fourth view without disturbing the day panel, but not built.
