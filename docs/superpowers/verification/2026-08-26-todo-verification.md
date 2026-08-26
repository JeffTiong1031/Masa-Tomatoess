# To-do list — verification record

**Date:** 2026-08-26
**Branch:** `feat/todo-list` (commits `2519b8c`…`4a233a2`)
**Spec:** [2026-08-26-todo-list-design.md](../specs/2026-08-26-todo-list-design.md)
**SQL:** [2026-08-26-todo-setup.sql](../specs/2026-08-26-todo-setup.sql) — already
run in Supabase; the `todos` table exists.

This is a completed run, not a checklist for later. Every line below was either
run and its output read, or checked live in the browser (or, where the app
itself makes that impossible, by reading the code — called out explicitly).

---

## Automated checks

### `npm test`

```
Test Files  38 passed (38)
     Tests  505 passed (505)
```

All pass, including `accents.test.ts` (reads `globals.css` from disk and pins the
`todo` accent to `#64B880`) and `todoList.test.ts` (the group/sort rules and the
whole-second window the overdue wake-up must clear).

### `npx tsc --noEmit`

```
src/app/api/meals/estimate/route.ts(1,48): error TS2307: Cannot find module '@google/genai' ...
src/app/api/meals/review/route.ts(1,29): error TS2307: Cannot find module '@google/genai' ...
```

Exactly the two expected pre-existing errors, nothing else. `@google/genai` is
listed in `package.json` but `node_modules/@google` does not exist at all on
this machine — confirmed the same is true at the merge-base with `origin/main`,
so this predates every task in this plan. Did not run `npm install`.

### Scoped lint — `npx eslint src/components/todo "src/app/(life)/todo" src/lib/todo.ts src/lib/todoList.ts src/lib/todoRepo.ts`

No output — **0 errors, 0 warnings.**

(Repo-wide `npm run lint` still reports roughly 1460 errors, essentially all
outside `src/`, and was already failing before this branch. Not used as a gate
here; recorded as pre-existing context only.)

### `npm run build`

This did **not** succeed as a plain run: Turbopack fails the whole build over
the same missing `@google/genai` module —

```
Module not found: Can't resolve '@google/genai'
./src/app/api/meals/estimate/route.ts:1:1
./src/app/api/meals/review/route.ts:1:1
```

Unlike `tsc`, a production build cannot partially succeed around a missing
module — one unresolved import fails the whole compile, so `/todo` never
reached the route table this way. To get real evidence for this branch's own
route rather than assuming it would have worked, I temporarily renamed the two
blocking files (`route.ts` → `route.ts.bak`) — an isolation step, not a fix —
ran the build, then renamed them back immediately:

```
✓ Compiled successfully in 7.5s
...
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /countdown
├ ○ /cycle
├ ○ /finance
├ ○ /fitness
├ ○ /manifest.webmanifest
├ ○ /meals
├ ○ /study
├ ○ /study/calendar
├ ○ /study/dashboard
├ ○ /study/flexible
├ ○ /study/timer
├ ○ /study/timetable
└ ○ /todo
```

`/todo` is present in a build that succeeds. Confirmed `git status`/`git diff`
was clean again after restoring the two files, and deleted the resulting
`.next/` afterward. **This is a genuine gap worth flagging**: `npm run build`
does not pass as literally run today, for the same pre-existing reason `tsc`
doesn't — it is not something this feature introduced, but it means the build
gate is not actually green on this branch until `@google/genai` is installed.

---

## Manual pass (Step 4 of the brief)

Dev server via the `pomodoro-dev` preview config. Signed in by running
`localStorage.setItem('user_name', 'Jeff'); location.reload();` in the browser
tool — no password typed.

### Nav and hub placement — **PASS**

- Opened the drawer from the hub (`/`) and read its links directly from the
  DOM: `Home, Study, To-do, Period, Countdown, Meals, Fitness, Finance` — To-do
  sits exactly between Study and Period. `navLinks.test.ts`'s
  `'carries Study alongside the life sections'` pins this same order as a
  passing automated test.
- The `todo` accent is `#64B880` (green), pinned in `accents.test.ts` and used
  for the drawer icon chip and the hub card icon.
- **Active-state highlight**: verified by code, not by standing on `/todo`
  itself. `NavDrawer.tsx` only renders the hamburger ("Open menu") on the hub
  route; on every other route (including `/todo`) the chip is a Home shortcut
  instead, by design — this is true of every section, not unique to To-do, and
  it means there is no in-app way to have the drawer open while `pathname` is
  `/todo`. What I did confirm live: opening the drawer from the hub correctly
  marks *Home's own* entry active (`aria-current="page"`, accent-tinted
  background) — proving the exact same `isActiveHref(pathname, href)` logic
  that would mark To-do active on `/todo` is live and wired, just not
  observable on that one route through the UI's own affordances.
- The hub grid: reading the interactive elements at `/` shows a `To-do` link
  (`href="/todo"`) between the `Study` and `Period` cards, with no count or
  label under it — unlike `Period`, which shows a cycle-days label. **PASS.**

### Ownership and viewing — **PASS**

- Fresh load on `/todo` showed the `Jeff` toggle already pressed
  (`aria-pressed="true"`) with Jeff's own rows underneath — the page opens on
  the signed-in person's list.
- Clicked `Rachel`: the toggle flipped and, once the fetch resolved, Rachel's
  real rows (in this case none open, one completed) replaced Jeff's.
- **In-flight window, not just the settled result**: delayed the `GET
  /rest/v1/todos` fetch by 15s with a scoped `window.fetch` wrapper, then
  clicked `Rachel` and read the page at +50ms, +550ms and +2550ms:

  | check | toggle | body |
  |---|---|---|
  | +50ms | Rachel pressed | `Loading…` |
  | +550ms | Rachel pressed | `Loading…` |
  | +2550ms | Rachel pressed | `Loading…` |

  At no point did Jeff's rows render under Rachel's name — the board blanks to
  a loading state the instant `viewing` changes, and only shows rows once
  `loadedFor` catches up to the same owner. This is the `TodoBoard.tsx`
  mechanism from Task 6's fix round (`displayStatus = viewing === loadedFor ?
  status : 'loading'`) doing exactly what it was built for.
- **Add-while-viewing-the-other snap-back**: while viewing Rachel, typed
  `ZZTEST verify snap-back on add` into the composer (owner is always the
  signed-in user, Jeff) and submitted. Result: the toggle snapped to `Jeff`
  (`aria-pressed` flipped) and the new row appeared in **Jeff's** `No date`
  group (count 3→4) — created under the signed-in person, and the view
  followed it back. **PASS**, both halves.

### Grouping and sorting — **PASS**

- Every group observed (`Overdue`, `Today`, `Tomorrow`, `No date`) rendered in
  that exact order every time, with `No date` always last, matching
  `GROUP_ORDER` in `todoList.ts`.
- A no-date task (`ZZTEST buy milk` and others) consistently landed in `No
  date`, at the bottom.

### Ticking and completed — **PASS**

Using the fixture row (title later changed to `ZZTEST TYPED DURING FORCED
FAILURE`, see below):

- Ticked it done: it vanished from `No date` immediately (4→3) and `Show
  completed (1)` became `Show completed (2)`.
- Opened `Show completed`: both completed rows were listed.
- Unticked ("Reopen…"): it returned to `No date` (3→4) and `Show completed`
  dropped back to `1`.

### Editing and deleting — **PASS**

- Tapping a row's text opened the "Edit task" sheet pre-filled with its title
  and due date.
- Editing the title and/or due date and saving updated the row in place and
  re-sorted it into the correct group without blanking the list.
- Deleting via the sheet's Delete button removed the row. Exercised
  exhaustively during clean-up (see below): 13 separate deletes, every one
  confirmed by a real `DELETE /rest/v1/todos?id=eq….` request returning HTTP
  204, cross-checked against the live table afterward.

### A failed save keeps the sheet open — **PASS**

Installed a scoped `window.fetch` wrapper that returns a synthetic HTTP 500 for
any `PATCH` to `/rest/v1/todos` (all other requests untouched), then:

1. Opened the edit sheet, changed the title to
   `ZZTEST TYPED DURING FORCED FAILURE`, clicked Save.
   - Sheet stayed open (`role="dialog"` still present).
   - The Task input still read exactly `ZZTEST TYPED DURING FORCED FAILURE` —
     nothing was discarded.
   - Inline message: `That did not go through. Try again.`
   - Page-level notice: `That edit did not save.`
2. Removed the interceptor and clicked Save again on the same still-open sheet
   (no retyping). It closed normally and the row's title updated for real.

### Overdue wake-up, no interaction — **PASS**

- At **13:35:50** local time, saved a task due today with a due time of
  **13:37** (70 seconds ahead, inside the requested 60–90s window).
- Instrumented `setTimeout`/`clearTimeout` for visibility, then left the page
  alone — no clicks, no typing, no reload; only passive, read-only checks of
  `document`'s current text.
- At **13:37:11**, the row had moved on its own from `Today` into `Overdue`
  (count 3→4), and its date span carried
  `class="... text-[var(--mt-danger)]"` with computed colour
  `rgb(193, 71, 58)` — the danger token, applied because `overdue` is derived
  straight from the same group name that just changed.
- Timing matches the effect's own design: due at `13:37:00`, the
  `OVERDUE_WAKE_SLACK_MS` (1050ms) buffer means the wake fires at
  `13:37:01.05`, comfortably inside the 11-second gap between that and my
  `13:37:11` read.

### 375px layout — **PASS**

Resized the tab to 375×812 and, with the board list open and again with the
edit sheet open, measured every `button`/`a`/`input` in the DOM plus
`document.documentElement.scrollWidth` vs `clientWidth`:

- `scrollWidth === clientWidth === 375` in both states — no horizontal
  overflow.
- Zero controls under 44px in either dimension, in either state.

### "Not set up yet" screen — **verified by inspection only**

Per the correction in my instructions: the `todos` table exists (the SQL was
already run), so this state cannot be reproduced live without dropping or
renaming the table, which I was told not to do. Read the code instead:
`todoRepo.ts`'s `fetchTodos` maps Postgres error codes `42P01` and `PGRST205`
(relation does not exist) to `{ status: 'missing-table' }`; `TodoBoard.tsx`
renders the "Not set up yet" `Card` — naming the same SQL file this record
links above — exactly when `displayStatus === 'missing-table'`, before
anything else in the component tree. Not exercised live.

---

## Clean-up: the `ZZTEST ` rows

Before I started, the live `todos` table held 11 `ZZTEST `-prefixed rows left
over from Tasks 6–9. During this pass I added two more as fixtures
(`ZZTEST verify snap-back on add`, later renamed to
`ZZTEST TYPED DURING FORCED FAILURE` during the failed-save check, and
`ZZTEST wake-up recheck task10`) — 13 rows total, all `ZZTEST `-prefixed,
confirmed by a direct read of the table before deleting anything.

Deleted all 13 through the app's own edit sheet — open the row, tap Delete —
never through SQL. Every single delete was confirmed two ways: the sheet
closing with the row gone from the list, and a real
`DELETE https://…supabase.co/rest/v1/todos?id=eq.<id>` request returning
**HTTP 204**. One early attempt (`ZZTEST buy milk`) silently failed inside my
own test script — a stale selector matched the wrong button and reported
success without an actual request going out, a scripting mistake on my part,
not an app defect — caught by re-checking the live table, and it was deleted
correctly on the retry with the network request confirmed.

Final check, run directly against the table:

```sql
select count(*) from todos;
-- 0
```

The table is empty.

---

## Concerns

- **`npm run build` does not pass as literally run**, for the same
  pre-existing reason `tsc` doesn't (`@google/genai` missing from
  `node_modules`, present only in `package.json`). This is not something the
  to-do feature introduced — confirmed the same absence exists at this
  branch's merge-base with `origin/main` — but it does mean the build gate
  isn't actually green today. Getting `/todo` into a route listing required
  temporarily setting the two `@google/genai`-importing files aside, which I
  did and immediately reverted; `git status` was clean afterward.
- The drawer's "active state lights on `/todo`" half of the first checklist
  item could not be observed by standing on `/todo` itself and opening the
  menu, because this app only shows the hamburger trigger on the hub route —
  true for every section, not specific to To-do. Verified by code and by the
  identical mechanism working live on the one route where it can be observed
  (the hub itself).
- No other defects found. Every other check in the brief's Step 4 list, plus
  the four extra checks from the task description (snap-back, in-flight
  ownership, failed-save recovery, hands-off overdue wake-up), passed with
  live evidence recorded above.
