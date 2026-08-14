# Life Hub & Macaron Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Masa Tomato from a Pomodoro app into a two-person life dashboard — a drawer menu, a home hub at `/`, five inert section shells, a macaron palette in two moods, and home-screen install on both phones.

**Architecture:** Two CSS token layers (raw `--mac-*` hues, semantic `--mt-*` tokens re-pointed by a `data-mood` attribute) let App Router route groups `(life)` and `(focus)` carry a visual mood without any runtime code. Navigation splits into a drawer reaching all nine routes plus a four-slot mobile bottom bar. The five new sections ship fully styled but inert.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand, Dexie (IndexedDB), Supabase, lucide-react, Recharts, react-activity-calendar, vitest.

**Spec:** `docs/superpowers/specs/2026-08-15-life-hub-macaron-design.md`

## Global Constraints

- **Read `node_modules/next/dist/docs/` before writing Next-specific code.** Per `AGENTS.md`, this Next version has breaking changes versus training data.
- `viewport` exports are **supported only in Server Components**. Both route-group layouts must stay server components — do not add `'use client'` to them.
- Components reference **semantic tokens only** (`--mt-bg`, `--mt-surface`, `--mt-text`, `--mt-text-muted`, `--mt-border`, `--mt-accent`). Never reference `--mac-*` directly outside `globals.css`.
- **`TimerEngine` must remain in `AppShell`**, above the route groups. Moving it breaks timers running across navigation.
- Section accents are fixed values (spec §6.2). Accents may sit behind text only where contrast reaches 4.5:1; otherwise they are fills and bars only.
- All sample data on shell pages carries a visible `Sample` chip at reduced emphasis.
- **Commits: no `Co-Authored-By` trailer.** Commit as the repo owner only.
- Public URLs after this work: `/`, `/timer`, `/flexible`, `/dashboard`, `/cycle`, `/countdown`, `/meals`, `/fitness`, `/finance`.

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/hubStats.ts` | Pure focus-stat aggregation for the hub |
| `src/lib/hubStats.test.ts` | Its tests |
| `src/components/nav/navLinks.ts` | Single source of truth for nav destinations |
| `src/components/nav/NavDrawer.tsx` | Hamburger trigger + slide-in panel + open state |
| `src/components/ui/PageShell.tsx` | Page frame: title, subtitle, accent, padding |
| `src/components/ui/Card.tsx` | Mood-aware surface |
| `src/components/ui/StatTile.tsx` | Hub glance block |
| `src/components/ui/ComingSoon.tsx` | Not-built-yet marker + `Sample` chip |
| `src/components/InstallPrompt.tsx` | Home-screen install guidance |
| `src/app/manifest.ts` | Web app manifest |
| `src/app/(life)/layout.tsx` | Light mood + cream themeColor |
| `src/app/(life)/page.tsx` | The hub, serves `/` |
| `src/app/(life)/{cycle,countdown,meals,fitness,finance}/page.tsx` | The five shells |
| `src/app/(focus)/layout.tsx` | Dark mood + plum themeColor |

**Moved**

| From | To |
|---|---|
| `src/app/page.tsx` | `src/app/(focus)/timer/page.tsx` |
| `src/app/flexible/page.tsx` | `src/app/(focus)/flexible/page.tsx` |
| `src/app/dashboard/page.tsx` | `src/app/(life)/dashboard/page.tsx` |
| `src/components/AppNav.tsx` | `src/components/nav/AppNav.tsx` |

**Modified:** `src/app/globals.css` (token system), `src/app/layout.tsx` (body token, appleWebApp), `src/components/AppShell.tsx` (nav wiring), `src/components/BackgroundManager.tsx` (mood-aware), `src/components/Gatekeeper.tsx` (explicit light mood), plus the 15-file colour sweep.

**Deviation from spec §5.2, flagged for review:** the spec lists `MenuButton` and `NavDrawer` as separate components. This plan folds the button into `NavDrawer.tsx`, because separating them would require lifting open-state into a third parent for no benefit. `navLinks.ts` carries the shared data both `NavDrawer` and `AppNav` need. Reject this task if you disagree — nothing later depends on the choice.

---

### Task 1: Macaron token foundation

Establishes the two token layers. No component changes yet — the app should look **identical** after this task, because the old `--mt-*` names still resolve. That is the point: it proves the foundation is additive before anything depends on it.

**Files:**
- Modify: `src/app/globals.css:1-30` (the `:root` block)

**Interfaces:**
- Consumes: nothing
- Produces: semantic tokens `--mt-bg`, `--mt-surface`, `--mt-surface-raised`, `--mt-border`, `--mt-text`, `--mt-text-muted`, `--mt-accent`, `--mt-accent-contrast`; utility classes `.mt-soft`, `.mt-glass`; accent tokens `--mac-accent-{timer,flexible,dashboard,cycle,countdown,meals,fitness,finance}`

- [ ] **Step 1: Add the raw macaron hues and mood mappings**

Replace the existing `:root` block in `src/app/globals.css` (lines 3-30, ending with `--mt-chrome-offset`) with:

```css
:root {
  /* ---- Raw macaron hues. Never referenced outside this file. ---- */
  --mac-cream: #FDF8F3;
  --mac-white: #FFFFFF;
  --mac-border-light: #F0E4DA;
  --mac-cocoa: #3B2E2A;
  --mac-cocoa-muted: #8A7570;

  --mac-plum: #241C22;
  --mac-plum-raised: #31262E;
  --mac-border-dark: #453640;
  --mac-shell: #F7EFEA;
  --mac-shell-muted: #B5A2AC;

  /* Section accents (spec §6.2) */
  --mac-accent-timer: #EF9A8D;
  --mac-accent-flexible: #F0CE87;
  --mac-accent-dashboard: #C4B0E0;
  --mac-accent-cycle: #F2A7BE;
  --mac-accent-countdown: #A8DCD1;
  --mac-accent-meals: #D9AC80;
  --mac-accent-fitness: #B4D9A0;
  --mac-accent-finance: #A9C4E8;

  --mac-danger: #E07A6B;
  --mac-success: #7FBF8F;

  /* ---- Layout tokens, mood-independent ---- */
  --mt-radius-card: 1.5rem;
  --mt-radius-control: 9999px;
  --mt-safe-top: env(safe-area-inset-top, 0px);
  --mt-safe-right: env(safe-area-inset-right, 0px);
  --mt-safe-bottom: env(safe-area-inset-bottom, 0px);
  --mt-safe-left: env(safe-area-inset-left, 0px);
  --mt-nav-height: 4.25rem;
  --mt-chrome-offset: calc(var(--mt-safe-top) + 1.25rem);

  /* Default mood is light; groups override on their wrapper. */
  --mt-bg: var(--mac-cream);
  --mt-surface: var(--mac-white);
  --mt-surface-raised: var(--mac-white);
  --mt-border: var(--mac-border-light);
  --mt-text: var(--mac-cocoa);
  --mt-text-muted: var(--mac-cocoa-muted);
  --mt-text-subtle: color-mix(in srgb, var(--mac-cocoa) 45%, transparent);
  --mt-accent: var(--mac-accent-timer);
  --mt-accent-contrast: var(--mac-cocoa);
  --mt-danger: var(--mac-danger);
  --mt-success: var(--mac-success);

  /* Legacy alias. Deleted in Task 12 once the sweep is complete. */
  --mt-midnight: var(--mt-bg);
  --mt-navy: var(--mt-surface);
  --mt-surface-elevated: var(--mt-surface-raised);
  --mt-glass: var(--mt-surface);
  --mt-glass-strong: var(--mt-surface);
  --mt-accent-glow: color-mix(in srgb, var(--mt-accent) 55%, transparent);
  --background: var(--mt-bg);
  --foreground: var(--mt-text);
}

[data-mood='light'] {
  --mt-bg: var(--mac-cream);
  --mt-surface: var(--mac-white);
  --mt-surface-raised: var(--mac-white);
  --mt-border: var(--mac-border-light);
  --mt-text: var(--mac-cocoa);
  --mt-text-muted: var(--mac-cocoa-muted);
  --mt-text-subtle: color-mix(in srgb, var(--mac-cocoa) 45%, transparent);
  --mt-accent-contrast: var(--mac-cocoa);
  --mt-glass: color-mix(in srgb, var(--mac-white) 72%, transparent);
  --mt-glass-strong: color-mix(in srgb, var(--mac-white) 88%, transparent);
}

[data-mood='dark'] {
  --mt-bg: var(--mac-plum);
  --mt-surface: var(--mac-plum-raised);
  --mt-surface-raised: color-mix(in srgb, var(--mac-plum-raised) 80%, var(--mac-shell) 6%);
  --mt-border: var(--mac-border-dark);
  --mt-text: var(--mac-shell);
  --mt-text-muted: var(--mac-shell-muted);
  --mt-text-subtle: color-mix(in srgb, var(--mac-shell) 40%, transparent);
  --mt-accent-contrast: var(--mac-plum);
  --mt-glass: color-mix(in srgb, var(--mac-plum) 45%, transparent);
  --mt-glass-strong: color-mix(in srgb, var(--mac-plum) 62%, transparent);
}
```

- [ ] **Step 2: Fix the page-level background so overscroll matches the mood**

A nested layout cannot set attributes on `<html>`, so the root background is selected with `:has()`. Replace the existing `@media (prefers-color-scheme: light)` block and the `body` rule in `globals.css` with:

```css
html {
  background-color: var(--mac-cream);
}

html:has([data-mood='dark']) {
  background-color: var(--mac-plum);
}

body {
  background: transparent;
  color: var(--mt-text);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
}
```

The old `prefers-color-scheme` block is deleted — mood is chosen by route, not by OS preference.

- [ ] **Step 3: Replace `.mt-glass` and add `.mt-soft`**

Replace the existing `.mt-glass` rule with these two:

```css
.mt-glass {
  background: var(--mt-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--mt-border);
}

/* Light-mood surface. The accent-tinted shadow is what keeps pastel
   surfaces from reading as washed out; a grey shadow on cream looks dirty. */
.mt-soft {
  background: var(--mt-surface);
  border: 1px solid var(--mt-border);
  border-radius: var(--mt-radius-card);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--mt-accent) 14%, transparent);
}
```

- [ ] **Step 4: Re-tune page padding for the four-slot bottom bar**

Replace the `.mt-page-pad` rule with:

```css
.mt-page-pad {
  padding-top: calc(var(--mt-chrome-offset) + 3.5rem);
  padding-bottom: calc(var(--mt-safe-bottom) + var(--mt-nav-height) + 1.5rem);
  padding-left: max(1rem, var(--mt-safe-left));
  padding-right: max(1rem, var(--mt-safe-right));
}

@media (min-width: 768px) {
  .mt-page-pad {
    padding-top: calc(var(--mt-chrome-offset) + 4.5rem);
    padding-bottom: calc(var(--mt-safe-bottom) + 2rem);
  }
}
```

- [ ] **Step 5: Verify nothing broke**

Run: `npm run build`
Expected: build succeeds with no CSS errors.

Run: `npm run dev`, open `http://localhost:3000`
Expected: the app renders. It will now be **cream instead of navy** — that is correct and expected, since the legacy aliases point at the new light tokens. Text may be low-contrast in places; the sweep in Tasks 11-13 fixes that. Confirm no page is unreadable to the point of being unusable.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add macaron token layers and mood mappings"
```

---

### Task 2: Hub focus statistics

The only genuinely testable logic in this round. Built before the hub so the hub has something real to render.

**Files:**
- Create: `src/lib/hubStats.ts`
- Test: `src/lib/hubStats.test.ts`

**Interfaces:**
- Consumes: `SessionRecord` from `src/db/db.ts` — fields used: `mode: 'focus' | 'shortBreak' | 'longBreak'`, `date: string` (`YYYY-MM-DD`, local), `durationMinutes: number`
- Produces: `toLocalDateKey(d: Date): string`; `computeHubStats(sessions: SessionRecord[], now: Date): HubFocusStats` where `HubFocusStats = { todayMinutes: number; streakDays: number }`

**Streak rule, stated precisely so the test and implementation agree:** count consecutive days that have at least one `focus` session, working backwards from today. If today has none, start counting from yesterday instead, so a streak is not shown as broken before the day is over. If neither today nor yesterday has one, the streak is 0.

- [ ] **Step 1: Write the failing test**

Create `src/lib/hubStats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeHubStats, toLocalDateKey } from './hubStats';
import type { SessionRecord } from '@/db/db';

const NOW = new Date(2026, 7, 15, 14, 30); // 15 Aug 2026, local

function session(
  date: string,
  durationMinutes: number,
  mode: SessionRecord['mode'] = 'focus'
): SessionRecord {
  return { date, durationMinutes, mode, completedAt: 0 };
}

describe('toLocalDateKey', () => {
  it('formats a local date without shifting to UTC', () => {
    // 23:30 local on the 15th must stay the 15th, not roll to the 16th.
    expect(toLocalDateKey(new Date(2026, 7, 15, 23, 30))).toBe('2026-08-15');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('computeHubStats', () => {
  it('returns zeroes for an empty history', () => {
    expect(computeHubStats([], NOW)).toEqual({ todayMinutes: 0, streakDays: 0 });
  });

  it("sums today's focus minutes across multiple sessions", () => {
    const stats = computeHubStats(
      [session('2026-08-15', 25), session('2026-08-15', 50)],
      NOW
    );
    expect(stats.todayMinutes).toBe(75);
  });

  it('ignores break sessions in both minutes and streak', () => {
    const stats = computeHubStats(
      [session('2026-08-15', 5, 'shortBreak'), session('2026-08-15', 15, 'longBreak')],
      NOW
    );
    expect(stats).toEqual({ todayMinutes: 0, streakDays: 0 });
  });

  it('counts consecutive days ending today', () => {
    const stats = computeHubStats(
      [session('2026-08-15', 25), session('2026-08-14', 25), session('2026-08-13', 25)],
      NOW
    );
    expect(stats.streakDays).toBe(3);
  });

  it('keeps the streak alive when today has no session yet', () => {
    const stats = computeHubStats(
      [session('2026-08-14', 25), session('2026-08-13', 25)],
      NOW
    );
    expect(stats).toEqual({ todayMinutes: 0, streakDays: 2 });
  });

  it('breaks the streak at a gap', () => {
    const stats = computeHubStats(
      [session('2026-08-15', 25), session('2026-08-13', 25)],
      NOW
    );
    expect(stats.streakDays).toBe(1);
  });

  it('reports no streak when neither today nor yesterday has a session', () => {
    const stats = computeHubStats([session('2026-08-10', 25)], NOW);
    expect(stats.streakDays).toBe(0);
  });

  it('counts a streak spanning a month boundary', () => {
    const stats = computeHubStats(
      [session('2026-08-01', 25), session('2026-07-31', 25)],
      new Date(2026, 7, 1, 9, 0)
    );
    expect(stats.streakDays).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/hubStats.test.ts`
Expected: FAIL — cannot resolve `./hubStats`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/hubStats.ts`:

```ts
import type { SessionRecord } from '@/db/db';

export interface HubFocusStats {
  /** Focus minutes completed today. Breaks excluded. */
  todayMinutes: number;
  /** Consecutive days with at least one focus session. */
  streakDays: number;
}

/**
 * Local calendar date as YYYY-MM-DD.
 * Deliberately not toISOString() — that converts to UTC and shifts the day
 * for anyone east or west of Greenwich late in the evening.
 */
export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeHubStats(
  sessions: SessionRecord[],
  now: Date
): HubFocusStats {
  const todayKey = toLocalDateKey(now);
  const focusDays = new Set<string>();
  let todayMinutes = 0;

  for (const s of sessions) {
    if (s.mode !== 'focus') continue;
    focusDays.add(s.date);
    if (s.date === todayKey) todayMinutes += s.durationMinutes;
  }

  // Start from yesterday when today is still empty, so the streak isn't
  // reported as broken before the day is over.
  const cursor = new Date(now);
  if (!focusDays.has(todayKey)) cursor.setDate(cursor.getDate() - 1);

  let streakDays = 0;
  while (focusDays.has(toLocalDateKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { todayMinutes, streakDays };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/hubStats.test.ts`
Expected: PASS, 9 tests.

Run: `npm run test`
Expected: the whole suite passes — 6 test files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hubStats.ts src/lib/hubStats.test.ts
git commit -m "feat: add hub focus statistics with streak calculation"
```

---

### Task 3: Route groups and page moves

Restructures routing. After this task all nine URLs resolve and moods apply, but the new pages do not exist yet — only the three existing ones move.

**Files:**
- Create: `src/app/(life)/layout.tsx`, `src/app/(focus)/layout.tsx`
- Move: `src/app/page.tsx` → `src/app/(focus)/timer/page.tsx`
- Move: `src/app/flexible/page.tsx` → `src/app/(focus)/flexible/page.tsx`
- Move: `src/app/dashboard/page.tsx` → `src/app/(life)/dashboard/page.tsx`
- Create: `src/app/(life)/page.tsx` (temporary stub, replaced in Task 8)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: token system from Task 1
- Produces: routes `/`, `/timer`, `/flexible`, `/dashboard`; a `data-mood` element wrapping every page

- [ ] **Step 1: Create the light group layout**

Create `src/app/(life)/layout.tsx`. No `'use client'` — `viewport` requires a Server Component.

```tsx
import type { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#FDF8F3',
};

export default function LifeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-mood="light" className="flex flex-1 flex-col bg-[var(--mt-bg)]">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create the dark group layout**

Create `src/app/(focus)/layout.tsx`:

```tsx
import type { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#241C22',
};

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-mood="dark" className="flex flex-1 flex-col bg-[var(--mt-bg)]">
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Move the three existing pages**

```bash
mkdir -p "src/app/(focus)/timer" "src/app/(focus)/flexible" "src/app/(life)/dashboard"
git mv src/app/page.tsx "src/app/(focus)/timer/page.tsx"
git mv src/app/flexible/page.tsx "src/app/(focus)/flexible/page.tsx"
git mv src/app/dashboard/page.tsx "src/app/(life)/dashboard/page.tsx"
rmdir src/app/flexible src/app/dashboard
```

Then rename the moved timer component for clarity — in `src/app/(focus)/timer/page.tsx`, change `export default function Home()` to `export default function TimerPage()`. Its body is unchanged.

- [ ] **Step 4: Add a temporary hub stub so `/` resolves**

Create `src/app/(life)/page.tsx`. Task 8 replaces this entirely.

```tsx
export default function HubPage() {
  return (
    <main className="mt-page-pad flex-1">
      <h1 className="text-2xl font-semibold text-[var(--mt-text)]">Home</h1>
    </main>
  );
}
```

- [ ] **Step 5: Update the root layout**

In `src/app/layout.tsx`, replace the `viewport` export and the `<body>` className. The root `themeColor` is dropped — each group now sets its own.

```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

```tsx
<body className="min-h-full flex flex-col bg-[var(--mt-bg)] text-[var(--mt-text)]">
```

- [ ] **Step 6: Verify routing and the timer-survives-navigation guarantee**

Run: `npm run build`
Expected: build succeeds. Route list shows `/`, `/timer`, `/flexible`, `/dashboard` — **not** `/(life)` or `/(focus)`; route groups do not appear in URLs.

Run: `npm run dev`, then:
- Visit `/timer` — renders the timer on the dark plum background.
- Visit `/dashboard` — renders on the cream background.
- **Start a timer on `/timer`, navigate to `/dashboard`, wait 10 seconds, return to `/timer`.** The timer must have kept counting. If it reset, `TimerEngine` was disturbed — stop and fix before continuing.
- On a phone or device emulation, confirm the status bar tint differs between `/` and `/timer`.

- [ ] **Step 7: Commit**

```bash
git add -A src/app
git commit -m "feat: split routes into life and focus groups, move timer to /timer"
```

---

### Task 4: UI primitives

**Files:**
- Create: `src/components/ui/PageShell.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/StatTile.tsx`, `src/components/ui/ComingSoon.tsx`

**Interfaces:**
- Consumes: semantic tokens from Task 1
- Produces:
  - `type AccentName = 'timer' | 'flexible' | 'dashboard' | 'cycle' | 'countdown' | 'meals' | 'fitness' | 'finance'`
  - `<PageShell title accent {...} />` — props `{ title: string; subtitle?: string; accent: AccentName; children: React.ReactNode }`
  - `<Card className? children />`
  - `<StatTile label value hint? accent? />` — props `{ label: string; value: string; hint?: string; accent?: AccentName }`
  - `<ComingSoon note? />` and `<SampleChip />`

- [ ] **Step 1: Create the accent type and PageShell**

Create `src/components/ui/PageShell.tsx`:

```tsx
export type AccentName =
  | 'timer'
  | 'flexible'
  | 'dashboard'
  | 'cycle'
  | 'countdown'
  | 'meals'
  | 'fitness'
  | 'finance';

/** Resolves to the raw accent token. Set on a wrapper so descendants
 *  inherit it through --mt-accent without prop-drilling. */
export function accentVar(accent: AccentName): string {
  return `var(--mac-accent-${accent})`;
}

export default function PageShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: AccentName;
  children: React.ReactNode;
}) {
  return (
    <main
      className="mt-page-pad flex-1"
      style={{ ['--mt-accent' as string]: accentVar(accent) }}
    >
      <header className="mx-auto mb-6 w-full max-w-3xl">
        <div
          className="mb-3 h-1 w-12 rounded-full"
          style={{ background: 'var(--mt-accent)' }}
          aria-hidden
        />
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--mt-text-muted)]">{subtitle}</p>
        )}
      </header>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Create Card**

Create `src/components/ui/Card.tsx`:

```tsx
export default function Card({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`mt-soft p-5 ${className}`}>{children}</div>;
}
```

- [ ] **Step 3: Create StatTile**

Create `src/components/ui/StatTile.tsx`:

```tsx
import { accentVar, type AccentName } from './PageShell';

export default function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: AccentName;
}) {
  return (
    <div
      className="mt-soft p-4"
      style={accent ? { ['--mt-accent' as string]: accentVar(accent) } : undefined}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--mt-text)]">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-xs text-[var(--mt-text-subtle)]">{hint}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create ComingSoon and SampleChip**

Create `src/components/ui/ComingSoon.tsx`:

```tsx
/** Marks demonstration content so a placeholder number is never mistaken
 *  for a real one. Required on every shell page (spec §7.2). */
export function SampleChip() {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--mt-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
      Sample
    </span>
  );
}

export default function ComingSoon({ note }: { note?: string }) {
  return (
    <div className="mt-soft flex flex-col items-center gap-1 p-6 text-center">
      <div
        className="mb-1 h-2 w-2 rounded-full"
        style={{ background: 'var(--mt-accent)' }}
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--mt-text)]">Coming soon</p>
      {note && (
        <p className="text-xs text-[var(--mt-text-muted)]">{note}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run build` and `npm run lint`
Expected: both clean. No TypeScript errors on the `['--mt-accent' as string]` style casts.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui
git commit -m "feat: add macaron UI primitives"
```

---

### Task 5: Navigation drawer

**Files:**
- Create: `src/components/nav/navLinks.ts`, `src/components/nav/NavDrawer.tsx`

**Interfaces:**
- Consumes: `AccentName` from `src/components/ui/PageShell`
- Produces: `NAV_GROUPS: NavGroup[]` and `ALL_LINKS: NavLink[]` from `navLinks.ts`, where `NavLink = { href: string; label: string; icon: LucideIcon; accent: AccentName }` and `NavGroup = { title: string | null; links: NavLink[] }`; default-exported `<NavDrawer />`

- [ ] **Step 1: Create the shared link data**

Create `src/components/nav/navLinks.ts`:

```ts
import {
  Home,
  Timer,
  Clock3,
  LayoutDashboard,
  HeartPulse,
  CalendarClock,
  UtensilsCrossed,
  Dumbbell,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { AccentName } from '@/components/ui/PageShell';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: AccentName;
}

export interface NavGroup {
  title: string | null;
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    links: [{ href: '/', label: 'Home', icon: Home, accent: 'dashboard' }],
  },
  {
    title: 'Focus',
    links: [
      { href: '/timer', label: 'Timer', icon: Timer, accent: 'timer' },
      { href: '/flexible', label: 'Flexible', icon: Clock3, accent: 'flexible' },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: 'dashboard' },
    ],
  },
  {
    title: 'Life',
    links: [
      { href: '/cycle', label: 'Period', icon: HeartPulse, accent: 'cycle' },
      { href: '/countdown', label: 'Countdown', icon: CalendarClock, accent: 'countdown' },
      { href: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'meals' },
      { href: '/fitness', label: 'Fitness', icon: Dumbbell, accent: 'fitness' },
      { href: '/finance', label: 'Finance', icon: Wallet, accent: 'finance' },
    ],
  },
];

export const ALL_LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);

/** Bottom-bar slots on mobile. The five Life sections are drawer-only. */
export const BOTTOM_BAR_HREFS = ['/', '/timer', '/flexible', '/dashboard'];

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}
```

- [ ] **Step 2: Create the drawer**

Create `src/components/nav/NavDrawer.tsx`. It owns the hamburger trigger, the panel, focus management, and scroll lock.

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV_GROUPS, isActiveHref } from './navLinks';
import { accentVar } from '@/components/ui/PageShell';

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on route change. Five of nine routes are drawer-only, so a
  // drawer left open over the destination would be a dead end.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Scroll lock.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape to close, Tab cycles within the panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="fixed z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] text-[var(--mt-text)] shadow-[0_6px_18px_rgba(0,0,0,0.10)]"
        style={{
          top: 'calc(var(--mt-safe-top) + 1rem)',
          left: 'calc(var(--mt-safe-left) + 1rem)',
        }}
      >
        <Menu size={20} strokeWidth={1.9} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const start = touchStartX.current;
              touchStartX.current = null;
              if (start !== null && start - e.changedTouches[0].clientX > 60) close();
            }}
            className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col overflow-y-auto border-r border-[var(--mt-border)] bg-[var(--mt-surface)]"
            style={{
              paddingTop: 'calc(var(--mt-safe-top) + 1rem)',
              paddingBottom: 'calc(var(--mt-safe-bottom) + 1rem)',
            }}
          >
            <div className="mb-2 flex items-center justify-between px-5">
              <span className="text-sm font-semibold tracking-tight text-[var(--mt-text)]">
                Masa Tomato
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <nav className="flex-1 px-3">
              {NAV_GROUPS.map((group, i) => (
                <div key={group.title ?? `group-${i}`} className="mb-3">
                  {group.title && (
                    <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
                      {group.title}
                    </div>
                  )}
                  {group.links.map(({ href, label, icon: Icon, accent }) => {
                    const active = isActiveHref(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={`mb-0.5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                          active
                            ? 'font-semibold text-[var(--mt-text)]'
                            : 'text-[var(--mt-text-muted)]'
                        }`}
                        style={
                          active
                            ? {
                                background: `color-mix(in srgb, ${accentVar(accent)} 30%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            background: `color-mix(in srgb, ${accentVar(accent)} 45%, transparent)`,
                          }}
                        >
                          <Icon size={17} strokeWidth={1.9} aria-hidden />
                        </span>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build` and `npm run lint`
Expected: clean.

The drawer is not mounted yet — Task 6 wires it into `AppShell`. Do not test behaviour here.

- [ ] **Step 4: Commit**

```bash
git add src/components/nav
git commit -m "feat: add navigation drawer with grouped destinations"
```

---

### Task 6: Bottom bar rework and shell wiring

**Files:**
- Move: `src/components/AppNav.tsx` → `src/components/nav/AppNav.tsx`
- Modify: `src/components/AppShell.tsx`

**Interfaces:**
- Consumes: `NAV_GROUPS`, `BOTTOM_BAR_HREFS`, `ALL_LINKS`, `isActiveHref` from Task 5; `NavDrawer` from Task 5
- Produces: mounted navigation chrome on every route

- [ ] **Step 1: Replace AppNav with the four-slot mobile-only bar**

```bash
mkdir -p src/components/nav
git mv src/components/AppNav.tsx src/components/nav/AppNav.tsx
```

Replace the entire contents of `src/components/nav/AppNav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsMdUp } from '@/hooks/useMediaQuery';
import { ALL_LINKS, BOTTOM_BAR_HREFS, isActiveHref } from './navLinks';
import { accentVar } from '@/components/ui/PageShell';

const BOTTOM_LINKS = BOTTOM_BAR_HREFS.map((href) => {
  const link = ALL_LINKS.find((l) => l.href === href);
  if (!link) throw new Error(`BOTTOM_BAR_HREFS references unknown route: ${href}`);
  return link;
});

export default function AppNav() {
  const pathname = usePathname();
  const isMdUp = useIsMdUp();

  // Desktop has the drawer only; the old centre pill cannot hold nine
  // destinations and is retired.
  if (isMdUp) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--mt-border)] bg-[var(--mt-glass-strong)] backdrop-blur-xl"
      style={{ paddingBottom: 'var(--mt-safe-bottom)' }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {BOTTOM_LINKS.map(({ href, label, icon: Icon, accent }) => {
          const active = isActiveHref(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[var(--mt-nav-height)] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? 'text-[var(--mt-text)]' : 'text-[var(--mt-text-muted)]'
              }`}
            >
              <Icon
                size={21}
                aria-hidden
                style={active ? { color: accentVar(accent) } : undefined}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Wire the drawer into AppShell**

Replace `src/components/AppShell.tsx`:

```tsx
'use client';

import AppNav from '@/components/nav/AppNav';
import NavDrawer from '@/components/nav/NavDrawer';
import BackgroundManager from '@/components/BackgroundManager';
import ThemeModal from '@/components/ThemeModal';
import AudioPlayer from '@/components/AudioPlayer';
import AlarmPlayer from '@/components/AlarmPlayer';
import TimerEngine from '@/components/TimerEngine';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[var(--mt-bg)]">
      <BackgroundManager />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <NavDrawer />
        {/* TimerEngine stays here, above the route groups, so a running
            timer survives navigation between sections. Do not move it. */}
        <TimerEngine />
        <div className="flex flex-1 flex-col">{children}</div>
        <AppNav />
        <ThemeModal />
        <AudioPlayer />
        <AlarmPlayer />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify drawer behaviour**

Run: `npm run build`
Expected: clean.

Run: `npm run dev` and check every item:
- Hamburger visible top-left on all four existing routes, clear of the notch.
- Clicking it opens the panel; all nine links are listed under Home / Focus / Life.
- Closes on: backdrop click, the X button, `Escape`, clicking a link, swiping left.
- With the drawer open, `Tab` cycles inside the panel and never reaches page content behind it. `Escape` returns focus to the hamburger.
- Background does not scroll while the drawer is open.
- Bottom bar shows exactly four slots on a narrow viewport and disappears above 768px.
- Links to `/cycle`, `/countdown`, `/meals`, `/fitness`, `/finance` currently 404 — expected until Tasks 9-10.

- [ ] **Step 4: Commit**

```bash
git add -A src/components
git commit -m "feat: replace nav pill with drawer and four-slot bottom bar"
```

---

### Task 7: Mood-aware backgrounds

**Files:**
- Modify: `src/components/BackgroundManager.tsx`
- Modify: `src/components/Gatekeeper.tsx:76` (the outer overlay div)

**Interfaces:**
- Consumes: mood attributes from Task 3
- Produces: photo backgrounds confined to `(focus)`; a soft cream field under `(life)`

- [ ] **Step 1: Make BackgroundManager mood-aware**

`BackgroundManager` sits in `AppShell`, above the route groups, so it cannot read `data-mood` from an ancestor. It reads the pathname instead.

At the top of `src/components/BackgroundManager.tsx`, add to the existing imports:

```tsx
import { usePathname } from 'next/navigation';
```

Add this constant below the imports:

```tsx
/** Routes rendered in the dark focus mood. Photo themes and the scrim
 *  apply only here — they were built for white-on-dark (spec §6.4). */
const FOCUS_ROUTES = ['/timer', '/flexible'];
```

Inside `export default function BackgroundManager()`, add as the first line of the body:

```tsx
const pathname = usePathname();
const isFocusRoute = FOCUS_ROUTES.some(
  (r) => pathname === r || pathname.startsWith(`${r}/`)
);
```

Then, immediately before the existing `return (` statement, add the light-mood branch:

```tsx
if (!isFocusRoute) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[var(--mac-cream)]">
      <div
        className="absolute -left-[15%] -top-[10%] h-[55vh] w-[55vh] rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--mac-accent-cycle)' }}
      />
      <div
        className="absolute -bottom-[15%] -right-[10%] h-[60vh] w-[60vh] rounded-full opacity-35 blur-3xl"
        style={{ background: 'var(--mac-accent-countdown)' }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Give the Gatekeeper the light mood explicitly**

`Gatekeeper` renders above the route groups and inherits no mood. In `src/components/Gatekeeper.tsx`, add `data-mood="light"` to the outer overlay div (the one with `className="fixed inset-0 z-[9999] …"`), and to the loading div returned when `!mounted`:

```tsx
<div
  data-mood="light"
  className="fixed inset-0 z-[9999] bg-[var(--mt-bg)]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-[max(1rem,var(--mt-safe-bottom))]"
>
```

```tsx
<div
  data-mood="light"
  className="min-h-dvh bg-[var(--mt-bg)] flex items-center justify-center text-[var(--mt-text)]"
>
  Loading...
</div>
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
- `/timer` and `/flexible` still show the selected photo/gradient theme with the scrim.
- `/` and `/dashboard` show flat cream with two soft pastel blobs, no photo, no scrim.
- Switching themes in the theme modal still changes the background on `/timer`.
- Clearing `localStorage.user_name` and reloading shows the Gatekeeper on cream with readable dark text.

- [ ] **Step 4: Commit**

```bash
git add src/components/BackgroundManager.tsx src/components/Gatekeeper.tsx
git commit -m "feat: confine photo backgrounds to focus routes"
```

---

### Task 8: The hub

**Files:**
- Modify: `src/app/(life)/page.tsx` (replaces the Task 3 stub entirely)
- Create: `src/components/HubGrid.tsx`

**Interfaces:**
- Consumes: `computeHubStats` (Task 2), `PageShell`/`Card`/`StatTile` (Task 4), `NAV_GROUPS` (Task 5), `db` from `src/db/db.ts`
- Produces: the hub at `/`

- [ ] **Step 1: Create the client hub grid**

Create `src/components/HubGrid.tsx`. It is a client component because it reads Dexie and localStorage.

```tsx
'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '@/db/db';
import { computeHubStats } from '@/lib/hubStats';
import { ALL_LINKS } from '@/components/nav/navLinks';
import { accentVar } from '@/components/ui/PageShell';
import StatTile from '@/components/ui/StatTile';

/** Sections with no data layer yet (spec §7.1). */
const INERT = new Set(['/cycle', '/countdown', '/meals', '/fitness', '/finance']);

export default function HubGrid() {
  const [userName, setUserName] = useState<string | null>(null);
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);

  useEffect(() => {
    setUserName(localStorage.getItem('user_name'));
  }, []);

  const stats = computeHubStats(sessions ?? [], new Date());

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const cards = ALL_LINKS.filter((l) => l.href !== '/');

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {greeting}
          {userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          {stats.todayMinutes > 0
            ? `${stats.todayMinutes} focus minutes today.`
            : 'No focus time logged yet today.'}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatTile
          label="Today"
          value={`${stats.todayMinutes} min`}
          accent="timer"
        />
        <StatTile
          label="Streak"
          value={stats.streakDays === 1 ? '1 day' : `${stats.streakDays} days`}
          accent="dashboard"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(({ href, label, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="mt-soft flex flex-col gap-2 p-4 transition-transform active:scale-[0.98]"
            style={{ ['--mt-accent' as string]: accentVar(accent) }}
          >
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'var(--mt-accent)' }}
            >
              <Icon size={18} strokeWidth={1.9} aria-hidden color="#3B2E2A" />
            </span>
            <span className="text-sm font-semibold text-[var(--mt-text)]">
              {label}
            </span>
            <span className="text-xs text-[var(--mt-text-muted)]">
              {INERT.has(href)
                ? 'Coming soon'
                : href === '/dashboard'
                ? `${stats.streakDays}-day streak`
                : 'Open'}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Replace the hub page stub**

Replace the entire contents of `src/app/(life)/page.tsx`:

```tsx
import HubGrid from '@/components/HubGrid';
import InstallPrompt from '@/components/InstallPrompt';

export default function HubPage() {
  return (
    <main className="mt-page-pad flex-1">
      <div className="mx-auto w-full max-w-3xl">
        <HubGrid />
        <div className="mt-6">
          <InstallPrompt />
        </div>
      </div>
    </main>
  );
}
```

`InstallPrompt` does not exist until Task 14. Create a one-line placeholder now so the build passes, and Task 14 replaces its body:

Create `src/components/InstallPrompt.tsx`:

```tsx
export default function InstallPrompt() {
  return null;
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: clean.

Run: `npm run dev`, visit `/`
- Greeting shows the correct time of day and the stored name.
- Today's minutes and streak match what `/dashboard` reports.
- Eight cards render, two columns on a phone and four on desktop.
- The five inert cards read "Coming soon"; Timer/Flexible/Dashboard do not.
- Completing a focus session on `/timer` and returning to `/` updates the numbers without a reload (`useLiveQuery`).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(life)/page.tsx" src/components/HubGrid.tsx src/components/InstallPrompt.tsx
git commit -m "feat: add home hub with live focus stats"
```

---

### Task 9: Period and countdown shells

**Files:**
- Create: `src/app/(life)/cycle/page.tsx`, `src/app/(life)/countdown/page.tsx`

**Interfaces:**
- Consumes: `PageShell`, `Card`, `ComingSoon`, `SampleChip` (Task 4)
- Produces: routes `/cycle` and `/countdown`

- [ ] **Step 1: Create the period cycle shell**

Create `src/app/(life)/cycle/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const PREDICTED = new Set([6, 7, 8, 9, 10]);
const SYMPTOMS = ['Cramps', 'Headache', 'Tired', 'Bloating', 'Mood'];

export default function CyclePage() {
  return (
    <PageShell
      title="Period"
      subtitle="Cycle tracking, shared between both of us"
      accent="cycle"
    >
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            Next period
          </span>
          <SampleChip />
        </div>
        <div className="text-3xl font-semibold text-[var(--mt-text)]">
          In 6 days
        </div>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          Estimated from a 28-day cycle
        </p>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            This cycle
          </span>
          <SampleChip />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex aspect-square items-center justify-center rounded-lg text-xs text-[var(--mt-text)]"
              style={{
                background: PREDICTED.has(day)
                  ? 'var(--mt-accent)'
                  : 'color-mix(in srgb, var(--mt-border) 60%, transparent)',
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
          Symptoms
        </div>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-[var(--mt-border)] px-3 py-1.5 text-sm text-[var(--mt-text-muted)]"
            >
              {s}
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled
          className="mt-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
        >
          Log period
        </button>
      </Card>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
```

- [ ] **Step 2: Create the countdown shell**

Create `src/app/(life)/countdown/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const EVENTS = [
  { name: 'Our anniversary', when: '12 Sep 2026', days: 28 },
  { name: "Rachel's birthday", when: '3 Nov 2026', days: 80 },
  { name: 'Semester starts', when: '5 Jan 2027', days: 143 },
];

export default function CountdownPage() {
  return (
    <PageShell
      title="Countdown"
      subtitle="Dates we're counting down to"
      accent="countdown"
    >
      <div className="mb-4 flex flex-col gap-3">
        {EVENTS.map((e) => (
          <Card key={e.name}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-[var(--mt-text)]">
                  {e.name}
                </div>
                <div className="mt-0.5 text-sm text-[var(--mt-text-muted)]">
                  {e.when}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-semibold text-[var(--mt-text)]">
                  {e.days}
                </div>
                <div className="text-xs text-[var(--mt-text-subtle)]">days</div>
              </div>
            </div>
            <div className="mt-3">
              <SampleChip />
            </div>
          </Card>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Add date
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build` — clean.
Run: `npm run dev` — `/cycle` and `/countdown` render on cream, each with its own accent (rose and mint), every sample block carries a `Sample` chip, and both are reachable from the drawer.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(life)/cycle" "src/app/(life)/countdown"
git commit -m "feat: add period and countdown section shells"
```

---

### Task 10: Meals, fitness and finance shells

**Files:**
- Create: `src/app/(life)/meals/page.tsx`, `src/app/(life)/fitness/page.tsx`, `src/app/(life)/finance/page.tsx`

**Interfaces:**
- Consumes: `PageShell`, `Card`, `ComingSoon`, `SampleChip` (Task 4)
- Produces: routes `/meals`, `/fitness`, `/finance`

- [ ] **Step 1: Create the meals shell**

Create `src/app/(life)/meals/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const DAYS = [
  {
    label: 'Today',
    meals: [
      { time: '08:20', who: 'Jeff', what: 'Kaya toast and kopi' },
      { time: '13:05', who: 'Rachel', what: 'Chicken rice' },
    ],
  },
  {
    label: 'Yesterday',
    meals: [{ time: '19:40', who: 'Both', what: 'Hotpot' }],
  },
];

export default function MealsPage() {
  return (
    <PageShell title="Meals" subtitle="What we ate" accent="meals">
      {DAYS.map((day) => (
        <div key={day.label} className="mb-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
              {day.label}
            </span>
            <SampleChip />
          </div>
          <div className="flex flex-col gap-2">
            {day.meals.map((m) => (
              <Card key={`${day.label}-${m.time}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 shrink-0 rounded-xl"
                    style={{
                      background:
                        'color-mix(in srgb, var(--mt-accent) 45%, transparent)',
                    }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--mt-text)]">
                      {m.what}
                    </div>
                    <div className="text-xs text-[var(--mt-text-muted)]">
                      {m.time} · {m.who}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled
        className="mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Add meal
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
```

- [ ] **Step 2: Create the fitness shell**

Create `src/app/(life)/fitness/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import StatTile from '@/components/ui/StatTile';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const WEEK = [
  { day: 'Mon', active: true },
  { day: 'Tue', active: false },
  { day: 'Wed', active: true },
  { day: 'Thu', active: true },
  { day: 'Fri', active: false },
  { day: 'Sat', active: true },
  { day: 'Sun', active: false },
];

export default function FitnessPage() {
  return (
    <PageShell title="Fitness" subtitle="Moving this week" accent="fitness">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatTile label="Workouts" value="4" hint="this week" accent="fitness" />
        <StatTile label="Minutes" value="185" hint="this week" accent="fitness" />
      </div>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            This week
          </span>
          <SampleChip />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK.map(({ day, active }) => (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <div
                className="flex aspect-square w-full items-center justify-center rounded-lg"
                style={{
                  background: active
                    ? 'var(--mt-accent)'
                    : 'color-mix(in srgb, var(--mt-border) 60%, transparent)',
                }}
                aria-hidden
              />
              <span className="text-[10px] text-[var(--mt-text-muted)]">
                {day}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <button
        type="button"
        disabled
        className="mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Log workout
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
```

- [ ] **Step 3: Create the finance shell**

Create `src/app/(life)/finance/page.tsx`. Sample chips matter most on this page — an invented number that reads as real is worst here.

```tsx
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const CATEGORIES = [
  { name: 'Food', amount: 420, share: 0.42 },
  { name: 'Transport', amount: 180, share: 0.18 },
  { name: 'Study', amount: 150, share: 0.15 },
  { name: 'Fun', amount: 250, share: 0.25 },
];

const RECENT = [
  { what: 'Groceries', who: 'Jeff', amount: 62.4 },
  { what: 'Cinema', who: 'Rachel', amount: 38.0 },
  { what: 'Petrol', who: 'Jeff', amount: 90.0 },
];

export default function FinancePage() {
  return (
    <PageShell title="Finance" subtitle="Where the money went" accent="finance">
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            This month
          </span>
          <SampleChip />
        </div>
        <div className="text-3xl font-semibold text-[var(--mt-text)]">
          RM 1,000
        </div>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          of a RM 1,500 budget
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--mt-border)]">
          <div
            className="h-full rounded-full"
            style={{ width: '67%', background: 'var(--mt-accent)' }}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            By category
          </span>
          <SampleChip />
        </div>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => (
            <div key={c.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--mt-text)]">{c.name}</span>
                <span className="text-[var(--mt-text-muted)]">
                  RM {c.amount}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mt-border)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.share * 100}%`,
                    background: 'var(--mt-accent)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            Recent
          </span>
          <SampleChip />
        </div>
        <div className="flex flex-col gap-2.5">
          {RECENT.map((r) => (
            <div key={r.what} className="flex justify-between text-sm">
              <div>
                <div className="text-[var(--mt-text)]">{r.what}</div>
                <div className="text-xs text-[var(--mt-text-muted)]">{r.who}</div>
              </div>
              <span className="text-[var(--mt-text)]">
                RM {r.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <ComingSoon note="Nothing here saves yet. Every figure above is invented." />
    </PageShell>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run build` and `npm run lint` — clean.
Run: `npm run dev` — all three routes render with their own accents (caramel, pistachio, blueberry), every sample block is chipped, and all nine drawer links now resolve with no 404s.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(life)/meals" "src/app/(life)/fitness" "src/app/(life)/finance"
git commit -m "feat: add meals, fitness and finance section shells"
```

---

### Task 11: Colour sweep — the two modals

The hardest files, done first and deliberately: both modals are shared by light and dark moods, so they prove the token system works. If these convert cleanly the remaining files are mechanical.

**Files:**
- Modify: `src/components/SettingsModal.tsx` (25 colour usages)
- Modify: `src/components/ThemeModal.tsx` (18 colour usages)
- Modify: `src/components/ui/Modal.tsx` (4 colour usages)

**Interfaces:**
- Consumes: semantic tokens from Task 1
- Produces: two mood-agnostic modals; the conversion mapping every later sweep task follows

- [ ] **Step 1: Apply this mapping to all three files**

Replace every hardcoded colour according to this table. It is exhaustive for the patterns present in the codebase.

| Current | Replacement |
|---|---|
| `bg-[#10182d]/90`, `bg-[var(--mt-surface)]`, `bg-zinc-900`, `bg-slate-900` | `bg-[var(--mt-surface)]` |
| `bg-[var(--mt-midnight)]`, `bg-[#070b14]` | `bg-[var(--mt-bg)]` |
| `bg-white/5`, `bg-white/[0.07]`, `bg-white/10` | `bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]` |
| `bg-white` (as an active/primary fill) | `bg-[var(--mt-accent)]` |
| `text-white`, `text-slate-50`, `text-zinc-100` | `text-[var(--mt-text)]` |
| `text-slate-300/70`, `text-white/45`, `text-white/60`, `text-zinc-400` | `text-[var(--mt-text-muted)]` |
| `text-white/40`, `text-slate-500` | `text-[var(--mt-text-subtle)]` |
| `text-slate-950`, `text-black` (on an accent fill) | `text-[var(--mt-accent-contrast)]` |
| `border-white/10`, `border-blue-300/10`, `border-zinc-800` | `border-[var(--mt-border)]` |
| `text-red-400`, `text-red-500`, `bg-red-500` | `text-[var(--mt-danger)]` / `bg-[var(--mt-danger)]` |
| `text-green-400`, `bg-emerald-500` | `text-[var(--mt-success)]` / `bg-[var(--mt-success)]` |
| `focus:ring-blue-400/60`, `ring-blue-500` | `focus:ring-[var(--mt-accent)]` |
| `hover:bg-zinc-200` (on a primary button) | `hover:opacity-90` |
| `shadow-[0_14px_40px_rgba(2,6,23,0.35)]` and similar hardcoded shadows | `shadow-[0_8px_24px_color-mix(in_srgb,var(--mt-accent)_14%,transparent)]` |

Backdrop overlays (`bg-black/50`, `bg-[var(--mt-midnight)]/85`) become `bg-black/35 backdrop-blur-sm` — a scrim must read as a scrim in both moods.

- [ ] **Step 2: Verify in both moods**

Run: `npm run build` — clean.

Run: `npm run dev` and open each modal from **both** a light route and a dark route:
- Settings modal from `/timer` (dark) — readable, borders visible, inputs legible.
- Settings modal from `/dashboard` (light) — same, on cream.
- Theme modal from both — theme thumbnails still distinguishable, active state visible.
- Focus ring visible in both moods when tabbing through inputs.
- No element is invisible against its background in either mood. This is the acceptance bar; if any is, the mapping needs a token that does not exist yet — add it to `globals.css` rather than hardcoding.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.tsx src/components/ThemeModal.tsx src/components/ui/Modal.tsx
git commit -m "refactor: convert modals to semantic mood tokens"
```

---

### Task 12: Colour sweep — remaining components

**Files:**
- Modify: `src/components/TimerDisplay.tsx` (14), `src/components/FlexibleSettingsModal.tsx` (14), `src/components/Leaderboard.tsx` (13), `src/components/FlexibleControls.tsx` (8), `src/components/Gatekeeper.tsx` (6), `src/components/FlexibleDisplay.tsx` (6), `src/components/AudioPlayer.tsx` (4), `src/components/SessionConflictDialog.tsx` (3), `src/components/Controls.tsx` (3)
- Modify: `src/app/globals.css` (remove legacy aliases)

**Interfaces:**
- Consumes: the mapping table from Task 11
- Produces: a codebase with no hardcoded colours outside `globals.css`

- [ ] **Step 1: Apply the Task 11 mapping to all nine components**

Use the identical table. `TimerDisplay` and `FlexibleDisplay` render only under `(focus)`, so they may use `--mt-accent` freely for the progress ring and digits — but still through tokens, never hex.

- [ ] **Step 2: Delete the legacy aliases**

In `src/app/globals.css`, remove this block added in Task 1:

```css
  /* Legacy alias. Deleted in Task 12 once the sweep is complete. */
  --mt-midnight: var(--mt-bg);
  --mt-navy: var(--mt-surface);
  --mt-surface-elevated: var(--mt-surface-raised);
  --mt-glass: var(--mt-surface);
  --mt-glass-strong: var(--mt-surface);
  --mt-accent-glow: color-mix(in srgb, var(--mt-accent) 55%, transparent);
```

Keep `--background` and `--foreground` — the `@theme inline` block references them.

`--mt-glass` and `--mt-glass-strong` remain defined inside the two `[data-mood]` blocks, so removing the `:root` copies is safe for anything rendered inside a route group. `BackgroundManager` and `Gatekeeper` render **outside** the groups: confirm neither still references `--mt-glass`.

- [ ] **Step 3: Verify no hardcoded colours remain**

Run:
```bash
grep -rn "bg-\[#\|text-\[#\|border-\[#\|slate-\|zinc-\|text-white\|bg-white\|white/\|blue-[0-9]" src --include=*.tsx
```
Expected: no results, except inside `BackgroundManager.tsx`'s `LiveLoop`, whose gradient presets are deliberate photographic artwork for the dark focus routes and are exempt.

Run: `npm run build`, `npm run lint`, `npm run test` — all clean.

- [ ] **Step 4: Verify every route in both moods**

Run `npm run dev` and walk all nine routes. Nothing unreadable, no invisible borders, focus rings visible throughout.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "refactor: complete macaron token sweep and drop legacy aliases"
```

---

### Task 13: Dashboard light conversion

The riskiest recolour. Recharts and `react-activity-calendar` take explicit theme configuration that CSS tokens cannot reach.

**Files:**
- Modify: `src/app/(life)/dashboard/page.tsx`
- Modify: `src/components/Leaderboard.tsx`

**Interfaces:**
- Consumes: `--mac-accent-dashboard` (`#C4B0E0`) and the light-mood palette
- Produces: a dashboard legible on cream

- [ ] **Step 1: Give the heatmap a macaron ramp**

`react-activity-calendar` takes a `theme` prop with explicit colour arrays. Replace whatever ramp is currently passed with a five-step lavender ramp running from the cream background up to the dashboard accent:

```tsx
const MACARON_HEATMAP_THEME = {
  light: ['#F3EAE2', '#E6DCEF', '#D6C6E7', '#C4B0E0', '#A98CD1'],
  dark: ['#F3EAE2', '#E6DCEF', '#D6C6E7', '#C4B0E0', '#A98CD1'],
};
```

Both keys carry the same ramp — the dashboard is always light mood, and supplying only one key makes the library fall back to its own defaults in the other.

- [ ] **Step 2: Recolour the Recharts series**

Recharts `fill` and `stroke` props take literal colours, not CSS variables resolved at paint time in all cases. Use the literal hex values so behaviour is predictable:

- Bar/area fill: `#C4B0E0`
- Grid lines: `#F0E4DA`
- Axis ticks and labels: `#8A7570`
- Tooltip: `contentStyle={{ background: '#FFFFFF', border: '1px solid #F0E4DA', borderRadius: 12, color: '#3B2E2A' }}`

- [ ] **Step 3: Recolour the leaderboard rows**

Apply the Task 11 mapping. The current user's highlighted row uses `background: color-mix(in srgb, var(--mac-accent-dashboard) 30%, transparent)` rather than a solid accent fill — `#C4B0E0` behind `#3B2E2A` text is below 4.5:1 at full strength.

- [ ] **Step 4: Verify**

Run: `npm run dev`, visit `/dashboard`:
- Heatmap squares are distinguishable across all five levels against cream.
- Chart axis labels and grid lines are visible but not dominant.
- Tooltip is readable.
- Leaderboard rows are legible and the highlighted row is obvious without being garish.
- Compare against the pre-change dashboard: no data is missing or misrendered, only recoloured.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(life)/dashboard/page.tsx" src/components/Leaderboard.tsx
git commit -m "feat: convert dashboard charts to macaron light palette"
```

---

### Task 14: Home-screen install

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- Modify: `src/components/InstallPrompt.tsx` (replaces the Task 8 placeholder)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: the macaron palette
- Produces: an installable app on both platforms

**Read first:** `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`.

- [ ] **Step 1: Create the icon set**

Design a Masa Tomato mark — a tomato in `#EF9A8D` on a `#FDF8F3` field is the obvious reading of the name. Export:

- `public/icon-192.png` — 192×192
- `public/icon-512.png` — 512×512
- `public/icon-maskable-512.png` — 512×512 with the mark inside the **central 80% safe zone**, background filled edge to edge. Android crops maskable icons to a device-chosen shape; artwork outside the safe zone will be cut.
- `public/apple-touch-icon.png` — 180×180, no transparency (iOS renders alpha as black).

- [ ] **Step 2: Create the manifest**

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Masa Tomato',
    short_name: 'Masa Tomato',
    description: 'Focus timer and shared life dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDF8F3',
    theme_color: '#FDF8F3',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
```

- [ ] **Step 3: Add iOS metadata to the root layout**

iOS ignores much of the manifest. In `src/app/layout.tsx`, extend the `metadata` export:

```tsx
export const metadata: Metadata = {
  title: "Masa Tomato",
  description: "A premium Pomodoro productivity OS",
  appleWebApp: {
    capable: true,
    title: "Masa Tomato",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};
```

- [ ] **Step 4: Implement the install prompt**

Replace `src/components/InstallPrompt.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Share, Plus } from 'lucide-react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  // Already installed, or still server-rendering — say nothing.
  if (isStandalone) return null;

  return (
    <div className="mt-soft p-4">
      <div className="text-sm font-semibold text-[var(--mt-text)]">
        Add Masa Tomato to your home screen
      </div>
      {isIOS ? (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[var(--mt-text-muted)]">
          Tap
          <Share size={13} aria-hidden className="inline" />
          <span className="sr-only">the Share button</span>
          then
          <Plus size={13} aria-hidden className="inline" />
          <span>Add to Home Screen</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-[var(--mt-text-muted)]">
          Open your browser menu and choose Install app.
        </p>
      )}
    </div>
  );
}
```

No `beforeinstallprompt` handler: the Next docs advise against custom install buttons because the event does not exist on Safari, and a button that works on one phone and not the other is worse than instructions that work on both.

- [ ] **Step 5: Verify**

Run: `npm run build` — clean.

Run: `npm run dev` and fetch `http://localhost:3000/manifest.webmanifest`
Expected: valid JSON with all four icon entries.

In Chrome DevTools → Application → Manifest: no errors, icons all load, "Installability" reports no blockers.

Deploy to Vercel, then on real devices:
- **Android:** Chrome offers Install. Install it. It appears in the app drawer and in Settings → Apps, opens with no browser bar, and the status bar is cream on `/` and plum on `/timer`.
- **iPhone:** Safari → Share → Add to Home Screen. The icon is the tomato, not a page screenshot. Opens full-screen with no Safari chrome. The install card is gone once installed.

- [ ] **Step 6: Commit**

```bash
git add src/app/manifest.ts src/app/layout.tsx src/components/InstallPrompt.tsx public/icon-192.png public/icon-512.png public/icon-maskable-512.png public/apple-touch-icon.png
git commit -m "feat: add web app manifest, icons and install guidance"
```

---

### Task 15: Final verification and cleanup

**Files:**
- Modify: `README.md`
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

**Interfaces:**
- Consumes: everything
- Produces: a verified, documented release

- [ ] **Step 1: Remove leftover Next template assets**

```bash
git rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

Confirm first that nothing references them:
```bash
grep -rn "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src
```
Expected: no results. If any are referenced, keep that file and skip it.

- [ ] **Step 2: Run the full verification checklist**

```bash
npm run lint && npm run test && npm run build
```
Expected: all three clean.

Then, in `npm run dev`, confirm every item:

- [ ] All nine routes render: `/`, `/timer`, `/flexible`, `/dashboard`, `/cycle`, `/countdown`, `/meals`, `/fitness`, `/finance`
- [ ] `/timer` and `/flexible` are dark plum; the other seven are cream
- [ ] Drawer opens from every route and reaches all nine
- [ ] Drawer closes on backdrop, X, `Escape`, link click, swipe-left
- [ ] Drawer traps `Tab`, returns focus to the hamburger, locks body scroll
- [ ] Bottom bar shows four slots below 768px, absent above
- [ ] **A running timer survives navigating to `/finance` and back**
- [ ] Hub numbers match `/dashboard`
- [ ] Every sample block on all five shells carries a `Sample` chip
- [ ] Status bar colour differs between `/` and `/timer` on a real phone
- [ ] Gatekeeper renders readable on cream after clearing `localStorage.user_name`
- [ ] Installed on a real Android and a real iPhone home screen

- [ ] **Step 3: Update the README**

In `README.md`, update the feature list and the tech-stack section to describe the nine routes, the drawer, the macaron two-mood system, and home-screen install. Correct any statement that the app is a Pomodoro timer only, and note that `/` is now the hub and the timer lives at `/timer`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove template assets and update README for the life hub"
```

- [ ] **Step 5: Tell Rachel her home-screen shortcut now opens the hub**

Not a code step, but spec §10 risk 4. Her existing icon points at `/`, which used to be the timer and is now the hub. She should be told rather than left to discover it.

---

## Self-Review

**Spec coverage.** Every numbered spec section maps to a task: §5.1 routes → Task 3; §5.2 navigation → Tasks 5-6; §6.1 tokens → Task 1; §6.2 palette → Task 1; §6.3 surfaces → Task 1; §6.4 backgrounds → Task 7; §6.5 primitives → Task 4; §6.6 sweep order → Tasks 11-12; §7.1 hub → Task 8; §7.2 shells → Tasks 9-10; §7.3 dashboard → Task 13; §7.4 Gatekeeper → Task 7; §8 install → Task 14; §9 testing → Task 2 plus Task 15; §10 risks → verified in Tasks 3, 13, 14, 15.

**Type consistency.** `AccentName` and `accentVar` are defined once in `PageShell.tsx` (Task 4) and imported by `navLinks.ts`, `NavDrawer`, `AppNav`, `StatTile`, and `HubGrid`. `computeHubStats` and `toLocalDateKey` keep the signatures declared in Task 2 wherever used. `NavLink`/`NavGroup` are declared in Task 5 and consumed unchanged in Task 6.

**Known ordering dependency.** Task 8 creates a stub `InstallPrompt` returning `null` so the hub builds; Task 14 replaces its body. This is deliberate — the hub is worth reviewing before the manifest work, and a null-returning component renders nothing.

**Deliberate exemption.** `BackgroundManager`'s `LiveLoop` keeps its hardcoded gradients. They are photographic artwork for the dark focus routes, not UI chrome, and tokenising them would flatten the presets.
