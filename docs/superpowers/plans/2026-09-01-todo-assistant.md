# To-do Assistant Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chat button to `/todo` that lets Jeff describe changes in words, and applies them to his to-do list only after he taps Apply on a plan card.

**Architecture:** One Gemini call per message from a server route that holds the API key. The route returns a flat JSON reply; the browser validates it against the handle map it owns, renders a plan card, and applies changes through the existing `todoRepo` functions. No service-role key, no second write path, nothing stored server-side.

**Tech Stack:** Next.js 16.2 App Router route handlers, `@google/genai` 2.18.0, React 19.2 client components, Supabase via the existing `todoRepo`, Vitest (node environment, no DOM).

**Spec:** `docs/superpowers/specs/2026-09-01-assistant-chat-design.md` — read it before starting. This plan implements the to-do half only.

## Global Constraints

- **No comments in code.** Names and structure carry the meaning. Existing comments stay.
- **Never hardcode a colour.** Use `--mt-*` semantic tokens. Raw `--mac-*` hues stay in `globals.css`.
- **No defensive guards for states the types exclude.** No fallbacks for cases that cannot occur.
- **`typeof` is banned for discriminating unions we own, and required at the wire boundary.** Parsing untrusted JSON from Gemini is where a union gets *established* — `src/app/api/meals/estimate/route.ts` already does exactly this in `toEstimate`. Do not flag it in review; do not use it anywhere else.
- **Catch exceptions only where there is something to do about them.** The route and the fetch wrapper catch because the network fails. Pure functions do not.
- Server Components by default; `'use client'` only on the leaf that needs it.
- Touch targets at least 44px. `min-h-dvh`, never `h-screen`.
- Tests are `src/**/*.test.ts` — **`.ts` only, `.tsx` is not collected by `vitest.config.ts`**. Every decision must therefore live in `src/lib/`, not in a component.
- Commit as Jeff's account. No `Co-Authored-By`, no trailers of any kind.
- Branch: `feat/todo-assistant`, cut from `main`.
- Caps, copied verbatim from the spec: **20** changes per plan, **12** messages per conversation (6 from Jeff), **200** to-do rows per snapshot, **5** years either side of today, **7** days of completed tasks.
- Budgets, copied verbatim from the spec: chat message **20s**, fresh fetch **10s**, each single change **10s**, whole Apply **30s**.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `src/lib/assistantReply.ts` | the reply union, the rejection `Reason` union, `parseReply` |
| `src/lib/assistantReply.test.ts` | |
| `src/lib/assistantContext.ts` | the handle map and the to-do snapshot builder |
| `src/lib/assistantContext.test.ts` | |
| `src/lib/todoPlan.ts` | to-do change shape, validation, reconcile, clash |
| `src/lib/todoPlan.test.ts` | |
| `src/lib/assistantFailure.ts` | every `Reason` to a sentence |
| `src/lib/assistantFailure.test.ts` | |
| `src/lib/assistantRun.ts` | `nextStep`, `buttonStateFor` — the Apply run decisions |
| `src/lib/assistantRun.test.ts` | |
| `src/lib/assistantRequest.ts` | the browser fetch wrapper with its abort budget |
| `src/lib/assistantAccent.test.ts` | pins the button's icon contrast |
| `src/app/api/assistant/todo/route.ts` | the one Gemini call |
| `src/components/assistant/AssistantButton.tsx` | the floating button |
| `src/components/assistant/AssistantSheet.tsx` | thread, input, message cap |
| `src/components/assistant/PlanCard.tsx` | change list, Apply, report, retry |

**Modify:**

- `src/components/todo/TodoBoard.tsx` — render the button, refetch after Apply, show the board notice

Files split by responsibility, not layer: everything a reviewer must reason about together — a change's shape, its validation, its reconcile and its clash rule — sits in `todoPlan.ts`, so Plan 2 can add `calendarPlan.ts` beside it without touching this one.

---

### Task 1: Reply shapes and the envelope check

**Files:**
- Create: `src/lib/assistantReply.ts`
- Test: `src/lib/assistantReply.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Reason` — the tagged rejection union, used by Tasks 4, 5, 9.
  - `type AssistantReply<C> = TextReply | PlanReply<C>`
  - `type Parsed<C> = { ok: true; reply: AssistantReply<C> } | { ok: false; reason: Reason }`
  - `function parseReply<C>(value: unknown, parseChange: ChangeParser<C>): Parsed<C>`
  - `type ChangeParser<C> = (raw: unknown) => { ok: true; change: C } | { ok: false; reason: Reason }`
  - `const MAX_CHANGES = 20`

This task covers spec checks 1, 2 and 3 — the kind is known, the shape matches the kind, and the change count is in range. Checks 4 to 10 live in the `parseChange` callback that Task 4 supplies, so this file never learns what a to-do is and Plan 2 reuses it unchanged.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseReply, MAX_CHANGES, type ChangeParser } from './assistantReply';

const acceptAny: ChangeParser<{ op: string }> = (raw) => ({
  ok: true,
  change: raw as { op: string },
});

function wire(overrides: Record<string, unknown> = {}) {
  return { kind: 'answer', text: 'You have three things Thursday.', summary: '', changes: [], ...overrides };
}

describe('parseReply', () => {
  it('accepts a text reply', () => {
    const result = parseReply(wire(), acceptAny);
    expect(result).toEqual({
      ok: true,
      reply: { kind: 'answer', text: 'You have three things Thursday.' },
    });
  });

  it('accepts a plan', () => {
    const result = parseReply(
      wire({ kind: 'plan', text: '', summary: 'Add one task', changes: [{ op: 'add' }] }),
      acceptAny,
    );
    expect(result).toEqual({
      ok: true,
      reply: { kind: 'plan', summary: 'Add one task', changes: [{ op: 'add' }] },
    });
  });

  it('rejects an unknown kind', () => {
    const result = parseReply(wire({ kind: 'shrug' }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a text reply carrying changes', () => {
    const result = parseReply(wire({ changes: [{ op: 'add' }] }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'shapeMismatch' } });
  });

  it('rejects a text reply carrying a summary', () => {
    const result = parseReply(wire({ summary: 'Add one task' }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'shapeMismatch' } });
  });

  it('rejects a plan carrying stray text', () => {
    const result = parseReply(
      wire({ kind: 'plan', text: 'here you go', summary: 'Add one task', changes: [{ op: 'add' }] }),
      acceptAny,
    );
    expect(result).toEqual({ ok: false, reason: { kind: 'shapeMismatch' } });
  });

  it('rejects a plan with no changes', () => {
    const result = parseReply(wire({ kind: 'plan', text: '', summary: 'nothing', changes: [] }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'badChangeCount', count: 0 } });
  });

  it('rejects a plan over the cap and reports the real count', () => {
    const changes = Array.from({ length: MAX_CHANGES + 14 }, () => ({ op: 'add' }));
    const result = parseReply(wire({ kind: 'plan', text: '', summary: 'lots', changes }), acceptAny);
    expect(result).toEqual({ ok: false, reason: { kind: 'badChangeCount', count: 34 } });
  });

  it('passes a change rejection straight back', () => {
    const refuse: ChangeParser<never> = () => ({ ok: false, reason: { kind: 'emptyTitle' } });
    const result = parseReply(wire({ kind: 'plan', text: '', summary: 's', changes: [{}] }), refuse);
    expect(result).toEqual({ ok: false, reason: { kind: 'emptyTitle' } });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/lib/assistantReply.test.ts
```

Expected: FAIL — `Failed to resolve import "./assistantReply"`.

- [ ] **Step 3: Write the implementation**

```ts
export const MAX_CHANGES = 20;

export type Reason =
  | { kind: 'unknownKind' }
  | { kind: 'shapeMismatch' }
  | { kind: 'badChangeCount'; count: number }
  | { kind: 'unknownHandle'; handle: string }
  | { kind: 'emptyTitle' }
  | { kind: 'badDate'; value: string }
  | { kind: 'badTime'; value: string }
  | { kind: 'yearOutOfRange'; year: number }
  | { kind: 'unknownCategory'; name: string }
  | { kind: 'duplicateHandle'; handle: string }
  | { kind: 'formRejection'; message: string }
  | { kind: 'unconfigured' }
  | { kind: 'quota' }
  | { kind: 'offline' }
  | { kind: 'timeout' }
  | { kind: 'serverError' };

export type TextKind = 'answer' | 'question' | 'refusal';

export interface TextReply {
  kind: TextKind;
  text: string;
}

export interface PlanReply<C> {
  kind: 'plan';
  summary: string;
  changes: C[];
}

export type AssistantReply<C> = TextReply | PlanReply<C>;

export type ChangeParser<C> = (
  raw: unknown,
) => { ok: true; change: C } | { ok: false; reason: Reason };

export type Parsed<C> =
  | { ok: true; reply: AssistantReply<C> }
  | { ok: false; reason: Reason };

const TEXT_KINDS: TextKind[] = ['answer', 'question', 'refusal'];

interface Wire {
  kind: string;
  text: string;
  summary: string;
  changes: unknown[];
}

function toWire(value: unknown): Wire | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.kind !== 'string') return null;
  if (typeof raw.text !== 'string') return null;
  if (typeof raw.summary !== 'string') return null;
  if (!Array.isArray(raw.changes)) return null;
  return { kind: raw.kind, text: raw.text, summary: raw.summary, changes: raw.changes };
}

export function parseReply<C>(value: unknown, parseChange: ChangeParser<C>): Parsed<C> {
  const wire = toWire(value);
  if (wire === null) return { ok: false, reason: { kind: 'unknownKind' } };

  if (TEXT_KINDS.includes(wire.kind as TextKind)) {
    if (wire.changes.length > 0 || wire.summary !== '') {
      return { ok: false, reason: { kind: 'shapeMismatch' } };
    }
    return { ok: true, reply: { kind: wire.kind as TextKind, text: wire.text } };
  }

  if (wire.kind !== 'plan') return { ok: false, reason: { kind: 'unknownKind' } };

  if (wire.text !== '') return { ok: false, reason: { kind: 'shapeMismatch' } };

  if (wire.changes.length === 0 || wire.changes.length > MAX_CHANGES) {
    return { ok: false, reason: { kind: 'badChangeCount', count: wire.changes.length } };
  }

  const changes: C[] = [];
  for (const raw of wire.changes) {
    const parsed = parseChange(raw);
    if (!parsed.ok) return parsed;
    changes.push(parsed.change);
  }

  return { ok: true, reply: { kind: 'plan', summary: wire.summary, changes } };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/lib/assistantReply.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistantReply.ts src/lib/assistantReply.test.ts
git commit -m "feat(assistant): parse the reply envelope and reject shape mismatches"
```

---

### Task 2: The handle map

**Files:**
- Create: `src/lib/assistantContext.ts`
- Test: `src/lib/assistantContext.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface HandleMap { prefix: string; byId: Record<string, string>; byHandle: Record<string, string>; next: number }`
  - `function emptyHandleMap(prefix: string): HandleMap`
  - `function assignHandles(map: HandleMap, ids: string[]): HandleMap`
  - `function handleOf(map: HandleMap, id: string): string | null`
  - `function idOf(map: HandleMap, handle: string): string | null`

This is the file the spec argues hardest about. Handles come from `map.next`, never from array position, and `assignHandles` never reassigns one. A row deleted mid-chat keeps its dead handle so a plan aimed at it fails as stale instead of hitting the wrong row.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  assignHandles,
  emptyHandleMap,
  handleOf,
  idOf,
} from './assistantContext';

describe('assignHandles', () => {
  it('numbers rows from one, in order', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb', 'ccc']);
    expect(handleOf(map, 'aaa')).toBe('t1');
    expect(handleOf(map, 'bbb')).toBe('t2');
    expect(handleOf(map, 'ccc')).toBe('t3');
  });

  it('keeps a handle when the same row comes back', () => {
    const first = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
    const second = assignHandles(first, ['aaa', 'bbb']);
    expect(handleOf(second, 'aaa')).toBe('t1');
    expect(handleOf(second, 'bbb')).toBe('t2');
  });

  it('never lets a handle change meaning after a row is deleted', () => {
    const turnOne = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb', 'ccc']);
    const turnTwo = assignHandles(turnOne, ['aaa', 'ccc']);
    const turnThree = assignHandles(turnTwo, ['aaa', 'ccc', 'ddd']);

    expect(idOf(turnThree, 't1')).toBe('aaa');
    expect(idOf(turnThree, 't2')).toBe('bbb');
    expect(idOf(turnThree, 't3')).toBe('ccc');
    expect(idOf(turnThree, 't4')).toBe('ddd');
  });

  it('keeps a deleted row resolvable so a plan aimed at it can be caught', () => {
    const turnOne = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
    const turnTwo = assignHandles(turnOne, ['aaa']);
    expect(idOf(turnTwo, 't2')).toBe('bbb');
  });

  it('returns null for a handle it never issued', () => {
    const map = assignHandles(emptyHandleMap('t'), ['aaa']);
    expect(idOf(map, 't99')).toBeNull();
  });

  it('uses the prefix it was given', () => {
    const map = assignHandles(emptyHandleMap('e'), ['aaa']);
    expect(handleOf(map, 'aaa')).toBe('e1');
  });

  it('does not mutate the map it was given', () => {
    const first = emptyHandleMap('t');
    assignHandles(first, ['aaa']);
    expect(first.next).toBe(1);
    expect(handleOf(first, 'aaa')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/lib/assistantContext.test.ts
```

Expected: FAIL — `Failed to resolve import "./assistantContext"`.

- [ ] **Step 3: Write the implementation**

```ts
export interface HandleMap {
  prefix: string;
  byId: Record<string, string>;
  byHandle: Record<string, string>;
  next: number;
}

export function emptyHandleMap(prefix: string): HandleMap {
  return { prefix, byId: {}, byHandle: {}, next: 1 };
}

export function assignHandles(map: HandleMap, ids: string[]): HandleMap {
  const byId = { ...map.byId };
  const byHandle = { ...map.byHandle };
  let next = map.next;

  for (const id of ids) {
    if (byId[id] !== undefined) continue;
    const handle = `${map.prefix}${next}`;
    byId[id] = handle;
    byHandle[handle] = id;
    next += 1;
  }

  return { prefix: map.prefix, byId, byHandle, next };
}

export function handleOf(map: HandleMap, id: string): string | null {
  return map.byId[id] ?? null;
}

export function idOf(map: HandleMap, handle: string): string | null {
  return map.byHandle[handle] ?? null;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/lib/assistantContext.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistantContext.ts src/lib/assistantContext.test.ts
git commit -m "feat(assistant): give rows stable handles for the life of a chat"
```

---

### Task 3: The to-do snapshot

**Files:**
- Modify: `src/lib/assistantContext.ts`
- Test: `src/lib/assistantContext.test.ts`

**Interfaces:**
- Consumes: `assignHandles`, `handleOf` from Task 2; `completedTodos` from `src/lib/todoList.ts`; `WEEKDAYS_SHORT` and `weekdayIndex` from `src/lib/dates.ts`; `Todo` from `src/lib/todo.ts`.
- Produces:
  - `interface TodoSnapshotRow { handle: string; title: string; dueDate: string; dueTime: string; priority: boolean; done: boolean }`
  - `interface TodoSnapshot { today: string; weekday: string; now: string; rows: TodoSnapshotRow[] }`
  - `function buildTodoSnapshot(rows: Todo[], map: HandleMap, today: string, now: string): { snapshot: TodoSnapshot; map: HandleMap }`
  - `const MAX_TODO_ROWS = 200`

`completedTodos(todos, today)` in `src/lib/todoList.ts` already returns exactly the done-within-7-days window the spec asks for, newest first. Reuse it; do not re-derive the window.

Nulls become empty strings on the wire, because the schema Gemini answers against has no null.

**Merge these imports into the ones already at the top of the test file.** A second `import ... from './assistantContext'` line is a lint error.

- [ ] **Step 1: Write the failing test — append to `src/lib/assistantContext.test.ts`**

```ts
import { buildTodoSnapshot, MAX_TODO_ROWS, type TodoSnapshot } from './assistantContext';
import type { DoneTodo, OpenTodo, Todo } from './todo';

function open(overrides: Partial<OpenTodo> = {}): OpenTodo {
  return {
    id: 'aaa',
    owner: 'Jeff',
    title: 'task',
    dueDate: null,
    dueTime: null,
    priority: false,
    done: false,
    completedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

function done(overrides: Partial<DoneTodo> = {}): DoneTodo {
  return { ...open(), done: true, completedAt: '2026-09-01T10:00:00.000Z', ...overrides };
}

const TODAY = '2026-09-01';
const NOW = '14:30:00';

describe('buildTodoSnapshot', () => {
  it('names today and its weekday', () => {
    const { snapshot } = buildTodoSnapshot([], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.today).toBe('2026-09-01');
    expect(snapshot.weekday).toBe('Tue');
    expect(snapshot.now).toBe('14:30:00');
  });

  it('sends every open task whatever its date', () => {
    const rows: Todo[] = [
      open({ id: 'aaa', title: 'near', dueDate: '2026-09-02' }),
      open({ id: 'bbb', title: 'far', dueDate: '2031-01-01' }),
      open({ id: 'ccc', title: 'undated' }),
    ];
    const { snapshot } = buildTodoSnapshot(rows, emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows.map((row) => row.title)).toEqual(['near', 'far', 'undated']);
  });

  it('turns nulls into empty strings', () => {
    const { snapshot } = buildTodoSnapshot([open()], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows[0]).toEqual({
      handle: 't1',
      title: 'task',
      dueDate: '',
      dueTime: '',
      priority: false,
      done: false,
    });
  });

  it('keeps a task completed inside the seven day window', () => {
    const rows: Todo[] = [done({ id: 'bbb', title: 'recent', completedAt: '2026-08-27T09:00:00.000Z' })];
    const { snapshot } = buildTodoSnapshot(rows, emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows.map((row) => row.title)).toEqual(['recent']);
  });

  it('drops a task completed before the window', () => {
    const rows: Todo[] = [done({ id: 'bbb', title: 'old', completedAt: '2026-07-01T09:00:00.000Z' })];
    const { snapshot } = buildTodoSnapshot(rows, emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows).toEqual([]);
  });

  it('caps the row count and keeps open tasks over completed ones', () => {
    const open_ = Array.from({ length: MAX_TODO_ROWS }, (_, i) =>
      open({ id: `o${i}`, title: `open ${i}` }),
    );
    const done_ = [done({ id: 'd0', title: 'finished' })];
    const { snapshot } = buildTodoSnapshot([...open_, ...done_], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows).toHaveLength(MAX_TODO_ROWS);
    expect(snapshot.rows.some((row) => row.title === 'finished')).toBe(false);
  });

  it('hands back a map that already holds the rows it sent', () => {
    const { snapshot, map } = buildTodoSnapshot([open({ id: 'aaa' })], emptyHandleMap('t'), TODAY, NOW);
    expect(snapshot.rows[0].handle).toBe('t1');
    expect(idOf(map, 't1')).toBe('aaa');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/lib/assistantContext.test.ts
```

Expected: FAIL — `buildTodoSnapshot is not a function`.

**Merge the `HandleMap` usage with what is already in the file** — this appends to Task 2's module, it does not replace it.

- [ ] **Step 3: Write the implementation — append to `src/lib/assistantContext.ts`**

```ts
import { WEEKDAYS_SHORT, weekdayIndex } from './dates';
import { completedTodos } from './todoList';
import type { Todo } from './todo';

export const MAX_TODO_ROWS = 200;

export interface TodoSnapshotRow {
  handle: string;
  title: string;
  dueDate: string;
  dueTime: string;
  priority: boolean;
  done: boolean;
}

export interface TodoSnapshot {
  today: string;
  weekday: string;
  now: string;
  rows: TodoSnapshotRow[];
}

export function buildTodoSnapshot(
  rows: Todo[],
  map: HandleMap,
  today: string,
  now: string,
): { snapshot: TodoSnapshot; map: HandleMap } {
  const openRows = rows.filter((row) => !row.done);
  const doneRows = completedTodos(rows, today);
  const sent = [...openRows, ...doneRows].slice(0, MAX_TODO_ROWS);

  const nextMap = assignHandles(map, sent.map((row) => row.id));

  return {
    snapshot: {
      today,
      weekday: WEEKDAYS_SHORT[weekdayIndex(today)],
      now,
      rows: sent.map((row) => ({
        handle: handleOf(nextMap, row.id) as string,
        title: row.title,
        dueDate: row.dueDate ?? '',
        dueTime: row.dueTime ?? '',
        priority: row.priority,
        done: row.done,
      })),
    },
    map: nextMap,
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/lib/assistantContext.test.ts
```

Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistantContext.ts src/lib/assistantContext.test.ts
git commit -m "feat(assistant): build the to-do snapshot sent to the model"
```

---

### Task 4: To-do change validation

**Files:**
- Create: `src/lib/todoPlan.ts`
- Test: `src/lib/todoPlan.test.ts`

**Interfaces:**
- Consumes: `Reason` and `ChangeParser` from Task 1; `HandleMap` and `idOf` from Task 2; `TodoDraft` from `src/lib/todo.ts`; `UserName` from `src/lib/identity.ts`.
- Produces:
  - `type TodoOp = 'add' | 'edit' | 'complete' | 'reopen' | 'delete'`
  - `interface TodoChange { op: TodoOp; handle: string; title: string; dueDate: string; dueTime: string; priority: boolean }`
  - `function todoChangeParser(map: HandleMap, today: string): ChangeParser<TodoChange>`
  - `function validateTodoPlan(changes: TodoChange[]): Reason | null`
  - `function toDraft(change: TodoChange, owner: UserName): TodoDraft`
  - `const YEAR_RANGE = 5`

Spec checks 4 to 9, minus the category check — a to-do has no category field, so that check exists only in Plan 2.

**One deliberate extension of spec check 5, flag it in the PR description:** the spec says *an add* has a non-empty title. This implements it for **add and edit**, because `updateTodo` trims the title and would happily write an empty one, letting a bad edit blank a task's name. Same reasoning as the check, wider scope.

`complete`, `reopen` and `delete` carry only a handle. Their other fields are ignored and are not validated, because there is no end state to check.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { assignHandles, emptyHandleMap } from './assistantContext';
import { todoChangeParser, validateTodoPlan, toDraft, type TodoChange } from './todoPlan';

const TODAY = '2026-09-01';

const MAP = assignHandles(emptyHandleMap('t'), ['aaa', 'bbb']);
const parse = todoChangeParser(MAP, TODAY);

function raw(overrides: Record<string, unknown> = {}) {
  return { op: 'add', handle: '', title: 'Dentist', dueDate: '', dueTime: '', priority: false, ...overrides };
}

describe('todoChangeParser', () => {
  it('accepts an add', () => {
    expect(parse(raw({ dueDate: '2026-09-12', dueTime: '15:00', priority: true }))).toEqual({
      ok: true,
      change: { op: 'add', handle: '', title: 'Dentist', dueDate: '2026-09-12', dueTime: '15:00', priority: true },
    });
  });

  it('accepts a delete carrying only a handle', () => {
    expect(parse(raw({ op: 'delete', handle: 't2', title: '', dueDate: '', dueTime: '' }))).toEqual({
      ok: true,
      change: { op: 'delete', handle: 't2', title: '', dueDate: '', dueTime: '', priority: false },
    });
  });

  it('rejects an unknown op', () => {
    expect(parse(raw({ op: 'archive' }))).toEqual({ ok: false, reason: { kind: 'unknownKind' } });
  });

  it('rejects a handle it never issued and names it', () => {
    expect(parse(raw({ op: 'delete', handle: 't99' }))).toEqual({
      ok: false,
      reason: { kind: 'unknownHandle', handle: 't99' },
    });
  });

  it('rejects an add with a blank title', () => {
    expect(parse(raw({ title: '   ' }))).toEqual({ ok: false, reason: { kind: 'emptyTitle' } });
  });

  it('rejects an edit with a blank title', () => {
    expect(parse(raw({ op: 'edit', handle: 't1', title: '' }))).toEqual({
      ok: false,
      reason: { kind: 'emptyTitle' },
    });
  });

  it('rejects a malformed date and names the value', () => {
    expect(parse(raw({ dueDate: '12/09/2026' }))).toEqual({
      ok: false,
      reason: { kind: 'badDate', value: '12/09/2026' },
    });
  });

  it('rejects a malformed time and names the value', () => {
    expect(parse(raw({ dueDate: '2026-09-12', dueTime: '3pm' }))).toEqual({
      ok: false,
      reason: { kind: 'badTime', value: '3pm' },
    });
  });

  it('rejects a year too far ahead and names it', () => {
    expect(parse(raw({ dueDate: '2087-09-12' }))).toEqual({
      ok: false,
      reason: { kind: 'yearOutOfRange', year: 2087 },
    });
  });

  it('rejects a year too far behind and names it', () => {
    expect(parse(raw({ dueDate: '0202-09-12' }))).toEqual({
      ok: false,
      reason: { kind: 'yearOutOfRange', year: 202 },
    });
  });

  it('accepts a date at the edge of the allowed range', () => {
    const result = parse(raw({ dueDate: '2031-09-01' }));
    expect(result.ok).toBe(true);
  });

  it('ignores the date fields of a complete', () => {
    const result = parse(raw({ op: 'complete', handle: 't1', title: '', dueDate: 'nonsense' }));
    expect(result.ok).toBe(true);
  });
});

describe('validateTodoPlan', () => {
  function change(overrides: Partial<TodoChange> = {}): TodoChange {
    return { op: 'edit', handle: 't1', title: 'Dentist', dueDate: '', dueTime: '', priority: false, ...overrides };
  }

  it('accepts distinct handles', () => {
    expect(validateTodoPlan([change({ handle: 't1' }), change({ handle: 't2' })])).toBeNull();
  });

  it('accepts several adds, which carry no handle', () => {
    expect(validateTodoPlan([change({ op: 'add', handle: '' }), change({ op: 'add', handle: '' })])).toBeNull();
  });

  it('rejects the same handle twice and names it', () => {
    expect(validateTodoPlan([change({ handle: 't1' }), change({ op: 'delete', handle: 't1' })])).toEqual({
      kind: 'duplicateHandle',
      handle: 't1',
    });
  });
});

describe('toDraft', () => {
  it('turns empty strings back into nulls', () => {
    const draft = toDraft(
      { op: 'add', handle: '', title: 'Dentist', dueDate: '', dueTime: '', priority: true },
      'Jeff',
    );
    expect(draft).toEqual({ owner: 'Jeff', title: 'Dentist', dueDate: null, dueTime: null, priority: true });
  });

  it('keeps a date and time when given', () => {
    const draft = toDraft(
      { op: 'add', handle: '', title: 'Dentist', dueDate: '2026-09-12', dueTime: '15:00', priority: false },
      'Rachel',
    );
    expect(draft).toEqual({
      owner: 'Rachel',
      title: 'Dentist',
      dueDate: '2026-09-12',
      dueTime: '15:00',
      priority: false,
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/lib/todoPlan.test.ts
```

Expected: FAIL — `Failed to resolve import "./todoPlan"`.

- [ ] **Step 3: Write the implementation**

```ts
import { idOf, type HandleMap } from './assistantContext';
import type { ChangeParser, Reason } from './assistantReply';
import type { TodoDraft } from './todo';
import type { UserName } from './identity';

export const YEAR_RANGE = 5;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export type TodoOp = 'add' | 'edit' | 'complete' | 'reopen' | 'delete';

const OPS: TodoOp[] = ['add', 'edit', 'complete', 'reopen', 'delete'];
const END_STATE_OPS: TodoOp[] = ['add', 'edit'];

export interface TodoChange {
  op: TodoOp;
  handle: string;
  title: string;
  dueDate: string;
  dueTime: string;
  priority: boolean;
}

function dateProblem(value: string, today: string): Reason | null {
  if (value === '') return null;
  if (!DATE_PATTERN.test(value)) return { kind: 'badDate', value };

  const year = Number(value.slice(0, 4));
  const thisYear = Number(today.slice(0, 4));
  if (year < thisYear - YEAR_RANGE || year > thisYear + YEAR_RANGE) {
    return { kind: 'yearOutOfRange', year };
  }
  return null;
}

function timeProblem(value: string): Reason | null {
  if (value === '') return null;
  if (!TIME_PATTERN.test(value)) return { kind: 'badTime', value };
  return null;
}

export function todoChangeParser(map: HandleMap, today: string): ChangeParser<TodoChange> {
  return (raw) => {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    const value = raw as Record<string, unknown>;

    if (typeof value.op !== 'string' || !OPS.includes(value.op as TodoOp)) {
      return { ok: false, reason: { kind: 'unknownKind' } };
    }
    if (typeof value.handle !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.title !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.dueDate !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.dueTime !== 'string') return { ok: false, reason: { kind: 'unknownKind' } };
    if (typeof value.priority !== 'boolean') return { ok: false, reason: { kind: 'unknownKind' } };

    const op = value.op as TodoOp;
    const change: TodoChange = {
      op,
      handle: value.handle,
      title: value.title,
      dueDate: value.dueDate,
      dueTime: value.dueTime,
      priority: value.priority,
    };

    if (op !== 'add' && idOf(map, change.handle) === null) {
      return { ok: false, reason: { kind: 'unknownHandle', handle: change.handle } };
    }

    if (!END_STATE_OPS.includes(op)) {
      return { ok: true, change: { ...change, title: '', dueDate: '', dueTime: '', priority: false } };
    }

    if (change.title.trim() === '') return { ok: false, reason: { kind: 'emptyTitle' } };

    const badDate = dateProblem(change.dueDate, today);
    if (badDate !== null) return { ok: false, reason: badDate };

    const badTime = timeProblem(change.dueTime);
    if (badTime !== null) return { ok: false, reason: badTime };

    return { ok: true, change };
  };
}

export function validateTodoPlan(changes: TodoChange[]): Reason | null {
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

export function toDraft(change: TodoChange, owner: UserName): TodoDraft {
  return {
    owner,
    title: change.title,
    dueDate: change.dueDate === '' ? null : change.dueDate,
    dueTime: change.dueTime === '' ? null : change.dueTime,
    priority: change.priority,
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/lib/todoPlan.test.ts
```

Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/todoPlan.ts src/lib/todoPlan.test.ts
git commit -m "feat(assistant): validate to-do changes before they can reach a card"
```

---

### Task 5: Failure wording

**Files:**
- Create: `src/lib/assistantFailure.ts`
- Test: `src/lib/assistantFailure.test.ts`

**Interfaces:**
- Consumes: `Reason` from Task 1.
- Produces:
  - `function assistantFailureMessage(reason: Reason): string`
  - `function reasonForStatus(status: number): Reason`

Two tests, exactly as the spec asks: every reason gets its own wording with nothing falling through, and every carried value reaches the sentence.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { assistantFailureMessage, reasonForStatus } from './assistantFailure';
import type { Reason } from './assistantReply';

const EVERY_REASON: Reason[] = [
  { kind: 'unknownKind' },
  { kind: 'shapeMismatch' },
  { kind: 'badChangeCount', count: 34 },
  { kind: 'unknownHandle', handle: 't99' },
  { kind: 'emptyTitle' },
  { kind: 'badDate', value: '12/09/2026' },
  { kind: 'badTime', value: '3pm' },
  { kind: 'yearOutOfRange', year: 2087 },
  { kind: 'unknownCategory', name: 'Zumba' },
  { kind: 'duplicateHandle', handle: 't1' },
  { kind: 'formRejection', message: 'The end time must be after the start.' },
  { kind: 'unconfigured' },
  { kind: 'quota' },
  { kind: 'offline' },
  { kind: 'timeout' },
  { kind: 'serverError' },
];

describe('assistantFailureMessage', () => {
  it('gives every reason its own wording', () => {
    const messages = EVERY_REASON.map(assistantFailureMessage);
    expect(new Set(messages).size).toBe(EVERY_REASON.length);
  });

  it('never returns an empty string', () => {
    for (const message of EVERY_REASON.map(assistantFailureMessage)) {
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('quotes the real change count', () => {
    expect(assistantFailureMessage({ kind: 'badChangeCount', count: 34 })).toContain('34');
    expect(assistantFailureMessage({ kind: 'badChangeCount', count: 7 })).toContain('7');
  });

  it('quotes the real year', () => {
    expect(assistantFailureMessage({ kind: 'yearOutOfRange', year: 2087 })).toContain('2087');
    expect(assistantFailureMessage({ kind: 'yearOutOfRange', year: 202 })).toContain('202');
  });

  it('quotes the real category name', () => {
    expect(assistantFailureMessage({ kind: 'unknownCategory', name: 'Zumba' })).toContain('Zumba');
  });

  it('passes a form rejection through word for word', () => {
    expect(
      assistantFailureMessage({ kind: 'formRejection', message: 'The end time must be after the start.' }),
    ).toBe('The end time must be after the start.');
  });
});

describe('reasonForStatus', () => {
  it('maps the statuses the routes return', () => {
    expect(reasonForStatus(503)).toEqual({ kind: 'unconfigured' });
    expect(reasonForStatus(429)).toEqual({ kind: 'quota' });
    expect(reasonForStatus(500)).toEqual({ kind: 'serverError' });
    expect(reasonForStatus(502)).toEqual({ kind: 'serverError' });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/lib/assistantFailure.test.ts
```

Expected: FAIL — `Failed to resolve import "./assistantFailure"`.

- [ ] **Step 3: Write the implementation**

```ts
import type { Reason } from './assistantReply';

export function assistantFailureMessage(reason: Reason): string {
  switch (reason.kind) {
    case 'unknownKind':
      return "The AI answered in a way I couldn't read. Say it again.";
    case 'shapeMismatch':
      return "The AI's answer didn't hold together. Say it again.";
    case 'badChangeCount':
      return `It tried to make ${reason.count} changes at once. Ask for a smaller piece.`;
    case 'unknownHandle':
      return "It pointed at a task that isn't on your list. Say it again.";
    case 'emptyTitle':
      return 'It left the name blank. Tell me what to call it.';
    case 'badDate':
      return `It gave me the date "${reason.value}", which I couldn't read. Try naming the date plainly.`;
    case 'badTime':
      return `It gave me the time "${reason.value}", which I couldn't read. Try naming the time plainly.`;
    case 'yearOutOfRange':
      return `It gave me the year ${reason.year} — that looks like a typo. Say the date again.`;
    case 'unknownCategory':
      return `There's no category called ${reason.name}. Pick one you have, or leave it out.`;
    case 'duplicateHandle':
      return 'It tried to change the same task twice in one go. Say it again.';
    case 'formRejection':
      return reason.message;
    case 'unconfigured':
      return "The assistant isn't switched on yet.";
    case 'quota':
      return 'Out of AI replies for today. Try again tomorrow.';
    case 'offline':
      return "You're offline. The assistant needs a connection — your board still works.";
    case 'timeout':
      return 'The AI took too long. Try again.';
    case 'serverError':
      return 'Something broke on the way to the AI. Try again in a moment.';
  }
}

export function reasonForStatus(status: number): Reason {
  if (status === 503) return { kind: 'unconfigured' };
  if (status === 429) return { kind: 'quota' };
  return { kind: 'serverError' };
}
```

The `switch` is exhaustive over the union, so adding a `Reason` member without a message becomes a TypeScript error rather than a silent fallthrough. That is the mechanism the "nothing falls through" test is guarding.

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/lib/assistantFailure.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistantFailure.ts src/lib/assistantFailure.test.ts
git commit -m "feat(assistant): say why a reply was rejected, quoting the real values"
```

---

### Task 6: The Apply run decisions

**Files:**
- Create: `src/lib/assistantRun.ts`
- Test: `src/lib/assistantRun.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ChangeOutcome = 'pending' | 'saved' | 'stale' | 'failed' | 'notAttempted'`
  - `type StepOutcome = 'saved' | 'failed' | 'unreached'`
  - `type RunAction = 'run' | 'stopNetwork' | 'stopBudget'`
  - `function nextStep(state: { outcomes: StepOutcome[]; elapsedMs: number }): RunAction`
  - `type RunState = 'idle' | 'saving' | 'retry' | 'done'`
  - `function buttonStateFor(outcomes: ChangeOutcome[], running: boolean): RunState`
  - `function isRetryable(outcome: ChangeOutcome): boolean` and `RETRYABLE_OUTCOMES` — the single home for "is this change still open for action", consumed by both `buttonStateFor` and `PlanCard`
  - `const APPLY_BUDGET_MS = 30_000`, `const UNREACHED_LIMIT = 3`

This is the task that exists because the button could sit grey forever. `unreached` means the request never got to Supabase — a rejected fetch or a spent per-change budget. `failed` means the database answered with an error, which is real information and must not abort the run.

`ChangeOutcome` lives here rather than in `todoPlan.ts` so that `calendarPlan.ts` in Plan 2 imports it from the same place, and `buttonStateFor` takes bare outcomes so it never learns what a to-do is.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  nextStep,
  buttonStateFor,
  APPLY_BUDGET_MS,
  UNREACHED_LIMIT,
  type ChangeOutcome,
  type RunState,
  type StepOutcome,
} from './assistantRun';

describe('nextStep', () => {
  it('keeps going at the start', () => {
    expect(nextStep({ outcomes: [], elapsedMs: 0 })).toBe('run');
  });

  it('keeps going after a database error', () => {
    const outcomes: StepOutcome[] = ['failed', 'failed', 'failed'];
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('run');
  });

  it('stops after three unreached calls in a row', () => {
    const outcomes: StepOutcome[] = Array(UNREACHED_LIMIT).fill('unreached');
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('stopNetwork');
  });

  it('keeps going when a database error breaks the unreached run', () => {
    const outcomes: StepOutcome[] = ['unreached', 'unreached', 'failed'];
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('run');
  });

  it('keeps going when a save breaks the unreached run', () => {
    const outcomes: StepOutcome[] = ['unreached', 'unreached', 'saved'];
    expect(nextStep({ outcomes, elapsedMs: 1000 })).toBe('run');
  });

  it('stops when the budget is spent', () => {
    expect(nextStep({ outcomes: ['saved'], elapsedMs: APPLY_BUDGET_MS })).toBe('stopBudget');
  });

  it('prefers the budget when both would stop it', () => {
    const outcomes: StepOutcome[] = Array(UNREACHED_LIMIT).fill('unreached');
    expect(nextStep({ outcomes, elapsedMs: APPLY_BUDGET_MS + 1 })).toBe('stopBudget');
  });
});

describe('buttonStateFor', () => {
  it('is saving only while the run is going', () => {
    expect(buttonStateFor(['pending'], true)).toBe('saving');
  });

  it('never leaves a finished run on saving', () => {
    const every: ChangeOutcome[] = ['pending', 'saved', 'stale', 'failed', 'notAttempted'];
    for (const outcome of every) {
      const state: RunState = buttonStateFor([outcome], false);
      expect(state).not.toBe('saving');
    }
  });

  it('offers a retry when something failed', () => {
    expect(buttonStateFor(['saved', 'failed'], false)).toBe('retry');
  });

  it('offers a retry when something was not attempted', () => {
    expect(buttonStateFor(['saved', 'notAttempted'], false)).toBe('retry');
  });

  it('does not offer a retry for a stale row alone', () => {
    expect(buttonStateFor(['saved', 'stale'], false)).toBe('done');
  });

  it('is idle before anything has run', () => {
    expect(buttonStateFor(['pending'], false)).toBe('idle');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/lib/assistantRun.test.ts
```

Expected: FAIL — `Failed to resolve import "./assistantRun"`.

- [ ] **Step 3: Write the implementation**

```ts
export const APPLY_BUDGET_MS = 30_000;
export const UNREACHED_LIMIT = 3;

export type ChangeOutcome = 'pending' | 'saved' | 'stale' | 'failed' | 'notAttempted';
export type StepOutcome = 'saved' | 'failed' | 'unreached';
export type RunAction = 'run' | 'stopNetwork' | 'stopBudget';
export type RunState = 'idle' | 'saving' | 'retry' | 'done';

export function nextStep(state: { outcomes: StepOutcome[]; elapsedMs: number }): RunAction {
  if (state.elapsedMs >= APPLY_BUDGET_MS) return 'stopBudget';

  const tail = state.outcomes.slice(-UNREACHED_LIMIT);
  if (tail.length === UNREACHED_LIMIT && tail.every((outcome) => outcome === 'unreached')) {
    return 'stopNetwork';
  }

  return 'run';
}

export const RETRYABLE_OUTCOMES: ChangeOutcome[] = ['failed', 'notAttempted'];

export function isRetryable(outcome: ChangeOutcome): boolean {
  return RETRYABLE_OUTCOMES.includes(outcome);
}

export function buttonStateFor(outcomes: ChangeOutcome[], running: boolean): RunState {
  if (running) return 'saving';
  if (outcomes.some(isRetryable)) return 'retry';
  if (outcomes.some((outcome) => outcome === 'saved')) return 'done';
  return 'idle';
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/lib/assistantRun.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistantRun.ts src/lib/assistantRun.test.ts
git commit -m "feat(assistant): decide when an apply run stops and what the button becomes"
```

---

### Task 7: Reconcile and clash

**Files:**
- Modify: `src/lib/todoPlan.ts`
- Test: `src/lib/todoPlan.test.ts`

**Interfaces:**
- Consumes: `TodoChange`, `END_STATE_OPS` from Task 4; `HandleMap`, `idOf` from Task 2; `ChangeOutcome` from Task 6; `Todo` from `src/lib/todo.ts`.
- Produces:
  - `interface PlannedChange { change: TodoChange; id: string | null; outcome: ChangeOutcome; note: string }`
  - `function reconcileTodoPlan(changes: TodoChange[], map: HandleMap, rows: Todo[]): PlannedChange[]`
  - `function clashesFor(change: TodoChange, rows: Todo[], excludeId: string | null): Todo[]`

**`todoPlan.ts` already imports from `./todo`.** Merge the `Todo` type into that existing import line rather than adding a second one — a duplicate import is a lint error.

- [ ] **Step 1: Write the failing test — append to `src/lib/todoPlan.test.ts`**

```ts
import { reconcileTodoPlan, clashesFor, type PlannedChange } from './todoPlan';
import type { OpenTodo, Todo } from './todo';

function row(overrides: Partial<OpenTodo> = {}): OpenTodo {
  return {
    id: 'aaa',
    owner: 'Jeff',
    title: 'Dentist',
    dueDate: '2026-09-12',
    dueTime: null,
    priority: false,
    done: false,
    completedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('reconcileTodoPlan', () => {
  it('resolves a live handle to its id and leaves it pending', () => {
    const planned = reconcileTodoPlan(
      [{ op: 'delete', handle: 't1', title: '', dueDate: '', dueTime: '', priority: false }],
      MAP,
      [row({ id: 'aaa' })],
    );
    expect(planned[0].id).toBe('aaa');
    expect(planned[0].outcome).toBe('pending');
  });

  it('marks a change stale when its row has gone', () => {
    const planned = reconcileTodoPlan(
      [{ op: 'delete', handle: 't2', title: '', dueDate: '', dueTime: '', priority: false }],
      MAP,
      [row({ id: 'aaa' })],
    );
    expect(planned[0].outcome).toBe('stale');
    expect(planned[0].note).toBe('That task was already deleted.');
  });

  it('leaves an add pending with no id', () => {
    const planned = reconcileTodoPlan(
      [{ op: 'add', handle: '', title: 'New', dueDate: '', dueTime: '', priority: false }],
      MAP,
      [],
    );
    expect(planned[0]).toEqual<PlannedChange>({
      change: { op: 'add', handle: '', title: 'New', dueDate: '', dueTime: '', priority: false },
      id: null,
      outcome: 'pending',
      note: '',
    });
  });
});

describe('clashesFor', () => {
  const add = (title: string, dueDate: string): TodoChange => ({
    op: 'add',
    handle: '',
    title,
    dueDate,
    dueTime: '',
    priority: false,
  });

  it('finds a task with the same title on the same day', () => {
    const found = clashesFor(add('Dentist', '2026-09-12'), [row()]);
    expect(found.map((todo) => todo.id)).toEqual(['aaa']);
  });

  it('ignores case and surrounding spaces', () => {
    const found = clashesFor(add('  dENTIST ', '2026-09-12'), [row()]);
    expect(found).toHaveLength(1);
  });

  it('ignores a different day', () => {
    expect(clashesFor(add('Dentist', '2026-09-13'), [row()])).toEqual([]);
  });

  it('ignores an undated add', () => {
    expect(clashesFor(add('Dentist', ''), [row()])).toEqual([]);
  });

  it('ignores a completed task', () => {
    const finished: Todo = { ...row(), done: true, completedAt: '2026-09-01T10:00:00.000Z' };
    expect(clashesFor(add('Dentist', '2026-09-12'), [finished])).toEqual([]);
  });

  it('does not flag a delete', () => {
    const change: TodoChange = { op: 'delete', handle: 't1', title: '', dueDate: '', dueTime: '', priority: false };
    expect(clashesFor(change, [row()])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/lib/todoPlan.test.ts
```

Expected: FAIL — `reconcileTodoPlan is not a function`.

- [ ] **Step 3: Write the implementation — append to `src/lib/todoPlan.ts`**

```ts
import type { ChangeOutcome } from './assistantRun';

export interface PlannedChange {
  change: TodoChange;
  id: string | null;
  outcome: ChangeOutcome;
  note: string;
}

export function reconcileTodoPlan(
  changes: TodoChange[],
  map: HandleMap,
  rows: Todo[],
): PlannedChange[] {
  const live = new Set(rows.map((todo) => todo.id));

  return changes.map((change) => {
    if (change.op === 'add') {
      return { change, id: null, outcome: 'pending', note: '' };
    }

    const id = idOf(map, change.handle);
    if (id === null || !live.has(id)) {
      return { change, id: null, outcome: 'stale', note: 'That task was already deleted.' };
    }

    return { change, id, outcome: 'pending', note: '' };
  });
}

function sameTitle(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function clashesFor(
  change: TodoChange,
  rows: Todo[],
  excludeId: string | null,
): Todo[] {
  if (!END_STATE_OPS.includes(change.op)) return [];
  if (change.dueDate === '') return [];

  return rows.filter(
    (todo) =>
      todo.id !== excludeId &&
      !todo.done &&
      todo.dueDate === change.dueDate &&
      sameTitle(todo.title, change.title),
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/lib/todoPlan.test.ts
```

Expected: PASS, 26 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/todoPlan.ts src/lib/todoPlan.test.ts
git commit -m "feat(assistant): catch stale rows and duplicate tasks before saving"
```

---

### Task 8: The API route

**Files:**
- Create: `src/app/api/assistant/todo/route.ts`
- Read first: `src/app/api/meals/estimate/route.ts` — the call shape, the key check, the error statuses. Copy its structure.

**Interfaces:**
- Consumes: `GEMINI_MODEL` from `src/lib/gemini.ts`; `isRateLimited` from `src/lib/aiFailure.ts`; `TodoSnapshot` from Task 3.
- Produces: `POST /api/assistant/todo` taking `{ snapshot, history }` and returning the flat wire reply as JSON.

The route checks only that a reply came back and is JSON. It does **not** run `parseReply` — the handle map lives in the browser, so full validation belongs there. Statuses: 503 no key, 400 bad body, 429 rate limited, 502 no usable output.

Read `node_modules/next/dist/docs/` for route handler conventions before writing this. Next.js 16 is not the Next.js in your training data.

- [ ] **Step 1: Write the route**

```ts
import { GoogleGenAI, type Interactions } from '@google/genai';
import { isRateLimited } from '@/lib/aiFailure';
import { GEMINI_MODEL } from '@/lib/gemini';
import { MAX_CHANGES } from '@/lib/assistantReply';
import { MAX_TODO_ROWS, type TodoSnapshot } from '@/lib/assistantContext';

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
          op: { type: 'string', enum: ['add', 'edit', 'complete', 'reopen', 'delete'] },
          handle: { type: 'string' },
          title: { type: 'string' },
          dueDate: { type: 'string' },
          dueTime: { type: 'string' },
          priority: { type: 'boolean' },
        },
        required: ['op', 'handle', 'title', 'dueDate', 'dueTime', 'priority'],
      },
    },
  },
  required: ['kind', 'text', 'summary', 'changes'],
};

const SYSTEM = `You manage one person's to-do list. You work only on the rows
you are given below. You cannot see or change anyone else's list, and you cannot
touch the calendar, the timer, or anything else in the app.

Reply with exactly one kind:
- "answer" for a question you can answer from the rows.
- "question" when you genuinely cannot proceed.
- "plan" when you know what to change.
- "refusal" when you cannot do it at all.

Ops: add, edit, complete, reopen, delete. Nothing else exists.
Refer to an existing task by its handle, exactly as given. Never invent one.
An add has an empty handle. add and edit carry the whole end state, every field.
complete, reopen and delete carry only the handle.
Never put the same handle in two changes. At most ${MAX_CHANGES} changes.

Dates are YYYY-MM-DD, times are HH:MM in 24 hours. Empty string means none.
You are given today's date and weekday. Work out "tomorrow" and "next Friday"
from those.

You can see every open task whatever its date, and tasks completed in the last
7 days. Older completed tasks were not sent — say so rather than guess.
Adding is not limited by that: you can add a task on any date.

Leave an optional field empty rather than inventing it. A task with no time is
normal and correct.

Ask a question only when you truly cannot proceed: two tasks match what the
person said, or the date is genuinely ambiguous — "next Friday" said on a
Friday. Do not ask which category, what time, or whether it is a priority.

A cancelled plan was rejected. Do not offer it again unless asked.`;

const MAX_MESSAGE_CHARS = 1_000;

interface Message {
  role: 'you' | 'assistant';
  text: string;
}

function toSnapshot(value: unknown): TodoSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.today !== 'string' || typeof raw.weekday !== 'string') return null;
  if (typeof raw.now !== 'string' || !Array.isArray(raw.rows)) return null;
  if (raw.rows.length > MAX_TODO_ROWS) return null;
  return value as TodoSnapshot;
}

function toHistory(value: unknown): Message[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null;
    const raw = entry as Record<string, unknown>;
    if (raw.role !== 'you' && raw.role !== 'assistant') return null;
    if (typeof raw.text !== 'string' || raw.text.length > MAX_MESSAGE_CHARS) return null;
  }
  return value as Message[];
}

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

  try {
    const body = await request.json();
    const snapshot = toSnapshot(body.snapshot);
    const history = toHistory(body.history);

    if (snapshot === null || history === null) {
      return Response.json({ error: 'Bad request' }, { status: 400 });
    }

    const prompt = `${SYSTEM}

Today is ${snapshot.weekday} ${snapshot.today}. The time is ${snapshot.now}.

Tasks:
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
    console.error('Assistant reply failed:', err);
    if (isRateLimited(err)) {
      return Response.json({ error: 'Out of replies for today' }, { status: 429 });
    }
    return Response.json({ error: 'Could not reply' }, { status: 502 });
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. If `Interactions.Content` does not resolve, open `node_modules/@google/genai` and match the type the meals route already imports.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/assistant/todo/route.ts
git commit -m "feat(assistant): add the to-do reply route"
```

---

### Task 9: The browser request wrapper

**Files:**
- Create: `src/lib/assistantRequest.ts`
- Read first: `src/lib/mealEstimateRequest.ts` — mirror its shape.

**Interfaces:**
- Consumes: `Reason` from Task 1; `reasonForStatus` from Task 5; `TodoSnapshot` from Task 3.
- Produces:
  - re-exports `Message` from `./assistantBody` — Task 8's fix round moved it there; do not redefine it
  - `type ReplyResult = { ok: true; value: unknown } | { ok: false; reason: Reason }`
  - `function askTodoAssistant(snapshot: TodoSnapshot, history: Message[]): Promise<ReplyResult>`
  - `const MESSAGE_BUDGET_MS = 20_000`

Returns the raw JSON. The caller runs `parseReply` with its own handle map.

- [ ] **Step 1: Write the implementation**

```ts
import { reasonForStatus } from './assistantFailure';
import type { Reason } from './assistantReply';
import type { TodoSnapshot } from './assistantContext';
import type { Message } from './assistantBody';

export type { Message };

export const MESSAGE_BUDGET_MS = 20_000;

export type ReplyResult = { ok: true; value: unknown } | { ok: false; reason: Reason };

export async function askTodoAssistant(
  snapshot: TodoSnapshot,
  history: Message[],
): Promise<ReplyResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), MESSAGE_BUDGET_MS);

  try {
    const response = await fetch('/api/assistant/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot, history }),
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
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/assistantRequest.ts
git commit -m "feat(assistant): send a chat message with an abort budget"
```

---

### Task 10: The plan card

**Files:**
- Create: `src/components/assistant/PlanCard.tsx`

**Interfaces:**
- Consumes: `PlannedChange`, `clashesFor`, `TodoChange` from Tasks 4 and 6; `buttonStateFor`, `RunState` from Task 7; `Todo` from `src/lib/todo.ts`.
- Produces: `export default function PlanCard(props: PlanCardProps)` where

```ts
interface PlanCardProps {
  summary: string;
  planned: PlannedChange[];
  rows: Todo[];
  running: boolean;
  onApply: () => void;
  onCancel: () => void;
  cancelled: boolean;
}
```

No decision logic in this file — it renders what Tasks 6 and 7 decided. That is why there is no test here: `vitest.config.ts` collects `.ts` only, so a `.tsx` test would never run.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { AlertTriangle, Check, X } from 'lucide-react';
import { buttonStateFor, isRetryable } from '@/lib/assistantRun';
import { clashesFor, type PlannedChange, type TodoChange } from '@/lib/todoPlan';
import type { Todo } from '@/lib/todo';

const OP_WORDS: Record<TodoChange['op'], string> = {
  add: 'Add',
  edit: 'Change',
  complete: 'Tick off',
  reopen: 'Reopen',
  delete: 'Delete',
};

function describe(change: TodoChange): string {
  const parts = [change.title];
  if (change.dueDate !== '') parts.push(change.dueDate);
  if (change.dueTime !== '') parts.push(change.dueTime);
  if (change.priority) parts.push('priority');
  return parts.join(' · ');
}

export default function PlanCard({
  summary,
  planned,
  rows,
  running,
  onApply,
  onCancel,
  cancelled,
}: {
  summary: string;
  planned: PlannedChange[];
  rows: Todo[];
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
          const clashes = clashesFor(entry.change, rows, entry.id);
          return (
            <li key={index} className="text-sm text-[var(--mt-text)]">
              <span className="font-medium">{OP_WORDS[entry.change.op]}</span>{' '}
              {describe(entry.change)}
              {entry.outcome === 'saved' && (
                <Check size={14} className="ml-1 inline text-[var(--mt-text-muted)]" aria-label="saved" />
              )}
              {entry.note !== '' && (
                <span className="ml-1 text-[var(--mt-text-muted)]">— {entry.note}</span>
              )}
              {clashes.length > 0 && entry.outcome !== 'saved' && entry.outcome !== 'stale' && (
                <span className="mt-1 flex items-center gap-1 text-[var(--mt-text-muted)]">
                  <AlertTriangle size={14} aria-hidden />
                  You already have &ldquo;{clashes[0].title}&rdquo; that day.
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {cancelled && <p className="mt-3 text-sm text-[var(--mt-text-muted)]">Cancelled.</p>}

      {state === 'done' && (
        <p className="mt-3 text-sm text-[var(--mt-text-muted)]">
          Saved. {saved} of {planned.length}.
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

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/assistant/PlanCard.tsx
git commit -m "feat(assistant): render a plan with its clashes and its result"
```

---

### Task 11: The chat sheet

**Files:**
- Create: `src/components/assistant/AssistantSheet.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 to 10; `Modal` from `src/components/ui/Modal.tsx`; `insertTodo`, `updateTodo`, `setTodoDone`, `deleteTodo`, `fetchTodos` from `src/lib/todoRepo.ts`.
- Produces: `export default function AssistantSheet({ open, onClose, owner, rows, today, now, onApplied })`

```ts
interface AssistantSheetProps {
  open: boolean;
  onClose: () => void;
  owner: UserName;
  rows: Todo[];
  today: string;
  now: string;
  onApplied: (message: string) => void;
}
```

Caps: `MAX_FROM_YOU = 6` — twelve messages counting both sides — with the warning shown when 2 of yours remain.

`apply` doubles as the retry. It walks the changes already on the card and skips any that are `saved` or `stale`, so tapping **Try the other 2 again** re-runs only the failed and not-attempted rows, and a stale row is never retried. It re-reconciles each remaining change against the freshly fetched rows, which is where a row that died since the last attempt gets caught. A change that saves is also re-checked for clashes against those fresh rows, so a clash that appeared after the card was drawn still gets reported.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import PlanCard from './PlanCard';
import { assistantFailureMessage } from '@/lib/assistantFailure';
import { buildTodoSnapshot, emptyHandleMap, type HandleMap } from '@/lib/assistantContext';
import { parseReply } from '@/lib/assistantReply';
import { askTodoAssistant, type Message } from '@/lib/assistantRequest';
import { nextStep, type StepOutcome } from '@/lib/assistantRun';
import {
  clashesFor,
  reconcileTodoPlan,
  todoChangeParser,
  toDraft,
  validateTodoPlan,
  type PlannedChange,
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
import type { UserName } from '@/lib/identity';

const MAX_FROM_YOU = 6;
const WARN_AT_REMAINING = 2;
const STEP_BUDGET_MS = 10_000;

type Entry =
  | { kind: 'text'; role: 'you' | 'assistant'; text: string }
  | { kind: 'plan'; summary: string; planned: PlannedChange[]; cancelled: boolean };

async function runChange(entry: PlannedChange, owner: UserName): Promise<StepOutcome> {
  const budget = new Promise<'unreached'>((resolve) =>
    window.setTimeout(() => resolve('unreached'), STEP_BUDGET_MS),
  );

  const work = (async (): Promise<StepOutcome> => {
    const { change, id } = entry;
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
  })();

  return Promise.race([work, budget]);
}

async function runPlan(
  planned: PlannedChange[],
  map: HandleMap,
  owner: UserName,
  live: Todo[],
): Promise<PlannedChange[]> {
  const startedAt = Date.now();
  const outcomes: StepOutcome[] = [];
  const results: PlannedChange[] = [];

  for (const previous of planned) {
    if (previous.outcome === 'saved' || previous.outcome === 'stale') {
      results.push(previous);
      continue;
    }

    const [step] = reconcileTodoPlan([previous.change], map, live);
    if (step.outcome === 'stale') {
      results.push(step);
      continue;
    }

    const action = nextStep({ outcomes, elapsedMs: Date.now() - startedAt });
    if (action !== 'run') {
      results.push({ ...step, outcome: 'notAttempted', note: 'Not tried — the run stopped.' });
      continue;
    }

    const outcome = await runChange(step, owner);
    outcomes.push(outcome);

    if (outcome === 'saved') {
      const clashes = clashesFor(step.change, live, step.id);
      results.push({
        ...step,
        outcome: 'saved',
        note: clashes.length > 0 ? `That day already had "${clashes[0].title}".` : '',
      });
      continue;
    }

    results.push({
      ...step,
      outcome: outcome === 'unreached' ? 'notAttempted' : 'failed',
      note:
        outcome === 'unreached'
          ? "Couldn't reach the database."
          : 'The database refused it.',
    });
  }

  return results;
}


export default function AssistantSheet({
  open,
  onClose,
  owner,
  rows,
  today,
  now,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  owner: UserName;
  rows: Todo[];
  today: string;
  now: string;
  onApplied: (message: string) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [map, setMap] = useState<HandleMap>(() => emptyHandleMap('t'));
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [running, setRunning] = useState(false);

  const fromYou = entries.filter((e) => e.kind === 'text' && e.role === 'you').length;
  const remaining = MAX_FROM_YOU - fromYou;
  const full = remaining <= 0;

  function reset() {
    setEntries([]);
    setMap(emptyHandleMap('t'));
    setDraft('');
  }

  function historyFor(entries: Entry[]): Message[] {
    return entries.map((entry) => {
      if (entry.kind === 'text') return { role: entry.role, text: entry.text };
      const saved = entry.planned.some((p) => p.outcome === 'saved');
      if (entry.cancelled) return { role: 'assistant', text: `You cancelled: ${entry.summary}` };
      if (saved) {
        const handles = entry.planned.map((p) => p.change.handle).filter((h) => h !== '');
        return { role: 'assistant', text: `Applied: ${entry.summary} (${handles.join(', ')})` };
      }
      return {
        role: 'assistant',
        text: `Open plan, not yet applied: ${entry.summary}
${JSON.stringify(
          entry.planned.map((p) => p.change),
        )}`,
      };
    });
  }

  async function send() {
    const text = draft.trim();
    if (text === '' || full || thinking) return;

    const asked: Entry[] = [...entries, { kind: 'text', role: 'you', text }];
    setEntries(asked);
    setDraft('');
    setThinking(true);

    const { snapshot, map: nextMap } = buildTodoSnapshot(rows, map, today, now);
    setMap(nextMap);

    const result = await askTodoAssistant(snapshot, historyFor(asked));
    setThinking(false);

    if (!result.ok) {
      setEntries([...asked, { kind: 'text', role: 'assistant', text: assistantFailureMessage(result.reason) }]);
      return;
    }

    const parsed = parseReply<TodoChange>(result.value, todoChangeParser(nextMap, today));
    if (!parsed.ok) {
      setEntries([...asked, { kind: 'text', role: 'assistant', text: assistantFailureMessage(parsed.reason) }]);
      return;
    }

    if (parsed.reply.kind !== 'plan') {
      setEntries([...asked, { kind: 'text', role: 'assistant', text: parsed.reply.text }]);
      return;
    }

    const duplicate = validateTodoPlan(parsed.reply.changes);
    if (duplicate !== null) {
      setEntries([...asked, { kind: 'text', role: 'assistant', text: assistantFailureMessage(duplicate) }]);
      return;
    }

    setEntries([
      ...asked,
      {
        kind: 'plan',
        summary: parsed.reply.summary,
        planned: reconcileTodoPlan(parsed.reply.changes, nextMap, rows),
        cancelled: false,
      },
    ]);
  }

  async function apply(index: number) {
    setRunning(true);

    const fresh = await fetchTodos(owner);
    if (fresh.status !== 'ok') {
      setRunning(false);
      onApplied('Could not reach your list. Nothing was changed.');
      return;
    }

    const entry = entries[index] as Extract<Entry, { kind: 'plan' }>;
    const results = await runPlan(entry.planned, map, owner, fresh.rows);

    setEntries(entries.map((e, i) => (i === index ? { ...entry, planned: results } : e)));
    setRunning(false);

    const saved = results.filter((r) => r.outcome === 'saved').length;
    onApplied(`${saved} of ${results.length} saved.`);
  }

  function cancel(index: number) {
    setEntries(
      entries.map((entry, i) =>
        i === index && entry.kind === 'plan' ? { ...entry, cancelled: true } : entry,
      ),
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Ask about your list" variant="sheet" maxWidthClass="max-w-lg">
      <div className="flex flex-col gap-3">
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

        {full ? (
          <div className="mt-soft p-4">
            <p className="text-sm font-medium text-[var(--mt-text)]">This chat is full.</p>
            <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
              Six messages is the limit, so replies stay fast and cheap. Start a new one — it will
              still see all your current tasks.
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
                placeholder="Move dentist to Friday"
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
            {remaining <= WARN_AT_REMAINING && (
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

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/assistant/AssistantSheet.tsx
git commit -m "feat(assistant): hold the conversation and apply an approved plan"
```

---

### Task 12: The button, the wiring, and the contrast pin

**Files:**
- Create: `src/components/assistant/AssistantButton.tsx`
- Create: `src/lib/assistantAccent.test.ts`
- Modify: `src/components/todo/TodoBoard.tsx`

**Interfaces:**
- Consumes: `AssistantSheet` from Task 11.
- Produces: `export default function AssistantButton({ owner, rows, today, now, onApplied })`

The measured numbers, taken with `color.ts` before writing this plan: cocoa `#3B2E2A` on the to-do accent `#64B880` gives **5.41:1**. White on the same fill gives **2.41:1** and fails. The icon is cocoa. The test pins that so retuning the accent fails loudly.

- [ ] **Step 1: Write the failing contrast test**

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio } from './color';

const CSS = readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

function token(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
  return (match as RegExpExecArray)[1];
}

describe('the assistant button', () => {
  it('keeps a cocoa icon readable on the to-do accent', () => {
    const ratio = contrastRatio(token('--mac-accent-todo'), token('--mac-cocoa'));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('is why the icon is not white', () => {
    const ratio = contrastRatio(token('--mac-accent-todo'), token('--mac-white'));
    expect(ratio).toBeLessThan(3);
  });
});
```

- [ ] **Step 2: Run it and confirm it passes on the first run**

```bash
npx vitest run src/lib/assistantAccent.test.ts
```

Expected: PASS, 2 tests. This one pins an existing value rather than driving new code, so it is green immediately. If it is red, the accent moved and the icon colour must be rechosen before continuing.

- [ ] **Step 3: Write the button**

```tsx
'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AssistantSheet from './AssistantSheet';
import type { Todo } from '@/lib/todo';
import type { UserName } from '@/lib/identity';

export default function AssistantButton({
  owner,
  rows,
  today,
  now,
  onApplied,
}: {
  owner: UserName;
  rows: Todo[];
  today: string;
  now: string;
  onApplied: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask about your list"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mt-accent)] text-[var(--mt-text)] shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
      >
        <Sparkles size={22} aria-hidden />
      </button>
      <AssistantSheet
        open={open}
        onClose={() => setOpen(false)}
        owner={owner}
        rows={rows}
        today={today}
        now={now}
        onApplied={onApplied}
      />
    </>
  );
}
```

- [ ] **Step 4: Wire it into `TodoBoard`**

Add the import beside the other component imports:

```tsx
import AssistantButton from '@/components/assistant/AssistantButton';
```

Render it just before the closing fragment of `TodoBoard`'s return, gated on the board showing Jeff's own list and having loaded:

```tsx
{viewing === signedIn && displayStatus === 'ok' && (
  <AssistantButton
    owner={signedIn}
    rows={todos}
    today={clock.today}
    now={clock.now}
    onApplied={(message) => {
      setNotice(message);
      setReloadToken((token) => token + 1);
    }}
  />
)}
```

`setNotice` and `setReloadToken` already exist in `TodoBoard` — the refetch runs through the existing `reloadToken` effect, and the message lands in the existing notice slot. No new board state.

- [ ] **Step 5: Run the whole suite, typecheck and lint**

```bash
npm test && npx tsc --noEmit && npm run lint
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/assistant/AssistantButton.tsx src/lib/assistantAccent.test.ts src/components/todo/TodoBoard.tsx
git commit -m "feat(todo): open the assistant from the board and refetch after it saves"
```

---

### Task 13: Verify in the browser, then open the PR

**Files:**
- Create: `docs/superpowers/2026-09-01-todo-assistant-verification.md`

Nothing here can be reached by Vitest. Work through it in the real app, and write down what you saw — the repo already keeps verification notes beside its specs.

- [ ] **Step 1: Start the app through the preview tooling**

Never `npm run dev` in a raw shell. Use the preview tool so the browser attaches.

- [ ] **Step 2: Walk the list, recording pass or fail for each**

1. The button appears on `/todo` for your own list.
2. Switch the board to Rachel — the button disappears.
3. `add gym tomorrow` → a plan card with the date filled and the time empty.
4. Apply → the task appears on the board, the card collapses to "Saved. 1 of 1."
5. `add gym tomorrow` again → the card shows the duplicate warning before you tap.
6. `move dentist to Friday` with two dentist tasks → it asks which, and does not guess.
7. `what have I got on Thursday?` → a text answer, no card.
8. `add trip on 14 Dec 2087` → rejected, and the message names 2087.
9. Send six messages → the "2 messages left" line appears, then the full panel with a working **Start new chat**.
10. Turn the network off, then send → "You're offline."
11. Turn the network off mid-Apply → the card reports per row, and the button comes back as **Try again**, never stuck grey.
12. Open a plan, close the sheet mid-Apply → the board shows the notice anyway.
13. On a phone width, the button clears the bottom of the screen and is at least 44px.

- [ ] **Step 3: Write up what you saw**

Record each numbered check with its result and anything surprising. If something fails, fix it with a test written failing first, then re-run the list.

- [ ] **Step 4: Commit and open the PR**

```bash
git add docs/superpowers/2026-09-01-todo-assistant-verification.md
git commit -m "docs: record the to-do assistant verification pass"
git push -u origin feat/todo-assistant
```

The PR description must call out the one deliberate widening of the spec: check 5 is implemented for **add and edit**, not adds alone, because `updateTodo` would otherwise let a bad edit blank a task's title.

---

## What Plan 2 will add

The calendar bot, once this has landed and its signatures are real rather than predicted: `calendarPlan.ts` beside `todoPlan.ts`, `buildCalendarSnapshot` in `assistantContext.ts` with the −30/+90 window and the 250-event cap that shrinks to −14/+45, the category-name check, `eventForm.validate()` as spec check 10, span-overlap clashes, and the button gated on the owner filter equalling the signed-in user — hidden on **Both**.

`assistantReply.ts`, `assistantFailure.ts`, `assistantRun.ts` and `assistantContext.ts`'s handle map are written here to be reused by it unchanged. `Reason` already carries `unknownCategory` and `formRejection` for exactly that reason.

---

## Amendment — Task 11, after review

Task 11's review found the corrected brief violating this plan's own rule that no
judgement lives in a `.tsx` file. Three pieces of policy had landed in
`AssistantSheet.tsx` where Vitest can never reach them, and one of them carried a bug
that a test would have caught the moment it was written.

The bug: `historyFor` told the model `Applied: <summary> (t1, t2, t3)` whenever *any*
change in a plan saved, listing every handle in the plan rather than only the saved
ones. On a partial apply — the exact case the retry button exists for — the next turn
would tell the model that rows which failed had been applied.

Two modules are extracted, and `AssistantSheet.tsx` keeps only wiring and state:

- **`src/lib/assistantConversation.ts`** — the conversation model: the `Entry` union,
  `historyFor`, `MAX_FROM_YOU`, and `capStatus`. `historyFor` now lists only handles
  whose outcome is `saved`.
- **`src/lib/applyRun.ts`** — `runPlan(planned, map, live, run, now)`. The change
  runner and the clock arrive as parameters, so the retry, budget and outcome-mapping
  policy is testable without a database or a DOM. `runChange` stays in the component,
  because it is the part that actually touches `todoRepo` and `window.setTimeout`.

Both get test files. This is the plan's own standard applied to the plan's own code.

---

## Amendment — Task 12, after review

The brief told Task 12 to route the assistant's result into `TodoBoard`'s existing
notice slot, on the grounds that reusing it meant no new board state. That slot renders
in `--mt-danger`, because every message it has ever carried is a failure. So a clean
run would have told the person **"3 of 3 saved."** in error red.

The notice grows a tone. `notice` becomes `{ text, tone } | null` where tone is `'ok'`
or `'problem'`; the five existing error call sites pass `'problem'`, and the tone
decides the colour.

**The success colour is `--mt-text-muted`, not `--mt-success`.** Measured before
choosing: `--mac-success` `#7FBF8F` as ink on cream is **2.04:1** and fails badly — it
is a fill token whose contrast pair is `--mt-success-contrast`. `--mac-cocoa-muted`
gives 5.06:1. This is the palette rule this project already documents: a pastel built
to sit behind text cannot be used as text.

The wording and the tone are one decision, so they move out of the component together:
`applySummary(results)` in `src/lib/applyRun.ts` returns both, and is tested. `onApplied`
becomes `(message: string, tone: ApplyTone) => void`.

---

## Amendment — after browser verification

The browser run failed four checks against one root cause, and it is the defect this
whole plan most deserved to be caught on: **the system prompt and the parser never
agreed.**

`parseReply` rejects a `plan` that carries any `text`, and a text reply that carries any
`summary`. The prompt in `route.ts` never mentions either rule. Gemini, told to fill a
flat schema with every field required, filled them all — so real reply after real reply
was thrown away as "The AI's answer didn't hold together." Every one of the 631 unit
tests passed throughout, because they feed `parseReply` hand-written wire objects that
already obey a contract the model was never told about.

Two changes, and the split between them matters:

- **Rejecting `changes` on a non-plan stays.** That was the requirement as stated: an
  `answer` arriving with five changes means the model was confused about what it was
  doing, and silently dropping them could discard what the person actually asked for.
- **A chatty `text` on a plan, or a stray `summary` on a text reply, is now ignored
  rather than rejected.** That is not confusion, it is a model adding a friendly
  sentence. Throwing the whole reply away over it is a worse answer than reading past
  it.
- **The prompt now states the shape rules explicitly**, so the model complies anyway
  and the tolerant path is a safety net rather than the normal case.

The prompt also gains a firmer instruction to ask rather than guess when several rows
match, which the run showed it guessing through.
