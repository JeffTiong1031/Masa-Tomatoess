# To-do assistant — browser verification results

**Date run:** 2026-09-02
**Brief:** `.superpowers/sdd/2026-09-01-todo-assistant/task-13-brief.md`
**Against:** the real dev server, the real password gate, the real Gemini API, Jeff's live Supabase board.

Vitest runs pure functions only, so none of this was reachable by the 631
passing unit tests. This is the first time any of it ran in a browser.

App date/weekday seen throughout: Wed 2 Sep 2026 (so "tomorrow" resolved to
Thu 3 Sep 2026, "Friday" to Fri 4 Sep 2026).

**Naming deviation:** the safety rules for this pass require every task
created to be named `MTTEST ...`. The brief's exact wording for checks 3, 6
and 8 ("gym", "dentist", "trip") doesn't start with that prefix, so the
prompts actually sent were `MTTEST gym`, `MTTEST dentist A` / `MTTEST
dentist B`, and `MTTEST trip`. The substitution doesn't change what any
check exercises (date parsing, disambiguation, year-sanity refusal), since
the title is arbitrary to those code paths.

## Headline finding: the assistant does not work against live Gemini

Every one of 7 real Gemini calls made during this pass (across two chat
sessions) came back as "The AI's answer didn't hold together. Say it
again." on screen. Reading the raw HTTP responses (not just the on-screen
message) showed the JSON was well-formed and often exactly right — the
failure is a contract mismatch between server and client, not a Gemini
failure:

- `src/lib/assistantReply.ts`'s `parseReply` requires `text === ''` on a
  `"plan"` reply and `summary === ''` on a text-kind reply
  (`"answer"`/`"question"`/`"refusal"`), rejecting anything else as
  `shapeMismatch`. `assistantReply.test.ts`'s fixtures already assume this.
- `src/app/api/assistant/todo/route.ts`'s system prompt never tells Gemini
  to leave either field blank, and its JSON schema marks both `text` and
  `summary` as `required` regardless of `kind`. Gemini fills both, every
  time, for every kind of reply.

Result: no plan card and no text answer ever reached the screen during this
verification pass. The unit tests don't catch this because their fixtures
are hand-built to already satisfy the parser's contract — nothing in the
suite runs real (or even schema-shaped) server output through it.

Two further defects were visible only by reading the discarded raw
responses:

- **Check 6** (`move dentist to Friday` with two matching `MTTEST dentist`
  tasks): the model didn't ask which one — it proposed editing *both*
  handles to Friday. The system prompt itself says to ask when two tasks
  match; the model didn't follow it.
- **Check 8** (`add MTTEST trip on 14 Dec 2087`): the model didn't refuse
  the year at all — it proposed adding the task as normal. The system
  prompt has no instruction about implausible years; the `yearOutOfRange`
  rejection exists in `assistantReply.ts`'s type union but is presumably
  meant to run in client-side change parsing *after* `parseReply` succeeds,
  which it never does.

No application code was changed during this pass, and no Apply was ever
tapped — none was ever reachable.

## Results by check

| # | Check | Result |
|---|---|---|
| 1 | Button on `/todo` for own list | **PASS** |
| 2 | Button hidden on Rachel's board | **PASS** |
| 3 | `add gym tomorrow` → dated, no-time plan card | **FAIL** |
| 4 | Apply → task appears, card collapses | not run (blocked by 3) |
| 5 | Repeat add → duplicate warning | not run (blocked by 3/4) |
| 6 | Ambiguous "dentist" → asks which | **FAIL** |
| 7 | "What have I got on Thursday?" → text answer | **FAIL** |
| 8 | `add trip … 2087` → refused, names 2087 | **FAIL** |
| 9 | Six messages → warn line, then full panel + Start new chat | **PASS** |
| 10 | Offline → "You're offline." | **PASS** (see deviation note) |
| 11 | Offline mid-Apply → per-row report, Try again | not run (blocked by 3) |
| 12 | Close sheet mid-Apply → notice still shows | not run (blocked by 3) |
| 13 | Phone width: button clears bottom, ≥44px | **PASS** |

### 1 — PASS
`/todo` on Jeff's board shows a floating "Ask about your list" button
(bottom-right, sparkle icon).

### 2 — PASS
Switching the board toggle to Rachel removed the button from both the
accessibility tree and the screenshot; the board's visible tasks also
changed to Rachel's own list, confirming a real switch rather than a stale
render.

### 3 — FAIL
Sent "add MTTEST gym tomorrow" twice. Both times: the generic parse-failure
message. Raw response (materially the same both times):

```json
{"kind":"plan","text":"I have added 'MTTEST gym' to your list for tomorrow, 2026-09-03.","summary":"Added task 'MTTEST gym' for 2026-09-03.","changes":[{"op":"add","handle":"","title":"MTTEST gym","dueDate":"2026-09-03","dueTime":"","priority":false}]}
```

The date is correctly tomorrow and the time is correctly empty — exactly
what the check wants on the card — but no card ever rendered because `text`
is non-empty. No task was written.

### 4, 5 — not run
Both depend on check 3 producing an appliable plan card. Blocked by the
same defect.

### 6 — FAIL
Created `MTTEST dentist A` and `MTTEST dentist B` through the ordinary
Add-task form (not the assistant). Asked "move dentist to Friday." Same
generic error. Raw response:

```json
{"kind":"plan","text":"I have updated the dentist tasks (MTTEST dentist A and MTTEST dentist B) to be due on Friday, 2026-09-04.","summary":"Reschedule dentist tasks to Friday.","changes":[{"op":"edit","handle":"t12","title":"MTTEST dentist A","dueDate":"2026-09-04","dueTime":"","priority":false},{"op":"edit","handle":"t13","title":"MTTEST dentist B","dueDate":"2026-09-04","dueTime":"","priority":false}]}
```

Independent of the shape bug, the model guessed and edited both tasks
instead of asking which one — the opposite of what this check requires.
Nothing was applied; both tasks were confirmed still dateless afterward.

### 7 — FAIL
Asked "what have I got on Thursday?" (read-only). Same generic error. Raw
response:

```json
{"kind":"answer","text":"On Thursday, 2026-09-03, you have no tasks scheduled.","summary":"Checked the to-do list for Thursday, 2026-09-03, and found no scheduled tasks.","changes":[]}
```

A correct, well-formed answer that never reached the user because
`summary` is non-empty.

### 8 — FAIL
Asked "add MTTEST trip on 14 Dec 2087." Same generic error. Raw response:

```json
{"kind":"plan","text":"I have added 'MTTEST trip' to your to-do list for December 14, 2087.","summary":"Added a new task for 2087-12-14.","changes":[{"op":"add","handle":"","title":"MTTEST trip","dueDate":"2087-12-14","dueTime":"","priority":false}]}
```

Expected: refused, naming 2087. Actual: proposed adding it outright, no
refusal, no mention that 2087 is implausible. Nothing was written.

### 9 — PASS
Sent 6 messages total in one chat. After message 4: "2 messages left in
this chat." (matches `MAX_FROM_YOU = 6`, `WARN_AT_REMAINING = 2` in
`src/lib/assistantConversation.ts`). After message 6: "This chat is full.
Six messages is the limit, so replies stay fast and cheap. Start a new one
— it will still see all your current tasks." with a working "Start new
chat" button that reset the conversation. This mechanism counts messages
regardless of whether the reply parsed, so it works independent of the
headline bug.

### 10 — PASS, with a deviation
No dedicated network-offline toggle exists among the available browser
automation tools. Rather than disconnect the whole machine, `window.fetch`
was overridden inside the page so only requests to `/api/assistant/todo`
reject with `TypeError('Failed to fetch')` — the same error a genuine
dropped connection produces — leaving every other request untouched, then
restored immediately after. Sending a message in that state produced
"You're offline. The assistant needs a connection — your board still
works.", matching `src/lib/assistantRequest.ts`'s catch block. This
exercises the intended code path faithfully but is not literally the
browser's built-in offline switch, hence flagged here.

### 11, 12 — not run
Both need a real Apply in progress to interrupt (with a network drop, or by
closing the sheet). No Apply was ever reachable, so there was nothing to
interrupt.

### 13 — PASS
At a 375×812 (iPhone-width) viewport, the floating button's
`getBoundingClientRect()` measured 56×56 CSS px — above the 44px minimum —
with its bottom edge at y=788 against a viewport height of 812: 24px clear
of the bottom edge, neither clipped nor flush.

## MTTEST rows created and removed

- `MTTEST dentist A` — created via the ordinary Add-task form. Deleted via
  the board's own Edit-task sheet → trash icon → "Delete task". Confirmed
  gone.
- `MTTEST dentist B` — same creation and deletion path. Confirmed gone.
- No other MTTEST row was ever written to the database. `MTTEST gym`,
  `MTTEST trip`, and `MTTEST offline test` were each only ever proposed
  inside a plan payload the client discarded before any Apply button
  existed. The board's contents (section counts, completed count of 4)
  matched exactly before and after this entire pass.

## Scope note for review

Check 5 in the original spec is written for adds only; the brief calls out
that the real implementation covers adds *and* edits, because
`updateTodo` would otherwise let a bad edit blank a task's title. That
widening could not be exercised in this pass — it is blocked by the same
check-3 defect that keeps any plan from ever reaching a card — but the
brief's clarification is repeated here since it directly bears on how this
verification should be read once the underlying bug is fixed.

## What was not touched

- Rachel's board was only viewed, never written to.
- No Apply was tapped on anything.
- No application code was modified during this pass.
- The app password was used to get through the gate and is not recorded
  here or anywhere else in this document or in git.
