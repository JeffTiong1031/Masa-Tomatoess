# Calendar assistant — browser verification

Date: 2026-09-02
Branch: `feat/calendar-assistant`
Plan: `docs/superpowers/plans/2026-09-02-calendar-assistant.md`
Spec: `docs/superpowers/specs/2026-09-01-assistant-chat-design.md`

Run against the dev server through the preview tooling, a live `GEMINI_API_KEY`,
and the real Supabase rows. Signed in as Jeff. Every row created during the run
was deleted afterwards; the calendar returned to its original 20 events and the
to-do list to its original 30.

Fifteen of the eighteen checks passed on the first pass. Three failed, all three
were fixed, and all three were re-run against the live app. A fourth defect —
copy, not behaviour — was noticed during check 14 and fixed alongside them.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Button shows on `/study/calendar` with the filter on yourself | pass |
| 2 | Filter to Rachel hides it; **Both** hides it; back to Jeff restores it | pass |
| 3 | `/todo` bot still works end to end after the Task 1 and 7 refactors | pass |
| 4 | `add dentist next Tuesday 3pm` → 2026-09-08, 15:00, no end time | pass |
| 5 | Apply saves, card collapses, notice is muted not red, board refetches | pass |
| 6 | `add gym 8am to 7am tomorrow` is rejected with a reason | pass |
| 7 | `add holiday all day from 20 Dec to 27 Dec` → one multi-day event | pass |
| 8 | An overlapping add warns rather than blocks | **failed, fixed, re-run** |
| 9 | Two events with the same title → it asks which | **failed, fixed, re-run** |
| 10 | `what have I got on Tuesday 8 September?` → text answer, no card | pass |
| 11 | `what's on in March 2027?` → refusal that names the real window **and** offers to add | pass |
| 12 | `add trip on 14 Dec 2087` → rejected, message names 2087 | pass |
| 13 | An unknown category is rejected and named | pass |
| 14 | Six messages → warning line, then the full panel and **Start new chat** | pass, with a copy defect |
| 15 | Network off, then send → "You're offline." | pass |
| 16 | Network off mid-Apply → per-row report, button returns as **Try again** | pass |
| 17 | Close the sheet mid-Apply → the board shows the notice anyway | pass |
| 18 | Phone width: the button clears the bottom and is at least 44px | **failed, fixed, re-run** |

## What the passes actually showed

**Check 5.** The plan card collapsed to "Saved. 1 of 1." and the board notice read
"Saved 1 change." in `--mt-text-muted`, measured as `rgb(121, 103, 99)` — the muted
cocoa, not the danger red. The event appeared on Tue 8 Sep without a manual reload,
so the post-apply refetch works.

**Check 11.** The refusal read: "I can only see events from 2026-08-03 to 2026-12-01.
I cannot see March 2027, but I can still add an event on that date if you would like."
That is the exact shape the spec asks for — the window named honestly, and no
implication that adding is blocked.

**Check 16.** With writes failing but reads succeeding, each row reported "The
database refused it." separately, the board notice read "Nothing saved." in
`--mt-danger`, and the button came back as "Try the other 2 again". Pressing it with
the network restored saved both. Separately, killing the network *before* Apply gave
"Could not reach your calendar. Nothing was changed." and returned the button to
"Apply". Neither path left the button stuck on "Saving…".

**Check 17.** The sheet was closed while "Saving…" was on screen. The writes finished
and the board notice landed anyway.

## The three failures

### Check 9 — it guessed which event you meant

Two events both titled "dentist" existed, on 8 September at 15:00 and 10 September at
09:00. "move the dentist to Friday" produced a plan changing one of them, with no
question asked.

This is the failure the design cares most about: a change applied to real data on a
guess, with no way for the person to see that it guessed. The prompt already carried
a paragraph asking it to ask; that paragraph was not strong enough.

Fixed in `30a542f` by firming up the instruction, in line with what the to-do route's
prompt was changed to after its own browser run found the same thing.

Re-run with two events titled `zzcheck`: *"I found two events titled "zzcheck": one on
2026-09-22 at 15:00 and another on 2026-09-24 at 09:00. Which one would you like to
move to Friday, 2026-09-04?"*

### Check 8 — it refused an overlapping event

With a 15:00 event already on that day, `add lunch next Tuesday 3pm` came back as
*"I cannot add that event because I already have a dentist appointment scheduled for
that time."*

No such rule exists. The spec is explicit that a clash never blocks: the browser
checks for overlaps, puts a warning line on the card, and the person decides, because
two things in a day is ordinary. The model had invented a scheduling constraint and
denied something the app allows.

Fixed in the same commit by telling the prompt plainly that overlaps are allowed and
that warning about them is the app's job.

Re-run: the plan card rendered "Add lunch · 2026-09-22 · 15:00" with
"You already have "zzcheck" that day." beneath it and Apply available — the warning
informing rather than blocking.

### Check 18 — the button sat on top of the bottom bar

At 375×812 the button measured 56×56 at 24px from the bottom, spanning y 732–788,
while the fixed Study bar's top edge is at y 754. They overlapped.

`/todo` has no bottom bar, so the to-do button never collided even though it shares
the class string. Only the calendar is affected, because Study is the only section
with a fixed bar down there.

Fixed in `64dc0b0` following the convention `globals.css` already uses for exactly
this — `[data-section='study']` raising the element by
`var(--mt-safe-bottom) + var(--mt-nav-height) + 1.5rem`, the same expression
`.mt-page-pad` uses. No pixel literal, and no section check inside the component.
`assistantAccent.test.ts` reads `globals.css` off disk, so the new rule is pinned by
a test in the same style.

Re-run at 375×812: computed bottom 92px, button spanning y 664–720 against a bar top
of 754 — 34px of clearance. `/todo` still computes 24px, so the rule is correctly
scoped.

## The copy defect

The warning line read "1 messages left in this chat." Fixed in `7ae2c9c`; it now reads
"1 message left in this chat." at one and "2 messages left" at two. This affected the
shipped to-do bot too.

## Left alone, on purpose

When the refetch that runs after Apply fails, `CalendarBoard` drops into its
whole-board "Could not load." screen, which unmounts the assistant and loses the
conversation. That is how the board already behaves for every other caller of its
load function — the manual save, the delete, and the category editor all do the same
— so changing it here would make the assistant the odd one out. Recorded rather than
fixed.

## Not observable by reading, and not settled here

Pressing Apply on an earlier plan card while a later message is still thinking reads a
handle map committed one step later than it used to be. The Task 7 review argued this
is unobservable because `assignHandles` is append-only, so an older map resolves every
handle to the same row it always did. That argument was checked against the code and
holds; it was not reproduced in the browser.

## After the final whole-branch review

The review that followed this run raised two more defects that a browser pass could
plausibly have missed, and both were fixed and re-checked live.

**The Apply-time clash check was reading both people's events.** `fetchEvents()` takes
no owner filter, so the fresh fetch that runs before Apply handed `clashesFor` the
whole shared calendar. The card therefore meant one thing on first render — own rows,
because the board passes an owner-filtered list — and another after Apply, where it
could have quoted Rachel's event back at Jeff. Writes were never affected: the handle
map is built from own rows only, so a partner row can never be a write target. Fixed
by filtering in `fetchFresh`, which already receives the owner.

Re-checked with an overlapping event of Jeff's and an overlapping event of Rachel's on
the same day and hour: the card named Jeff's.

**A delete row had no name on it.** The parser blanks every end-state field on a
delete, so the plan card rendered the bare word "Delete". One delete is survivable
because the summary line above carries the name; three deletes asked the person to
apply three nameless rows against real data, with no undo. Fixed by carrying the live
row's title through `reconcileCalendarPlan`, which already resolves that row.

Re-checked: "delete the zzalpha event" renders as **Delete zzalpha**.

**The clash sentence now belongs to each section.** It read "You already have "X" that
day." for both bots. That is right for a to-do, where a clash really is same-day and
same-title, but wrong for the calendar, where two events on the same day that do not
overlap do not clash at all. The calendar's now reads "You already have "X" at that
time." The to-do wording is unchanged.

Re-checked: the overlap above rendered "You already have "zzalpha" at that time."

Three smaller items went with them: the outside-the-window note moved into `lib` where
a test can reach it and its copy corrected to the plural "months"; two unreachable
lower-bound comparisons in `timeProblem` removed, with tests added that isolate a bad
hour from a bad minute so neither remaining bound can be deleted unnoticed; and a local
`interface Window` renamed so it no longer shadows the DOM global.

Every row created during this second pass was deleted. The calendar is back to its
original 20 events.
