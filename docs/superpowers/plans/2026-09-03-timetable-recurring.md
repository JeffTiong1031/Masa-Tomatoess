# Timetable and Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/study/timetable` into one page holding a Mon–Sun class grid fed by recurring events, and the existing itinerary list extended from "tomorrow" to all seven weekdays.

**Architecture:** Two halves that share a page and no data. The timetable half is a new read-only grid whose only content comes from rows in a new `timetable_rules` table; you change it by editing rules, never by touching the grid. The timeline half keeps its current component, free-text times and save behaviour, and gains a weekday key plus seven tabs. All grid maths and validation live in `lib/` as pure functions, because Vitest here has no DOM environment and nothing in a `.tsx` file can be asserted.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19.2, TypeScript strict, Tailwind v4, Supabase (`@supabase/supabase-js`), `lucide-react`, Vitest (node environment).

**Spec:** [docs/superpowers/specs/2026-09-03-timetable-recurring-design.md](../specs/2026-09-03-timetable-recurring-design.md)

**Branch:** `feat/timetable-recurring` (already exists, spec already committed)

## Global Constraints

- **Do not write comments.** Names and structure carry the meaning. This is a hard project rule; existing comments predate it.
- **Never hardcode a colour.** Components reference `--mt-*` semantic tokens only. Raw `--mac-*` hues stay inside `globals.css`.
- **Avoid defensive programming.** No guards for states the types already exclude, no fallbacks for cases that cannot occur.
- **Avoid instance checks.** No `instanceof`, no `typeof` branching to discriminate shapes. Model the union properly.
- **Handle exceptions only where there is something to do about them.** Supabase calls log and return a failure value; pure functions do not catch.
- Server Components by default; `'use client'` only on the leaf that needs it.
- Touch targets at least 44px (`min-h-11`, `2.75rem`).
- Grid over flex percentage maths. `min-h-dvh`, never `h-screen`.
- Tests sit beside their source as `*.test.ts`. Vitest runs `src/**/*.test.ts` in a **node** environment — no DOM, no component rendering.
- **Commits are authored by Jeff alone.** No `Co-Authored-By`, no `Claude-Session`, no generated-with trailer. Subject line plus optional plain body.
- Next.js 16 is not the Next.js in training data. Read `node_modules/next/dist/docs/` before writing App Router code.
- Weekday origin is **Monday = 0**, matching `weekdayIndex` in `lib/dates.ts`.
- Run `npm test`, `npm run lint` and `npx tsc --noEmit` before each commit.

---

## File Structure

**New in `src/lib/`:**

| File | Responsibility |
|---|---|
| `timetableRule.ts` | The rule type, draft, error union, `validateRule`, `ruleMessage`, `sortRules`. |
| `timetableGrid.ts` | `gridHours`, `rulesByWeekday`, `rowSpanOf`. Pure geometry, no React. |
| `timetableRepo.ts` | Supabase reads and writes for `timetable_rules`. |
| `timelineWeek.ts` | The weekday-keyed shape of the timeline and the row-to-week mapping. |

**Modified in `src/lib/`:** `dates.ts` (gains `Weekday`, `WEEKDAYS`, `todayWeekday`), `supabase.ts` (schema comment), `tagSwatches.test.ts` (contrast assertion).

**Renamed (Task 6, committed alone):**

| From | To |
|---|---|
| `src/lib/timetable.ts` | `src/lib/timeline.ts` |
| `src/lib/timetable.test.ts` | `src/lib/timeline.test.ts` |
| `src/components/timetable/TimetableBoard.tsx` | `src/components/timeline/TimelineBoard.tsx` |
| `src/components/timetable/TimetablePane.tsx` | `src/components/timeline/TimelinePane.tsx` |
| `src/components/timetable/TimetableEditor.tsx` | `src/components/timeline/TimelineEditor.tsx` |

**New in `src/components/timetable/`:** `TimetableBoard.tsx` (fetch, owner toggle, orchestration), `TimetableGrid.tsx` (presentational grid), `RecurringList.tsx` (rules as rows), `RuleModal.tsx` (add/edit one rule).

**New in `src/components/timeline/`:** `DayTabs.tsx`, `ClearDialog.tsx`.

**Modified elsewhere:** `src/app/study/timetable/page.tsx`, `src/components/nav/navLinks.ts`.

---

## Task 1: Weekday helpers in `lib/dates.ts`

The spec deliberately adds no `lib/weekdays.ts` — `dates.ts` already exports `WEEKDAYS_SHORT` and a Monday-is-0 `weekdayIndex`, and a second list of weekday names is what D66 exists to prevent.

**Files:**
- Modify: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Weekday = 0|1|2|3|4|5|6`, `const WEEKDAYS: readonly string[]` (Monday…Sunday), `function todayWeekday(now?: Date): Weekday`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/dates.test.ts`, and add `WEEKDAYS`, `todayWeekday`, `weekdayIndex` to the existing import block at the top of that file:

```ts
describe('todayWeekday', () => {
  it('makes Monday 0, not 1', () => {
    expect(todayWeekday(new Date(2026, 8, 7))).toBe(0);
  });

  it('makes Sunday 6, not 0', () => {
    expect(todayWeekday(new Date(2026, 8, 13))).toBe(6);
  });

  it('agrees with weekdayIndex for the same day', () => {
    expect(todayWeekday(new Date(2026, 8, 3))).toBe(weekdayIndex('2026-09-03'));
  });

  it('reads local parts, so a late evening does not roll forward', () => {
    expect(todayWeekday(new Date(2026, 8, 7, 23, 30))).toBe(0);
  });
});

describe('WEEKDAYS', () => {
  it('lines up with WEEKDAYS_SHORT', () => {
    expect(WEEKDAYS).toHaveLength(WEEKDAYS_SHORT.length);
    WEEKDAYS.forEach((name, index) => {
      expect(name.startsWith(WEEKDAYS_SHORT[index])).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: FAIL — `todayWeekday is not a function`, `WEEKDAYS is not defined`.

- [ ] **Step 3: Write the implementation**

Add to `src/lib/dates.ts`, directly below the existing `WEEKDAYS_SHORT` declaration:

```ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday',
] as const;
```

Add at the end of the file:

```ts
export function todayWeekday(now: Date = new Date()): Weekday {
  return ((now.getDay() + 6) % 7) as Weekday;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: PASS, including the pre-existing tests in that file.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat(dates): add the Weekday type, full weekday names and todayWeekday

WEEKDAYS_SHORT and weekdayIndex already put Monday at 0. These join them
rather than starting a second weekday module with its own origin."
```

---

## Task 2: The rule model and its validation

**Files:**
- Create: `src/lib/timetableRule.ts`
- Test: `src/lib/timetableRule.test.ts`

**Interfaces:**
- Consumes: `Weekday`, `WEEKDAYS` from `lib/dates`; `SwatchIndex` from `lib/categories`; `UserName` from `lib/identity`.
- Produces: `TimetableRule`, `RuleDraft`, `RuleError`, `sortRules(rules)`, `validateRule(draft, owner, existing, editingId)`, `ruleMessage(error, weekday)`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/timetableRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ruleMessage,
  sortRules,
  validateRule,
  type RuleDraft,
  type TimetableRule,
} from './timetableRule';

function rule(over: Partial<TimetableRule> = {}): TimetableRule {
  return {
    id: 'r1',
    owner: 'Jeff',
    weekday: 3,
    title: 'Maths',
    startTime: '09:00',
    endTime: '11:00',
    swatch: 1,
    ...over,
  };
}

function draft(over: Partial<RuleDraft> = {}): RuleDraft {
  return {
    weekday: 3,
    title: 'Physics',
    startTime: '13:00',
    endTime: '15:00',
    swatch: 2,
    ...over,
  };
}

describe('validateRule', () => {
  it('rejects an empty title', () => {
    expect(validateRule(draft({ title: '' }), 'Jeff', [], null)).toEqual({
      kind: 'titleRequired',
    });
  });

  it('rejects a title that is only whitespace', () => {
    expect(validateRule(draft({ title: '   ' }), 'Jeff', [], null)).toEqual({
      kind: 'titleRequired',
    });
  });

  it('rejects an end before the start', () => {
    const bad = draft({ startTime: '15:00', endTime: '13:00' });
    expect(validateRule(bad, 'Jeff', [], null)).toEqual({
      kind: 'endNotAfterStart',
    });
  });

  it('rejects an end equal to the start', () => {
    const bad = draft({ startTime: '13:00', endTime: '13:00' });
    expect(validateRule(bad, 'Jeff', [], null)).toEqual({
      kind: 'endNotAfterStart',
    });
  });

  it('rejects a partial overlap and names what it clashed with', () => {
    const clash = draft({ startTime: '10:00', endTime: '12:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)).toEqual({
      kind: 'overlaps',
      title: 'Maths',
      startTime: '09:00',
      endTime: '11:00',
    });
  });

  it('rejects a new rule fully inside an existing one', () => {
    const clash = draft({ startTime: '09:30', endTime: '10:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)?.kind).toBe('overlaps');
  });

  it('rejects a new rule that fully contains an existing one', () => {
    const clash = draft({ startTime: '08:00', endTime: '12:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)?.kind).toBe('overlaps');
  });

  it('rejects an identical span', () => {
    const clash = draft({ startTime: '09:00', endTime: '11:00' });
    expect(validateRule(clash, 'Jeff', [rule()], null)?.kind).toBe('overlaps');
  });

  it('allows two rules that merely touch', () => {
    const after = draft({ startTime: '11:00', endTime: '12:00' });
    expect(validateRule(after, 'Jeff', [rule()], null)).toBeNull();
  });

  it('allows the same span on a different weekday', () => {
    const elsewhere = draft({ weekday: 4, startTime: '09:00', endTime: '11:00' });
    expect(validateRule(elsewhere, 'Jeff', [rule()], null)).toBeNull();
  });

  it('allows the same span belonging to the other person', () => {
    const mine = draft({ startTime: '09:00', endTime: '11:00' });
    expect(validateRule(mine, 'Rachel', [rule()], null)).toBeNull();
  });

  it('does not clash a rule with itself while editing', () => {
    const same = draft({ startTime: '09:00', endTime: '11:00' });
    expect(validateRule(same, 'Jeff', [rule()], 'r1')).toBeNull();
  });
});

describe('ruleMessage', () => {
  it('names the clash, its time and its day', () => {
    const error = {
      kind: 'overlaps' as const,
      title: 'Maths',
      startTime: '09:00',
      endTime: '11:00',
    };
    expect(ruleMessage(error, 3)).toBe(
      'Maths is already at 09:00–11:00 on Thursday.',
    );
  });

  it('has a sentence for every error kind', () => {
    expect(ruleMessage({ kind: 'titleRequired' }, 0)).toMatch(/name/i);
    expect(ruleMessage({ kind: 'endNotAfterStart' }, 0)).toMatch(/after/i);
  });
});

describe('sortRules', () => {
  it('orders by weekday, then start time, then title', () => {
    const rules = [
      rule({ id: 'c', weekday: 4, startTime: '09:00', endTime: '10:00', title: 'C' }),
      rule({ id: 'b', weekday: 3, startTime: '13:00', endTime: '14:00', title: 'B' }),
      rule({ id: 'a', weekday: 3, startTime: '09:00', endTime: '10:00', title: 'A' }),
    ];
    expect(sortRules(rules).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate its argument', () => {
    const rules = [rule({ id: 'x', weekday: 5 }), rule({ id: 'y', weekday: 1 })];
    sortRules(rules);
    expect(rules.map((r) => r.id)).toEqual(['x', 'y']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/timetableRule.test.ts`
Expected: FAIL — cannot resolve `./timetableRule`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/timetableRule.ts`:

```ts
import type { SwatchIndex } from './categories';
import { WEEKDAYS, type Weekday } from './dates';
import type { UserName } from './identity';

export interface TimetableRule {
  id: string;
  owner: UserName;
  weekday: Weekday;
  title: string;
  startTime: string;
  endTime: string;
  swatch: SwatchIndex;
}

export interface RuleDraft {
  weekday: Weekday;
  title: string;
  startTime: string;
  endTime: string;
  swatch: SwatchIndex;
}

export type RuleError =
  | { kind: 'titleRequired' }
  | { kind: 'endNotAfterStart' }
  | { kind: 'overlaps'; title: string; startTime: string; endTime: string };

export function sortRules(rules: TimetableRule[]): TimetableRule[] {
  return [...rules].sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    const byStart = a.startTime.localeCompare(b.startTime);
    if (byStart !== 0) return byStart;
    return a.title.localeCompare(b.title);
  });
}

export function validateRule(
  draft: RuleDraft,
  owner: UserName,
  existing: TimetableRule[],
  editingId: string | null,
): RuleError | null {
  if (draft.title.trim() === '') return { kind: 'titleRequired' };
  if (draft.endTime <= draft.startTime) return { kind: 'endNotAfterStart' };

  const clash = existing.find(
    (rule) =>
      rule.id !== editingId &&
      rule.owner === owner &&
      rule.weekday === draft.weekday &&
      rule.startTime < draft.endTime &&
      draft.startTime < rule.endTime,
  );

  if (clash === undefined) return null;

  return {
    kind: 'overlaps',
    title: clash.title,
    startTime: clash.startTime,
    endTime: clash.endTime,
  };
}

export function ruleMessage(error: RuleError, weekday: Weekday): string {
  if (error.kind === 'titleRequired') return 'Give the class a name.';
  if (error.kind === 'endNotAfterStart') {
    return 'The end time must be after the start time.';
  }
  return `${error.title} is already at ${error.startTime}–${error.endTime} on ${WEEKDAYS[weekday]}.`;
}
```

The overlap test is `a.start < b.end && b.start < a.end`, which is what makes two rules that merely touch (`10:00–11:00` and `11:00–12:00`) pass. Times are `HH:MM` strings, so string comparison is chronological and no parsing is needed.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/timetableRule.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timetableRule.ts src/lib/timetableRule.test.ts
git commit -m "feat(timetable): add the recurring rule model and its validation

Overlapping rules on one weekday for one owner are a mistake, not a state,
so validateRule refuses them and carries the clashing rule's title and span
back so the message can name it."
```

---

## Task 3: Grid geometry

**Files:**
- Create: `src/lib/timetableGrid.ts`
- Test: `src/lib/timetableGrid.test.ts`

**Interfaces:**
- Consumes: `TimetableRule`, `sortRules` from `lib/timetableRule`.
- Produces: `gridHours(rules): { from: number; to: number }`, `rulesByWeekday(rules): TimetableRule[][]`, `rowSpanOf(rule, from): { startRow: number; endRow: number }`.

`gridHours` returns a half-open band: the grid draws hour labels `from` through `to - 1`, so it has `to - from` rows. `rowSpanOf` returns **1-based rows within that band** — the grid component adds 1 more to skip its own weekday header row. Keeping the header offset out of `lib/` is what lets these values be asserted without knowing anything about the markup.

- [ ] **Step 1: Write the failing test**

Create `src/lib/timetableGrid.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gridHours, rowSpanOf, rulesByWeekday } from './timetableGrid';
import type { TimetableRule } from './timetableRule';

function rule(over: Partial<TimetableRule> = {}): TimetableRule {
  return {
    id: 'r1',
    owner: 'Jeff',
    weekday: 0,
    title: 'Maths',
    startTime: '09:00',
    endTime: '11:00',
    swatch: 1,
    ...over,
  };
}

describe('gridHours', () => {
  it('uses the default band when there are no rules', () => {
    expect(gridHours([])).toEqual({ from: 8, to: 18 });
  });

  it('never narrows past the default band', () => {
    expect(gridHours([rule()])).toEqual({ from: 8, to: 18 });
  });

  it('widens upward for an early rule', () => {
    expect(gridHours([rule({ startTime: '06:00', endTime: '07:00' })]).from).toBe(6);
  });

  it('widens downward for a late rule', () => {
    expect(gridHours([rule({ startTime: '19:00', endTime: '21:00' })]).to).toBe(21);
  });

  it('rounds a part-hour end up to the next whole hour', () => {
    expect(gridHours([rule({ startTime: '19:00', endTime: '20:30' })]).to).toBe(21);
  });

  it('spans the earliest start and the latest end across all rules', () => {
    const rules = [
      rule({ id: 'a', startTime: '07:00', endTime: '08:00' }),
      rule({ id: 'b', weekday: 2, startTime: '20:00', endTime: '22:00' }),
    ];
    expect(gridHours(rules)).toEqual({ from: 7, to: 22 });
  });
});

describe('rulesByWeekday', () => {
  it('always returns seven lists', () => {
    expect(rulesByWeekday([])).toHaveLength(7);
  });

  it('keeps empty days as empty lists rather than dropping them', () => {
    const days = rulesByWeekday([rule({ weekday: 2 })]);
    expect(days[0]).toEqual([]);
    expect(days[2]).toHaveLength(1);
  });

  it('puts each rule in its own weekday', () => {
    const days = rulesByWeekday([
      rule({ id: 'mon', weekday: 0 }),
      rule({ id: 'sun', weekday: 6 }),
    ]);
    expect(days[0][0].id).toBe('mon');
    expect(days[6][0].id).toBe('sun');
  });

  it('orders each day by start time', () => {
    const days = rulesByWeekday([
      rule({ id: 'late', startTime: '13:00', endTime: '14:00' }),
      rule({ id: 'early', startTime: '09:00', endTime: '10:00' }),
    ]);
    expect(days[0].map((r) => r.id)).toEqual(['early', 'late']);
  });
});

describe('rowSpanOf', () => {
  it('places a rule relative to the top of the band', () => {
    expect(rowSpanOf(rule({ startTime: '09:00', endTime: '11:00' }), 8)).toEqual({
      startRow: 2,
      endRow: 4,
    });
  });

  it('gives the first hour of the band row 1', () => {
    expect(rowSpanOf(rule({ startTime: '08:00', endTime: '09:00' }), 8).startRow).toBe(1);
  });

  it('gives a one-hour rule a span of exactly one row', () => {
    const span = rowSpanOf(rule({ startTime: '10:00', endTime: '11:00' }), 8);
    expect(span.endRow - span.startRow).toBe(1);
  });

  it('rounds a part-hour end up so the block covers the hour it runs into', () => {
    const span = rowSpanOf(rule({ startTime: '10:00', endTime: '10:30' }), 8);
    expect(span.endRow - span.startRow).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/timetableGrid.test.ts`
Expected: FAIL — cannot resolve `./timetableGrid`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/timetableGrid.ts`:

```ts
import { sortRules, type TimetableRule } from './timetableRule';

const DEFAULT_FROM = 8;
const DEFAULT_TO = 18;
const DAYS_IN_WEEK = 7;

function startHourOf(time: string): number {
  return Number(time.slice(0, 2));
}

function endHourOf(time: string): number {
  const hour = Number(time.slice(0, 2));
  return time.slice(3) === '00' ? hour : hour + 1;
}

export function gridHours(rules: TimetableRule[]): { from: number; to: number } {
  return {
    from: Math.min(DEFAULT_FROM, ...rules.map((rule) => startHourOf(rule.startTime))),
    to: Math.max(DEFAULT_TO, ...rules.map((rule) => endHourOf(rule.endTime))),
  };
}

export function rulesByWeekday(rules: TimetableRule[]): TimetableRule[][] {
  const days: TimetableRule[][] = Array.from({ length: DAYS_IN_WEEK }, () => []);
  for (const rule of sortRules(rules)) days[rule.weekday].push(rule);
  return days;
}

export function rowSpanOf(
  rule: TimetableRule,
  from: number,
): { startRow: number; endRow: number } {
  return {
    startRow: startHourOf(rule.startTime) - from + 1,
    endRow: endHourOf(rule.endTime) - from + 1,
  };
}
```

`Math.min(DEFAULT_FROM, ...[])` is `DEFAULT_FROM`, so the empty case needs no branch of its own.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/timetableGrid.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timetableGrid.ts src/lib/timetableGrid.test.ts
git commit -m "feat(timetable): add the grid band, weekday grouping and row spans

The header-row offset stays in the component so these values can be
asserted without the test knowing anything about the markup."
```

---

## Task 4: Pin the swatches as block backgrounds

`tagSwatches.test.ts` today checks the eight swatches as *marks* at 3:1. On the grid a swatch becomes a filled background carrying white words, which is a 4.5:1 job. Measured before the spec relied on it: the range is 5.06:1 (`--mac-tag-3`) to 7.88:1 (`--mac-tag-6`). This test keeps it that way when a swatch is next retuned.

**Files:**
- Modify: `src/lib/tagSwatches.test.ts`

**Interfaces:**
- Consumes: `contrastRatio` from `lib/color`, already imported in that file.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/tagSwatches.test.ts`, inside the existing top-level scope:

```ts
const MIN_BLOCK_TEXT_CONTRAST = 4.5;

describe('swatches as timetable blocks', () => {
  const swatches = readSwatches();

  it('carries white body text on every swatch', () => {
    swatches.forEach((swatch, index) => {
      const ratio = contrastRatio(swatch, WHITE);
      expect(
        ratio,
        `--mac-tag-${index + 1} (${swatch}) behind white text`,
      ).toBeGreaterThanOrEqual(MIN_BLOCK_TEXT_CONTRAST);
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it passes on today's values**

Run: `npx vitest run src/lib/tagSwatches.test.ts`
Expected: PASS. This is the one test in the plan written to pass immediately — it is a regression pin on measured values, not a driver for new code. If it fails, stop: a swatch has drifted since the spec was measured and the grid needs a tinted-block treatment instead, which is a spec change.

- [ ] **Step 3: Verify it can fail**

Temporarily change `MIN_BLOCK_TEXT_CONTRAST` to `9`, re-run, and confirm it fails naming `--mac-tag-3`. Change it back to `4.5`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tagSwatches.test.ts
git commit -m "test(swatches): pin every swatch at 4.5:1 behind white text

The existing check treats a swatch as a mark at 3:1. On the timetable grid
a swatch is a filled block carrying words, which is a body-text job."
```

---

## Task 5: The rules repository, and Supabase Part 1

**Files:**
- Create: `src/lib/timetableRepo.ts`
- Modify: `src/lib/supabase.ts` (schema comment)

**Interfaces:**
- Consumes: `supabase` from `lib/supabase`; `TimetableRule`, `RuleDraft` from `lib/timetableRule`; `UserName` from `lib/identity`; `SwatchIndex` from `lib/categories`; `Weekday` from `lib/dates`.
- Produces: `fetchRules(): Promise<TimetableRule[] | null>`, `insertRule(owner, draft): Promise<boolean>`, `updateRule(id, draft): Promise<boolean>`, `deleteRule(id): Promise<boolean>`, `deleteRulesOf(owner): Promise<boolean>`.

There is **no test file** for this task. It is Supabase I/O with no pure logic to assert, and Vitest here has no environment to exercise it in — the same reason `calendarRepo.ts`, `mealRepo.ts` and `cycleRepo.ts` have no tests. Do not invent a mock to manufacture coverage.

- [ ] **Step 1: Ask Jeff to run Supabase Part 1**

Send him `docs/superpowers/specs/2026-09-03-timetable-setup.sql` and ask him to run **Part 1 only** — the `timetable_rules` block, stopping before the `drop table if exists timetables` line. Part 1 is additive and breaks nothing. Do not run Part 2 yet; it is sequenced in Task 12 because it breaks the current page's save.

Wait for confirmation before Step 2. The code below compiles without it, but nothing will load.

- [ ] **Step 2: Write the repository**

Create `src/lib/timetableRepo.ts`:

```ts
import type { SwatchIndex } from './categories';
import type { Weekday } from './dates';
import type { UserName } from './identity';
import { supabase } from './supabase';
import type { RuleDraft, TimetableRule } from './timetableRule';

interface RuleRow {
  id: string;
  owner: UserName;
  weekday: Weekday;
  title: string;
  start_time: string;
  end_time: string;
  swatch: SwatchIndex;
}

function toColumns(draft: RuleDraft) {
  return {
    weekday: draft.weekday,
    title: draft.title.trim(),
    start_time: draft.startTime,
    end_time: draft.endTime,
    swatch: draft.swatch,
  };
}

export async function fetchRules(): Promise<TimetableRule[] | null> {
  const { data, error } = await supabase
    .from('timetable_rules')
    .select('id, owner, weekday, title, start_time, end_time, swatch');

  if (error) {
    console.error('Failed to load timetable rules:', error);
    return null;
  }

  return (data as RuleRow[]).map((row) => ({
    id: row.id,
    owner: row.owner,
    weekday: row.weekday,
    title: row.title,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    swatch: row.swatch,
  }));
}

export async function insertRule(
  owner: UserName,
  draft: RuleDraft,
): Promise<boolean> {
  const { error } = await supabase
    .from('timetable_rules')
    .insert({ owner, ...toColumns(draft) });

  if (error) {
    console.error('Failed to add timetable rule:', error);
    return false;
  }
  return true;
}

export async function updateRule(
  id: string,
  draft: RuleDraft,
): Promise<boolean> {
  const { error } = await supabase
    .from('timetable_rules')
    .update(toColumns(draft))
    .eq('id', id);

  if (error) {
    console.error('Failed to update timetable rule:', error);
    return false;
  }
  return true;
}

export async function deleteRule(id: string): Promise<boolean> {
  const { error } = await supabase.from('timetable_rules').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete timetable rule:', error);
    return false;
  }
  return true;
}

export async function deleteRulesOf(owner: UserName): Promise<boolean> {
  const { error } = await supabase
    .from('timetable_rules')
    .delete()
    .eq('owner', owner);

  if (error) {
    console.error('Failed to clear timetable rules:', error);
    return false;
  }
  return true;
}
```

Postgres returns a `time` column as `HH:MM:SS`; `.slice(0, 5)` narrows it to the `HH:MM` the client type promises, the same trim `calendarRepo.ts` already does.

- [ ] **Step 3: Document the table in `supabase.ts`**

Append to the schema comment block in `src/lib/supabase.ts`, after the existing `timetables` section:

```
Supabase Schema for timetable_rules (one row per recurring class):

```sql
create table timetable_rules (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null,
  weekday    smallint not null check (weekday between 0 and 6),
  title      text not null,
  start_time time not null,
  end_time   time not null,
  swatch     smallint not null check (swatch between 1 and 8),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
```
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timetableRepo.ts src/lib/supabase.ts
git commit -m "feat(timetable): read and write recurring rules

No test file: this is Supabase I/O with no pure logic, and Vitest here runs
with no environment to exercise it in, as with every other repo module."
```

---

## Task 6: The rename, committed on its own

Do this **before** writing any new component. The old `TimetableBoard.tsx` moves out and a new, unrelated `TimetableBoard.tsx` moves into the same path in Task 10 — if both happen in one commit, git welds two components' histories together and the rename disappears from the diff.

**Files:**
- Rename: `src/lib/timetable.ts` → `src/lib/timeline.ts`
- Rename: `src/lib/timetable.test.ts` → `src/lib/timeline.test.ts`
- Rename: `src/components/timetable/TimetableBoard.tsx` → `src/components/timeline/TimelineBoard.tsx`
- Rename: `src/components/timetable/TimetablePane.tsx` → `src/components/timeline/TimelinePane.tsx`
- Rename: `src/components/timetable/TimetableEditor.tsx` → `src/components/timeline/TimelineEditor.tsx`
- Modify: `src/app/study/timetable/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TimelineEntry` and `normalizeEntries` from `lib/timeline`; `TimelineBoard`, `TimelinePane` (with its `PaneState`), `TimelineEditor` from `components/timeline/`.

- [ ] **Step 1: Stop the dev server**

File moves fail with "permission denied" while it is running. If a preview is up, stop it before Step 2.

- [ ] **Step 2: Move the files**

```bash
git mv src/lib/timetable.ts src/lib/timeline.ts
git mv src/lib/timetable.test.ts src/lib/timeline.test.ts
mkdir -p src/components/timeline
git mv src/components/timetable/TimetableBoard.tsx src/components/timeline/TimelineBoard.tsx
git mv src/components/timetable/TimetablePane.tsx src/components/timeline/TimelinePane.tsx
git mv src/components/timetable/TimetableEditor.tsx src/components/timeline/TimelineEditor.tsx
```

- [ ] **Step 3: Rename the symbols**

In `src/lib/timeline.ts`, rename the exported interface `TimetableEntry` to `TimelineEntry`. `normalizeEntries` keeps its name.

In `src/lib/timeline.test.ts`, update the import path to `./timeline` and the type name.

In the three moved components: rename each default export function (`TimetableBoard` → `TimelineBoard`, `TimetablePane` → `TimelinePane`, `TimetableEditor` → `TimelineEditor`), update every `@/lib/timetable` import to `@/lib/timeline`, every `TimetableEntry` to `TimelineEntry`, and the relative imports inside `TimelineBoard.tsx` (`./TimetablePane` → `./TimelinePane`, `./TimetableEditor` → `./TimelineEditor`).

In `src/app/study/timetable/page.tsx`, change the import to:

```tsx
import TimelineBoard from '@/components/timeline/TimelineBoard';
```

and the element to `<TimelineBoard />`. Leave the page title and subtitle alone — Task 10 sets them.

- [ ] **Step 4: Verify nothing still points at the old names**

Run: `grep -rn "components/timetable\|@/lib/timetable\|TimetableEntry" src/`
Expected: no output.

Then run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all clean, `timeline.test.ts` passing.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib src/components src/app
git commit -m "refactor: rename the timetable page's list to timeline

The page is about to hold a real timetable grid alongside this list. Two
independent features must not share a word, or TimetableEditor becomes the
component that edits the timeline."
```

---

## Task 7: The grid component

**Files:**
- Create: `src/components/timetable/TimetableGrid.tsx`

**Interfaces:**
- Consumes: `rowSpanOf` from `lib/timetableGrid`; `TimetableRule` from `lib/timetableRule`; `WEEKDAYS_SHORT`, `Weekday` from `lib/dates`; `swatchToken` from `lib/categories`.
- Produces: default export `TimetableGrid({ days, hours, today, onPick })`.

Presentational and stateless. `days` is `rulesByWeekday`'s output, `hours` is `gridHours`'s. No test file — a `.tsx` file cannot be asserted in a node environment; it is verified in the browser in Task 15.

- [ ] **Step 1: Write the component**

Create `src/components/timetable/TimetableGrid.tsx`:

```tsx
import { WEEKDAYS_SHORT, type Weekday } from '@/lib/dates';
import { swatchToken } from '@/lib/categories';
import { rowSpanOf } from '@/lib/timetableGrid';
import type { TimetableRule } from '@/lib/timetableRule';

const HEADER_ROWS = 1;

export default function TimetableGrid({
  days,
  hours,
  today,
  onPick,
}: {
  days: TimetableRule[][];
  hours: { from: number; to: number };
  today: Weekday;
  onPick: (rule: TimetableRule) => void;
}) {
  const rowCount = hours.to - hours.from;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[45rem] gap-px"
        style={{
          gridTemplateColumns: '2.75rem repeat(7, minmax(6rem, 1fr))',
          gridTemplateRows: `auto repeat(${rowCount}, 2.75rem)`,
        }}
      >
        <div />
        {WEEKDAYS_SHORT.map((name, index) => (
          <div
            key={name}
            className={`pb-2 text-center text-xs font-semibold ${
              index === today
                ? 'text-[var(--mt-accent-ink)]'
                : 'text-[var(--mt-text)]'
            }`}
          >
            {name}
          </div>
        ))}

        {Array.from({ length: rowCount }, (_, index) => (
          <div
            key={`hour-${index}`}
            className="pr-2 text-right text-[10px] leading-[2.75rem] text-[var(--mt-text-subtle)]"
            style={{ gridColumn: 1, gridRow: index + 1 + HEADER_ROWS }}
          >
            {`${hours.from + index}`.padStart(2, '0')}
          </div>
        ))}

        {days.map((_, dayIndex) =>
          Array.from({ length: rowCount }, (_, index) => (
            <div
              key={`cell-${dayIndex}-${index}`}
              className={`rounded-sm ${
                dayIndex === today
                  ? 'bg-[color-mix(in_srgb,var(--mt-accent)_12%,var(--mt-surface))]'
                  : 'bg-[var(--mt-surface)]'
              }`}
              style={{ gridColumn: dayIndex + 2, gridRow: index + 1 + HEADER_ROWS }}
            />
          )),
        )}

        {days.map((dayRules, dayIndex) =>
          dayRules.map((rule) => {
            const span = rowSpanOf(rule, hours.from);
            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => onPick(rule)}
                className="overflow-hidden rounded-md px-2 py-1 text-left text-[11px] font-semibold leading-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: `${span.startRow + HEADER_ROWS} / ${span.endRow + HEADER_ROWS}`,
                  background: `var(${swatchToken(rule.swatch)})`,
                }}
              >
                {rule.title}
                <span className="block text-[10px] font-normal opacity-80">
                  {rule.startTime}–{rule.endTime}
                </span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
```

Only the grid scrolls sideways, never the page body — that is what the `overflow-x-auto` wrapper around a `min-w` inner grid buys. Rows are `2.75rem` so a one-hour block still meets the 44px touch target.

- [ ] **Step 2: Add the accent-ink token if it does not resolve**

Run: `grep -n "mt-accent-ink" src/app/globals.css`

If there is no match, add it beside the other `--mt-*` accent tokens in both mood blocks, pointing at a deep readable ink rather than the pastel accent: `--mt-accent-ink: var(--mac-cocoa);`. Never inline a hex here.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/timetable/TimetableGrid.tsx src/app/globals.css
git commit -m "feat(timetable): draw the week grid

Full-width columns at every size; the grid scrolls sideways on a phone
rather than squeezing seven columns into 44px of unreadable text."
```

---

## Task 8: The rule editor modal

**Files:**
- Create: `src/components/timetable/RuleModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `components/ui/Modal`; `SWATCHES`, `swatchToken`, `SwatchIndex` from `lib/categories`; `WEEKDAYS`, `Weekday` from `lib/dates`; `validateRule`, `ruleMessage`, `RuleDraft`, `TimetableRule` from `lib/timetableRule`; `UserName` from `lib/identity`.
- Produces: default export `RuleModal({ open, owner, editing, rules, isSaving, error, onClose, onSave, onDelete })`.

- [ ] **Step 1: Write the component**

Create `src/components/timetable/RuleModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { SWATCHES, swatchToken, type SwatchIndex } from '@/lib/categories';
import { WEEKDAYS, type Weekday } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import {
  ruleMessage,
  validateRule,
  type RuleDraft,
  type TimetableRule,
} from '@/lib/timetableRule';

const FIELD =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]';

export default function RuleModal({
  open,
  owner,
  editing,
  rules,
  isSaving,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  owner: UserName;
  editing: TimetableRule | null;
  rules: TimetableRule[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: RuleDraft) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<RuleDraft>(() =>
    editing === null
      ? { weekday: 0, title: '', startTime: '09:00', endTime: '10:00', swatch: 1 }
      : {
          weekday: editing.weekday,
          title: editing.title,
          startTime: editing.startTime,
          endTime: editing.endTime,
          swatch: editing.swatch,
        },
  );
  const [problem, setProblem] = useState<string | null>(null);

  const patch = (next: Partial<RuleDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setProblem(null);
  };

  const submit = () => {
    const found = validateRule(draft, owner, rules, editing?.id ?? null);
    if (found !== null) {
      setProblem(ruleMessage(found, draft.weekday));
      return;
    }
    onSave(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing === null ? 'Add recurring event' : 'Edit recurring event'}
      variant="sheet"
    >
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
          Day
          <select
            value={draft.weekday}
            onChange={(e) => patch({ weekday: Number(e.target.value) as Weekday })}
            className={`mt-1 ${FIELD}`}
          >
            {WEEKDAYS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
            Starts
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => patch({ startTime: e.target.value })}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
            Ends
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => patch({ endTime: e.target.value })}
              className={`mt-1 ${FIELD}`}
            />
          </label>
        </div>

        <label className="text-xs font-semibold text-[var(--mt-text-muted)]">
          Name
          <input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Data Structures"
            className={`mt-1 ${FIELD}`}
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-[var(--mt-text-muted)]">
            Colour
          </legend>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch.index}
                type="button"
                aria-label={`Colour ${swatch.index}`}
                aria-pressed={draft.swatch === swatch.index}
                onClick={() => patch({ swatch: swatch.index as SwatchIndex })}
                className={`h-11 w-11 rounded-xl ${
                  draft.swatch === swatch.index
                    ? 'ring-2 ring-[var(--mt-text)] ring-offset-2 ring-offset-[var(--mt-surface)]'
                    : ''
                }`}
                style={{ background: `var(${swatchToken(swatch.index)})` }}
              />
            ))}
          </div>
        </fieldset>

        {(problem ?? error) !== null && (
          <p className="text-sm text-[var(--mt-danger)]" role="alert">
            {problem ?? error}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          {editing !== null && (
            <button
              type="button"
              onClick={() => onDelete(editing.id)}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--mt-danger)]"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving}
            className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

Validation runs on submit and its message comes from `ruleMessage`, so the sentence that names the clash is the one the test in Task 2 pins.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/timetable/RuleModal.tsx
git commit -m "feat(timetable): add and edit one recurring event

Clashes are refused at submit with the offending class, its time and its
day named, because 'times overlap' is not something you can act on."
```

---

## Task 9: The recurring events list

**Files:**
- Create: `src/components/timetable/RecurringList.tsx`

**Interfaces:**
- Consumes: `Card` from `components/ui/Card`; `swatchToken` from `lib/categories`; `WEEKDAYS_SHORT` from `lib/dates`; `sortRules`, `TimetableRule` from `lib/timetableRule`; `Plus`, `Trash2` from `lucide-react`.
- Produces: default export `RecurringList({ rules, isMine, onAdd, onEdit, onClearAll })`.

- [ ] **Step 1: Write the component**

Create `src/components/timetable/RecurringList.tsx`:

```tsx
import { Plus, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import { swatchToken } from '@/lib/categories';
import { WEEKDAYS_SHORT } from '@/lib/dates';
import { sortRules, type TimetableRule } from '@/lib/timetableRule';

export default function RecurringList({
  rules,
  isMine,
  onAdd,
  onEdit,
  onClearAll,
}: {
  rules: TimetableRule[];
  isMine: boolean;
  onAdd: () => void;
  onEdit: (rule: TimetableRule) => void;
  onClearAll: () => void;
}) {
  return (
    <Card className="mb-4">
      <div className="mb-1 flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--mt-text)]">
          Recurring events
        </h2>
        {isMine && rules.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--mt-danger)] hover:bg-[color-mix(in_srgb,var(--mt-danger)_8%,transparent)]"
          >
            <Trash2 size={16} aria-hidden />
            Clear all
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-[var(--mt-text-muted)]">
        These repeat every week until you delete them.
      </p>

      {rules.length === 0 ? (
        <p className="text-sm text-[var(--mt-text-muted)]">
          No classes yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {sortRules(rules).map((rule) => (
            <li key={rule.id}>
              <button
                type="button"
                disabled={!isMine}
                onClick={() => onEdit(rule)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm text-[var(--mt-text)] enabled:hover:bg-[color-mix(in_srgb,var(--mt-text)_5%,transparent)] disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: `var(${swatchToken(rule.swatch)})` }}
                />
                <span className="w-9 shrink-0 text-xs text-[var(--mt-text-subtle)]">
                  {WEEKDAYS_SHORT[rule.weekday]}
                </span>
                <span className="w-24 shrink-0 text-xs text-[var(--mt-text-subtle)]">
                  {rule.startTime}–{rule.endTime}
                </span>
                <span className="truncate">{rule.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isMine && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--mt-border)] text-sm font-semibold text-[var(--mt-text-muted)]"
        >
          <Plus size={16} aria-hidden />
          Add recurring event
        </button>
      )}
    </Card>
  );
}
```

Rachel's list has no Add button and no Clear at all rather than disabled ones — D29, the same rule her timeline pane already follows.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/timetable/RecurringList.tsx
git commit -m "feat(timetable): list the recurring events under the grid"
```

---

## Task 10: The timetable board, the page and the name

At the end of this task the timetable half works end to end and the timeline half is still the untouched "tomorrow" list. That is a deliberate shippable midpoint — no Supabase change has happened to `timetables` yet.

**Files:**
- Create: `src/components/timetable/TimetableBoard.tsx`
- Modify: `src/app/study/timetable/page.tsx`
- Modify: `src/components/nav/navLinks.ts`
- Modify: `src/components/nav/navLinks.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 5, 7, 8, 9; `useHasMounted` from `hooks/useHasMounted`; `USERS`, `isUserName`, `partnerOf`, `UserName` from `lib/identity`; `todayWeekday` from `lib/dates`; `gridHours`, `rulesByWeekday` from `lib/timetableGrid`.
- Produces: default export `TimetableBoard`.

- [ ] **Step 1: Write the board**

Create `src/components/timetable/TimetableBoard.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { todayWeekday } from '@/lib/dates';
import { isUserName, USERS, type UserName } from '@/lib/identity';
import { gridHours, rulesByWeekday } from '@/lib/timetableGrid';
import {
  deleteRule,
  deleteRulesOf,
  fetchRules,
  insertRule,
  updateRule,
} from '@/lib/timetableRepo';
import type { RuleDraft, TimetableRule } from '@/lib/timetableRule';
import { useHasMounted } from '@/hooks/useHasMounted';
import RecurringList from './RecurringList';
import RuleModal from './RuleModal';
import TimetableGrid from './TimetableGrid';

type Editing = { rule: TimetableRule | null } | null;

export default function TimetableBoard() {
  const mounted = useHasMounted();
  const stored = mounted ? localStorage.getItem('user_name') : null;
  const me = isUserName(stored) ? stored : null;

  const [shown, setShown] = useState<UserName | null>(null);
  const [rules, setRules] = useState<TimetableRule[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const loaded = await fetchRules();
    if (loaded === null) {
      setFailed(true);
      return;
    }
    setRules(loaded);
  }, []);

  useEffect(() => {
    if (me === null) return;
    setShown(me);
    load();
  }, [me, load]);

  if (me === null || shown === null) return null;

  const isMine = shown === me;
  const visible = (rules ?? []).filter((rule) => rule.owner === shown);
  const hours = gridHours(visible);

  const commit = async (run: () => Promise<boolean>) => {
    setIsSaving(true);
    setSaveError(null);
    const ok = await run();
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }
    setEditing(null);
    await load();
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-full border border-[var(--mt-border)]">
          {USERS.map((user) => (
            <button
              key={user}
              type="button"
              onClick={() => setShown(user)}
              aria-pressed={shown === user}
              className={`min-h-11 px-4 text-sm ${
                shown === user
                  ? 'bg-[var(--mt-text)] font-semibold text-[var(--mt-surface)]'
                  : 'text-[var(--mt-text-muted)]'
              }`}
            >
              {user === me ? 'Me' : user}
            </button>
          ))}
        </div>
      </div>

      <Card className="mb-4">
        {failed ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--mt-danger)]" role="alert">
              Couldn&apos;t load the timetable.
            </p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setRules(null);
                load();
              }}
              className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
            >
              Retry
            </button>
          </div>
        ) : rules === null ? (
          <div className="h-40 rounded-xl bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]" aria-busy>
            <span className="sr-only">Loading the timetable</span>
          </div>
        ) : (
          <TimetableGrid
            days={rulesByWeekday(visible)}
            hours={hours}
            today={todayWeekday()}
            onPick={(rule) => isMine && setEditing({ rule })}
          />
        )}
      </Card>

      {rules !== null && !failed && (
        <RecurringList
          rules={visible}
          isMine={isMine}
          onAdd={() => {
            setSaveError(null);
            setEditing({ rule: null });
          }}
          onEdit={(rule) => {
            setSaveError(null);
            setEditing({ rule });
          }}
          onClearAll={() => {
            if (!confirm(`Delete all ${visible.length} recurring events? This cannot be undone.`)) return;
            commit(() => deleteRulesOf(shown));
          }}
        />
      )}

      {editing !== null && (
        <RuleModal
          open
          owner={shown}
          editing={editing.rule}
          rules={rules ?? []}
          isSaving={isSaving}
          error={saveError}
          onClose={() => setEditing(null)}
          onSave={(draft: RuleDraft) =>
            commit(() =>
              editing.rule === null
                ? insertRule(shown, draft)
                : updateRule(editing.rule.id, draft),
            )
          }
          onDelete={(id) => commit(() => deleteRule(id))}
        />
      )}
    </>
  );
}
```

`todayWeekday()` reads the wall clock, so it is behind `useHasMounted` via the `me === null` gate — the board renders nothing until mounted, which keeps SSR and the first client render identical.

- [ ] **Step 2: Assemble the page**

Replace `src/app/study/timetable/page.tsx` with:

```tsx
import PageShell from '@/components/ui/PageShell';
import TimetableBoard from '@/components/timetable/TimetableBoard';
import TimelineBoard from '@/components/timeline/TimelineBoard';

export default function TimetablePage() {
  return (
    <PageShell
      title="Timetable"
      subtitle="Your week, and what you're actually doing"
      accent="timetable"
    >
      <TimetableBoard />
      <TimelineBoard />
    </PageShell>
  );
}
```

- [ ] **Step 3: Settle the name in the menu**

In `src/components/nav/navLinks.ts`, change the `STUDY_PANEL` entry for `/study/timetable` from `label: 'Timeline'` to `label: 'Timetable'`. Leave the icon and accent alone.

Run: `grep -rn "'Timeline'" src/`
Expected: no output. If `navLinks.test.ts` asserts the old label, update that assertion in the same commit.

- [ ] **Step 4: Test, typecheck and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/timetable/TimetableBoard.tsx src/app/study/timetable/page.tsx src/components/nav/navLinks.ts src/components/nav/navLinks.test.ts
git commit -m "feat(timetable): show the week grid and its recurring events

The menu called this page Timeline while the page called itself Timetable.
Now that it holds a real timetable, both say Timetable."
```

---

## Task 11: The weekday-keyed timeline shape

Pure mapping, extracted so it can be tested — the fetch that uses it cannot be.

**Files:**
- Create: `src/lib/timelineWeek.ts`
- Test: `src/lib/timelineWeek.test.ts`

**Interfaces:**
- Consumes: `Weekday` from `lib/dates`; `UserName`, `USERS` from `lib/identity`; `TimelineEntry` from `lib/timeline`.
- Produces: `type Week`, `type WeekByUser`, `interface TimelineRow`, `emptyWeeks(): WeekByUser`, `weeksFromRows(rows): WeekByUser`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/timelineWeek.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { emptyWeeks, weeksFromRows, type TimelineRow } from './timelineWeek';

const LUNCH = { time: '12-1', activity: 'Lunch' };
const HACK = { time: '3-8', activity: 'Muba hack discussion' };

describe('emptyWeeks', () => {
  it('gives both people all seven days', () => {
    const weeks = emptyWeeks();
    expect(Object.keys(weeks.Jeff)).toHaveLength(7);
    expect(Object.keys(weeks.Rachel)).toHaveLength(7);
  });

  it('gives every day an empty list, not undefined', () => {
    expect(emptyWeeks().Jeff[4]).toEqual([]);
  });
});

describe('weeksFromRows', () => {
  it('files a row under its owner and weekday', () => {
    const rows: TimelineRow[] = [
      { user_name: 'Jeff', weekday: 3, entries: [LUNCH] },
    ];
    expect(weeksFromRows(rows).Jeff[3]).toEqual([LUNCH]);
  });

  it('leaves the days a row does not cover empty', () => {
    const rows: TimelineRow[] = [
      { user_name: 'Jeff', weekday: 3, entries: [LUNCH] },
    ];
    expect(weeksFromRows(rows).Jeff[0]).toEqual([]);
  });

  it('keeps the two people apart', () => {
    const rows: TimelineRow[] = [
      { user_name: 'Jeff', weekday: 0, entries: [LUNCH] },
      { user_name: 'Rachel', weekday: 0, entries: [HACK] },
    ];
    const weeks = weeksFromRows(rows);
    expect(weeks.Jeff[0]).toEqual([LUNCH]);
    expect(weeks.Rachel[0]).toEqual([HACK]);
  });

  it('preserves free-text times exactly as typed', () => {
    const rows: TimelineRow[] = [
      {
        user_name: 'Jeff',
        weekday: 2,
        entries: [{ time: '10-letih', activity: 'Finish AI coder' }],
      },
    ];
    expect(weeksFromRows(rows).Jeff[2][0].time).toBe('10-letih');
  });

  it('returns empty weeks for no rows at all', () => {
    expect(weeksFromRows([])).toEqual(emptyWeeks());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/timelineWeek.test.ts`
Expected: FAIL — cannot resolve `./timelineWeek`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/timelineWeek.ts`:

```ts
import type { Weekday } from './dates';
import { USERS, type UserName } from './identity';
import type { TimelineEntry } from './timeline';

export type Week = Record<Weekday, TimelineEntry[]>;
export type WeekByUser = Record<UserName, Week>;

export interface TimelineRow {
  user_name: UserName;
  weekday: Weekday;
  entries: TimelineEntry[];
}

const WEEKDAY_KEYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

function emptyWeek(): Week {
  return Object.fromEntries(WEEKDAY_KEYS.map((day) => [day, []])) as Week;
}

export function emptyWeeks(): WeekByUser {
  return Object.fromEntries(
    USERS.map((user) => [user, emptyWeek()]),
  ) as WeekByUser;
}

export function weeksFromRows(rows: TimelineRow[]): WeekByUser {
  const weeks = emptyWeeks();
  for (const row of rows) weeks[row.user_name][row.weekday] = row.entries;
  return weeks;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/timelineWeek.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timelineWeek.ts src/lib/timelineWeek.test.ts
git commit -m "feat(timeline): key the itinerary by weekday for both people

Every day is an empty list rather than undefined, so a day nobody has
written to renders as empty instead of crashing the pane."
```

---

## Task 12: Supabase Part 2 and the timeline switchover

This task changes the table the page saves to. It replaces two documents with fourteen, and the SQL and the code must land together — the existing upsert uses `onConflict: 'user_name'`, which stops working the moment the key becomes composite.

**Files:**
- Modify: `src/components/timeline/TimelineBoard.tsx`
- Modify: `src/lib/supabase.ts` (schema comment)

**Interfaces:**
- Consumes: `emptyWeeks`, `weeksFromRows`, `WeekByUser`, `TimelineRow` from `lib/timelineWeek`; `todayWeekday`, `Weekday` from `lib/dates`.
- Produces: `TimelineBoard` now holding a `selected: Weekday` state, defaulting to `todayWeekday()`.

- [ ] **Step 1: Ask Jeff to run Supabase Part 2**

Send him `docs/superpowers/specs/2026-09-03-timetable-setup.sql` and ask him to run **Part 2** — everything from `drop table if exists timetables` onward.

Warn him first, in these words: *this deletes both current lists — Lunch, Finish AI coder, Muba hack discussion, Ym. Copy the text somewhere first if you want it.*

Wait for confirmation before Step 2. Between the drop and the deploy of this task's code, the page cannot save.

- [ ] **Step 2: Rewrite the board's data layer**

In `src/components/timeline/TimelineBoard.tsx`:

Replace the local `TimetableRow` interface and `Entries` type with imports:

```tsx
import { todayWeekday, type Weekday } from '@/lib/dates';
import {
  emptyWeeks,
  weeksFromRows,
  type TimelineRow,
  type WeekByUser,
} from '@/lib/timelineWeek';
```

Change the entries state to hold a week per user, and add the selected day:

```tsx
const [weeks, setWeeks] = useState<WeekByUser | null>(null);
const [selected, setSelected] = useState<Weekday>(() => todayWeekday());
```

Replace the body of `load` with:

```tsx
const { data, error } = await supabase
  .from('timetables')
  .select('user_name, weekday, entries')
  .in('user_name', [...USERS]);

if (error) {
  console.error('Failed to load timelines:', error);
  setFailed(true);
  return;
}

setWeeks(weeksFromRows((data ?? []) as TimelineRow[]));
```

Change `stateFor` to read the selected day:

```tsx
const stateFor = (user: UserName): PaneState => {
  if (failed) return { status: 'error' };
  if (weeks === null) return { status: 'loading' };
  return { status: 'ready', entries: weeks[user][selected] };
};
```

Change `handleSave` to upsert on the composite key and patch the right day:

```tsx
const { error } = await supabase.from('timetables').upsert(
  {
    user_name: me,
    weekday: selected,
    entries: saved,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'user_name,weekday' },
);

setIsSaving(false);

if (error) {
  console.error('Failed to save timeline:', error);
  setSaveError('Could not save. Check your connection and try again.');
  return;
}

setWeeks((current) => ({
  ...current!,
  [me]: { ...current![me], [selected]: saved },
}));
setEditing(false);
```

In `retry`, replace `setEntries(null)` with `setWeeks(null)`.

- [ ] **Step 3: Update the schema comment**

In `src/lib/supabase.ts`, replace the `timetables` DDL in the comment block with the composite-key version from the spec, keeping the four policies.

- [ ] **Step 4: Test, typecheck and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/timeline/TimelineBoard.tsx src/lib/supabase.ts
git commit -m "feat(timeline): key the itinerary by weekday instead of tomorrow

The table now holds one document per person per weekday, so the upsert
conflicts on (user_name, weekday). Requires Part 2 of the setup SQL."
```

---

## Task 13: The day tabs

**Files:**
- Create: `src/components/timeline/DayTabs.tsx`
- Modify: `src/components/timeline/TimelineBoard.tsx`

**Interfaces:**
- Consumes: `WEEKDAYS`, `WEEKDAYS_SHORT`, `Weekday` from `lib/dates`.
- Produces: default export `DayTabs({ selected, today, onSelect })`.

No item counts on the tabs — offered during design and refused.

- [ ] **Step 1: Write the component**

Create `src/components/timeline/DayTabs.tsx`:

```tsx
import { WEEKDAYS, WEEKDAYS_SHORT, type Weekday } from '@/lib/dates';

const DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export default function DayTabs({
  selected,
  today,
  onSelect,
}: {
  selected: Weekday;
  today: Weekday;
  onSelect: (day: Weekday) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-7 gap-1.5" role="tablist">
      {DAYS.map((day) => (
        <button
          key={day}
          type="button"
          role="tab"
          aria-selected={selected === day}
          aria-label={day === today ? `${WEEKDAYS[day]}, today` : WEEKDAYS[day]}
          onClick={() => onSelect(day)}
          className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors ${
            selected === day
              ? 'border-[var(--mt-text)] bg-[var(--mt-text)] text-[var(--mt-surface)]'
              : day === today
                ? 'border-[var(--mt-accent)] bg-[color-mix(in_srgb,var(--mt-accent)_16%,var(--mt-surface))] text-[var(--mt-text)]'
                : 'border-[var(--mt-border)] bg-[var(--mt-surface)] text-[var(--mt-text-muted)]'
          }`}
        >
          {WEEKDAYS_SHORT[day]}
        </button>
      ))}
    </div>
  );
}
```

Selected and today are two different marks on purpose: dark fill for the day you are looking at, accent tint for today, so planning Thursday does not lose track of where you are.

- [ ] **Step 2: Wire it into the board**

In `TimelineBoard.tsx`, import it and render it immediately above the two panes, inside the existing wrapper `div`:

```tsx
<DayTabs selected={selected} today={todayWeekday()} onSelect={(day) => {
  setSelected(day);
  setEditing(false);
  setSaveError(null);
}} />
```

Closing the editor on a day change is deliberate: leaving it open would show Monday's typed rows above a Thursday heading, and the next Save would write them to the wrong day.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/timeline/DayTabs.tsx src/components/timeline/TimelineBoard.tsx
git commit -m "feat(timeline): pick the day with seven tabs

Switching day closes an open editor: leaving it open would show one day's
typed rows under another day's heading and save them to the wrong one."
```

---

## Task 14: Clear this day or the whole week

**Files:**
- Create: `src/components/timeline/ClearDialog.tsx`
- Modify: `src/components/timeline/TimelineBoard.tsx`

**Interfaces:**
- Consumes: `Modal` from `components/ui/Modal`; `WEEKDAYS`, `Weekday` from `lib/dates`.
- Produces: default export `ClearDialog({ open, weekday, isClearing, onClose, onClearDay, onClearWeek })`.

One button; pressing it asks which. Two similarly-worded buttons sitting next to each other at rest is what this avoids.

- [ ] **Step 1: Write the dialog**

Create `src/components/timeline/ClearDialog.tsx`:

```tsx
'use client';

import Modal from '@/components/ui/Modal';
import { WEEKDAYS, type Weekday } from '@/lib/dates';

export default function ClearDialog({
  open,
  weekday,
  isClearing,
  onClose,
  onClearDay,
  onClearWeek,
}: {
  open: boolean;
  weekday: Weekday;
  isClearing: boolean;
  onClose: () => void;
  onClearDay: () => void;
  onClearWeek: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Clear what?" variant="sheet">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={isClearing}
          onClick={onClearDay}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 py-3 text-left text-sm font-semibold text-[var(--mt-text)] disabled:opacity-50"
        >
          Just {WEEKDAYS[weekday]}
          <span className="mt-1 block text-xs font-normal text-[var(--mt-text-muted)]">
            Empties this one day. The other six are untouched.
          </span>
        </button>

        <button
          type="button"
          disabled={isClearing}
          onClick={onClearWeek}
          className="min-h-11 rounded-xl border border-[var(--mt-danger)] px-4 py-3 text-left text-sm font-semibold text-[var(--mt-danger)] disabled:opacity-50"
        >
          The whole week
          <span className="mt-1 block text-xs font-normal text-[var(--mt-text-muted)]">
            Empties all seven days. Your recurring events are not touched.
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--mt-text-muted)]"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Wire it into the board**

In `TimelineBoard.tsx` add `const [clearing, setClearing] = useState(false);` and a Clear button beside the day tabs:

```tsx
<button
  type="button"
  onClick={() => setClearing(true)}
  className="min-h-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text-muted)]"
>
  Clear
</button>
```

Add the two handlers, writing empty entry arrays rather than deleting rows so the shape stays uniform:

```tsx
const clearDays = async (days: Weekday[]) => {
  setIsSaving(true);
  const { error } = await supabase.from('timetables').upsert(
    days.map((day) => ({
      user_name: me,
      weekday: day,
      entries: [],
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_name,weekday' },
  );
  setIsSaving(false);

  if (error) {
    console.error('Failed to clear timeline:', error);
    setSaveError('Could not clear. Check your connection and try again.');
    return;
  }

  setClearing(false);
  setEditing(false);
  await load();
};
```

Render the dialog with `onClearDay={() => clearDays([selected])}` and `onClearWeek={() => clearDays([0, 1, 2, 3, 4, 5, 6])}`.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/timeline/ClearDialog.tsx src/components/timeline/TimelineBoard.tsx
git commit -m "feat(timeline): clear one day or the whole week behind one button

Clearing writes empty arrays rather than deleting rows, so every day keeps
a document and the pane never has to tell missing from empty."
```

---

## Task 15: Browser verification

Nothing in Tasks 7–14 has a unit test, because none of it can have one in a node environment. This is where it gets checked. Do not skip it and do not report the feature working without it.

**Files:** none.

- [ ] **Step 1: Start the preview**

Use the preview tooling, never a raw shell command. If `.claude/launch.json` has no entry, create one with `"name": "masa-tomato"`, `"runtimeExecutable": "npm"`, `"runtimeArgs": ["run", "dev"]`, `"port": 3000`. Then navigate to `/study/timetable`.

If `tsc` reports paths that no longer exist, delete `.next/` and restart.

- [ ] **Step 2: Walk the timetable**

- Add a recurring event; confirm it lands in the right column and spans the right hours.
- Add a second one that overlaps it; confirm the save is refused and the message names the first class, its time and its day.
- Add one that touches it exactly (`11:00–12:00` after `09:00–11:00`); confirm it saves.
- Tap a block; confirm the edit modal opens with its values.
- Delete it from the modal; confirm it leaves the grid and the list.
- Switch to Rachel; confirm no Add button, no Clear all, and tapping a block does nothing.

- [ ] **Step 3: Walk the timeline**

- Tap through all seven tabs; confirm today keeps its accent tint while another day is selected.
- Edit a day, type a free-text time (`10-letih`), save, switch away and back; confirm it persisted to that day only.
- Open the editor, switch day mid-edit; confirm the editor closes.
- Press Clear, choose just this day; confirm only that day empties.
- Confirm Rachel's pane shows her rows for the selected day and has no Edit button.

- [ ] **Step 4: Check the widths**

Use `resize_window` at mobile (375), tablet (768) and desktop.

- At 375: the grid scrolls sideways inside its own box and **the page body does not scroll sideways**. Blocks are readable.
- At 768 and above: all seven columns fit without scrolling.
- Confirm the day tabs meet 44px at 375.

- [ ] **Step 5: Read the console and the network**

Run `read_console_messages` and `read_network_requests`. Expected: no errors, no failed Supabase calls.

- [ ] **Step 6: Screenshot and record**

Take a screenshot at desktop and at 375. Write what was checked and what was seen to `docs/superpowers/verification/2026-09-03-timetable-recurring.md`, following the pattern of the existing calendar verification notes.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/verification/2026-09-03-timetable-recurring.md
git commit -m "docs: record the timetable and timeline browser verification"
```

---

## Self-Review

**Spec coverage** — every section checked against a task:

| Spec | Task |
|---|---|
| D79 two halves, no sync | Structural: no module imports across the two halves. Enforced by the Task 6 rename. |
| D80 grid is a view | 7, 10 |
| D81 rule shape | 2, 5 |
| D82 no cross-out | Absent by construction — no `off`/`alt` columns anywhere. |
| D83 swatch not category | 2, 5, 8 |
| D84 overlaps refused | 2 (logic + tests), 8 (message), 15 (browser) |
| D85 full-width columns, phone scrolls | 7, 15 |
| D86 owner toggle, Rachel read-only | 9, 10 |
| D87 recurring editor below grid, Clear all | 9, 10 |
| D88 free text kept | 11 (test pins `10-letih`), 12 |
| D89 seven tabs, no dates | 13 |
| D90 two marks, no counts | 13 |
| D91 both panes per day | 12 |
| D92 one Clear, asks which | 14 |
| D93 table dropped and recreated | 12 |
| D94 both names Timetable | 10 |
| D95 module split | 6 |
| D96 no midnight crossing | 2 (`endTime <= startTime` rejected), SQL check constraint |
| §3 `dates.ts` additions | 1 |
| §6 contrast pin | 4 |

**Placeholder scan:** none. Every code step carries the code; no "similar to Task N"; no "add validation" without the validator.

**Type consistency:** `TimetableRule`, `RuleDraft`, `RuleError` defined in Task 2 and used unchanged in 3, 5, 7, 8, 9, 10. `Weekday` defined in Task 1, used in 2, 3, 5, 7, 8, 11, 12, 13, 14. `TimelineEntry` renamed in Task 6, consumed in 11. `gridHours`/`rulesByWeekday`/`rowSpanOf` defined in Task 3, consumed in 7 and 10 with matching shapes. `emptyWeeks`/`weeksFromRows` defined in Task 11, consumed in 12. `PaneState` is unchanged from the existing `TimelinePane` and still takes `entries`, which is why Task 12 only changes where those entries come from.

**One thing deliberately left to the implementer:** whether `--mt-accent-ink` already exists (Task 7 Step 2). It is a grep, not a guess.
