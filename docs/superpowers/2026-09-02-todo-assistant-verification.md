# To-do assistant — browser verification results

**Date run:** 2026-09-02 (first pass and fix pass, same day)
**Brief:** `.superpowers/sdd/2026-09-01-todo-assistant/task-13-brief.md`
**Against:** the real dev server, the real password gate, the real Gemini API, Jeff's live Supabase board.

Vitest runs pure functions only, so none of this was reachable by the unit
suite. This is the first time any of it ran in a browser. This document
covers two passes: the first found the assistant non-functional against
live Gemini; a fix was applied to the two files responsible; the second
pass re-ran every check the first one failed or blocked, and reports final
results.

App date/weekday seen throughout both passes: Wed 2 Sep 2026 (so "tomorrow"
resolved to Thu 3 Sep 2026, "Friday" to Fri 4 Sep 2026).

**Naming deviation (both passes):** the safety rules for this work require
every task created to be named `MTTEST ...`. The brief's exact wording for
checks 3, 6 and 8 ("gym", "dentist", "trip") doesn't start with that
prefix, so the prompts actually sent were `MTTEST gym`, `MTTEST dentist A`
/ `MTTEST dentist B`, `MTTEST trip`, and (second pass only) `MTTEST
offline1` / `MTTEST offline2` / `MTTEST closetest`. The substitution
doesn't change what any check exercises (date parsing, disambiguation,
year-sanity refusal), since the title is arbitrary to those code paths.

## First pass: the assistant did not work against live Gemini

Every one of 7 real Gemini calls made during the first pass (across two
chat sessions) came back as "The AI's answer didn't hold together. Say it
again." on screen. Reading the raw HTTP responses (not just the on-screen
message) showed the JSON was well-formed and often exactly right — the
failure was a contract mismatch between server and client, not a Gemini
failure:

- `src/lib/assistantReply.ts`'s `parseReply` required `text === ''` on a
  `"plan"` reply and `summary === ''` on a text-kind reply
  (`"answer"`/`"question"`/`"refusal"`), rejecting anything else as
  `shapeMismatch`. `assistantReply.test.ts`'s fixtures already assumed
  this.
- `src/app/api/assistant/todo/route.ts`'s system prompt never told Gemini
  to leave either field blank, and its JSON schema marked both `text` and
  `summary` as `required` regardless of `kind`. Gemini filled both, every
  time, for every kind of reply.

Result: no plan card and no text answer ever reached the screen during the
first pass. The unit tests didn't catch this because their fixtures were
hand-built to already satisfy the parser's contract — nothing in the suite
ran real (or even schema-shaped) server output through it.

Two further defects were visible only by reading the discarded raw
responses:

- **Check 6** (`move dentist to Friday` with two matching `MTTEST dentist`
  tasks): the model didn't ask which one — it proposed editing *both*
  handles to Friday. The system prompt itself said to ask when two tasks
  match; the model didn't follow it.
- **Check 8** (`add MTTEST trip on 14 Dec 2087`): the model didn't refuse
  the year at all — it proposed adding the task as normal. The system
  prompt had no instruction about implausible years; the `yearOutOfRange`
  rejection existed in `assistantReply.ts`'s type union but was only ever
  reachable in client-side change parsing *after* `parseReply` succeeded,
  which it never did.

No application code was changed during the first pass, and no Apply was
ever tapped — none was ever reachable. First-pass raw evidence for each
failed check is kept below (see "First-pass detail") rather than deleted,
since it's the record of the defect the fix addresses.

## The fix

**`src/lib/assistantReply.ts`** — relaxed two of the three shape rules,
kept the third:

- Text kinds (`answer`/`question`/`refusal`) now reject only when
  `wire.changes.length > 0`. A non-empty `summary` on a text reply is
  ignored rather than rejected.
- `plan` no longer rejects a non-empty `text`; the
  `if (wire.text !== '') return shapeMismatch` branch was deleted. Stray
  `text` on a plan is ignored.
- Still rejects a text reply carrying `changes` — that one is a real
  confusion signal, not chattiness.

`src/lib/assistantReply.test.ts` updated to match: "rejects a text reply
carrying a summary" became "ignores a summary on a text reply" (now
asserts `ok: true`), "rejects a plan carrying stray text" became "ignores
stray text on a plan" (now asserts `ok: true` with its changes), and a new
regression test, "accepts a realistic Gemini plan with both text and
summary filled", pins a `kind: 'plan'` reply carrying non-empty `text`,
non-empty `summary`, and one valid change as parsing successfully.

**`src/app/api/assistant/todo/route.ts`** — the system prompt gained an
explicit shape instruction (fill only the fields for your reply kind, plan
leaves `text` empty, text kinds leave `summary` empty and `changes` empty)
and a firmer, non-negotiable version of the ask-rather-than-guess rule
(more than one matching task must produce a `"question"` naming the
candidates — guessing is explicitly called worse than asking, because the
change lands on real data).

Before committing: `npm test` (632 passed, up one for the new regression
test), `npx tsc --noEmit` (clean), `npm run lint` (0 errors, the same 2
pre-existing `calendarEvent.ts` warnings as before the fix).

## Second pass: re-verification after the fix

Checks 1, 2, 9, 10 and 13 were not re-run — they already passed on the
first pass and don't touch the fixed code path. Checks 3, 4, 5, 6, 7, 8, 11
and 12 were re-run in full against the fixed code, live Gemini, and Jeff's
real board.

| # | Check | First pass | Second pass |
|---|---|---|---|
| 1 | Button on `/todo` for own list | PASS | not re-run (already passed) |
| 2 | Button hidden on Rachel's board | PASS | not re-run (already passed) |
| 3 | `add gym tomorrow` → dated, no-time plan card | FAIL | **PASS** |
| 4 | Apply → task appears, card collapses | not run | **PASS** |
| 5 | Repeat add → duplicate warning | not run | **PASS** |
| 6 | Ambiguous "dentist" → asks which | FAIL | **PASS** |
| 7 | "What have I got on Thursday?" → text answer | FAIL | **PASS** |
| 8 | `add trip … 2087` → refused, names 2087 | FAIL | **PASS** |
| 9 | Six messages → warn line, full panel + Start new chat | PASS | not re-run (already passed) |
| 10 | Offline → "You're offline." | PASS | not re-run (already passed) |
| 11 | Offline mid-Apply → per-row report, Try again | not run | **PASS** |
| 12 | Close sheet mid-Apply → notice still shows | not run | **PASS** |
| 13 | Phone width: button clears bottom, ≥44px | PASS | not re-run (already passed) |

### 3 — PASS (was FAIL)
Sent "add MTTEST gym tomorrow." A plan card rendered this time:
"Adding task 'MTTEST gym' for tomorrow, 2026-09-03." / "Add MTTEST gym ·
2026-09-03" with an Apply button. Raw response confirms the shape fix
took effect — `text` is now empty even though the model still writes a
friendly `summary`:

```json
{"kind":"plan","text":"","summary":"Adding task 'MTTEST gym' for tomorrow, 2026-09-03.","changes":[{"op":"add","handle":"","title":"MTTEST gym","dueDate":"2026-09-03","dueTime":"","priority":false}]}
```

Date filled (tomorrow), time empty — matches the check.

### 4 — PASS (not run in first pass)
Tapped Apply on the card from check 3 (a single MTTEST add, safe to
apply). Board notice read "Saved 1 change."; the assistant card collapsed
to "Saved. 1 of 1."; "MTTEST gym" appeared on the board under "Tomorrow,
Thu 3 Sep".

### 5 — PASS (not run in first pass)
Sent "add MTTEST gym tomorrow" again in the same chat. No plan card this
time — a text reply: "The task 'MTTEST gym' is already on your list for
tomorrow (t12)." No Apply button existed, so there was nothing to tap
before or after the warning.

### 6 — PASS (was FAIL)
Created `MTTEST dentist A` and `MTTEST dentist B` via the ordinary
Add-task form. Asked "move dentist to Friday" in the same chat. Got a
question, not a guess: "There are two tasks matching 'dentist': 'MTTEST
dentist A' (t13) and 'MTTEST dentist B' (t14). Which one would you like to
move to Friday, 2026-09-04?" No Apply/Cancel controls existed for this
reply. Neither dentist task's due date was touched.

### 7 — PASS (was FAIL)
Asked "what have I got on Thursday?" in the same chat. Got a plain text
answer, no card: "On Thursday, 2026-09-03, you have the following task:
'MTTEST gym' (t12)." (Correctly reflects the MTTEST gym task applied in
check 4.)

### 8 — PASS (was FAIL)
Asked "add MTTEST trip on 14 Dec 2087" in the same chat (the last message
before the 6-message cap). Got a rejection naming the year: "It gave me
the year 2087 — that looks like a typo. Say the date again." Raw response
confirms the model still proposes 2087 as a normal date (no system-prompt
change there), but the now-reachable client-side `yearOutOfRange` check
catches it before anything can be applied:

```json
{"kind":"plan","text":"","summary":"Adding task 'MTTEST trip' for 2087-12-14.","changes":[{"op":"add","handle":"","title":"MTTEST trip","dueDate":"2087-12-14","dueTime":"","priority":false}]}
```

No Apply button existed; nothing was written.

### 11 — PASS (not run in first pass)
Started a new chat (the previous one had hit the 6-message cap). Asked
"add MTTEST offline1 tomorrow and MTTEST offline2 tomorrow" — the model
returned one plan with two MTTEST-only add changes. Because there is no
offline toggle exposed by the available browser tools (see check 10's
note), the write path was exercised the same way: `window.fetch` was
overridden so that only the second Supabase write to `/todos` rejected
with `TypeError('Failed to fetch')`, the first succeeding normally — a
stand-in for the connection dropping partway through a multi-row Apply.
Tapping Apply produced: board notice "1 of 2 saved.", the card showing
"Add MTTEST offline1 · 2026-09-03 ✓" and "Add MTTEST offline2 ·
2026-09-03 — The database refused it.", and a live "Try the other 1
again" button (not disabled, not stuck grey). Restoring `fetch` and
tapping that button completed the second row: "Saved 2 changes." / "Saved.
2 of 2." on the card.

### 12 — PASS (not run in first pass)
Started a new chat. Asked "add MTTEST closetest tomorrow" → a one-change
MTTEST-only plan card. `window.fetch` was overridden to delay the Supabase
write by 4 seconds (again standing in for the missing offline toggle —
this time to open a window to interrupt, rather than to fail the
request). Clicked Apply, then immediately clicked the sheet's Close
button before the delayed write resolved. The sheet closed with no plan
card visible, but the top-level board notice "Saved 1 change." appeared
once the write completed, and "MTTEST closetest" showed up on the board —
confirming the apply run keeps going and the board still reports the
outcome even when the sheet that started it has been closed.

## MTTEST rows created and removed

First pass:
- `MTTEST dentist A`, `MTTEST dentist B` — created via the ordinary
  Add-task form. Deleted via the board's own Edit-task sheet → trash icon
  → "Delete task" before the pass ended. Confirmed gone.
- No other MTTEST row was ever written in the first pass — `MTTEST gym`
  and `MTTEST trip` were only ever proposed inside plan payloads the
  client discarded before any Apply button existed.

Second pass:
- `MTTEST gym` — added via the assistant (check 3/4 Apply).
- `MTTEST dentist A`, `MTTEST dentist B` — recreated via the ordinary
  Add-task form for check 6.
- `MTTEST offline1`, `MTTEST offline2` — added via the assistant (check
  11; offline1 saved on the first Apply, offline2 saved on the retry).
- `MTTEST closetest` — added via the assistant (check 12).

All six second-pass rows were deleted one at a time via the board's own
Edit-task sheet → trash icon → "Delete task" at the end of the pass.
Confirmed by re-reading the board afterward: it matches the original
baseline exactly (Overdue 1, Today 5, Later 1, completed 4, no "No date"
or extra "Tomorrow" section).

## Scope note for review

Check 5 in the original spec is written for adds only; the brief calls out
that the real implementation covers adds *and* edits, because
`updateTodo` would otherwise let a bad edit blank a task's title. The
second pass only exercised the add case (there was no duplicate-edit
scenario staged); the edit side of check 5's widening still rests on the
unit tests rather than a browser run.

## First-pass detail (kept for the record)

Full raw responses from the first pass, for each check that failed then:

**Check 3** — `{"kind":"plan","text":"I have added 'MTTEST gym' to your
list for tomorrow, 2026-09-03.","summary":"Added task 'MTTEST gym' for
2026-09-03.","changes":[{"op":"add","handle":"","title":"MTTEST
gym","dueDate":"2026-09-03","dueTime":"","priority":false}]}` — rejected
because `text` was non-empty.

**Check 6** — `{"kind":"plan","text":"I have updated the dentist tasks
(MTTEST dentist A and MTTEST dentist B) to be due on Friday,
2026-09-04.","summary":"Reschedule dentist tasks to
Friday.","changes":[{"op":"edit","handle":"t12","title":"MTTEST dentist
A","dueDate":"2026-09-04","dueTime":"","priority":false},{"op":"edit","handle":"t13","title":"MTTEST
dentist B","dueDate":"2026-09-04","dueTime":"","priority":false}]}` —
rejected on shape, and even ignoring that, the model guessed both tasks
instead of asking.

**Check 7** — `{"kind":"answer","text":"On Thursday, 2026-09-03, you have
no tasks scheduled.","summary":"Checked the to-do list for Thursday,
2026-09-03, and found no scheduled tasks.","changes":[]}` — rejected
because `summary` was non-empty.

**Check 8** — `{"kind":"plan","text":"I have added 'MTTEST trip' to your
to-do list for December 14, 2087.","summary":"Added a new task for
2087-12-14.","changes":[{"op":"add","handle":"","title":"MTTEST
trip","dueDate":"2087-12-14","dueTime":"","priority":false}]}` — rejected
on shape, and even ignoring that, the model didn't refuse 2087 at all.

## What was not touched

- Rachel's board was only viewed, never written to, in either pass.
- No Apply was tapped on any plan touching a row not created in this work.
- No application code was modified beyond the two files named above.
- The app password was used to get through the gate and is not recorded
  here or anywhere else in this document or in git.
