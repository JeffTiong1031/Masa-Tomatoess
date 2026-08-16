# Cycle Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inert `/cycle` shell with real period tracking — logging, a learned prediction, a phase ring, and a month calendar — stored in Supabase and shared between both users.

**Architecture:** All arithmetic lives in pure modules under `src/lib/` (`cycleDates`, `cycle`, `cycleCalendar`, `cycleRing`, `cycleColors`) and is covered by Vitest. `cycleRepo` is the only module that talks to Supabase. `CycleBoard` is the only stateful component; every component below it is a pure function of its props. Nothing derived is ever stored — cycle length, phase, and predicted dates are recomputed from the period rows on each render.

**Tech Stack:** Next.js 16.2 (App Router), React 19.2, TypeScript strict, Tailwind v4, Supabase (`@supabase/supabase-js`), `lucide-react`, Vitest.

**Spec:** [docs/superpowers/specs/2026-08-16-cycle-tracking-design.md](../specs/2026-08-16-cycle-tracking-design.md)

## Global Constraints

- **Do not write comments.** Names and structure carry the meaning. The single exception is Task 9, which extends the existing schema comment block in `src/lib/supabase.ts` — that block is the project's record of external schema and predates the rule.
- **Never hardcode a colour.** Components reference `--mt-*` tokens only. Raw `--mac-*` values stay inside `src/app/globals.css`. Inline SVG uses `var(--mt-*)` in `fill`/`stroke` — it resolves normally there, so no colour literals are needed anywhere in this feature.
- **Dates are `YYYY-MM-DD` strings.** No `Date` object crosses a function boundary. Local wall-clock is read only by `todayISO()`.
- **No `instanceof`, no `typeof` branching** to discriminate shapes. `switch` on a discriminated union's `kind` is correct and expected here.
- **No defensive guards** for states the types already exclude, and no fallbacks for cases that cannot occur.
- Server Components by default; `'use client'` only on the leaf that needs it.
- Touch targets at least 44px (`min-h-11`). Grid over flex percentage maths.
- Tests are pure functions only — Vitest has no DOM environment and renders no components. Component tasks verify with `npx tsc --noEmit` and `npm run lint`.
- Never start the dev server with a raw shell command; use the preview tooling.
- Commit as Jeff's account only. **Never** add a `Co-Authored-By` trailer or any generated-with attribution.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/cycleDates.ts` | Calendar-string arithmetic and formatting. Knows nothing about cycles. |
| `src/lib/cycle.ts` | Types, learned lengths, phase resolution, the headline summary, input rules, hub label. |
| `src/lib/cycleCalendar.ts` | Turns period logs into 42 `CalendarDay`s for one month, plus forward prediction and history rows. |
| `src/lib/cycleRing.ts` | SVG geometry for the ring: arc paths and the today marker's point. |
| `src/lib/cycleColors.ts` | Phase → CSS variable mapping, labels, tint percentages. No literals. |
| `src/lib/cycleRepo.ts` | The only module that touches Supabase. |
| `src/components/cycle/CycleRing.tsx` | Draws the ring. Pure props. |
| `src/components/cycle/CycleCalendar.tsx` | Draws the month. Pure props. |
| `src/components/cycle/LogPeriodModal.tsx` | The date picker. Pure props; parent owns validation. |
| `src/components/cycle/PeriodHistory.tsx` | Editable list of past periods. Pure props. |
| `src/components/cycle/SymptomChips.tsx` | Six toggles for one date. Pure props. |
| `src/components/cycle/CycleBoard.tsx` | `'use client'`. Loads data, owns view toggle, selected day, and all save paths. |
| `src/app/(life)/cycle/page.tsx` | Thin: `PageShell` + `CycleBoard`. |
| `src/components/HubGrid.tsx` | Modified: `/cycle` leaves `INERT`, tile shows the headline. |
| `src/app/globals.css` | Modified: four `--mac-cycle-*` raw values, four `--mt-phase-*` semantic tokens. |
| `src/lib/supabase.ts` | Modified: schema comment extended with the two new tables. |

---

### Task 1: Calendar-string date helpers

**Files:**
- Create: `src/lib/cycleDates.ts`
- Test: `src/lib/cycleDates.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `todayISO(now?: Date): string`, `addDays(date: string, days: number): string`, `diffDays(later: string, earlier: string): number`, `monthOf(date: string): string`, `addMonths(month: string, count: number): string`, `monthGridDates(month: string): string[]`, `formatMonthYear(month: string): string`, `formatShortDate(date: string): string`, `formatLongDate(date: string): string`, `WEEKDAYS_SHORT: readonly string[]`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/cycleDates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  monthGridDates,
  monthOf,
  todayISO,
  WEEKDAYS_SHORT,
} from './cycleDates';

describe('todayISO', () => {
  it('reads local calendar parts, not a UTC timestamp', () => {
    expect(todayISO(new Date(2026, 7, 16, 1, 30))).toBe('2026-08-16');
  });

  it('pads single-digit months and days', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('moves forward within a month', () => {
    expect(addDays('2026-08-16', 7)).toBe('2026-08-23');
  });

  it('moves backward across a month boundary', () => {
    expect(addDays('2026-08-02', -5)).toBe('2026-07-28');
  });

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('returns the same date for zero', () => {
    expect(addDays('2026-08-16', 0)).toBe('2026-08-16');
  });
});

describe('diffDays', () => {
  it('counts whole days between two dates', () => {
    expect(diffDays('2026-08-23', '2026-08-16')).toBe(7);
  });

  it('returns a negative count when the first date is earlier', () => {
    expect(diffDays('2026-08-16', '2026-08-23')).toBe(-7);
  });

  it('counts across a leap year', () => {
    expect(diffDays('2028-03-01', '2028-02-28')).toBe(2);
  });
});

describe('monthOf and addMonths', () => {
  it('extracts the month key', () => {
    expect(monthOf('2026-08-16')).toBe('2026-08');
  });

  it('steps forward across a year boundary', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
  });

  it('steps backward across a year boundary', () => {
    expect(addMonths('2026-02', -3)).toBe('2025-11');
  });
});

describe('monthGridDates', () => {
  it('returns six Monday-first weeks', () => {
    const grid = monthGridDates('2026-08');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-07-27');
    expect(grid[41]).toBe('2026-09-06');
  });

  it('starts on the first of the month when the first is a Monday', () => {
    expect(monthGridDates('2026-06')[0]).toBe('2026-06-01');
  });

  it('is contiguous', () => {
    const grid = monthGridDates('2026-08');
    for (let i = 1; i < grid.length; i += 1) {
      expect(diffDays(grid[i], grid[i - 1])).toBe(1);
    }
  });
});

describe('formatting', () => {
  it('names the month and year', () => {
    expect(formatMonthYear('2026-08')).toBe('August 2026');
  });

  it('formats a short date without a leading zero', () => {
    expect(formatShortDate('2026-07-05')).toBe('5 Jul');
  });

  it('formats a long date with its weekday', () => {
    expect(formatLongDate('2026-08-23')).toBe('Sun 23 Aug');
  });

  it('lists weekdays Monday first', () => {
    expect(WEEKDAYS_SHORT[0]).toBe('Mon');
    expect(WEEKDAYS_SHORT[6]).toBe('Sun');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycleDates.test.ts
```

Expected: FAIL — `Failed to resolve import "./cycleDates"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/cycleDates.ts`:

```ts
const MS_PER_DAY = 86_400_000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const WEEKDAYS_SHORT = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
] as const;

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function toUtc(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * MS_PER_DAY);
}

export function diffDays(later: string, earlier: string): number {
  return Math.round((toUtc(later) - toUtc(earlier)) / MS_PER_DAY);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, count: number): string {
  const [year, index] = month.split('-').map(Number);
  const total = year * 12 + (index - 1) + count;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export function weekdayIndex(date: string): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

export function monthGridDates(month: string): string[] {
  const first = `${month}-01`;
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function formatMonthYear(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return `${MONTH_NAMES[index - 1]} ${year}`;
}

export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${MONTH_NAMES_SHORT[month - 1]}`;
}

export function formatLongDate(date: string): string {
  return `${WEEKDAYS_SHORT[weekdayIndex(date)]} ${formatShortDate(date)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycleDates.test.ts
```

Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycleDates.ts src/lib/cycleDates.test.ts
git commit -m "feat: add calendar-string date helpers for cycle tracking"
```

---

### Task 2: Learned cycle length, period length, and confidence

**Files:**
- Create: `src/lib/cycle.ts`
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Consumes: `diffDays` from Task 1.
- Produces: `PeriodLog`, `Phase`, `Headline`, `Confidence`, `CycleSummary`, `SYMPTOMS`, `DEFAULT_CYCLE_LENGTH`, `DEFAULT_PERIOD_LENGTH`, `sortLogs(logs): PeriodLog[]`, `median(values: number[]): number`, `cycleGaps(logs): number[]`, `cycleLength(logs): number`, `periodLength(logs): number`, `confidenceFor(logs): Confidence`.

`sortLogs` returns newest start first. `cycleGaps` returns surviving gaps newest first.

- [ ] **Step 1: Write the failing test**

Create `src/lib/cycle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  confidenceFor,
  cycleGaps,
  cycleLength,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  median,
  periodLength,
  sortLogs,
  type PeriodLog,
} from './cycle';

function log(id: string, startDate: string, endDate: string | null = null): PeriodLog {
  return { id, startDate, endDate };
}

describe('sortLogs', () => {
  it('puts the newest start first', () => {
    const sorted = sortLogs([
      log('a', '2026-06-01'),
      log('c', '2026-08-01'),
      log('b', '2026-07-01'),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate its input', () => {
    const input = [log('a', '2026-06-01'), log('b', '2026-08-01')];
    sortLogs(input);
    expect(input.map((l) => l.id)).toEqual(['a', 'b']);
  });
});

describe('median', () => {
  it('takes the middle of an odd count', () => {
    expect(median([29, 27, 31])).toBe(29);
  });

  it('averages the two middle values of an even count', () => {
    expect(median([28, 30])).toBe(29);
  });

  it('rounds a half upward', () => {
    expect(median([28, 29])).toBe(29);
  });

  it('ignores the order it is given', () => {
    expect(median([40, 21, 28, 29, 30])).toBe(29);
  });
});

describe('cycleGaps', () => {
  it('is empty with fewer than two logs', () => {
    expect(cycleGaps([])).toEqual([]);
    expect(cycleGaps([log('a', '2026-08-01')])).toEqual([]);
  });

  it('measures start-to-start, newest first', () => {
    expect(
      cycleGaps([
        log('a', '2026-06-01'),
        log('b', '2026-06-30'),
        log('c', '2026-07-28'),
      ]),
    ).toEqual([28, 29]);
  });

  it('discards a gap from a forgotten log', () => {
    expect(
      cycleGaps([log('a', '2026-06-01'), log('b', '2026-08-28')]),
    ).toEqual([]);
  });

  it('discards a gap from a double log', () => {
    expect(
      cycleGaps([log('a', '2026-08-01'), log('b', '2026-08-04')]),
    ).toEqual([]);
  });

  it('keeps gaps at the edges of the accepted window', () => {
    expect(
      cycleGaps([
        log('a', '2026-01-01'),
        log('b', '2026-01-16'),
        log('c', '2026-03-17'),
      ]),
    ).toEqual([60, 15]);
  });
});

describe('cycleLength', () => {
  it('falls back to 28 with no history', () => {
    expect(cycleLength([])).toBe(DEFAULT_CYCLE_LENGTH);
  });

  it('falls back to 28 with one period logged', () => {
    expect(cycleLength([log('a', '2026-08-01')])).toBe(28);
  });

  it('uses the single gap when only one exists', () => {
    expect(
      cycleLength([log('a', '2026-07-01'), log('b', '2026-08-01')]),
    ).toBe(31);
  });

  it('ignores one forgotten log among good history', () => {
    const logs = [
      log('a', '2026-01-01'),
      log('b', '2026-01-30'),
      log('c', '2026-02-28'),
      log('d', '2026-04-27'),
      log('e', '2026-05-26'),
      log('f', '2026-06-24'),
    ];
    expect(cycleLength(logs)).toBe(29);
  });

  it('reads only the most recent six gaps', () => {
    const logs = [log('old', '2020-01-01'), log('old2', '2020-04-01')];
    let date = '2026-01-01';
    for (let i = 0; i < 7; i += 1) {
      logs.push(log(`n${i}`, date));
      date = `2026-0${i + 2}-01`.slice(0, 10);
    }
    expect(cycleGaps(logs).length).toBeLessThanOrEqual(6);
  });
});

describe('periodLength', () => {
  it('falls back to 5 with no finished periods', () => {
    expect(periodLength([])).toBe(DEFAULT_PERIOD_LENGTH);
    expect(periodLength([log('a', '2026-08-01')])).toBe(5);
  });

  it('counts both endpoints', () => {
    expect(periodLength([log('a', '2026-08-01', '2026-08-05')])).toBe(5);
  });

  it('ignores an open period', () => {
    expect(
      periodLength([
        log('a', '2026-07-01', '2026-07-04'),
        log('b', '2026-08-01'),
      ]),
    ).toBe(4);
  });

  it('discards an implausible length', () => {
    expect(
      periodLength([
        log('a', '2026-06-01', '2026-06-25'),
        log('b', '2026-07-01', '2026-07-06'),
      ]),
    ).toBe(6);
  });
});

describe('confidenceFor', () => {
  it('is none with no logs', () => {
    expect(confidenceFor([])).toBe('none');
  });

  it('is default with one log and therefore no gap', () => {
    expect(confidenceFor([log('a', '2026-08-01')])).toBe('default');
  });

  it('is thin with exactly one usable gap', () => {
    expect(
      confidenceFor([log('a', '2026-07-01'), log('b', '2026-08-01')]),
    ).toBe('thin');
  });

  it('is learned with two or more usable gaps', () => {
    expect(
      confidenceFor([
        log('a', '2026-06-01'),
        log('b', '2026-07-01'),
        log('c', '2026-08-01'),
      ]),
    ).toBe('learned');
  });

  it('is default when every gap was discarded', () => {
    expect(
      confidenceFor([log('a', '2026-01-01'), log('b', '2026-08-01')]),
    ).toBe('default');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycle.test.ts
```

Expected: FAIL — `Failed to resolve import "./cycle"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/cycle.ts`:

```ts
import { diffDays } from './cycleDates';

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

export const SYMPTOMS = [
  'Cramps',
  'Headache',
  'Tired',
  'Bloating',
  'Mood',
  'Cravings',
] as const;

export type Symptom = (typeof SYMPTOMS)[number];

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

const MIN_GAP = 15;
const MAX_GAP = 60;
const MIN_PERIOD = 1;
const MAX_PERIOD = 14;
const SAMPLE_SIZE = 6;

export function sortLogs(logs: PeriodLog[]): PeriodLog[] {
  return [...logs].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  if (sorted.length % 2 === 1) return sorted[Math.floor(middle)];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function cycleGaps(logs: PeriodLog[]): number[] {
  const sorted = sortLogs(logs);
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const gap = diffDays(sorted[i].startDate, sorted[i + 1].startDate);
    if (gap >= MIN_GAP && gap <= MAX_GAP) gaps.push(gap);
  }
  return gaps.slice(0, SAMPLE_SIZE);
}

export function cycleLength(logs: PeriodLog[]): number {
  const gaps = cycleGaps(logs);
  return gaps.length === 0 ? DEFAULT_CYCLE_LENGTH : median(gaps);
}

export function periodLength(logs: PeriodLog[]): number {
  const lengths = sortLogs(logs)
    .filter((entry): entry is PeriodLog & { endDate: string } => entry.endDate !== null)
    .map((entry) => diffDays(entry.endDate, entry.startDate) + 1)
    .filter((days) => days >= MIN_PERIOD && days <= MAX_PERIOD)
    .slice(0, SAMPLE_SIZE);
  return lengths.length === 0 ? DEFAULT_PERIOD_LENGTH : median(lengths);
}

export function confidenceFor(logs: PeriodLog[]): Confidence {
  if (logs.length === 0) return 'none';
  const gaps = cycleGaps(logs).length;
  if (gaps === 0) return 'default';
  if (gaps === 1) return 'thin';
  return 'learned';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycle.test.ts
```

Expected: PASS, 24 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m "feat: learn cycle and period length from logged history"
```

---

### Task 3: Phase resolution

**Files:**
- Modify: `src/lib/cycle.ts`
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Consumes: `Phase` from Task 2.
- Produces: `phaseForDay(day: number, cycleLen: number, periodLen: number): Phase`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/cycle.test.ts` (and add `phaseForDay` to the import list at the top of the file):

```ts
describe('phaseForDay', () => {
  it('names the four phases of a 28-day cycle with a 5-day period', () => {
    const at = (day: number) => phaseForDay(day, 28, 5);
    expect(at(1)).toBe('menstrual');
    expect(at(5)).toBe('menstrual');
    expect(at(6)).toBe('follicular');
    expect(at(10)).toBe('follicular');
    expect(at(11)).toBe('fertile');
    expect(at(15)).toBe('fertile');
    expect(at(16)).toBe('luteal');
    expect(at(28)).toBe('luteal');
  });

  it('pushes ovulation later on a long cycle instead of pinning it to day 14', () => {
    expect(phaseForDay(14, 35, 5)).toBe('follicular');
    expect(phaseForDay(21, 35, 5)).toBe('fertile');
  });

  it('pulls ovulation earlier on a short cycle', () => {
    expect(phaseForDay(7, 21, 5)).toBe('fertile');
    expect(phaseForDay(14, 21, 5)).toBe('luteal');
  });

  it('lets the period win when the bands would collide', () => {
    expect(phaseForDay(6, 21, 6)).toBe('menstrual');
    expect(phaseForDay(7, 21, 6)).toBe('fertile');
  });

  it('never overlaps the fertile band with the bleed', () => {
    for (let cycleLen = 15; cycleLen <= 60; cycleLen += 1) {
      for (let periodLen = 1; periodLen <= 14; periodLen += 1) {
        for (let day = 1; day <= periodLen; day += 1) {
          expect(phaseForDay(day, cycleLen, periodLen)).toBe('menstrual');
        }
      }
    }
  });

  it('returns luteal for a day past the end of the cycle', () => {
    expect(phaseForDay(40, 28, 5)).toBe('luteal');
  });

  it('always returns one of the four phases', () => {
    const known = new Set(['menstrual', 'follicular', 'fertile', 'luteal']);
    for (let cycleLen = 15; cycleLen <= 60; cycleLen += 1) {
      for (let day = 1; day <= cycleLen + 10; day += 1) {
        expect(known.has(phaseForDay(day, cycleLen, 5))).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycle.test.ts -t phaseForDay
```

Expected: FAIL — `phaseForDay is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/cycle.ts`:

```ts
export function phaseForDay(
  day: number,
  cycleLen: number,
  periodLen: number,
): Phase {
  const ovulationDay = Math.max(cycleLen - 14, periodLen + 4);
  const fertileStart = ovulationDay - 3;
  const fertileEnd = Math.min(ovulationDay + 1, cycleLen);

  if (day <= periodLen) return 'menstrual';
  if (day >= fertileStart && day <= fertileEnd) return 'fertile';
  if (day < fertileStart) return 'follicular';
  return 'luteal';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycle.test.ts
```

Expected: PASS, all previous tests plus 7 new.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m "feat: resolve cycle phase by counting back from the next period"
```

---

### Task 4: The summary and its headline

**Files:**
- Modify: `src/lib/cycle.ts`
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Consumes: `cycleLength`, `periodLength`, `confidenceFor`, `phaseForDay`, `sortLogs` from Tasks 2–3; `addDays`, `diffDays` from Task 1.
- Produces: `summarizeCycle(logs: PeriodLog[], today: string): CycleSummary`, `hubCycleLabel(summary: CycleSummary): string`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/cycle.test.ts` (add `summarizeCycle` and `hubCycleLabel` to the imports):

```ts
describe('summarizeCycle', () => {
  it('reports no data when nothing is logged', () => {
    const summary = summarizeCycle([], '2026-08-16');
    expect(summary.headline).toEqual({ kind: 'no-data' });
    expect(summary.phase).toBeNull();
    expect(summary.dayOfCycle).toBeNull();
    expect(summary.nextStart).toBeNull();
    expect(summary.confidence).toBe('none');
  });

  it('counts days to the next period', () => {
    const logs = [log('a', '2026-06-27', '2026-07-01'), log('b', '2026-07-25', '2026-07-29')];
    const summary = summarizeCycle(logs, '2026-08-16');
    expect(summary.cycleLength).toBe(28);
    expect(summary.nextStart).toBe('2026-08-22');
    expect(summary.headline).toEqual({ kind: 'upcoming', days: 6 });
    expect(summary.dayOfCycle).toBe(23);
    expect(summary.phase).toBe('luteal');
  });

  it('says due today on the predicted day', () => {
    const logs = [log('a', '2026-06-27'), log('b', '2026-07-25')];
    expect(summarizeCycle(logs, '2026-08-22').headline).toEqual({ kind: 'due-today' });
  });

  it('reports lateness as a positive count, never a negative countdown', () => {
    const logs = [log('a', '2026-06-27'), log('b', '2026-07-25')];
    expect(summarizeCycle(logs, '2026-08-25').headline).toEqual({ kind: 'late', days: 3 });
  });

  it('never produces a negative day count on any date', () => {
    const logs = [log('a', '2026-06-27'), log('b', '2026-07-25')];
    let date = '2026-07-25';
    for (let i = 0; i < 200; i += 1) {
      const { headline } = summarizeCycle(logs, date);
      if (headline.kind === 'upcoming' || headline.kind === 'late') {
        expect(headline.days).toBeGreaterThan(0);
      }
      date = addDays(date, 1);
    }
  });

  it('lets a recorded period outrank a late estimate', () => {
    const logs = [
      log('a', '2026-06-27', '2026-07-01'),
      log('b', '2026-07-25', '2026-07-29'),
      log('c', '2026-08-25', '2026-08-29'),
    ];
    const summary = summarizeCycle(logs, '2026-08-27');
    expect(summary.headline).toEqual({ kind: 'period-day', day: 3 });
    expect(summary.phase).toBe('menstrual');
  });

  it('treats an open period as ongoing past its expected length', () => {
    const logs = [log('a', '2026-07-25', '2026-07-29'), log('b', '2026-08-20')];
    expect(summarizeCycle(logs, '2026-08-28').headline).toEqual({
      kind: 'period-day',
      day: 9,
    });
  });

  it('reports the day the period started as day 1', () => {
    const logs = [log('a', '2026-08-16')];
    expect(summarizeCycle(logs, '2026-08-16').headline).toEqual({
      kind: 'period-day',
      day: 1,
    });
  });
});

describe('hubCycleLabel', () => {
  const labelFor = (logs: PeriodLog[], today: string) =>
    hubCycleLabel(summarizeCycle(logs, today));

  it('asks to be set up when empty', () => {
    expect(labelFor([], '2026-08-16')).toBe('Not set up yet');
  });

  it('counts down in plural and singular', () => {
    const logs = [log('a', '2026-06-27'), log('b', '2026-07-25')];
    expect(labelFor(logs, '2026-08-16')).toBe('Period in 6 days');
    expect(labelFor(logs, '2026-08-21')).toBe('Period in 1 day');
  });

  it('names the day itself', () => {
    const logs = [log('a', '2026-06-27'), log('b', '2026-07-25')];
    expect(labelFor(logs, '2026-08-22')).toBe('Period today');
  });

  it('names lateness', () => {
    const logs = [log('a', '2026-06-27'), log('b', '2026-07-25')];
    expect(labelFor(logs, '2026-08-23')).toBe('1 day late');
    expect(labelFor(logs, '2026-08-26')).toBe('4 days late');
  });

  it('names the day of an ongoing period', () => {
    expect(labelFor([log('a', '2026-08-15')], '2026-08-16')).toBe('Day 2 of period');
  });
});
```

Add `addDays` to the `./cycleDates` imports in the test file.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycle.test.ts -t summarizeCycle
```

Expected: FAIL — `summarizeCycle is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/cycle.ts` (and add `addDays` to the `./cycleDates` import):

```ts
function coveringLog(sorted: PeriodLog[], today: string): PeriodLog | undefined {
  return sorted.find(
    (entry) =>
      today >= entry.startDate &&
      (entry.endDate === null || today <= entry.endDate),
  );
}

function headlineFor(
  sorted: PeriodLog[],
  today: string,
  nextStart: string,
): Headline {
  const covering = coveringLog(sorted, today);
  if (covering) {
    return { kind: 'period-day', day: diffDays(today, covering.startDate) + 1 };
  }
  const days = diffDays(nextStart, today);
  if (days > 0) return { kind: 'upcoming', days };
  if (days === 0) return { kind: 'due-today' };
  return { kind: 'late', days: -days };
}

export function summarizeCycle(
  logs: PeriodLog[],
  today: string,
): CycleSummary {
  const sorted = sortLogs(logs);
  const length = cycleLength(logs);
  const bleed = periodLength(logs);

  if (sorted.length === 0) {
    return {
      headline: { kind: 'no-data' },
      phase: null,
      dayOfCycle: null,
      cycleLength: length,
      periodLength: bleed,
      nextStart: null,
      confidence: 'none',
    };
  }

  const latest = sorted[0];
  const nextStart = addDays(latest.startDate, length);
  const headline = headlineFor(sorted, today, nextStart);
  const dayOfCycle = diffDays(today, latest.startDate) + 1;

  return {
    headline,
    phase:
      headline.kind === 'period-day'
        ? 'menstrual'
        : phaseForDay(dayOfCycle, length, bleed),
    dayOfCycle,
    cycleLength: length,
    periodLength: bleed,
    nextStart,
    confidence: confidenceFor(logs),
  };
}

export function hubCycleLabel(summary: CycleSummary): string {
  const { headline } = summary;
  switch (headline.kind) {
    case 'no-data':
      return 'Not set up yet';
    case 'period-day':
      return `Day ${headline.day} of period`;
    case 'upcoming':
      return headline.days === 1
        ? 'Period in 1 day'
        : `Period in ${headline.days} days`;
    case 'due-today':
      return 'Period today';
    case 'late':
      return headline.days === 1 ? '1 day late' : `${headline.days} days late`;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycle.test.ts
```

Expected: PASS, 13 new tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m "feat: summarise the cycle into a headline that cannot go negative"
```

---

### Task 5: Input rules

**Files:**
- Modify: `src/lib/cycle.ts`
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Consumes: `sortLogs`, `PeriodLog` from Task 2.
- Produces: `ValidationError`, `VALIDATION_MESSAGES: Record<ValidationError, string>`, `validateStart(startDate: string, logs: PeriodLog[], today: string, editingId: string | null): ValidationError | null`, `validateEnd(endDate: string, startDate: string, today: string): ValidationError | null`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/cycle.test.ts` (add `VALIDATION_MESSAGES`, `validateEnd`, `validateStart` to the imports):

```ts
describe('validateStart', () => {
  const logs = [log('a', '2026-07-01'), log('b', '2026-07-29')];

  it('accepts a plausible new start', () => {
    expect(validateStart('2026-08-26', logs, '2026-08-26', null)).toBeNull();
  });

  it('rejects a date in the future', () => {
    expect(validateStart('2026-08-27', logs, '2026-08-26', null)).toBe('future-date');
  });

  it('accepts today itself', () => {
    expect(validateStart('2026-08-26', logs, '2026-08-26', null)).toBeNull();
  });

  it('rejects a duplicate start', () => {
    expect(validateStart('2026-07-29', logs, '2026-08-26', null)).toBe('duplicate-start');
  });

  it('rejects a start before the latest logged one', () => {
    expect(validateStart('2026-07-15', logs, '2026-08-26', null)).toBe('start-before-previous');
  });

  it('ignores the row being edited when checking for duplicates', () => {
    expect(validateStart('2026-07-29', logs, '2026-08-26', 'b')).toBeNull();
  });

  it('compares an edited row against the one before it, not itself', () => {
    expect(validateStart('2026-06-20', logs, '2026-08-26', 'b')).toBe('start-before-previous');
    expect(validateStart('2026-07-20', logs, '2026-08-26', 'b')).toBeNull();
  });
});

describe('validateEnd', () => {
  it('accepts an end on or after the start', () => {
    expect(validateEnd('2026-08-20', '2026-08-16', '2026-08-26')).toBeNull();
    expect(validateEnd('2026-08-16', '2026-08-16', '2026-08-26')).toBeNull();
  });

  it('rejects an end before its start', () => {
    expect(validateEnd('2026-08-15', '2026-08-16', '2026-08-26')).toBe('end-before-start');
  });

  it('rejects an end in the future', () => {
    expect(validateEnd('2026-08-27', '2026-08-16', '2026-08-26')).toBe('future-date');
  });
});

describe('VALIDATION_MESSAGES', () => {
  it('has plain-English text for every error', () => {
    const errors = ['future-date', 'end-before-start', 'start-before-previous', 'duplicate-start'] as const;
    for (const error of errors) {
      expect(VALIDATION_MESSAGES[error].length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycle.test.ts -t validateStart
```

Expected: FAIL — `validateStart is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/cycle.ts`:

```ts
export type ValidationError =
  | 'future-date'
  | 'end-before-start'
  | 'start-before-previous'
  | 'duplicate-start';

export const VALIDATION_MESSAGES: Record<ValidationError, string> = {
  'future-date': 'That day has not happened yet.',
  'end-before-start': 'It cannot stop before it started.',
  'start-before-previous': 'That is earlier than the period already logged.',
  'duplicate-start': 'That day is already logged.',
};

export function validateStart(
  startDate: string,
  logs: PeriodLog[],
  today: string,
  editingId: string | null,
): ValidationError | null {
  if (startDate > today) return 'future-date';

  const others = logs.filter((entry) => entry.id !== editingId);
  if (others.some((entry) => entry.startDate === startDate)) {
    return 'duplicate-start';
  }

  const previous = sortLogs(others)[0];
  if (previous && startDate < previous.startDate) {
    return 'start-before-previous';
  }

  return null;
}

export function validateEnd(
  endDate: string,
  startDate: string,
  today: string,
): ValidationError | null {
  if (endDate > today) return 'future-date';
  if (endDate < startDate) return 'end-before-start';
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycle.test.ts
```

Expected: PASS, 11 new tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m "feat: reject impossible period dates before they reach the database"
```

---

### Task 6: Calendar month builder and history rows

**Files:**
- Create: `src/lib/cycleCalendar.ts`
- Test: `src/lib/cycleCalendar.test.ts`

**Interfaces:**
- Consumes: `PeriodLog`, `Phase`, `cycleLength`, `periodLength`, `phaseForDay`, `sortLogs` from Tasks 2–3; `addDays`, `diffDays`, `monthGridDates`, `monthOf` from Task 1.
- Produces: `CalendarDay`, `PredictedCycle`, `HistoryRow`, `predictedCycles(logs, throughDate): PredictedCycle[]`, `buildCalendarMonth(args): CalendarDay[]`, `historyRows(logs): HistoryRow[]`.

`buildCalendarMonth` takes `{ month: string; logs: PeriodLog[]; today: string; symptomDates: ReadonlySet<string> }`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/cycleCalendar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildCalendarMonth,
  historyRows,
  predictedCycles,
} from './cycleCalendar';
import type { PeriodLog } from './cycle';

function log(id: string, startDate: string, endDate: string | null = null): PeriodLog {
  return { id, startDate, endDate };
}

const LOGS = [
  log('a', '2026-06-27', '2026-07-01'),
  log('b', '2026-07-25', '2026-07-29'),
];

const NO_SYMPTOMS = new Set<string>();

describe('predictedCycles', () => {
  it('is empty with no history', () => {
    expect(predictedCycles([], '2026-12-31')).toEqual([]);
  });

  it('projects forward from the last recorded start', () => {
    const cycles = predictedCycles(LOGS, '2026-09-30');
    expect(cycles[0]).toEqual({ startDate: '2026-08-22', endDate: '2026-08-26' });
    expect(cycles[1]).toEqual({ startDate: '2026-09-19', endDate: '2026-09-23' });
  });

  it('stops once it passes the requested date', () => {
    expect(predictedCycles(LOGS, '2026-08-31')).toHaveLength(1);
  });

  it('never projects more than twelve cycles', () => {
    expect(predictedCycles(LOGS, '2030-01-01')).toHaveLength(12);
  });
});

describe('buildCalendarMonth', () => {
  const days = buildCalendarMonth({
    month: '2026-08',
    logs: LOGS,
    today: '2026-08-16',
    symptomDates: NO_SYMPTOMS,
  });
  const dayAt = (date: string) => days.find((d) => d.date === date)!;

  it('returns a full six-week grid', () => {
    expect(days).toHaveLength(42);
    expect(days[0].date).toBe('2026-07-27');
  });

  it('marks days outside the month', () => {
    expect(dayAt('2026-07-27').inMonth).toBe(false);
    expect(dayAt('2026-08-01').inMonth).toBe(true);
  });

  it('marks recorded period days solid and predicted days separately', () => {
    expect(dayAt('2026-07-27').recorded).toBe(true);
    expect(dayAt('2026-07-27').predicted).toBe(false);
    expect(dayAt('2026-08-22').predicted).toBe(true);
    expect(dayAt('2026-08-22').recorded).toBe(false);
  });

  it('covers the whole predicted period, not just its first day', () => {
    for (const date of ['2026-08-22', '2026-08-23', '2026-08-26']) {
      expect(dayAt(date).predicted).toBe(true);
    }
    expect(dayAt('2026-08-27').predicted).toBe(false);
  });

  it('paints the phases between periods', () => {
    expect(dayAt('2026-08-02').phase).toBe('follicular');
    expect(dayAt('2026-08-08').phase).toBe('fertile');
    expect(dayAt('2026-08-16').phase).toBe('luteal');
  });

  it('flags today exactly once', () => {
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(dayAt('2026-08-16').isToday).toBe(true);
  });

  it('knows nothing before the first logged period', () => {
    const early = buildCalendarMonth({
      month: '2026-05',
      logs: LOGS,
      today: '2026-08-16',
      symptomDates: NO_SYMPTOMS,
    });
    expect(early.every((d) => d.phase === null)).toBe(true);
  });

  it('draws a completed cycle at its own length, not the current average', () => {
    const irregular = [
      log('a', '2026-05-01', '2026-05-05'),
      log('b', '2026-06-04', '2026-06-08'),
      log('c', '2026-07-02', '2026-07-06'),
    ];
    const may = buildCalendarMonth({
      month: '2026-05',
      logs: irregular,
      today: '2026-07-20',
      symptomDates: NO_SYMPTOMS,
    });
    const at = (date: string) => may.find((d) => d.date === date)!.phase;
    expect(at('2026-05-20')).toBe('fertile');
    expect(at('2026-05-14')).toBe('follicular');
  });

  it('reports which days carry symptoms', () => {
    const withSymptoms = buildCalendarMonth({
      month: '2026-08',
      logs: LOGS,
      today: '2026-08-16',
      symptomDates: new Set(['2026-08-14']),
    });
    expect(withSymptoms.find((d) => d.date === '2026-08-14')!.hasSymptoms).toBe(true);
    expect(withSymptoms.find((d) => d.date === '2026-08-15')!.hasSymptoms).toBe(false);
  });

  it('treats an open period as recorded up to today and no further', () => {
    const open = buildCalendarMonth({
      month: '2026-08',
      logs: [log('a', '2026-07-25', '2026-07-29'), log('b', '2026-08-14')],
      today: '2026-08-16',
      symptomDates: NO_SYMPTOMS,
    });
    const at = (date: string) => open.find((d) => d.date === date)!;
    expect(at('2026-08-14').recorded).toBe(true);
    expect(at('2026-08-16').recorded).toBe(true);
    expect(at('2026-08-17').recorded).toBe(false);
  });
});

describe('historyRows', () => {
  it('is newest first', () => {
    expect(historyRows(LOGS).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('counts the days of a finished period', () => {
    expect(historyRows(LOGS)[0].days).toBe(5);
  });

  it('leaves an open period without a day count', () => {
    expect(historyRows([log('a', '2026-08-14')])[0].days).toBeNull();
  });

  it('reports the gap to the period before it', () => {
    expect(historyRows(LOGS)[0].cycleLength).toBe(28);
  });

  it('has no cycle length for the oldest row', () => {
    expect(historyRows(LOGS)[1].cycleLength).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycleCalendar.test.ts
```

Expected: FAIL — `Failed to resolve import "./cycleCalendar"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/cycleCalendar.ts`:

```ts
import {
  cycleLength,
  periodLength,
  phaseForDay,
  sortLogs,
  type PeriodLog,
  type Phase,
} from './cycle';
import { addDays, diffDays, monthGridDates, monthOf } from './cycleDates';

const MAX_PROJECTED_CYCLES = 12;

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

export interface HistoryRow {
  id: string;
  startDate: string;
  endDate: string | null;
  days: number | null;
  cycleLength: number | null;
}

interface Anchor {
  startDate: string;
  length: number;
  bleed: number;
}

export function predictedCycles(
  logs: PeriodLog[],
  throughDate: string,
): PredictedCycle[] {
  const sorted = sortLogs(logs);
  if (sorted.length === 0) return [];

  const length = cycleLength(logs);
  const bleed = periodLength(logs);
  const cycles: PredictedCycle[] = [];

  for (let step = 1; step <= MAX_PROJECTED_CYCLES; step += 1) {
    const startDate = addDays(sorted[0].startDate, length * step);
    if (startDate > throughDate) break;
    cycles.push({ startDate, endDate: addDays(startDate, bleed - 1) });
  }

  return cycles;
}

function recordedDates(logs: PeriodLog[], today: string): Set<string> {
  const dates = new Set<string>();
  for (const entry of logs) {
    const last = entry.endDate ?? today;
    for (let date = entry.startDate; date <= last; date = addDays(date, 1)) {
      dates.add(date);
    }
  }
  return dates;
}

function anchorsFor(logs: PeriodLog[], throughDate: string): Anchor[] {
  const sorted = sortLogs(logs).reverse();
  const length = cycleLength(logs);
  const bleed = periodLength(logs);

  const anchors: Anchor[] = sorted.map((entry, index) => {
    const next = sorted[index + 1];
    const ownBleed =
      entry.endDate === null ? bleed : diffDays(entry.endDate, entry.startDate) + 1;
    return {
      startDate: entry.startDate,
      length: next ? diffDays(next.startDate, entry.startDate) : length,
      bleed: ownBleed,
    };
  });

  for (const cycle of predictedCycles(logs, throughDate)) {
    anchors.push({ startDate: cycle.startDate, length, bleed });
  }

  return anchors;
}

export function buildCalendarMonth({
  month,
  logs,
  today,
  symptomDates,
}: {
  month: string;
  logs: PeriodLog[];
  today: string;
  symptomDates: ReadonlySet<string>;
}): CalendarDay[] {
  const dates = monthGridDates(month);
  const lastDate = dates[dates.length - 1];

  const recorded = recordedDates(logs, today);
  const predicted = new Set<string>();
  for (const cycle of predictedCycles(logs, lastDate)) {
    for (
      let date = cycle.startDate;
      date <= cycle.endDate;
      date = addDays(date, 1)
    ) {
      predicted.add(date);
    }
  }

  const anchors = anchorsFor(logs, lastDate);

  return dates.map((date) => {
    const anchor = anchors.filter((a) => a.startDate <= date).pop();
    return {
      date,
      phase: anchor
        ? phaseForDay(diffDays(date, anchor.startDate) + 1, anchor.length, anchor.bleed)
        : null,
      recorded: recorded.has(date),
      predicted: predicted.has(date) && !recorded.has(date),
      inMonth: monthOf(date) === month,
      isToday: date === today,
      hasSymptoms: symptomDates.has(date),
    };
  });
}

export function historyRows(logs: PeriodLog[]): HistoryRow[] {
  const sorted = sortLogs(logs);
  return sorted.map((entry, index) => {
    const older = sorted[index + 1];
    return {
      id: entry.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
      days:
        entry.endDate === null
          ? null
          : diffDays(entry.endDate, entry.startDate) + 1,
      cycleLength: older ? diffDays(entry.startDate, older.startDate) : null,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycleCalendar.test.ts
```

Expected: PASS, 21 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycleCalendar.ts src/lib/cycleCalendar.test.ts
git commit -m "feat: build the month grid and history rows from period logs"
```

---

### Task 7: Ring geometry

**Files:**
- Create: `src/lib/cycleRing.ts`
- Test: `src/lib/cycleRing.test.ts`

**Interfaces:**
- Consumes: `phaseForDay`, `Phase` from Task 3.
- Produces: `RING_CENTER`, `RING_RADIUS`, `RingArc { phase; startDay; endDay; d }`, `ringPoint(day: number, cycleLen: number): { x: number; y: number }`, `ringArcs(cycleLen: number, periodLen: number): RingArc[]`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/cycleRing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ringArcs, ringPoint, RING_CENTER, RING_RADIUS } from './cycleRing';

describe('ringPoint', () => {
  it('puts day one at the top of the circle', () => {
    expect(ringPoint(1, 28)).toEqual({ x: RING_CENTER, y: RING_CENTER - RING_RADIUS });
  });

  it('puts the halfway day at the bottom', () => {
    const point = ringPoint(15, 28);
    expect(point.x).toBeCloseTo(RING_CENTER, 0);
    expect(point.y).toBeCloseTo(RING_CENTER + RING_RADIUS, 0);
  });

  it('stays on the circle for every day', () => {
    for (let day = 1; day <= 28; day += 1) {
      const { x, y } = ringPoint(day, 28);
      const distance = Math.hypot(x - RING_CENTER, y - RING_CENTER);
      expect(distance).toBeCloseTo(RING_RADIUS, 0);
    }
  });
});

describe('ringArcs', () => {
  it('produces one arc per phase run, in cycle order', () => {
    expect(ringArcs(28, 5).map((arc) => arc.phase)).toEqual([
      'menstrual',
      'follicular',
      'fertile',
      'luteal',
    ]);
  });

  it('covers every day of the cycle exactly once', () => {
    const arcs = ringArcs(29, 5);
    expect(arcs[0].startDay).toBe(1);
    expect(arcs[arcs.length - 1].endDay).toBe(29);
    for (let i = 1; i < arcs.length; i += 1) {
      expect(arcs[i].startDay).toBe(arcs[i - 1].endDay + 1);
    }
  });

  it('drops a phase that has no days', () => {
    expect(ringArcs(21, 6).map((arc) => arc.phase)).toEqual([
      'menstrual',
      'fertile',
      'luteal',
    ]);
  });

  it('emits a drawable arc path for each run', () => {
    for (const arc of ringArcs(28, 5)) {
      expect(arc.d).toMatch(/^M [\d.]+ [\d.]+ A /);
    }
  });

  it('uses the large-arc flag only for runs longer than half the cycle', () => {
    const arcs = ringArcs(28, 5);
    const luteal = arcs.find((arc) => arc.phase === 'luteal')!;
    const menstrual = arcs.find((arc) => arc.phase === 'menstrual')!;
    expect(luteal.d).toContain(' 0 0 1 ');
    expect(menstrual.d).toContain(' 0 0 1 ');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycleRing.test.ts
```

Expected: FAIL — `Failed to resolve import "./cycleRing"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/cycleRing.ts`:

```ts
import { phaseForDay, type Phase } from './cycle';

export const RING_CENTER = 110;
export const RING_RADIUS = 78;

const ARC_GAP = 0.15;

export interface RingArc {
  phase: Phase;
  startDay: number;
  endDay: number;
  d: string;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function ringPoint(
  day: number,
  cycleLen: number,
): { x: number; y: number } {
  const angle = ((-90 + ((day - 1) / cycleLen) * 360) * Math.PI) / 180;
  return {
    x: round(RING_CENTER + RING_RADIUS * Math.cos(angle)),
    y: round(RING_CENTER + RING_RADIUS * Math.sin(angle)),
  };
}

function arcPath(startDay: number, endDay: number, cycleLen: number): string {
  const start = ringPoint(startDay, cycleLen);
  const end = ringPoint(endDay + 1 - ARC_GAP, cycleLen);
  const sweep = (endDay + 1 - ARC_GAP - startDay) / cycleLen;
  const large = sweep > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RING_RADIUS} ${RING_RADIUS} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function ringArcs(cycleLen: number, periodLen: number): RingArc[] {
  const runs: { phase: Phase; startDay: number; endDay: number }[] = [];

  for (let day = 1; day <= cycleLen; day += 1) {
    const phase = phaseForDay(day, cycleLen, periodLen);
    const last = runs[runs.length - 1];
    if (last && last.phase === phase) last.endDay = day;
    else runs.push({ phase, startDay: day, endDay: day });
  }

  return runs.map((run) => ({
    ...run,
    d: arcPath(run.startDay, run.endDay, cycleLen),
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycleRing.test.ts
```

Expected: PASS, 8 tests. If the large-arc assertion fails, read the actual `d` strings before changing the expectation — a luteal run of 13 of 28 days is under half the circle, so flag `0` is correct.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycleRing.ts src/lib/cycleRing.test.ts
git commit -m "feat: compute ring arc geometry from cycle phases"
```

---

### Task 8: Phase colours, tokens, and their guard test

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/cycleColors.ts`
- Test: `src/lib/cycleColors.test.ts`

**Interfaces:**
- Consumes: `Phase` from Task 2; `contrastRatio`, `deltaE76`, `hexToRgb` from `src/lib/color.ts`.
- Produces: `PHASE_VAR: Record<Phase, string>`, `PHASE_LABELS: Record<Phase, string>`, `TINT: { period: 78; phase: 26; predicted: 18; outOfMonth: 12 }`, `phaseFill(phase: Phase, percent: number): string`.

`phaseFill` returns a `color-mix(...)` string suitable for a `background` or SVG `fill`.

- [ ] **Step 1: Add the tokens to globals.css**

In `src/app/globals.css`, immediately after the `--mac-accent-timetable: #72E2FF;` line inside the raw-hue block, add:

```css
  --mac-cycle-menstrual: #F2A7BE;
  --mac-cycle-follicular: #A8DCD1;
  --mac-cycle-fertile: #F0CE87;
  --mac-cycle-luteal: #C4B0E0;
```

Then, in **each** block that defines the `--mt-*` semantic tokens (the `:root` defaults, the `[data-mood='light']` block, and the `[data-mood='dark']` block), add the four semantic tokens alongside the existing `--mt-surface` / `--mt-border` lines:

```css
  --mt-phase-menstrual: var(--mac-cycle-menstrual);
  --mt-phase-follicular: var(--mac-cycle-follicular);
  --mt-phase-fertile: var(--mac-cycle-fertile);
  --mt-phase-luteal: var(--mac-cycle-luteal);
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/cycleColors.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, deltaE76, hexToRgb } from './color';
import { PHASE_LABELS, PHASE_VAR, TINT, phaseFill } from './cycleColors';
import type { Phase } from './cycle';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

const PHASES: Phase[] = ['menstrual', 'follicular', 'fertile', 'luteal'];

const COCOA = '#3B2E2A';
const MIN_TEXT_CONTRAST = 4.5;
const MIN_SEPARATION = 20;

function readToken(name: string): string | undefined {
  return new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS)?.[1];
}

function mixWithWhite(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const blend = (channel: number) =>
    Math.round((channel * percent) / 100 + 255 * (1 - percent / 100));
  return `#${[blend(r), blend(g), blend(b)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('cycle phase tokens', () => {
  it('declares a raw hue for every phase', () => {
    for (const phase of PHASES) {
      expect(readToken(`--mac-cycle-${phase}`)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('points every semantic token at its raw hue', () => {
    for (const phase of PHASES) {
      expect(CSS).toContain(
        `--mt-phase-${phase}: var(--mac-cycle-${phase})`,
      );
    }
  });

  it('references only semantic tokens from the module', () => {
    for (const phase of PHASES) {
      expect(PHASE_VAR[phase]).toBe(`var(--mt-phase-${phase})`);
      expect(CSS).toContain(`--mt-phase-${phase}:`);
    }
  });
});

describe('cycle phase separation', () => {
  it('keeps every pair of phases perceptually apart', () => {
    for (let i = 0; i < PHASES.length; i += 1) {
      for (let j = i + 1; j < PHASES.length; j += 1) {
        const a = readToken(`--mac-cycle-${PHASES[i]}`)!;
        const b = readToken(`--mac-cycle-${PHASES[j]}`)!;
        expect(deltaE76(a, b)).toBeGreaterThanOrEqual(MIN_SEPARATION);
      }
    }
  });
});

describe('cycle phase contrast', () => {
  it('keeps day numbers readable on every tint used', () => {
    const tints = [TINT.period, TINT.phase, TINT.predicted, TINT.outOfMonth];
    for (const phase of PHASES) {
      const hue = readToken(`--mac-cycle-${phase}`)!;
      for (const tint of tints) {
        expect(contrastRatio(COCOA, mixWithWhite(hue, tint))).toBeGreaterThanOrEqual(
          MIN_TEXT_CONTRAST,
        );
      }
    }
  });

  it('keeps the recorded tint stronger than the predicted one', () => {
    expect(TINT.period).toBeGreaterThan(TINT.predicted);
    expect(TINT.phase).toBeGreaterThan(TINT.outOfMonth);
  });
});

describe('phaseFill and labels', () => {
  it('builds a colour-mix against the surface token', () => {
    expect(phaseFill('menstrual', 78)).toBe(
      'color-mix(in srgb, var(--mt-phase-menstrual) 78%, var(--mt-surface))',
    );
  });

  it('names every phase in plain English', () => {
    for (const phase of PHASES) {
      expect(PHASE_LABELS[phase].length).toBeGreaterThan(0);
    }
    expect(PHASE_LABELS.menstrual).toBe('Period');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx vitest run src/lib/cycleColors.test.ts
```

Expected: FAIL — `Failed to resolve import "./cycleColors"`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/cycleColors.ts`:

```ts
import type { Phase } from './cycle';

export const PHASE_VAR: Record<Phase, string> = {
  menstrual: 'var(--mt-phase-menstrual)',
  follicular: 'var(--mt-phase-follicular)',
  fertile: 'var(--mt-phase-fertile)',
  luteal: 'var(--mt-phase-luteal)',
};

export const PHASE_LABELS: Record<Phase, string> = {
  menstrual: 'Period',
  follicular: 'Follicular',
  fertile: 'Fertile window',
  luteal: 'Luteal',
};

export const TINT = {
  period: 78,
  phase: 26,
  predicted: 18,
  outOfMonth: 12,
} as const;

export function phaseFill(phase: Phase, percent: number): string {
  return `color-mix(in srgb, ${PHASE_VAR[phase]} ${percent}%, var(--mt-surface))`;
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx vitest run src/lib/cycleColors.test.ts
```

Expected: PASS, 8 tests. Measured values for reference: minimum pair separation is ΔE 25.49 (period vs luteal), worst text contrast is 7.76:1 (cocoa on luteal at 78%).

- [ ] **Step 6: Run the whole suite to confirm nothing else moved**

```bash
npm test
```

Expected: PASS, including the existing `accents.test.ts` and `heatmapTheme.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/lib/cycleColors.ts src/lib/cycleColors.test.ts
git commit -m "feat: add cycle phase colour tokens with contrast and separation guards"
```

---

### Task 9: Supabase schema and the repository module

**Files:**
- Modify: `src/lib/supabase.ts`
- Create: `src/lib/cycleRepo.ts`

**Interfaces:**
- Consumes: `supabase` client; `PeriodLog` from Task 2.
- Produces: `fetchPeriods(): Promise<PeriodLog[] | null>`, `fetchSymptoms(from: string, to: string): Promise<Record<string, string[]> | null>`, `insertPeriod(startDate: string): Promise<boolean>`, `updatePeriod(id: string, startDate: string, endDate: string | null): Promise<boolean>`, `deletePeriod(id: string): Promise<boolean>`, `saveSymptoms(date: string, symptoms: string[]): Promise<boolean>`.

Every function returns `null` / `false` on failure after logging; none throw. Callers decide what to show.

- [ ] **Step 1: Record the schema**

Append inside the existing block comment at the bottom of `src/lib/supabase.ts`, after the `timetables` section:

```
Supabase schema for cycle tracking (cycle spec §3). No user_name column:
there is one cycle being tracked, and both people read the same rows.

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

alter table cycle_periods enable row level security;
alter table cycle_symptoms enable row level security;

create policy "anon reads cycle_periods"
  on cycle_periods for select to anon using (true);
create policy "anon writes cycle_periods"
  on cycle_periods for all to anon using (true) with check (true);

create policy "anon reads cycle_symptoms"
  on cycle_symptoms for select to anon using (true);
create policy "anon writes cycle_symptoms"
  on cycle_symptoms for all to anon using (true) with check (true);
```
```

- [ ] **Step 2: Create the repository module**

Create `src/lib/cycleRepo.ts`:

```ts
import { supabase } from './supabase';
import type { PeriodLog } from './cycle';

interface PeriodRow {
  id: string;
  start_date: string;
  end_date: string | null;
}

interface SymptomRow {
  date: string;
  symptoms: string[];
}

export async function fetchPeriods(): Promise<PeriodLog[] | null> {
  const { data, error } = await supabase
    .from('cycle_periods')
    .select('id, start_date, end_date')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Failed to load cycle periods:', error);
    return null;
  }

  return (data as PeriodRow[]).map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}

export async function fetchSymptoms(
  from: string,
  to: string,
): Promise<Record<string, string[]> | null> {
  const { data, error } = await supabase
    .from('cycle_symptoms')
    .select('date, symptoms')
    .gte('date', from)
    .lte('date', to);

  if (error) {
    console.error('Failed to load cycle symptoms:', error);
    return null;
  }

  const byDate: Record<string, string[]> = {};
  for (const row of data as SymptomRow[]) byDate[row.date] = row.symptoms;
  return byDate;
}

export async function insertPeriod(startDate: string): Promise<boolean> {
  const { error } = await supabase
    .from('cycle_periods')
    .insert({ start_date: startDate });

  if (error) {
    console.error('Failed to log period start:', error);
    return false;
  }
  return true;
}

export async function updatePeriod(
  id: string,
  startDate: string,
  endDate: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from('cycle_periods')
    .update({
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update period:', error);
    return false;
  }
  return true;
}

export async function deletePeriod(id: string): Promise<boolean> {
  const { error } = await supabase.from('cycle_periods').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete period:', error);
    return false;
  }
  return true;
}

export async function saveSymptoms(
  date: string,
  symptoms: string[],
): Promise<boolean> {
  const { error } = await supabase.from('cycle_symptoms').upsert(
    { date, symptoms, updated_at: new Date().toISOString() },
    { onConflict: 'date' },
  );

  if (error) {
    console.error('Failed to save symptoms:', error);
    return false;
  }
  return true;
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run the two SQL statements against Supabase**

Open the Supabase SQL editor for this project and run the `create table` / `create policy` block recorded in Step 1. Confirm both tables appear under Table Editor with zero rows.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/lib/cycleRepo.ts
git commit -m "feat: add cycle tables and their supabase access module"
```

---

### Task 10: The ring component

**Files:**
- Create: `src/components/cycle/CycleRing.tsx`

**Interfaces:**
- Consumes: `ringArcs`, `ringPoint`, `RING_CENTER` from Task 7; `PHASE_LABELS`, `PHASE_VAR`, `TINT`, `phaseFill` from Task 8; `Headline`, `Phase` from Tasks 2–4; `formatLongDate` from Task 1.
- Produces: default export `CycleRing`, taking `{ cycleLength, periodLength, dayOfCycle, phase, headline, nextStart, confidence }`.

This component is never rendered without data — `CycleBoard` shows an empty state instead (Task 15), so no `no-data` branch is needed beyond the exhaustive switch.

- [ ] **Step 1: Write the component**

Create `src/components/cycle/CycleRing.tsx`:

```tsx
import type { Confidence, Headline, Phase } from '@/lib/cycle';
import { PHASE_LABELS, PHASE_VAR, TINT, phaseFill } from '@/lib/cycleColors';
import { formatLongDate } from '@/lib/cycleDates';
import { RING_CENTER, ringArcs, ringPoint } from '@/lib/cycleRing';

const LEGEND_ORDER: Phase[] = ['menstrual', 'fertile', 'luteal', 'follicular'];

function headlineParts(headline: Headline): { value: string; unit: string } {
  switch (headline.kind) {
    case 'no-data':
      return { value: '—', unit: 'no history yet' };
    case 'period-day':
      return { value: `Day ${headline.day}`, unit: 'of your period' };
    case 'upcoming':
      return {
        value: `${headline.days}`,
        unit: headline.days === 1 ? 'day to period' : 'days to period',
      };
    case 'due-today':
      return { value: 'Today', unit: 'period expected' };
    case 'late':
      return {
        value: `${headline.days}`,
        unit: headline.days === 1 ? 'day late' : 'days late',
      };
  }
}

function confidenceNote(confidence: Confidence): string | null {
  switch (confidence) {
    case 'none':
      return null;
    case 'default':
      return 'Using a 28-day guess until there is more history.';
    case 'thin':
      return 'Based on one recorded cycle so far.';
    case 'learned':
      return null;
  }
}

export default function CycleRing({
  cycleLength,
  periodLength,
  dayOfCycle,
  phase,
  headline,
  nextStart,
  confidence,
}: {
  cycleLength: number;
  periodLength: number;
  dayOfCycle: number;
  phase: Phase;
  headline: Headline;
  nextStart: string;
  confidence: Confidence;
}) {
  const arcs = ringArcs(cycleLength, periodLength);
  const marker = ringPoint(dayOfCycle, cycleLength);
  const { value, unit } = headlineParts(headline);
  const note = confidenceNote(confidence);

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[280px]">
        <svg viewBox="0 0 220 220" className="w-full" aria-hidden>
          <circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r="78"
            fill="none"
            stroke="var(--mt-border)"
            strokeWidth="17"
          />
          {arcs.map((arc) => (
            <path
              key={arc.phase + arc.startDay}
              d={arc.d}
              fill="none"
              stroke={PHASE_VAR[arc.phase]}
              strokeWidth="17"
              strokeLinecap="round"
            />
          ))}
          <g transform={`translate(${marker.x} ${marker.y})`}>
            <circle
              r="13"
              fill="var(--mt-surface)"
              stroke="var(--mt-text)"
              strokeWidth="2.5"
            />
            <path
              d="M0 -5.2 c-2.6 -3.4 -7.4 -1.2 -7.4 2.6 c0 3.6 4.6 6.6 7.4 9 c2.8 -2.4 7.4 -5.4 7.4 -9 c0 -3.8 -4.8 -6 -7.4 -2.6 z"
              fill={PHASE_VAR.menstrual}
            />
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            {PHASE_LABELS[phase]}
          </span>
          <span className="mt-1 text-4xl font-semibold leading-none text-[var(--mt-text)]">
            {value}
          </span>
          <span className="mt-1.5 text-xs text-[var(--mt-text-muted)]">
            {unit}
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-[var(--mt-text-muted)]">
        Day {dayOfCycle} of {cycleLength} · expected {formatLongDate(nextStart)}
      </p>
      {note && (
        <p className="mt-1 text-center text-xs text-[var(--mt-text-subtle)]">
          {note}
        </p>
      )}

      <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {LEGEND_ORDER.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-xs text-[var(--mt-text)]"
          >
            <span
              className="h-2.5 w-5 rounded-full"
              style={{ background: phaseFill(item, TINT.period) }}
              aria-hidden
            />
            {PHASE_LABELS[item]}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/cycle/CycleRing.tsx
git commit -m "feat: draw the cycle phase ring"
```

---

### Task 11: The month calendar component

**Files:**
- Create: `src/components/cycle/CycleCalendar.tsx`

**Interfaces:**
- Consumes: `CalendarDay` from Task 6; `PHASE_LABELS`, `PHASE_VAR`, `TINT`, `phaseFill` from Task 8; `WEEKDAYS_SHORT`, `formatMonthYear`, `formatShortDate` from Task 1.
- Produces: default export `CycleCalendar`, taking `{ month, days, selectedDate, onSelect, onMonth }`. `onMonth` receives `-1` or `1`.

- [ ] **Step 1: Write the component**

Create `src/components/cycle/CycleCalendar.tsx`:

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Phase } from '@/lib/cycle';
import type { CalendarDay } from '@/lib/cycleCalendar';
import { PHASE_LABELS, PHASE_VAR, TINT, phaseFill } from '@/lib/cycleColors';
import {
  WEEKDAYS_SHORT,
  formatMonthYear,
  formatShortDate,
} from '@/lib/cycleDates';

const LEGEND_ORDER: Phase[] = ['menstrual', 'fertile', 'luteal', 'follicular'];

function runKey(day: CalendarDay): string {
  return `${day.phase ?? 'none'}|${day.recorded}|${day.predicted}|${day.inMonth}`;
}

function fillFor(day: CalendarDay): string {
  if (day.phase === null) return 'transparent';
  const hue: Phase = day.recorded || day.predicted ? 'menstrual' : day.phase;
  if (!day.inMonth) return phaseFill(hue, TINT.outOfMonth);
  if (day.recorded) return phaseFill(hue, TINT.period);
  if (day.predicted) return phaseFill(hue, TINT.predicted);
  return phaseFill(hue, TINT.phase);
}

function cornerRadius(joinLeft: boolean, joinRight: boolean): string {
  const left = joinLeft ? '0' : '14px';
  const right = joinRight ? '0' : '14px';
  return `${left} ${right} ${right} ${left}`;
}

function describe(day: CalendarDay): string {
  const parts = [formatShortDate(day.date)];
  if (day.recorded) parts.push('period recorded');
  else if (day.predicted) parts.push('period predicted');
  else if (day.phase) parts.push(PHASE_LABELS[day.phase].toLowerCase());
  if (day.hasSymptoms) parts.push('has symptoms');
  if (day.isToday) parts.push('today');
  return parts.join(', ');
}

export default function CycleCalendar({
  month,
  days,
  selectedDate,
  onSelect,
  onMonth,
}: {
  month: string;
  days: CalendarDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
  onMonth: (step: -1 | 1) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonth(-1)}
          aria-label="Previous month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          onClick={() => onMonth(1)}
          aria-label="Next month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS_SHORT.map((label) => (
          <span
            key={label}
            className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--mt-text-subtle)]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7" style={{ rowGap: '6px' }}>
        {days.map((day, index) => {
          const column = index % 7;
          const previous = column > 0 ? days[index - 1] : undefined;
          const next = column < 6 ? days[index + 1] : undefined;
          const joinLeft = previous ? runKey(previous) === runKey(day) : false;
          const joinRight = next ? runKey(next) === runKey(day) : false;
          const dashed = day.predicted && day.inMonth;
          const dash = `1.5px dashed ${PHASE_VAR.menstrual}`;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-label={describe(day)}
              aria-pressed={day.date === selectedDate}
              className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-sm text-[var(--mt-text)]"
              style={{
                background: fillFor(day),
                borderRadius: cornerRadius(joinLeft, joinRight),
                boxSizing: 'border-box',
                borderTop: dashed ? dash : undefined,
                borderBottom: dashed ? dash : undefined,
                borderLeft: dashed && !joinLeft ? dash : undefined,
                borderRight: dashed && !joinRight ? dash : undefined,
                outline:
                  day.date === selectedDate
                    ? '2px solid var(--mt-focus)'
                    : undefined,
                outlineOffset: '-2px',
              }}
            >
              {day.isToday ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mt-text)] text-xs font-semibold text-[var(--mt-surface)]">
                  {Number(day.date.slice(8))}
                </span>
              ) : (
                <span className={day.inMonth ? '' : 'opacity-70'}>
                  {Number(day.date.slice(8))}
                </span>
              )}
              <span className="flex h-1.5 items-center gap-0.5">
                {day.phase === 'fertile' && !day.recorded && !day.predicted && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: PHASE_VAR.fertile }}
                    aria-hidden
                  />
                )}
                {day.hasSymptoms && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[var(--mt-text-muted)]"
                    aria-hidden
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--mt-border)] pt-3">
        {LEGEND_ORDER.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-xs text-[var(--mt-text)]"
          >
            <span
              className="h-2.5 w-5 rounded-full"
              style={{
                background: phaseFill(
                  item,
                  item === 'menstrual' ? TINT.period : TINT.phase,
                ),
              }}
              aria-hidden
            />
            {PHASE_LABELS[item]}
          </li>
        ))}
        <li className="flex items-center gap-2 text-xs text-[var(--mt-text)]">
          <span
            className="h-2.5 w-5 rounded-full border border-dashed"
            style={{
              background: phaseFill('menstrual', TINT.predicted),
              borderColor: PHASE_VAR.menstrual,
            }}
            aria-hidden
          />
          Predicted
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/cycle/CycleCalendar.tsx
git commit -m "feat: draw the month calendar with joined phase stripes"
```

---

### Task 12: The log modal

**Files:**
- Create: `src/components/cycle/LogPeriodModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/ui/Modal`; `addDays`, `formatShortDate` from Task 1.
- Produces: default export `LogPeriodModal`, `LogMode = 'start' | 'end'`. Props: `{ mode, today, initialDate, error, isSaving, onClose, onSave, onDelete? }`.

The parent mounts this only while it is open, so its internal draft state resets naturally on every open. Do not add an effect to sync `initialDate`.

- [ ] **Step 1: Write the component**

Create `src/components/cycle/LogPeriodModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { addDays, formatShortDate } from '@/lib/cycleDates';

export type LogMode = 'start' | 'end' | 'edit';

const TITLES: Record<LogMode, string> = {
  start: 'When did it start?',
  end: 'When did it stop?',
  edit: 'Change these dates',
};

export default function LogPeriodModal({
  mode,
  today,
  initialDate,
  initialEndDate,
  error,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: {
  mode: LogMode;
  today: string;
  initialDate: string;
  initialEndDate: string | null;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (date: string, endDate: string | null) => void;
  onDelete?: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialEndDate ?? '');

  const quickSets = [
    { label: 'Today', value: today },
    { label: 'Yesterday', value: addDays(today, -1) },
    { label: '2 days ago', value: addDays(today, -2) },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={TITLES[mode]}
      variant="sheet"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-[var(--mt-border)] text-sm font-semibold text-[var(--mt-text)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(date, endDate === '' ? null : endDate)}
            className="min-h-11 flex-1 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="cycle-start-date"
            className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]"
          >
            {mode === 'end' ? 'Last day' : 'First day'}
          </label>
          <input
            id="cycle-start-date"
            type="date"
            max={today}
            value={mode === 'end' ? endDate : date}
            onChange={(e) =>
              mode === 'end' ? setEndDate(e.target.value) : setDate(e.target.value)
            }
            className="mt-1 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-base text-[var(--mt-text)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {quickSets.map((quick) => (
            <button
              key={quick.label}
              type="button"
              onClick={() =>
                mode === 'end' ? setEndDate(quick.value) : setDate(quick.value)
              }
              className="min-h-11 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
            >
              {quick.label}
              <span className="ml-1.5 text-[var(--mt-text-subtle)]">
                {formatShortDate(quick.value)}
              </span>
            </button>
          ))}
        </div>

        {mode === 'edit' && (
          <div>
            <label
              htmlFor="cycle-end-date"
              className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]"
            >
              Last day
            </label>
            <input
              id="cycle-end-date"
              type="date"
              max={today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-base text-[var(--mt-text)]"
            />
            <p className="mt-1 text-xs text-[var(--mt-text-subtle)]">
              Leave empty if it is still going.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--mt-danger)]" role="alert">
            {error}
          </p>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 text-sm font-semibold text-[var(--mt-danger)]"
          >
            Delete this period
          </button>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Confirm `--mt-danger` exists**

```bash
npx vitest run --reporter=dot 2>/dev/null; grep -n "mt-danger" src/app/globals.css
```

Expected: at least one `--mt-danger:` declaration. If it is absent, use `var(--mt-text)` for the error text and the delete button instead, and note it in the commit message.

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors, no warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/cycle/LogPeriodModal.tsx
git commit -m "feat: add the period date picker with quick-set days"
```

---

### Task 13: The history list

**Files:**
- Create: `src/components/cycle/PeriodHistory.tsx`

**Interfaces:**
- Consumes: `HistoryRow` from Task 6; `formatShortDate` from Task 1.
- Produces: default export `PeriodHistory`, taking `{ rows, onEdit }`. `onEdit` receives the row's `id`.

- [ ] **Step 1: Write the component**

Create `src/components/cycle/PeriodHistory.tsx`:

```tsx
import { Pencil } from 'lucide-react';
import type { HistoryRow } from '@/lib/cycleCalendar';
import { formatShortDate } from '@/lib/cycleDates';

const MAX_ROWS = 12;

function rangeLabel(row: HistoryRow): string {
  if (row.endDate === null) return `${formatShortDate(row.startDate)} – ongoing`;
  return `${formatShortDate(row.startDate)} – ${formatShortDate(row.endDate)}`;
}

function detailLabel(row: HistoryRow): string {
  const parts: string[] = [];
  if (row.days !== null) {
    parts.push(row.days === 1 ? '1 day' : `${row.days} days`);
  }
  if (row.cycleLength !== null) parts.push(`${row.cycleLength}-day cycle`);
  return parts.join(' · ');
}

export default function PeriodHistory({
  rows,
  onEdit,
}: {
  rows: HistoryRow[];
  onEdit: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--mt-text-muted)]">
        Nothing logged yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--mt-border)]">
      {rows.slice(0, MAX_ROWS).map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onEdit(row.id)}
            className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-[var(--mt-text)]">
                {rangeLabel(row)}
              </span>
              <span className="text-xs text-[var(--mt-text-muted)]">
                {detailLabel(row)}
              </span>
            </span>
            <Pencil size={16} className="text-[var(--mt-text-subtle)]" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/cycle/PeriodHistory.tsx
git commit -m "feat: list past periods with their lengths and gaps"
```

---

### Task 14: The symptom chips

**Files:**
- Create: `src/components/cycle/SymptomChips.tsx`

**Interfaces:**
- Consumes: `SYMPTOMS` from Task 2; `formatShortDate` from Task 1.
- Produces: default export `SymptomChips`, taking `{ date, selected, onToggle }`. `selected` is `readonly string[]`.

- [ ] **Step 1: Write the component**

Create `src/components/cycle/SymptomChips.tsx`:

```tsx
import { SYMPTOMS } from '@/lib/cycle';
import { formatShortDate } from '@/lib/cycleDates';

export default function SymptomChips({
  date,
  selected,
  onToggle,
}: {
  date: string;
  selected: readonly string[];
  onToggle: (symptom: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
        How {formatShortDate(date)} felt
      </div>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((symptom) => {
          const active = selected.includes(symptom);
          return (
            <button
              key={symptom}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(symptom)}
              className="min-h-11 rounded-full border px-4 text-sm transition-colors"
              style={{
                borderColor: active ? 'transparent' : 'var(--mt-border)',
                background: active ? 'var(--mt-accent)' : 'transparent',
                color: active
                  ? 'var(--mt-accent-contrast)'
                  : 'var(--mt-text-muted)',
              }}
            >
              {symptom}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/cycle/SymptomChips.tsx
git commit -m "feat: add per-day symptom chips"
```

---

### Task 15: Wire it together

**Files:**
- Create: `src/components/cycle/CycleBoard.tsx`
- Modify: `src/app/(life)/cycle/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–14.
- Produces: default export `CycleBoard`.

- [ ] **Step 1: Write the board**

Create `src/components/cycle/CycleBoard.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleDot, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useHasMounted } from '@/hooks/useHasMounted';
import {
  SYMPTOMS,
  VALIDATION_MESSAGES,
  summarizeCycle,
  validateEnd,
  validateStart,
  type PeriodLog,
} from '@/lib/cycle';
import {
  buildCalendarMonth,
  historyRows,
} from '@/lib/cycleCalendar';
import { addMonths, monthOf, todayISO } from '@/lib/cycleDates';
import {
  deletePeriod,
  fetchPeriods,
  fetchSymptoms,
  insertPeriod,
  saveSymptoms,
  updatePeriod,
} from '@/lib/cycleRepo';
import CycleCalendar from './CycleCalendar';
import CycleRing from './CycleRing';
import LogPeriodModal, { type LogMode } from './LogPeriodModal';
import PeriodHistory from './PeriodHistory';
import SymptomChips from './SymptomChips';

type View = 'ring' | 'calendar';

const VIEW_KEY = 'cycle_view';

interface ModalState {
  mode: LogMode;
  editingId: string | null;
  initialDate: string;
  initialEndDate: string | null;
}

export default function CycleBoard() {
  const mounted = useHasMounted();
  const today = mounted ? todayISO() : '';

  const [view, setView] = useState<View>('ring');
  const [logs, setLogs] = useState<PeriodLog[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [month, setMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [symptoms, setSymptoms] = useState<Record<string, string[]>>({});
  const [modal, setModal] = useState<ModalState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem(VIEW_KEY);
    if (stored === 'ring' || stored === 'calendar') setView(stored);
    setMonth(monthOf(todayISO()));
    setSelectedDate(todayISO());
  }, [mounted]);

  const load = useCallback(async () => {
    const rows = await fetchPeriods();
    if (rows === null) {
      setFailed(true);
      return;
    }
    setLogs(rows);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  useEffect(() => {
    if (month === '') return;
    (async () => {
      const from = `${addMonths(month, -1)}-01`;
      const to = `${addMonths(month, 1)}-28`;
      const rows = await fetchSymptoms(from, to);
      if (rows) setSymptoms((current) => ({ ...current, ...rows }));
    })();
  }, [month]);

  const chooseView = (next: View) => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const summary = useMemo(
    () => summarizeCycle(logs ?? [], today || '1970-01-01'),
    [logs, today],
  );

  const symptomDates = useMemo(
    () =>
      new Set(
        Object.entries(symptoms)
          .filter(([, list]) => list.length > 0)
          .map(([date]) => date),
      ),
    [symptoms],
  );

  const days = useMemo(
    () =>
      month === ''
        ? []
        : buildCalendarMonth({
            month,
            logs: logs ?? [],
            today,
            symptomDates,
          }),
    [month, logs, today, symptomDates],
  );

  const rows = useMemo(() => historyRows(logs ?? []), [logs]);
  const openPeriod = rows.find((row) => row.endDate === null) ?? null;

  const closeModal = () => {
    setModal(null);
    setSaveError(null);
  };

  const handleSave = async (date: string, endDate: string | null) => {
    if (!modal || !logs) return;

    const startError = validateStart(date, logs, today, modal.editingId);
    if (startError) {
      setSaveError(VALIDATION_MESSAGES[startError]);
      return;
    }
    if (endDate !== null) {
      const endError = validateEnd(endDate, date, today);
      if (endError) {
        setSaveError(VALIDATION_MESSAGES[endError]);
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);

    const ok =
      modal.editingId === null
        ? await insertPeriod(date)
        : await updatePeriod(modal.editingId, date, endDate);

    setIsSaving(false);

    if (!ok) {
      setSaveError('Could not save. Check your connection and try again.');
      return;
    }

    await load();
    closeModal();
  };

  const handleDelete = async () => {
    if (!modal?.editingId) return;
    setIsSaving(true);
    const ok = await deletePeriod(modal.editingId);
    setIsSaving(false);
    if (!ok) {
      setSaveError('Could not delete. Check your connection and try again.');
      return;
    }
    await load();
    closeModal();
  };

  const toggleSymptom = async (symptom: string) => {
    const current = symptoms[selectedDate] ?? [];
    const next = current.includes(symptom)
      ? current.filter((item) => item !== symptom)
      : [...current, symptom].sort(
          (a, b) => SYMPTOMS.indexOf(a as never) - SYMPTOMS.indexOf(b as never),
        );

    setSymptoms((all) => ({ ...all, [selectedDate]: next }));
    const ok = await saveSymptoms(selectedDate, next);
    if (!ok) setSymptoms((all) => ({ ...all, [selectedDate]: current }));
  };

  if (!mounted || (logs === null && !failed)) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>
      </Card>
    );
  }

  if (failed) {
    return (
      <Card className="mb-4">
        <p className="text-sm text-[var(--mt-text)]">Could not load.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            load();
          }}
          className="mt-3 min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Try again
        </button>
      </Card>
    );
  }

  const primaryLabel = openPeriod ? 'My period stopped' : 'I got my period';

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex gap-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
        {(
          [
            { key: 'ring', label: 'Now', icon: CircleDot },
            { key: 'calendar', label: 'Month', icon: CalendarDays },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => chooseView(key)}
            aria-pressed={view === key}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full text-xs font-semibold ${
              view === key ? '' : 'text-[var(--mt-text-muted)]'
            }`}
            style={
              view === key
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <Card>
        {summary.headline.kind === 'no-data' ||
        summary.dayOfCycle === null ||
        summary.phase === null ||
        summary.nextStart === null ? (
          <div className="py-6 text-center">
            <p className="text-base font-medium text-[var(--mt-text)]">
              Tell me when your last period started
            </p>
            <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
              Everything else follows from that one date.
            </p>
          </div>
        ) : view === 'ring' ? (
          <CycleRing
            cycleLength={summary.cycleLength}
            periodLength={summary.periodLength}
            dayOfCycle={summary.dayOfCycle}
            phase={summary.phase}
            headline={summary.headline}
            nextStart={summary.nextStart}
            confidence={summary.confidence}
          />
        ) : (
          <CycleCalendar
            month={month}
            days={days}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onMonth={(step) => setMonth((current) => addMonths(current, step))}
          />
        )}
      </Card>

      <button
        type="button"
        onClick={() =>
          setModal(
            openPeriod
              ? {
                  mode: 'end',
                  editingId: openPeriod.id,
                  initialDate: openPeriod.startDate,
                  initialEndDate: today,
                }
              : {
                  mode: 'start',
                  editingId: null,
                  initialDate: today,
                  initialEndDate: null,
                },
          )
        }
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)]"
      >
        <Plus size={18} aria-hidden />
        {primaryLabel}
      </button>

      <Card>
        <SymptomChips
          date={view === 'calendar' ? selectedDate : today}
          selected={symptoms[view === 'calendar' ? selectedDate : today] ?? []}
          onToggle={toggleSymptom}
        />
      </Card>

      <Card>
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
          History
        </div>
        <PeriodHistory
          rows={rows}
          onEdit={(id) => {
            const row = rows.find((entry) => entry.id === id)!;
            setModal({
              mode: 'edit',
              editingId: row.id,
              initialDate: row.startDate,
              initialEndDate: row.endDate,
            });
          }}
        />
      </Card>

      <p className="px-1 text-xs text-[var(--mt-text-subtle)]">
        These are estimates worked out from dates alone. Not a way to avoid or
        plan a pregnancy, and not medical advice.
      </p>

      {modal && (
        <LogPeriodModal
          mode={modal.mode}
          today={today}
          initialDate={modal.initialDate}
          initialEndDate={modal.initialEndDate}
          error={saveError}
          isSaving={isSaving}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={modal.mode === 'edit' ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the page**

Replace the entire contents of `src/app/(life)/cycle/page.tsx` with:

```tsx
import PageShell from '@/components/ui/PageShell';
import CycleBoard from '@/components/cycle/CycleBoard';

export default function CyclePage() {
  return (
    <PageShell
      title="Period"
      subtitle="Cycle tracking, shared between both of us"
      accent="cycle"
    >
      <CycleBoard />
    </PageShell>
  );
}
```

- [ ] **Step 3: Typecheck, lint, and test**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Verify in the browser**

Start the dev server through the preview tooling (never a raw shell command), open `/cycle`, and confirm:

1. The empty state appears with no data — not a 28-day prediction.
2. "I got my period" opens the picker; the quick-set buttons change the date.
3. After saving a start, the button becomes "My period stopped".
4. The ring shows a phase name, a countdown, and the legend.
5. The Month toggle shows joined stripes; paging months keeps working.
6. Reloading keeps the chosen view.

Check `read_console_messages` for errors before moving on.

- [ ] **Step 5: Commit**

```bash
git add src/components/cycle/CycleBoard.tsx "src/app/(life)/cycle/page.tsx"
git commit -m "feat: build the period page on real data"
```

---

### Task 16: The hub tile

**Files:**
- Modify: `src/components/HubGrid.tsx`

**Interfaces:**
- Consumes: `hubCycleLabel`, `summarizeCycle` from Task 4; `todayISO` from Task 1; `fetchPeriods` from Task 9.
- Produces: nothing new.

- [ ] **Step 1: Remove `/cycle` from the inert set**

In `src/components/HubGrid.tsx`, change the `INERT` set so it no longer contains `'/cycle'`:

```ts
const INERT = new Set([
  '/countdown',
  '/meals',
  '/fitness',
  '/finance',
]);
```

- [ ] **Step 2: Load the summary**

Add these imports at the top of the file:

```ts
import { useEffect, useState } from 'react';
import { hubCycleLabel, summarizeCycle, type PeriodLog } from '@/lib/cycle';
import { todayISO } from '@/lib/cycleDates';
import { fetchPeriods } from '@/lib/cycleRepo';
```

Inside `HubGrid`, after the existing `sessions` line, add:

```ts
  const [cycleLogs, setCycleLogs] = useState<PeriodLog[] | null>(null);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const rows = await fetchPeriods();
      if (rows) setCycleLogs(rows);
    })();
  }, [mounted]);

  const cycleLabel =
    cycleLogs === null
      ? null
      : hubCycleLabel(summarizeCycle(cycleLogs, todayISO()));
```

- [ ] **Step 3: Use it in the tile**

Replace the tile's subtitle span:

```tsx
            <span className="text-xs text-[var(--mt-text-muted)]">
              {INERT.has(href)
                ? 'Coming soon'
                : href === '/cycle'
                  ? (cycleLabel ?? 'Open')
                  : 'Open'}
            </span>
```

- [ ] **Step 4: Typecheck, lint, and test**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: no errors, all tests pass.

- [ ] **Step 5: Verify in the browser**

Reload `/` and confirm the Period tile reads a real state (`Period in N days`, `Day N of period`, `N days late`, `Period today`, or `Not set up yet`) rather than "Coming soon".

- [ ] **Step 6: Commit**

```bash
git add src/components/HubGrid.tsx
git commit -m "feat: show the cycle countdown on the hub tile"
```

---

### Task 17: Human verification checklist

**Files:**
- Create: `docs/superpowers/verification/2026-08-16-cycle-tracking.md`

This follows the precedent set by the timetable checklist (commit `bcc5cfd`).

- [ ] **Step 1: Write the checklist**

Create `docs/superpowers/verification/2026-08-16-cycle-tracking.md`:

```markdown
# Cycle tracking — human verification

Run through this on a phone-sized window with the dev server up.

## First run

- [ ] With `cycle_periods` empty, `/cycle` says "Tell me when your last period
      started" and shows no countdown, no ring, and no predicted days.
- [ ] The hub tile reads "Not set up yet".

## Logging

- [ ] "I got my period" opens a sheet with today's date already filled.
- [ ] Yesterday and 2 days ago set the field correctly.
- [ ] A future date is refused with "That day has not happened yet."
- [ ] After saving, the button reads "My period stopped".
- [ ] Saving a stop date turns the button back to "I got my period".
- [ ] Logging the same start date twice is refused.

## Prediction

- [ ] With one period logged, the ring says it is using a 28-day guess.
- [ ] With two logged 29 days apart, the ring says Day N of 29.
- [ ] Editing a start date in History immediately changes the ring, the month,
      and the hub tile.
- [ ] Deleting the only period returns the page to the empty state.

## Late

- [ ] Set a start date more than one cycle ago; the ring reads "N days late",
      never a negative number.
- [ ] Log a period covering today while late; the ring switches to "Day N of
      your period".

## The two views

- [ ] The toggle switches between Now and Month.
- [ ] The chosen view survives a page reload.
- [ ] In Month, days of the same phase join into one stripe with rounded ends
      only at the ends of the run.
- [ ] Recorded period days are solid; predicted ones are dashed.
- [ ] Today is a dark filled circle and its number is readable.
- [ ] Paging back before the first logged period shows an uncoloured month.
- [ ] Every day number is readable on its fill, including out-of-month days.

## Symptoms

- [ ] Tapping a chip fills it and it stays filled after a reload.
- [ ] In Month, tapping a day changes which date the chips apply to.
- [ ] A day with symptoms shows a small dot in the month grid.

## Offline

- [ ] Turn off the network and press Save: the sheet stays open with the typed
      date still in it and shows an error.
- [ ] Turn the network back on and press Save again: it succeeds.

## Everything else

- [ ] The estimate/not-medical-advice line is visible at the bottom.
- [ ] No console errors on load, on save, or when paging months.
- [ ] Every button is at least 44px tall.
```

- [ ] **Step 2: Work through the checklist**

Run the dev server through the preview tooling and tick each box. Fix anything that fails before committing, writing a failing test first for any bug in a `lib/` module.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/verification/2026-08-16-cycle-tracking.md
git commit -m "docs: add the cycle tracking human verification checklist"
```

---

## Self-Review Notes

Checked against the spec:

- **D31–D33** — Tasks 9, 12, 15. No owner column; picker defaults to today; one button that changes meaning.
- **D34–D35** — Task 2, with explicit tests for the 15/60 and 1/14 windows and the six-sample cap.
- **D36–D37** — Task 3, including an exhaustive sweep proving the fertile band never overlaps the bleed.
- **D38–D39** — Task 4, including a 200-day sweep proving no negative count is reachable.
- **D40** — no derived value is written anywhere; `CycleBoard` recomputes through `useMemo` and reloads after every mutation.
- **D41** — Task 6 `anchorsFor`, tested by the irregular-cycle case.
- **D42** — Task 6 sets `recorded`/`predicted` as separate flags and `predicted` excludes recorded days; Task 11 renders them differently.
- **D43** — Task 8 `TINT.outOfMonth`, Task 11 `fillFor`; day numbers are always `--mt-text`.
- **D44** — Task 10 renders both the centre phase name and the legend; Task 8 pins the contrast floor.
- **D45** — Task 15 keeps the modal mounted and the draft intact on failure; no Dexie anywhere.
- **D46** — Task 15's empty-state branch and Task 10's `confidenceNote`.
- **D47** — Task 1; no `Date` leaves `cycleDates.ts` except `todayISO`'s parameter.
- **D48** — Task 2's `SYMPTOMS`, Task 9's `saveSymptoms`, Task 14's chips.
- **D49** — Task 15's `VIEW_KEY` behind `useHasMounted`.
- **D50** — Task 6's `MAX_PROJECTED_CYCLES`, tested.
- **D51** — Task 15's closing paragraph.
- **§8 testing list** — every listed case appears in Tasks 1–8.
