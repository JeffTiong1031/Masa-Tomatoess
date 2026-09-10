# Home page: calendar card and rotating banner

Date: 2026-09-11
Route touched: `/` (the hub inside the `(life)` route group)
Superdesign draft chosen: "Clean panel" variant B —
`https://p.superdesign.dev/draft/a8aed242-64e8-491b-8f38-24dda738b444`

## Why

The hub greets you and then shows two numbers. It never answers the first
question of the day: what is happening today. It also spends half of that row
on a streak, which is a number you glance at, not one you act on.

This replaces the streak tile with a calendar card that answers the day, and
turns the streak into one card inside a small banner that also carries the
period countdown and any dates you starred.

## What the page becomes

Top to bottom, inside the existing `max-w-3xl` column:

1. Greeting block — unchanged.
2. Calendar card — new, full width.
3. A row of two: the Today focus-minutes tile, and the rotating banner.
   Side by side from `sm` up, stacked on phones with Today first.
4. The section card grid — unchanged.

The Streak tile is removed from the page.

### Calendar card

Two columns from `sm` up, stacked below that. It is a `.mt-soft` panel and
carries `--mt-accent: var(--mac-accent-calendar)`.

Left column:

- Weekday name, `text-2xl font-semibold tracking-tight`, cocoa.
- Full date under it, `text-sm`, muted.
- A hairline divider.
- Up to four agenda rows. Each row is a chip plus a title:
  - calendar event with a time: chip reads the start time (`9:00`)
  - calendar event with no time: chip reads `all day`
  - to-do: chip reads `to-do`
  - overdue to-do: chip reads `Late`, tinted with the danger wash, and the
    row carries a danger dot
- If more than four items exist, a muted `+N more` row. Where it goes depends
  on what is hidden: if every hidden item is a to-do it opens `/timetable/todo`,
  otherwise it opens `/calendar`. The decision is made in `buildAgenda` and
  returned with the list, not worked out again in the component.
- If nothing exists for today: a single muted line, `Nothing today.`

Right column:

- Month grid for the month containing today, built from the existing
  `monthGridDates(month)` in `dates.ts`: 42 cells, seven columns, Monday
  first, single-letter muted weekday headers. Days from the neighbouring
  months fill the corners and render at 0.35 opacity, exactly as
  `calendar/MonthGrid.tsx` already does.
- Every cell links to `/calendar?date=<the date>`, minimum 44px hit area.
- Today renders as a filled `--mt-accent` rounded-full pill with cocoa text.
- A day that has at least one of your events or to-dos gets a 3px accent dot
  under its number.

### Rotating banner

A `.mt-soft` panel showing one card at a time.

Card order, fixed:

1. Period — `Period in 4 days` (whatever `hubCycleLabel` returns) goes to `/cycle`
2. Streak — `6 day streak` goes to `/study/dashboard`
3. Starred countdown events and starred count-up entries, merged and sorted by
   date ascending, go to `/countdown`

Behaviour:

- Advances every 5000ms and wraps from the last card to the first.
- `<` and `>` buttons at the left and right edges, 44px each, wrapping in both
  directions. Pressing either restarts the auto-advance timer with a 10000ms
  delay so the card does not move out from under you while you read it.
- Dots under the text, one per card, current one filled.
- The whole card body is the link. The chevrons are buttons and must not
  trigger the link.
- Under `prefers-reduced-motion: reduce`, auto-advance does not run and there
  is no slide transition. The chevrons still work.
- The banner is never empty: period and streak are always present.

## Data

All of it is already fetched somewhere in the app; the hub now needs it too.

| Piece | Source | Note |
|---|---|---|
| Today's events | `fetchEvents()` in `calendarRepo.ts` | filter to the signed-in owner client-side; `fetchEvents` returns everyone's |
| Today's to-dos | `fetchTodos(owner)` in `todoRepo.ts` | returns `TodoFetch`; `missing-table` and `error` both degrade to an empty list |
| Overdue to-dos | same fetch | `dueDate < today` and `done === false` |
| Period label | `fetchPeriods()` plus `summarizeCycle` plus `hubCycleLabel` | already wired in `HubGrid` |
| Streak | `computeHubStats` over Dexie sessions | already wired in `HubGrid` |
| Starred dates | new `pinned` column, see below | |

Owner comes from `localStorage.getItem('user_name')` behind `useHasMounted`,
the same guard `HubGrid` already uses. Only that person's events and to-dos
appear. Rachel's do not.

One fetch feeds two things. The dot set is the visible month's events and
to-dos. The agenda list is today's events, today's open to-dos, and every open
to-do whose due date is before today.

### Database change

Jeff runs this once in the Supabase SQL editor. The app does not migrate.

```sql
alter table calendar_events  add column pinned boolean not null default false;
alter table count_up_entries add column pinned boolean not null default false;
```

The same statements are saved to
`docs/superpowers/specs/2026-09-11-home-banner-setup.sql`.

The `pinned` flag stays out of `CalendarEvent`, `EventInput` and
`CountUpEntry`. Adding a field to `CalendarEvent` would force every literal
that builds one — event form, assistant, countdown writer, their tests — to
grow a field none of them care about, and adding it to `toColumns` would make
every ordinary edit write the star back.

Instead each repo gains two narrow functions that touch only that column:

- `calendarRepo.ts`: `fetchPinnedEventIds(owner)` returning `Set<string>`, and
  `setEventPinned(id, pinned)`
- `countUpRepo.ts`: `fetchPinnedCountUpIds(owner)` returning `Set<string>`, and
  `setCountUpPinned(id, owner, pinned)`

Components hold the pinned ids as a set beside the rows they already have.

If the column is missing, the select fails the way a missing table does today:
the banner falls back to period plus streak, the failure is logged, and the
rest of the page still renders.

## New modules

Vitest here runs pure functions with no DOM, so everything worth asserting
lives in `lib/`.

| File | Exports | Job |
|---|---|---|
| `src/lib/todayAgenda.ts` | `AgendaItem`, `Agenda`, `buildAgenda(events, todos, today, limit)` | merge, classify, sort, truncate; returns the shown rows, the hidden count, and the href that `+N more` should open |
| `src/lib/monthGrid.ts` | `MonthCell`, `buildMonthGrid(today, busyDates)` | leading blanks, day numbers, `isToday`, `hasItems` |
| `src/lib/bannerCards.ts` | `BannerCard`, `buildBannerCards(cycle, streak, pinnedEvents, pinnedCountUps, today)` | ordered cards with label, value, accent and href |
| `src/lib/carousel.ts` | `nextIndex(i, len)`, `prevIndex(i, len)` | wrap-around maths, testable without a browser |

`AgendaItem` is a discriminated union on `kind: 'event' | 'todo'`, not an
optional-field bag, so the row renderer never has to ask what shape it got.

Sort order inside `buildAgenda`:

1. events, timed ones by start time ascending, all-day ones after them
2. to-dos, overdue first, then today's by due time, then to-dos with no time

## The calendar page has to learn a date

`CalendarBoard` keeps the selected date in its own state and never reads the
URL, so `/calendar?date=2026-09-14` currently lands on today. It gains a first
-load read of `useSearchParams().get('date')`, used as the initial selected
date and initial month when the value is a real `YYYY-MM-DD`, and ignored
otherwise. Later navigation inside the board is unaffected.

`useSearchParams` client-side renders everything up to the nearest Suspense
boundary during prerender, so `src/app/(life)/calendar/page.tsx` wraps
`<CalendarBoard />` in `<Suspense>` with a small fallback card.

## New components

| File | Notes |
|---|---|
| `src/components/home/TodayCalendarCard.tsx` | client; takes already-fetched data as props, does no fetching |
| `src/components/home/RotatingBanner.tsx` | client; owns the interval and the index; takes `BannerCard[]` |

`HubGrid.tsx` keeps the fetching, drops the Streak `StatTile`, and renders the
two new components. Keeping the fetch in `HubGrid` and the data in props keeps
both new components small enough to reason about.

## Starring on /countdown

Each countdown row and each count-up row gains a star button, 44px, at the
right of the row. Filled star means it is in the banner. It writes `pinned`
through the repo and re-reads the list on success, the way the board already
handles add and delete.

Nothing is starred at the start; `pinned` defaults to false.

## Contrast

Measured with the same maths `lib/color.ts` uses:

| Pair | Ratio | Target |
|---|---|---|
| cocoa `#3B2E2A` on calendar pink `#FFB5F4` (today pill) | 8.18:1 | 4.5 |
| cocoa on white (row titles) | 13.04:1 | 4.5 |
| muted `#796763` on white (`+N more`, date line) | 5.34:1 | 4.5 |
| danger `#C1473A` on white (Late chip text) | 4.96:1 | 4.5 |

Tinted chips sit on white inside the card, and each tint is the accent at low
alpha behind cocoa text, so the compounding that shipped the rank badges at
4.35:1 does not apply here. The Late chip pair is pinned in a test rather than
eyeballed.

## Tests

New `*.test.ts` beside each new lib file:

- `todayAgenda.test.ts` — a timed event sorts before an all-day one; an
  overdue to-do sorts above a to-do due today; a done to-do due today is
  excluded; five items yield four rows and a hidden count of one; no items
  yields an empty list and a hidden count of zero; hidden items that are all
  to-dos give `/timetable/todo` as the more-href, and a hidden mix or a hidden
  event gives `/calendar`
- `monthGrid.test.ts` — a month starting on Sunday produces six leading
  blanks; the today cell is flagged exactly once; a date in `busyDates` sets
  `hasItems` and one absent from it does not
- `bannerCards.test.ts` — period first, streak second, starred by date after;
  starred count-ups and starred events interleave by date; an empty starred
  list still yields two cards
- `carousel.test.ts` — next wraps last to first, prev wraps first to last, a
  single-card list stays on index 0
- an addition to the palette tests pinning the today-pill pair and the Late
  chip pair above 4.5:1

Each test is written so it fails against the missing implementation first.

## Out of scope

- Rachel's events and to-dos on Jeff's hub
- Timetable classes in the agenda list
- Changes to `/calendar`, `/todo` or the cycle pages themselves
- A dark mood for any of this; every route still renders `data-mood="light"`

## Acceptance

- The hub shows today's weekday, date, month grid and merged agenda.
- Pressing a day number lands on `/calendar` for that date.
- The banner cycles every 5s, wraps, waits 10s after a chevron press, and each
  card lands on the right route.
- Starring a date on `/countdown` makes it appear in the banner after a
  reload, including on another device signed in as the same person.
- `npm test`, `npm run lint` and `npx tsc --noEmit` all pass.
