# Meals Photo Story and Calorie Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inert `/meals` shell with a working shared photo diary — both people photograph their meals, each day becomes a browsable story, and Gemini estimates calories that the eater confirms.

**Architecture:** Pure logic lives in four `lib/` modules that Vitest can test with no DOM. Photos are captured through the phone's native camera, resized to two sizes in the browser, written to IndexedDB first and synced to Supabase Storage after. Gemini is called from two server route handlers so the API key never reaches the browser. Build order runs logic → storage → story → estimator → weeks, so the photo half is complete and usable before any AI work starts.

**Tech Stack:** Next.js 16.2 (App Router, Turbopack), React 19.2, TypeScript strict, Tailwind v4, Dexie (IndexedDB), Supabase (Postgres + Storage), `@google/genai`, Vitest.

**Spec:** [docs/superpowers/specs/2026-08-23-meals-photo-story-design.md](../specs/2026-08-23-meals-photo-story-design.md)

## Global Constraints

Copied from the project's `CLAUDE.md`. These bind every task.

- **Do not write comments.** Names and structure carry the meaning.
- **Never hardcode a colour.** Reference `--mt-*` semantic tokens in components. The meals accent is `#D9AC80` and reaches components as `--mt-accent` via `PageShell`.
- **Avoid overly defensive programming.** No guards for states the types already exclude.
- **Avoid instance checks.** No `instanceof`, no `typeof` branching to discriminate shapes. Model unions properly and branch on a discriminant field.
- **Handle exceptions only where there is something to do about them.** Storage, IndexedDB and network calls catch. Pure functions do not.
- TypeScript strict. Server Components by default; `'use client'` only on the leaf that needs it.
- Grid over flex percentage maths. `min-h-dvh`, never `h-screen`. Touch targets at least 44px.
- Dates and times are plain strings (`YYYY-MM-DD`, `HH:MM`) everywhere. No `Date` object crosses a module boundary.
- Tests sit beside their source as `*.test.ts`. Vitest runs in a `node` environment — **there is no DOM and no `document`**. Anything needing a browser cannot be unit-tested; extract the pure part and test that.
- **Commits carry NO `Co-Authored-By` trailer and no generated-with attribution.** Commit as Jeff's account only.
- Next.js 16 is not the Next.js in training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any App Router code.

## Prerequisites (Jeff's actions, not tasks)

These are outside the repo. Tasks 1–9 work without them; Task 10 onward needs the third.

1. **Deploy the app.** Connect the repo to Vercel and move `.env.local` into its environment settings. Camera access requires HTTPS; `localhost` will not do for a phone in a restaurant.
2. **Run the SQL** from spec §4 in Supabase, and create a storage bucket named `meal-photos` with public listing disabled. The `/cycle` tables from the 2026-08-16 spec are also still pending — run both together.
3. **Add `GEMINI_API_KEY`** to the host's environment. No `NEXT_PUBLIC_` prefix.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/meals.ts` | Shared types only. No logic. |
| `src/lib/mealDay.ts` | The 4am day boundary, slot guessing, day completeness and totals. |
| `src/lib/mealStory.ts` | Ordering one day's meals from both people into one timeline. |
| `src/lib/mealEstimate.ts` | Portion multipliers and the low-confidence rule. |
| `src/lib/mealWeek.ts` | Week boundaries, which days are sealed, week totals. |
| `src/lib/mealImage.ts` | Target dimensions (pure) and canvas resize (browser). |
| `src/lib/mealRepo.ts` | Every Supabase read and write. Mirrors `calendarRepo.ts`. |
| `src/lib/mealQueue.ts` | The Dexie pending-upload queue and its sync pass. |
| `src/db/db.ts` | Modified: adds `pendingMeals` at `version(5)`. |
| `src/app/api/meals/estimate/route.ts` | Gemini call for one meal, photo or text. |
| `src/app/api/meals/review/route.ts` | Gemini call for one person's week. |
| `src/app/(life)/meals/page.tsx` | Modified: renders `MealsBoard` instead of samples. |
| `src/components/meals/MealsBoard.tsx` | Page body. Owns month cursor and fetched data. |
| `src/components/meals/MealMonthGrid.tsx` | The month grid of day squares. |
| `src/components/meals/DayStory.tsx` | Full-screen sheet for one day. |
| `src/components/meals/CameraButton.tsx` | Native camera trigger. |
| `src/components/meals/ConfirmCard.tsx` | Dish, calories, portion buttons. |
| `src/components/meals/MealEditor.tsx` | Edit or delete one meal. |
| `src/components/meals/UnfinishedDayCard.tsx` | The 8am nudge and gap-fill. |
| `src/components/meals/WeekCard.tsx` | Week totals, bars, review button. |

## A correction to the spec

Spec §5 describes `storyOrder` sorting by `at_time`. **That is wrong and Task 2 fixes it.** Because a food day runs 04:00 → 04:00, a supper eaten at 01:00 is the *last* meal of its day, but `'01:00'` sorts before `'08:00'` as a plain string, so it would appear at the top of the story above breakfast. The sort key must be minutes elapsed since 04:00, not clock time. Task 2 has a test pinning exactly this.

---

### Task 1: Types and the day boundary

**Files:**
- Create: `src/lib/meals.ts`
- Create: `src/lib/mealDay.ts`
- Test: `src/lib/mealDay.test.ts`

**Interfaces:**
- Consumes: `UserName` from `src/lib/identity.ts`; `todayISO` from `src/lib/dates.ts`.
- Produces: every type in `meals.ts`, used by all later tasks. From `mealDay.ts`: `DAY_BOUNDARY_HOUR`, `mealDate(at: Date): string`, `slotForTime(at: Date): MealSlot`, `isComplete(entries: MealEntry[]): boolean`, `missingSlots(entries: MealEntry[]): MealSlot[]`, `dayTotal(entries: MealEntry[]): number`, `intakeFor(entries: MealEntry[], date: string, owner: UserName): number`.

- [ ] **Step 1: Write the types**

Create `src/lib/meals.ts`:

```ts
import type { UserName } from '@/lib/identity';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealSource = 'photo' | 'typed';
export type Confidence = 'high' | 'medium' | 'low';
export type Portion = 'smaller' | 'normal' | 'larger';

export interface MealPhoto {
  fullPath: string;
  thumbPath: string;
}

export interface MealEntry {
  id: string;
  owner: UserName;
  date: string;
  atTime: string | null;
  slot: MealSlot;
  photo: MealPhoto | null;
  dish: string;
  calories: number;
  source: MealSource;
  updatedAt: string;
}

export interface MealDay {
  date: string;
  owner: UserName;
  sealed: boolean;
}

export interface MealReview {
  weekStart: string;
  owner: UserName;
  body: string;
  stale: boolean;
  createdAt: string;
}

export interface WeekTotals {
  byDate: Record<string, number>;
  total: number;
  sealedCount: number;
}

export interface Estimate {
  dish: string;
  detail: string;
  calories: number;
  confidence: Confidence;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/mealDay.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  dayTotal,
  intakeFor,
  isComplete,
  mealDate,
  missingSlots,
  slotForTime,
} from './mealDay';
import type { MealEntry, MealSlot } from './meals';
import type { UserName } from './identity';

function entry(
  slot: MealSlot,
  calories: number,
  date = '2026-08-23',
  owner: UserName = 'Jeff',
): MealEntry {
  return {
    id: `${owner}-${date}-${slot}-${calories}`,
    owner,
    date,
    atTime: null,
    slot,
    photo: null,
    dish: slot,
    calories,
    source: 'typed',
    updatedAt: '2026-08-23T00:00:00Z',
  };
}

function at(hour: number, minute = 0): Date {
  return new Date(2026, 7, 23, hour, minute);
}

describe('mealDate', () => {
  it('files supper before 4am under the previous day', () => {
    expect(mealDate(at(1))).toBe('2026-08-22');
  });

  it('files breakfast under the current day', () => {
    expect(mealDate(at(7))).toBe('2026-08-23');
  });

  it('starts the new day at 4am exactly', () => {
    expect(mealDate(at(4))).toBe('2026-08-23');
  });

  it('keeps 3:59am on the previous day', () => {
    expect(mealDate(at(3, 59))).toBe('2026-08-22');
  });

  it('files late evening under the current day', () => {
    expect(mealDate(at(23, 30))).toBe('2026-08-23');
  });
});

describe('slotForTime', () => {
  it('covers every band', () => {
    expect(slotForTime(at(4))).toBe('breakfast');
    expect(slotForTime(at(10, 59))).toBe('breakfast');
    expect(slotForTime(at(11))).toBe('lunch');
    expect(slotForTime(at(15, 59))).toBe('lunch');
    expect(slotForTime(at(16))).toBe('dinner');
    expect(slotForTime(at(21, 59))).toBe('dinner');
    expect(slotForTime(at(22))).toBe('snack');
    expect(slotForTime(at(3, 59))).toBe('snack');
  });
});

describe('isComplete', () => {
  it('is false without dinner', () => {
    expect(isComplete([entry('breakfast', 300), entry('lunch', 600)])).toBe(false);
  });

  it('is true with all three', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('dinner', 700)];
    expect(isComplete(day)).toBe(true);
  });

  it('does not require a snack', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('dinner', 700)];
    expect(isComplete([...day, entry('snack', 150)])).toBe(true);
  });

  it('is false for an empty day', () => {
    expect(isComplete([])).toBe(false);
  });
});

describe('missingSlots', () => {
  it('names what is absent, in meal order', () => {
    expect(missingSlots([entry('lunch', 600)])).toEqual(['breakfast', 'dinner']);
  });

  it('is empty for a complete day', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('dinner', 700)];
    expect(missingSlots(day)).toEqual([]);
  });

  it('never names snack', () => {
    expect(missingSlots([])).toEqual(['breakfast', 'lunch', 'dinner']);
  });
});

describe('dayTotal', () => {
  it('sums every entry including snacks', () => {
    const day = [entry('breakfast', 300), entry('lunch', 600), entry('snack', 150)];
    expect(dayTotal(day)).toBe(1050);
  });

  it('is zero for an empty day', () => {
    expect(dayTotal([])).toBe(0);
  });
});

describe('intakeFor', () => {
  const mixed = [
    entry('breakfast', 300, '2026-08-23', 'Jeff'),
    entry('lunch', 600, '2026-08-23', 'Rachel'),
    entry('dinner', 700, '2026-08-22', 'Jeff'),
    entry('dinner', 800, '2026-08-23', 'Jeff'),
  ];

  it('counts one person on one day', () => {
    expect(intakeFor(mixed, '2026-08-23', 'Jeff')).toBe(1100);
  });

  it('excludes the other person', () => {
    expect(intakeFor(mixed, '2026-08-23', 'Rachel')).toBe(600);
  });

  it('is zero for a day with nothing', () => {
    expect(intakeFor(mixed, '2026-08-21', 'Jeff')).toBe(0);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx vitest run src/lib/mealDay.test.ts
```

Expected: FAIL — cannot resolve `./mealDay`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/mealDay.ts`:

```ts
import { todayISO } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import type { MealEntry, MealSlot } from '@/lib/meals';

const MS_PER_HOUR = 3_600_000;

export const DAY_BOUNDARY_HOUR = 4;

const REQUIRED_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export function mealDate(at: Date): string {
  return todayISO(new Date(at.getTime() - DAY_BOUNDARY_HOUR * MS_PER_HOUR));
}

export function slotForTime(at: Date): MealSlot {
  const hour = at.getHours();
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

export function missingSlots(entries: MealEntry[]): MealSlot[] {
  const present = new Set(entries.map((entry) => entry.slot));
  return REQUIRED_SLOTS.filter((slot) => !present.has(slot));
}

export function isComplete(entries: MealEntry[]): boolean {
  return missingSlots(entries).length === 0;
}

export function dayTotal(entries: MealEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.calories, 0);
}

export function intakeFor(
  entries: MealEntry[],
  date: string,
  owner: UserName,
): number {
  return dayTotal(
    entries.filter((entry) => entry.date === date && entry.owner === owner),
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx vitest run src/lib/mealDay.test.ts
```

Expected: PASS, 18 tests.

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both silent.

- [ ] **Step 7: Commit**

```bash
git add src/lib/meals.ts src/lib/mealDay.ts src/lib/mealDay.test.ts
git commit -m "feat(meals): add meal types and the 4am day boundary"
```

---

### Task 2: Story ordering

**Files:**
- Create: `src/lib/mealStory.ts`
- Test: `src/lib/mealStory.test.ts`

**Interfaces:**
- Consumes: `MealEntry`, `MealSlot` from `src/lib/meals.ts`; `DAY_BOUNDARY_HOUR` from `src/lib/mealDay.ts`.
- Produces: `storyOrder(entries: MealEntry[]): MealEntry[]` — returns a new array, never mutates its argument.

**Why the sort key is not the clock time:** a food day runs 04:00 → 04:00. Supper at 01:00 is the last meal of that day, but `'01:00' < '08:00'` as a string, so sorting by clock time puts supper above breakfast. The key is minutes elapsed since 04:00.

- [ ] **Step 1: Write the failing test**

Create `src/lib/mealStory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { storyOrder } from './mealStory';
import type { MealEntry, MealSlot } from './meals';
import type { UserName } from './identity';

function entry(
  id: string,
  slot: MealSlot,
  atTime: string | null,
  owner: UserName = 'Jeff',
): MealEntry {
  return {
    id,
    owner,
    date: '2026-08-23',
    atTime,
    slot,
    photo: null,
    dish: id,
    calories: 500,
    source: atTime === null ? 'typed' : 'photo',
    updatedAt: '2026-08-23T00:00:00Z',
  };
}

function ids(entries: MealEntry[]): string[] {
  return entries.map((entry) => entry.id);
}

describe('storyOrder', () => {
  it('sorts supper after 4am to the end of its day', () => {
    const day = [
      entry('supper', 'snack', '01:00'),
      entry('breakfast', 'breakfast', '08:00'),
      entry('dinner', 'dinner', '19:00'),
    ];
    expect(ids(storyOrder(day))).toEqual(['breakfast', 'dinner', 'supper']);
  });

  it('interleaves two people rather than grouping them', () => {
    const day = [
      entry('jeff-dinner', 'dinner', '19:30', 'Jeff'),
      entry('rachel-breakfast', 'breakfast', '07:30', 'Rachel'),
      entry('jeff-breakfast', 'breakfast', '08:00', 'Jeff'),
      entry('rachel-lunch', 'lunch', '12:30', 'Rachel'),
    ];
    expect(ids(storyOrder(day))).toEqual([
      'rachel-breakfast',
      'jeff-breakfast',
      'rachel-lunch',
      'jeff-dinner',
    ]);
  });

  it('places a timeless entry at its slot rather than at the start', () => {
    const day = [
      entry('breakfast', 'breakfast', '08:00'),
      entry('typed-dinner', 'dinner', null),
      entry('lunch', 'lunch', '12:00'),
    ];
    expect(ids(storyOrder(day))).toEqual(['breakfast', 'lunch', 'typed-dinner']);
  });

  it('never sorts breakfast after dinner', () => {
    const day = [entry('dinner', 'dinner', null), entry('breakfast', 'breakfast', null)];
    expect(ids(storyOrder(day))).toEqual(['breakfast', 'dinner']);
  });

  it('returns a single meal unchanged', () => {
    const day = [entry('only', 'lunch', '13:00')];
    expect(ids(storyOrder(day))).toEqual(['only']);
  });

  it('does not mutate its argument', () => {
    const day = [entry('b', 'dinner', '19:00'), entry('a', 'breakfast', '08:00')];
    storyOrder(day);
    expect(ids(day)).toEqual(['b', 'a']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/mealStory.test.ts
```

Expected: FAIL — cannot resolve `./mealStory`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/mealStory.ts`:

```ts
import { DAY_BOUNDARY_HOUR } from '@/lib/mealDay';
import type { MealEntry, MealSlot } from '@/lib/meals';

const MINUTES_PER_DAY = 1440;

const NOMINAL_TIME: Record<MealSlot, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00',
  snack: '22:00',
};

function minutesSinceBoundary(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  const offset = hour * 60 + minute - DAY_BOUNDARY_HOUR * 60;
  return (offset + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function sortKey(entry: MealEntry): number {
  return minutesSinceBoundary(entry.atTime ?? NOMINAL_TIME[entry.slot]);
}

export function storyOrder(entries: MealEntry[]): MealEntry[] {
  return [...entries].sort((a, b) => sortKey(a) - sortKey(b));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/mealStory.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/mealStory.ts src/lib/mealStory.test.ts
git commit -m "feat(meals): order a day's meals from both people into one timeline"
```

---

### Task 3: Portion scaling

**Files:**
- Create: `src/lib/mealEstimate.ts`
- Test: `src/lib/mealEstimate.test.ts`

**Interfaces:**
- Consumes: `Confidence`, `Portion` from `src/lib/meals.ts`.
- Produces: `PORTION_SMALLER`, `PORTION_LARGER`, `scaleForPortion(calories: number, portion: Portion): number`, `needsManualEntry(confidence: Confidence): boolean`.

The two multipliers are judgement calls, not measurements. The test pins them the way `accents.test.ts` pins the section colours, so changing one is a deliberate act visible in a diff.

- [ ] **Step 1: Write the failing test**

Create `src/lib/mealEstimate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PORTION_LARGER,
  PORTION_SMALLER,
  needsManualEntry,
  scaleForPortion,
} from './mealEstimate';

describe('portion multipliers', () => {
  it('pins smaller at 0.7', () => {
    expect(PORTION_SMALLER).toBe(0.7);
  });

  it('pins larger at 1.4', () => {
    expect(PORTION_LARGER).toBe(1.4);
  });
});

describe('scaleForPortion', () => {
  it('leaves a normal portion untouched', () => {
    expect(scaleForPortion(620, 'normal')).toBe(620);
  });

  it('scales down for a smaller portion', () => {
    expect(scaleForPortion(600, 'smaller')).toBe(420);
  });

  it('scales up for a larger portion', () => {
    expect(scaleForPortion(600, 'larger')).toBe(840);
  });

  it('rounds to a whole calorie', () => {
    expect(scaleForPortion(625, 'smaller')).toBe(438);
  });

  it('keeps zero at zero', () => {
    expect(scaleForPortion(0, 'larger')).toBe(0);
  });
});

describe('needsManualEntry', () => {
  it('is true only for low confidence', () => {
    expect(needsManualEntry('low')).toBe(true);
    expect(needsManualEntry('medium')).toBe(false);
    expect(needsManualEntry('high')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/mealEstimate.test.ts
```

Expected: FAIL — cannot resolve `./mealEstimate`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/mealEstimate.ts`:

```ts
import type { Confidence, Portion } from '@/lib/meals';

export const PORTION_SMALLER = 0.7;
export const PORTION_LARGER = 1.4;

const MULTIPLIER: Record<Portion, number> = {
  smaller: PORTION_SMALLER,
  normal: 1,
  larger: PORTION_LARGER,
};

export function scaleForPortion(calories: number, portion: Portion): number {
  return Math.round(calories * MULTIPLIER[portion]);
}

export function needsManualEntry(confidence: Confidence): boolean {
  return confidence === 'low';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/mealEstimate.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
npx tsc --noEmit && npm run lint
```

```bash
git add src/lib/mealEstimate.ts src/lib/mealEstimate.test.ts
git commit -m "feat(meals): pin portion multipliers and the low-confidence rule"
```

---

### Task 4: Weeks and totals

**Files:**
- Create: `src/lib/mealWeek.ts`
- Test: `src/lib/mealWeek.test.ts`

**Interfaces:**
- Consumes: `addDays`, `weekdayIndex` from `src/lib/dates.ts`; `MealDay`, `MealEntry`, `WeekTotals` from `src/lib/meals.ts`; `UserName` from `src/lib/identity.ts`.
- Produces: `weekStart(date: string): string`, `weekDates(start: string): string[]`, `sealedDates(days: MealDay[], week: string[], owner: UserName): string[]`, `weekTotals(entries: MealEntry[], sealed: string[], owner: UserName): WeekTotals`.

Weeks run Monday to Sunday. `weekdayIndex` in `dates.ts` is already Monday-based (Monday = 0), so no new date maths is needed. Unsealed days are excluded from totals entirely rather than counted partially.

- [ ] **Step 1: Write the failing test**

Create `src/lib/mealWeek.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sealedDates, weekDates, weekStart, weekTotals } from './mealWeek';
import type { MealDay, MealEntry } from './meals';
import type { UserName } from './identity';

function day(date: string, owner: UserName, sealed: boolean): MealDay {
  return { date, owner, sealed };
}

function entry(date: string, owner: UserName, calories: number): MealEntry {
  return {
    id: `${owner}-${date}-${calories}`,
    owner,
    date,
    atTime: '12:00',
    slot: 'lunch',
    photo: null,
    dish: 'lunch',
    calories,
    source: 'typed',
    updatedAt: '2026-08-23T00:00:00Z',
  };
}

describe('weekStart', () => {
  it('returns the Monday of a midweek date', () => {
    expect(weekStart('2026-08-19')).toBe('2026-08-17');
  });

  it('returns a Monday unchanged', () => {
    expect(weekStart('2026-08-17')).toBe('2026-08-17');
  });

  it('sends Sunday back six days, not forward one', () => {
    expect(weekStart('2026-08-23')).toBe('2026-08-17');
  });
});

describe('weekDates', () => {
  it('returns seven consecutive days from Monday', () => {
    expect(weekDates('2026-08-17')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ]);
  });
});

describe('sealedDates', () => {
  const week = weekDates('2026-08-17');
  const days = [
    day('2026-08-17', 'Jeff', true),
    day('2026-08-18', 'Jeff', false),
    day('2026-08-19', 'Jeff', true),
    day('2026-08-19', 'Rachel', true),
    day('2026-08-20', 'Rachel', true),
  ];

  it('returns sealed days for one owner only', () => {
    expect(sealedDates(days, week, 'Jeff')).toEqual(['2026-08-17', '2026-08-19']);
  });

  it('keeps the two people separate', () => {
    expect(sealedDates(days, week, 'Rachel')).toEqual(['2026-08-19', '2026-08-20']);
  });

  it('ignores sealed days outside the week', () => {
    const outside = [...days, day('2026-08-10', 'Jeff', true)];
    expect(sealedDates(outside, week, 'Jeff')).toEqual(['2026-08-17', '2026-08-19']);
  });
});

describe('weekTotals', () => {
  const entries = [
    entry('2026-08-17', 'Jeff', 500),
    entry('2026-08-17', 'Jeff', 600),
    entry('2026-08-18', 'Jeff', 900),
    entry('2026-08-19', 'Jeff', 700),
    entry('2026-08-17', 'Rachel', 400),
  ];

  it('counts only sealed days', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-19'], 'Jeff');
    expect(totals.total).toBe(1800);
  });

  it('excludes the unsealed day entirely', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-19'], 'Jeff');
    expect(totals.byDate['2026-08-18']).toBeUndefined();
  });

  it('reports how many days it looked at', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-19'], 'Jeff');
    expect(totals.sealedCount).toBe(2);
  });

  it('excludes the other person', () => {
    const totals = weekTotals(entries, ['2026-08-17'], 'Rachel');
    expect(totals.total).toBe(400);
  });

  it('gives a sealed day with no meals a zero rather than a gap', () => {
    const totals = weekTotals(entries, ['2026-08-17', '2026-08-21'], 'Jeff');
    expect(totals.byDate['2026-08-21']).toBe(0);
  });

  it('is empty when nothing is sealed', () => {
    const totals = weekTotals(entries, [], 'Jeff');
    expect(totals).toEqual({ byDate: {}, total: 0, sealedCount: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/mealWeek.test.ts
```

Expected: FAIL — cannot resolve `./mealWeek`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/mealWeek.ts`:

```ts
import { addDays, weekdayIndex } from '@/lib/dates';
import type { UserName } from '@/lib/identity';
import type { MealDay, MealEntry, WeekTotals } from '@/lib/meals';

export function weekStart(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sealedDates(
  days: MealDay[],
  week: string[],
  owner: UserName,
): string[] {
  const sealed = new Set(
    days.filter((day) => day.owner === owner && day.sealed).map((day) => day.date),
  );
  return week.filter((date) => sealed.has(date));
}

export function weekTotals(
  entries: MealEntry[],
  sealed: string[],
  owner: UserName,
): WeekTotals {
  const byDate: Record<string, number> = {};
  for (const date of sealed) byDate[date] = 0;

  for (const entry of entries) {
    if (entry.owner === owner && entry.date in byDate) {
      byDate[entry.date] += entry.calories;
    }
  }

  return {
    byDate,
    total: Object.values(byDate).reduce((sum, value) => sum + value, 0),
    sealedCount: sealed.length,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/mealWeek.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Run the whole suite**

```bash
npm test
```

Expected: every prior test still passes. Note the new total; later tasks report against it.

- [ ] **Step 6: Typecheck, lint and commit**

```bash
npx tsc --noEmit && npm run lint
```

```bash
git add src/lib/mealWeek.ts src/lib/mealWeek.test.ts
git commit -m "feat(meals): add week boundaries, sealing and totals"
```

---

### Task 5: Image sizing and resize

**Files:**
- Create: `src/lib/mealImage.ts`
- Test: `src/lib/mealImage.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FULL_MAX_EDGE`, `THUMB_MAX_EDGE`, `fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number }`, `resizeToPair(file: File): Promise<{ full: Blob; thumb: Blob }>`.

`fitWithin` is pure and tested. `resizeToPair` needs `document.createElement('canvas')` and `createImageBitmap`, neither of which exists in the Vitest `node` environment, so it is not unit-tested — it is exercised by the verification checklist on a real phone.

- [ ] **Step 1: Write the failing test**

Create `src/lib/mealImage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FULL_MAX_EDGE, THUMB_MAX_EDGE, fitWithin } from './mealImage';

describe('edge constants', () => {
  it('pins the full size at 800', () => {
    expect(FULL_MAX_EDGE).toBe(800);
  });

  it('pins the thumbnail at 200', () => {
    expect(THUMB_MAX_EDGE).toBe(200);
  });
});

describe('fitWithin', () => {
  it('shrinks a landscape photo by its width', () => {
    expect(fitWithin(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
  });

  it('shrinks a portrait photo by its height', () => {
    expect(fitWithin(3000, 4000, 800)).toEqual({ width: 600, height: 800 });
  });

  it('handles a square', () => {
    expect(fitWithin(2000, 2000, 200)).toEqual({ width: 200, height: 200 });
  });

  it('leaves an already small photo alone', () => {
    expect(fitWithin(640, 480, 800)).toEqual({ width: 640, height: 480 });
  });

  it('rounds to whole pixels', () => {
    expect(fitWithin(1000, 333, 800)).toEqual({ width: 800, height: 266 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/mealImage.test.ts
```

Expected: FAIL — cannot resolve `./mealImage`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/mealImage.ts`:

```ts
export const FULL_MAX_EDGE = 800;
export const THUMB_MAX_EDGE = 200;

const WEBP_QUALITY = 0.82;

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function drawTo(bitmap: ImageBitmap, maxEdge: number): Promise<Blob> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/webp', WEBP_QUALITY);
  });
}

export async function resizeToPair(
  file: File,
): Promise<{ full: Blob; thumb: Blob }> {
  const bitmap = await createImageBitmap(file);
  const [full, thumb] = await Promise.all([
    drawTo(bitmap, FULL_MAX_EDGE),
    drawTo(bitmap, THUMB_MAX_EDGE),
  ]);
  bitmap.close();
  return { full, thumb };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/mealImage.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
npx tsc --noEmit && npm run lint
```

```bash
git add src/lib/mealImage.ts src/lib/mealImage.test.ts
git commit -m "feat(meals): resize a captured photo to a full and thumbnail pair"
```

---

### Task 6: Supabase reads and writes

**Files:**
- Create: `src/lib/mealRepo.ts`
- Modify: `src/lib/supabase.ts` — append the meals schema to the comment block at the bottom
- Test: none. This is network I/O; there is nothing pure to assert.

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`; every type from `src/lib/meals.ts`; `weekStart` from `src/lib/mealWeek.ts`.
- Produces: `fetchMeals(from: string, to: string): Promise<MealEntry[] | null>`, `insertMeal(input: MealInput): Promise<MealEntry | null>`, `updateMeal(id: string, patch: MealPatch): Promise<MealEntry | null>`, `deleteMeal(entry: MealEntry): Promise<boolean>` — takes the whole entry, not an id, because it must remove the photo pair from storage too — `fetchDays(from: string, to: string): Promise<MealDay[] | null>`, `sealDay(date: string, owner: UserName): Promise<boolean>`, `uploadPhoto(owner: UserName, date: string, full: Blob, thumb: Blob): Promise<MealPhoto | null>`, `photoUrl(path: string): string`, `fetchReview(week: string, owner: UserName): Promise<MealReview | null>`, `saveReview(week: string, owner: UserName, body: string): Promise<boolean>`, `markReviewStale(week: string, owner: UserName): Promise<void>`.

Follow `src/lib/calendarRepo.ts` exactly: a private row interface, mapper functions from row to client type, every function returning `null` or `false` on failure after a `console.error`. Do not throw.

- [ ] **Step 1: Write the repository**

Create `src/lib/mealRepo.ts`:

```ts
import { supabase } from './supabase';
import { weekStart } from './mealWeek';
import type { UserName } from './identity';
import type {
  MealDay,
  MealEntry,
  MealPhoto,
  MealReview,
  MealSlot,
  MealSource,
} from './meals';

const BUCKET = 'meal-photos';

interface MealRow {
  id: string;
  owner: UserName;
  date: string;
  at_time: string | null;
  slot: MealSlot;
  photo_path: string | null;
  thumb_path: string | null;
  dish: string;
  calories: number;
  source: MealSource;
  updated_at: string;
}

interface DayRow {
  date: string;
  owner: UserName;
  sealed: boolean;
}

interface ReviewRow {
  week_start: string;
  owner: UserName;
  body: string;
  stale: boolean;
  created_at: string;
}

export interface MealInput {
  owner: UserName;
  date: string;
  atTime: string | null;
  slot: MealSlot;
  photo: MealPhoto | null;
  dish: string;
  calories: number;
  source: MealSource;
}

export interface MealPatch {
  dish?: string;
  calories?: number;
  slot?: MealSlot;
}

const MEAL_COLUMNS =
  'id, owner, date, at_time, slot, photo_path, thumb_path, dish, calories, source, updated_at';

function toPhoto(row: MealRow): MealPhoto | null {
  return row.photo_path === null || row.thumb_path === null
    ? null
    : { fullPath: row.photo_path, thumbPath: row.thumb_path };
}

function toEntry(row: MealRow): MealEntry {
  return {
    id: row.id,
    owner: row.owner,
    date: row.date,
    atTime: row.at_time === null ? null : row.at_time.slice(0, 5),
    slot: row.slot,
    photo: toPhoto(row),
    dish: row.dish,
    calories: row.calories,
    source: row.source,
    updatedAt: row.updated_at,
  };
}

export function photoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchMeals(
  from: string,
  to: string,
): Promise<MealEntry[] | null> {
  const { data, error } = await supabase
    .from('meal_entries')
    .select(MEAL_COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load meals:', error);
    return null;
  }

  return (data as MealRow[]).map(toEntry);
}

export async function uploadPhoto(
  owner: UserName,
  date: string,
  full: Blob,
  thumb: Blob,
): Promise<MealPhoto | null> {
  const id = crypto.randomUUID();
  const fullPath = `${owner}/${date}/${id}.webp`;
  const thumbPath = `${owner}/${date}/${id}-thumb.webp`;

  const bucket = supabase.storage.from(BUCKET);
  const [fullResult, thumbResult] = await Promise.all([
    bucket.upload(fullPath, full, { contentType: 'image/webp' }),
    bucket.upload(thumbPath, thumb, { contentType: 'image/webp' }),
  ]);

  if (fullResult.error || thumbResult.error) {
    console.error('Failed to upload photo:', fullResult.error ?? thumbResult.error);

    const orphans = [
      ...(fullResult.error ? [] : [fullPath]),
      ...(thumbResult.error ? [] : [thumbPath]),
    ];
    if (orphans.length > 0) await bucket.remove(orphans);

    return null;
  }

  return { fullPath, thumbPath };
}

export async function insertMeal(input: MealInput): Promise<MealEntry | null> {
  const { data, error } = await supabase
    .from('meal_entries')
    .insert({
      owner: input.owner,
      date: input.date,
      at_time: input.atTime,
      slot: input.slot,
      photo_path: input.photo?.fullPath ?? null,
      thumb_path: input.photo?.thumbPath ?? null,
      dish: input.dish.trim(),
      calories: input.calories,
      source: input.source,
      updated_at: new Date().toISOString(),
    })
    .select(MEAL_COLUMNS)
    .single();

  if (error) {
    console.error('Failed to add meal:', error);
    return null;
  }

  await markReviewStale(weekStart(input.date), input.owner);
  return toEntry(data as MealRow);
}

export async function updateMeal(
  id: string,
  patch: MealPatch,
): Promise<MealEntry | null> {
  const { data, error } = await supabase
    .from('meal_entries')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(MEAL_COLUMNS)
    .single();

  if (error) {
    console.error('Failed to update meal:', error);
    return null;
  }

  const entry = toEntry(data as MealRow);
  await markReviewStale(weekStart(entry.date), entry.owner);
  return entry;
}

export async function deleteMeal(entry: MealEntry): Promise<boolean> {
  const { error } = await supabase.from('meal_entries').delete().eq('id', entry.id);

  if (error) {
    console.error('Failed to delete meal:', error);
    return false;
  }

  if (entry.photo) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([entry.photo.fullPath, entry.photo.thumbPath]);

    if (storageError) console.error('Failed to remove meal photos:', storageError);
  }

  await markReviewStale(weekStart(entry.date), entry.owner);
  return true;
}

export async function fetchDays(
  from: string,
  to: string,
): Promise<MealDay[] | null> {
  const { data, error } = await supabase
    .from('meal_days')
    .select('date, owner, sealed')
    .gte('date', from)
    .lte('date', to);

  if (error) {
    console.error('Failed to load meal days:', error);
    return null;
  }

  return data as DayRow[];
}

export async function sealDay(date: string, owner: UserName): Promise<boolean> {
  const { error } = await supabase
    .from('meal_days')
    .upsert({ date, owner, sealed: true }, { onConflict: 'date,owner' });

  if (error) {
    console.error('Failed to seal day:', error);
    return false;
  }
  return true;
}

export async function fetchReview(
  week: string,
  owner: UserName,
): Promise<MealReview | null> {
  const { data, error } = await supabase
    .from('meal_reviews')
    .select('week_start, owner, body, stale, created_at')
    .eq('week_start', week)
    .eq('owner', owner)
    .maybeSingle();

  if (error) {
    console.error('Failed to load review:', error);
    return null;
  }
  if (data === null) return null;

  const row = data as ReviewRow;
  return {
    weekStart: row.week_start,
    owner: row.owner,
    body: row.body,
    stale: row.stale,
    createdAt: row.created_at,
  };
}

export async function saveReview(
  week: string,
  owner: UserName,
  body: string,
): Promise<boolean> {
  const { error } = await supabase.from('meal_reviews').upsert(
    {
      week_start: week,
      owner,
      body,
      stale: false,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'week_start,owner' },
  );

  if (error) {
    console.error('Failed to save review:', error);
    return false;
  }
  return true;
}

export async function markReviewStale(
  week: string,
  owner: UserName,
): Promise<void> {
  const { error } = await supabase
    .from('meal_reviews')
    .update({ stale: true })
    .eq('week_start', week)
    .eq('owner', owner);

  if (error) console.error('Failed to mark review stale:', error);
}
```

- [ ] **Step 2: Record the schema next to the others**

Append the SQL from spec §4 to the schema comment block at the bottom of `src/lib/supabase.ts`, after the calendar block, introduced the same way:

```
Supabase schema for meals (meals spec §4). Entries carry an owner because each
person's totals are their own; the story shows both. A food day runs 04:00 to
04:00, so `date` is stored rather than derived from a timestamp.
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both silent.

- [ ] **Step 4: Run the suite to confirm nothing regressed**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/mealRepo.ts src/lib/supabase.ts
git commit -m "feat(meals): add the Supabase repository and record its schema"
```

---

### Task 7: The offline capture queue

**Files:**
- Modify: `src/db/db.ts`
- Create: `src/lib/mealQueue.ts`
- Test: none. Dexie needs IndexedDB, which the `node` test environment does not provide.

**Interfaces:**
- Consumes: `db` from `src/db/db.ts`; `uploadPhoto`, `insertMeal` from `src/lib/mealRepo.ts`; `MealSlot`, `MealEntry` from `src/lib/meals.ts`.
- Produces: `PendingMeal` interface; `queueMeal(input: QueuedInput): Promise<number>`, `pendingFor(date: string): Promise<PendingMeal[]>`, `syncPendingMeals(): Promise<MealEntry[]>`.

A capture writes here first so a photo appears in today's square with no network at all. This mirrors `sessionSync.ts` — local write first, reconcile after.

- [ ] **Step 1: Add the Dexie table**

Modify `src/db/db.ts`. Add the interface above the `db` declaration:

```ts
export interface PendingMeal {
  id?: number;
  owner: UserName;
  date: string;
  atTime: string;
  slot: MealSlot;
  full: Blob;
  thumb: Blob;
  createdAt: number;
}
```

Add the imports it needs at the top:

```ts
import type { UserName } from '@/lib/identity';
import type { MealSlot } from '@/lib/meals';
```

Widen the typed handle:

```ts
const db = new Dexie('PomodoroDB') as Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>;
  pendingMeals: EntityTable<PendingMeal, 'id'>;
};
```

Append the new version after `version(4)`:

```ts
db.version(5).stores({
  sessions: '++id, date, mode, taskName, synced, userName',
  pendingMeals: '++id, date',
});
```

- [ ] **Step 2: Write the queue**

Create `src/lib/mealQueue.ts`:

```ts
import { db, type PendingMeal } from '@/db/db';
import { insertMeal, uploadPhoto } from '@/lib/mealRepo';
import type { UserName } from '@/lib/identity';
import type { MealEntry, MealSlot } from '@/lib/meals';

export interface QueuedInput {
  owner: UserName;
  date: string;
  atTime: string;
  slot: MealSlot;
  full: Blob;
  thumb: Blob;
}

export async function queueMeal(input: QueuedInput): Promise<number> {
  return db.pendingMeals.add({ ...input, createdAt: Date.now() });
}

export async function pendingFor(date: string): Promise<PendingMeal[]> {
  try {
    return await db.pendingMeals.where('date').equals(date).toArray();
  } catch (err) {
    console.error('Failed to read pending meals:', err);
    return [];
  }
}

async function flush(pending: PendingMeal): Promise<MealEntry | null> {
  const photo = await uploadPhoto(
    pending.owner,
    pending.date,
    pending.full,
    pending.thumb,
  );
  if (photo === null) return null;

  const entry = await insertMeal({
    owner: pending.owner,
    date: pending.date,
    atTime: pending.atTime,
    slot: pending.slot,
    photo,
    dish: 'Not identified yet',
    calories: 0,
    source: 'photo',
  });
  if (entry === null) return null;

  await db.pendingMeals.delete(pending.id!);
  return entry;
}

export async function syncPendingMeals(): Promise<MealEntry[]> {
  try {
    const waiting = await db.pendingMeals.toArray();
    const settled: MealEntry[] = [];

    for (const pending of waiting) {
      const entry = await flush(pending);
      if (entry) settled.push(entry);
    }

    return settled;
  } catch (err) {
    console.error('Failed to sync pending meals:', err);
    return [];
  }
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 4: Run the suite**

```bash
npm test
```

Expected: unchanged from Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/db/db.ts src/lib/mealQueue.ts
git commit -m "feat(meals): queue captured photos locally and sync them after"
```

---

### Task 8: The month grid

**Files:**
- Create: `src/components/meals/MealMonthGrid.tsx`
- Create: `src/components/meals/CameraButton.tsx`
- Create: `src/components/meals/MealsBoard.tsx`
- Modify: `src/app/(life)/meals/page.tsx`
- Test: none. No DOM in Vitest.

**Interfaces:**
- Consumes: `monthGridDates`, `monthOf`, `addMonths`, `formatMonthYear`, `todayISO`, `WEEKDAYS_SHORT` from `src/lib/dates.ts`; `mealDate`, `slotForTime` from `src/lib/mealDay.ts`; `fetchMeals`, `fetchDays`, `photoUrl` from `src/lib/mealRepo.ts`; `resizeToPair` from `src/lib/mealImage.ts`; `queueMeal`, `syncPendingMeals` from `src/lib/mealQueue.ts`.
- Produces: `MealsBoard` as the default export of its file, consumed by the page. `MealMonthGrid` takes `{ month, entries, selected, onSelect }`.

Read `node_modules/next/dist/docs/` on Client Components before writing these — Next.js 16's conventions differ from training data.

**Contrast rule:** no text is drawn onto a photograph anywhere. The date number sits in a solid chip. This is `CLAUDE.md`'s wallpaper rule applied to user content.

- [ ] **Step 1: Write the grid**

Create `src/components/meals/MealMonthGrid.tsx`:

```tsx
'use client';

import { monthGridDates, monthOf, todayISO, WEEKDAYS_SHORT } from '@/lib/dates';
import { photoUrl } from '@/lib/mealRepo';
import type { MealEntry } from '@/lib/meals';

function firstThumb(entries: MealEntry[]): string | null {
  const withPhoto = entries.find((entry) => entry.photo !== null);
  return withPhoto?.photo ? photoUrl(withPhoto.photo.thumbPath) : null;
}

export default function MealMonthGrid({
  month,
  entries,
  onSelect,
}: {
  month: string;
  entries: MealEntry[];
  onSelect: (date: string) => void;
}) {
  const today = todayISO();
  const byDate = new Map<string, MealEntry[]>();
  for (const entry of entries) {
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  }

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--mt-text-muted)]"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthGridDates(month).map((date) => {
          const dayEntries = byDate.get(date) ?? [];
          const thumb = firstThumb(dayEntries);
          const outside = monthOf(date) !== month;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className="relative aspect-square min-h-11 overflow-hidden rounded-xl"
              style={{
                background: thumb
                  ? undefined
                  : 'color-mix(in srgb, var(--mt-accent) 18%, transparent)',
                opacity: outside ? 0.35 : 1,
                outline: date === today ? '2px solid var(--mt-accent)' : undefined,
                outlineOffset: '-2px',
              }}
              aria-label={`${date}, ${dayEntries.length} meals`}
            >
              {thumb && (
                <img
                  src={thumb}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <span className="absolute left-1 top-1 rounded-md bg-[var(--mt-surface)] px-1 text-[10px] font-semibold text-[var(--mt-text)]">
                {Number(date.slice(8))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the camera button**

Create `src/components/meals/CameraButton.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';

export default function CameraButton({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onCapture(file);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{
          background: 'var(--mt-accent)',
          color: 'var(--mt-accent-contrast)',
        }}
        aria-label="Photograph a meal"
      >
        <Camera size={22} />
      </button>
    </>
  );
}
```

- [ ] **Step 3: Write the board**

Create `src/components/meals/MealsBoard.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  formatMonthYear,
  monthOf,
  todayISO,
} from '@/lib/dates';
import { isUserName, type UserName } from '@/lib/identity';
import { mealDate, slotForTime } from '@/lib/mealDay';
import { resizeToPair } from '@/lib/mealImage';
import { queueMeal, syncPendingMeals } from '@/lib/mealQueue';
import { fetchMeals } from '@/lib/mealRepo';
import type { MealEntry } from '@/lib/meals';
import CameraButton from './CameraButton';
import MealMonthGrid from './MealMonthGrid';

function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${addMonths(month, 1)}-01`];
}

export default function MealsBoard() {
  const [month, setMonth] = useState(() => monthOf(todayISO()));
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [owner, setOwner] = useState<UserName | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user_name');
    if (isUserName(stored)) setOwner(stored);
  }, []);

  const load = useCallback(async () => {
    const [from, to] = monthRange(month);
    const meals = await fetchMeals(from, to);
    if (meals) setEntries(meals);
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void syncPendingMeals().then((settled) => {
      if (settled.length > 0) void load();
    });
  }, [load]);

  const capture = useCallback(
    async (file: File) => {
      if (owner === null) return;

      const now = new Date();
      const { full, thumb } = await resizeToPair(file);

      await queueMeal({
        owner,
        date: mealDate(now),
        atTime: `${now.getHours()}`.padStart(2, '0') + ':' + `${now.getMinutes()}`.padStart(2, '0'),
        slot: slotForTime(now),
        full,
        thumb,
      });

      const settled = await syncPendingMeals();
      if (settled.length > 0) await load();
    },
    [owner, load],
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text-muted)]"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--mt-text-muted)]"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <MealMonthGrid month={month} entries={entries} onSelect={setSelected} />

      <CameraButton onCapture={capture} />
    </>
  );
}
```

`selected` is set here and read in Task 9. `fetchDays` is deliberately not called yet — nothing reads sealed days until Task 13, and an unused `days` state would fail `npm run lint` in step 5. Task 13 adds both together.

- [ ] **Step 4: Replace the page**

Rewrite `src/app/(life)/meals/page.tsx` in full:

```tsx
import PageShell from '@/components/ui/PageShell';
import MealsBoard from '@/components/meals/MealsBoard';

export default function MealsPage() {
  return (
    <PageShell title="Meals" subtitle="What we ate" accent="meals">
      <MealsBoard />
    </PageShell>
  );
}
```

- [ ] **Step 5: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: all three clean. A build failure here usually means a Client Component boundary is wrong — check the Next.js 16 docs rather than adding `'use client'` higher up.

- [ ] **Step 6: Verify in the browser**

Start the dev server through the preview tooling (never a raw shell command), open `/meals`, and confirm: the month grid renders with the right weekday alignment, today has a ring, month arrows move, and the camera button sits above the bottom nav.

- [ ] **Step 7: Commit**

```bash
git add src/components/meals src/app/\(life\)/meals/page.tsx
git commit -m "feat(meals): replace the sample shell with a month grid and camera"
```

---

### Task 9: The day story

**Files:**
- Create: `src/components/meals/DayStory.tsx`
- Modify: `src/components/meals/MealsBoard.tsx` — render the sheet when a date is selected
- Test: none.

**Interfaces:**
- Consumes: `storyOrder` from `src/lib/mealStory.ts`; `intakeFor` from `src/lib/mealDay.ts`; `photoUrl` from `src/lib/mealRepo.ts`; `formatLongDate` from `src/lib/dates.ts`; `USERS` from `src/lib/identity.ts`.
- Produces: `DayStory` taking `{ date, entries, onClose }`.

Captions sit beneath each photo on the page background, never over the image.

- [ ] **Step 1: Write the sheet**

Create `src/components/meals/DayStory.tsx`:

```tsx
'use client';

import { X } from 'lucide-react';
import { formatLongDate } from '@/lib/dates';
import { USERS } from '@/lib/identity';
import { intakeFor } from '@/lib/mealDay';
import { storyOrder } from '@/lib/mealStory';
import { photoUrl } from '@/lib/mealRepo';
import type { MealEntry } from '@/lib/meals';

export default function DayStory({
  date,
  entries,
  onClose,
}: {
  date: string;
  entries: MealEntry[];
  onClose: () => void;
}) {
  const ordered = storyOrder(entries);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--mt-bg)]">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-[var(--mt-bg)] px-5 pb-3 pt-5">
        <div>
          <h2 className="text-lg font-semibold text-[var(--mt-text)]">
            {formatLongDate(date)}
          </h2>
          <div className="mt-1 flex gap-3 text-xs text-[var(--mt-text-muted)]">
            {USERS.map((user) => (
              <span key={user}>
                {user} {intakeFor(entries, date, user)} kcal
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--mt-text-muted)]"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex flex-col gap-5 px-5 pb-24">
        {ordered.length === 0 && (
          <p className="text-sm text-[var(--mt-text-muted)]">
            Nothing photographed on this day.
          </p>
        )}

        {ordered.map((entry) => (
          <article key={entry.id}>
            {entry.photo && (
              <img
                src={photoUrl(entry.photo.fullPath)}
                alt={entry.dish}
                className="w-full rounded-2xl object-cover"
              />
            )}
            <div className="mt-2">
              <div className="text-sm font-semibold text-[var(--mt-text)]">
                {entry.dish}
              </div>
              <div className="text-xs text-[var(--mt-text-muted)]">
                {entry.atTime ?? entry.slot} · {entry.owner} ·{' '}
                {entry.calories > 0 ? `${entry.calories} kcal` : 'not counted yet'}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the board**

In `src/components/meals/MealsBoard.tsx`, add the import:

```tsx
import DayStory from './DayStory';
```

and render it after `<CameraButton …/>`, inside the fragment:

```tsx
{selected && (
  <DayStory
    date={selected}
    entries={entries.filter((entry) => entry.date === selected)}
    onClose={() => setSelected(null)}
  />
)}
```

- [ ] **Step 3: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: Verify in the browser**

Open `/meals`, tap a date, and confirm the sheet opens, the close button dismisses it, and an empty day shows the empty message rather than a blank screen.

- [ ] **Step 5: Commit**

```bash
git add src/components/meals
git commit -m "feat(meals): open a day as a story of both people's photos"
```

**Feature 1 is complete at this point.** Photos can be taken, stored and browsed without any AI involvement. Everything from here needs `GEMINI_API_KEY`.

---

### Task 10: The estimator endpoint

**Files:**
- Create: `src/app/api/meals/estimate/route.ts`
- Modify: `package.json` — add `@google/genai`
- Test: none. Network I/O.

**Interfaces:**
- Consumes: `Estimate`, `MealSlot` from `src/lib/meals.ts`.
- Produces: `POST /api/meals/estimate` accepting `{ image?: string; text?: string; slot: MealSlot }` and returning `Estimate` as JSON, or `{ error: string }` with a non-200 status.

**Before writing this file:** read the route handler guide in `node_modules/next/dist/docs/` — Next.js 16's handler signature is not the one in training data. Also re-check the `@google/genai` image-input shape against Google's live documentation; the SDK moved from `generateContent` to `interactions.create` and the part shape may have moved with it.

- [ ] **Step 1: Install the SDK**

```bash
npm install @google/genai
```

- [ ] **Step 2: Write the handler**

Create `src/app/api/meals/estimate/route.ts`:

```ts
import { GoogleGenAI, type Interactions } from '@google/genai';
import type { Confidence, Estimate, MealSlot } from '@/lib/meals';

const MODEL = 'gemini-3.7-flash';

const SCHEMA = {
  type: 'object',
  properties: {
    dish: { type: 'string' },
    detail: { type: 'string' },
    calories: { type: 'integer' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['dish', 'detail', 'calories', 'confidence'],
};

const SYSTEM = `You are reading a meal eaten in Malaysia — home cooking or hawker
food. Expect nasi lemak, economy rice, chap fan, chicken rice, kolo mee, hotpot,
roti canai, and similar. Name the dish plainly.

Judge the portion against the plate or bowl and commit to a single calorie
number for what you can actually see. Do not give a range.

Put preparation and sides in "detail" — roasted or steamed, fried or soup,
what came with it.

Set confidence to "low" when the image is too dark, too partial, or is not food.
A low-confidence answer is correct and useful; a confident guess at an
unreadable photo is not.`;

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low'];

function toEstimate(value: unknown): Estimate | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  const { dish, detail, calories, confidence } = candidate;
  if (typeof dish !== 'string' || dish.trim() === '') return null;
  if (typeof detail !== 'string') return null;
  if (typeof calories !== 'number' || !Number.isFinite(calories) || calories < 0) return null;
  if (typeof confidence !== 'string' || !CONFIDENCES.includes(confidence as Confidence)) return null;

  return {
    dish,
    detail,
    calories: Math.round(calories),
    confidence: confidence as Confidence,
  };
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Estimator not configured' }, { status: 503 });
  }

  try {
    const { image, text, slot } = await request.json();

    if (typeof slot !== 'string' || !SLOTS.includes(slot as MealSlot)) {
      return Response.json({ error: 'Missing or invalid slot' }, { status: 400 });
    }
    if (typeof image !== 'string' && typeof text !== 'string') {
      return Response.json({ error: 'Provide an image or a description' }, { status: 400 });
    }

    const client = new GoogleGenAI({ apiKey: key });
    const input: Interactions.Content[] = image
      ? [
          { type: 'text', text: `${SYSTEM}\n\nThis was eaten as ${slot}.` },
          { type: 'image', mime_type: 'image/webp', data: image },
        ]
      : [{ type: 'text', text: `${SYSTEM}\n\nEaten as ${slot}: ${text}` }];

    const interaction = await client.interactions.create({
      model: MODEL,
      input,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: SCHEMA,
      },
    });

    if (!interaction.output_text) {
      return Response.json({ error: 'Could not estimate' }, { status: 502 });
    }

    const estimate = toEstimate(JSON.parse(interaction.output_text));
    if (!estimate) {
      return Response.json({ error: 'Could not estimate' }, { status: 502 });
    }

    return Response.json(estimate);
  } catch (err) {
    console.error('Estimate failed:', err);
    return Response.json({ error: 'Could not estimate' }, { status: 502 });
  }
}
```

- [ ] **Step 3: Verify the SDK shape against a real call**

With `GEMINI_API_KEY` set, start the dev server through the preview tooling and post a small photo to the endpoint. If the SDK rejects the image part, fix the part shape from Google's live documentation and correct this file — do not work around it by sending the image as text.

Expected: a JSON body with all four fields, `calories` a plausible number for the photographed dish.

- [ ] **Step 4: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/api/meals/estimate/route.ts
git commit -m "feat(meals): estimate calories from a photo or a description"
```

---

### Task 11: The confirm card

**Files:**
- Create: `src/components/meals/ConfirmCard.tsx`
- Modify: `src/components/meals/MealsBoard.tsx` — request an estimate after capture and show the card
- Test: none.

**Interfaces:**
- Consumes: `scaleForPortion`, `needsManualEntry` from `src/lib/mealEstimate.ts`; `updateMeal` from `src/lib/mealRepo.ts`; `Estimate`, `MealEntry`, `Portion` from `src/lib/meals.ts`.
- Produces: `ConfirmCard` taking `{ entry, estimate, onDone }`.

When `needsManualEntry` is true the layout flips: the "can't tell" message and the text field come first, and no number is offered for thoughtless acceptance.

- [ ] **Step 1: Write the card**

Create `src/components/meals/ConfirmCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { needsManualEntry, scaleForPortion } from '@/lib/mealEstimate';
import { updateMeal } from '@/lib/mealRepo';
import type { Estimate, MealEntry, Portion } from '@/lib/meals';

const PORTIONS: Portion[] = ['smaller', 'normal', 'larger'];

const PORTION_LABEL: Record<Portion, string> = {
  smaller: 'Smaller',
  normal: 'Normal',
  larger: 'Larger',
};

export default function ConfirmCard({
  entry,
  estimate,
  onDone,
}: {
  entry: MealEntry;
  estimate: Estimate;
  onDone: () => void;
}) {
  const unsure = needsManualEntry(estimate.confidence);
  const [dish, setDish] = useState(unsure ? '' : estimate.dish);
  const [calories, setCalories] = useState(estimate.calories);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateMeal(entry.id, { dish: dish.trim() || estimate.dish, calories });
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4">
      <Card>
        {unsure ? (
          <p className="mb-3 text-sm font-semibold text-[var(--mt-text)]">
            I can&apos;t tell what this is — what did you eat?
          </p>
        ) : (
          <>
            <div className="text-base font-semibold text-[var(--mt-text)]">
              {estimate.dish}
            </div>
            <div className="mb-3 text-xs text-[var(--mt-text-muted)]">
              {estimate.detail}
            </div>
          </>
        )}

        <input
          value={dish}
          onChange={(event) => setDish(event.target.value)}
          placeholder="Dish"
          className="mb-3 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
        />

        {!unsure && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {PORTIONS.map((portion) => (
              <button
                key={portion}
                type="button"
                onClick={() => setCalories(scaleForPortion(estimate.calories, portion))}
                className="min-h-11 rounded-xl text-xs font-semibold text-[var(--mt-text)]"
                style={{
                  background:
                    'color-mix(in srgb, var(--mt-accent) 30%, transparent)',
                }}
              >
                {PORTION_LABEL[portion]}
              </button>
            ))}
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(event) => setCalories(Number(event.target.value))}
            className="min-h-11 w-28 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />
          <span className="text-sm text-[var(--mt-text-muted)]">kcal</span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{
            background: 'var(--mt-accent)',
            color: 'var(--mt-accent-contrast)',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Request the estimate after capture**

In `src/components/meals/MealsBoard.tsx`, add state and the import:

```tsx
import ConfirmCard from './ConfirmCard';
import type { Estimate } from '@/lib/meals';
```

```tsx
const [confirming, setConfirming] = useState<{ entry: MealEntry; estimate: Estimate } | null>(null);
```

Add this helper above `capture`:

```tsx
async function estimateFor(entry: MealEntry, full: Blob): Promise<Estimate | null> {
  const buffer = await full.arrayBuffer();
  const image = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  try {
    const response = await fetch('/api/meals/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, slot: entry.slot }),
    });
    if (!response.ok) return null;
    return (await response.json()) as Estimate;
  } catch {
    return null;
  }
}
```

Extend `capture` so that after `syncPendingMeals()` returns a settled entry it requests an estimate and opens the card:

```tsx
const settled = await syncPendingMeals();
if (settled.length > 0) {
  await load();
  const entry = settled[settled.length - 1];
  const estimate = await estimateFor(entry, full);
  if (estimate) setConfirming({ entry, estimate });
}
```

Render the card inside the fragment:

```tsx
{confirming && (
  <ConfirmCard
    entry={confirming.entry}
    estimate={confirming.estimate}
    onDone={() => {
      setConfirming(null);
      void load();
    }}
  />
)}
```

- [ ] **Step 3: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: Verify on a phone**

Against the deployed host, photograph a real meal. Confirm the card appears with a dish name and a number, that the portion buttons change the number, that typing a number overrides them, and that Save writes it into the day.

- [ ] **Step 5: Commit**

```bash
git add src/components/meals
git commit -m "feat(meals): confirm or correct the estimate before it is counted"
```

---

### Task 12: Editing a meal

**Files:**
- Create: `src/components/meals/MealEditor.tsx`
- Modify: `src/components/meals/DayStory.tsx` — open the editor when a meal is tapped
- Test: none.

**Interfaces:**
- Consumes: `updateMeal`, `deleteMeal` from `src/lib/mealRepo.ts`; `MealEntry`, `MealSlot` from `src/lib/meals.ts`.
- Produces: `MealEditor` taking `{ entry, onDone }`.

Editing never re-runs the estimator — the user is overruling it, not asking again. Both `updateMeal` and `deleteMeal` already mark the week's review stale inside the repository, so nothing here needs to.

- [ ] **Step 1: Write the editor**

Create `src/components/meals/MealEditor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { deleteMeal, updateMeal } from '@/lib/mealRepo';
import type { MealEntry, MealSlot } from '@/lib/meals';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealEditor({
  entry,
  onDone,
}: {
  entry: MealEntry;
  onDone: () => void;
}) {
  const [dish, setDish] = useState(entry.dish);
  const [calories, setCalories] = useState(entry.calories);
  const [slot, setSlot] = useState(entry.slot);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await updateMeal(entry.id, { dish, calories, slot });
    setBusy(false);
    onDone();
  }

  async function remove() {
    setBusy(true);
    await deleteMeal(entry);
    setBusy(false);
    onDone();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <Card>
        <input
          value={dish}
          onChange={(event) => setDish(event.target.value)}
          className="mb-3 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
        />

        <div className="mb-3 grid grid-cols-4 gap-2">
          {SLOTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSlot(option)}
              className="min-h-11 rounded-xl text-[11px] font-semibold capitalize text-[var(--mt-text)]"
              style={{
                background:
                  option === slot
                    ? 'color-mix(in srgb, var(--mt-accent) 45%, transparent)'
                    : 'var(--mt-surface)',
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(event) => setCalories(Number(event.target.value))}
            className="min-h-11 w-28 rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />
          <span className="text-sm text-[var(--mt-text-muted)]">kcal</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="min-h-11 rounded-xl text-sm font-semibold text-[var(--mt-danger)] disabled:opacity-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="min-h-11 rounded-xl text-sm font-semibold text-[var(--mt-text-muted)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="min-h-11 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{
              background: 'var(--mt-accent)',
              color: 'var(--mt-accent-contrast)',
            }}
          >
            Save
          </button>
        </div>
      </Card>
    </div>
  );
}
```

Every token used above exists in `globals.css`. The field classes match `FIELD_CLASS` in `src/components/calendar/EventModal.tsx:9` — keep them identical rather than inventing a variant.

- [ ] **Step 2: Open it from the story**

In `src/components/meals/DayStory.tsx`, add:

```tsx
import { useState } from 'react';
import MealEditor from './MealEditor';
```

```tsx
const [editing, setEditing] = useState<MealEntry | null>(null);
```

Widen the signature so a saved edit can refresh the board:

```tsx
export default function DayStory({
  date,
  entries,
  onClose,
  onReload,
}: {
  date: string;
  entries: MealEntry[];
  onClose: () => void;
  onReload: () => void;
}) {
```

Replace the caption `<div className="mt-2">` block with a button, so tapping a meal opens the editor. Keep the photo outside the button — a full-width image inside a button is an awkward touch target and the caption is the affordance:

```tsx
<button
  type="button"
  onClick={() => setEditing(entry)}
  className="mt-2 block w-full text-left"
>
  <div className="text-sm font-semibold text-[var(--mt-text)]">
    {entry.dish}
  </div>
  <div className="text-xs text-[var(--mt-text-muted)]">
    {entry.atTime ?? entry.slot} · {entry.owner} ·{' '}
    {entry.calories > 0 ? `${entry.calories} kcal` : 'not counted yet'}
  </div>
</button>
```

Render the editor as the last child of the outer `<div>`, after the photo list:

```tsx
{editing && (
  <MealEditor
    entry={editing}
    onDone={() => {
      setEditing(null);
      onReload();
    }}
  />
)}
```

In `MealsBoard`, pass it through: `<DayStory … onReload={load} />`.

- [ ] **Step 3: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: Verify in the browser**

Open a day, tap a meal, change the dish and the number, save, and confirm the story shows the new values. Delete one and confirm it disappears and its photo is gone from the bucket.

- [ ] **Step 5: Commit**

```bash
git add src/components/meals
git commit -m "feat(meals): edit or delete a meal from its day story"
```

---

### Task 13: Sealing a day and the 8am nudge

**Files:**
- Create: `src/components/meals/UnfinishedDayCard.tsx`
- Modify: `src/components/meals/MealsBoard.tsx` — render the card
- Test: none beyond Task 1's `missingSlots`, which already covers the logic.

**Interfaces:**
- Consumes: `missingSlots`, `mealDate` from `src/lib/mealDay.ts`; `sealDay`, `insertMeal`, `fetchDays` from `src/lib/mealRepo.ts`; `addDays`, `formatLongDate` from `src/lib/dates.ts`; `Estimate`, `MealDay`, `MealEntry`, `MealSlot` from `src/lib/meals.ts`.
- Produces: `UnfinishedDayCard` taking `{ date, owner, entries, onReload }`.

The card appears when yesterday's food day is unsealed and the clock has passed 08:00. A gap-filled meal is typed, not photographed — it goes to the same estimator with `text` instead of `image`.

- [ ] **Step 1: Write the card**

Create `src/components/meals/UnfinishedDayCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { formatLongDate } from '@/lib/dates';
import { missingSlots } from '@/lib/mealDay';
import { insertMeal, sealDay } from '@/lib/mealRepo';
import type { UserName } from '@/lib/identity';
import type { Estimate, MealEntry, MealSlot } from '@/lib/meals';

export default function UnfinishedDayCard({
  date,
  owner,
  entries,
  onReload,
}: {
  date: string;
  owner: UserName;
  entries: MealEntry[];
  onReload: () => void;
}) {
  const missing = missingSlots(entries);
  const [slot, setSlot] = useState<MealSlot>(missing[0] ?? 'snack');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function addTyped() {
    setBusy(true);

    let estimate: Estimate | null = null;
    try {
      const response = await fetch('/api/meals/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, slot }),
      });
      if (response.ok) estimate = (await response.json()) as Estimate;
    } catch {
      estimate = null;
    }

    await insertMeal({
      owner,
      date,
      atTime: null,
      slot,
      photo: null,
      dish: estimate?.dish ?? text,
      calories: estimate?.calories ?? 0,
      source: 'typed',
    });

    setText('');
    setBusy(false);
    onReload();
  }

  async function seal() {
    setBusy(true);
    await sealDay(date, owner);
    setBusy(false);
    onReload();
  }

  return (
    <Card className="mb-4">
      <div className="text-sm font-semibold text-[var(--mt-text)]">
        {formatLongDate(date)} looks unfinished
      </div>
      <p className="mb-3 mt-1 text-xs text-[var(--mt-text-muted)]">
        {missing.length > 0
          ? `No ${missing.join(' or ')} recorded. Add what you ate, or seal the day as it is.`
          : 'Seal the day so it counts toward your week.'}
      </p>

      {missing.length > 0 && (
        <>
          <div className="mb-2 flex gap-2">
            {missing.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSlot(option)}
                className="min-h-11 flex-1 rounded-xl text-[11px] font-semibold capitalize text-[var(--mt-text)]"
                style={{
                  background:
                    option === slot
                      ? 'color-mix(in srgb, var(--mt-accent) 45%, transparent)'
                      : 'var(--mt-surface)',
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Half a plate of nasi lemak with fried chicken"
            className="mb-2 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]"
          />

          <button
            type="button"
            onClick={addTyped}
            disabled={busy || text.trim() === ''}
            className="mb-2 min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{
              background: 'color-mix(in srgb, var(--mt-accent) 45%, transparent)',
              color: 'var(--mt-text)',
            }}
          >
            Add it
          </button>
        </>
      )}

      <button
        type="button"
        onClick={seal}
        disabled={busy}
        className="min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
        style={{
          background: 'var(--mt-accent)',
          color: 'var(--mt-accent-contrast)',
        }}
      >
        That&apos;s everything
      </button>
    </Card>
  );
}
```

- [ ] **Step 2: Start fetching sealed days**

Task 8 deliberately left this out because nothing read it yet. Add to `src/components/meals/MealsBoard.tsx`:

```tsx
import UnfinishedDayCard from './UnfinishedDayCard';
import { addDays } from '@/lib/dates';
import { fetchDays, fetchMeals } from '@/lib/mealRepo';
import type { MealDay, MealEntry } from '@/lib/meals';
```

```tsx
const [days, setDays] = useState<MealDay[]>([]);
```

and widen `load` to fetch both:

```tsx
const load = useCallback(async () => {
  const [from, to] = monthRange(month);
  const [meals, sealed] = await Promise.all([fetchMeals(from, to), fetchDays(from, to)]);
  if (meals) setEntries(meals);
  if (sealed) setDays(sealed);
}, [month]);
```

- [ ] **Step 3: Decide when to show it**

In `src/components/meals/MealsBoard.tsx`, add above the return:

```tsx
const now = new Date();
const yesterday = addDays(mealDate(now), -1);
const yesterdaySealed = days.some(
  (day) => day.date === yesterday && day.owner === owner && day.sealed,
);
const nudge = owner !== null && now.getHours() >= 8 && !yesterdaySealed;
```

Render before the month header:

```tsx
{nudge && owner && (
  <UnfinishedDayCard
    date={yesterday}
    owner={owner}
    entries={entries.filter((entry) => entry.date === yesterday && entry.owner === owner)}
    onReload={load}
  />
)}
```

The wall-clock read here runs only in a Client Component after mount, so it cannot desync SSR from the first client render. If it is ever hoisted, guard it with `useHasMounted` as `CLAUDE.md` requires.

- [ ] **Step 4: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 5: Verify in the browser**

With yesterday unsealed and the clock past 08:00, confirm the card names the missing meals, that adding a typed meal makes it appear in yesterday's square, and that sealing removes the card. Then set your system clock to 06:00 and confirm the card does *not* appear.

- [ ] **Step 6: Commit**

```bash
git add src/components/meals
git commit -m "feat(meals): nudge an unfinished day and let it be filled by typing"
```

---

### Task 14: The week card

**Files:**
- Create: `src/components/meals/WeekCard.tsx`
- Modify: `src/components/meals/MealsBoard.tsx` — render it at the top
- Test: none beyond Task 4's `mealWeek`, which already covers the arithmetic.

**Interfaces:**
- Consumes: `weekStart`, `weekDates`, `sealedDates`, `weekTotals` from `src/lib/mealWeek.ts`; `USERS` from `src/lib/identity.ts`; `todayISO`, `formatShortDate` from `src/lib/dates.ts`.
- Produces: `WeekCard` taking `{ entries, days, owner, onReview, reviewLabel }`.

The accent is a pastel and fails contrast as ink, so the bars use `--mt-accent-deep`, which already exists in `globals.css` for exactly this. Do not use `--mt-accent` for a bar fill and do not add a new token.

- [ ] **Step 1: Write the card**

Create `src/components/meals/WeekCard.tsx`:

```tsx
'use client';

import Card from '@/components/ui/Card';
import { todayISO } from '@/lib/dates';
import { USERS, type UserName } from '@/lib/identity';
import { sealedDates, weekDates, weekStart, weekTotals } from '@/lib/mealWeek';
import type { MealDay, MealEntry } from '@/lib/meals';

export default function WeekCard({
  entries,
  days,
  owner,
  onReview,
  reviewLabel,
}: {
  entries: MealEntry[];
  days: MealDay[];
  owner: UserName;
  onReview: () => void;
  reviewLabel: string;
}) {
  const week = weekDates(weekStart(todayISO()));
  const mine = weekTotals(entries, sealedDates(days, week, owner), owner);
  const peak = Math.max(1, ...Object.values(mine.byDate));

  return (
    <Card className="mb-4">
      <div className="mb-3 flex gap-6">
        {USERS.map((user) => {
          const totals = weekTotals(entries, sealedDates(days, week, user), user);
          return (
            <div key={user}>
              <div className="text-xs text-[var(--mt-text-muted)]">{user}</div>
              <div className="text-lg font-semibold text-[var(--mt-text)]">
                {totals.total.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-[var(--mt-text-muted)]">
                  kcal · {totals.sealedCount}d
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {week.map((date) => (
          <div key={date} className="flex h-10 items-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${((mine.byDate[date] ?? 0) / peak) * 100}%`,
                background: 'var(--mt-accent-deep)',
              }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onReview}
        className="min-h-11 w-full rounded-xl text-sm font-semibold"
        style={{
          background: 'var(--mt-accent)',
          color: 'var(--mt-accent-contrast)',
        }}
      >
        {reviewLabel}
      </button>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Wire the render in Task 15, once `onReview` has something to call.

- [ ] **Step 3: Commit**

```bash
git add src/components/meals/WeekCard.tsx
git commit -m "feat(meals): show the week's totals and bars"
```

---

### Task 15: The weekly review

**Files:**
- Create: `src/app/api/meals/review/route.ts`
- Modify: `src/components/meals/MealsBoard.tsx` — render `WeekCard`, fetch and show the review
- Test: none. Network I/O.

**Interfaces:**
- Consumes: `fetchReview`, `saveReview` from `src/lib/mealRepo.ts`; `weekStart`, `weekDates`, `sealedDates` from `src/lib/mealWeek.ts`; `MealEntry`, `MealReview` from `src/lib/meals.ts`.
- Produces: `POST /api/meals/review` accepting `{ meals: {date, slot, dish, calories}[]; sealedCount: number }` and returning `{ body: string }`.

The sealed-day count is stated to the model explicitly. Without it the model describes a full week it has barely seen.

- [ ] **Step 1: Write the handler**

Create `src/app/api/meals/review/route.ts`:

```ts
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.7-flash';

const SYSTEM = `You are reviewing one person's week of meals in Malaysia.

Name changes anchored to what they actually ate — which meals run large, which
days blow out, what repeats too often, what to swap for what. Refer to their
real dishes by name.

Do not write generic advice. "Eat more vegetables", "drink more water" and
"watch your portions" are forbidden — they are true of everyone and useful to
nobody.

Stay on food: swaps, portions and timing. Do not set calorie targets, comment on
weight, or make any claim about health.

Write under 150 words in plain prose. No headings, no bullet points.`;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'Reviewer not configured' }, { status: 503 });
  }

  const { meals, sealedCount } = await request.json();

  const lines = meals
    .map((m: { date: string; slot: string; dish: string; calories: number }) =>
      `${m.date} ${m.slot}: ${m.dish} (${m.calories} kcal)`,
    )
    .join('\n');

  const prompt = `${SYSTEM}

You are looking at ${sealedCount} complete ${sealedCount === 1 ? 'day' : 'days'}, not a full week. Write about ${sealedCount === 1 ? 'that day' : 'those days'} only, and do not generalise beyond them.

${lines}`;

  try {
    const client = new GoogleGenAI({ apiKey: key });
    const interaction = await client.interactions.create({
      model: MODEL,
      input: prompt,
    });

    return Response.json({ body: interaction.output_text });
  } catch (err) {
    console.error('Review failed:', err);
    return Response.json({ error: 'Could not review' }, { status: 502 });
  }
}
```

- [ ] **Step 2: Wire the card and the review into the board**

In `src/components/meals/MealsBoard.tsx` add:

```tsx
import WeekCard from './WeekCard';
import { fetchReview, saveReview } from '@/lib/mealRepo';
import { sealedDates, weekDates, weekStart } from '@/lib/mealWeek';
import type { MealReview } from '@/lib/meals';
```

```tsx
const [review, setReview] = useState<MealReview | null>(null);
const [reviewing, setReviewing] = useState(false);
```

Load the stored review whenever the owner is known:

```tsx
useEffect(() => {
  if (owner === null) return;
  void fetchReview(weekStart(todayISO()), owner).then(setReview);
}, [owner]);
```

Add the handler:

```tsx
const runReview = useCallback(async () => {
  if (owner === null) return;
  if (review && !review.stale) return;

  setReviewing(true);
  const week = weekDates(weekStart(todayISO()));
  const sealed = sealedDates(days, week, owner);
  const meals = entries
    .filter((entry) => entry.owner === owner && sealed.includes(entry.date))
    .map(({ date, slot, dish, calories }) => ({ date, slot, dish, calories }));

  try {
    const response = await fetch('/api/meals/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meals, sealedCount: sealed.length }),
    });
    if (response.ok) {
      const { body } = await response.json();
      await saveReview(weekStart(todayISO()), owner, body);
      setReview(await fetchReview(weekStart(todayISO()), owner));
    }
  } catch (err) {
    console.error('Review request failed:', err);
  }

  setReviewing(false);
}, [owner, review, days, entries]);
```

Render above the month header:

```tsx
{owner && (
  <WeekCard
    entries={entries}
    days={days}
    owner={owner}
    onReview={runReview}
    reviewLabel={
      reviewing ? 'Reading your week…' : review?.stale ? 'Refresh' : review ? 'Read again' : 'Review my week'
    }
  />
)}

{review && (
  <Card className="mb-4">
    <p className="whitespace-pre-wrap text-sm text-[var(--mt-text)]">{review.body}</p>
    {review.stale && (
      <p className="mt-2 text-xs text-[var(--mt-text-muted)]">
        Out of date — a meal changed since this was written.
      </p>
    )}
  </Card>
)}
```

Import `Card` from `@/components/ui/Card`.

- [ ] **Step 3: Typecheck, lint and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: Run the full suite**

```bash
npm test
```

Expected: every test from Tasks 1–5 passes.

- [ ] **Step 5: Verify end to end**

Against the deployed host: seal two or three days, press Review, and confirm the write-up names your actual dishes and refers to the right number of days. Edit a meal inside that week and confirm the button changes to Refresh and the out-of-date note appears.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/meals/review/route.ts src/components/meals/MealsBoard.tsx
git commit -m "feat(meals): review a week of meals on demand"
```

---

## Verification checklist

Write `docs/superpowers/verification/2026-08-23-meals.md` as the final step, following the shape of `2026-08-16-cycle-tracking.md`. It must cover, on a real phone against the deployed host:

- Camera opens, photo appears in today's square within a second
- Photo taken in airplane mode appears immediately and uploads when signal returns
- Estimate arrives, portion buttons change the number, typed number overrides
- Low-confidence photo (shoot something that is not food) flips the card layout
- Day story interleaves both people's meals by time
- A supper photographed at 1am appears at the *end* of the previous day, not the start of the new one
- Month grid loads quickly on mobile data (thumbnails, not full photos — check the network panel)
- Nudge card appears after 8am for an unfinished yesterday, and not before
- Typed gap-fill meal lands on yesterday, not today
- Sealing removes the card and the day joins the week total
- Review names real dishes and the right day count
- Editing a meal marks the review stale
- No text is rendered directly over any photograph
