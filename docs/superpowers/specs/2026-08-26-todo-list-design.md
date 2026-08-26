# To-do list — design

**Date:** 2026-08-26
**Status:** Awaiting review
**Setup required:** [2026-08-26-todo-setup.sql](2026-08-26-todo-setup.sql)

## 1. Context

A new section at `/todo`, sitting between Study and Period in the menu. You
type a task, optionally give it a due date and a time, optionally flag it as
important, and the list orders itself by when things are due.

Tasks belong to a person. The list opens on your own and a single button flips
it to your partner's. Adding always creates the task under whoever is signed
in, whichever list is on screen.

This is the sixth mutable feature and the first that is purely a list of rows —
no calendar, no photo, no external service. It is deliberately small.

## 2. Decisions

Recorded with their reasoning, because several were close calls.

**Shared table, tagged by person, one list at a time.** Cycle, Meals and
Calendar are all shared; the timer is not. A to-do list sits between the two —
Rachel should be able to see what Jeff is behind on, but a combined list would
double the length of a morning glance with tasks that are not yours to do. One
table with an `owner` column and a two-way toggle gets both without a combined
view.

**Signing in is a name badge, not a lock.** The app has one shared password and
then a Jeff/Rachel choice held in `localStorage` under `user_name`. Anyone who
taps "Rachel" gets Rachel's list. This is the same trust model Meals already
uses and is acceptable for two people; it is written down so nobody later
mistakes the `owner` column for access control.

**Owner follows the signed-in user, never the view.** Requested explicitly. To
stop a task appearing to vanish, adding while the toggle is on the partner's
list snaps the toggle back to your own so you watch the task land.

**The due date is optional; the time is optional on top of it.** Forcing a date
on every task makes people invent deadlines that mean nothing, so undated tasks
are legal and collect in their own group at the bottom. A time without a date
is meaningless and is rejected by the database, not by hopeful code.

**A passing time makes a task overdue, to the second.** Requested explicitly,
against the alternative of keeping timed tasks in Today and colouring them.
Consequence: the list re-sorts itself while it is on screen. This is not solved
by polling — see §6.

**Priority lifts a task within its due date, not above the whole list.** A flag
is a tie-breaker among tasks sharing a date, so it cannot be used to drag next
month's work to the top of today.

**Ticking hides, it does not delete.** The row is marked done with the time it
was finished. Show completed reveals the last seven days, newest first, and
unticking there returns the task to its group — into Overdue if its date has
since passed. Nothing a tap can do is unrecoverable.

**Seven days of completed history, not all of it.** The rows survive
indefinitely; the view is bounded so the list does not become a thousand-row
archive.

**Instant tick, saved behind.** Ticking is the interaction performed most, and
a visible round-trip on every tap is what makes a to-do list feel slow. The tick
updates the screen immediately and rolls back with a notice if the write fails.
Adds and edits are write-then-update, because they are rarer and already
involve a form.

## 3. Data model

One table. `due_time` is only meaningful alongside a `due_date`, and the check
constraint enforces it.

```
todos
  id            uuid, primary key
  owner         'Jeff' | 'Rachel'
  title         text, non-empty
  due_date      date, nullable
  due_time      time, nullable         -- null unless due_date is set
  priority      boolean, default false
  done          boolean, default false
  completed_at  timestamptz, nullable  -- set exactly when done is true
  created_at    timestamptz
  updated_at    timestamptz
```

The TypeScript shape lives in `src/lib/todo.ts`. A task is either open or done,
and `completedAt` only exists once `done` is true, so the two are modelled as
one union rather than a single interface with a field that is sometimes null
for reasons the type alone cannot explain:

```ts
interface TodoBase {
  id: string;
  owner: UserName;
  title: string;
  dueDate: string | null;   // YYYY-MM-DD
  dueTime: string | null;   // HH:MM, null unless dueDate is set
  priority: boolean;
  createdAt: string;
}

export interface OpenTodo extends TodoBase {
  done: false;
  completedAt: null;
}

export interface DoneTodo extends TodoBase {
  done: true;
  completedAt: string;
}

export type Todo = OpenTodo | DoneTodo;
```

## 4. Grouping and sorting

All of it in `src/lib/todoList.ts` as pure functions taking `today`, `now` and
the rows. No clock is read inside these functions, so the tests can drive them.

Six groups, in this fixed order. A group with nothing in it does not render.

| Group | Rule |
|---|---|
| Overdue | `dueDate` before `today`, or `dueDate` is `today` with a `dueTime` that has passed |
| Today | `dueDate` is `today`, time not yet passed or absent |
| Tomorrow | `dueDate` is the day after `today` |
| This week | `dueDate` up to and including the Sunday of the current week |
| Later | any `dueDate` beyond that |
| No date | `dueDate` is null |

Weeks run Monday to Sunday, matching `weekdayIndex` in `lib/dates.ts`. On a
Sunday, Tomorrow is next week's Monday and This week is empty — Tomorrow is
tested first, so that resolves without a special case.

Sorting inside every group, in order:

1. `dueDate` ascending, nulls last
2. `priority` true before false
3. `dueTime` ascending, nulls last
4. `createdAt` ascending

In No date the first and third keys are constant, so it collapses to flagged
first, then oldest first.

Completed rows are excluded from every group. Show completed renders a separate
list: `done` rows for the selected owner with `completedAt` inside the last
seven days, most recently completed first.

## 5. The screen

`PageShell title="To-do" accent="todo"`, one column, matching Meals and Cycle.

**Owner toggle.** Two segments labelled Jeff and Rachel, the signed-in user
selected on load.

**Composer.** A single row: task text, a date button, a time button that
appears once a date is set, a flag toggle, and an add button. Empty text is
rejected. Submitting clears the text and keeps the date, so several tasks can
be added for the same day in a row.

**Groups.** A heading with a count, then rows.

**Row.** A tick circle at least 44px, the title, and where set a date chip, the
time, and the flag. Overdue rows show their date in `--mt-danger`. Tapping the
row body opens the edit modal; the tick circle does not open it.

**Edit modal.** Reuses `ui/Modal`. Title, date, time, priority, and a delete
button. Editing and deleting were not in the original request, but a list you
cannot correct is a list you stop trusting. Deletion is immediate and is the
one destructive action in the feature.

**Empty state.** When the selected owner has no open tasks, one line saying so,
with the composer above it.

**Not set up yet.** If the table is missing, the board is replaced by a short
message naming the SQL file to run. `/cycle` shows an empty screen in this
situation and gives no clue why.

## 6. Data flow

`src/lib/todoRepo.ts` is the only file that talks to Supabase. Reads return a
union rather than the `T | null` the other repos use, because the board has to
tell "no tasks" apart from "no table":

```ts
type TodoFetch =
  | { status: 'ok'; rows: Todo[] }
  | { status: 'missing-table' }
  | { status: 'error' };
```

`missing-table` is Postgres error `42P01`, surfaced by PostgREST as `PGRST205`.

`TodoBoard.tsx` holds the rows in React state. Adding and editing both reload
the list from the database — an add snaps the owner toggle back and asks for a
fresh fetch rather than splicing the new row in locally, which is what keeps a
task made while the very first load is still in flight from being overwritten
by that load once it lands. Deleting is cheaper: the removed row is just
filtered out of state, no round trip needed to know what is left. Ticking is
the exception to all of it: the row leaves state at once and the write happens
behind it; a failed write puts the row back and shows a notice.

**The overdue wake-up.** After each render the board works out the next
instant worth waking up for and sets a single timeout for it — whichever comes
first of a task in Today crossing into Overdue, or the calendar rolling over to
a new day at local midnight (an installed app can sit open overnight, and
without this the board keeps yesterday's groups until something else forces a
refresh). When the timeout fires, the clock updates, the groups recompute, and
a new wake-up is scheduled for whatever is next. There is no polling — nothing
runs while nothing is due — and the move is accurate to the second, which a
per-second interval would burn a render a second to achieve. The timeout is
cleared when the rows or the clock change and when the board unmounts.

## 7. Palette

The eleventh accent is green `#64B880`.

Ten accents already occupy the pastel band of the colour wheel, and both guards
in `accents.test.ts` bind at once: ΔE ≥ 20 in CIELAB, and ≥ 20° of hue
separation measured by `color.ts`'s `hue()`, which is **HSL hue off RGB, not the
Lab hue angle**. Those two metrics disagree sharply in the greens, and the first
value chosen for this section (`#77E0AA`) was picked against the Lab angle: it
clears ΔE at 21.4 but sits only 18.2° from Countdown on the metric the test
actually uses. It fails. Anything measuring hue for this palette must use
`hueDistance` from `color.ts`.

Searching sRGB against both real guards leaves almost nothing at the palette's
own lightness. Green survives only by going deeper: to clear 20° from Countdown
`#A8DCD1` (hue 167°) and Fitness `#B4D9A0` (hue 99°), the hue must sit near
120–147°, and every pastel there collides with Fitness in ΔE. Lightness is what
buys the separation back.

Measured for `#64B880`: minimum ΔE 21.5 against Fitness, minimum hue separation
27.3° against Countdown, L\* 68.4, contrast 5.41:1 against `--mac-cocoa` for the
icon. It is the deepest accent in the palette — the others run L\* 71.8 to 84.6
— so the row of colour chips is no longer one weight. That cost was accepted to
keep the section green, because green is the tick-mark colour and this is a list
of things to finish.

The alternative that also passes is an olive `#A4AE5C` (ΔE 22.7, hue 26.7°), at
much the same lightness. Green was preferred on meaning.

`accents.test.ts` gains `todo` in the declared list and in `NEW_ACCENTS`, so it
is held to both thresholds rather than grandfathered.

## 8. Navigation

`ALL_LINKS` gains one entry between `/study` and `/cycle`:

```ts
{ href: '/todo', label: 'To-do', icon: ListChecks, accent: 'todo' }
```

`LayoutList` is already Timeline's, so the icon is `ListChecks`.

The home grid is built from `ALL_LINKS`, so a To-do card appears there with no
further change. It carries no count — that would mean a second fetch in
`HubGrid`, which is what the Cycle label costs, for information the section
itself shows.

`/todo` is a leaf route inside `(life)`, so it inherits `data-mood="light"`,
the plain backdrop and `.mt-page-pad`. No nav predicate changes: `isActiveHref`
already handles it.

## 9. Files

New:

```
src/app/(life)/todo/page.tsx
src/components/todo/TodoBoard.tsx      'use client', state and the wake-up
src/components/todo/TodoComposer.tsx
src/components/todo/TodoGroup.tsx
src/components/todo/TodoRow.tsx
src/components/todo/TodoEditModal.tsx
src/lib/todo.ts                        the Todo shape
src/lib/todoList.ts                    grouping, sorting, next-overdue instant
src/lib/todoList.test.ts
src/lib/todoRepo.ts                    Supabase
```

Changed:

```
src/components/nav/navLinks.ts         one entry
src/components/ui/PageShell.tsx        AccentName gains 'todo'
src/app/globals.css                    --mac-accent-todo
src/lib/accents.test.ts                eleven accents, todo held to threshold
src/lib/dates.ts                       gains timeISO, for the clock's now
src/lib/dates.test.ts                  covers timeISO
src/lib/supabase.ts                    gains the todos table's DDL block
```

## 10. Testing

Vitest has no DOM, so everything worth asserting lives in `todoList.ts`.

- A task dated yesterday lands in Overdue; dated today lands in Today.
- A task due today at 14:00 is in Today at 13:59:59 and Overdue at 14:00:01.
- A task due today with no time stays in Today all day.
- Tomorrow beats This week on a Saturday; on a Sunday, Tomorrow holds Monday
  and This week is empty.
- Undated tasks appear only in No date, never in Later.
- Two tasks on the same date sort flagged first.
- A flagged task dated next week does not outrank an unflagged one due today.
- On the same date, an earlier time sorts above a later one, and both above an
  untimed task.
- Ties fall back to creation order.
- Done rows appear in no group.
- The completed view includes a task finished six days ago and excludes one
  finished eight days ago.
- The next-overdue instant is the earliest future time among Today's timed
  tasks, and null when there are none.
- `accents.test.ts` pins `--mac-accent-todo` to `#64B880` and holds it to
  ΔE ≥ 20 and hue ≥ 20 against all ten others — measured at ΔE 21.5 against
  Fitness and 27.3° of hue against Countdown, its two closest neighbours.

Each test is written to fail against the unbuilt behaviour first.

## 11. Setup

`/todo` does not work until the SQL in
[2026-08-26-todo-setup.sql](2026-08-26-todo-setup.sql) is run in the Supabase
SQL editor. This is the same requirement that has left `/cycle` built and
unusable since 2026-08-16, which is why §5 specifies a screen that says so
rather than an empty list.

## 12. Not in this version

Repeating tasks, sub-tasks, notes, attachments, reminders and notifications,
projects or folders, tags, a count on the home card, and any link to the focus
timer. Repeating tasks are the expensive one — they change the data shape and
make completing a task spawn a row — and are their own spec if they are ever
wanted.
