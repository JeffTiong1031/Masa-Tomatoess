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
a category, remarks — and it appears in the calendar for both of them, findable
by search. It is the third mutable shared feature after Timetable and Cycle, and
it reuses their shape: Supabase-only, no Dexie, client reads and writes,
plain-string dates.

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
| **D67** | Whose events you see is a **three-state filter — Both / Jeff / Rachel — defaulting to whoever is signed in**. Ownership is shown by **fill versus outline**, not by hue alone. | User decision. "What's on for me" is the standing question; "what are we both doing" is the occasional one, and it is one tap away. Distinguishing two owners by hue would need a second colour inside a section that owns exactly one accent; fill-versus-outline needs none, and does not depend on colour vision. |
| **D68** | Two events at overlapping times **stack vertically** in sort order. There is no side-by-side collision layout. | Collision layout is the most intricate part of a time grid, and it exists to preserve horizontal position, which a single-day full-width panel does not use. Stacking is correct here, not a simplification. |
| **D69** | Delete asks for confirmation **inside the modal**, by the button becoming "Delete — are you sure?" rather than opening a second dialog. | A modal opening a modal is the one interaction the app does not have anywhere else. The two-tap button is reversible by closing, which a browser `confirm()` is not. |
| **D70** | The selected date and the chosen view live in component state and are **not persisted**. The page opens on today, in Week. | Unlike the cycle page's ring/calendar toggle (D49), there is no stable preference to remember here — the answer to "which day" is nearly always today, and the answer to "which view" changes with the question being asked. |
| **D71** | The year heatmap gets its **own ramp** on the calendar accent's hue, added to `heatmapTheme.ts` and pinned to its token in `heatmapTheme.test.ts`. | The existing `HEATMAP_RAMP` is derived on the dashboard accent's hue line. Reusing it would put a lilac heatmap inside a pink section. Pinning follows the existing rule: a retuned token must fail a test, not silently leave a chart on a colour that is no longer real. |
| **D72** | Search matches **title and notes across every event**, not the date range currently on screen. Results replace the board with a date-grouped list; clearing the box restores it. | User decision. A search that only finds what is already visible answers a question nobody asks. Results cannot render inside the day panel — a match set spans dates by nature — so search owns the surface while it is active rather than trying to fold into a view. |
| **D73** | Categories are **rows in `calendar_categories`**, editable at runtime. An event stores a **reference** to one, never the category's name. | User decision to make the list editable. The reference is what makes rename free: renaming "Study" to "Uni" is one `update` on one row. Storing the word would need a sweep across every event, and would leave old spellings behind on any row the sweep missed. |
| **D74** | Deleting a category **nulls the reference on its events**; the events themselves survive untagged. The confirm states how many will be affected before you commit. | User decision. Nothing the user typed is destroyed by an action aimed at something else — the same principle as D26 and D45. Enforced by `on delete set null` at the database, so it holds whatever the UI does. |
| **D75** | A category's colour is **picked from a fixed set of measured swatches — eight if eight clear the separation bar (§7), otherwise fewer** — never a free colour picker. | A colour wheel lets you choose a dot nobody can see, and there is no honest way to test a value the user invents at runtime. Eight pinned swatches is already more categories than two people will use, so losing one or two to the contrast maths costs nothing worth having. |
| **D76** | Category management lives in **its own modal on the calendar page**, not in `SettingsModal`. | `SettingsModal` is 329 lines of focus length, break length, alarm sound and strict mode, opened from a control labelled "Open timer settings". Categories have nothing to do with the timer, and that file is already at the size where adding an unrelated concern is how it becomes unmaintainable. |
| **D77** | The category shows as a **coloured dot on the event**; the block itself keeps the section accent and the fill/outline ownership rule. | User decision. One small block on a phone can carry two facts only if they use different channels. Fill-versus-outline carries owner, a dot carries category. A dot is a non-text graphic, so it needs 3:1 rather than the 4.5:1 a coloured background behind text would demand. |
| **D78** | The swatch colours are a **new deeper ramp**, siblings to `--mac-chart-lilac` and `--mac-danger-deep` — not the `--mac-*` section pastels. | The section accents are built to sit *behind* text and measure under 2:1 as standalone marks. A dot is ink. Reaching for the existing pastels here would ship eight marks that cannot be seen, which is the same mistake `accents.test.ts` exists to prevent. |

## 3. Data model

### Supabase

Added to the comment block in `lib/supabase.ts`, alongside the existing schemas.
Jeff runs this himself; the app never creates tables.

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

The four check constraints are D57 and D58 written where they cannot be bypassed.
`calendar_events_span_is_all_day` is the one that enforces "only all-day events
span dates"; without it a timed multi-day row could be inserted and every view
would then need a rule for it.

`on delete set null` on `category_id` is D74 enforced at the database rather than
in the delete handler. The UI still shows the affected count before committing,
but the events survive a deletion issued from anywhere.

The `swatch between 1 and 8` bound assumes eight swatches survive §7's separation
check. The ramp is drawn and tested **before** this DDL is run, and the bound is
written to whatever number actually shipped.

A category stores `swatch` — a small integer — **not a hex value**. The
colour that integer maps to lives in `globals.css` and is pinned in a test
(D75, D78). A hex in the database could never be retuned, could never be
asserted, and would let a row hold a colour that fails contrast with nothing to
catch it.

### Client types

```ts
export type EventTiming =
  | { kind: 'allDay'; endDate: string | null }
  | { kind: 'moment'; startTime: string }
  | { kind: 'span'; startTime: string; endTime: string };

export interface Category {
  id: string;
  name: string;
  swatch: SwatchIndex;
  position: number;
}

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
```

`EventTiming` is D57. The row's four nullable time columns collapse into this
union once, in the repo, and nothing downstream branches on nullability again.

`SwatchIndex` is a union of the literals `1 | 2 | … | 8`, so an out-of-range
swatch is a type error rather than a lookup that quietly returns `undefined`.
An event carries `categoryId`, not a resolved `Category` — the board holds the
category list once and looks up by id, which is also what keeps a rename
appearing everywhere at once (D73).

`lib/calendarRepo.ts` mirrors `cycleRepo.ts`: `fetchEvents()`, `insertEvent`,
`updateEvent`, `deleteEvent`, plus `fetchCategories`, `insertCategory`,
`updateCategory`, `deleteCategory`. Each logs and returns `null` or `false` on
error; the caller decides what to show.

`fetchEvents()` takes **no date range** — it loads every event once. A range
query would have to be re-issued on every month page, would still need a second
unbounded query for search (D72), and would refetch the same rows repeatedly for
a table holding a few hundred a year. One fetch, filtered in memory, is both
simpler and fewer round trips. If the table ever outgrows that, a range query
is a change inside the repo and nothing above it moves.

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
- `applyFilters(events, { owner, categoryIds })` — the one place the person
  filter and the category filter are applied. Every view, the dot counts and the
  heatmap all read filtered events, so a filtered-out event cannot leave a dot
  behind on a day that now looks empty.

### `lib/calendarSearch.ts`

- `searchEvents(events, query)` — case-insensitive match on title and notes,
  trimmed, returning `[]` for a blank query so the caller has one condition to
  branch on rather than two.
- `groupByDate(events)` — the date-grouped shape the result list renders, also
  reused by the countdown list and any future agenda view.

Search runs over the events already held in memory, which is every event (§3).
At two people's rate of entry the whole table is a few hundred rows a year; a
server-side text search would be a query, an index and a debounce for a set that
fits in a variable.

### `lib/categories.ts`

- `SWATCHES` — indices 1–8 mapped to their `--mac-tag-*` custom property names
  (D75, D78). Components reference the property; only the test reads the literal
  values, out of `globals.css`, the way `accents.test.ts` already does.
- `validateCategory(draft, existing)` — a required non-blank name, unique
  case-insensitively against the existing list, and a swatch in range. The
  case-insensitive check is what stops "Study" and "study" existing side by side
  — the exact failure that made a fixed list the alternative in the first place.
- `affectedCount(events, categoryId)` — how many events a delete would untag,
  for the confirm text (D74).

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
  person filter, the category filter, the search query, the fetched events and
  the category list. The only stateful component.
- **`ViewSwitcher.tsx`** — `Week | Month | Year` on the left, a search control on
  the right.
- **`FilterStrip.tsx`** — one horizontally scrolling row: the person segments
  first, then a category chip each. Person stays pinned at the start so the
  control the user reaches for most is never scrolled out of reach.
- **`SearchResults.tsx`** — the date-grouped match list that replaces the board
  while a query is active (D72). Past matches are dimmed rather than hidden; a
  search for something that already happened is a normal reason to search.
- **`CategoryManager.tsx`** — the `ui/Modal` reached from the filter strip
  (D76). Rename in place, reorder, pick a swatch, add, delete. Delete is the
  two-tap confirm of D69 carrying the affected count (D74).
- **`WeekRail.tsx`** — seven date bubbles, a dot where something is on, today
  marked as the cycle calendar marks it. Each bubble is a 44px target.
- **`DayPanel.tsx`** — the shared detail surface (D63): an all-day bar at the top,
  then either the hour timeline or D60's single line. A span event's block is
  proportional to its length; a `moment` renders at a fixed height.
- **`MonthGrid.tsx`** — 7×6 from `monthGridDates`, dots only.
- **`YearHeatmap.tsx`** — `ActivityCalendar` on the new ramp, a square per day.
- **`EventModal.tsx`** — the `ui/Modal`. Title, date, an "all day" switch that
  hides the time boxes, start, end, end date when all-day, category, notes, and
  the countdown tick. Add, edit and delete (D64, D69). Opens read-only with no
  save button when the event's owner is not the signed-in name (D54). The
  category row offers the existing categories plus "None"; it does not offer to
  create one, because a create form inside an event form is a second form the
  user did not ask for and a half-typed event to lose while filling it.

The page therefore carries two rows of chrome above the calendar. That is the
ceiling: anything further gets folded into an existing row or is not added. A
filter bar taller than the thing it filters is its own kind of unusable, which
is the complaint this whole spec started from.

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
- The rail and month dots follow the same fill/outline split, in the accent hue.
- The category dot sits on the event block in the day panel, the search results
  and the countdown card — never on a rail or month dot.

That last line is a restraint, not an oversight. A rail dot is around 6px and its
one channel is already spent on ownership; adding category hue to it would put
two facts in a mark too small to carry one clearly. Category colour appears where
there is room for it to be read, and the category filter answers "show me only
the blue ones" better than a 6px dot ever would.

The eight swatches (D75, D78) are new `--mac-tag-*` tokens sitting with
`--mac-chart-lilac` rather than with the section pastels. They must clear 3:1
against `--mac-white` as non-text marks, and be perceptually separable from each
other — asserted with the CIE deltaE maths in `color.ts`, the same way
`accents.test.ts` guards the section accents. Hue angle is not sufficient and is
not used.

`accents.test.ts` holds its section accents to deltaE 20. Eight marks may not all
clear that at usable lightness. If they cannot, **the swatch count drops to
whatever does clear it — the threshold does not move.** Six distinguishable
colours are a working feature; eight that read as four is a broken one wearing a
passing test.

Both event treatments must be measured against what the text actually sits on
before ship — a tint on the white card, not the token in isolation. Target is 4.5:1 for
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
| `calendarViews.test.ts` | `weekDates` returns Monday-first and holds across a month boundary and across a year boundary; `countsByDate` counts a span on each covered day exactly once; `monthDots` clamps at 3; `applyFilters` removes an event from the counts as well as the list, so no dot survives its event being filtered out. |
| `calendarSearch.test.ts` | A blank or whitespace query returns nothing rather than everything; matching is case-insensitive; notes match as well as titles; an event matching in both places appears once; `groupByDate` orders groups and their contents deterministically. |
| `categories.test.ts` | A blank name is rejected; a name differing only in case from an existing one is rejected; a swatch outside 1–8 is rejected; `affectedCount` counts exactly the events holding that category and none holding `null`. |
| `tagSwatches.test.ts` | Each of the eight `--mac-tag-*` values is pinned to its token in `globals.css`, clears 3:1 against `--mac-white`, and is separated from every other swatch by CIE deltaE. |
| `eventForm.test.ts` | Each validation rule fails on its own case and passes otherwise; `toTiming` produces each of the three shapes from the corresponding draft. |
| `countdownList.test.ts` | A past date is dropped; today is 0 days, never negative; order is soonest first; unticked events never appear. |
| `heatmapTheme.test.ts` | The new ramp's five entries pin to their tokens in `globals.css` (existing file, extended). |

No component rendering, matching the existing suite.

## 9. Out of scope

Repeating events (D65). Reminders and notifications. Dragging an event to a new
time. Attachments. Importing from another calendar. Filtering the year heatmap
by category — it counts filtered events (`applyFilters`), but adds no controls of
its own. Bulk-retagging events. The seven-column week grid (D59) — structured so
it could be added later as a fourth view without disturbing the day panel, but
not built.

Search and categories were in this list in the first draft and were pulled into
scope at the user's request. They are the reason this build is meaningfully
larger than the version first approved: search adds one module and one surface,
while editable categories add a table, a repo, a manager modal, an eight-colour
ramp with its own test, and a delete rule.
