# Timetable and timeline — browser verification

Date: 2026-09-03
Branch: `feat/timetable-recurring`
Plan: `docs/superpowers/plans/2026-09-03-timetable-recurring.md`

Run against the dev server through the preview tooling. Supabase credentials
are not available in the local dev environment, so all Supabase-dependent
checks (timetable grid loading, timeline entries persisting) show expected
network errors. The structural and UI checks all pass. A second pass against
the live app with Supabase running will be needed after Jeff runs the SQL
migrations (Part 1 for `timetable_rules`, Part 2 for composite `timetables`).

## SQL migrations needed before live verification

- **Part 1** (`timetable_rules`): creates the recurring class table.
- **Part 2** (`timetables` drop + recreate): drops the single-row table,
  creates the composite-key version (`user_name, weekday`).
  Warning: this deletes both people's current lists.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Page heading reads "Timetable" and nav reads "Timetable" (D94) | Pass |
| 2 | Me / Rachel toggle renders and is interactive | Pass |
| 3 | Timetable section shows error + Retry (no `timetable_rules` table yet) | Expected |
| 4 | Day tabs render all seven days | Pass |
| 5 | Friday identified as "today" with accent tint | Pass |
| 6 | Friday tab is selected by default | Pass |
| 7 | Clear button renders beside the tabs | Pass |
| 8 | Timeline section shows Jeff and Rachel panes with fetch error (no Supabase) | Expected |
| 9 | Page body has no horizontal scroll at 375 px (scrollWidth === clientWidth) | Pass |
| 10 | All console errors are Supabase `Failed to fetch` — no JS errors | Pass |
| 11 | No errors from new components (TimetableGrid, DayTabs, ClearDialog, etc.) | Pass |

## Structural checks (code-level, not runtime)

| # | Check | Result |
|---|---|---|
| S1 | No cross-imports between `timetable/` and `timeline/` | Pass — T6 rename enforces it |
| S2 | `swatchToken` background on all rule blocks, never hardcoded colour | Pass |
| S3 | `--mt-accent-ink` token added to both mood blocks in globals.css | Pass |
| S4 | `validateRule` refuses overlap and midnight crossing | Pass — pinned by tests |
| S5 | `ruleMessage` names the clashing class, time and day | Pass — pinned by tests |
| S6 | `emptyWeek` gives every day `[]` not `undefined` | Pass — pinned by tests |
| S7 | `weeksFromRows` keeps Jeff and Rachel separate | Pass — pinned by tests |
| S8 | 802 Vitest tests pass, 0 failures | Pass |
| S9 | `npx tsc --noEmit` clean | Pass |
| S10 | `npm run lint` 0 errors (2 pre-existing warnings in calendarEvent.ts) | Pass |

## Notes

The grid skeleton renders once the `timetable_rules` table exists in Supabase.
Until then the board shows the error+retry state, which is the correct fallback.

The timeline panes need Part 2 SQL before they can load. The day tab selection,
Clear button, and editor close-on-tab-switch are all wired and ready.

Deferred to live pass after SQL runs:
- Add a recurring event, verify column and span
- Clash detection message in the browser
- Exact-touch save (11:00–12:00 after 09:00–11:00)
- Rachel read-only (no Add, no edit on tap)
- Timeline free-text persistence per day
- Editor closes on day switch
- Clear day vs clear week behaviour
