# Study timetable — design

**Date:** 2026-08-16
**Status:** Awaiting review
**Builds on:** [2026-08-15-focus-grouping-nav-design.md](2026-08-15-focus-grouping-nav-design.md)

## 1. Context

D14 of the focus-grouping spec shipped `/study/timetable` as an inert styled shell,
deferring the real build because it "needs new Supabase tables, two-user sync and
offline handling". This spec builds it, and drops the offline half of that sentence
by user decision (D21).

The page's job is narrow: each night, Jeff and Rachel each write down what they are
doing tomorrow, and each can see the other's list. Your list is on top, your
partner's below, and you can only write your own.

This is the first **mutable, cross-owner** data in the app. Everything existing
(`focus_sessions`) is append-only and single-owner: `pushSessions` only inserts,
`pullSessions` only reads `.eq('user_name', userName)`. No existing sync machinery
transfers to this problem, so none of it is reused.

## 2. Decisions

Numbering continues from the focus-grouping spec (D9–D16 there).

| # | Decision | Rationale |
|---|---|---|
| **D17** | A timetable is a **per-day plan**, not a recurring weekly schedule. | User decision. Removes the weekly-skeleton-plus-override model and the "just today or every week?" prompt on every edit. |
| **D18** | **No dates are stored.** There are exactly two lists, each meaning "what I am doing tomorrow". They are overwritten in place each night. | User decision. Nothing accumulates, so nothing needs expiry, date navigation, or history. The list *is* the current state. |
| **D19** | **No staleness indicator.** A list not updated in three days is visually identical to one written an hour ago. | User decision, made against a recommendation to show a relative timestamp per pane. Accepted risk: a stale pane looks confident and wrong. Mitigated socially, not in software. `updated_at` is still stored, so surfacing it later is a UI change only. |
| **D20** | The time field is **free text**, one column. Rows keep the order they were typed. | User decision. Handles "after dinner" and "9-11am" equally, at the cost of the app being unable to sort or compare the two lists. No drag-to-reorder: the list is retyped nightly, so moving a row means retyping it. |
| **D21** | **Online-only.** No Dexie table, no cache, no write queue. Fetch on load, upsert on save, refresh to see changes. | User decision, reversing an earlier choice of local-first. Deletes the sync module, the `pendingPush` flag, and all merge-conflict logic. Accepted cost: the page is useless without a connection, and Save can fail — so the editor must survive a failed save (D26). |
| **D22** | One Supabase row **per person**, with entries as a `jsonb` array — not one row per entry. | A save is a whole-document replace: order carries meaning and no individual entry has an identity worth preserving across a rewrite. Row-per-entry would force the client to diff added, removed and reordered rows to achieve what one `upsert` does. |
| **D23** | Ownership is a **UI convention, not a security boundary**. | With the anon key in the client bundle and no Supabase auth, both people are the same anonymous Postgres role. RLS cannot tell them apart, so it cannot enforce this. Written down rather than implied. |
| **D24** | Fetch and save both run **client-side**. | Forced, not stylistic: `me` is `localStorage.getItem('user_name')`, so a Server Component cannot know which pane goes on top. A server action was considered and rejected — it would take `userName` as a parameter anyway, so it adds a round trip and no enforcement. |
| **D25** | Each pane has **four states**: loading, error, empty, loaded. | Without a cache, a failed fetch and an empty timetable are the same blank pane. Rendering "nothing planned" when the request actually failed is a correctness bug, not a styling gap. |
| **D26** | On save failure the editor **stays open with the typed rows intact**, showing the error inline. | Losing text the user just typed because the connection dropped is the one unforgivable failure in this form. |
| **D27** | **Clear all empties the draft, not the database.** Cancel restores; only Save commits. | Makes the destructive-sounding button reversible until the moment of save, which removes the need for a confirmation dialog. |
| **D28** | Edit replaces the top card's body **inline**. No modal. | On a phone, a modal holding N paired inputs with the keyboard raised is a cramped scroll box. The card is already full width, so a modal costs context and buys nothing. |
| **D29** | The partner pane has **no Edit button at all**, not a disabled one. | A greyed button invites a tap and then explains a rule. Absence states the rule without needing to. |
| **D30** | Panes stay **stacked at every width**. | User's described layout. Side-by-side at desktop was not requested and would give the two panes different reading orders on different devices. |

## 3. Data model

### Supabase

```sql
create table timetables (
  user_name  text primary key,
  entries    jsonb not null default '[]' check (jsonb_typeof(entries) = 'array'),
  updated_at timestamptz not null default now()
);
```

Two rows exist, ever. `user_name` as the primary key makes `upsert` a one-liner and
duplicate rows structurally impossible.

`entries` is an ordered JSON array:

```json
[
  { "time": "09:00-11:00", "activity": "Lectures" },
  { "time": "after lunch", "activity": "Lab session" }
]
```

The `create table` statement is run against Supabase by the user; the implementation
has no credentials. The statement is also appended to the schema comment in
`src/lib/supabase.ts`, matching how `focus_sessions` is documented.

### Client types

```ts
export interface TimetableEntry {
  time: string;
  activity: string;
}
```

There is no local persistence layer (D21). `src/db/db.ts` is untouched.

## 4. Data flow

**Load.** `TimetableBoard` mounts, reads identity through `useHasMounted` plus
`localStorage.getItem('user_name')` — the pattern `HubGrid` already uses — and derives
`me` and `partnerOf(me)`. It then fetches both rows in a single query:

```ts
supabase.from('timetables').select('user_name, entries').in('user_name', USERS)
```

and splits the result into the top and bottom pane. A person with no row yet is not
an error; it is the empty state.

**Save.** Normalize the draft, then upsert only `me`'s row:

```ts
supabase.from('timetables').upsert({
  user_name: me,
  entries,
  updated_at: new Date().toISOString(),
})
```

On success the editor closes and the pane re-renders from the saved entries without
a refetch. On failure, D26 applies.

**Normalization.** `normalizeEntries` trims both fields, then keeps a row *iff* its
activity is non-empty after trimming. A row with a time and no activity is noise; a
row with an activity and no time is legitimate and survives. Order is preserved.

## 5. Components

```
src/app/study/timetable/page.tsx      Server Component: PageShell + TimetableBoard
src/components/timetable/
  TimetableBoard.tsx                  'use client' — identity, fetch, save, both panes
  TimetablePane.tsx                   presentational; the four states of D25
  TimetableEditor.tsx                 draft rows, add/remove/clear, inline save error
src/lib/identity.ts                   USERS, partnerOf
src/lib/timetable.ts                  TimetableEntry, normalizeEntries
```

Both `lib` modules get a sibling `*.test.ts` (§6).

`TimetableBoard` is the sole `'use client'` boundary; `TimetablePane` and
`TimetableEditor` are pulled into the client bundle through it and carry no directive
of their own.

`identity.ts` exists because the Jeff/Rachel pair is currently hardcoded inside
`Gatekeeper`, and this feature needs both the list and a partner lookup. The six
existing direct `localStorage.getItem('user_name')` reads are **not** retrofitted —
that is unrelated refactoring.

### Read mode

```
┌─ Jeff · You ──────────────── [Edit] ─┐
│  09:00-11:00   Lectures              │
│  after lunch   Lab session           │
└──────────────────────────────────────┘
┌─ Rachel ─────────────────────────────┐
│  9-1pm         Library               │
│  evening       Free                  │
└──────────────────────────────────────┘
```

Two columns in a `grid-cols-[auto_1fr]`, matching the existing mock's structure.
`PageShell` carries `accent="timetable"`.

### Edit mode

The top card's body is replaced by the draft rows. Each row is a short time input, a
wide activity input, and a remove control at 44px. Below: a dashed "Add row" that
appends a row and focuses its time input, then Cancel and Save, with Clear all as a
quiet text button.

Opening the editor on an empty list seeds one blank row, so the first thing shown is
somewhere to type rather than a lone button.

Inputs carry `sr-only` labels naming the row and field.

## 6. Testing

Vitest runs pure functions only — no DOM, no component rendering — so the assertable
logic is extracted into `lib/`.

Tests sit beside their source, so this is two files.

`src/lib/identity.test.ts`:

- `partnerOf` resolves in both directions

`src/lib/timetable.test.ts`:

- `normalizeEntries` trims whitespace from both fields
- `normalizeEntries` drops rows whose activity is empty after trimming
- `normalizeEntries` keeps rows that have an activity but no time
- `normalizeEntries` preserves input order

The timetable accent is already pinned in `accents.test.ts`; nothing is added there.

The states of D25 and the save-failure behaviour of D26 are component behaviour and
cannot be covered by this suite. They go on the human verification checklist.

## 7. Out of scope

- Any use of the stored `updated_at` in the UI (D19)
- Sorting, overlap detection, or "is she free at 3?" comparison — impossible under
  free-text times (D20)
- Offline reading or queued writes (D21)
- Reordering rows by drag (D20)
- Retrofitting existing `localStorage` identity reads (§5)
- Real per-user auth, which is what D23 would need to become enforceable
