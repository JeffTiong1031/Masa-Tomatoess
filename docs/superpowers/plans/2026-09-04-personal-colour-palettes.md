# Personal Colour Palettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared fixed swatches (1–8) with personal palettes — separate for Jeff vs Rachel and for timetable vs calendar — so each person can add, delete, and (on timetable) set fill + text with a live preview.

**Architecture:** One Supabase table `colour_swatches` keyed by `(owner, kind)`. Pure helpers in `lib/colourPalette.ts` own starters, hex checks, paint resolution, delete-in-use, and “update all” override clearing. A `colourRepo` seeds empty palettes and CRUD-s rows. Timetable rules and calendar categories store `swatchId` (soft uuid); timetable rules may also store `textOverride`. UI: shared colour wheel (no eyedropper); timetable add-colour sheet with preview; calendar fill-only.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19.2, TypeScript strict, Tailwind v4, Supabase, `lucide-react`, Vitest (node, no DOM).

**Spec:** [docs/superpowers/specs/2026-09-04-personal-colour-palettes-design.md](../specs/2026-09-04-personal-colour-palettes-design.md)

**Branch:** create `feat/personal-colour-palettes` from current `main` (or worktree) before Task 1.

## Global Constraints

- **Do not write comments.** Names and structure carry the meaning.
- **App chrome never hardcodes a colour** — use `--mt-*` tokens. **User palette fills/text are hex data** painted with inline `style` (D108). Starter hexes live in `lib/colourPalette.ts` and are pinned to `--mac-tag-N` in a test.
- **Avoid defensive programming.** No guards for states the types already exclude.
- **Avoid instance checks.** No `instanceof` / `typeof` shape discrimination.
- Catch only at Supabase boundaries; pure functions do not.
- `'use client'` only on leaves that need it.
- Touch targets ≥ 44px (`min-h-11`).
- Tests beside source as `*.test.ts`. Vitest = node only — no React Testing Library.
- **Commits: Jeff alone.** No `Co-authored-by` or other trailers. Strip if the environment injects one.
- Soft uuid links (no DB `REFERENCES`). Ownership and `kind` enforced in app.
- Seed and legacy migration run **in the client** on fetch (empty palette → insert starters; legacy `swatch` 1–8 → matching starter id).
- Weekday origin Monday = 0 where relevant.
- Run `npm test`, `npx tsc --noEmit`, `npm run lint` before each commit.

### Spec → task map

| Spec | Tasks |
|---|---|
| D97–D99 two palettes, personal, starters | 1, 2 |
| D100–D103 timetable fill+text, wheel, preview | 5, 6, 7 |
| D101 calendar fill only | 9, 10 |
| D104 delete in use | 1, 7, 10 |
| D105 just this / update all | 1, 6, 7 |
| D106 migrate 1–8 | 2, 3, 4, 8 |
| D107 empty palette blocks save | 6, 10 |
| D108 hex as data | 1, 5–7, 10–11 |
| Partner read-only palette | 7, 10 |
| Browser verification | 12 |

---

## File Structure

**New**

| File | Responsibility |
|---|---|
| `src/lib/colourPalette.ts` | Types, starters, hex validate, paint, delete check, update-all helpers |
| `src/lib/colourPalette.test.ts` | Pins and behaviour |
| `src/lib/colourRepo.ts` | Supabase CRUD + seed-on-empty |
| `docs/superpowers/specs/2026-09-04-colour-palettes-setup.sql` | Create table + alter rules/categories (Parts) |
| `src/components/colour/ColourWheel.tsx` | Square + hue bar, no eyedropper |
| `src/components/colour/SwatchAddSheet.tsx` | Add/edit swatch; timetable gets text + preview; calendar fill only |
| `src/components/colour/TextScopeDialog.tsx` | Just this / Update all / Cancel |

**Modified**

| File | Change |
|---|---|
| `src/lib/timetableRule.ts` (+ test) | `swatchId`, optional `textOverride`; validate requires swatchId |
| `src/lib/timetableRepo.ts` | Columns + legacy migrate |
| `src/lib/categories.ts` (+ test) | `Category.swatchId`; keep `SWATCHES`/`swatchToken` only if still needed for starters pin — prefer starters only in `colourPalette` |
| `src/lib/calendarRepo.ts` | `swatch_id`; legacy migrate |
| `src/lib/supabase.ts` | Schema comments |
| `src/components/timetable/RuleModal.tsx` | Palette row, add sheet, preview, text scope |
| `src/components/timetable/TimetableGrid.tsx` | Paint fill + resolved text |
| `src/components/timetable/RecurringList.tsx` | Paint from fill hex |
| `src/components/timetable/TimetableBoard.tsx` | Load palettes; pass to children; delete refuse |
| `src/components/calendar/CategoryManager.tsx` | Personal calendar palette |
| `src/components/calendar/EventBlock.tsx` | Fill from category swatch hex |
| `src/components/calendar/EventModal.tsx` | Same |
| `src/components/calendar/FilterStrip.tsx` | Same |
| `src/components/calendar/CalendarBoard.tsx` | Load calendar palette; wire manager |

---

## Task 1: Palette model and pure helpers

**Files:**
- Create: `src/lib/colourPalette.ts`
- Test: `src/lib/colourPalette.test.ts`

**Interfaces:**
- Consumes: `UserName` from `lib/identity` (only if needed for types; prefer no identity dependency — owner is string at repo layer).
- Produces:

```ts
export type PaletteKind = 'timetable' | 'calendar';

export interface ColourSwatch {
  id: string;
  owner: string;
  kind: PaletteKind;
  fill: string;
  textColor: string | null;
  position: number;
}

export const STARTER_FILLS: readonly string[]; // eight #RRGGBB matching --mac-tag-1..8

export function isHexColor(value: string): boolean;
export function starterDrafts(kind: PaletteKind): Omit<ColourSwatch, 'id' | 'owner'>[];
export function resolveTimetablePaint(
  swatch: ColourSwatch,
  textOverride: string | null,
): { fill: string; text: string };
export function canDeleteSwatch(swatchId: string, usedIds: readonly string[]): boolean;
export function applyTextUpdateAll(
  swatch: ColourSwatch,
  newText: string,
  rules: { id: string; swatchId: string; textOverride: string | null }[],
): {
  swatch: ColourSwatch;
  rulePatches: { id: string; textOverride: null }[];
};
export function legacyIndexToStarterPosition(swatch: number): number | null;
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/colourPalette.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  STARTER_FILLS,
  applyTextUpdateAll,
  canDeleteSwatch,
  isHexColor,
  legacyIndexToStarterPosition,
  resolveTimetablePaint,
  starterDrafts,
} from './colourPalette';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

function tagHex(n: number): string {
  const m = CSS.match(new RegExp(`--mac-tag-${n}:\\s*(#[0-9A-Fa-f]{6})`));
  if (m === null) throw new Error(`missing --mac-tag-${n}`);
  return m[1];
}

describe('STARTER_FILLS', () => {
  it('matches all eight --mac-tag fills in order', () => {
    expect(STARTER_FILLS).toHaveLength(8);
    for (let i = 0; i < 8; i += 1) {
      expect(STARTER_FILLS[i].toUpperCase()).toBe(tagHex(i + 1).toUpperCase());
    }
  });
});

describe('isHexColor', () => {
  it('accepts #RRGGBB', () => {
    expect(isHexColor('#FFFFFF')).toBe(true);
    expect(isHexColor('#b83a3a')).toBe(true);
  });

  it('rejects short or bare values', () => {
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('FFFFFF')).toBe(false);
  });
});

describe('starterDrafts', () => {
  it('gives timetable starters white text', () => {
    for (const draft of starterDrafts('timetable')) {
      expect(draft.textColor).toBe('#FFFFFF');
      expect(draft.kind).toBe('timetable');
    }
  });

  it('gives calendar starters null text', () => {
    for (const draft of starterDrafts('calendar')) {
      expect(draft.textColor).toBeNull();
      expect(draft.kind).toBe('calendar');
    }
  });
});

describe('resolveTimetablePaint', () => {
  const swatch = {
    id: 's1',
    owner: 'Jeff',
    kind: 'timetable' as const,
    fill: '#B83A3A',
    textColor: '#FFFFFF',
    position: 0,
  };

  it('uses the swatch text when override is null', () => {
    expect(resolveTimetablePaint(swatch, null)).toEqual({
      fill: '#B83A3A',
      text: '#FFFFFF',
    });
  });

  it('uses the override when present', () => {
    expect(resolveTimetablePaint(swatch, '#3B2E2A').text).toBe('#3B2E2A');
  });
});

describe('canDeleteSwatch', () => {
  it('allows when unused', () => {
    expect(canDeleteSwatch('a', ['b'])).toBe(true);
  });

  it('refuses when used', () => {
    expect(canDeleteSwatch('a', ['a', 'b'])).toBe(false);
  });
});

describe('applyTextUpdateAll', () => {
  it('updates the swatch and clears overrides that matched the old default', () => {
    const swatch = {
      id: 's1',
      owner: 'Jeff',
      kind: 'timetable' as const,
      fill: '#B83A3A',
      textColor: '#FFFFFF',
      position: 0,
    };
    const result = applyTextUpdateAll(swatch, '#3B2E2A', [
      { id: 'r1', swatchId: 's1', textOverride: null },
      { id: 'r2', swatchId: 's1', textOverride: '#FFFFFF' },
      { id: 'r3', swatchId: 's1', textOverride: '#000000' },
      { id: 'r4', swatchId: 'other', textOverride: '#FFFFFF' },
    ]);
    expect(result.swatch.textColor).toBe('#3B2E2A');
    expect(result.rulePatches.map((p) => p.id).sort()).toEqual(['r2']);
  });
});

describe('legacyIndexToStarterPosition', () => {
  it('maps 1..8 to 0..7', () => {
    expect(legacyIndexToStarterPosition(1)).toBe(0);
    expect(legacyIndexToStarterPosition(8)).toBe(7);
  });

  it('returns null outside 1..8', () => {
    expect(legacyIndexToStarterPosition(0)).toBeNull();
    expect(legacyIndexToStarterPosition(9)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/colourPalette.test.ts`  
Expected: FAIL — cannot resolve `./colourPalette`.

- [ ] **Step 3: Implement**

Create `src/lib/colourPalette.ts` so every test passes. `STARTER_FILLS` must be the eight literals that match `globals.css` today (`#B83A3A`, `#A05A12`, `#4F7A2A`, `#17706A`, `#2C5FA8`, `#5B3FA0`, `#A63478`, `#5A5560`). `isHexColor` = `/^#[0-9A-Fa-f]{6}$/`. `starterDrafts` sets `position` to the index. `applyTextUpdateAll` only patches rules where `swatchId === swatch.id` and `textOverride === swatch.textColor` (the old default); rules with `textOverride === null` already follow the swatch and need no patch row.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/colourPalette.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/colourPalette.ts src/lib/colourPalette.test.ts
git commit -m "feat(colour): add personal palette helpers and starter fills"
```

---

## Task 2: SQL setup + colour repository

**Files:**
- Create: `docs/superpowers/specs/2026-09-04-colour-palettes-setup.sql`
- Create: `src/lib/colourRepo.ts`
- Modify: `src/lib/supabase.ts` (schema comment only)

**Interfaces:**
- Consumes: `ColourSwatch`, `PaletteKind`, `starterDrafts`, `isHexColor` from `colourPalette`; `supabase`; `UserName` from `identity`.
- Produces:

```ts
export async function fetchPalette(
  owner: UserName,
  kind: PaletteKind,
): Promise<ColourSwatch[] | null>;

export async function insertSwatch(
  owner: UserName,
  kind: PaletteKind,
  fill: string,
  textColor: string | null,
): Promise<ColourSwatch | null>;

export async function updateSwatch(
  id: string,
  patch: { fill?: string; textColor?: string | null },
): Promise<boolean>;

export async function deleteSwatch(id: string): Promise<boolean>;
```

`fetchPalette` must: select by owner+kind ordered by `position`; if error → `null`; if empty → insert `starterDrafts(kind)` for that owner (generate ids via DB default), then select again.

- [ ] **Step 1: Write the SQL file**

```sql
-- Personal colour palettes — schema
-- Design: 2026-09-04-personal-colour-palettes-design.md
-- Run in the Supabase SQL editor. The app never creates tables.
--
-- Part 1 — safe: new table.
-- Part 2 — alters timetable_rules and calendar categories; run when the
--          new code is ready. Keeps legacy `swatch` until the app has
--          migrated rows; Part 3 drops legacy columns.

-- Part 1
create table colour_swatches (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null,
  kind       text not null check (kind in ('timetable', 'calendar')),
  fill       text not null,
  text_color text,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

create index colour_swatches_owner_kind_idx
  on colour_swatches (owner, kind);

alter table colour_swatches enable row level security;

create policy "anon reads colour_swatches"
  on colour_swatches for select to anon using (true);
create policy "anon inserts colour_swatches"
  on colour_swatches for insert to anon with check (true);
create policy "anon updates colour_swatches"
  on colour_swatches for update to anon using (true) with check (true);
create policy "anon deletes colour_swatches"
  on colour_swatches for delete to anon using (true);

-- Part 2 (timetable_rules + categories — adjust category table name to match repo)
alter table timetable_rules
  add column if not exists swatch_id uuid,
  add column if not exists text_override text;

-- calendar categories table: confirm name in calendarRepo (likely calendar_categories)
alter table calendar_categories
  add column if not exists swatch_id uuid;

-- Part 3 (after client migration has filled swatch_id)
-- alter table timetable_rules drop column swatch;
-- alter table timetable_rules alter column swatch_id set not null;
-- alter table calendar_categories drop column swatch;
-- alter table calendar_categories alter column swatch_id set not null;
```

Confirm the real categories table name from `calendarRepo.ts` before pasting Part 2; fix the SQL to match.

- [ ] **Step 2: Implement `colourRepo.ts`**

Map DB `text_color` ↔ `textColor`. On insert, `position` = current palette length (fetch count or max+1). Reject non-hex fill (and timetable text) by returning `null` without throwing. No Vitest for this file (I/O).

- [ ] **Step 3: Append schema comment in `supabase.ts`** for `colour_swatches` and the new columns.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`  
Expected: clean (warnings elsewhere ok).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-09-04-colour-palettes-setup.sql src/lib/colourRepo.ts src/lib/supabase.ts
git commit -m "feat(colour): add colour_swatches repo and setup SQL"
```

---

## Task 3: Timetable rule shape — swatchId + textOverride

**Files:**
- Modify: `src/lib/timetableRule.ts`
- Modify: `src/lib/timetableRule.test.ts`

**Interfaces:**
- Produces: `TimetableRule` / `RuleDraft` use `swatchId: string` and `textOverride: string | null` (draft may omit override as null). Drop `SwatchIndex` import. Add rule error `{ kind: 'swatchRequired' }` when `swatchId === ''`.

- [ ] **Step 1: Update tests**

Replace every `swatch: N` fixture with `swatchId: 's1'` (and `textOverride: null`). Add:

```ts
it('refuses a missing swatch', () => {
  const draft = { ...validDraft, swatchId: '' };
  expect(validateRule(draft, 'Jeff', [], null)?.kind).toBe('swatchRequired');
});
```

Update `ruleMessage` for `swatchRequired` → `'Pick a colour.'`

- [ ] **Step 2: Run — expect failures**

Run: `npx vitest run src/lib/timetableRule.test.ts`

- [ ] **Step 3: Implement type + validation changes**

- [ ] **Step 4: Pass tests + commit**

```bash
git add src/lib/timetableRule.ts src/lib/timetableRule.test.ts
git commit -m "feat(timetable): point rules at a personal swatch id"
```

---

## Task 4: Timetable repo — columns + legacy migrate

**Files:**
- Modify: `src/lib/timetableRepo.ts`

**Interfaces:**
- Consumes: `legacyIndexToStarterPosition` from `colourPalette`; `fetchPalette` from `colourRepo`.
- `fetchRules` maps `swatch_id`, `text_override`. While legacy `swatch` may still be present, if `swatch_id` is null and `swatch` is 1–8, resolve via that owner's timetable palette (call `fetchPalette(owner,'timetable')`), pick starter at `legacyIndexToStarterPosition(swatch)`, `update` that rule's `swatch_id`, then return the migrated shape.
- `insertRule` / `updateRule` write `swatch_id` and `text_override`.

No new test file (I/O). After change, `tsc` must pass; temporarily allow Timetable UI to break until Tasks 6–7 — if `tsc` fails on components, add minimal type stubs in the same commit only if needed, or land Task 6 same day. Prefer fixing callers in Tasks 6–7 immediately after.

- [ ] **Step 1: Rewrite column mapping**
- [ ] **Step 2: `npx tsc --noEmit`** — fix only repo types here; component errors are ok until Task 6 if the branch is private, but do not commit a red `tsc` if CI is on. Fix RuleModal types in Task 6 before push.
- [ ] **Step 3: Commit**

```bash
git add src/lib/timetableRepo.ts
git commit -m "feat(timetable): read and write swatch_id with legacy migrate"
```

---

## Task 5: Colour wheel (no eyedropper)

**Files:**
- Create: `src/components/colour/ColourWheel.tsx`

**Interfaces:**
- Produces: `ColourWheel({ value, onChange }: { value: string; onChange: (hex: string) => void })`  
  UI: saturation/value square + hue slider + circular preview. **No eyedropper.** Output always `#RRGGBB` uppercase or lowercase consistently (`#` + 6 hex). Use `--mt-*` for chrome (borders, focus); the preview circle uses `value` as data.

HSV ↔ RGB helpers may live in the same file as private functions (not exported) or in `lib/colourWheel.ts` if you want them tested — if extracted, add `colourWheel.test.ts` for round-trip of a few known colours (`#FF0000`, `#FFFFFF`, `#000000`). Prefer extract + test.

- [ ] **Step 1 (optional but recommended): `lib/colourWheel.ts` + tests for hsv/rgb**
- [ ] **Step 2: Build `ColourWheel.tsx`**
- [ ] **Step 3: tsc + lint**
- [ ] **Step 4: Commit**

```bash
git add src/components/colour/ColourWheel.tsx src/lib/colourWheel.ts src/lib/colourWheel.test.ts
git commit -m "feat(colour): add square and hue colour wheel"
```

---

## Task 6: Swatch add sheet + text scope dialog

**Files:**
- Create: `src/components/colour/SwatchAddSheet.tsx`
- Create: `src/components/colour/TextScopeDialog.tsx`

**Interfaces:**

`SwatchAddSheet`:

```tsx
({
  open, kind, title, timeLabel, // timeLabel only meaningful for timetable preview
  initialFill, initialText, // text ignored when kind==='calendar'; initialText defaults '#FFFFFF' for timetable
  onClose,
  onConfirm, // (fill, textColor: string | null) => void
}: ...)
```

- Timetable: ColourWheel for fill, second ColourWheel (or compact control) for text, preview card `style={{ background: fill, color: text }}` showing title + timeLabel.
- Calendar: fill wheel only; no preview; `onConfirm(fill, null)`.

`TextScopeDialog`:

```tsx
({ open, onClose, onJustThis, onUpdateAll }: ...)
```

Copy: title “Update text colour for?”; buttons Just this event / Update colour for all / Cancel. Use existing `Modal` `variant="sheet"`.

- [ ] **Step 1: Implement both components**
- [ ] **Step 2: tsc + lint**
- [ ] **Step 3: Commit**

```bash
git add src/components/colour/SwatchAddSheet.tsx src/components/colour/TextScopeDialog.tsx
git commit -m "feat(colour): add swatch sheet with timetable preview"
```

---

## Task 7: Wire timetable RuleModal, grid, list, board

**Files:**
- Modify: `RuleModal.tsx`, `TimetableGrid.tsx`, `RecurringList.tsx`, `TimetableBoard.tsx`

**Behaviour:**
- Board loads `fetchPalette(shown, 'timetable')` with rules; passes `swatches: ColourSwatch[]` and `isMine` into modal/list/grid.
- Grid/list resolve paint via `resolveTimetablePaint` + lookup swatch by `rule.swatchId`; if swatch missing, skip painting fancy — use `--mt-text` on `--mt-surface` only if that case can occur after migrate; otherwise assume present.
- RuleModal: show owner's swatches + Add; Add opens `SwatchAddSheet` kind timetable; on confirm `insertSwatch` then select new id. Delete swatch: if `!canDeleteSwatch(id, rules.map(r => r.swatchId))` show alert string; else `deleteSwatch`. Changing text while a swatch is selected opens `TextScopeDialog` when editing an existing rule that already had that swatch; for brand-new draft, set `textOverride` only if text ≠ swatch.textColor (“just this” by default without dialog), or always treat draft text difference as override until save — **product rule:** when the user edits text colour in the modal, always open the scope dialog if `editing !== null`; if adding new, store as `textOverride` when text ≠ swatch default, else null.
- Empty palette: Save calls validate → `swatchRequired`.
- Partner (`!isMine`): no Add, no delete, tapping swatch does nothing; grid still shows colours.

- [ ] **Step 1: Wire board fetch/pass**
- [ ] **Step 2: Update grid + list styles to hex**
- [ ] **Step 3: Rewrite RuleModal colour section**
- [ ] **Step 4: `npm test && npx tsc --noEmit && npm run lint`**
- [ ] **Step 5: Commit**

```bash
git add src/components/timetable/
git commit -m "feat(timetable): personal swatches with preview and text scope"
```

---

## Task 8: Categories + calendar repo → swatchId

**Files:**
- Modify: `src/lib/categories.ts`, `src/lib/categories.test.ts`
- Modify: `src/lib/calendarRepo.ts`

**Interfaces:**
- `Category.swatch` → `swatchId: string`
- `CategoryDraft.swatch` → `swatchId: string`
- `validateCategory`: unknown swatch id check becomes `swatchId === ''` → `swatchOutOfRange` or new `swatchRequired` — keep message `'Pick one of the colours shown.'` or `'Pick a colour.'` consistently with timetable.
- Remove dependency on `SWATCHES.some(index)` for validation.
- Keep exporting `SWATCHES` / `swatchToken` **only** if something outside calendar/timetable still needs them; otherwise delete and fix imports (heatmap does not use them). Grep before deleting.
- `calendarRepo`: map `swatch_id`. Categories **stay shared** (table `calendar_categories` has no owner today). Each person still has their own calendar palette (D97). When editing, you pick from **your** palette; the category’s `swatch_id` may point at Jeff’s or Rachel’s row. Paint resolves fill by id. Legacy migrate: seed both owners’ calendar palettes, set each category’s `swatch_id` to **Jeff’s** starter at `legacyIndexToStarterPosition(swatch)` (deterministic; same fills). Delete uses `canDeleteSwatch` against all category `swatchId`s.

- [ ] **Step 1: Update category types; keep shared categories**
- [ ] **Step 2: Update category validation tests**
- [ ] **Step 3: Repo mapping + migrate**
- [ ] **Step 4: Commit**

```bash
git add src/lib/categories.ts src/lib/categories.test.ts src/lib/calendarRepo.ts docs/superpowers/specs/2026-09-04-colour-palettes-setup.sql
git commit -m "feat(calendar): point categories at personal swatch ids"
```

---

## Task 9: CategoryManager — calendar palette UI

**Files:**
- Modify: `src/components/calendar/CategoryManager.tsx`
- Modify: `src/components/calendar/CalendarBoard.tsx` (pass palette + callbacks)

**Behaviour:**
- Load/pass calendar `ColourSwatch[]` for `me`.
- Colour row = swatches + Add → `SwatchAddSheet` kind `calendar`.
- Delete refused via `canDeleteSwatch` against category `swatchId`s.
- No text, no preview.
- `onAdd` / rename take `swatchId`.

- [ ] **Step 1: Wire manager**
- [ ] **Step 2: tsc + lint**
- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/CategoryManager.tsx src/components/calendar/CalendarBoard.tsx
git commit -m "feat(calendar): personal fill palette in category manager"
```

---

## Task 10: Calendar surfaces paint from hex

**Files:**
- Modify: `EventBlock.tsx`, `EventModal.tsx`, `FilterStrip.tsx` (and any other `swatchToken(category.swatch)` call sites from the earlier grep)

Replace `var(${swatchToken(...)})` with lookup of fill hex from the swatch map passed down, or attach `fill` onto a view model when board loads (`categories.map` join palette). Prefer joining once in the board: `type CategoryView = Category & { fill: string }`.

- [ ] **Step 1: Join fill at board**
- [ ] **Step 2: Update consumers**
- [ ] **Step 3: Full gate `npm test && npx tsc --noEmit && npm run lint`**
- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/
git commit -m "feat(calendar): paint events from personal swatch fills"
```

---

## Task 11: Drop legacy columns (SQL Part 3) + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-09-04-colour-palettes-setup.sql` (uncomment Part 3 with clear WARNING)
- Modify: verification note or short `docs/superpowers/verification/2026-09-04-personal-colour-palettes.md` stub listing what to click
- Ask Jeff to run Part 1 → deploy code → use app (migrates) → Part 3

- [ ] **Step 1: Finalize SQL comments for order of operations**
- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-09-04-colour-palettes-setup.sql docs/superpowers/verification/2026-09-04-personal-colour-palettes.md
git commit -m "docs: colour palette SQL parts and verification checklist"
```

---

## Task 12: Browser verification

**Files:** none (or fill verification md).

Jeff must have run SQL Part 1 (+ Part 2 alters) before this.

- [ ] Timetable: add custom fill+text; preview matches; save; block shows same
- [ ] Timetable: text scope Just this vs Update all
- [ ] Timetable: delete in-use refused; delete unused ok
- [ ] Rachel view: Jeff colours visible; no Add
- [ ] Calendar: add fill only; no text/preview; events tint
- [ ] Empty-palette path only if tested by deleting unused starters carefully
- [ ] Console: no failed Supabase calls after SQL
- [ ] Commit verification notes

```bash
git commit -m "docs: record personal colour palette browser verification"
```

---

## Self-Review

**Spec coverage:** D97–D108 mapped in header table; partner read-only in Tasks 7/10; migration Tasks 2–4/8; preview Task 6–7; calendar fill-only Tasks 9–10.

**Placeholders:** None. Categories stay shared; palettes stay personal; table name is `calendar_categories`.

**Type consistency:** `swatchId` + `textOverride` on rules; `ColourSwatch.textColor`; repo `text_color`; `PaletteKind` `'timetable' | 'calendar'` throughout.

**YAGNI:** No eyedropper, no shared palette, no named labels, no Dexie.
