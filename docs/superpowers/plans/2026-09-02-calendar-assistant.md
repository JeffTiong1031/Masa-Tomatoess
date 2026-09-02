# Calendar Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the same ask-and-apply chat assistant on `/study/calendar` that `/todo` already has, working on events instead of tasks.

**Architecture:** The to-do bot shipped first and proved the whole shape — route, parse, plan card, apply, retry. Most of that machinery is section-neutral in substance but was written with to-do types baked in. This plan first makes those modules generic over the change type, with the existing to-do suite as the guard that nothing moved; then adds `calendarPlan.ts`, a calendar snapshot, a calendar route, and a calendar section object that the now-generic components consume. Two bots, one shared library, one tested copy of every decision.

**Tech Stack:** Next.js 16.2 App Router route handler, React 19.2 client components, TypeScript strict, `@google/genai` 2.18.0, Supabase through the existing `calendarRepo`, Vitest (node environment, no DOM).

**Spec:** `docs/superpowers/specs/2026-09-01-assistant-chat-design.md` — read it before Task 1. This plan implements its calendar half, the second branch named in its "Build order" section.

## Global Constraints

- **No comments in code.** Names and structure carry the meaning. Existing comments stay.
- **Never hardcode a colour.** Components reference `--mt-*` semantic tokens only. A literal a library needs goes in `lib/` and is pinned to its token by a test.
- **Avoid overly defensive programming.** No guards for states the types already exclude.
- **Avoid instance checks.** No `instanceof`. `typeof` is sanctioned only where untrusted wire data crosses into the type system — the change parsers and the body parser — and nowhere else.
- **Server Components by default;** `'use client'` only on the leaf that needs it.
- **Touch targets at least 44px** (`min-h-11` / `min-w-11`).
- **Vitest has no DOM.** Nothing under `src/**/*.tsx` is ever collected by a test. Every decision must live in `src/lib/` or it is untested by construction.
- **Bug fixes get their test written failing first.**
- **Commits are authored by the repository owner with no trailers of any kind** — no `Co-Authored-By`, no generated-with line. Subject line plus optional plain body.
- **Never start the dev server with a raw shell command.** Use the preview tooling.
- Own rows only. No service-role key. Nothing reaches Supabase until Apply.

## File structure

**Made generic (behaviour unchanged):**

| File | Change |
|---|---|
| `src/lib/assistantRun.ts` | gains `Planned<C>`, the per-change record both sections use |
| `src/lib/applyRun.ts` | `runPlan` and `applySummary` become generic; reconcile and clash lookup arrive as parameters |
| `src/lib/assistantConversation.ts` | `Entry<C>` and `historyFor<C>` become generic over the change type |
| `src/lib/assistantBody.ts` | history parsing splits out from to-do snapshot parsing |
| `src/lib/todoPlan.ts` | `PlannedChange` becomes an alias of `Planned<TodoChange>`; date and time checks move out |

**Created:**

| File | Job |
|---|---|
| `src/lib/assistantValidate.ts` | `dateProblem`, `timeProblem`, `duplicateHandleIn`, `YEAR_RANGE` — the checks both sections run |
| `src/lib/calendarPlan.ts` | `CalendarChange`, its parser, `validateCalendarPlan`, `reconcileCalendarPlan`, `clashesFor`, `toEventDraft`, `toEventInput`, `categoryIdFor` |
| `src/app/api/assistant/calendar/route.ts` | one POST, one Gemini call, the calendar prompt and schema |
| `src/components/assistant/section.ts` | the `AssistantSection<C, R>` interface the generic components consume |
| `src/components/assistant/todoSection.ts` | the to-do section object |
| `src/components/assistant/calendarSection.ts` | the calendar section object |

**Modified:**

| File | Change |
|---|---|
| `src/lib/assistantContext.ts` | gains `buildCalendarSnapshot` and the window constants |
| `src/lib/assistantBody.ts` | gains `parseCalendarBody` |
| `src/lib/assistantRequest.ts` | gains `askCalendarAssistant` |
| `src/components/assistant/AssistantSheet.tsx` | generic over a section |
| `src/components/assistant/PlanCard.tsx` | generic over a section |
| `src/components/assistant/AssistantButton.tsx` | generic over a section |
| `src/components/calendar/CalendarBoard.tsx` | renders the button, gains a notice with a tone, refetches after Apply |
| `src/lib/assistantAccent.test.ts` | pins the calendar accent too |

---

## Task 1: Make the shared assistant library generic

The to-do bot's run policy, conversation model and per-change record are section-neutral in substance but carry `TodoChange` in their types. This task parameterises them. **No behaviour changes.** The whole existing suite must still pass with its assertions untouched — only signatures move.

**Files:**
- Modify: `src/lib/assistantRun.ts`
- Modify: `src/lib/applyRun.ts`
- Modify: `src/lib/assistantConversation.ts`
- Modify: `src/lib/assistantBody.ts`
- Modify: `src/lib/todoPlan.ts`
- Modify: `src/components/assistant/AssistantSheet.tsx` (call sites only)
- Test: `src/lib/applyRun.test.ts`, `src/lib/assistantConversation.test.ts` (signatures only)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `Planned<C>` from `assistantRun.ts` — `{ change: C; id: string | null; outcome: ChangeOutcome; note: string }`
  - `runPlan<C>(planned: Planned<C>[], reconcileOne: (change: C) => Planned<C>, clashTitles: (entry: Planned<C>) => string[], run: ChangeRunner<C>, now: () => number): Promise<Planned<C>[]>`
  - `ChangeRunner<C> = (entry: Planned<C>) => Promise<StepOutcome>`
  - `applySummary<C>(results: Planned<C>[]): { message: string; tone: ApplyTone }`
  - `Entry<C>` and `historyFor<C extends { handle: string }>(entries: Entry<C>[]): Message[]`
  - `countFromYou<C>(entries: Entry<C>[]): number`
  - `parseHistory(value: unknown): Message[] | null` from `assistantBody.ts`
  - `PlannedChange` stays exported from `todoPlan.ts`, now as `Planned<TodoChange>`

- [ ] **Step 1: Add `Planned<C>` to `assistantRun.ts`**

Append to `src/lib/assistantRun.ts`:

```ts
export interface Planned<C> {
  change: C;
  id: string | null;
  outcome: ChangeOutcome;
  note: string;
}
```

- [ ] **Step 2: Point `todoPlan.ts` at it**

In `src/lib/todoPlan.ts`, replace the `PlannedChange` interface declaration with an alias, and widen the type import:

```ts
import type { Planned } from './assistantRun';
```

```ts
export type PlannedChange = Planned<TodoChange>;
```

The old `import type { ChangeOutcome } from './assistantRun';` line goes; nothing else in the file uses it. Everything else in `todoPlan.ts` is untouched by this step.

- [ ] **Step 3: Run the suite to confirm the alias changed nothing**

```bash
npm test
```

Expected: all 638 tests pass. If anything fails, the alias is not equivalent — fix before continuing.

- [ ] **Step 4: Make `applyRun.ts` generic**

Replace the whole of `src/lib/applyRun.ts` with:

```ts
import { nextStep, type Planned, type StepOutcome } from './assistantRun';

export type ChangeRunner<C> = (entry: Planned<C>) => Promise<StepOutcome>;

export type ApplyTone = 'ok' | 'problem';

export function applySummary<C>(results: Planned<C>[]): { message: string; tone: ApplyTone } {
  const saved = results.filter((entry) => entry.outcome === 'saved').length;
  if (saved === results.length) {
    return { message: `Saved ${saved} change${saved === 1 ? '' : 's'}.`, tone: 'ok' };
  }
  if (saved === 0) return { message: 'Nothing saved.', tone: 'problem' };
  return { message: `${saved} of ${results.length} saved.`, tone: 'problem' };
}

export async function runPlan<C>(
  planned: Planned<C>[],
  reconcileOne: (change: C) => Planned<C>,
  clashTitles: (entry: Planned<C>) => string[],
  run: ChangeRunner<C>,
  now: () => number,
): Promise<Planned<C>[]> {
  const startedAt = now();
  const outcomes: StepOutcome[] = [];
  const results: Planned<C>[] = [];

  for (const previous of planned) {
    if (
      previous.outcome === 'saved' ||
      previous.outcome === 'stale' ||
      previous.outcome === 'uncertain'
    ) {
      results.push(previous);
      continue;
    }

    const step = reconcileOne(previous.change);
    if (step.outcome === 'stale') {
      results.push(step);
      continue;
    }

    const action = nextStep({ outcomes, elapsedMs: now() - startedAt });
    if (action !== 'run') {
      results.push({ ...step, outcome: 'notAttempted', note: 'Not tried — the run stopped.' });
      continue;
    }

    const outcome = await run(step);
    outcomes.push(outcome);

    if (outcome === 'saved') {
      const titles = clashTitles(step);
      results.push({
        ...step,
        outcome: 'saved',
        note: titles.length > 0 ? `That day already had "${titles[0]}".` : '',
      });
      continue;
    }

    results.push({
      ...step,
      outcome: outcome === 'unreached' ? 'uncertain' : 'failed',
      note:
        outcome === 'unreached'
          ? 'Took too long. It may have saved — check your list before trying again.'
          : 'The database refused it.',
    });
  }

  return results;
}
```

The clash *sentence* stays here, in one place, so both sections word it identically. Only the titles are injected.

- [ ] **Step 5: Update the `applyRun.test.ts` call sites**

The test currently calls `runPlan(planned, map, live, run, now)`. It now calls `runPlan(planned, reconcileOne, clashTitles, run, now)`. Build the two closures from the fixtures the test already has:

```ts
const reconcileOne = (change: TodoChange) => reconcileTodoPlan([change], map, live)[0];
const clashTitles = (entry: PlannedChange) =>
  clashesFor(entry.change, live, entry.id).map((row) => row.title);
```

Add `clashesFor` to the test's `todoPlan` import if it is not there. **Do not change a single assertion.** If an assertion has to move, the refactor is wrong — stop and report it.

- [ ] **Step 6: Run it**

```bash
npx vitest run src/lib/applyRun.test.ts
```

Expected: PASS, the same test count as before.

- [ ] **Step 7: Make `assistantConversation.ts` generic**

In `src/lib/assistantConversation.ts`, drop the `PlannedChange` import from `todoPlan` and take the change type as a parameter:

```ts
import type { Message } from './assistantRequest';
import { MAX_MESSAGE_CHARS } from './assistantBody';
import type { Planned } from './assistantRun';
```

```ts
export type Entry<C> =
  | { kind: 'text'; role: 'you' | 'assistant'; text: string }
  | { kind: 'plan'; summary: string; planned: Planned<C>[]; cancelled: boolean };
```

```ts
export function countFromYou<C>(entries: Entry<C>[]): number {
```

```ts
export function historyFor<C extends { handle: string }>(entries: Entry<C>[]): Message[] {
```

The body of `historyFor` is unchanged — it already reads only `change.handle`, which the constraint now guarantees.

- [ ] **Step 8: Update the `assistantConversation.test.ts` call sites**

Annotate the fixture arrays as `Entry<TodoChange>[]`. Assertions unchanged.

- [ ] **Step 9: Split history parsing out of `assistantBody.ts`**

The calendar route needs the same history rules with a different snapshot. In `src/lib/assistantBody.ts`, rename the private `toHistory` to an exported `parseHistory` and have `parseAssistantBody` call it:

```ts
export function parseHistory(value: unknown): Message[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_HISTORY) return null;
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null;
    const raw = entry as Record<string, unknown>;
    if (raw.role !== 'you' && raw.role !== 'assistant') return null;
    if (typeof raw.text !== 'string' || raw.text.length > MAX_MESSAGE_CHARS) return null;
  }
  return value as Message[];
}
```

Nothing else in that file changes.

- [ ] **Step 10: Fix the `AssistantSheet.tsx` call sites**

Three mechanical edits:

- `useState<Entry[]>([])` becomes `useState<Entry<TodoChange>[]>([])`
- the cast inside `apply` becomes `Extract<Entry<TodoChange>, { kind: 'plan' }>`
- the `runPlan` call becomes:

```ts
      const results = await runPlan<TodoChange>(
        entry.planned,
        (change) => reconcileTodoPlan([change], map, fresh.rows)[0],
        (step) => clashesFor(step.change, fresh.rows, step.id).map((row) => row.title),
        (change) => runChange(change, owner),
        Date.now,
      );
```

Add `clashesFor` to the existing `@/lib/todoPlan` import.

- [ ] **Step 11: Typecheck, lint and run the whole suite**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: no type errors, 0 lint errors, all 638 tests pass. Two pre-existing lint *warnings* in `src/lib/calendarEvent.ts` (`MIN_SPAN_HOURS`, `HOURS_IN_DAY`) are not yours and stay.

- [ ] **Step 12: Commit**

```bash
git add src/lib/assistantRun.ts src/lib/applyRun.ts src/lib/applyRun.test.ts src/lib/assistantConversation.ts src/lib/assistantConversation.test.ts src/lib/assistantBody.ts src/lib/todoPlan.ts src/components/assistant/AssistantSheet.tsx
git commit -m "refactor(assistant): make the run and conversation modules generic over the change type"
```

---

## Task 2: The shared date, time and duplicate-handle checks

`todoPlan.ts` holds `dateProblem`, `timeProblem` and the duplicate-handle scan as private functions. The calendar needs all three, on more fields. Extract them rather than copy them — a second copy of the five-year bound is a second thing to get wrong.

**Files:**
- Create: `src/lib/assistantValidate.ts`
- Create: `src/lib/assistantValidate.test.ts`
- Modify: `src/lib/todoPlan.ts`

**Interfaces:**
- Consumes: `Reason` from `assistantReply.ts`.
- Produces:
  - `YEAR_RANGE = 5`
  - `dateProblem(value: string, today: string): Reason | null`
  - `timeProblem(value: string): Reason | null`
  - `duplicateHandleIn(changes: { handle: string }[]): Reason | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/assistantValidate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dateProblem, timeProblem, duplicateHandleIn } from './assistantValidate';

const TODAY = '2026-09-02';

describe('dateProblem', () => {
  it('accepts an empty field', () => {
    expect(dateProblem('', TODAY)).toBeNull();
  });

  it('accepts a real date', () => {
    expect(dateProblem('2026-12-14', TODAY)).toBeNull();
  });

  it('rejects a shape it cannot read', () => {
    expect(dateProblem('14 Dec', TODAY)).toEqual({ kind: 'badDate', value: '14 Dec' });
  });

  it('rejects a day that does not exist', () => {
    expect(dateProblem('2026-02-30', TODAY)).toEqual({ kind: 'badDate', value: '2026-02-30' });
  });

  it('rejects a year far in the future and names it', () => {
    expect(dateProblem('2087-12-14', TODAY)).toEqual({ kind: 'yearOutOfRange', year: 2087 });
  });

  it('rejects a year far in the past and names it', () => {
    expect(dateProblem('1999-01-01', TODAY)).toEqual({ kind: 'yearOutOfRange', year: 1999 });
  });

  it('allows exactly five years out on both sides', () => {
    expect(dateProblem('2031-09-02', TODAY)).toBeNull();
    expect(dateProblem('2021-09-02', TODAY)).toBeNull();
  });
});

describe('timeProblem', () => {
  it('accepts an empty field', () => {
    expect(timeProblem('')).toBeNull();
  });

  it('accepts a real time', () => {
    expect(timeProblem('09:30')).toBeNull();
  });

  it('rejects an impossible hour', () => {
    expect(timeProblem('25:99')).toEqual({ kind: 'badTime', value: '25:99' });
  });

  it('rejects a shape it cannot read', () => {
    expect(timeProblem('9am')).toEqual({ kind: 'badTime', value: '9am' });
  });
});

describe('duplicateHandleIn', () => {
  it('passes a plan with distinct handles', () => {
    expect(duplicateHandleIn([{ handle: 'e1' }, { handle: 'e2' }])).toBeNull();
  });

  it('ignores the empty handles that adds carry', () => {
    expect(duplicateHandleIn([{ handle: '' }, { handle: '' }])).toBeNull();
  });

  it('names the handle used twice', () => {
    expect(duplicateHandleIn([{ handle: 'e3' }, { handle: 'e3' }])).toEqual({
      kind: 'duplicateHandle',
      handle: 'e3',
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/assistantValidate.test.ts
```

Expected: FAIL — cannot resolve `./assistantValidate`.

- [ ] **Step 3: Write the module**

Create `src/lib/assistantValidate.ts`, moving the two functions out of `todoPlan.ts` verbatim and adding the handle scan:

```ts
import type { Reason } from './assistantReply';

export const YEAR_RANGE = 5;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function dateProblem(value: string, today: string): Reason | null {
  if (value === '') return null;
  if (!DATE_PATTERN.test(value)) return { kind: 'badDate', value };

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { kind: 'badDate', value };
  }

  const thisYear = Number(today.slice(0, 4));
  if (year < thisYear - YEAR_RANGE || year > thisYear + YEAR_RANGE) {
    return { kind: 'yearOutOfRange', year };
  }
  return null;
}

export function timeProblem(value: string): Reason | null {
  if (value === '') return null;
  if (!TIME_PATTERN.test(value)) return { kind: 'badTime', value };

  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { kind: 'badTime', value };
  }
  return null;
}

export function duplicateHandleIn(changes: { handle: string }[]): Reason | null {
  const seen = new Set<string>();
  for (const change of changes) {
    if (change.handle === '') continue;
    if (seen.has(change.handle)) {
      return { kind: 'duplicateHandle', handle: change.handle };
    }
    seen.add(change.handle);
  }
  return null;
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/assistantValidate.test.ts
```

Expected: PASS, 14 tests.

- [ ] **Step 5: Rewire `todoPlan.ts`**

Delete its private `dateProblem` and `timeProblem`, the `DATE_PATTERN` and `TIME_PATTERN` constants, and its local `YEAR_RANGE` declaration. Import them instead, and keep the re-export so any existing importer of `todoPlan.YEAR_RANGE` still resolves:

```ts
import { dateProblem, duplicateHandleIn, timeProblem, YEAR_RANGE } from './assistantValidate';

export { YEAR_RANGE };
```

Replace the body of `validateTodoPlan`:

```ts
export function validateTodoPlan(changes: TodoChange[]): Reason | null {
  return duplicateHandleIn(changes);
}
```

- [ ] **Step 6: Run the whole suite**

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; every existing to-do test still passes with its assertions untouched, plus the 14 new ones.

- [ ] **Step 7: Commit**

```bash
git add src/lib/assistantValidate.ts src/lib/assistantValidate.test.ts src/lib/todoPlan.ts
git commit -m "refactor(assistant): share the date, time and duplicate-handle checks between sections"
```
---

## Task 3: `calendarPlan.ts` — the change shape and its parser

An event has more fields than a task and one extra rule: it must pass the same `validate()` the manual event form runs, so the bot can never create an event your own form would reject. There is no second rulebook.

**Files:**
- Create: `src/lib/calendarPlan.ts`
- Create: `src/lib/calendarPlan.test.ts`

**Interfaces:**
- Consumes: `HandleMap` and `idOf` from `assistantContext.ts`; `ChangeParser` and `Reason` from `assistantReply.ts`; `dateProblem` and `timeProblem` from `assistantValidate.ts`; `validate`, `toTiming` and `EventDraft` from `eventForm.ts`; `EventInput` from `calendarRepo.ts`; `Category` from `categories.ts`; `UserName` from `identity.ts`.
- Produces:
  - `CalendarOp = 'add' | 'edit' | 'delete'`
  - `CalendarChange` — `{ op, handle, title, date, endDate, startTime, endTime, notes, countdown, category }`, every field always present, `category` a **name** not an id
  - `calendarChangeParser(map: HandleMap, today: string, categoryNames: string[]): ChangeParser<CalendarChange>`
  - `categoryIdFor(name: string, categories: Category[]): string | null`
  - `toEventDraft(change: CalendarChange, categoryId: string | null): EventDraft`
  - `toEventInput(change: CalendarChange, owner: UserName, categoryId: string | null): EventInput`

- [ ] **Step 1: Write the failing test**

Create `src/lib/calendarPlan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { assignHandles, emptyHandleMap } from './assistantContext';
import {
  calendarChangeParser,
  categoryIdFor,
  toEventDraft,
  toEventInput,
  type CalendarChange,
} from './calendarPlan';
import type { Category } from './categories';

const TODAY = '2026-09-02';

const CATEGORIES: Category[] = [
  { id: 'c-work', name: 'Work', swatch: 1, position: 0 },
  { id: 'c-sport', name: 'Sport', swatch: 2, position: 1 },
];

const NAMES = CATEGORIES.map((category) => category.name);

const MAP = assignHandles(emptyHandleMap('e'), ['ev-1', 'ev-2']);

function wire(overrides: Record<string, unknown> = {}) {
  return {
    op: 'add',
    handle: '',
    title: 'Dentist',
    date: '2026-09-10',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
    countdown: false,
    category: '',
    ...overrides,
  };
}

const parse = calendarChangeParser(MAP, TODAY, NAMES);

describe('calendarChangeParser', () => {
  it('reads a complete add', () => {
    const result = parse(wire());
    expect(result).toEqual({
      ok: true,
      change: {
        op: 'add',
        handle: '',
        title: 'Dentist',
        date: '2026-09-10',
        endDate: '',
        startTime: '09:00',
        endTime: '10:00',
        notes: '',
        countdown: false,
        category: '',
      },
    });
  });

  it('blanks the handle on an add even when the model sends one', () => {
    const result = parse(wire({ handle: 'e1' }));
    expect(result).toEqual({ ok: true, change: expect.objectContaining({ handle: '' }) });
  });

  it('rejects an op it does not have', () => {
    expect(parse(wire({ op: 'move' }))).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a missing field', () => {
    const raw = wire();
    delete (raw as Record<string, unknown>).notes;
    expect(parse(raw)).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a handle this conversation never issued', () => {
    expect(parse(wire({ op: 'edit', handle: 'e9' }))).toEqual({
      ok: false,
      reason: { kind: 'unknownHandle', handle: 'e9' },
    });
  });

  it('accepts a handle it did issue', () => {
    const result = parse(wire({ op: 'edit', handle: 'e1' }));
    expect(result.ok).toBe(true);
  });

  it('blanks every end-state field on a delete', () => {
    const result = parse(wire({ op: 'delete', handle: 'e2', title: 'Dentist' }));
    expect(result).toEqual({
      ok: true,
      change: {
        op: 'delete',
        handle: 'e2',
        title: '',
        date: '',
        endDate: '',
        startTime: '',
        endTime: '',
        notes: '',
        countdown: false,
        category: '',
      },
    });
  });

  it('rejects a blank title with its own reason', () => {
    expect(parse(wire({ title: '   ' }))).toEqual({ ok: false, reason: { kind: 'emptyTitle' } });
  });

  it('rejects a date it cannot read and quotes it', () => {
    expect(parse(wire({ date: '10 Sept' }))).toEqual({
      ok: false,
      reason: { kind: 'badDate', value: '10 Sept' },
    });
  });

  it('checks the end date too, not just the start', () => {
    expect(parse(wire({ startTime: '', endTime: '', endDate: '2087-09-11' }))).toEqual({
      ok: false,
      reason: { kind: 'yearOutOfRange', year: 2087 },
    });
  });

  it('rejects a start time it cannot read', () => {
    expect(parse(wire({ startTime: '9am', endTime: '' }))).toEqual({
      ok: false,
      reason: { kind: 'badTime', value: '9am' },
    });
  });

  it('rejects a category it was never sent and names it', () => {
    expect(parse(wire({ category: 'Zumba' }))).toEqual({
      ok: false,
      reason: { kind: 'unknownCategory', name: 'Zumba' },
    });
  });

  it('accepts a category it was sent, whatever the casing', () => {
    expect(parse(wire({ category: 'sport' })).ok).toBe(true);
  });

  it('accepts no category at all', () => {
    expect(parse(wire({ category: '' })).ok).toBe(true);
  });

  it('passes the form rejection through in the form wording', () => {
    expect(parse(wire({ startTime: '10:00', endTime: '09:00' }))).toEqual({
      ok: false,
      reason: { kind: 'formRejection', message: 'The end time must be after the start.' },
    });
  });

  it('will not let a timed event run across several days', () => {
    expect(parse(wire({ endDate: '2026-09-11' }))).toEqual({
      ok: false,
      reason: { kind: 'formRejection', message: 'Only all-day events can run across several days.' },
    });
  });

  it('rejects an add with no date at all, in the form wording', () => {
    expect(parse(wire({ date: '', startTime: '', endTime: '' }))).toEqual({
      ok: false,
      reason: { kind: 'formRejection', message: 'Pick a date.' },
    });
  });
});

describe('categoryIdFor', () => {
  it('maps a name to its id', () => {
    expect(categoryIdFor('Sport', CATEGORIES)).toBe('c-sport');
  });

  it('ignores casing and stray spaces', () => {
    expect(categoryIdFor('  work ', CATEGORIES)).toBe('c-work');
  });

  it('gives null for no category', () => {
    expect(categoryIdFor('', CATEGORIES)).toBeNull();
  });

  it('gives null for a name it does not have', () => {
    expect(categoryIdFor('Zumba', CATEGORIES)).toBeNull();
  });
});

describe('toEventDraft and toEventInput', () => {
  const timed: CalendarChange = {
    op: 'add',
    handle: '',
    title: '  Dentist  ',
    date: '2026-09-10',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    notes: '  bring the form  ',
    countdown: true,
    category: 'Work',
  };

  it('marks a timed change as not all-day', () => {
    expect(toEventDraft(timed, 'c-work').allDay).toBe(false);
  });

  it('marks a change with no start time as all-day', () => {
    expect(toEventDraft({ ...timed, startTime: '', endTime: '' }, null).allDay).toBe(true);
  });

  it('builds the same input shape the manual form builds', () => {
    expect(toEventInput(timed, 'Jeff', 'c-work')).toEqual({
      owner: 'Jeff',
      title: 'Dentist',
      date: '2026-09-10',
      timing: { kind: 'span', startTime: '09:00', endTime: '10:00' },
      notes: 'bring the form',
      countdown: true,
      categoryId: 'c-work',
    });
  });

  it('turns empty notes into null, the way the column expects', () => {
    expect(toEventInput({ ...timed, notes: '   ' }, 'Jeff', null).notes).toBeNull();
  });

  it('carries an all-day end date into the timing', () => {
    const allDay: CalendarChange = {
      ...timed,
      startTime: '',
      endTime: '',
      endDate: '2026-09-12',
    };
    expect(toEventInput(allDay, 'Jeff', null).timing).toEqual({
      kind: 'allDay',
      endDate: '2026-09-12',
    });
  });

  it('gives an all-day event with no end date a null end date', () => {
    const allDay: CalendarChange = { ...timed, startTime: '', endTime: '', endDate: '' };
    expect(toEventInput(allDay, 'Jeff', null).timing).toEqual({ kind: 'allDay', endDate: null });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/calendarPlan.test.ts
```

Expected: FAIL — cannot resolve `./calendarPlan`.

- [ ] **Step 3: Write the module**

Create `src/lib/calendarPlan.ts`:

```ts
import { idOf, type HandleMap } from './assistantContext';
import type { ChangeParser, Reason } from './assistantReply';
import { dateProblem, timeProblem } from './assistantValidate';
import { toTiming, validate, type EventDraft } from './eventForm';
import type { EventInput } from './calendarRepo';
import type { Category } from './categories';
import type { UserName } from './identity';

export type CalendarOp = 'add' | 'edit' | 'delete';

const OPS: CalendarOp[] = ['add', 'edit', 'delete'];

const STRING_FIELDS = [
  'handle',
  'title',
  'date',
  'endDate',
  'startTime',
  'endTime',
  'notes',
  'category',
] as const;

export interface CalendarChange {
  op: CalendarOp;
  handle: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  notes: string;
  countdown: boolean;
  category: string;
}

const BLANK = {
  title: '',
  date: '',
  endDate: '',
  startTime: '',
  endTime: '',
  notes: '',
  countdown: false,
  category: '',
};

export function toEventDraft(change: CalendarChange, categoryId: string | null): EventDraft {
  return {
    title: change.title,
    date: change.date,
    allDay: change.startTime === '',
    endDate: change.endDate,
    startTime: change.startTime,
    endTime: change.endTime,
    notes: change.notes,
    countdown: change.countdown,
    categoryId,
  };
}

export function toEventInput(
  change: CalendarChange,
  owner: UserName,
  categoryId: string | null,
): EventInput {
  const notes = change.notes.trim();
  return {
    owner,
    title: change.title.trim(),
    date: change.date,
    timing: toTiming(toEventDraft(change, categoryId)),
    notes: notes === '' ? null : notes,
    countdown: change.countdown,
    categoryId,
  };
}

function normalise(name: string): string {
  return name.trim().toLowerCase();
}

export function categoryIdFor(name: string, categories: Category[]): string | null {
  if (name.trim() === '') return null;
  const wanted = normalise(name);
  const found = categories.find((category) => normalise(category.name) === wanted);
  return found === undefined ? null : found.id;
}

export function calendarChangeParser(
  map: HandleMap,
  today: string,
  categoryNames: string[],
): ChangeParser<CalendarChange> {
  const known = new Set(categoryNames.map(normalise));

  return (raw) => {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    const value = raw as Record<string, unknown>;

    if (typeof value.op !== 'string' || !OPS.includes(value.op as CalendarOp)) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    for (const field of STRING_FIELDS) {
      if (typeof value[field] !== 'string') {
        return { ok: false, reason: { kind: 'unknownKind' } };
      }
    }
    if (typeof value.countdown !== 'boolean') {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }

    const op = value.op as CalendarOp;
    const change: CalendarChange = {
      op,
      handle: op === 'add' ? '' : (value.handle as string),
      title: value.title as string,
      date: value.date as string,
      endDate: value.endDate as string,
      startTime: value.startTime as string,
      endTime: value.endTime as string,
      notes: value.notes as string,
      countdown: value.countdown,
      category: value.category as string,
    };

    if (op !== 'add' && idOf(map, change.handle) === null) {
      return { ok: false, reason: { kind: 'unknownHandle', handle: change.handle } };
    }

    if (op === 'delete') {
      return { ok: true, change: { ...change, ...BLANK } };
    }

    if (change.title.trim() === '') return { ok: false, reason: { kind: 'emptyTitle' } };

    const problems: (Reason | null)[] = [
      dateProblem(change.date, today),
      dateProblem(change.endDate, today),
      timeProblem(change.startTime),
      timeProblem(change.endTime),
    ];
    for (const problem of problems) {
      if (problem !== null) return { ok: false, reason: problem };
    }

    if (change.category !== '' && !known.has(normalise(change.category))) {
      return { ok: false, reason: { kind: 'unknownCategory', name: change.category } };
    }

    const rejection = validate(toEventDraft(change, null));
    if (rejection !== null) {
      return { ok: false, reason: { kind: 'formRejection', message: rejection.message } };
    }

    return { ok: true, change };
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/calendarPlan.test.ts
```

Expected: PASS, 27 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
```

```bash
git add src/lib/calendarPlan.ts src/lib/calendarPlan.test.ts
git commit -m "feat(calendar-assistant): read and check an event change from the model"
```

---

## Task 4: The calendar plan — duplicates, staleness and clashes

Three decisions that run after parsing: no handle twice in one plan, a row that has since been deleted is **stale** and never attempted, and a warning when the new event overlaps something already on that day. The clash check never blocks — two things in a day is ordinary.

**Files:**
- Modify: `src/lib/calendarPlan.ts`
- Modify: `src/lib/calendarPlan.test.ts`

**Interfaces:**
- Consumes: `Planned` from `assistantRun.ts`; `duplicateHandleIn` from `assistantValidate.ts`; `CalendarEvent` and `EventTiming` from `calendarEvent.ts`.
- Produces:
  - `validateCalendarPlan(changes: CalendarChange[]): Reason | null`
  - `PlannedEvent = Planned<CalendarChange>`
  - `reconcileCalendarPlan(changes: CalendarChange[], map: HandleMap, rows: CalendarEvent[]): PlannedEvent[]`
  - `clashesFor(change: CalendarChange, rows: CalendarEvent[], excludeId: string | null): CalendarEvent[]`
  - `MOMENT_MINUTES = 60`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/calendarPlan.test.ts`. Add `clashesFor`, `reconcileCalendarPlan` and `validateCalendarPlan` to the **existing** `./calendarPlan` import — do not add a second import of the same module — and add one new type import:

```ts
import type { CalendarEvent } from './calendarEvent';
```

```ts
function event(over: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    owner: 'Jeff',
    title: 'Flight',
    date: '2026-09-10',
    timing: { kind: 'span', startTime: '09:00', endTime: '11:00' },
    notes: null,
    countdown: false,
    categoryId: null,
    id: over.id,
    ...over,
  };
}

const base: CalendarChange = {
  op: 'add',
  handle: '',
  title: 'Dentist',
  date: '2026-09-10',
  endDate: '',
  startTime: '09:30',
  endTime: '10:30',
  notes: '',
  countdown: false,
  category: '',
};

describe('validateCalendarPlan', () => {
  it('passes a plan with distinct handles', () => {
    expect(
      validateCalendarPlan([
        { ...base, op: 'edit', handle: 'e1' },
        { ...base, op: 'edit', handle: 'e2' },
      ]),
    ).toBeNull();
  });

  it('passes a plan of several adds', () => {
    expect(validateCalendarPlan([base, base, base])).toBeNull();
  });

  it('rejects the same handle twice and names it', () => {
    expect(
      validateCalendarPlan([
        { ...base, op: 'edit', handle: 'e1' },
        { ...base, op: 'delete', handle: 'e1' },
      ]),
    ).toEqual({ kind: 'duplicateHandle', handle: 'e1' });
  });
});

describe('reconcileCalendarPlan', () => {
  const map = assignHandles(emptyHandleMap('e'), ['ev-1', 'ev-2']);

  it('leaves an add pending with no id', () => {
    const [planned] = reconcileCalendarPlan([base], map, []);
    expect(planned).toEqual({ change: base, id: null, outcome: 'pending', note: '' });
  });

  it('resolves an edit to the row it points at', () => {
    const change = { ...base, op: 'edit' as const, handle: 'e1' };
    const [planned] = reconcileCalendarPlan([change], map, [event({ id: 'ev-1' })]);
    expect(planned).toEqual({ change, id: 'ev-1', outcome: 'pending', note: '' });
  });

  it('marks a change stale when its row has gone', () => {
    const change = { ...base, op: 'delete' as const, handle: 'e2' };
    const [planned] = reconcileCalendarPlan([change], map, [event({ id: 'ev-1' })]);
    expect(planned.outcome).toBe('stale');
    expect(planned.id).toBeNull();
    expect(planned.note).toBe('That event was already deleted.');
  });
});

describe('clashesFor', () => {
  it('finds an overlapping span on the same day', () => {
    const found = clashesFor(base, [event({ id: 'ev-1' })], null);
    expect(found.map((row) => row.title)).toEqual(['Flight']);
  });

  it('ignores a different day', () => {
    const found = clashesFor(base, [event({ id: 'ev-1', date: '2026-09-11' })], null);
    expect(found).toEqual([]);
  });

  it('ignores spans that only touch at the edge', () => {
    const change = { ...base, startTime: '11:00', endTime: '12:00' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], null)).toEqual([]);
  });

  it('treats a moment as one hour', () => {
    const moment = event({ id: 'ev-1', timing: { kind: 'moment', startTime: '09:00' } });
    const inside = { ...base, startTime: '09:30', endTime: '10:30' };
    const after = { ...base, startTime: '10:00', endTime: '11:00' };
    expect(clashesFor(inside, [moment], null).length).toBe(1);
    expect(clashesFor(after, [moment], null)).toEqual([]);
  });

  it('treats a change with no end time as one hour too', () => {
    const change = { ...base, startTime: '10:30', endTime: '' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], null).length).toBe(1);
  });

  it('never clashes with an all-day event', () => {
    const allDay = event({ id: 'ev-1', timing: { kind: 'allDay', endDate: null } });
    expect(clashesFor(base, [allDay], null)).toEqual([]);
  });

  it('never reports a clash for an all-day change', () => {
    const change = { ...base, startTime: '', endTime: '' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], null)).toEqual([]);
  });

  it('does not match an edit against the very row it is editing', () => {
    const change = { ...base, op: 'edit' as const, handle: 'e1' };
    expect(clashesFor(change, [event({ id: 'ev-1' })], 'ev-1')).toEqual([]);
  });

  it('says nothing about a delete', () => {
    const change = { ...base, op: 'delete' as const, handle: 'e1' };
    expect(clashesFor(change, [event({ id: 'ev-2' })], null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/calendarPlan.test.ts
```

Expected: FAIL — `validateCalendarPlan`, `reconcileCalendarPlan` and `clashesFor` are not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/calendarPlan.ts`, and add these to its imports:

```ts
import { duplicateHandleIn } from './assistantValidate';
import type { Planned } from './assistantRun';
import type { CalendarEvent, EventTiming } from './calendarEvent';
```

```ts
export const MOMENT_MINUTES = 60;

export function validateCalendarPlan(changes: CalendarChange[]): Reason | null {
  return duplicateHandleIn(changes);
}

export type PlannedEvent = Planned<CalendarChange>;

export function reconcileCalendarPlan(
  changes: CalendarChange[],
  map: HandleMap,
  rows: CalendarEvent[],
): PlannedEvent[] {
  const live = new Set(rows.map((row) => row.id));

  return changes.map((change) => {
    if (change.op === 'add') {
      return { change, id: null, outcome: 'pending', note: '' };
    }

    const id = idOf(map, change.handle);
    if (id === null || !live.has(id)) {
      return { change, id: null, outcome: 'stale', note: 'That event was already deleted.' };
    }

    return { change, id, outcome: 'pending', note: '' };
  });
}

interface Span {
  from: number;
  to: number;
}

function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

function spanOfTiming(timing: EventTiming): Span | null {
  if (timing.kind === 'allDay') return null;
  const from = minutesOf(timing.startTime);
  if (timing.kind === 'moment') return { from, to: from + MOMENT_MINUTES };
  return { from, to: minutesOf(timing.endTime) };
}

function spanOfChange(change: CalendarChange): Span | null {
  if (change.startTime === '') return null;
  const from = minutesOf(change.startTime);
  if (change.endTime === '') return { from, to: from + MOMENT_MINUTES };
  return { from, to: minutesOf(change.endTime) };
}

function overlaps(a: Span, b: Span): boolean {
  return a.from < b.to && b.from < a.to;
}

export function clashesFor(
  change: CalendarChange,
  rows: CalendarEvent[],
  excludeId: string | null,
): CalendarEvent[] {
  if (change.op === 'delete') return [];

  const span = spanOfChange(change);
  if (span === null) return [];

  return rows.filter((row) => {
    if (row.id === excludeId) return false;
    if (row.date !== change.date) return false;
    const other = spanOfTiming(row.timing);
    return other !== null && overlaps(span, other);
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/calendarPlan.test.ts
```

Expected: PASS, 42 tests.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
npx tsc --noEmit && npm run lint
```

```bash
git add src/lib/calendarPlan.ts src/lib/calendarPlan.test.ts
git commit -m "feat(calendar-assistant): reconcile a plan against live events and warn about overlaps"
```
---

## Task 5: The calendar snapshot

What the bot is allowed to see. A window around today, your rows only, capped — and when the cap bites, the window it *reports* must be the window it actually sent, or a refusal will name a range it never had.

**Files:**
- Modify: `src/lib/assistantContext.ts`
- Modify: `src/lib/assistantContext.test.ts`

**Interfaces:**
- Consumes: `assignHandles` and `handleOf` (already in this file); `addDays`, `WEEKDAYS_SHORT` and `weekdayIndex` from `dates.ts`; `CalendarEvent` from `calendarEvent.ts`; `Category` from `categories.ts`; `UserName` from `identity.ts`.
- Produces:
  - `MAX_EVENT_ROWS = 250`, `MAX_NOTE_CHARS = 200`, `WIDE_BACK = 30`, `WIDE_AHEAD = 90`, `NARROW_BACK = 14`, `NARROW_AHEAD = 45`
  - `CalendarSnapshotRow` — `{ handle, title, date, endDate, startTime, endTime, countdown, category, notes }`
  - `CalendarSnapshot` — `{ today, weekday, now, from, to, categories, rows }`
  - `buildCalendarSnapshot(rows: CalendarEvent[], categories: Category[], owner: UserName, map: HandleMap, today: string, now: string): { snapshot: CalendarSnapshot; map: HandleMap }`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/assistantContext.test.ts`. Add to its imports:

```ts
import {
  buildCalendarSnapshot,
  MAX_EVENT_ROWS,
  MAX_NOTE_CHARS,
  type CalendarSnapshot,
} from './assistantContext';
import type { CalendarEvent } from './calendarEvent';
import type { Category } from './categories';
```

```ts
const CAL_TODAY = '2026-09-02';
const CAL_NOW = '14:30:00';

const CATS: Category[] = [
  { id: 'c-work', name: 'Work', swatch: 1, position: 0 },
  { id: 'c-sport', name: 'Sport', swatch: 2, position: 1 },
];

function ev(over: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    owner: 'Jeff',
    title: 'Standup',
    date: '2026-09-03',
    timing: { kind: 'moment', startTime: '09:00' },
    notes: null,
    countdown: false,
    categoryId: null,
    id: over.id,
    ...over,
  };
}

function build(rows: CalendarEvent[], owner: 'Jeff' | 'Rachel' = 'Jeff'): CalendarSnapshot {
  return buildCalendarSnapshot(rows, CATS, owner, emptyHandleMap('e'), CAL_TODAY, CAL_NOW).snapshot;
}

describe('buildCalendarSnapshot', () => {
  it('states today, the weekday and the clock it was given', () => {
    const snapshot = build([]);
    expect(snapshot.today).toBe(CAL_TODAY);
    expect(snapshot.weekday).toBe('Wed');
    expect(snapshot.now).toBe(CAL_NOW);
  });

  it('sends the wide window when the rows fit', () => {
    const snapshot = build([ev({ id: 'a' })]);
    expect(snapshot.from).toBe('2026-08-03');
    expect(snapshot.to).toBe('2026-12-01');
  });

  it('sends your category names', () => {
    expect(build([]).categories).toEqual(['Work', 'Sport']);
  });

  it('sends only your own events', () => {
    const snapshot = build([ev({ id: 'a' }), ev({ id: 'b', owner: 'Rachel', title: 'Hers' })]);
    expect(snapshot.rows.map((row) => row.title)).toEqual(['Standup']);
  });

  it('drops an event before the window', () => {
    expect(build([ev({ id: 'a', date: '2026-07-01' })]).rows).toEqual([]);
  });

  it('drops an event after the window', () => {
    expect(build([ev({ id: 'a', date: '2026-12-14' })]).rows).toEqual([]);
  });

  it('keeps a long all-day event that reaches into the window', () => {
    const spanning = ev({
      id: 'a',
      date: '2026-07-20',
      timing: { kind: 'allDay', endDate: '2026-08-10' },
    });
    expect(build([spanning]).rows.length).toBe(1);
  });

  it('flattens each timing into plain fields', () => {
    const rows = build([
      ev({ id: 'a', date: '2026-09-03', timing: { kind: 'moment', startTime: '09:00' } }),
      ev({
        id: 'b',
        date: '2026-09-04',
        timing: { kind: 'span', startTime: '10:00', endTime: '11:30' },
      }),
      ev({ id: 'c', date: '2026-09-05', timing: { kind: 'allDay', endDate: '2026-09-06' } }),
    ]).rows;

    expect(rows[0]).toMatchObject({ startTime: '09:00', endTime: '', endDate: '' });
    expect(rows[1]).toMatchObject({ startTime: '10:00', endTime: '11:30', endDate: '' });
    expect(rows[2]).toMatchObject({ startTime: '', endTime: '', endDate: '2026-09-06' });
  });

  it('names the category rather than sending an id', () => {
    const rows = build([ev({ id: 'a', categoryId: 'c-sport' })]).rows;
    expect(rows[0].category).toBe('Sport');
  });

  it('leaves the category empty when the event has none', () => {
    expect(build([ev({ id: 'a' })]).rows[0].category).toBe('');
  });

  it('trims notes and never sends null', () => {
    const long = 'x'.repeat(400);
    const rows = build([ev({ id: 'a', notes: long }), ev({ id: 'b', notes: null })]).rows;
    expect(rows[0].notes.length).toBe(MAX_NOTE_CHARS);
    expect(rows[1].notes).toBe('');
  });

  it('orders by date, then by start time, with all-day first', () => {
    const rows = build([
      ev({ id: 'a', date: '2026-09-04', title: 'Later day' }),
      ev({ id: 'b', date: '2026-09-03', title: 'Timed', timing: { kind: 'moment', startTime: '15:00' } }),
      ev({ id: 'c', date: '2026-09-03', title: 'All day', timing: { kind: 'allDay', endDate: null } }),
    ]).rows;
    expect(rows.map((row) => row.title)).toEqual(['All day', 'Timed', 'Later day']);
  });

  it('narrows the window when the wide one is over the cap, and says so', () => {
    const rows = Array.from({ length: MAX_EVENT_ROWS + 10 }, (_, index) =>
      ev({ id: `w${index}`, date: index < 20 ? '2026-08-05' : '2026-09-10' }),
    );
    const snapshot = build(rows);
    expect(snapshot.from).toBe('2026-08-19');
    expect(snapshot.to).toBe('2026-10-17');
    expect(snapshot.rows.length).toBe(MAX_EVENT_ROWS + 10 - 20);
  });

  it('never reports a range wider than the rows it actually sent', () => {
    const rows = Array.from({ length: MAX_EVENT_ROWS + 40 }, (_, index) =>
      ev({ id: `n${index}`, date: '2026-09-10' }),
    );
    const snapshot = build(rows);
    expect(snapshot.rows.length).toBe(MAX_EVENT_ROWS);
    expect(snapshot.to).toBe('2026-09-10');
  });

  it('gives every row a handle and never reuses one across turns', () => {
    const first = buildCalendarSnapshot(
      [ev({ id: 'a' }), ev({ id: 'b', date: '2026-09-04' })],
      CATS,
      'Jeff',
      emptyHandleMap('e'),
      CAL_TODAY,
      CAL_NOW,
    );
    expect(first.snapshot.rows.map((row) => row.handle)).toEqual(['e1', 'e2']);

    const second = buildCalendarSnapshot(
      [ev({ id: 'b', date: '2026-09-04' }), ev({ id: 'c', date: '2026-09-05' })],
      CATS,
      'Jeff',
      first.map,
      CAL_TODAY,
      CAL_NOW,
    );
    expect(second.snapshot.rows.map((row) => row.handle)).toEqual(['e2', 'e3']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/assistantContext.test.ts
```

Expected: FAIL — `buildCalendarSnapshot` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/assistantContext.ts`, adding `addDays` to the existing `./dates` import and these type imports:

```ts
import type { CalendarEvent, EventTiming } from './calendarEvent';
import type { Category } from './categories';
import type { UserName } from './identity';
```

```ts
export const MAX_EVENT_ROWS = 250;
export const MAX_NOTE_CHARS = 200;
export const WIDE_BACK = 30;
export const WIDE_AHEAD = 90;
export const NARROW_BACK = 14;
export const NARROW_AHEAD = 45;

export interface CalendarSnapshotRow {
  handle: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  countdown: boolean;
  category: string;
  notes: string;
}

export interface CalendarSnapshot {
  today: string;
  weekday: string;
  now: string;
  from: string;
  to: string;
  categories: string[];
  rows: CalendarSnapshotRow[];
}

interface Window {
  from: string;
  to: string;
}

function lastDayOf(event: CalendarEvent): string {
  const { timing } = event;
  if (timing.kind === 'allDay' && timing.endDate !== null) return timing.endDate;
  return event.date;
}

function startKeyOf(timing: EventTiming): string {
  return timing.kind === 'allDay' ? '' : timing.startTime;
}

function within(event: CalendarEvent, window: Window): boolean {
  return event.date <= window.to && lastDayOf(event) >= window.from;
}

function ordered(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    const byStart = startKeyOf(a.timing).localeCompare(startKeyOf(b.timing));
    if (byStart !== 0) return byStart;
    return a.title.localeCompare(b.title);
  });
}

export function buildCalendarSnapshot(
  rows: CalendarEvent[],
  categories: Category[],
  owner: UserName,
  map: HandleMap,
  today: string,
  now: string,
): { snapshot: CalendarSnapshot; map: HandleMap } {
  const mine = ordered(rows.filter((event) => event.owner === owner));

  const wide: Window = { from: addDays(today, -WIDE_BACK), to: addDays(today, WIDE_AHEAD) };
  const narrow: Window = { from: addDays(today, -NARROW_BACK), to: addDays(today, NARROW_AHEAD) };

  const inWide = mine.filter((event) => within(event, wide));
  const window = inWide.length > MAX_EVENT_ROWS ? narrow : wide;
  const chosen = inWide.length > MAX_EVENT_ROWS ? mine.filter((event) => within(event, narrow)) : inWide;

  const sent = chosen.slice(0, MAX_EVENT_ROWS);
  const to = sent.length < chosen.length ? sent[sent.length - 1].date : window.to;

  const nextMap = assignHandles(map, sent.map((event) => event.id));
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  return {
    snapshot: {
      today,
      weekday: WEEKDAYS_SHORT[weekdayIndex(today)],
      now,
      from: window.from,
      to,
      categories: categories.map((category) => category.name),
      rows: sent.map((event) => {
        const { timing } = event;
        return {
          handle: handleOf(nextMap, event.id) as string,
          title: event.title,
          date: event.date,
          endDate: timing.kind === 'allDay' ? (timing.endDate ?? '') : '',
          startTime: startKeyOf(timing),
          endTime: timing.kind === 'span' ? timing.endTime : '',
          countdown: event.countdown,
          category: event.categoryId === null ? '' : (nameById.get(event.categoryId) ?? ''),
          notes: (event.notes ?? '').slice(0, MAX_NOTE_CHARS),
        };
      }),
    },
    map: nextMap,
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/assistantContext.test.ts
```

Expected: PASS — the existing to-do snapshot tests plus 15 new ones.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
```

```bash
git add src/lib/assistantContext.ts src/lib/assistantContext.test.ts
git commit -m "feat(calendar-assistant): build the windowed event snapshot the bot reads"
```

---

## Task 6: The calendar route

One POST, one Gemini call, one flat JSON schema. The prompt has to say the shape rules out loud — the to-do bot shipped with a prompt that never mentioned them, the parser silently rejected every real reply, and 631 green unit tests could not see it because they fed the parser hand-written objects that already obeyed a contract the model was never told.

**Files:**
- Modify: `src/lib/assistantBody.ts`
- Modify: `src/lib/assistantBody.test.ts`
- Create: `src/app/api/assistant/calendar/route.ts`
- Modify: `src/lib/assistantRequest.ts`

**Interfaces:**
- Consumes: `parseHistory`, `MAX_TITLE_CHARS` (Task 1); `CalendarSnapshot`, `MAX_EVENT_ROWS`, `MAX_NOTE_CHARS` (Task 5); `MAX_CHANGES` from `assistantReply.ts`; `GEMINI_MODEL` from `gemini.ts`; `isRateLimited` from `aiFailure.ts`; `reasonForStatus` from `assistantFailure.ts`.
- Produces:
  - `parseCalendarBody(value: unknown): { ok: true; snapshot: CalendarSnapshot; history: Message[] } | { ok: false }`
  - `askCalendarAssistant(snapshot: CalendarSnapshot, history: Message[]): Promise<ReplyResult>`
  - `POST` at `/api/assistant/calendar`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/assistantBody.test.ts`. Add `parseCalendarBody` to its import from `./assistantBody`.

```ts
function calRow(over: Record<string, unknown> = {}) {
  return {
    handle: 'e1',
    title: 'Standup',
    date: '2026-09-03',
    endDate: '',
    startTime: '09:00',
    endTime: '',
    countdown: false,
    category: 'Work',
    notes: '',
    ...over,
  };
}

function calBody(over: Record<string, unknown> = {}) {
  return {
    snapshot: {
      today: '2026-09-02',
      weekday: 'Wed',
      now: '14:30:00',
      from: '2026-08-03',
      to: '2026-12-01',
      categories: ['Work'],
      rows: [calRow()],
      ...over,
    },
    history: [{ role: 'you', text: 'what is on Thursday?' }],
  };
}

describe('parseCalendarBody', () => {
  it('accepts a well-formed body', () => {
    const parsed = parseCalendarBody(calBody());
    expect(parsed.ok).toBe(true);
  });

  it('accepts an empty board', () => {
    expect(parseCalendarBody(calBody({ rows: [] })).ok).toBe(true);
  });

  it('rejects a body that is not an object', () => {
    expect(parseCalendarBody('hello')).toEqual({ ok: false });
  });

  it('rejects a snapshot missing its window', () => {
    const body = calBody();
    delete (body.snapshot as Record<string, unknown>).to;
    expect(parseCalendarBody(body)).toEqual({ ok: false });
  });

  it('rejects a row with a field of the wrong type', () => {
    expect(parseCalendarBody(calBody({ rows: [calRow({ countdown: 'yes' })] }))).toEqual({
      ok: false,
    });
  });

  it('rejects a title longer than the cap', () => {
    expect(
      parseCalendarBody(calBody({ rows: [calRow({ title: 'x'.repeat(MAX_TITLE_CHARS + 1) })] })),
    ).toEqual({ ok: false });
  });

  it('rejects notes longer than the cap', () => {
    expect(
      parseCalendarBody(calBody({ rows: [calRow({ notes: 'x'.repeat(MAX_NOTE_CHARS + 1) })] })),
    ).toEqual({ ok: false });
  });

  it('rejects more rows than the cap allows', () => {
    const rows = Array.from({ length: MAX_EVENT_ROWS + 1 }, () => calRow());
    expect(parseCalendarBody(calBody({ rows }))).toEqual({ ok: false });
  });

  it('rejects a category list that is not strings', () => {
    expect(parseCalendarBody(calBody({ categories: [1, 2] }))).toEqual({ ok: false });
  });

  it('rejects an empty history', () => {
    expect(parseCalendarBody({ ...calBody(), history: [] })).toEqual({ ok: false });
  });

  it('rejects a history longer than the cap', () => {
    const history = Array.from({ length: MAX_HISTORY + 1 }, () => ({ role: 'you', text: 'hi' }));
    expect(parseCalendarBody({ ...calBody(), history })).toEqual({ ok: false });
  });
});
```

Add `MAX_HISTORY`, `MAX_TITLE_CHARS` to the test's `./assistantBody` import and `MAX_EVENT_ROWS`, `MAX_NOTE_CHARS` from `./assistantContext` if they are not already there.

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/assistantBody.test.ts
```

Expected: FAIL — `parseCalendarBody` is not exported.

- [ ] **Step 3: Write `parseCalendarBody`**

Append to `src/lib/assistantBody.ts`, widening its `./assistantContext` import to include `MAX_EVENT_ROWS`, `MAX_NOTE_CHARS`, `CalendarSnapshot` and `CalendarSnapshotRow`:

```ts
export type ParsedCalendarBody =
  | { ok: true; snapshot: CalendarSnapshot; history: Message[] }
  | { ok: false };

const CALENDAR_TEXT_FIELDS = [
  'handle',
  'date',
  'endDate',
  'startTime',
  'endTime',
  'category',
] as const;

function toCalendarRow(value: unknown): CalendarSnapshotRow | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  for (const field of CALENDAR_TEXT_FIELDS) {
    if (typeof raw[field] !== 'string') return null;
  }
  if (typeof raw.title !== 'string' || raw.title.length > MAX_TITLE_CHARS) return null;
  if (typeof raw.notes !== 'string' || raw.notes.length > MAX_NOTE_CHARS) return null;
  if (typeof raw.countdown !== 'boolean') return null;

  return {
    handle: raw.handle as string,
    title: raw.title,
    date: raw.date as string,
    endDate: raw.endDate as string,
    startTime: raw.startTime as string,
    endTime: raw.endTime as string,
    countdown: raw.countdown,
    category: raw.category as string,
    notes: raw.notes,
  };
}

function toCalendarSnapshot(value: unknown): CalendarSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.today !== 'string' || typeof raw.weekday !== 'string') return null;
  if (typeof raw.now !== 'string') return null;
  if (typeof raw.from !== 'string' || typeof raw.to !== 'string') return null;
  if (!Array.isArray(raw.categories) || !Array.isArray(raw.rows)) return null;
  if (raw.categories.some((name) => typeof name !== 'string')) return null;
  if (raw.rows.length > MAX_EVENT_ROWS) return null;

  const rows: CalendarSnapshotRow[] = [];
  for (const entry of raw.rows) {
    const row = toCalendarRow(entry);
    if (row === null) return null;
    rows.push(row);
  }

  return {
    today: raw.today,
    weekday: raw.weekday,
    now: raw.now,
    from: raw.from,
    to: raw.to,
    categories: raw.categories as string[],
    rows,
  };
}

export function parseCalendarBody(value: unknown): ParsedCalendarBody {
  if (typeof value !== 'object' || value === null) return { ok: false };
  const raw = value as Record<string, unknown>;
  const snapshot = toCalendarSnapshot(raw.snapshot);
  const history = parseHistory(raw.history);
  if (snapshot === null || history === null) return { ok: false };
  return { ok: true, snapshot, history };
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/assistantBody.test.ts
```

Expected: PASS — the existing to-do body tests plus 11 new ones.

- [ ] **Step 5: Write the route**

Create `src/app/api/assistant/calendar/route.ts`:

```ts
import { GoogleGenAI, type Interactions } from '@google/genai';
import { isRateLimited } from '@/lib/aiFailure';
import { GEMINI_MODEL } from '@/lib/gemini';
import { MAX_CHANGES } from '@/lib/assistantReply';
import { parseCalendarBody, type Message } from '@/lib/assistantBody';

export const maxDuration = 30;

const SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['answer', 'question', 'plan', 'refusal'] },
    text: { type: 'string' },
    summary: { type: 'string' },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['add', 'edit', 'delete'] },
          handle: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string' },
          endDate: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          notes: { type: 'string' },
          countdown: { type: 'boolean' },
          category: { type: 'string' },
        },
        required: [
          'op',
          'handle',
          'title',
          'date',
          'endDate',
          'startTime',
          'endTime',
          'notes',
          'countdown',
          'category',
        ],
      },
    },
  },
  required: ['kind', 'text', 'summary', 'changes'],
};

const SYSTEM = `You manage one person's calendar. You work only on the events
you are given below. You cannot see or change anyone else's calendar, and you
cannot touch the to-do list, the timer, or anything else in the app.

Reply with exactly one kind:
- "answer" for a question you can answer from the events.
- "question" when you genuinely cannot proceed.
- "plan" when you know what to change.
- "refusal" when you cannot do it at all.

Ops: add, edit, delete. Nothing else exists. There are no repeating events and
no reminders.
Refer to an existing event by its handle, exactly as given. Never invent one.
An add has an empty handle. Every change sends every field, always: add and
edit fill in the whole end state, and delete still sends title, date, endDate,
startTime, endTime, notes and category as empty strings and countdown as false.
Never put the same handle in two changes. At most ${MAX_CHANGES} changes.

Dates are YYYY-MM-DD, times are HH:MM in 24 hours. Empty string means none.
You are given today's date and weekday. Work out "tomorrow" and "next Friday"
from those.

An event with no start time is an all-day event. Only an all-day event may have
an endDate, and it runs from date to endDate. A timed event has a startTime and
may have an endTime; it must not have an endDate. An endTime without a
startTime is not allowed, and an endTime must be later than the startTime.

Reading is limited to a window. Writing is not.
- You were sent the events between the two dates given below and nothing else.
- If you are asked about a date outside that window, say plainly that you can
  only see that range, and name it. Do not guess.
- You cannot edit or delete an event you were not shown, because you cannot
  find it. Say so, and suggest opening that month.
- You CAN add an event on any date, inside the window or far outside it. Never
  refuse an add for being outside the window. When you refuse a question about
  a date you cannot see, say that you can still add something there.

Use one of the category names given below, or leave the category empty. Never
invent a category — you cannot create one.

Leave an optional field empty rather than inventing it. An event with no end
time, no notes and no category is normal and correct.

If more than one event matches what the person said, you must reply with
"question" naming the candidates. Do not pick one. Guessing which event someone
meant is worse than asking, because the change is applied to real data.
Also ask when a date is genuinely ambiguous — "next Friday" said on a Friday.
Do not ask which category, what time, or whether something is a countdown:
leave an optional field empty instead.

Fill only the fields that belong to your reply kind.
A "plan" fills "summary" and "changes", and leaves "text" as an empty string.
An "answer", "question" or "refusal" fills "text", and leaves "summary" as an
empty string and "changes" as an empty list. Never put changes in a reply that
is not a plan.

A cancelled plan was rejected. Do not offer it again unless asked.`;

function transcript(history: Message[]): string {
  return history
    .map((message) => `${message.role === 'you' ? 'Person' : 'You'}: ${message.text}`)
    .join('\n');
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Assistant not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }

  const parsed = parseCalendarBody(body);
  if (!parsed.ok) {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
  const { snapshot, history } = parsed;

  try {
    const prompt = `${SYSTEM}

Today is ${snapshot.weekday} ${snapshot.today}. The time is ${snapshot.now}.
You can see events from ${snapshot.from} to ${snapshot.to} and no others.

Your category names:
${JSON.stringify(snapshot.categories)}

Events:
${JSON.stringify(snapshot.rows)}

Conversation so far:
${transcript(history)}`;

    const client = new GoogleGenAI({ apiKey: key });
    const input: Interactions.Content[] = [{ type: 'text', text: prompt }];

    const interaction = await client.interactions.create({
      model: GEMINI_MODEL,
      input,
      response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
    });

    if (!interaction.output_text) {
      return Response.json({ error: 'No reply' }, { status: 502 });
    }

    return Response.json(JSON.parse(interaction.output_text));
  } catch (err) {
    console.error('Calendar assistant reply failed:', err);
    if (isRateLimited(err)) {
      return Response.json({ error: 'Out of replies for today' }, { status: 429 });
    }
    return Response.json({ error: 'Could not reply' }, { status: 502 });
  }
}
```

- [ ] **Step 6: Add the browser's door to that route**

Append to `src/lib/assistantRequest.ts`, widening its `./assistantContext` import to include `CalendarSnapshot`. Both askers share one body of work so the abort budget cannot drift between them:

```ts
async function ask(
  path: string,
  body: { snapshot: unknown; history: Message[] },
): Promise<ReplyResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), MESSAGE_BUDGET_MS);

  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: reasonForStatus(response.status) };
    }

    return { ok: true, value: await response.json() };
  } catch (err) {
    console.error('Assistant request failed:', err);
    if (controller.signal.aborted) return { ok: false, reason: { kind: 'timeout' } };
    return { ok: false, reason: { kind: 'offline' } };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function askCalendarAssistant(
  snapshot: CalendarSnapshot,
  history: Message[],
): Promise<ReplyResult> {
  return ask('/api/assistant/calendar', { snapshot, history });
}
```

Rewrite `askTodoAssistant` to call the same helper, keeping its exported signature exactly as it is:

```ts
export async function askTodoAssistant(
  snapshot: TodoSnapshot,
  history: Message[],
): Promise<ReplyResult> {
  return ask('/api/assistant/todo', { snapshot, history });
}
```

- [ ] **Step 7: Typecheck, lint, build and run the suite**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

The build must be run here: a route handler is the one file in this plan that no test executes, so a compile error in it would otherwise reach the browser step undetected.

- [ ] **Step 8: Commit**

```bash
git add src/lib/assistantBody.ts src/lib/assistantBody.test.ts src/app/api/assistant/calendar/route.ts src/lib/assistantRequest.ts
git commit -m "feat(calendar-assistant): add the calendar reply route and its request body"
```
---

## Task 7: Make the three components serve either section

`AssistantSheet`, `PlanCard` and `AssistantButton` are the same UI twice over. Rather than copy 400 lines of JSX, they take a **section object** — the one place where "which bot is this" lives. The section is wiring, not judgement: every decision it hands over already has a test in `lib/`.

To-do behaviour must be identical after this task. The suite cannot see `.tsx`, so the guard here is `npm run build` plus the browser pass in Task 9.

**Files:**
- Create: `src/components/assistant/section.ts`
- Create: `src/components/assistant/todoSection.ts`
- Modify: `src/components/assistant/AssistantSheet.tsx`
- Modify: `src/components/assistant/PlanCard.tsx`
- Modify: `src/components/assistant/AssistantButton.tsx`
- Modify: `src/components/todo/TodoBoard.tsx` (the clock prop only)

**Interfaces:**
- Consumes: everything produced by Tasks 1–6.
- Produces:
  - `AssistantClock = { today: string; now: string }`
  - `AssistantSection<C extends { handle: string }, R>` — the contract below
  - `withStepBudget(work: Promise<StepOutcome>): Promise<StepOutcome>` and `STEP_BUDGET_MS = 10_000`
  - `todoSection: AssistantSection<TodoChange, Todo>`
  - `AssistantButton` props become `{ section, owner, rows, clock, onApplied }`

- [ ] **Step 1: Write the section contract**

Create `src/components/assistant/section.ts`:

```ts
import type { HandleMap } from '@/lib/assistantContext';
import type { ChangeParser, Reason } from '@/lib/assistantReply';
import type { Planned, StepOutcome } from '@/lib/assistantRun';
import type { Message, ReplyResult } from '@/lib/assistantRequest';
import type { UserName } from '@/lib/identity';

export const STEP_BUDGET_MS = 10_000;

export interface AssistantClock {
  today: string;
  now: string;
}

export interface AskInput<R> {
  rows: R[];
  map: HandleMap;
  today: string;
  now: string;
  history: Message[];
}

export interface AssistantSection<C extends { handle: string }, R> {
  prefix: string;
  title: string;
  placeholder: string;
  fetchFailure: string;
  ask(input: AskInput<R>): Promise<{ map: HandleMap; result: ReplyResult }>;
  parser(map: HandleMap, today: string): ChangeParser<C>;
  validatePlan(changes: C[]): Reason | null;
  reconcile(changes: C[], map: HandleMap, rows: R[]): Planned<C>[];
  clashTitles(entry: Planned<C>, rows: R[]): string[];
  outsideNote(change: C): string;
  opWord(change: C): string;
  describe(change: C): string;
  fetchFresh(owner: UserName): Promise<R[] | null>;
  runChange(entry: Planned<C>, owner: UserName): Promise<StepOutcome>;
}

export async function withStepBudget(work: Promise<StepOutcome>): Promise<StepOutcome> {
  let timer!: number;
  const budget = new Promise<StepOutcome>((resolve) => {
    timer = window.setTimeout(() => resolve('unreached'), STEP_BUDGET_MS);
  });

  const outcome = await Promise.race([work, budget]);
  window.clearTimeout(timer);
  return outcome;
}
```

- [ ] **Step 2: Move the to-do wiring into its own section**

Create `src/components/assistant/todoSection.ts`, lifting `runChange`, the op words and the change description out of `AssistantSheet.tsx` and `PlanCard.tsx` unchanged:

```ts
import { buildTodoSnapshot } from '@/lib/assistantContext';
import { askTodoAssistant } from '@/lib/assistantRequest';
import {
  clashesFor,
  reconcileTodoPlan,
  toDraft,
  todoChangeParser,
  validateTodoPlan,
  type TodoChange,
} from '@/lib/todoPlan';
import {
  deleteTodo,
  fetchTodos,
  insertTodo,
  setTodoDone,
  updateTodo,
} from '@/lib/todoRepo';
import type { Todo } from '@/lib/todo';
import { withStepBudget, type AssistantSection } from './section';

const OP_WORDS: Record<TodoChange['op'], string> = {
  add: 'Add',
  edit: 'Change',
  complete: 'Tick off',
  reopen: 'Reopen',
  delete: 'Delete',
};

export const todoSection: AssistantSection<TodoChange, Todo> = {
  prefix: 't',
  title: 'Ask about your list',
  placeholder: 'Move dentist to Friday',
  fetchFailure: 'Could not reach your list. Nothing was changed.',

  async ask({ rows, map, today, now, history }) {
    const built = buildTodoSnapshot(rows, map, today, now);
    return { map: built.map, result: await askTodoAssistant(built.snapshot, history) };
  },

  parser: (map, today) => todoChangeParser(map, today),
  validatePlan: validateTodoPlan,
  reconcile: reconcileTodoPlan,
  clashTitles: (entry, rows) =>
    clashesFor(entry.change, rows, entry.id).map((row) => row.title),
  outsideNote: () => '',
  opWord: (change) => OP_WORDS[change.op],

  describe(change) {
    const parts = [change.title];
    if (change.dueDate !== '') parts.push(change.dueDate);
    if (change.dueTime !== '') parts.push(change.dueTime);
    if (change.priority) parts.push('priority');
    return parts.join(' · ');
  },

  async fetchFresh(owner) {
    const fresh = await fetchTodos(owner);
    return fresh.status === 'ok' ? fresh.rows : null;
  },

  runChange({ change, id }, owner) {
    return withStepBudget(
      (async () => {
        if (change.op === 'add') {
          return (await insertTodo(toDraft(change, owner))) === null ? 'failed' : 'saved';
        }
        if (change.op === 'edit') {
          return (await updateTodo(id as string, toDraft(change, owner))) ? 'saved' : 'failed';
        }
        if (change.op === 'delete') {
          return (await deleteTodo(id as string)) ? 'saved' : 'failed';
        }
        return (await setTodoDone(id as string, change.op === 'complete')) ? 'saved' : 'failed';
      })(),
    );
  },
};
```

- [ ] **Step 3: Make `PlanCard` generic**

Replace `src/components/assistant/PlanCard.tsx` with:

```tsx
'use client';

import { AlertTriangle, Check, X } from 'lucide-react';
import { buttonStateFor, isRetryable, type Planned } from '@/lib/assistantRun';
import type { AssistantSection } from './section';

export default function PlanCard<C extends { handle: string }, R>({
  section,
  summary,
  planned,
  rows,
  running,
  onApply,
  onCancel,
  cancelled,
}: {
  section: AssistantSection<C, R>;
  summary: string;
  planned: Planned<C>[];
  rows: R[];
  running: boolean;
  onApply: () => void;
  onCancel: () => void;
  cancelled: boolean;
}) {
  const state = buttonStateFor(planned.map((entry) => entry.outcome), running);
  const saved = planned.filter((entry) => entry.outcome === 'saved').length;
  const retryCount = planned.filter((entry) => isRetryable(entry.outcome)).length;

  return (
    <div className="mt-soft border border-[var(--mt-border)] p-4">
      <p className="text-sm font-medium text-[var(--mt-text)]">{summary}</p>

      <ul className="mt-3 space-y-2">
        {planned.map((entry, index) => {
          const clashes = section.clashTitles(entry, rows);
          const outside = section.outsideNote(entry.change);
          const pending = entry.outcome !== 'saved' && entry.outcome !== 'stale';
          return (
            <li key={index} className="text-sm text-[var(--mt-text)]">
              <span className="font-medium">{section.opWord(entry.change)}</span>{' '}
              {section.describe(entry.change)}
              {entry.outcome === 'saved' && (
                <Check size={14} className="ml-1 inline text-[var(--mt-text-muted)]" aria-label="saved" />
              )}
              {entry.note !== '' && (
                <span className="ml-1 text-[var(--mt-text-muted)]">— {entry.note}</span>
              )}
              {outside !== '' && (
                <span className="ml-1 text-[var(--mt-text-muted)]">— {outside}</span>
              )}
              {clashes.length > 0 && pending && (
                <span className="mt-1 flex items-center gap-1 text-[var(--mt-text-muted)]">
                  <AlertTriangle size={14} aria-hidden />
                  You already have &ldquo;{clashes[0]}&rdquo; that day.
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {cancelled && <p className="mt-3 text-sm text-[var(--mt-text-muted)]">Cancelled.</p>}

      {state === 'done' && (
        <p className="mt-3 text-sm text-[var(--mt-text-muted)]">
          {saved === 0 ? 'Nothing saved.' : `Saved. ${saved} of ${planned.length}.`}
        </p>
      )}

      {!cancelled && state !== 'done' && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={running}
            className="min-h-11 flex-1 rounded-full bg-[var(--mt-accent)] px-4 text-sm font-medium text-[var(--mt-text)] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
          >
            {running ? 'Saving…' : state === 'retry' ? `Try the other ${retryCount} again` : 'Apply'}
          </button>
          {state === 'idle' && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="min-h-11 min-w-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Make `AssistantSheet` generic**

Replace `src/components/assistant/AssistantSheet.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import PlanCard from './PlanCard';
import { assistantFailureMessage } from '@/lib/assistantFailure';
import { MAX_MESSAGE_CHARS } from '@/lib/assistantBody';
import { emptyHandleMap, type HandleMap } from '@/lib/assistantContext';
import { capStatus, countFromYou, historyFor, type Entry } from '@/lib/assistantConversation';
import { parseReply } from '@/lib/assistantReply';
import { applySummary, runPlan, type ApplyTone } from '@/lib/applyRun';
import type { UserName } from '@/lib/identity';
import type { AssistantClock, AssistantSection } from './section';

export default function AssistantSheet<C extends { handle: string }, R>({
  open,
  onClose,
  section,
  owner,
  rows,
  clock,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  section: AssistantSection<C, R>;
  owner: UserName;
  rows: R[];
  clock: () => AssistantClock;
  onApplied: (message: string, tone: ApplyTone) => void;
}) {
  const [entries, setEntries] = useState<Entry<C>[]>([]);
  const [map, setMap] = useState<HandleMap>(() => emptyHandleMap(section.prefix));
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [running, setRunning] = useState(false);

  const { remaining, full, warn } = capStatus(countFromYou(entries));

  function reset() {
    setEntries([]);
    setMap(emptyHandleMap(section.prefix));
    setDraft('');
  }

  function say(text: string) {
    setEntries((prev) => [...prev, { kind: 'text', role: 'assistant', text }]);
  }

  async function send() {
    const text = draft.trim();
    if (text === '' || full || thinking) return;

    const asked: Entry<C>[] = [...entries, { kind: 'text', role: 'you', text }];
    setEntries(asked);
    setDraft('');
    setThinking(true);

    const { today, now } = clock();
    const { map: nextMap, result } = await section.ask({
      rows,
      map,
      today,
      now,
      history: historyFor(asked),
    });
    setMap(nextMap);
    setThinking(false);

    if (!result.ok) {
      say(assistantFailureMessage(result.reason));
      return;
    }

    const parsed = parseReply<C>(result.value, section.parser(nextMap, today));
    if (!parsed.ok) {
      say(assistantFailureMessage(parsed.reason));
      return;
    }

    if (parsed.reply.kind !== 'plan') {
      say(parsed.reply.text);
      return;
    }

    const duplicate = section.validatePlan(parsed.reply.changes);
    if (duplicate !== null) {
      say(assistantFailureMessage(duplicate));
      return;
    }

    const plan = parsed.reply;
    setEntries((prev) => [
      ...prev,
      {
        kind: 'plan',
        summary: plan.summary,
        planned: section.reconcile(plan.changes, nextMap, rows),
        cancelled: false,
      },
    ]);
  }

  async function apply(index: number) {
    setRunning(true);
    try {
      const fresh = await section.fetchFresh(owner);
      if (fresh === null) {
        onApplied(section.fetchFailure, 'problem');
        return;
      }

      const entry = entries[index] as Extract<Entry<C>, { kind: 'plan' }>;
      const results = await runPlan<C>(
        entry.planned,
        (change) => section.reconcile([change], map, fresh)[0],
        (step) => section.clashTitles(step, fresh),
        (step) => section.runChange(step, owner),
        Date.now,
      );

      setEntries((prev) =>
        prev.map((e, i) => (i === index && e.kind === 'plan' ? { ...e, planned: results } : e)),
      );

      const { message, tone } = applySummary(results);
      onApplied(message, tone);
    } finally {
      setRunning(false);
    }
  }

  function cancel(index: number) {
    setEntries(
      entries.map((entry, i) =>
        i === index && entry.kind === 'plan' ? { ...entry, cancelled: true } : entry,
      ),
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={section.title} variant="sheet" maxWidthClass="max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3" aria-live="polite">
          {entries.map((entry, index) =>
            entry.kind === 'text' ? (
              <p
                key={index}
                className={
                  entry.role === 'you'
                    ? 'self-end rounded-2xl bg-[color-mix(in_srgb,var(--mt-accent)_28%,transparent)] px-3 py-2 text-sm text-[var(--mt-text)]'
                    : 'text-sm text-[var(--mt-text)]'
                }
              >
                {entry.text}
              </p>
            ) : (
              <PlanCard
                key={index}
                section={section}
                summary={entry.summary}
                planned={entry.planned}
                rows={rows}
                running={running}
                cancelled={entry.cancelled}
                onApply={() => apply(index)}
                onCancel={() => cancel(index)}
              />
            ),
          )}

          {thinking && <p className="text-sm text-[var(--mt-text-muted)]">Thinking…</p>}
        </div>

        {full ? (
          <div className="mt-soft p-4">
            <p className="text-sm font-medium text-[var(--mt-text)]">This chat is full.</p>
            <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
              Six messages is the limit, so replies stay fast and cheap. Start a new one — it will
              still see everything on your board.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 min-h-11 w-full rounded-full bg-[var(--mt-accent)] px-4 text-sm font-medium text-[var(--mt-text)]"
            >
              Start new chat
            </button>
          </div>
        ) : (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={section.placeholder}
                aria-label="Message"
                maxLength={MAX_MESSAGE_CHARS}
                className="min-h-11 flex-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm text-[var(--mt-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
              />
              <button
                type="submit"
                disabled={thinking}
                className="min-h-11 min-w-11 rounded-full bg-[var(--mt-accent)] px-4 text-sm font-medium text-[var(--mt-text)] disabled:opacity-60"
              >
                Send
              </button>
            </form>
            {warn && (
              <p className="text-xs text-[var(--mt-text-muted)]">
                {remaining} messages left in this chat.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
```

The clock arrives as a function and is read inside `send`, an event handler. Reading a wall clock during render is what the purity lint rule forbids, and it would also make SSR and the first client render disagree.

- [ ] **Step 5: Make `AssistantButton` generic**

Replace `src/components/assistant/AssistantButton.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AssistantSheet from './AssistantSheet';
import type { ApplyTone } from '@/lib/applyRun';
import type { UserName } from '@/lib/identity';
import type { AssistantClock, AssistantSection } from './section';

export default function AssistantButton<C extends { handle: string }, R>({
  section,
  owner,
  rows,
  clock,
  onApplied,
}: {
  section: AssistantSection<C, R>;
  owner: UserName;
  rows: R[];
  clock: () => AssistantClock;
  onApplied: (message: string, tone: ApplyTone) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={section.title}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mt-accent)] text-[var(--mt-text)] shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
      >
        <Sparkles size={22} aria-hidden />
      </button>
      <AssistantSheet
        open={open}
        onClose={() => setOpen(false)}
        section={section}
        owner={owner}
        rows={rows}
        clock={clock}
        onApplied={onApplied}
      />
    </>
  );
}
```

- [ ] **Step 6: Update `TodoBoard`**

In `src/components/todo/TodoBoard.tsx`, add the import:

```ts
import { todoSection } from '@/components/assistant/todoSection';
```

and change the render to pass the section and the clock as a function:

```tsx
        <AssistantButton
          section={todoSection}
          owner={signedIn}
          rows={todos}
          clock={() => clock}
          onApplied={(message, tone) => {
            setNotice({ text: message, tone });
            setReloadToken((token) => token + 1);
          }}
        />
```

Its `today` and `now` props are gone. Nothing else in `TodoBoard` changes — its scheduled clock still drives the rest of the board.

- [ ] **Step 7: Typecheck, lint, test and build**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

Expected: clean. The suite count is unchanged from Task 6 — nothing here is testable by Vitest, which is exactly why the section object carries no decisions of its own.

- [ ] **Step 8: Commit**

```bash
git add src/components/assistant/section.ts src/components/assistant/todoSection.ts src/components/assistant/AssistantSheet.tsx src/components/assistant/PlanCard.tsx src/components/assistant/AssistantButton.tsx src/components/todo/TodoBoard.tsx
git commit -m "refactor(assistant): drive the chat components from a section object"
```

---

## Task 8: Put the bot on the calendar

**Files:**
- Create: `src/components/assistant/calendarSection.ts`
- Modify: `src/components/calendar/CalendarBoard.tsx`
- Modify: `src/lib/assistantAccent.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: `calendarSection(input: { categories: Category[]; month: string }): AssistantSection<CalendarChange, CalendarEvent>`

- [ ] **Step 1: Pin the calendar accent first**

Add to `src/lib/assistantAccent.test.ts`, inside the existing `describe`:

```ts
  it('keeps a cocoa icon readable on the calendar accent', () => {
    const ratio = contrastRatio(token('--mac-accent-calendar'), token('--mac-cocoa'));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('is why the calendar icon is not white either', () => {
    const ratio = contrastRatio(token('--mac-accent-calendar'), token('--mac-white'));
    expect(ratio).toBeLessThan(3);
  });
```

The button fills with `--mt-accent`, which on `/study/calendar` resolves to `--mac-accent-calendar` `#FFB5F4`, and draws its icon in `--mt-text`, which is `--mac-cocoa`. Measured now: 8.18:1 against cocoa, 1.59:1 against white. The second assertion is the one that keeps someone from "fixing" the icon to white later.

```bash
npx vitest run src/lib/assistantAccent.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 2: Write the calendar section**

Create `src/components/assistant/calendarSection.ts`:

```ts
import { buildCalendarSnapshot } from '@/lib/assistantContext';
import { askCalendarAssistant } from '@/lib/assistantRequest';
import {
  calendarChangeParser,
  categoryIdFor,
  clashesFor,
  reconcileCalendarPlan,
  toEventInput,
  validateCalendarPlan,
  type CalendarChange,
} from '@/lib/calendarPlan';
import { deleteEvent, insertEvent, updateEvent, fetchEvents } from '@/lib/calendarRepo';
import { monthOf } from '@/lib/dates';
import type { CalendarEvent } from '@/lib/calendarEvent';
import type { Category } from '@/lib/categories';
import { withStepBudget, type AssistantSection } from './section';

const OP_WORDS: Record<CalendarChange['op'], string> = {
  add: 'Add',
  edit: 'Change',
  delete: 'Delete',
};

export function calendarSection({
  categories,
  month,
}: {
  categories: Category[];
  month: string;
}): AssistantSection<CalendarChange, CalendarEvent> {
  const names = categories.map((category) => category.name);

  return {
    prefix: 'e',
    title: 'Ask about your calendar',
    placeholder: 'Move the dentist to Friday',
    fetchFailure: 'Could not reach your calendar. Nothing was changed.',

    async ask({ rows, map, today, now, history }) {
      const owner = rows.length > 0 ? rows[0].owner : 'Jeff';
      const built = buildCalendarSnapshot(rows, categories, owner, map, today, now);
      return { map: built.map, result: await askCalendarAssistant(built.snapshot, history) };
    },

    parser: (map, today) => calendarChangeParser(map, today, names),
    validatePlan: validateCalendarPlan,
    reconcile: reconcileCalendarPlan,
    clashTitles: (entry, rows) =>
      clashesFor(entry.change, rows, entry.id).map((row) => row.title),

    outsideNote(change) {
      if (change.op === 'delete' || change.date === '') return '';
      return monthOf(change.date) === month ? '' : "that's outside the month you're looking at";
    },

    opWord: (change) => OP_WORDS[change.op],

    describe(change) {
      const parts = [change.title];
      if (change.date !== '') parts.push(change.date);
      if (change.endDate !== '') parts.push(`to ${change.endDate}`);
      if (change.startTime !== '') {
        parts.push(change.endTime === '' ? change.startTime : `${change.startTime}–${change.endTime}`);
      }
      if (change.startTime === '' && change.date !== '') parts.push('all day');
      if (change.category !== '') parts.push(change.category);
      if (change.countdown) parts.push('countdown');
      return parts.join(' · ');
    },

    fetchFresh: () => fetchEvents(),

    runChange({ change, id }, owner) {
      const categoryId = categoryIdFor(change.category, categories);
      return withStepBudget(
        (async () => {
          if (change.op === 'delete') {
            return (await deleteEvent(id as string)) ? 'saved' : 'failed';
          }
          const input = toEventInput(change, owner, categoryId);
          if (change.op === 'add') {
            return (await insertEvent(input)) ? 'saved' : 'failed';
          }
          return (await updateEvent(id as string, input)) ? 'saved' : 'failed';
        })(),
      );
    },
  };
}
```

`ask` derives the owner from the rows it is handed because `CalendarBoard` only ever hands it the signed-in person's events — the button does not render otherwise. `fetchFresh` returns every event, and `runPlan` reconciles against that; an id either still exists or the change is stale, and whose row it is cannot change.

- [ ] **Step 3: Wire it into `CalendarBoard`**

In `src/components/calendar/CalendarBoard.tsx`:

Add the imports:

```ts
import AssistantButton from '@/components/assistant/AssistantButton';
import { calendarSection } from '@/components/assistant/calendarSection';
import { timeISO } from '@/lib/dates';
```

`timeISO` joins the existing `@/lib/dates` import line rather than making a new one.

Add the notice type beside `ModalState`:

```ts
type NoticeTone = 'ok' | 'problem';

interface Notice {
  text: string;
  tone: NoticeTone;
}
```

Add the state beside `saveError`:

```ts
  const [notice, setNotice] = useState<Notice | null>(null);
```

Add the two memos after the existing `dayEvents` memo:

```ts
  const myEvents = useMemo(
    () => events.filter((event) => event.owner === signedInAs),
    [events, signedInAs],
  );

  const section = useMemo(() => calendarSection({ categories, month }), [categories, month]);
```

Render the notice directly under `<FilterStrip …/>`:

```tsx
      {notice ? (
        <p
          role="status"
          className={`text-sm ${
            notice.tone === 'problem' ? 'text-[var(--mt-danger)]' : 'text-[var(--mt-text-muted)]'
          }`}
        >
          {notice.text}
        </p>
      ) : null}
```

Render the button as the last child of the outermost `<div>`, after the `CategoryManager` block:

```tsx
      {owner === signedInAs && (
        <AssistantButton
          section={section}
          owner={signedInAs}
          rows={myEvents}
          clock={() => ({ today: todayISO(), now: timeISO() })}
          onApplied={(message, tone) => {
            setNotice({ text: message, tone });
            load();
          }}
        />
      )}
```

`owner` here is the owner *filter*. The button is hidden when the filter is the partner and hidden on **Both** — a bot that silently ignored half a visible board would answer questions wrongly with no way to tell.

- [ ] **Step 4: Typecheck, lint, test and build**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

Expected: clean, and the suite is at its Task 5 count plus the 2 new accent tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/calendarSection.ts src/components/calendar/CalendarBoard.tsx src/lib/assistantAccent.test.ts
git commit -m "feat(calendar): open the assistant from the calendar and refetch after it saves"
```

---

## Task 9: Verify it in the browser and open the pull request

Vitest never renders a component here, and the to-do bot's worst defect — a system prompt and a parser that disagreed — was invisible to 631 green tests and showed up on the first real reply. This step is not optional.

**Files:**
- Create: `docs/superpowers/verification/2026-09-02-calendar-assistant.md`

- [ ] **Step 1: Start the app through the preview tooling**

Never `npm run dev` in a raw shell. Use the preview tool so the browser attaches.

- [ ] **Step 2: Walk the list, recording pass or fail for each**

1. The button appears on `/study/calendar` with the owner filter on yourself.
2. Switch the filter to Rachel — the button disappears. Switch to **Both** — it stays hidden.
3. Go back to `/todo` — the to-do bot still opens, sends and applies exactly as before. This is the regression check for Tasks 1 and 7.
4. `add dentist next Tuesday 3pm` → a plan card with the date and 15:00 filled, no end time.
5. Apply → the event appears on the board, the card collapses to "Saved. 1 of 1.", and the notice under the filters is muted grey, not red.
6. `add gym 8am to 7am tomorrow` → rejected in the form's own wording, "The end time must be after the start."
7. `add holiday all day from 20 Dec to 27 Dec` → an all-day plan with both dates; applying it produces one multi-day event.
8. `add lunch next Tuesday 3pm` when step 4's event is saved → the card shows the overlap warning before you tap.
9. `move the dentist to Friday` with two events whose titles both match → it asks which, and does not guess.
10. `what have I got on Thursday?` → a text answer, no card.
11. `what's on in March 2027?` → a refusal that names the real window **and** says it can still add something there.
12. `add trip on 14 Dec 2087` → rejected, and the message names 2087.
13. `put it in the Zumba category` when you have no such category → rejected, and the message names Zumba.
14. Send six messages → the "2 messages left" line appears, then the full panel with a working **Start new chat**.
15. Turn the network off, then send → "You're offline."
16. Turn the network off mid-Apply → the card reports per row and the button comes back as **Try again**, never stuck grey.
17. Open a plan, close the sheet mid-Apply → the board shows the notice anyway.
18. On a phone width, the button clears the bottom of the screen and is at least 44px.

- [ ] **Step 3: Write up what you saw**

Record each numbered check with its result and anything surprising. If something fails, fix it with a test written failing first, then re-run the list from the top.

- [ ] **Step 4: Commit and open the pull request**

```bash
git add docs/superpowers/verification/2026-09-02-calendar-assistant.md
git commit -m "docs: record the calendar assistant browser verification pass"
```

```bash
git push -u origin feat/calendar-assistant
```

The pull request description must call out three things this plan did beyond adding a second bot:

- Tasks 1, 2 and 7 refactored shipped to-do code. The to-do suite guarded it with its assertions untouched, and check 3 of the browser list is the end-to-end proof.
- `askTodoAssistant` and `askCalendarAssistant` now share one body, so the 20-second abort budget cannot drift between the two sections.
- The calendar plan card carries an extra line the to-do card does not: an add that lands outside the month on screen says so.

---

## Self-review notes

**Spec coverage.** Every numbered validation check in the spec has a home: 1–3 in `parseReply` (already shipped and unchanged), 4–8 in `calendarChangeParser` (Task 3), 9 in `validateCalendarPlan` (Task 4), 10 in the `validate()` call at the end of the parser (Task 3). The snapshot section, the window and the caps are Task 5. The prompt rules, including reading-versus-writing and the refusal that still offers an add, are Task 6. Apply, retry, budgets and the per-row report are inherited whole from the to-do bot through Tasks 1 and 7. Clash checks are Task 4 and rendered in Task 7. The button-visibility rule is Task 8.

**Deliberately not in this plan.** The spec's conversation cap, `nextStep`, `buttonStateFor`, the failure-message table and `parseReply` are already built and tested; this plan makes them generic rather than rebuilding them, and adds no new cases to them. `Reason` already carries `unknownCategory` and `formRejection`, which is why `assistantFailure.ts` is untouched.
