# Cycle tracking — design

**Date:** 2026-08-16
**Status:** Awaiting review
**Builds on:** [2026-08-16-study-timetable-design.md](2026-08-16-study-timetable-design.md)

## 1. Context

`/cycle` ships today as an inert shell: a hardcoded 28-day grid, a fixed "In 6 days",
five symptom chips that do nothing, and a disabled Log button under a `ComingSoon`
note. `HubGrid` lists `/cycle` in `INERT`, so its tile shows no number.

This spec replaces all of it with the real feature. Rachel records when a period
starts and when it stops; the app learns her cycle from that history and predicts the
next one. Two views of the same state, switched by a toggle: a ring that answers
"where am I right now", and a month calendar that answers "when, across the month".

It is the second mutable, shared-visibility feature after Timetable, and it reuses
that spec's shape — Supabase-only, no Dexie, client-side reads and writes. It differs
in one important way: Timetable stores exactly what it displays, while here almost
nothing displayed is stored. Cycle length, phase, and every predicted date are
**derived at render time** from a list of period rows.

## 2. Decisions

Numbering continues from the timetable spec (D17–D30 there).

| # | Decision | Rationale |
|---|---|---|
| **D31** | Both people open the same page and both can log. The period rows carry **no owner column**. | User decision. There is one cycle being tracked, not one per user. A `user_name` column would exist only to always hold the same value. Consequence: the app cannot attribute who pressed the button, and does not try. |
| **D32** | The log button opens a **date picker defaulted to today**, with quick taps for *Today / Yesterday / 2 days ago*. It never records "now" implicitly. | User decision. Forgetting to press the button on day one is the normal case, not the exception. A button that silently means "today" turns a forgotten day into a permanently wrong history that then poisons every future prediction. |
| **D33** | Start and end are recorded **separately**, by a single button that changes meaning: "I got my period" while no period is open, "My period stopped" while one is. | Two buttons would mean one of them is always wrong to press. One button that knows which question it is asking cannot be pressed in the wrong order. |
| **D34** | Cycle length is the **median of the last 6 gaps**, not the mean. Gaps outside **15–60 days** are discarded before the median is taken. | A forgotten log produces one gap of roughly two cycles. A mean absorbs that error and stays wrong for six months; a median ignores it entirely. The 15/60 window catches the two mechanical failures — a double log, and a skipped month — without judging genuinely irregular cycles inside it. |
| **D35** | Period length is the **median of the last 6 finished periods**, discarding lengths outside **1–14 days**. Fallback 5. | Same reasoning as D34. Only periods with an end date count; an open period contributes nothing until it is closed. |
| **D36** | Phases are anchored to the **next** period, not the last one: `ovulationDay = max(L − 14, P + 4)`. | The luteal phase is the stable half of a cycle; the follicular half is what stretches. Counting forward from the last period puts ovulation on day 14 of a 32-day cycle, which is wrong by four days. Counting back from the next period puts it on day 18. The `max` keeps the fertile band clear of the bleed on a short cycle without needing a special case. |
| **D37** | Phase precedence is fixed and ordered: **period → ovulation → follicular → luteal**. | On a short cycle these ranges overlap. An unordered set of `if`s would resolve the overlap by accident of source order. Stating the order makes the collision a defined outcome rather than an emergent one. |
| **D38** | A **recorded period beats the estimate**. If today falls inside a recorded period, the headline is "Period day N" and no countdown is shown. | The one thing the app must never do is tell her a period is 3 days away while she is having it. Recorded fact outranks arithmetic, always. |
| **D39** | The countdown is a **union of four answers** — no data, period day N, in N days, today, N days late — never a signed number. | "In −3 days" is the failure mode of every naive implementation, and *late* is precisely the moment she reaches for the app. Modelling it as a union makes the negative branch unrepresentable rather than merely unlikely. |
| **D40** | **Nothing derived is stored.** No cached cycle length, no materialised predicted dates. Every number is computed from the period rows on each render. | Fixing a mistyped date must fix the ring, the calendar, the hub tile and the history in one action. Any stored derivative is a second place for the truth to live, and a second place for it to rot. |
| **D41** | A date inside a **completed** recorded cycle is drawn using **that cycle's real length**, not the current average. | The past is not a prediction. A month where she had a 34-day cycle should be drawn as a 34-day cycle. Only the current and future cycles use the learned average. |
| **D42** | **Solid means recorded, dashed means predicted.** The two are never merged into one style. | A calendar that renders a guess identically to a fact is worse than one that shows nothing. This rule applies to the ring, the calendar, and the history list alike. |
| **D43** | Days are pushed back visually by **lowering the tint percentage, never by opacity**. | Opacity fades the text with the fill. Muted ink on a 78% tint measures 3.18–3.88:1 and fails AA (§7); the same ink over a 12% tint does not. Recession that cannot damage contrast is the only kind allowed here. |
| **D44** | The ring's coloured arcs are **reinforcement, not the sole carrier of meaning**. The current phase is always named in text in the centre, and a labelled key sits below the ring. | The four pastels measure 1.51–1.97:1 against a white card and cannot meet 3:1 as standalone graphics. Deepening them would break the macaron look for the section's showpiece screen. Naming the phase in words removes the need for the colour to carry it. Recorded and measured rather than assumed. |
| **D45** | **Online only.** No Dexie table, no cache, no write queue. On a failed save the picker **stays open with her date intact** and shows the error inline. | User decision, matching D21. Cycle data is a handful of rows a year, read far more than written; offline support would buy little and cost a merge model for two writers. The failed-save rule is D26 restated: never discard something the user just entered. |
| **D46** | With **zero** history the page shows an empty state and asks for her last period. It does not draw a 28-day prediction. With **one** period logged it predicts, but says it is using a 28-day guess. | A confident ring built on no data is a lie told in a friendly voice. The default only exists so the arithmetic has a value; it must not be presented as knowledge. |
| **D47** | Dates are **plain calendar strings** (`YYYY-MM-DD`) end to end. No `Date` objects cross a function boundary, and no timestamp is ever converted to a date. | `new Date('2026-08-16')` is UTC midnight and renders as the 15th west of Greenwich. "Today" comes from local wall-clock parts; every other operation is string arithmetic in `lib/cycle.ts`. This is the whole class of off-by-one-day bug, closed by construction. |
| **D48** | A **fixed symptom list** of six, stored one row per date holding a JSON array. | Free-text symptoms cannot be counted, coloured, or shown as a calendar mark. Row-per-date-holding-an-array follows D22: a day's set of chips is one document, replaced whole on each toggle. |
| **D49** | The ring/calendar toggle **remembers the last choice** in `localStorage`, read behind `useHasMounted`. | She will have a preference and it will be stable. Same mount guard as `HubGrid`, for the same reason. |
| **D50** | Forward prediction is generated **only far enough to fill the month being viewed**, capped at 12 cycles. | Unbounded projection is meaningless — a prediction 14 months out carries no information — and a cap makes the calendar's cost independent of how far she pages. |
| **D51** | A standing line on the page states these are estimates from dates alone, **not contraception and not medical advice**. | The app displays a fertile window (§4). Showing one without that sentence invites a use it cannot support. |

## 3. Data model

### Supabase

```sql
create table cycle_periods (
  id         uuid primary key default gen_random_uuid(),
  start_date date not null unique,
  end_date   date,
  updated_at timestamptz not null default now(),
  constraint cycle_periods_end_after_start
    check (end_date is null or end_date >= start_date)
);

create table cycle_symptoms (
  date       date primary key,
  symptoms   jsonb not null default '[]'
             check (jsonb_typeof(symptoms) = 'array'),
  updated_at timestamptz not null default now()
);
```

`start_date` is unique: pressing the button twice on the same day cannot create a
second row, so the commonest way to corrupt the history is closed in the schema
rather than in the client.

The `check` on `end_date` is the database half of a rule the client also enforces
(§5). It is worth having twice — the client rule gives a readable message, the
constraint makes the bad state unreachable.

Ownership carries the same caveat as D23: with the anon key in the client bundle and
no Supabase auth, this is a UI convention, not a security boundary.

### Client types

```ts
export interface PeriodLog {
  id: string;
  startDate: string;
  endDate: string | null;
}

export type Phase = 'menstrual' | 'follicular' | 'fertile' | 'luteal';

export type Headline =
  | { kind: 'no-data' }
  | { kind: 'period-day'; day: number }
  | { kind: 'upcoming'; days: number }
  | { kind: 'due-today' }
  | { kind: 'late'; days: number };

export type Confidence = 'none' | 'default' | 'thin' | 'learned';

export interface CycleSummary {
  headline: Headline;
  phase: Phase | null;
  dayOfCycle: number | null;
  cycleLength: number;
  periodLength: number;
  nextStart: string | null;
  confidence: Confidence;
}

export interface PredictedCycle {
  startDate: string;
  endDate: string;
}

export interface CalendarDay {
  date: string;
  phase: Phase | null;
  recorded: boolean;
  predicted: boolean;
  inMonth: boolean;
  isToday: boolean;
  hasSymptoms: boolean;
}
```

`headline` and `phase` are separate on purpose. During a recorded period the headline
is `period-day` while the phase is still `menstrual` — the ring needs both, and
collapsing them would force the ring to re-derive one from the other.

## 4. The maths — `lib/cycle.ts`

Every function here is pure and takes only `PeriodLog[]` plus a `today` string. That
is what makes them testable under Vitest, which has no DOM and renders no components.

**Cycle length** (D34). Sort logs newest first. Take consecutive start-date gaps,
discard any outside 15–60, keep the most recent 6, return the median rounded to a
whole day (even counts average the two middle values, rounding half up). No surviving
gaps → `DEFAULT_CYCLE_LENGTH = 28`.

**Period length** (D35). For logs with an end date, `diffDays(end, start) + 1`.
Discard outside 1–14, keep the most recent 6, median. None → `DEFAULT_PERIOD_LENGTH = 5`.

**Confidence** is the count of surviving gaps: 0 logs → `none`, 0 gaps → `default`,
1 gap → `thin`, 2+ → `learned`. The UI copy differs per value (D46).

**Phase for a day** given cycle length `L`, period length `P`, and 1-based day `d`:

```
ovulationDay   = max(L - 14, P + 4)
fertileStart   = ovulationDay - 3
fertileEnd     = min(ovulationDay + 1, L)

d <= P                            -> menstrual
fertileStart <= d <= fertileEnd   -> fertile
d < fertileStart                  -> follicular
otherwise (including d > L)       -> luteal
```

Evaluated strictly in that order (D37). `max(L − 14, P + 4)` guarantees
`fertileStart >= P + 1`, so the bands never overlap; on a very short cycle the
follicular band is empty, which is a correct outcome and needs no guard.

**Summary.** `dayOfCycle = diffDays(today, lastStart) + 1`.
`nextStart = addDays(lastStart, L)`. Then:

- no logs → `{ kind: 'no-data' }`, phase `null`
- today inside a recorded period — between `startDate` and `endDate`, or on/after
  `startDate` of an open log → `{ kind: 'period-day', day }` (D38)
- else compare `nextStart` to today → `upcoming` / `due-today` / `late` (D39)

**Calendar days.** For a visible month, each date resolves as: recorded period day →
predicted period day → phase of the cycle it falls in. A date between two recorded
starts uses that pair's actual gap as `L` (D41); a date after the last recorded start
uses the learned `L`. Dates before the first recorded start get `phase: null` — the
app knows nothing about them and says so by drawing nothing.

**Input rules**, also pure and also tested: no date in the future; an end date not
before its start; a new start not before the latest existing start; no duplicate
start date.

## 5. Components

```
src/app/(life)/cycle/page.tsx    thin: PageShell + <CycleBoard />
src/components/cycle/
  CycleBoard.tsx     'use client'. Loads rows, owns view toggle and selected day.
  CycleRing.tsx      the ring
  CycleCalendar.tsx  the month
  LogPeriodModal.tsx the date picker
  PeriodHistory.tsx  editable list
  SymptomChips.tsx   the six chips for one date
src/lib/cycle.ts        maths and rules
src/lib/cycleColors.ts  the four phase literals, for SVG
src/lib/cycleRepo.ts    Supabase reads and writes
```

`CycleBoard` is the only component that talks to Supabase, holds the four states of
timetable D25 (loading, error, empty, loaded), and passes plain data down. Everything
below it is a pure function of its props.

`cycleRepo.ts` loads all period rows — there are a few dozen a year, so paging them
would be premature — and the symptom rows for the month currently on screen, refetching
when she pages to a different month.

### Ring view

SVG, `viewBox="0 0 220 220"`, radius 78, stroke 17, rounded caps, arcs computed from
the phase boundaries of §4 with a small white gap between neighbours. A heart marker
rides the ring at today's angle: a white circle with a 2.5px cocoa outline
(13.04:1 against the card) so the one element she must locate is the highest-contrast
thing on the screen. The centre carries the phase name, the headline number, and its
unit; beneath the ring sit "Day 23 of 29 · expected Sun 23 Aug" and the labelled
colour key required by D44.

### Calendar view

Monday-first month grid, arrows to page. Same-phase days in a row **join into one
stripe**: border radius is applied only at the ends of a run, and the column gap is
zero, so a fortnight of luteal reads as one band rather than fourteen tiles.

Non-period phases fill at 26%, period at 78%, predicted period at 18% behind a dashed
pink outline drawn around the whole run (D42). Out-of-month days fill at 12% (D43).
Day numbers are always cocoa. Fertile days carry a small gold dot; days with symptoms
carry a small mark. Tapping a day selects it and opens the symptom strip beneath.

### Logging

`LogPeriodModal` uses the existing `Modal`. A native date input defaulted to today,
three quick-set buttons, Cancel and Save. Its title and the field's meaning come from
whether a period is currently open (D33). Save failure leaves everything on screen
and renders the error inline (D45).

`PeriodHistory` lists the last 12 as "25 Jul – 29 Jul · 5 days · 29-day cycle", each
row opening the same modal in edit mode, with Delete. An open period renders as
"25 Jul – ongoing".

### Elsewhere

`HubGrid` drops `/cycle` from `INERT` and its tile renders the headline: *Period in 7
days*, *Period today*, *3 days late*, *Day 2 of period*, or *Not set up yet*.

## 6. Colours

Four new raw tokens in `globals.css`, each equal to a hue the palette already owns, so
the perceptual separation `accents.test.ts` already guards is inherited rather than
re-argued:

| token | value | same as |
|---|---|---|
| `--mac-cycle-menstrual` | `#F2A7BE` | cycle accent |
| `--mac-cycle-follicular` | `#A8DCD1` | countdown accent |
| `--mac-cycle-fertile` | `#F0CE87` | flexible accent |
| `--mac-cycle-luteal` | `#C4B0E0` | dashboard accent |

`cycleColors.ts` holds the literals the SVG needs before CSS resolves, pinned to those
tokens by test — the `heatmapTheme.ts` pattern, for the same reason.

## 7. Contrast

Measured, not assumed. Cocoa `#3B2E2A` on every fill used:

| fill | contrast |
|---|---|
| menstrual 78% `#F5BACC` | 7.94:1 |
| luteal 78% `#D1C1E7` | 7.76:1 |
| follicular 78% `#BBE4DB` | 9.46:1 |
| fertile 78% `#F3D9A1` | 9.47:1 |
| any phase at 26% | 11.07–11.74:1 |
| predicted 18% pink | 11.69:1 |

All pass AA comfortably, and the out-of-month 12% fills only lighten further, so they
sit above the 26% row rather than below it. Muted `#796763` on the same 78% fills measures **3.18–3.88:1
and fails**, which is why day numbers are cocoa at every tint and why recession uses
tint rather than opacity (D43).

The ring arcs measure 1.51–1.97:1 against a white card. Accepted under D44 on the
condition that the phase is named in text both in the ring's centre and in the key
below it, so no information depends on telling the colours apart.

## 8. Testing

Vitest, pure functions only, `cycle.test.ts` beside the source.

- median with 0, 1, 2, 5, 6 and 9 gaps, including the even-count rounding rule
- a 58-day gap discarded; a 3-day gap discarded; a 21-day and a 40-day gap kept
- period length ignoring open logs, and rejecting a 20-day length
- phase boundaries at `L = 21`, `28`, `35`; the fertile band never overlapping the bleed
- precedence: on a 21-day cycle with a 6-day period, day 6 is menstrual, not fertile
- `d > L` returning luteal, not undefined
- all five headline kinds, with an explicit test that no path yields a negative count
- a recorded period covering today outranking a `late` estimate
- an open period with no end still counted as ongoing
- input rules: future date, end before start, start before previous start, duplicate start
- a completed cycle rendered at its own length, not the current average (D41)
- forward prediction covering a month three cycles out, and capped at 12
- `cycleColors.ts` literals matching `globals.css`

When a bug is found later, its test is written to fail against the bug first.

## 9. Out of scope

- Notifications or reminders — user decision; the app has no notification code at all
- A user-set cycle length override (approach B in brainstorming); the learned value stands alone
- A variability range on the prediction ("give or take 2 days")
- Symptom history, trends, or charts — chips are recorded and shown per day, nothing more
- Flow heaviness, mood scales, temperature, or any other logged measure
- Offline reading or queued writes (D45)
- Per-user auth, which is what D31 and D23 would need to become enforceable
- Any use of `updated_at` in the UI
