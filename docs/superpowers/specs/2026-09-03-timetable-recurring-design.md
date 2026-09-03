# Timetable and timeline — design

**Date:** 2026-09-03
**Status:** Awaiting review
**Builds on:** [2026-08-16-study-timetable-design.md](2026-08-16-study-timetable-design.md)

## 1. Context

`/study/timetable` today is one thing: two cards, one per person, each holding a
free-text list of what that person is doing **tomorrow**. The menu calls the page
"Timeline"; the page title calls it "Timetable". It has never been both.

This spec makes it both, and settles the name.

The page grows two halves that sit on one screen and **never talk to each other**:

- A **timetable** — a Mon–Sun grid of the classes you have every week. You look at
  it to answer "what am I meant to be doing at this hour". It is fed only by a list
  of recurring events you maintain yourself.
- A **timeline** — the list you already have, unchanged in style and unchanged in
  how you type into it, but covering all seven weekdays instead of only tomorrow.

The two halves share a page and nothing else. A class in the timetable does not
appear in the timeline, and an entry in the timeline does not appear on the grid.

### What this reverses, and what it does not

| Earlier decision | Now |
|---|---|
| **D17** — a timetable is a per-day plan, not a recurring weekly schedule | Reversed **for the grid only**. Recurring events are the grid's entire content. The timeline stays a per-day plan. |
| **D18** — no dates are stored | **Holds.** Nothing in this spec stores a date. Both halves are keyed by weekday. |
| **D20** — the time field is free text | **Holds for the timeline.** The grid needs real times, so rules carry `time` columns; the timeline's free text is untouched. |
| **D21 / D55** — online only | **Holds.** No Dexie, no queue, no offline copy. |
| **D65** — no repeating events in Calendar; weekly routine lives in Timetable | **Holds**, and is now literally true. |

## 2. Decisions

Numbering continues from the assistant spec (which ended at D78).

| # | Decision | Rationale |
|---|---|---|
| **D79** | The timetable and the timeline **do not sync**. They are two independent features that share a page. | User decision, made after a synced design was worked through. Two independent halves cannot corrupt each other, and neither needs to understand the other's time format — which is what made a shared model expensive once the timeline kept free text. |
| **D80** | The grid is a **view, not an editor**. Its blocks come only from recurring events, and you change them by editing the rules, not by dragging the grid. | The grid answers one question — "what do I have at this hour" — and read-only surfaces cannot lose your data. A grid you can edit needs drag targets, drop validation and a touch story at 44px; none of that buys an answer to that question. |
| **D81** | A recurring rule is **one weekday, one time span, and it repeats forever** until deleted. No end date, no weekday set, no every-other-week. | User decision. Gym on Mon/Wed/Fri is three rules, entered once. A weekday array would have to be threaded through the editor, the grouping and every lookup permanently, and it only helps when the time is identical on every day it covers. |
| **D82** | **No per-week cross-out and no override.** A class is there or it is deleted. | User decision, after the grid stopped reflecting the real day. "No Maths this Thursday" is now written in the timeline, which is where you look for what you are actually doing. Removes four columns, a strike-through control, a restore link and a whole edit mode. |
| **D83** | A rule stores a **swatch index 1–8**, not a reference to a category row. | There is nothing to name and nothing to rename, so the calendar's category table, manager modal and rename-is-free machinery would all be paid for and unused. Colour here means whatever you decide it means. |
| **D84** | Two rules that **overlap on the same weekday for the same owner are refused at save**, with the clash named in the message. | You cannot be in two classes at once, so an overlap is a mistake, not a state. This is also what keeps a block's width equal to a column's width — the moment two blocks share a column, a phone column is ~42px and the text is unreadable. Refusing is what makes D85 work. |
| **D85** | Grid columns are **full width at every screen size**; below about 700px the grid scrolls horizontally inside its own container. | Chosen against squeezing seven columns into 375px, which renders every block as two illegible letters. Desktop and iPad show the whole week; the phone trades the week-at-a-glance for readable words. The page body never scrolls sideways — only the grid does. |
| **D86** | The grid shows **one person at a time**, with a Me / Rachel toggle. Rachel's is read-only. | Two stacked grids push the timeline a full screen further down; one grid with both people's blocks is unreadable at any phone width. The toggle costs no vertical space, and the calendar already uses the same owner-filter pattern. |
| **D87** | The **recurring events editor sits below the grid** on the same page, and holds add, edit, delete, and a **Clear all** that removes every rule behind a confirm. | User's described layout. Keeping the list next to the grid it feeds means you can see the effect of a change without navigating. |
| **D88** | The timeline **keeps free-text time**. `"10-letih"`, `"3-8"` and `"after dinner"` stay typeable. | User decision, made against a recommendation to structure it. It is how the page is actually used. The cost is unchanged from D20: the app cannot sort, compare or place these rows — and now also that they can never reach the grid. |
| **D89** | The timeline gains **seven weekday tabs**, Mon–Sun. Still no dates: a tab is "Monday", not "8 September". | User decision. Satisfies the original ask — see yesterday, plan a few days ahead — without introducing a week cursor, navigation arrows, or the question of what happens to a day that scrolls out of range. |
| **D90** | **Selected** and **today** are two different marks: dark fill for the day you are looking at, blue tint for today. Tabs carry **no item count**. | User decision on both. Two marks mean you can plan Thursday without losing track of where you are. The count was offered and refused. |
| **D91** | Each tab shows **your card and Rachel's**, stacked, hers read-only — the arrangement the page has today, now per weekday. | The page's original purpose is seeing each other's plan. Nothing about adding tabs argues for dropping it. |
| **D92** | The timeline has **one Clear button**; pressing it asks **this day** or **the whole week**. | User decision. One entry point means the two cannot be confused at rest; the choice is made in a dialog where both consequences are spelled out, not by picking between two similarly-worded buttons. |
| **D93** | `timetables` is **dropped and recreated** with a `weekday` column and a composite primary key `(user_name, weekday)`. **The two existing rows are lost.** | Fourteen documents instead of two. The existing rows have no weekday to migrate to — they mean "tomorrow", which is not a weekday the app can name — so they are discarded rather than guessed at. Recreating rather than altering keeps it one readable statement for a table holding two rows. Cost: two lists of free text are lost, and are retyped in under a minute. |
| **D94** | The page and its menu entry are **both called Timetable**. | The two-name split predates this work and has no defender. "Timetable" is the half you land on first and the half that gives the page its shape. |
| **D95** | Modules and components split by half: **timetable** = grid and rules, **timeline** = tabs, panes and the entry editor. `lib/timetable.ts` is renamed `lib/timeline.ts`; `components/timetable/*` moves to `components/timeline/*` and the new grid work takes the vacated name. | Without the rename, `TimetableEditor` would be the component that edits the *timeline*, and `lib/timetable.ts` would hold the *timeline's* types. Two independent features (D79) must not share a word. |
| **D96** | A rule **cannot cross midnight** (`end_time > start_time`, enforced in the database). | A class that runs into the next day is not a thing, and allowing it would make every grid row-span calculation ask "does this wrap". Accepted limit: a genuine 22:00–02:00 commitment goes in the timeline, which has no such rule. |

## 3. Data model

### Supabase

Jeff runs this himself; the app never creates tables. The full statement is in
[2026-09-03-timetable-setup.sql](2026-09-03-timetable-setup.sql) and is also
appended to the schema comment in `src/lib/supabase.ts`, matching how
`focus_sessions` and `timetables` are already documented.

```sql
create table timetable_rules (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null,
  weekday    smallint not null check (weekday between 0 and 6),
  title      text not null,
  start_time time not null,
  end_time   time not null,
  swatch     smallint not null check (swatch between 1 and 8),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
```

`weekday` is **0 = Monday**, matching `weekdayIndex` in `lib/dates.ts`, which the
calendar already uses to find the Monday of a week. Using a different origin here
would put two weekday conventions in one codebase.

Row-per-rule, not a JSON array — the opposite of D22's choice for `timetables`, and
for the opposite reason: a rule has an identity that survives editing, deleting one
rule should not rewrite the others, and the grid reads them as a set rather than as
an ordered document.

The timeline's table is replaced:

```sql
drop table timetables;

create table timetables (
  user_name  text not null,
  weekday    smallint not null check (weekday between 0 and 6),
  entries    jsonb not null default '[]' check (jsonb_typeof(entries) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (user_name, weekday)
);
```

`entries` keeps its shape exactly — `[{ "time": "10-letih", "activity": "..." }]` —
so `normalizeEntries` and the editor's save path are unchanged. Only the key grows.
Fourteen rows exist at most, ever.

Both tables keep the open `anon` policies the rest of the app uses. Ownership stays
a UI convention, not a security boundary (**D23**, unchanged): with the anon key in
the client bundle and no Supabase auth, both people are the same Postgres role.

### Client types

There is **no new weekday module**. `lib/dates.ts` already exports `WEEKDAYS_SHORT`
(`Mon` … `Sun`) and `weekdayIndex`, which is `(getUTCDay() + 6) % 7` — Monday is
already 0 there. A second list of weekday names is exactly the kind of duplicate
D66 was written to prevent. `dates.ts` gains two things and nothing else:

```ts
// lib/dates.ts — additions
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;
export function todayWeekday(now?: Date): Weekday;
```

```ts
// lib/timetableRule.ts
export interface TimetableRule {
  id: string;
  owner: UserName;
  weekday: Weekday;
  title: string;
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  swatch: SwatchIndex;
}

export interface RuleDraft {
  weekday: Weekday;
  title: string;
  startTime: string;
  endTime: string;
  swatch: SwatchIndex;
}

export type RuleError =
  | { kind: 'titleRequired' }
  | { kind: 'endNotAfterStart' }
  | { kind: 'overlaps'; with: string };   // the clashing rule's title
```

`RuleError` is a union carrying the clashing title rather than a bare string code,
because D84's message has to name what it clashed with — "Maths is already at
09:00–11:00 on Thursday" is actionable and "times overlap" is not.

```ts
// lib/timeline.ts   (was lib/timetable.ts, D95)
export interface TimelineEntry { time: string; activity: string }
export function normalizeEntries(entries: TimelineEntry[]): TimelineEntry[];
```

## 4. The page

One route, `/study/timetable`, titled **Timetable**. Top to bottom:

1. **Owner toggle** — Me / Rachel. Governs the grid and the recurring list only;
   the timeline below always shows both people, per D91.
2. **The grid** — Mon–Sun columns, one row per hour. Today's column is tinted.
   Blocks are the swatch colour, filled, with the title and the time. Full-width
   columns; below ~700px the grid itself scrolls sideways (D85).
3. **Recurring events** — the rules as a list: swatch, weekday, time span, title,
   and a delete. An **Add recurring event** button, and **Clear all** behind a
   confirm (D87).
4. **The timeline** — seven weekday tabs (D89, D90), then your card and Rachel's
   for the selected day (D91). Your card carries the **Edit** button and behaves
   exactly as it does today: inline editor, rows of free text, Cancel restores,
   only Save commits, and a failed save keeps your typing (**D26**, unchanged).
   A **Clear** button asks this day or the whole week (D92).

Rachel's half of the grid and her card are rendered without any edit affordance at
all, not with a disabled one — **D29**, unchanged.

### States

The grid and the rules list share the four states the panes already use (**D25**):
loading, error, empty, loaded. An empty grid and a grid that failed to load must not
look alike; "no classes yet" is a different sentence from "couldn't load".

The timeline keeps its own four states per pane, unchanged.

## 5. Modules

New, in `lib/`:

| Module | Holds |
|---|---|
| `timetableRule.ts` | The rule type, `validateRule` (title, ordering, overlap), `sortRules`. |
| `timetableGrid.ts` | `gridHours(rules)` → the hour range to draw; `rulesByWeekday(rules)` → seven ordered lists; `rowSpanOf(rule, from)` → grid row start and end. |
| `timetableRepo.ts` | Supabase reads and writes for `timetable_rules`. |

`lib/dates.ts` grows `Weekday`, `WEEKDAYS` and `todayWeekday` (see §3).

Renamed, per D95:

| From | To |
|---|---|
| `lib/timetable.ts` | `lib/timeline.ts` |
| `lib/timetable.test.ts` | `lib/timeline.test.ts` |
| `components/timetable/TimetableBoard.tsx` | `components/timeline/TimelineBoard.tsx` |
| `components/timetable/TimetablePane.tsx` | `components/timeline/TimelinePane.tsx` |
| `components/timetable/TimetableEditor.tsx` | `components/timeline/TimelineEditor.tsx` |

New components, in `components/timetable/`:

- `TimetableBoard.tsx` — fetches rules, owns the owner toggle, renders the grid and
  the rules list.
- `TimetableGrid.tsx` — the grid itself. Presentational; takes resolved blocks.
- `RecurringList.tsx` — the rules as rows, with delete and Clear all.
- `RuleModal.tsx` — add and edit one rule: weekday, start, end, title, swatch.

New in `components/timeline/`:

- `DayTabs.tsx` — the seven buttons. Presentational; takes selected and today.

`TimelineBoard` grows one piece of state (the selected weekday, defaulting to
today) and fetches fourteen rows instead of two. Nothing else about it changes.

Placing the grid maths in `lib/` rather than inside the component is not stylistic:
Vitest here runs with no DOM environment and no component rendering, so anything
that lives in a `.tsx` file cannot be asserted at all.

### Two hazards in the move

**`components/timetable/TimetableBoard.tsx` is both moved away and recreated.** Its
old content goes to `components/timeline/TimelineBoard.tsx`, and a new, unrelated
component takes the vacated path. Do the move first and commit it, then write the
new file — otherwise the rename is invisible in the diff and the two components'
histories get welded together.

**Stop the dev server before moving anything.** File moves fail with "permission
denied" while it is running, and after moving routes, `.next/` has to be deleted or
`tsc` keeps reporting the old paths. The route file itself (`src/app/study/timetable/page.tsx`)
is edited rather than moved, so this only bites the component and lib renames.

## 6. Testing

Vitest, pure functions, tests beside their source.

| File | Covers |
|---|---|
| `dates.test.ts` | Extended: `todayWeekday` maps a Sunday `Date` to 6 and a Monday to 0 — the one place JavaScript's own convention disagrees with ours. `WEEKDAYS` and the existing `WEEKDAYS_SHORT` agree in length and order. |
| `timetableRule.test.ts` | Empty and whitespace titles rejected; `end === start` rejected as well as `end < start`; overlap detected for partial overlap, containment, and identical spans; **no** overlap reported for rules that merely touch (`10:00–11:00` and `11:00–12:00`), for the same span on a different weekday, or for the same span belonging to the other owner. The `overlaps` error names the clashing rule. |
| `timetableGrid.test.ts` | `gridHours` spans the earliest start to the latest end; a single short rule still yields a readable minimum range; an empty rule set yields the default range rather than an empty grid. `rulesByWeekday` returns exactly seven lists, each sorted by start time, with empty days preserved as empty lists rather than dropped. `rowSpanOf` places an 09:00–11:00 rule across the right rows given a grid starting at 08:00. |
| `timeline.test.ts` | `normalizeEntries` — moved, unchanged, still passing. |
| `tagSwatches.test.ts` | Extended: each `--mac-tag-*` used as a filled block behind white text meets 4.5:1. Today it only checks the swatches as marks at 3:1, which is the wrong target once a swatch becomes a background carrying words. |

The contrast addition was the one that could have forced a design change, so it was
measured before this spec was finished. White on the eight swatches ranges from
**5.06:1** (tag-3, `#4F7A2A`) to **7.88:1** (tag-6, `#5B3FA0`) — every one clears
4.5:1 with room to spare. No tinted-block fallback is needed. The test exists to
keep it that way when a swatch is next retuned, in the same spirit as
`heatmapTheme.test.ts` pinning chart literals to their tokens.

Per the project's rule, any bug fixed later gets a test that fails against the bug
first.

## 7. Considered and rejected

**Putting recurring events in `calendar_events`.** Offered first, rejected by the
user in favour of a separate store. The cost is written down rather than implied:
there are now two event systems, a class in the timetable will never appear in the
calendar, and every later feature has to ask which one a thing belongs in.

**Making the two halves share one data model.** Worked through in full — the grid
and the list would have been the same rows drawn twice, and "sync" would have cost
nothing to build. Rejected by the user (D79). It stopped being cheap the moment the
timeline kept free-text time (D88), because a row reading `"10-letih"` has no
position on a grid.

**Storing dates.** A dated week brings arrows, a cursor, a range, an expiry rule
for old rows, and the question of whether a past week is a record or a projection —
all of it for a page whose whole content is "what do I do on a Thursday".
Weekday-keyed data has none of those questions.

**Pre-generating rule occurrences as rows.** Only relevant to a dated model. Noted
because it is the obvious first instinct and it is wrong here twice over.

**A second category table for the timetable.** Two lists of category names meaning
almost the same thing, two manager modals, and a rename sweep. D83 instead.

**Day tabs with an item count, and a per-day "1 hour free" label.** Both drawn,
both refused by the user. Recorded so they are not re-proposed.
