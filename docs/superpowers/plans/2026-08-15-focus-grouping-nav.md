# Focus Grouping and Section Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group `/timer`, `/flexible` and `/dashboard` behind one Focus destination with a segmented pill, and repurpose the mobile bottom bar to switch between Focus, Calendar and Timetable.

**Architecture:** `/dashboard` moves into the existing `(focus)` route group, which already sets the dark mood; that group's layout gains a client-component pill. Route groups don't affect URLs, so all three addresses survive. Calendar and Timetable are new inert shells in `(life)`. The colour decisions that no automated gate can normally catch — accent distinguishability and the dark heatmap ramp — are made testable via a small pure-function colour module.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript, vitest (node environment), lucide-react, recharts, react-activity-calendar.

**Spec:** [docs/superpowers/specs/2026-08-15-focus-grouping-nav-design.md](../specs/2026-08-15-focus-grouping-nav-design.md)

## Global Constraints

- **Commits are authored by Jeff alone. Never add a `Co-Authored-By` trailer.**
- `/timer`, `/flexible` and `/dashboard` must keep working as URLs. Route groups do not appear in URLs; moving a directory between groups changes styling only.
- **`TimerEngine` stays where it is in `AppShell.tsx`.** Its placement above all route groups is what keeps a running timer alive across navigation. `AppShell.tsx` carries a comment saying not to move it.
- **`src/app/(focus)/layout.tsx` must remain a server component.** It exports `viewport`, which is server-only. Anything needing hooks is a separate client component imported into it.
- Literal hex values are sanctioned in Recharts props and the `react-activity-calendar` `theme` prop, because both consume values before CSS custom properties resolve. Everywhere else uses `--mt-*` tokens.
- Every block of demonstration data on a shell page carries a `<SampleChip />`.
- `--mac-*` raw tokens are referenced only inside `globals.css`, except through `accentVar()`.
- The existing suite must stay green: **41 tests across 6 files**. This work adds tests; it should not change existing ones.
- The header is not touched. No Home button. Top-left hamburger and top-right Settings/Theme stay exactly as they are.
- Do not commit `src/components/ThemeModal.tsx` — an unrelated uncommitted change is parked there deliberately (spec §12).

---

### Task 1: Colour utilities and the two new accents

Adds `calendar` and `timetable` accents, plus the pure colour maths that proves they're distinguishable. Everything here is node-testable.

**Files:**
- Create: `src/lib/color.ts`
- Create: `src/lib/color.test.ts`
- Create: `src/lib/accents.test.ts`
- Modify: `src/app/globals.css:22-29` (accent token block)
- Modify: `src/components/ui/PageShell.tsx:1-9` (`AccentName` union)

**Interfaces:**
- Consumes: nothing.
- Produces: `hexToRgb(hex): Rgb`, `relativeLuminance(hex): number`, `contrastRatio(a, b): number`, `hue(hex): number`, `hueDistance(a, b): number`, `lightness(hex): number` — all from `@/lib/color`. Task 4 uses `contrastRatio` and `lightness`. `AccentName` gains `'calendar' | 'timetable'`.

- [ ] **Step 1: Write the failing test for the colour utilities**

Create `src/lib/color.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  hue,
  hueDistance,
  lightness,
  relativeLuminance,
} from './color';

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#C4B0E0', '#C4B0E0')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#241C22', '#F7EFEA')).toBeCloseTo(
      contrastRatio('#F7EFEA', '#241C22'),
      5,
    );
  });
});

describe('hue', () => {
  it('reads the primaries', () => {
    expect(hue('#FF0000')).toBeCloseTo(0, 1);
    expect(hue('#00FF00')).toBeCloseTo(120, 1);
    expect(hue('#0000FF')).toBeCloseTo(240, 1);
  });
});

describe('hueDistance', () => {
  it('measures the short way around the wheel', () => {
    // 350 deg and 10 deg are 20 apart, not 340.
    expect(hueDistance('#FF0D3D', '#FF3D0D')).toBeLessThan(45);
    expect(hueDistance('#FF0000', '#00FF00')).toBeCloseTo(120, 1);
  });

  it('never exceeds 180', () => {
    expect(hueDistance('#FF0000', '#00FFFF')).toBeLessThanOrEqual(180);
  });
});

describe('lightness', () => {
  it('spans 0 to 100', () => {
    expect(lightness('#000000')).toBeCloseTo(0, 1);
    expect(lightness('#FFFFFF')).toBeCloseTo(100, 1);
  });

  it('orders a ramp monotonically', () => {
    const ramp = ['#40333E', '#614A70', '#846597', '#A784BB', '#C4B0E0'];
    const ls = ramp.map(lightness);
    for (let i = 1; i < ls.length; i += 1) {
      expect(ls[i]).toBeGreaterThan(ls[i - 1]);
    }
  });
});

describe('input validation', () => {
  it('rejects malformed hex', () => {
    expect(() => hue('nope')).toThrow();
    expect(() => hue('#FFF')).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/color.test.ts
```

Expected: FAIL — `Failed to resolve import "./color"`.

- [ ] **Step 3: Implement the colour utilities**

Create `src/lib/color.ts`:

```ts
/** Pure colour maths for verifying palette decisions in tests.
 *  Nothing here runs in the browser — it exists so that "these five
 *  levels are distinguishable" is an assertion instead of an opinion. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`);
  const n = Number.parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colours. Always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Hue angle in degrees, 0-360. Greys return 0. */
export function hue(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  if (delta === 0) return 0;

  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** Shortest angular separation between two hues, 0-180. */
export function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/** CIE L* perceptual lightness, 0-100. Even L* steps read as an even
 *  ramp to the eye; even RGB steps do not. */
export function lightness(hex: string): number {
  const y = relativeLuminance(hex);
  return y <= 216 / 24389 ? y * (24389 / 27) : Math.cbrt(y) * 116 - 16;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/color.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Write the failing accent-distinguishability test**

Create `src/lib/accents.test.ts`. It parses `globals.css` so the CSS stays the single source of truth:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { hueDistance } from './color';

const CSS = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

/** Every --mac-accent-* token declared in globals.css. */
function readAccents(): Record<string, string> {
  const found: Record<string, string> = {};
  const pattern = /--mac-accent-([a-z]+):\s*(#[0-9A-Fa-f]{6})/g;
  let match = pattern.exec(CSS);
  while (match !== null) {
    found[match[1]] = match[2];
    match = pattern.exec(CSS);
  }
  return found;
}

/** Accents added by this change. Pre-existing accents were approved by
 *  eye and are grandfathered — flexible and meals sit 11 deg apart and
 *  would fail the threshold below. */
const NEW_ACCENTS = ['calendar', 'timetable'];

/** Below roughly this, two accent chips read as the same colour at
 *  icon size. */
const MIN_HUE_SEPARATION_DEG = 20;

describe('accent palette', () => {
  it('declares all ten accents', () => {
    const accents = readAccents();
    expect(Object.keys(accents).sort()).toEqual([
      'calendar',
      'countdown',
      'cycle',
      'dashboard',
      'finance',
      'fitness',
      'flexible',
      'meals',
      'timer',
      'timetable',
    ]);
  });

  it.each(NEW_ACCENTS)(
    'keeps %s clear of every other accent',
    (name) => {
      const accents = readAccents();
      const subject = accents[name];
      expect(subject, `--mac-accent-${name} is missing`).toBeDefined();

      for (const [other, hex] of Object.entries(accents)) {
        if (other === name) continue;
        const separation = hueDistance(subject, hex);
        expect(
          separation,
          `${name} (${subject}) is only ${separation.toFixed(1)} deg from ${other} (${hex})`,
        ).toBeGreaterThanOrEqual(MIN_HUE_SEPARATION_DEG);
      }
    },
  );
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
npx vitest run src/lib/accents.test.ts
```

Expected: FAIL — the token list has eight entries, not ten.

- [ ] **Step 7: Add the two accent tokens**

In `src/app/globals.css`, extend the accent block that currently ends at line 29:

```css
  --mac-accent-finance: #A9C4E8;
  --mac-accent-calendar: #E0A9DB;
  --mac-accent-timetable: #9BD6E2;
```

These were chosen for the two widest gaps in the existing wheel — orchid at roughly 305° and cyan at roughly 190°. **The hue figures are hand-computed and may be slightly off.** The test is the authority: if it reports a separation under 20°, nudge the offending value and re-run rather than lowering the threshold.

- [ ] **Step 8: Extend the AccentName union**

In `src/components/ui/PageShell.tsx`, replace lines 1-9:

```ts
export type AccentName =
  | 'timer'
  | 'flexible'
  | 'dashboard'
  | 'cycle'
  | 'countdown'
  | 'meals'
  | 'fitness'
  | 'finance'
  | 'calendar'
  | 'timetable';
```

- [ ] **Step 9: Run the full suite and the type check**

```bash
npx vitest run
```

Expected: PASS. 41 pre-existing tests plus the new colour and accent cases.

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/color.ts src/lib/color.test.ts src/lib/accents.test.ts src/app/globals.css src/components/ui/PageShell.tsx
git commit -m "feat: add calendar and timetable accents with a distinguishability test

Adds pure colour maths (WCAG luminance, contrast, hue, CIE L*) so palette
decisions can be asserted rather than eyeballed, and uses it to prove the
two new accents are at least 20 degrees clear of the existing eight.

Pre-existing accents are grandfathered: flexible and meals sit 11 degrees
apart and were approved by eye."
```

---

### Task 2: Calendar and Timetable shells

Two inert pages matching the five existing Life shells.

**Files:**
- Create: `src/app/(life)/calendar/page.tsx`
- Create: `src/app/(life)/timetable/page.tsx`
- Modify: `src/components/HubGrid.tsx:13` (`INERT` set)

**Interfaces:**
- Consumes: `AccentName` values `'calendar'` and `'timetable'` from Task 1; `PageShell`, `Card`, `ComingSoon`, `SampleChip` (all existing).
- Produces: routes `/calendar` and `/timetable`. Task 3 links to both.

- [ ] **Step 1: Create the Calendar shell**

Create `src/app/(life)/calendar/page.tsx`. This mirrors the structure of `src/app/(life)/countdown/page.tsx`:

```tsx
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Demonstration only. Spec 8: Calendar holds events that happen ON a
 *  date; Countdown holds milestones you count TOWARD. */
const EVENTS = [
  { when: 'Today, 7:30 pm', what: 'Dinner with Rachel' },
  { when: 'Thu, 10:00 am', what: 'Dentist' },
  { when: 'Sat, all day', what: 'Trip to Penang' },
];

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      subtitle="What's happening, and when"
      accent="calendar"
    >
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-[var(--mt-text)]">
            August 2026
          </div>
          <SampleChip />
        </div>
        <div className="grid grid-cols-7 gap-1" role="presentation">
          {DAYS.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="pb-1 text-center text-[10px] font-semibold uppercase text-[var(--mt-text-subtle)]"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className="flex aspect-square items-center justify-center rounded-lg border border-[var(--mt-border)] text-xs text-[var(--mt-text-muted)]"
            >
              {n <= 31 ? n : ''}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 mb-4 flex flex-col gap-3">
        {EVENTS.map((e) => (
          <Card key={e.what}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-[var(--mt-text)]">
                  {e.what}
                </div>
                <div className="mt-0.5 text-sm text-[var(--mt-text-muted)]">
                  {e.when}
                </div>
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
        Add event
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
```

- [ ] **Step 2: Create the Timetable shell**

Create `src/app/(life)/timetable/page.tsx`:

```tsx
import { Fragment } from 'react';
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

/** Demonstration only. Two columns so the shared, two-person shape of
 *  this page is obvious before any of it works. */
const PLAN = [
  { time: '09:00', jeff: 'Lectures', rachel: 'Library' },
  { time: '12:30', jeff: 'Lunch together', rachel: 'Lunch together' },
  { time: '14:00', jeff: 'Lab session', rachel: 'Tutorial' },
  { time: '19:00', jeff: 'Gym', rachel: 'Free' },
];

export default function TimetablePage() {
  return (
    <PageShell
      title="Timetable"
      subtitle="What we're each doing tomorrow"
      accent="timetable"
    >
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-[var(--mt-text)]">
            Tomorrow
          </div>
          <SampleChip />
        </div>

        <div className="grid grid-cols-[3.5rem_1fr_1fr] gap-x-3 gap-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
            Time
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
            Jeff
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
            Rachel
          </div>

          {PLAN.map((row) => (
            <Fragment key={row.time}>
              <div className="text-xs text-[var(--mt-text-muted)]">
                {row.time}
              </div>
              <div className="text-sm text-[var(--mt-text)]">{row.jeff}</div>
              <div className="text-sm text-[var(--mt-text)]">{row.rachel}</div>
            </Fragment>
          ))}
        </div>
      </Card>

      <button
        type="button"
        disabled
        className="mt-4 mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Add to tomorrow
      </button>

      <ComingSoon note="Nothing here saves or syncs yet." />
    </PageShell>
  );
}
```

- [ ] **Step 3: Mark both routes inert on the hub**

In `src/components/HubGrid.tsx`, replace line 13:

```ts
const INERT = new Set([
  '/cycle',
  '/countdown',
  '/meals',
  '/fitness',
  '/finance',
  '/calendar',
  '/timetable',
]);
```

- [ ] **Step 4: Verify both routes build and type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 5: Confirm both pages render**

Start the dev server if it isn't running, then load `http://localhost:3000/calendar` and `http://localhost:3000/timetable`.

Expected: both render cream, each with a visible `Sample` chip on every demonstration block, a disabled action button, and the "Coming soon" panel. Neither appears in the drawer or bottom bar yet — that is Task 3.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(life)/calendar/page.tsx" "src/app/(life)/timetable/page.tsx" src/components/HubGrid.tsx
git commit -m "feat: add Calendar and Timetable placeholder shells

Both are inert, matching the five existing Life shells: sample data
carries a Sample chip on every block, actions are disabled, and the
Coming soon panel states that nothing saves.

Calendar shows dated events; Countdown keeps its separate job of
counting toward milestones, per spec section 8."
```

---

### Task 3: Section navigation

Collapses the drawer's three Focus entries into one, adds Calendar and Timetable, and turns the four-slot bottom bar into three. `navLinks.ts` and `AppNav.tsx` change together because a three-entry `BOTTOM_BAR_HREFS` inside a four-column grid is a broken intermediate state.

**Files:**
- Modify: `src/components/nav/navLinks.ts` (whole file)
- Modify: `src/components/nav/AppNav.tsx:29-31`
- Create: `src/components/nav/navLinks.test.ts`

**Interfaces:**
- Consumes: routes `/calendar` and `/timetable` from Task 2.
- Produces: `FOCUS_HREFS: string[]`, `isFocusRoute(pathname): boolean` from `@/components/nav/navLinks`. `ALL_LINKS` now has 9 entries; `/timer` is labelled `Focus`.

- [ ] **Step 1: Write the failing test for the navigation model**

Create `src/components/nav/navLinks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ALL_LINKS,
  BOTTOM_BAR_HREFS,
  FOCUS_HREFS,
  FOCUS_SEGMENTS,
  isActiveHref,
  isFocusRoute,
} from './navLinks';

describe('bottom bar', () => {
  it('has exactly three slots', () => {
    expect(BOTTOM_BAR_HREFS).toEqual(['/timer', '/calendar', '/timetable']);
  });

  it('only references routes that exist in the link table', () => {
    for (const href of BOTTOM_BAR_HREFS) {
      expect(
        ALL_LINKS.some((l) => l.href === href),
        `${href} is in the bottom bar but not in ALL_LINKS`,
      ).toBe(true);
    }
  });
});

describe('isFocusRoute', () => {
  it.each(FOCUS_HREFS)('is true on %s', (href) => {
    expect(isFocusRoute(href)).toBe(true);
  });

  it('covers all three Focus widgets', () => {
    // The regression this guards: the Focus slot points at /timer, so a
    // naive isActiveHref(pathname, '/timer') leaves it unlit on the
    // other two -- which builds and lints perfectly.
    expect(isFocusRoute('/flexible')).toBe(true);
    expect(isFocusRoute('/dashboard')).toBe(true);
    expect(isActiveHref('/flexible', '/timer')).toBe(false);
  });

  it.each(['/', '/calendar', '/timetable', '/cycle', '/finance'])(
    'is false on %s',
    (href) => {
      expect(isFocusRoute(href)).toBe(false);
    },
  );
});

describe('link table', () => {
  it('labels /timer as Focus, because it is the section entry point', () => {
    expect(ALL_LINKS.find((l) => l.href === '/timer')?.label).toBe('Focus');
  });

  it('labels the same route Timer inside the pill', () => {
    // The two labels are intentionally different. This pins that, so a
    // later "tidy-up" that unifies them fails loudly here.
    expect(FOCUS_SEGMENTS.find((s) => s.href === '/timer')?.label).toBe('Timer');
    expect(FOCUS_HREFS).toEqual(FOCUS_SEGMENTS.map((s) => s.href));
  });

  it('no longer lists /flexible or /dashboard as separate destinations', () => {
    expect(ALL_LINKS.some((l) => l.href === '/flexible')).toBe(false);
    expect(ALL_LINKS.some((l) => l.href === '/dashboard')).toBe(false);
  });

  it('has no duplicate hrefs', () => {
    const hrefs = ALL_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/components/nav/navLinks.test.ts
```

Expected: FAIL — `FOCUS_HREFS` and `isFocusRoute` are not exported.

- [ ] **Step 3: Rewrite navLinks.ts**

Replace the whole of `src/components/nav/navLinks.ts`:

```ts
import {
  Home,
  Timer,
  HeartPulse,
  CalendarClock,
  CalendarDays,
  LayoutList,
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
    links: [
      { href: '/', label: 'Home', icon: Home, accent: 'dashboard' },
      { href: '/timer', label: 'Focus', icon: Timer, accent: 'timer' },
    ],
  },
  {
    title: 'Life',
    links: [
      { href: '/calendar', label: 'Calendar', icon: CalendarDays, accent: 'calendar' },
      { href: '/timetable', label: 'Timetable', icon: LayoutList, accent: 'timetable' },
      { href: '/cycle', label: 'Period', icon: HeartPulse, accent: 'cycle' },
      { href: '/countdown', label: 'Countdown', icon: CalendarClock, accent: 'countdown' },
      { href: '/meals', label: 'Meals', icon: UtensilsCrossed, accent: 'meals' },
      { href: '/fitness', label: 'Fitness', icon: Dumbbell, accent: 'fitness' },
      { href: '/finance', label: 'Finance', icon: Wallet, accent: 'finance' },
    ],
  },
];

export const ALL_LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);

/** Bottom-bar slots on mobile: the app's three top-level sections. */
export const BOTTOM_BAR_HREFS = ['/timer', '/calendar', '/timetable'];

/** The three widgets reachable from inside Focus, in pill order.
 *
 *  The labels here are deliberately NOT the NavLink labels above:
 *  ALL_LINKS calls /timer "Focus", because that is what the drawer and
 *  bottom bar need to say. The pill needs to call the same route
 *  "Timer". Both lists live in this one file so they cannot drift. */
export const FOCUS_SEGMENTS: {
  href: string;
  label: string;
  accent: AccentName;
}[] = [
  { href: '/timer', label: 'Timer', accent: 'timer' },
  { href: '/flexible', label: 'Flexible', accent: 'flexible' },
  { href: '/dashboard', label: 'Dashboard', accent: 'dashboard' },
];

/** Just the hrefs, for active-state checks. Derived, so the pill and the
 *  bottom bar can never disagree about what counts as Focus. */
export const FOCUS_HREFS = FOCUS_SEGMENTS.map((segment) => segment.href);

export function isActiveHref(pathname: string, href: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** True anywhere inside Focus. The bottom-bar Focus slot points at
 *  /timer but must light up on /flexible and /dashboard too. */
export function isFocusRoute(pathname: string): boolean {
  return FOCUS_HREFS.some((href) => isActiveHref(pathname, href));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/components/nav/navLinks.test.ts
```

Expected: PASS.

- [ ] **Step 5: Update AppNav for three slots**

In `src/components/nav/AppNav.tsx`, add `isFocusRoute` to the import on line 6:

```ts
import { ALL_LINKS, BOTTOM_BAR_HREFS, isActiveHref, isFocusRoute } from './navLinks';
```

Change the grid on line 29 from four columns to three:

```tsx
      <div className="mx-auto grid max-w-lg grid-cols-3">
```

Replace the active-state line at line 31:

```tsx
          const active =
            href === '/timer' ? isFocusRoute(pathname) : isActiveHref(pathname, href);
```

Leave the module-scope throw guard at lines 9-13 exactly as it is — it catches an href that no longer resolves to a link.

- [ ] **Step 6: Run the full suite, lint and types**

```bash
npx vitest run
```

Expected: PASS, 41 pre-existing plus the new cases.

```bash
npm run lint && npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 7: Confirm in the browser**

Load `http://localhost:3000/`. Expected:

- Bottom bar (narrow the window below 768px) shows three evenly spaced slots: Focus, Calendar, Timetable. No empty fourth column.
- Drawer shows Home and Focus in the first group, then seven Life entries.
- The Focus slot is lit on `/timer`, `/flexible` **and** `/dashboard`, and unlit on `/` and the Life pages.
- The hub shows eight cards, one of them Focus.

- [ ] **Step 8: Commit**

```bash
git add src/components/nav/navLinks.ts src/components/nav/AppNav.tsx src/components/nav/navLinks.test.ts
git commit -m "feat: collapse Focus into one destination and add section bottom bar

The drawer's three Focus entries become one pointing at /timer, and the
bottom bar becomes the app's three top-level sections: Focus, Calendar,
Timetable.

isFocusRoute keeps the Focus slot lit across all three Focus widgets. A
naive isActiveHref check against /timer alone would leave it dark on
/flexible and /dashboard while building and linting cleanly, so it is
covered by a test."
```

---

### Task 4: Move Dashboard into the dark Focus group

The riskiest task. The move itself is mechanical; the eight colour sites are not.

**Files:**
- Create: `src/lib/heatmapTheme.ts`
- Create: `src/lib/heatmapTheme.test.ts`
- Move: `src/app/(life)/dashboard/` → `src/app/(focus)/dashboard/`
- Modify: `src/app/(focus)/dashboard/page.tsx` (8 colour sites)

**Interfaces:**
- Consumes: `contrastRatio`, `lightness` from `@/lib/color` (Task 1).
- Produces: `HEATMAP_RAMP: readonly string[]` (5 entries), `HEATMAP_SURFACE: string` from `@/lib/heatmapTheme`.

- [ ] **Step 1: Write the failing test for the ramp**

Create `src/lib/heatmapTheme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HEATMAP_RAMP, HEATMAP_SURFACE } from './heatmapTheme';
import { contrastRatio, lightness } from './color';

/** Below this, two adjacent levels read as the same swatch. The cream
 *  ramp failed here first time round with deltas of 1.115 to 1.445. */
const MIN_ADJACENT_CONTRAST = 1.25;

/** The empty level must be visible against the card it sits on, or the
 *  grid disappears -- but must still read as "nothing here". */
const MIN_EMPTY_VS_SURFACE = 1.15;

/** Largest L* step divided by smallest. Above this the ramp looks
 *  lumpy: some neighbours jump, others barely move. */
const MAX_STEP_UNEVENNESS = 1.8;

describe('dark heatmap ramp', () => {
  it('has five levels', () => {
    expect(HEATMAP_RAMP).toHaveLength(5);
  });

  it('separates every adjacent pair', () => {
    for (let i = 1; i < HEATMAP_RAMP.length; i += 1) {
      const ratio = contrastRatio(HEATMAP_RAMP[i - 1], HEATMAP_RAMP[i]);
      expect(
        ratio,
        `levels ${i - 1} and ${i} are only ${ratio.toFixed(3)}:1 apart`,
      ).toBeGreaterThanOrEqual(MIN_ADJACENT_CONTRAST);
    }
  });

  it('keeps the empty level visible against the card', () => {
    // Element 0 is the EMPTY / no-activity level, not the lowest value.
    const ratio = contrastRatio(HEATMAP_RAMP[0], HEATMAP_SURFACE);
    expect(
      ratio,
      `empty level ${HEATMAP_RAMP[0]} is ${ratio.toFixed(3)}:1 against the card`,
    ).toBeGreaterThanOrEqual(MIN_EMPTY_VS_SURFACE);
  });

  it('rises monotonically', () => {
    const ls = HEATMAP_RAMP.map(lightness);
    for (let i = 1; i < ls.length; i += 1) {
      expect(ls[i]).toBeGreaterThan(ls[i - 1]);
    }
  });

  it('steps evenly in perceptual lightness', () => {
    const ls = HEATMAP_RAMP.map(lightness);
    const steps = ls.slice(1).map((l, i) => l - ls[i]);
    const unevenness = Math.max(...steps) / Math.min(...steps);
    expect(
      unevenness,
      `steps are ${steps.map((s) => s.toFixed(1)).join(', ')}`,
    ).toBeLessThanOrEqual(MAX_STEP_UNEVENNESS);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/heatmapTheme.test.ts
```

Expected: FAIL — `Failed to resolve import "./heatmapTheme"`.

- [ ] **Step 3: Create the ramp module**

Create `src/lib/heatmapTheme.ts`:

```ts
/** Heatmap colours for react-activity-calendar under the dark Focus
 *  mood. Kept out of the page component so the ramp can be asserted in
 *  tests -- see heatmapTheme.test.ts.
 *
 *  IMPORTANT: element 0 is the EMPTY / no-activity level, not the
 *  lowest value. Treating it as a value is what made the first cream
 *  ramp unable to show five levels. */
export const HEATMAP_RAMP = [
  '#40333E',
  '#614A70',
  '#846597',
  '#A784BB',
  '#C4B0E0',
] as const;

/** --mt-surface under the dark mood: the card the heatmap sits on.
 *  Duplicated as a literal because the ramp is consumed by a prop that
 *  resolves before CSS custom properties do. */
export const HEATMAP_SURFACE = '#31262E';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/heatmapTheme.test.ts
```

Expected: PASS on all five cases.

**If any threshold fails,** adjust the ramp values and re-run until green. Do not lower a threshold — they encode the acceptance criteria from spec §7. The proposed values were computed by hand and may be slightly off.

- [ ] **Step 5: Move the dashboard directory**

```bash
git mv "src/app/(life)/dashboard" "src/app/(focus)/dashboard"
```

The URL stays `/dashboard`: route groups don't appear in URLs. Confirm the move registered:

```bash
git status --short
```

Expected: a rename entry from `(life)/dashboard/page.tsx` to `(focus)/dashboard/page.tsx`.

- [ ] **Step 6: Point the page at the shared ramp**

In `src/app/(focus)/dashboard/page.tsx`, the constant is named **`MACARON_HEATMAP_THEME`** and spans **lines 15-28** — a ten-line comment followed by the object. **Keep the name**; it is referenced further down the file.

Replace the whole block with:

```ts
// react-activity-calendar consumes this as a literal theme prop, not CSS
// custom properties, so hex is correct here. Both keys carry the same
// ramp: supplying only one key makes the library fall back to its own
// defaults for the other. The ramp itself lives in lib/heatmapTheme.ts
// so its five levels can be asserted in tests.
const MACARON_HEATMAP_THEME = {
  light: [...HEATMAP_RAMP],
  dark: [...HEATMAP_RAMP],
};
```

Add the import at the top of the file:

```ts
import { HEATMAP_RAMP } from '@/lib/heatmapTheme';
```

The old comment claimed "the dashboard is always light mood" and described contrast against cream. Both statements stop being true in this task, which is why the comment is replaced rather than kept.

- [ ] **Step 7: Convert the remaining seven colour sites**

Still in `src/app/(focus)/dashboard/page.tsx`, apply each of these. Line numbers are from before the Step 6 edit shortened the file — locate by value, not by number.

| Was | Becomes |
|---|---|
| `colorScheme="light"` | `colorScheme="dark"` |
| axis `stroke="#796763"` (two occurrences) | `stroke="#B5A2AC"` |
| `cursor={{ fill: '#F0E4DA' }}` | `cursor={{ fill: '#453640' }}` |
| tooltip `background: '#FFFFFF'` | `background: '#31262E'` |
| tooltip `border: '1px solid #F0E4DA'` | `border: '1px solid #453640'` |
| tooltip `color: '#3B2E2A'` | `color: '#F7EFEA'` |
| `<Bar ... fill="#9670C6" />` | `fill="#C4B0E0"` |

Both axis `stroke` values change — there are two, one per axis.

- [ ] **Step 8: Sweep for anything left over**

```bash
grep -nE "#(F3EAE2|DCC9EC|BC9FDC|9670C6|6E4AA0|796763|F0E4DA|FFFFFF|3B2E2A)" "src/app/(focus)/dashboard/page.tsx"
```

Expected: no matches. Any hit is a cream value still in place.

- [ ] **Step 9: Run the full suite, lint and types**

```bash
npx vitest run && npm run lint && npx tsc --noEmit
```

Expected: all clean, 41 pre-existing tests still passing.

- [ ] **Step 10: Confirm in the browser — this is the part tests cannot check**

Load `http://localhost:3000/dashboard`. Expected:

- The page is dark plum, matching `/timer`.
- The heatmap shows five distinguishable levels, and days with no activity read as empty rather than as a low value — while still being visible as a grid.
- Bar chart bars, both axis label sets, and the tooltip on hover are all readable against plum.
- No cream panel, border or text anywhere on the page.

- [ ] **Step 11: Commit**

```bash
git add src/lib/heatmapTheme.ts src/lib/heatmapTheme.test.ts "src/app/(focus)/dashboard/page.tsx"
git commit -m "feat: move Dashboard into the dark Focus group

Dashboard joins /timer and /flexible in the (focus) route group so all
three read as one place. The URL is unchanged -- route groups do not
appear in URLs.

The heatmap ramp moves to its own module so its acceptance criteria are
assertions rather than opinions: five levels, every adjacent pair at
least 1.25:1 apart, the empty level visible against its card, and even
CIE L* steps. Seven further literal colours convert for plum."
```

---

### Task 5: The Focus pill

**Files:**
- Create: `src/components/nav/FocusPill.tsx`
- Modify: `src/app/(focus)/layout.tsx`

**Interfaces:**
- Consumes: `accentVar`, `AccentName` from `@/components/ui/PageShell`; the `(focus)` group now containing all three routes (Task 4).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Create the pill**

Create `src/components/nav/FocusPill.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { accentVar } from '@/components/ui/PageShell';
import { FOCUS_SEGMENTS } from './navLinks';

export default function FocusPill() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Focus sections"
      className="mx-auto w-full max-w-3xl px-4"
      style={{ paddingTop: 'calc(var(--mt-safe-top) + 4.25rem)' }}
    >
      <div className="flex gap-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
        {FOCUS_SEGMENTS.map(({ href, label, accent }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
                active ? '' : 'text-[var(--mt-text-muted)]'
              }`}
              style={
                active
                  ? {
                      background: accentVar(accent),
                      color: 'var(--mt-accent-contrast)',
                    }
                  : undefined
              }
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

The `paddingTop` clears the fixed hamburger, which sits at `calc(var(--mt-safe-top) + 1.15rem)` and is 44px tall. `min-h-11` keeps each segment at the 44px touch target the rest of the app uses.

- [ ] **Step 2: Render it from the Focus layout**

Replace `src/app/(focus)/layout.tsx` in full:

```tsx
import type { Viewport } from 'next';
import FocusPill from '@/components/nav/FocusPill';

export const viewport: Viewport = {
  themeColor: '#241C22',
};

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-mood="dark" className="flex flex-1 flex-col text-[var(--mt-text)]">
      <FocusPill />
      {children}
    </div>
  );
}
```

This file stays a server component — it exports `viewport`. `FocusPill` is the client boundary.

- [ ] **Step 3: Run lint, types and the suite**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
```

Expected: all clean. If lint reports a `viewport`-in-client-component error, the `'use client'` directive has ended up in the wrong file.

- [ ] **Step 4: Confirm the pill works**

Load `http://localhost:3000/timer`. Expected:

- A three-segment pill sits below the header on `/timer`, `/flexible` and `/dashboard`, and on no other route.
- The pill does not overlap the hamburger or the top-right Settings and Theme buttons.
- The active segment is filled with that widget's accent — coral on Timer, yellow on Flexible, lavender on Dashboard — with dark text on it.
- Tapping a segment switches widget without a full page reload.

- [ ] **Step 5: Verify the timer survives the toggle — the critical check**

1. On `/timer`, start a session and note the remaining time.
2. Tap **Dashboard**, wait about 30 seconds.
3. Tap **Timer**.

Expected: the countdown is roughly 30 seconds further along. Not reset, not paused-and-resumed.

If this fails, do not adjust `FocusPill` — something has moved `TimerEngine` out of `AppShell`, and that is the actual bug.

- [ ] **Step 6: Commit**

```bash
git add src/components/nav/FocusPill.tsx "src/app/(focus)/layout.tsx"
git commit -m "feat: add the Focus segmented pill

Timer, Flexible and Dashboard get a three-segment switcher in the shared
(focus) layout. Because the group holds exactly those three routes, the
pill appears on exactly those screens with no conditional rendering.

Segments are sibling-route links under a shared layout, so React keeps
the frame mounted across a switch. The layout stays a server component
-- it exports viewport -- with the pill as the client boundary."
```

---

## Final verification

After all five tasks, run the spec's §10 checklist. The items no test can cover:

- [ ] `/timer`, `/flexible`, `/dashboard` all load directly by URL.
- [ ] A running timer survives toggling to Dashboard and back.
- [ ] All three Focus screens are dark, Dashboard included.
- [ ] The heatmap shows five distinguishable levels against plum; empty days read as empty.
- [ ] The bottom bar has three slots, lit on all three Focus routes and dark on the hub and Life pages.
- [ ] The drawer's Home entry works, and the header is unchanged on all eleven routes.
- [ ] `/calendar` and `/timetable` render with visible Sample chips.
- [ ] Above 768px there is no bottom bar and everything is reachable via the drawer.

```bash
npx vitest run && npm run lint && npx tsc --noEmit
```

Expected: green, with 41 pre-existing tests plus the new colour, accent, navigation and ramp cases.
