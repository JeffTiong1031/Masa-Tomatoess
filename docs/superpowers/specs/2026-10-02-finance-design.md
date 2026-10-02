# Finance — design

**Date:** 2026-10-02
**Status:** Awaiting review
**Setup required:** [2026-10-02-finance-setup.sql](2026-10-02-finance-setup.sql)

## 1. Context

`/finance` today is a styled preview: every figure on it is invented and
marked with a "sample" chip. This replaces it with a working personal
expense tracker.

Each person keeps their own money. Jeff never sees Rachel's categories,
entries, templates or budget, and the other way around. There is no toggle
to the partner's view — unlike To-do, there is nothing here to peek at.

Three things on the page, top to bottom:

1. **A budget bar** for the budget period you are in right now.
2. **A month picker** to move back through past months.
3. **Daily | Summary** — that month's entries, either listed by day or
   added up by category.

And one thing that floats above them: a **"+" button** that opens a sheet
for adding an entry in a few taps.

The brainstorm decisions are recorded in the request and are not re-argued
here. This document says how they are built, and lists under §12 the few
places where a decision still left a gap.

## 2. Storage: straight to Supabase, no local copy

The two patterns in the repo are:

- **Direct.** The page reads from and writes to Supabase, and keeps what it
  read in memory. Count Up, To-do, Calendar and Period work this way.
- **Local-first.** Rows are written to the browser's own database (Dexie,
  on top of IndexedDB) and copied up to Supabase later. The focus timer and
  Notes work this way.

Finance is **direct**, following To-do and Count Up — the closest rooms in
shape: a list of one person's rows, each tagged with an owner, edited in
small forms.

The deciding reason is the Saving entry. It must be created exactly once
per budget period, even when the app was closed for weeks and is then
opened on two devices at once. With a direct design the database is the
single referee: a uniqueness rule on (owner, period) means the second
device's attempt is silently ignored. With a local-first design each
device has its own copy, each would believe it was first, and both would
upload a Saving entry — the exact duplicate the brief forbids. Undoing
that safely needs merge logic that Notes needed and Finance should not.

The cost is that adding an entry needs a connection. If a save fails, the
sheet keeps what you typed and says it could not save; nothing is lost from
the screen, and you press Save again once you are back online. The timer
was made local-first because a focus session must survive a dropped
connection mid-run. An expense typed into a sheet does not have that
problem.

No change to `src/db/db.ts`.

## 3. Money

- Stored as whole **sen**: RM 12.00 is `1200`. Never a decimal, so adding a
  hundred entries never drifts by a sen.
- Shown as `RM 12.00`, with thousands commas: `RM 1,234.50`.
- A negative amount (only a Saving entry after overspending can be one)
  shows as `−RM 40.50`, with a true minus sign.
- One pure function turns sen into text, and one turns what you typed on the
  keypad into sen. Both are tested; nothing else formats money.

## 4. Data model

Four tables, all keyed by `owner` with the
`owner text check (owner in ('Jeff','Rachel'))` pattern from
`count_up_entries`. Full SQL, indexes and access policies are in
[2026-10-02-finance-setup.sql](2026-10-02-finance-setup.sql).

### finance_categories

```
id, owner
kind         'expense' | 'income'
name         non-empty
system       'saving' or empty
archived_at  empty while live; set when "deleted"
```

- Two live categories of the same kind cannot share a name (ignoring case
  and spaces). An archived "Food" does not block a new "Food".
- **Saving** is the one row with `system = 'saving'`. The database itself
  insists it is an income category, is named exactly "Saving", and is never
  archived — so even a bug cannot rename or hide it. At most one per person.
- The page creates Saving the first time a person opens Finance. If it
  already exists the attempt does nothing, so this is safe to run on every
  load.

### finance_entries

```
id, owner
kind          'expense' | 'income'
amount_sen    whole number
category_id   must be this owner's category of the same kind
date          the day it happened
note          optional
period_start  empty for entries you type; for a Saving entry, the first
              day of the budget period it closes
```

- The database checks that an entry's category belongs to the same person
  and is the same kind (an expense cannot point at an income category).
- Entries you type must be above zero. Only Saving entries may be zero or
  negative.
- **One Saving entry per person per period** is a uniqueness rule in the
  database, on `(owner, period_start)`. This is what makes the end-of-period
  step safe to repeat.

### finance_templates

```
id, owner, kind
label         e.g. "Lunch"; becomes the new entry's note
amount_sen    above zero
category_id   same rule as entries
```

### finance_budgets

One row per person, created the first time they set a budget.

```
owner            primary key
amount_sen       above zero
period           'week' | 'month'
anchor           the first day of the first period of this type
next_period      a pending Week/Month switch, or empty
next_from        the day that switch takes over
next_amount_sen  the amount that comes with the switch (see §12, Q1)
```

The three `next_*` columns are all filled or all empty, and a "switch"
to the type you already have is refused.

### In TypeScript

Shapes live in `src/lib/finance.ts`. Rows from Supabase are turned into
these by the repo, so components never see column names.

```ts
type EntryKind = 'expense' | 'income';
type BudgetPeriodKind = 'week' | 'month';

interface Category {
  id: string;
  kind: EntryKind;
  name: string;
  system: 'saving' | null;
  archived: boolean;
}

interface Entry {
  id: string;
  kind: EntryKind;
  amountSen: number;
  categoryId: string;
  date: string;
  note: string | null;
  periodStart: string | null;
}

interface Template {
  id: string;
  kind: EntryKind;
  label: string;
  amountSen: number;
  categoryId: string;
}

interface BudgetPlan {
  amountSen: number;
  period: BudgetPeriodKind;
  anchor: string;
  next: { period: BudgetPeriodKind; from: string; amountSen: number } | null;
}

interface BudgetPeriod {
  start: string;
  end: string;
  amountSen: number;
}
```

## 5. Budget logic

All of this is pure functions in `src/lib/financeBudget.ts`. None of them
read the clock; `today` is passed in, so tests can stand on any date.

### Periods

- **Week.** 7-day blocks from the anchor. Anchor Fri 2 Oct → Fri 2–Thu 8,
  Fri 9–Thu 15, and so on.
- **Month.** Each period starts on the anchor's day of the month. If that
  month is too short, it starts on the month's last day instead. The day is
  always taken from the **original anchor**, so a short month does not drag
  every later month down with it. Anchor 31 Jan 2027:

  | Period starts | Period ends |
  |---|---|
  | 31 Jan | 27 Feb |
  | 28 Feb (clamped) | 30 Mar |
  | 31 Mar (back to 31) | 29 Apr |
  | 30 Apr (clamped) | 30 May |

  A period always ends the day before the next one starts.

`periodContaining(plan, date)` returns the period a date falls in.
If a switch is pending and the date is on or after `next.from`, it uses the
new type anchored at `next.from`; otherwise the current type at `anchor`.

### The bar

`budgetBar(plan, entries, today)` returns:

- **spent**: all expenses dated inside the current period, every category,
  fixed bills included. Income never counts, Saving included.
- **left** = amount − spent.
- **days left** = days from today to the period's end, counting today.
  On the last day it is 1.
- **per day** = left ÷ days left, rounded down to the sen, so following it
  never quite overshoots.
- **tone**:
  - `calm` when more than 25% of the budget is left
  - `warning` at 25% or less (including exactly RM 0.00 left)
  - `over` once spent is more than the budget
- **pending switch note**, e.g. "Monthly budget starts Fri 16 Oct".

The text reads `RM 415.00 left · 7 days left · ~RM 59.28/day`, or
`RM 40.50 over` when over.

### Changing the amount

The new amount replaces `amount_sen` straight away. The bar is worked out
from the plan every time, so it changes at once, and the current period's
Saving — not yet written — will use it. Past Saving entries are rows that
already exist, so nothing touches them.

**Before any budget change is saved, the page first closes any ended
periods** (next section). That guarantees a period which ended under the
old amount is settled under the old amount, even if the page had been left
open across midnight. If closing fails (offline), the change is not saved
and the sheet says so.

### Switching Week ↔ Month

The switch is stored as pending, starting the day after the current period
ends:

- `next.from` = current period's end + 1
- `next.period` = the new type
- `next.amountSen` = see §12, Q1

Switching back to the type you already have before it takes effect clears
the pending switch.

Once today reaches `next.from`, and every period of the old type has its
Saving entry, the plan is folded: `period`, `anchor` and `amount` take the
`next` values and `next` is cleared. Until then the periods before the
switch are still worked out from the old anchor, so a switch made weeks ago
in an app that has been closed since still lands on the right days.

### End of period: the Saving entry

`missingSavings(plan, savingStarts, entries, today)` lists every period
that:

- started on or after the plan's anchor,
- ended before today, and
- has no Saving entry yet (by `period_start`).

For each it returns one income entry in Saving:

- amount = that period's budget − what was spent in it (negative if over)
- dated the period's last day
- `period_start` = the period's first day

The page runs this:

1. when Finance loads,
2. when the date changes while the page is open (the same midnight timer
   Countdown uses), and
3. just before any budget change is saved.

All missing entries are sent in one request that tells the database to
skip any period it already has. So a second device, a double tap, or a
reload half-way through can never produce a duplicate. Weeks missed while
the app was closed all appear on the next visit, each dated its own last
day.

A period that ends exactly on budget gets a RM 0.00 Saving entry (§12, Q3).

## 6. Worked example

Weekly budget of **RM 500**, set on **Fri 2 Oct 2026**. That day becomes
the anchor, so the first period is **Fri 2 – Thu 8 Oct**.

| When | Spent so far this period | Bar shows | Fill |
|---|---|---|---|
| Fri 2, after RM 85.00 groceries | RM 85.00 | RM 415.00 left · 7 days left · ~RM 59.28/day | calm (83% left) |
| Sat 3, dinner RM 120.00 | RM 205.00 | RM 295.00 left · 6 days left · ~RM 49.16/day | calm |
| Sun 4, RM 45.50 | RM 250.50 | RM 249.50 left · 5 days left · ~RM 49.90/day | calm |
| Mon 5, phone bill RM 180.00 | RM 430.50 | RM 69.50 left · 4 days left · ~RM 17.37/day | warning (13.9% left) |
| **Tue 6**, before the change | RM 430.50 | RM 69.50 left · 3 days left · ~RM 23.16/day | warning |
| **Tue 6, raised to RM 600** | RM 430.50 | RM 169.50 left · 3 days left · ~RM 56.50/day | calm (28.25% left) |
| Wed 7, car service RM 210.00 | RM 640.50 | RM 40.50 over | over |
| Thu 8, nothing | RM 640.50 | RM 40.50 over | over |

On **Fri 9 Oct**, opening Finance:

- The period Fri 2 – Thu 8 has ended and has no Saving entry, so one is
  created: **−RM 40.50**, income, Saving, dated **Thu 8 Oct**. It uses
  RM 600, the amount in force when the period closed, not the RM 500 it
  started with.
- The bar starts fresh for Fri 9 – Thu 15: **RM 600.00 left · 7 days left
  · ~RM 85.71/day**. The RM 40.50 overspend does not carry over.
- Opening Finance again on Fri 9 creates nothing more.

If instead nothing is opened until **Mon 19 Oct**, and nothing was spent
Fri 9 – Thu 15, that visit creates both missing entries at once:
**−RM 40.50** dated Thu 8 Oct and **RM 600.00** dated Thu 15 Oct.

**A switch, continuing the same story.** On Wed 14 Oct Jeff switches to
Monthly. The week he is in (Fri 9 – Thu 15) carries on as a weekly RM 600
period, and the bar shows "Monthly budget starts Fri 16 Oct" underneath.
From Fri 16 Oct periods run 16th to 15th: 16 Oct – 15 Nov,
16 Nov – 15 Dec, 16 Dec – 15 Jan 2027.

## 7. Entries

### The add sheet

Opened by the floating "+" (bottom-right, 56px, above the safe area, never
covering the last row of the list — the page gets matching bottom padding).
It is `ui/Modal` in its `sheet` form, so on a phone it rises from the
bottom.

Top to bottom:

1. **Expense | Income** — two segments, Expense selected.
2. **Amount**, large, with an in-sheet keypad (1–9, ., 0, ⌫) that is active
   the moment the sheet opens. Typing on a hardware keyboard also works. At
   most two digits after the point; anything else is ignored by the keypad.
   An in-sheet keypad rather than the phone's own keyboard, because the
   phone's keyboard covers the category chips you need next.
3. **Quick templates** — a row of chips like `Lunch · RM 12 · Food`. One tap
   adds that entry at once (on the date chosen below), and shows "Saved ✓".
4. **Category chips** for the chosen kind, most-used first (by number of
   entries ever made in each; ties alphabetical). Archived categories and
   Saving are not offered. A last chip, "+ New", creates a category inline.
5. **Date**: Today (selected) · Yesterday · Pick date.
6. **Note**, optional, one line.
7. **Save**, and a small "Save as template" link that is live once there is
   an amount, a category and a note to use as the label.

Save is enabled once there is an amount above zero and a category. After a
successful save the sheet stays open, shows **"Saved ✓"** for a moment,
clears the amount and note, and keeps the kind, category and date — so a
run of receipts from the same day goes in quickly.

Templates are deleted from the same row: a small "Edit" toggle puts an ×
on each chip.

### Editing

Tapping an entry in the Daily list opens the same sheet, filled in, with
**Save** and **Delete**. In edit mode Save closes the sheet. Templates and
"Save as template" are hidden while editing.

### Swipe to delete, with Undo

Swiping a row left past a third of its width deletes it; a shorter swipe
springs back. The row leaves the list, and a bar at the bottom says
"Deleted · Undo" for 5 seconds.

The delete is sent to the database straight away. **Undo puts the same
entry back** — same id, same fields — rather than holding the delete
back for 5 seconds. That way leaving the page during those 5 seconds can
never leave a delete half-done.

Swiping is built with plain pointer events, no new library. The threshold
decision is a pure function so it can be tested. Swiping is not the only
way: Delete in the edit sheet does the same thing, for anyone who does not
swipe.

## 8. Categories and budget setup

### First visit

With no categories of your own and no budget, the page shows one card:
"Start by adding a few categories and setting a budget", with two buttons:
**Add categories** and **Set budget**. The "+" button still works; the
add sheet's "+ New" chip covers the first category.

### Managing categories

A **Categories** button (top of the page, next to the budget) opens a
sheet with two lists, Expense and Income:

- **Add** — name and kind.
- **Rename** — tap the name.
- **Delete** — asks first (`ui/ConfirmDialog`), then archives. The category
  leaves the add sheet; old entries keep it and still show it everywhere.
- **Saving** is listed with a lock icon and no actions.
- An **Archived** fold at the bottom lists archived categories with
  **Restore** (§12, Q7).

### Setting the budget

Tapping the bar (or "Set budget") opens a small sheet: amount, and
Week | Month. The first save sets the anchor to today. Later saves follow §5.

## 9. Layout and components

```
src/app/(life)/finance/page.tsx      Server Component: PageShell + FinanceBoard
src/components/finance/
  FinanceBoard.tsx      'use client'. Loads, settles, holds state, owns dialogs
  BudgetBar.tsx         the bar card, its text and pending-switch note
  BudgetSheet.tsx       amount + Week|Month
  MonthPicker.tsx       arrows and swipe
  DailyList.tsx         day groups
  EntryRow.tsx          one row, swipe handling
  SummaryList.tsx       per-category bars and the two totals
  AddSheet.tsx          add / edit
  AmountKeypad.tsx
  TemplateChips.tsx
  CategorySheet.tsx     manage categories
  UndoBar.tsx
  FinanceEmpty.tsx      first-visit card
  FinanceSetupMissing.tsx  "run the SQL file" message
src/lib/
  finance.ts            shapes above
  financeMoney.ts       sen ↔ text, keypad input
  financeBudget.ts      periods, bar, switch, fold, missing Savings
  financeMonths.ts      picker range and stepping across years
  financeViews.ts       daily groups, summary, most-used order
  financeSwipe.ts       swipe threshold
  financeRepo.ts        the only file that talks to Supabase
  + a .test.ts beside each pure module, and financeRepo.test.ts
```

**Page.** `PageShell title="Finance" subtitle="Where the money went"
accent="finance"`, as now. `FinanceBoard` is the one client component the
page renders; everything stateful lives under it.

**Month picker.** `‹ October 2026 ›`. Arrows are 44px. A horizontal swipe on
the strip also moves a month. It runs from the month of your earliest entry
to the current month, and the arrow at each end is disabled. With no entries
it shows only this month. Stepping uses the existing `addMonths` in
`lib/dates.ts`, which already counts years and months as one number, so
December → January crosses the year with no special case. Months only
filter what is shown below; the bar ignores the picker entirely.

**Daily.** The month's entries grouped by date, newest day first, newest
entry first within a day. Each group header is the date ("Today",
"Yesterday", "Wed 7 Oct") and that day's total (§12, Q4). Income rows show
`+RM` and the word "Income" under the category; Saving rows show an "Auto"
tag. Empty month: "Nothing logged in October".

**Summary.** For the month: one line per expense category with money spent,
its percentage of the month's spending (whole numbers) and a thin bar,
largest first. Then **Total spent** and **Total income**; total income
includes Saving, so a negative Saving lowers it.

**Not set up yet.** If the tables are missing (Supabase answers `PGRST205`),
the board is replaced by a message naming the SQL file, as To-do does.

## 10. Colour

The bar fill has three states, and Finance's own accent (`#A9C4E8`) is a
pastel made to sit behind text: as a bar on white it would all but vanish.
So the fills get their own deeper colours, following `--mac-accent-meals-deep`:

| Tone | Raw colour (globals.css) | What components use |
|---|---|---|
| calm | new `--mac-accent-finance-deep`, the finance blue taken deep | `--mt-budget-calm` |
| warning | new `--mac-budget-warn`, a deep amber | `--mt-budget-warn` |
| over | existing `--mac-danger-deep` `#C1473A` | `--mt-budget-over` |

The exact hex values are chosen during implementation by measurement, and a
new `src/lib/financeContrast.test.ts` pins them. It checks:

- each fill is at least **3:1** against the bar's track and against white
  (a bar is a mark, not text, so 3:1 is the target)
- the calm fill stays within 5° of the finance accent's hue and at least
  ΔE 20 deeper, so it reads as "finance, darker", like meals-deep
- the three fills are at least ΔE 20 from each other
- each `--mt-budget-*` token is wired to its raw colour

Colour is never the only signal: "over" also changes the words, and
"warning" is visible in the shrinking "left" figure. The summary bars use
the calm colour. `--mac-accent-finance` itself is unchanged, so
`accents.test.ts` is untouched.

## 11. Testing

Vitest, pure functions only, each test written to fail first.

**financeMoney**
- 1200 → "RM 12.00"; 123450 → "RM 1,234.50"; 0 → "RM 0.00";
  −4050 → "−RM 40.50".
- Keypad: "12" → 1200, "12.5" → 1250, "0.05" → 5; a third decimal digit and
  a second point are refused.

**financeBudget — periods**
- Weekly blocks from a Friday anchor.
- Monthly from the 15th.
- Monthly from 31 Jan 2027: Feb clamps to 28, March returns to 31, April
  clamps to 30 (the table in §5).
- Monthly from 29 Feb 2028 (leap year) into 2029.
- A period ends the day before the next one starts, always.

**financeBudget — bar**
- Spent counts every expense in the period and no income, Saving included.
- Days left counts today; last day is 1.
- Per day rounds down to the sen.
- Tone at 26%, exactly 25%, RM 0.00 left, and RM 0.01 over.
- The whole §6 table, row by row, including the RM 500 → 600 change on
  Tuesday turning warning back into calm.

**financeBudget — switch**
- A Week → Month switch made mid-week starts the day after that week ends.
- Before `next.from` the bar still shows the weekly period, with the note.
- On `next.from` the first monthly period starts that day.
- Switching back clears the pending switch.
- Folding happens only once today has reached `next.from`.

**financeBudget — Saving**
- One period ended → one Saving entry, amount budget − spent, dated its last
  day, `periodStart` its first day.
- Overspent → negative amount (−RM 40.50 in §6).
- Three weeks missed → three entries, each on its own last day.
- A period that already has a Saving entry is skipped (run twice, get the
  second run empty).
- The current, unfinished period never gets one.
- A switch in the middle of a missed stretch: the old-type periods and the
  new-type periods are both settled, with the right boundaries.

**financeMonths**
- Range from earliest entry to this month; no entries → just this month.
- Dec 2026 → Jan 2027 and back.
- Stepping past either end stays put.

**financeViews**
- Daily: groups newest first, entries newest first inside, day totals.
- Summary: per-category totals, percentages, largest first; archived
  categories still appear; totals; Saving counted in income, a negative
  Saving lowering it.
- Most-used order, ties alphabetical, archived and Saving left out.

**financeSwipe**
- Under a third of the width springs back; past it deletes; a mostly
  vertical drag is a scroll, not a swipe.

**financeRepo** (mocked Supabase, like `countUpRepo.test.ts`)
- Every read filters by owner; Rachel's fetch never asks for Jeff's rows.
- Saving inserts ask the database to skip existing periods.
- Undo re-inserts the original id.
- Entries are read in pages, because Supabase hands back at most 1,000 rows
  per request and a few years of expenses will pass that.

**financeContrast** — §10.

## 12. Open questions

Each with the answer I propose. Say if any should go the other way.

**Q1. Switching Week ↔ Month and changing the amount in the same save.**
The locked rule says a new amount applies to the current period at once.
But a switch from RM 500/week to Monthly almost always comes with a new
amount like RM 2,000, and applying RM 2,000 to the current *week* would
be wrong.
*Proposed:* if the save changes only the amount, it applies now. If it also
switches Week/Month, the amount travels with the switch and starts on
`next.from`; the current period keeps its amount. (That is why the table
has `next_amount_sen`. If you prefer the strict reading, that column goes.)

**Q2. Can Saving entries be edited or deleted?**
*Proposed:* no. They are labelled "Auto", cannot be swiped, and open
read-only. A deleted one would only come back on the next visit anyway,
because its period would look unsettled again. Saving is also not offered
as a category when you add income by hand.

**Q3. A period that ends exactly on budget.**
*Proposed:* still write a RM 0.00 Saving entry. It records that the period
was closed, and it shows in history as "you spent exactly your budget".

**Q4. What does a day's header total show, when a day has both?**
*Proposed:* money spent that day, e.g. "RM 63.50". If the day also has
income, a second, quieter figure: "+RM 600.00 in". Not a net figure, which
reads oddly on a pay day.

**Q5. Future dates.**
*Proposed:* Pick date stops at today. The month picker only reaches the
current month, so a future-dated entry would be unreachable in history
until that month came.

**Q6. Which date does a quick template use?**
*Proposed:* whatever the sheet's date is set to (Today unless you changed
it). The template's label becomes the entry's note.

**Q7. Restoring an archived category.**
*Proposed:* yes, from an "Archived" fold in the Categories sheet. Without it,
archiving "Food" by mistake and creating a new "Food" would split your
history across two categories with the same name.

**Q8. Templates whose category gets archived.**
*Proposed:* they are hidden, and come back if the category is restored.

**Q9. Editing or adding an expense in a period that has already closed.**
This follows from "past Saving entries never change", but it is worth
saying out loud: if you add a forgotten RM 30 expense to last week, last
week's Saving entry stays as it was.
*Proposed:* accept that. The Saving entry is a snapshot taken when the
period closed.

**Q10. Removing the budget altogether.**
*Proposed:* not in this version. You can change the amount and the period,
not switch it off.

## 13. Setup

`/finance` does not work until the SQL in
[2026-10-02-finance-setup.sql](2026-10-02-finance-setup.sql) is run in the
Supabase SQL editor. Until then it shows the "not set up yet" message (§9).

## 14. Not in this version

Recurring transactions (explicitly ruled out), currencies other than RM,
shared or joint budgets, per-category budgets, rolling unused money into
the next period, charts beyond the summary bars, CSV export, receipts or
photos, a figure on the Home card, and an offline queue for adds.
