# Study Timetable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/study/timetable` from an inert mock into two live lists — yours on top with an Edit button, your partner's below and read-only — stored in a new Supabase `timetables` table.

**Architecture:** Online-only. A single `'use client'` board reads the signed-in name from `localStorage` (the server cannot know it), fetches both rows in one query, and renders two stacked panes. Editing replaces the top pane's body inline with a draft-row form; Save upserts only your own row. No Dexie, no cache, no queue. The only node-testable logic — partner lookup and draft normalization — is extracted into `src/lib/`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4, `@supabase/supabase-js`, `lucide-react`, vitest (node environment).

**Spec:** [docs/superpowers/specs/2026-08-16-study-timetable-design.md](../specs/2026-08-16-study-timetable-design.md)

## Global Constraints

- **Commits are authored by Jeff alone. Never add a `Co-Authored-By` trailer or any other generated-with attribution.**
- **Do not write comments in new code.** Names and structure carry the meaning. (This applies to the TypeScript/TSX you write; the SQL comment block in `supabase.ts` is existing documentation being extended.)
- **Never hardcode a colour.** Use `--mt-*` semantic tokens only. `--mac-*` raw tokens are referenced only inside `globals.css`. Tokens this plan uses, all confirmed present: `--mt-text`, `--mt-text-muted`, `--mt-text-subtle`, `--mt-border`, `--mt-surface`, `--mt-accent`, `--mt-accent-contrast`, `--mt-danger`.
- **Touch targets at least 44px** — `min-h-11` on every button and input.
- **Server Components by default.** `'use client'` goes on `TimetableBoard.tsx` only; `TimetablePane` and `TimetableEditor` are pulled into the client bundle through it and carry no directive.
- **Avoid overly defensive programming.** No guards for states the types already exclude. **Avoid `instanceof` and `typeof` shape-discrimination** — model unions properly and narrow on a discriminant field.
- **Vitest runs in a node environment with no DOM.** `include` is `src/**/*.test.ts` (not `.tsx`). Component behaviour cannot be unit-tested; it goes on the human verification checklist in Task 6.
- **The existing suite must stay green: 132 tests across 11 files.** This work adds tests and must not change existing ones.
- **Never start the dev server with a raw shell command.** Use the preview tooling so the browser attaches.
- **Task 3 requires a human to run SQL against Supabase.** Tasks 4 and 5 cannot be verified in a browser until it is done.
- Ownership is a UI convention, not a security boundary (spec D23). Do not add code that pretends otherwise.

---

### Task 1: Identity module

The Jeff/Rachel pair is currently hardcoded inside `Gatekeeper.tsx`. This feature needs both the list and a partner lookup, so they move into a pure module that vitest can reach. The six existing direct `localStorage.getItem('user_name')` reads elsewhere in the app are **not** touched — that is unrelated refactoring.

Note `src/lib/sessionOwnership.ts` already exists and is unrelated: it decides which *timer mode* owns a session, not which person is signed in. Do not put identity code there.

**Files:**
- Create: `src/lib/identity.ts`
- Test: `src/lib/identity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `USERS: readonly ['Jeff', 'Rachel']`, `type UserName = 'Jeff' | 'Rachel'`, `partnerOf(user: UserName): UserName`, `isUserName(value: string | null): value is UserName` — all from `@/lib/identity`. Tasks 4 and 5 use all four.

- [ ] **Step 1: Write the failing test**

Create `src/lib/identity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { USERS, isUserName, partnerOf } from './identity';

describe('USERS', () => {
  it('holds exactly the two people who use the app', () => {
    expect(USERS).toEqual(['Jeff', 'Rachel']);
  });
});

describe('partnerOf', () => {
  it('resolves Jeff to Rachel', () => {
    expect(partnerOf('Jeff')).toBe('Rachel');
  });

  it('resolves Rachel to Jeff', () => {
    expect(partnerOf('Rachel')).toBe('Jeff');
  });
});

describe('isUserName', () => {
  it('accepts a stored name that matches a user', () => {
    expect(isUserName('Jeff')).toBe(true);
    expect(isUserName('Rachel')).toBe(true);
  });

  it('rejects a missing or unrecognised stored value', () => {
    expect(isUserName(null)).toBe(false);
    expect(isUserName('')).toBe(false);
    expect(isUserName('jeff')).toBe(false);
    expect(isUserName('Somebody')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/identity.test.ts
```

Expected: FAIL — `Failed to resolve import "./identity"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/identity.ts`:

```ts
export const USERS = ['Jeff', 'Rachel'] as const;

export type UserName = (typeof USERS)[number];

export function partnerOf(user: UserName): UserName {
  return user === 'Jeff' ? 'Rachel' : 'Jeff';
}

export function isUserName(value: string | null): value is UserName {
  return value === 'Jeff' || value === 'Rachel';
}
```

`isUserName` is a boundary parser, not a defensive guard: `localStorage.getItem` genuinely returns `string | null`, so the invalid state is not excluded by the types.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/identity.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/identity.ts src/lib/identity.test.ts
git commit -m "feat: add an identity module with the partner lookup"
```

---

### Task 2: Draft normalization

The one piece of real logic in the feature: deciding which typed rows survive a save. A row with a time and no activity is noise; a row with an activity and no time ("gym, whenever") is legitimate under free-text times and must survive.

**Files:**
- Create: `src/lib/timetable.ts`
- Test: `src/lib/timetable.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `interface TimetableEntry { time: string; activity: string }` and `normalizeEntries(entries: TimetableEntry[]): TimetableEntry[]` from `@/lib/timetable`. Tasks 4 and 5 both import `TimetableEntry`; Task 5 calls `normalizeEntries`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/timetable.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeEntries } from './timetable';

describe('normalizeEntries', () => {
  it('trims whitespace from both fields', () => {
    expect(
      normalizeEntries([{ time: '  09:00-11:00 ', activity: ' Lectures  ' }]),
    ).toEqual([{ time: '09:00-11:00', activity: 'Lectures' }]);
  });

  it('drops rows whose activity is empty after trimming', () => {
    expect(
      normalizeEntries([
        { time: '09:00', activity: '' },
        { time: '10:00', activity: '   ' },
        { time: '', activity: '' },
      ]),
    ).toEqual([]);
  });

  it('keeps a row that has an activity but no time', () => {
    expect(normalizeEntries([{ time: '   ', activity: 'Gym' }])).toEqual([
      { time: '', activity: 'Gym' },
    ]);
  });

  it('preserves the order the rows were typed in', () => {
    expect(
      normalizeEntries([
        { time: 'evening', activity: 'Dinner' },
        { time: '09:00', activity: 'Lectures' },
        { time: 'after lunch', activity: 'Lab' },
      ]),
    ).toEqual([
      { time: 'evening', activity: 'Dinner' },
      { time: '09:00', activity: 'Lectures' },
      { time: 'after lunch', activity: 'Lab' },
    ]);
  });

  it('returns an empty list for an empty draft', () => {
    expect(normalizeEntries([])).toEqual([]);
  });
});
```

The order test deliberately uses times that are *not* chronological. Free-text times cannot be sorted (spec D20), and this test is what fails if someone later adds sorting.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/timetable.test.ts
```

Expected: FAIL — `Failed to resolve import "./timetable"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/timetable.ts`:

```ts
export interface TimetableEntry {
  time: string;
  activity: string;
}

export function normalizeEntries(entries: TimetableEntry[]): TimetableEntry[] {
  return entries
    .map((entry) => ({
      time: entry.time.trim(),
      activity: entry.activity.trim(),
    }))
    .filter((entry) => entry.activity.length > 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/timetable.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Run the whole suite to confirm no regression**

```bash
npm test
```

Expected: PASS — 142 tests across 13 files (132 existing + 5 from Task 1 + 5 here).

- [ ] **Step 6: Commit**

```bash
git add src/lib/timetable.ts src/lib/timetable.test.ts
git commit -m "feat: normalize timetable draft rows on save"
```

---

### Task 3: The Supabase table

Creates the storage. **This task includes a step only a human can perform** — the implementation has no Supabase credentials. Tasks 4 and 5 will render a permanent error state until this is done.

RLS is enabled with permissive `anon` policies for select/insert/update. This is deliberate and consistent with spec D23: RLS cannot distinguish Jeff from Rachel because both are the same anonymous Postgres role, so the policies grant what the app needs and nothing more. There is no delete policy — "Clear all" saves an empty array, it does not delete the row.

**Files:**
- Modify: `src/lib/supabase.ts` (append to the trailing schema comment block)

**Interfaces:**
- Consumes: nothing.
- Produces: a `timetables` table with columns `user_name text primary key`, `entries jsonb not null default '[]'`, `updated_at timestamptz not null default now()`. Task 4 selects `user_name, entries`; Task 5 upserts all three.

- [ ] **Step 1: Add the schema to the documentation block**

`src/lib/supabase.ts` ends with a block comment documenting the `focus_sessions` schema. Extend that same block so both tables are documented together. The file's closing `*/` moves to the end of the new SQL.

The block below is fenced with four backticks because its contents include three-backtick fences; write the inner content into the file, not the outer fence:

````ts
/*
Supabase Schema for focus_sessions:

```sql
create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  duration_minutes integer not null, -- CHECK (duration_minutes > 0 AND duration_minutes <= 1440)
  task_name text,
  created_at timestamptz default now()
);
```

Supabase Schema for timetables (one row per person, replaced whole on save):

```sql
create table timetables (
  user_name  text primary key,
  entries    jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table timetables enable row level security;

create policy "anon reads timetables"
  on timetables for select to anon using (true);

create policy "anon inserts timetables"
  on timetables for insert to anon with check (true);

create policy "anon updates timetables"
  on timetables for update to anon using (true) with check (true);
```
*/
````

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
```

Expected: no output. The change is inside a comment, so this only confirms the block was closed correctly and the file still parses.

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: HUMAN STEP — run the SQL in Supabase**

Open the Supabase dashboard → SQL Editor, paste everything between the ```sql fences added in Step 1 (the `timetables` block only — `focus_sessions` already exists), and run it.

- [ ] **Step 4: HUMAN STEP — verify the table exists and is readable by the anon role**

In the same SQL Editor:

```sql
select * from timetables;
```

Expected: the query succeeds and returns 0 rows. An error here means the table was not created; 0 rows is the correct starting state, because upsert creates each person's row on their first save.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "docs: record the timetables schema alongside focus_sessions"
```

---

### Task 4: Read-only board

The first browser-visible milestone: both lists render, yours on top. No editing yet. This task delivers the four pane states of spec D25, which is the part that is easy to skip and expensive to retrofit.

**Files:**
- Create: `src/components/timetable/TimetablePane.tsx`
- Create: `src/components/timetable/TimetableBoard.tsx`
- Modify: `src/app/study/timetable/page.tsx` (replace the whole file — the mock `PLAN` array, the inert "Add to tomorrow" button and the `ComingSoon` block all go)

**Interfaces:**
- Consumes: `USERS`, `isUserName`, `partnerOf`, `UserName` from `@/lib/identity` (Task 1); `TimetableEntry` from `@/lib/timetable` (Task 2); the `timetables` table (Task 3); existing `Card` from `@/components/ui/Card`, `PageShell` from `@/components/ui/PageShell`, `useHasMounted` from `@/hooks/useHasMounted`, `supabase` from `@/lib/supabase`.
- Produces: `TimetablePane` (default export) and `type PaneState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: TimetableEntry[] }` from `@/components/timetable/TimetablePane`. `TimetableBoard` (default export) from `@/components/timetable/TimetableBoard`. Task 5 adds an editor into the `body` prop of `TimetablePane` and the save handler inside `TimetableBoard`.

`TimetablePane` props, in full, because Task 5 passes two of them:

```ts
{
  name: string;
  isMine: boolean;
  state: PaneState;
  onRetry: () => void;
  action?: ReactNode;
  body?: ReactNode;
}
```

`action` renders in the header beside the name; `body`, when supplied, replaces the state-driven rows entirely. Both are unused in this task and exist for Task 5.

- [ ] **Step 1: Create the pane**

There is no DOM in the test environment, so this component has no unit test. Its states are verified in the browser in Step 4 and pinned on the checklist in Task 6.

Create `src/components/timetable/TimetablePane.tsx`:

```tsx
import { Fragment, type ReactNode } from 'react';
import Card from '@/components/ui/Card';
import type { TimetableEntry } from '@/lib/timetable';

export type PaneState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: TimetableEntry[] };

export default function TimetablePane({
  name,
  isMine,
  state,
  onRetry,
  action,
  body,
}: {
  name: string;
  isMine: boolean;
  state: PaneState;
  onRetry: () => void;
  action?: ReactNode;
  body?: ReactNode;
}) {
  return (
    <Card className="mb-4">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--mt-text)]">
          {name}
          {isMine && (
            <span className="ml-2 text-xs font-normal text-[var(--mt-text-subtle)]">
              You
            </span>
          )}
        </h2>
        {action}
      </div>
      {body ?? <PaneBody state={state} name={name} onRetry={onRetry} />}
    </Card>
  );
}

function PaneBody({
  state,
  name,
  onRetry,
}: {
  state: PaneState;
  name: string;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-5 rounded-md bg-[color-mix(in_srgb,var(--mt-text)_8%,transparent)]"
          />
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--mt-danger)]" role="alert">
          Couldn&apos;t load {name}&apos;s timetable.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.entries.length === 0) {
    return (
      <p className="text-sm text-[var(--mt-text-muted)]">Nothing planned yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      {state.entries.map((entry, index) => (
        <Fragment key={index}>
          <div className="text-xs text-[var(--mt-text-muted)]">
            {entry.time || '—'}
          </div>
          <div className="text-sm text-[var(--mt-text)]">{entry.activity}</div>
        </Fragment>
      ))}
    </div>
  );
}
```

The `status` chain narrows a discriminated union — that is the sanctioned pattern, not the banned `typeof` shape-discrimination. Index keys are correct here: the list is read-only and replaced wholesale on save.

- [ ] **Step 2: Create the board**

Create `src/components/timetable/TimetableBoard.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { USERS, isUserName, partnerOf, type UserName } from '@/lib/identity';
import type { TimetableEntry } from '@/lib/timetable';
import { useHasMounted } from '@/hooks/useHasMounted';
import TimetablePane, { type PaneState } from './TimetablePane';

interface TimetableRow {
  user_name: UserName;
  entries: TimetableEntry[];
}

type Entries = Record<UserName, TimetableEntry[]>;

export default function TimetableBoard() {
  const mounted = useHasMounted();
  const stored = mounted ? localStorage.getItem('user_name') : null;
  const me = isUserName(stored) ? stored : null;

  const [entries, setEntries] = useState<Entries | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setEntries(null);

    const { data, error } = await supabase
      .from('timetables')
      .select('user_name, entries')
      .in('user_name', [...USERS]);

    if (error) {
      console.error('Failed to load timetables:', error);
      setFailed(true);
      return;
    }

    const rows = (data || []) as TimetableRow[];
    const next: Entries = { Jeff: [], Rachel: [] };
    for (const row of rows) next[row.user_name] = row.entries;
    setEntries(next);
  }, []);

  useEffect(() => {
    if (!me) return;
    load();
  }, [me, load]);

  if (!me) return null;

  const stateFor = (user: UserName): PaneState => {
    if (failed) return { status: 'error' };
    if (!entries) return { status: 'loading' };
    return { status: 'ready', entries: entries[user] };
  };

  return (
    <div className="mb-4">
      <TimetablePane name={me} isMine state={stateFor(me)} onRetry={load} />
      <TimetablePane
        name={partnerOf(me)}
        isMine={false}
        state={stateFor(partnerOf(me))}
        onRetry={load}
      />
    </div>
  );
}
```

`[...USERS]` copies the readonly tuple because `.in()` takes a mutable array. Casting the Supabase result is the house pattern — `pullSessions` in `src/lib/sync.ts` does the same.

- [ ] **Step 3: Wire the page and delete the mock**

Replace the entire contents of `src/app/study/timetable/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import TimetableBoard from '@/components/timetable/TimetableBoard';

export default function TimetablePage() {
  return (
    <PageShell
      title="Timetable"
      subtitle="What we're each doing tomorrow"
      accent="timetable"
    >
      <TimetableBoard />
    </PageShell>
  );
}
```

Leave `src/components/ui/ComingSoon.tsx` in place — the five Life shells still import it.

- [ ] **Step 4: Typecheck, lint, and run the suite**

```bash
npx tsc --noEmit
```

Expected: no output.

```bash
npm run lint
```

Expected: no errors.

```bash
npm test
```

Expected: PASS — 142 tests across 13 files, unchanged from Task 2.

- [ ] **Step 5: Verify in the browser**

Start the dev server through the preview tooling (never a raw shell command), then open `/study/timetable`.

Check, in order:
1. On first paint the panes show three grey skeleton bars, not an empty table.
2. Both panes settle on "Nothing planned yet." — correct, since Task 3 left the table empty.
3. Your own name is on top with a "You" marker; your partner's is below.
4. The partner pane has no Edit button (neither does yours yet).
5. In Supabase, run `insert into timetables (user_name, entries) values ('Rachel', '[{"time":"9-1pm","activity":"Library"}]'::jsonb);` then reload — the bottom pane shows that row. (Substitute whichever name is *not* the one you are signed in as.)
6. Temporarily switch the browser to offline in devtools and reload: both panes show "Couldn't load …" with a Retry button. Go back online, press Retry, and the rows return.

- [ ] **Step 6: Commit**

```bash
git add src/components/timetable/TimetablePane.tsx src/components/timetable/TimetableBoard.tsx src/app/study/timetable/page.tsx
git commit -m "feat: render both timetables from Supabase"
```

---

### Task 5: The editor

Adds the Edit button, the draft form, and Save. The two behaviours worth being careful about:

- **Edit only appears when your own pane is `ready`.** Editing a list you failed to load and then saving would overwrite your real rows with an empty draft. Gating the button on `status === 'ready'` is what prevents that.
- **A failed save keeps the editor open with the typed rows intact** (spec D26).

**Files:**
- Create: `src/components/timetable/TimetableEditor.tsx`
- Modify: `src/components/timetable/TimetableBoard.tsx` (add editing state, the Edit button, and the save handler)

**Interfaces:**
- Consumes: `TimetableEntry` and `normalizeEntries` from `@/lib/timetable` (Task 2); `TimetablePane`'s `action` and `body` props (Task 4).
- Produces: `TimetableEditor` (default export) from `@/components/timetable/TimetableEditor`, with props:

```ts
{
  initialEntries: TimetableEntry[];
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (entries: TimetableEntry[]) => void;
}
```

`onSave` receives entries **already normalized** — the board writes them to Supabase unchanged.

- [ ] **Step 1: Create the editor**

Create `src/components/timetable/TimetableEditor.tsx`:

```tsx
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeEntries, type TimetableEntry } from '@/lib/timetable';

interface DraftRow {
  id: number;
  time: string;
  activity: string;
}

export default function TimetableEditor({
  initialEntries,
  isSaving,
  error,
  onCancel,
  onSave,
}: {
  initialEntries: TimetableEntry[];
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (entries: TimetableEntry[]) => void;
}) {
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initialEntries.length > 0
      ? initialEntries.map((entry, index) => ({ id: index, ...entry }))
      : [{ id: 0, time: '', activity: '' }],
  );
  const [focusId, setFocusId] = useState<number | null>(null);
  const nextId = useRef(Math.max(initialEntries.length, 1));

  const addRow = () => {
    const id = nextId.current++;
    setRows((current) => [...current, { id, time: '', activity: '' }]);
    setFocusId(id);
  };

  const updateRow = (id: number, patch: Partial<DraftRow>) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (id: number) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const inputClass =
    'min-h-11 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-[7rem_1fr_auto] gap-2">
            <label className="sr-only" htmlFor={`time-${row.id}`}>
              Time for row {index + 1}
            </label>
            <input
              id={`time-${row.id}`}
              value={row.time}
              autoFocus={row.id === focusId}
              onChange={(e) => updateRow(row.id, { time: e.target.value })}
              placeholder="9-11am"
              className={inputClass}
            />
            <label className="sr-only" htmlFor={`activity-${row.id}`}>
              Activity for row {index + 1}
            </label>
            <input
              id={`activity-${row.id}`}
              value={row.activity}
              onChange={(e) => updateRow(row.id, { activity: e.target.value })}
              placeholder="Lectures"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove row ${index + 1}`}
              className="flex min-h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text-subtle)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="min-h-11 rounded-xl border border-dashed border-[var(--mt-border)] text-sm font-semibold text-[var(--mt-text-muted)]"
      >
        Add row
      </button>

      {error && (
        <p className="text-sm text-[var(--mt-danger)]" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRows([])}
          className="min-h-11 px-2 text-sm text-[var(--mt-text-subtle)]"
        >
          Clear all
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onSave(
              normalizeEntries(
                rows.map((row) => ({ time: row.time, activity: row.activity })),
              ),
            )
          }
          className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
```

Draft rows carry a stable `id` rather than using the array index, because add and remove would otherwise reassign keys and move the caret between inputs mid-edit. "Clear all" empties the draft only — Cancel restores, and nothing reaches Supabase until Save, which is why no confirmation dialog is needed.

`autoFocus` is safe against this project's ESLint config — `src/components/Gatekeeper.tsx` already uses it on the password input and passes `npm run lint`.

- [ ] **Step 2: Wire editing into the board**

In `src/components/timetable/TimetableBoard.tsx`, add the two imports:

```tsx
import { Pencil } from 'lucide-react';
import TimetableEditor from './TimetableEditor';
```

Add three state hooks beside the existing ones, above the `load` callback:

```tsx
const [editing, setEditing] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
```

Below the `if (!me) return null;` line and after `stateFor`, add the save handler and the derived state. It is a plain function, not a `useCallback`, so that `me` stays narrowed to `UserName` by the early return:

```tsx
const myState = stateFor(me);

async function handleSave(saved: TimetableEntry[]) {
  setIsSaving(true);
  setSaveError(null);

  const { error } = await supabase.from('timetables').upsert(
    {
      user_name: me,
      entries: saved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_name' },
  );

  setIsSaving(false);

  if (error) {
    console.error('Failed to save timetable:', error);
    setSaveError('Could not save. Check your connection and try again.');
    return;
  }

  setEntries((current) => ({ ...current!, [me]: saved }));
  setEditing(false);
}
```

Replace the first `<TimetablePane>` with:

```tsx
<TimetablePane
  name={me}
  isMine
  state={myState}
  onRetry={load}
  action={
    !editing && myState.status === 'ready' ? (
      <button
        type="button"
        onClick={() => {
          setSaveError(null);
          setEditing(true);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--mt-text)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
      >
        <Pencil size={16} aria-hidden />
        Edit
      </button>
    ) : undefined
  }
  body={
    editing && myState.status === 'ready' ? (
      <TimetableEditor
        initialEntries={myState.entries}
        isSaving={isSaving}
        error={saveError}
        onCancel={() => {
          setEditing(false);
          setSaveError(null);
        }}
        onSave={handleSave}
      />
    ) : undefined
  }
/>
```

The second `<TimetablePane>` (the partner's) is left exactly as Task 4 wrote it. It receives no `action`, so it has no Edit button at all rather than a disabled one.

`setEntries((current) => ({ ...current!, [me]: saved }))` is safe: `myState.status === 'ready'` is the condition that renders the editor, and that status is only reachable when `entries` is non-null.

- [ ] **Step 3: Typecheck, lint, and run the suite**

```bash
npx tsc --noEmit
```

Expected: no output.

```bash
npm run lint
```

Expected: no errors.

```bash
npm test
```

Expected: PASS — 142 tests across 13 files, still unchanged.

- [ ] **Step 4: Verify in the browser**

On `/study/timetable`:

1. Edit appears on your pane only. The partner pane has no such button anywhere.
2. Press Edit on an empty list — one blank row appears, not a lone "Add row" button.
3. Type a time and an activity, press Add row — a second row appears and the caret lands in its time field.
4. Type into row 2, then remove row 1 with the `×` — row 2 keeps its text and the caret does not jump.
5. Add a row with an activity and no time, and a row with a time and no activity. Save. The first survives (its time column shows `—`), the second is gone.
6. Press Edit, Clear all, then Cancel — the original rows come back untouched.
7. Press Edit, Clear all, then Save — the pane reads "Nothing planned yet." Reload; it still does.
8. Go offline in devtools, press Edit, type a row, press Save — an inline error appears, **the editor stays open, and your typed row is still there**. Go back online and press Save again; it succeeds.
9. Reload the page after a successful save and confirm the rows persisted.
10. Sign in as the other person (clear `user_name` from localStorage and re-pick in the Gatekeeper) and confirm the panes swap order and Edit follows to the top pane.

- [ ] **Step 5: Commit**

```bash
git add src/components/timetable/TimetableEditor.tsx src/components/timetable/TimetableBoard.tsx
git commit -m "feat: edit and save your own timetable"
```

---

### Task 6: Verification checklist

The states in D25 and the save-failure behaviour in D26 cannot be covered by a node-environment test suite. They go on a human checklist, matching the two checklists already in `docs/superpowers/` from the previous branches.

**Files:**
- Create: `docs/superpowers/2026-08-16-timetable-verification.md`

**Interfaces:**
- Consumes: the finished feature from Tasks 1–5.
- Produces: nothing code depends on.

- [ ] **Step 1: Write the checklist**

Create `docs/superpowers/2026-08-16-timetable-verification.md`:

```markdown
# Study timetable — human verification

**Date:** 2026-08-16
**Spec:** [specs/2026-08-16-study-timetable-design.md](specs/2026-08-16-study-timetable-design.md)

Vitest runs in a node environment with no DOM, so none of the below is
covered by the suite. Run these on a phone, not just a desktop browser.

## Setup

- [ ] `timetables` exists in Supabase and `select * from timetables;` succeeds
- [ ] Signed in as Jeff on one device, Rachel on another (or via localStorage)

## Pane states (D25)

- [ ] First paint shows skeleton bars, not an empty table
- [ ] A person with no row yet reads "Nothing planned yet."
- [ ] Offline reload shows "Couldn't load …" with a working Retry
- [ ] Retry after coming back online restores the rows

## Ownership (D23, D29)

- [ ] Your name is the top pane; your partner's is the bottom one
- [ ] Signing in as the other person swaps the order
- [ ] The bottom pane has no Edit button — not a greyed one
- [ ] Edit is hidden while the top pane is loading or errored

## Editing (D27, D28)

- [ ] Edit replaces the top card's body; no modal opens
- [ ] Editing an empty list seeds one blank row
- [ ] Add row appends and focuses the new time field
- [ ] Removing a row does not move the caret or scramble other rows' text
- [ ] Clear all then Cancel restores the original rows
- [ ] Clear all then Save persists an empty list across a reload

## Normalization (D20)

- [ ] A row with an activity and no time survives, showing "—" for the time
- [ ] A row with a time and no activity is dropped
- [ ] Rows keep the order they were typed, not chronological order

## Save failure (D26)

- [ ] Saving while offline shows an inline error
- [ ] The editor stays open and the typed rows are still there
- [ ] Saving again once online succeeds

## Cross-device (D18, D21)

- [ ] Rachel saves; Jeff refreshes and sees it (no live update expected)
- [ ] Neither person can reach an edit control for the other's list

## Layout

- [ ] Panes are stacked at every width, phone and desktop
- [ ] Every button and input is at least 44px tall
- [ ] Long activity text wraps instead of overflowing the card
```

- [ ] **Step 2: Run the full verification**

```bash
npx tsc --noEmit
```

Expected: no output.

```bash
npm run lint
```

Expected: no errors.

```bash
npm test
```

Expected: PASS — 142 tests across 13 files.

```bash
npm run build
```

Expected: a successful production build. This is the first check that `TimetableBoard`'s `'use client'` boundary is correct — a server/client mistake surfaces here rather than in `tsc`.

- [ ] **Step 3: Walk the checklist**

Work through `docs/superpowers/2026-08-16-timetable-verification.md` in a real browser, on a phone-sized viewport. Anything that fails is a bug in Tasks 4 or 5, not a checklist edit.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/2026-08-16-timetable-verification.md
git commit -m "docs: add the timetable human verification checklist"
```

---

## Notes for the executor

**Things the spec deliberately does not include.** Do not add them, and do not treat their absence as an oversight:

- No timestamp or "last updated" anywhere in the UI. `updated_at` is written and never read (spec D19).
- No sorting, overlap detection, or free/busy comparison. Free-text times make it impossible (D20).
- No offline cache, no write queue, no Dexie table. `src/db/db.ts` is untouched (D21).
- No drag-to-reorder (D20).
- No live updates between devices — a manual refresh is the agreed mechanism (D21).
- No retrofitting of the six existing `localStorage.getItem('user_name')` call sites.
- No real per-user auth. It is what D23 would need to become enforceable, and it is out of scope.

**If the dev server refuses to let you move or delete files under `src/app/`,** stop the server first — that is a known Windows behaviour recorded in `CLAUDE.md`.
