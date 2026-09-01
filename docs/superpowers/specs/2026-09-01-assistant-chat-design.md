# AI assistant chat for To-do and Calendar

Date: 2026-09-01
Status: design agreed, not yet planned

## What it is

A button on `/todo` and on `/study/calendar` opens a chat sheet. You type what
you want changed. Gemini reads a slice of your own rows and replies with one of
four things: an answer, a question, a plan, or a refusal. A plan is a list of
changes with an Apply button. Nothing reaches Supabase until you tap Apply.

Two separate bots. The to-do bot only sees and edits to-dos; the calendar bot
only sees and edits events. Neither can touch the other section.

## Decisions

| Question | Decision |
|---|---|
| Write model | AI proposes, you Apply. No undo needed. |
| Scope | Two section-locked bots, not one brain. |
| Data sent | A window around what the board holds, not everything. |
| Partner data | Own rows only. Button hidden when viewing anyone else. |
| When to ask | Only when the answer is unknowable. Missing optional fields stay empty. |
| Plan size | Many changes, one Apply, capped at 20. |
| Chat memory | Fresh each open. Client-side only. No table. |
| Surface | Floating button, bottom sheet via the existing `Modal`. |
| Read questions | Answered, when inside the window. |
| Streaming | None. Spinner, then the whole validated reply. |

## Architecture

One Gemini call per message. The browser applies the changes through the same
repo functions the manual buttons use. No service-role key is involved, and no
second write path exists.

### Routes

- `src/app/api/assistant/todo/route.ts`
- `src/app/api/assistant/calendar/route.ts`

Each takes one POST: chat history, the snapshot, today's date, the clock time.
Each makes one Gemini call with a JSON response schema, checks the shape, and
returns the reply. Both set an explicit `maxDuration` so a hung call fails as a
clean error rather than a dropped connection.

### New pure modules in `src/lib/`

| File | Job |
|---|---|
| `assistantReply.ts` | the four reply shapes, the wire schema, and `parseReply` |
| `assistantFailure.ts` | every failure reason mapped to plain wording |
| `assistantContext.ts` | `assignHandles` and `buildSnapshot` |
| `todoPlan.ts` | to-do change shapes, validators, `reconcilePlan`, `clashesFor` |
| `calendarPlan.ts` | the same for events |
| `assistantRequest.ts` | the browser fetch wrapper, mirroring `mealEstimateRequest.ts` |

### New components in `src/components/assistant/`

- `AssistantButton.tsx` — the floating round button
- `AssistantSheet.tsx` — thread and input, using `Modal` with `variant="sheet"`
- `PlanCard.tsx` — the change list, clash warnings, Apply / Cancel, the report

`TodoBoard` and `CalendarBoard` each render the button. No new pages, no route
changes, no edit to `navLinks.ts`.

### When the button shows

- To-do: only when `viewing === signedIn`.
- Calendar: only when the owner filter equals the signed-in user. Hidden on the
  partner, and hidden on **Both** — a bot that silently ignored half a visible
  board would answer questions wrongly with no way for you to tell.

## The reply contract

Four kinds, exactly one per message.

- `answer` — text, no card.
- `question` — text, no card. Used only when the bot genuinely cannot proceed.
- `plan` — a one-line summary and 1 to 20 changes. Card with Apply / Cancel.
- `refusal` — text, no card.

On the wire the reply is a flat object with `kind`, `text`, `summary` and
`changes[]`, unused fields empty. Gemini's support for `oneOf` in a response
schema is unreliable; a flat schema always parses. `parseReply` converts it into
the real TypeScript union immediately, so nothing downstream sees the flat shape.

Every change carries the whole end state, not a patch, because `updateTodo` and
`updateEvent` already take a full draft. This also lets the card show before and
after honestly.

To-do ops: `add`, `edit`, `complete`, `reopen`, `delete`.
Calendar ops: `add`, `edit`, `delete`.

Categories are referred to by **name**. The snapshot sends your category list;
the browser maps the name back to an id. The bot never creates a category.

## Validation

`parseReply` returns `{ ok: true, reply }` or `{ ok: false, reason }`. Any
failure rejects the **whole** reply — there are no half-valid plans.

1. `kind` is one of the four.
2. A plan holds between 1 and 20 changes.
3. Every handle in a non-add change exists in this conversation's handle map.
4. An add has a non-empty title.
5. Dates are `YYYY-MM-DD`, times are `HH:MM`.
6. Dates fall within **today plus or minus five years**. This is a typo guard on
   the number, not the read window: it applies to adds too.
7. A category name is one we sent, or empty.
8. No handle appears twice in one plan.
9. Calendar only: the change passes `validate()` in `eventForm.ts` — the same
   check the manual event form runs. The bot cannot create an event your own
   form would reject, and there is no second rulebook to keep in sync.

### Failure wording

`assistantFailure.ts` maps every reason to its own sentence, in the table style
`aiFailure.ts` already uses, pinned by a test so nothing falls through to a
generic string.

| Reason | Message |
|---|---|
| unknown kind | The AI answered in a way I couldn't read. Say it again. |
| bad change count | It tried to make 34 changes at once. Ask for a smaller piece. |
| unknown handle | It pointed at a task that isn't on your list. Say it again. |
| empty title | It left the name blank. Tell me what to call it. |
| bad date or time | It gave me a date I couldn't read. Try naming the date plainly. |
| year out of range | It gave me the year 2087 — that looks like a typo. Say the date again. |
| unknown category | There's no category called Sport. Pick one you have, or leave it out. |
| duplicate handle | It tried to change the same task twice in one go. Say it again. |
| form rejection | the message `eventForm.validate()` already returns, word for word |
| key missing (503) | The assistant isn't switched on yet. |
| quota (429) | Out of AI replies for today. Try again tomorrow. |
| no network | You're offline. The assistant needs a connection — your board still works. |
| timeout | The AI took too long. Try again. |
| anything else | Something broke on the way to the AI. Try again in a moment. |

## The snapshot

### Handles

Rows travel as short handles — `t1`, `e4` — never as database ids. Your Supabase
ids never leave the machine, the prompt shrinks by roughly 35 characters a row,
and an invented handle is caught by check 3.

`assignHandles(previousMap, rows)` is **append-only for the life of the
conversation**. A row is given a handle the first time it appears in this chat
and that handle is never reused. Numbers come from a counter, never from array
position — position-based handles would silently re-point `t3` at a different
row after a deletion, and check 3 could not see it because `t3` would still
exist. A row deleted mid-chat keeps its dead handle, so a plan aimed at it is
caught as **stale** rather than applied to the wrong row.

Apply resolves handles through the same frozen map, so a plan means at Apply
exactly what it meant when written.

### Contents

**To-do:** today, weekday, clock time, then every open task and every task
completed in the last 7 days — handle, title, due date, due time, priority,
done.

**Calendar:** today, weekday, clock time, the window as two plain dates, your
category names, then each event — handle, title, date, end date, start and end
time, countdown flag, category name, and notes trimmed to 200 characters.

### Windows and caps

- To-do: every open task regardless of date. Only completed tasks older than
  7 days are cut.
- Calendar: 30 days back to 90 days ahead.
- Hard caps: 200 tasks, 250 events. Over the cap the calendar window shrinks to
  14 days back and 45 ahead, and the snapshot states the narrower range so
  refusals name the true window instead of lying about it.

### Time

The browser sends `todayISO()` and `timeISO()`, which are already local. The
server never reads a clock. No timezone configuration anywhere.

## Prompt rules

- Who it is, and that it works on your rows only.
- Today's date and weekday in plain form, so "tomorrow" and "next Friday"
  resolve without a server clock.
- The exact window dates.
- **Reading is windowed. Writing is not.**
  - Add: any date, any year, subject only to the five-year typo guard.
  - Question about existing rows: windowed. Refuse and name the real range.
  - Edit or delete an existing row: windowed, because it cannot find a row it
    was never shown.
- The ops it has, and that nothing else exists.
- Leave optional fields empty rather than invent them.
- Ask a `question` only when it genuinely cannot proceed — two rows match, or
  the date is truly ambiguous. Worked example in the prompt: "next Friday" said
  on a Friday.
- The category names, and that it must use one of them or none.
- A cancelled plan was rejected. Do not offer it again unless asked.
- Reply with exactly one kind.

Refusals must be specific enough that they never imply adds are blocked:

> What's on in December? — "I can only see 2 Aug to 30 Nov, so I can't tell you
> what's already there. I can still add something to December if you want."

> Move my December trip to the 20th. — "I can't see December events, so I can't
> find that one. Open December and drag it there."

> Add Trip on 14 Dec. — a plan card, applied normally.

**No validation check may reject an add for being outside the window.**

## Conversation lifecycle

History lives in React state and dies when the sheet closes or the page reloads.
Nothing is stored on the server or on disk.

Cap: 12 messages, which is 6 from you. After your fourth, a quiet line under the
input reads "2 messages left in this chat." At the cap the input is disabled and
a panel says the chat is full, six messages is the limit so replies stay fast
and cheap, and a new one will still see all your current rows — with a **Start
new chat** button beside it. The input never sits dead without an explanation.

Old turns go back up by weight:

| State | What history carries |
|---|---|
| open, waiting on you | the full change list — those rows exist nowhere else |
| applied | a summary with handles: "Applied: added Gym Thursday (e7)" |
| cancelled | one line: "You cancelled: added Gym Thursday" |

An applied plan can be thinned because its rows are in every later snapshot,
which is better data than history. A cancelled plan is thinned because you
rejected it.

## Apply

1. Apply goes disabled and reads "Saving…". It can only be tapped once.
2. A fresh fetch runs first — the snapshot is now minutes old.
3. `reconcilePlan(plan, freshRows)` marks any change whose row has gone as
   **stale**. Stale changes are not attempted.
4. The survivors run one at a time, in the order the AI listed them, through the
   existing `todoRepo` and `calendarRepo` functions.
5. The board refetches, even on partial failure, so the screen never disagrees
   with the database. `TodoBoard` already has `reloadToken`; `CalendarBoard`
   gains the same.
6. The card reports per change. All good collapses to "Saved. 3 changes."
   Otherwise it lists each failure with its own reason and offers a retry.

### Why it keeps going after a failure

Changes in a plan are independent by construction, not by hope:

- An add produces no handle, so the model cannot write "add this, then edit the
  thing I just added". That dependency is unrepresentable.
- Check 8 forbids the same handle twice, killing "delete t3 then edit t3".

So Apply runs every change and hands back one complete report. Stopping at the
first failure would leave a half-applied plan with a ragged edge.

**One exception:** three consecutive failures where the request never reached
Supabase — a rejected fetch or a spent budget, not an error the database
answered with — stop the run. The remaining changes are marked **not attempted**
rather than failed, because they can be retried cleanly.

### Retry

The retry button covers **failed** and **not attempted** rows. **Stale** rows
are excluded — the row is gone and retrying cannot bring it back — and stay
listed with their reason. Retry re-runs the fresh fetch first, so a row that has
gone stale in the meantime is caught then.

### Budgets

Every call gets an `AbortController`.

| Call | Budget | On timeout |
|---|---|---|
| chat message to Gemini | 20s | the sheet shows the `timeout` message |
| fresh fetch before Apply | 10s | Apply stops, the button returns as **Try again** |
| each single change | 10s | that row reports "took too long", the rest carry on |
| whole Apply | 30s | remaining rows become **not attempted** |

Every path out of Apply re-enables the button, either as **Try again** or as the
collapsed "Saved" line. It can never sit grey forever.

Closing the sheet mid-Apply does not cancel it. The writes finish, the board
refetches, and the result lands as a board notice.

### No transaction, no drift check

There is no rollback: change 3 of 5 failing leaves 1 and 2 saved. That is why
the report is per row and specific rather than one red failure.

If a row still exists we apply, even if the other person edited it seconds ago.
Detecting that needs a version per row, and for two people who rarely touch the
same row in the same minute it is not worth the machinery. Accepted risk,
recorded here rather than hidden.

## Clash checks

`clashesFor(change, rows)` — one in `calendarPlan.ts`, one in `todoPlan.ts` —
runs twice and never blocks.

- **On card render**, against board state. `fetchEvents()` pulls every event with
  no date filter, so the browser already holds December even when the bot cannot
  see it. A warning line sits on the card while you decide: "14 Dec already has
  Flight 09:00–11:00."
- **At Apply**, against the fresh fetch. A clash that appeared in between is
  reported afterwards. Applying anyway is right: you already decided, and two
  things in a day is ordinary.

Rules:

- Calendar: same date, both timed, and the spans overlap. A `moment` counts as
  one hour, the convention `calendarEvent.ts` already uses for drawing. All-day
  events clash with nothing.
- To-do: same due date and the same title ignoring case and spacing. The real
  mistake on a list is adding something twice.

Checked against your own rows only, so the card means one consistent thing.

An add that lands outside the months on screen says so: "Added Trip on 14 Dec —
that's outside the months you're looking at."

## Testing

Vitest has no DOM here, so every decision lives in `lib/` and is tested there.

- `parseReply` — one test per rejection reason, each asserting the specific
  reason, plus a happy path per reply kind.
- the failure table — every reason maps to its own wording, none falls through.
- `assignHandles` — three turns with a row deleted in the middle; assert no
  handle ever changes meaning.
- `buildSnapshot` — to-do keeps all open plus done within 7 days; calendar
  honours the window, trims notes at 200, and when the cap bites the range it
  reports matches the rows it sent.
- the plan validators — the five-year bound, the duplicate handle, an unknown
  category, and a calendar change `eventForm.validate()` already rejects.
- `reconcilePlan` — stale detection.
- `clashesFor` — span against span, a `moment` as one hour, all-day clashing
  with nothing, and the to-do duplicate title across case and spacing.

Bug fixes get their test written failing first.

By hand in the browser: the button hidden on the partner view and on Both; the
two-messages-left warning and the full-chat panel; a partial Apply report;
pulling the network mid-Apply; closing the sheet mid-Apply and seeing the board
notice.

The floating button will want the section accent as its fill, and accents are
pastels built to sit behind text. The icon on top must clear 3:1. Measure it
with `color.ts` and pin it.

## Not building

No undo. No transaction or rollback. No drift check between people. No
cross-section brain. No chat history across devices. No AI-created categories.
No recurring events or reminders — the calendar has neither today. No voice
input. No streamed replies: a half-arrived plan cannot be validated or safely
shown.

## Build order

To-do bot first. It has no categories and no timing union, so it proves the
whole shape — route, parse, card, apply, retry — on the simpler half. The
calendar bot follows, reusing the shared lib and adding `eventForm.validate()`
and clash checks. Two branches, two pull requests.

## Before any of this runs

`@google/genai` is listed in `package.json` but is absent from `node_modules`.
The meals AI is dead on this machine until `npm install` is run.
