# Life Hub & Macaron Design System

**Date:** 2026-08-15
**Status:** Approved design, ready for implementation planning

## 1. Context

Masa Tomato is a Pomodoro app for two people (Jeff and Rachel), deployed on
Vercel, with three routes: timer, flexible stopwatch, and dashboard. State lives
in Zustand (persisted) and Dexie (IndexedDB), with Supabase for cross-device
session sync and the leaderboard.

This round turns it into a **couple's life dashboard** in which the Pomodoro
timer is one section among several. It adds a drawer menu, a home hub, five new
sections as designed-but-inert shells, replaces the colour system, and makes the
site installable to both phones' home screens.

## 2. Goals

1. A hamburger menu, top-left, opening a drawer that reaches every section.
2. A home hub at `/` that greets you and links onward.
3. Five new sections — period cycle, countdown dates, meals, fitness, finance —
   as fully-styled shells with no persistence.
4. A macaron palette applied across the whole app.
5. Installable to an iPhone and an Android home screen as an app.

## 3. Non-goals

Explicitly out of scope for this round:

- Real data, forms, or Supabase tables for the five new sections.
- Offline page loading (service-worker shell caching).
- Push notifications.
- A downloadable `.apk` file — decided against, not deferred (§11).
- Any change to authentication.

## 4. Decisions

| # | Decision | Rejected alternative |
|---|---|---|
| D1 | Home-screen install (PWA), not a packaged native app | Capacitor with static export, which would have required deleting both Server Actions |
| D2 | `/` becomes the hub; the timer moves to `/timer` | Timer stays at `/`, hub relegated to `/home` |
| D3 | One macaron palette, two moods — light for life, inverted dark for focus | All-pastel everywhere; dark-with-pastel-accents |
| D4 | The rule: **dark = actively focusing, light = everything else** — this puts Dashboard on the light side | "Pomodoro stuff vs life stuff" |
| D5 | New sections ship as designed shells with visibly-fake sample data | Bare stubs; one section built for real |
| D6 | Full sweep now — all 15 colour-carrying files converted in this round | Phased sweep in a later round |
| D7 | Both users see all data, including the period cycle — shared visibility is the intent | Per-user separation behind real accounts |
| D8 | No `.apk` file, ever — home-screen install is the delivery mechanism | PWABuilder-packaged APK as a follow-up |

## 5. Information architecture

### 5.1 Routes

Route groups carry the mood and do not appear in URLs.

```
src/app/
  layout.tsx                    root; ClientProviders → Gatekeeper → AppShell
  manifest.ts                   NEW
  (life)/
    layout.tsx                  NEW  data-mood="light", cream themeColor
    page.tsx                    NEW  the hub, serves /
    dashboard/page.tsx          MOVED from app/dashboard/
    cycle/page.tsx              NEW
    countdown/page.tsx          NEW
    meals/page.tsx              NEW
    fitness/page.tsx            NEW
    finance/page.tsx            NEW
  (focus)/
    layout.tsx                  NEW  data-mood="dark", plum themeColor
    timer/page.tsx              MOVED from app/page.tsx
    flexible/page.tsx           MOVED from app/flexible/
```

`app/page.tsx` is deleted; `(life)/page.tsx` takes over `/`. Public URLs after
this change: `/`, `/timer`, `/flexible`, `/dashboard`, `/cycle`, `/countdown`,
`/meals`, `/fitness`, `/finance`.

Next 16 constraint, verified against `node_modules/next/dist/docs`: `viewport`
exports are **supported only in Server Components**. Both group layouts must
therefore remain server components. They only wrap `children` in a `data-mood`
element, so this costs nothing.

### 5.2 Navigation

`AppNav` splits into three components:

- **`MenuButton`** — fixed hamburger, top-left, offset by `--mt-safe-top` and
  `--mt-safe-left` to clear the iPhone notch. Present at every breakpoint.
- **`NavDrawer`** — left slide-in panel over a dimmed backdrop. Grouped:
  Home; **Focus** (Timer, Flexible, Dashboard); **Life** (Period, Countdown,
  Meals, Fitness, Finance); footer showing the signed-in name plus the theme and
  settings entry points.
- **`AppNav`** — mobile-only bottom bar, widened from three slots to four:
  **Home · Timer · Flexible · Dashboard**. The five life sections are
  drawer-only by design; they are occasional destinations, not mid-session ones.

The desktop centre pill is retired — nine destinations do not fit in it.

Drawer behaviour: closes on route change, backdrop tap, `Escape`, and
swipe-left. Traps focus while open, locks body scroll, sets `aria-modal`, and
returns focus to `MenuButton` on close. Because five of the nine routes are
reachable *only* through the drawer, these are requirements rather than polish.

`--mt-nav-height` and `.mt-page-pad` are re-tuned for the four-slot bar.

## 6. Design system

### 6.1 Two token layers

Raw macaron hues are declared once as `--mac-*`. No component references them.
Above them sit semantic tokens, re-pointed per mood:

```css
[data-mood="light"] { --mt-bg: var(--mac-cream); --mt-text: var(--mac-cocoa); … }
[data-mood="dark"]  { --mt-bg: var(--mac-plum);  --mt-text: var(--mac-shell); … }
```

Components use semantic tokens exclusively. This is what makes the ~140-usage
sweep a one-time cost: afterwards a page inherits its mood from the folder it
lives in.

Existing semantic names (`--mt-surface`, `--mt-text`, `--mt-text-muted`,
`--mt-border`, `--mt-accent`, `--mt-glass`) are kept and re-pointed. The
misnamed `--mt-midnight` is renamed to `--mt-bg`; `--mt-midnight` is retained as
an alias for the duration of the sweep and deleted once the last file is
converted. The safe-area, radius, and nav-height tokens are unchanged.

### 6.2 Palette

**Light mood** — cream `#FDF8F3`, card surface `#FFFFFF`, border `#F0E4DA`,
cocoa text `#3B2E2A`, muted text `#8A7570`.

**Dark mood** — plum `#241C22`, raised `#31262E`, border `#453640`, text
`#F7EFEA`, muted text `#B5A2AC`.

**Section accents** — one per section, and the main reason the app reads as
macaron rather than as generic pastel:

| Section | Accent |
|---|---|
| Timer | `#EF9A8D` |
| Flexible | `#F0CE87` |
| Dashboard | `#C4B0E0` |
| Period | `#F2A7BE` |
| Countdown | `#A8DCD1` |
| Meals | `#D9AC80` |
| Fitness | `#B4D9A0` |
| Finance | `#A9C4E8` |

Every accent must clear 4.5:1 contrast against its mood's text colour when used
behind text; where it does not, it is used as a fill or bar only, never as a
text background. This is checked per accent during implementation.

### 6.3 Surfaces

`.mt-glass` (translucent dark plus blur) is kept for dark mood only. Light mood
uses a new `.mt-soft`: opaque white, generous radius, and a shadow **tinted with
the section accent** (`0 8px 24px rgba(accent, .14)`). Grey shadows on cream
read as dirty; the tint is what keeps pastel surfaces from looking washed out.

### 6.4 Backgrounds

`BackgroundManager` becomes mood-aware. The photo themes (`cafe`, `nature`,
`dark`) and the `.mt-scrim` render **only** under `(focus)` — they were built
for white-on-dark. Under `(life)` the background is flat cream with two large,
very soft accent blobs, no scrim.

### 6.5 Primitives

New, in `src/components/ui/` alongside the existing `Modal`:

- **`PageShell`** — title, optional subtitle, section accent, padding rules.
  All nine pages render through it.
- **`Card`** — mood-aware surface.
- **`StatTile`** — the small glance block the hub is built from.
- **`ComingSoon`** — the not-built-yet marker, so an inert page looks
  deliberate rather than broken.

### 6.6 Sweep order

15 files carry hardcoded colours (~140 usages). `SettingsModal` (25) and
`ThemeModal` (18) are converted **first and deliberately**: they are shared by
both moods, so they are the hardest cases and they prove the token system works.
If they convert cleanly the remaining 13 files are mechanical.

Remaining files, by usage count: `TimerDisplay` (14), `FlexibleSettingsModal`
(14), `Leaderboard` (13), `dashboard/page` (12), `FlexibleControls` (8),
`Gatekeeper` (6), `FlexibleDisplay` (6), `BackgroundManager` (5), `AppNav` (5),
`ui/Modal` (4), `AudioPlayer` (4), `SessionConflictDialog` (3), `Controls` (3).

## 7. Pages

### 7.1 Hub (`/`)

A greeting reading `user_name` from localStorage, then eight accent cards — two
columns on a phone, four on desktop — each icon plus label plus one glance line.

The hub is not a wall of dead links: Dexie already holds session history, so the
**Focus** and **Dashboard** cards show live values (today's focus minutes,
current streak) from day one. The other six show `ComingSoon`.

### 7.2 Shells

Each is fully styled through `PageShell` with its intended layout sketched, so
later feature work drops into slots that already exist:

| Route | Sketched layout |
|---|---|
| `/cycle` | "Next period in N days" hero, month strip with predicted days tinted rose, symptom chips, disabled *Log period* |
| `/countdown` | Large event cards sorted soonest-first with days remaining, disabled *Add date* |
| `/meals` | Day-grouped entries — time, who ate it, photo slot — disabled *Add meal* |
| `/fitness` | Week grid, stat row (workouts, minutes), disabled *Log workout* |
| `/finance` | Month spent/budget tile, category breakdown with accent bars, recent transactions |

**Every piece of sample data carries a visible `Sample` chip and reduced
emphasis.** Placeholder data that looks real is how a fabricated number gets
trusted — an unacceptable outcome on a finance page in particular.

### 7.3 Dashboard

Functionally unchanged; converted to light mood. Recharts series colours and the
`react-activity-calendar` theme both take explicit configuration currently tuned
for dark, and need a genuine macaron ramp built for the lavender accent.

### 7.4 Gatekeeper

Rendered in light mood. It is the front door and the first thing either user
sees.

## 8. Mobile install

### 8.1 What ships

1. **`src/app/manifest.ts`** — Next 16's native convention, returning a typed
   `MetadataRoute.Manifest`: name, short name, description, `start_url: '/'`,
   `display: 'standalone'`, background and theme colours, icon set.
2. **Icon set** — none exists today; `public/` holds only leftover Next template
   SVGs. A Masa Tomato mark in macaron is required at 192px, 512px, a **maskable**
   512px variant with correct safe zone so Android does not crop it badly, and a
   180px `apple-touch-icon`.
3. **`appleWebApp` metadata** in the root layout — iOS ignores much of the
   manifest and needs its own tags to render full-screen.
4. **`InstallPrompt`** — a macaron card that hides itself once
   `display-mode: standalone` matches. On Android it defers to Chrome's own
   prompt; on iOS it shows Share → Add to Home Screen instructions, since Safari
   fires no install event. The Next docs explicitly advise against custom
   `beforeinstallprompt` buttons for this cross-platform reason.

### 8.2 Status bar

The phone status bar takes its colour from `theme_color`. Each route group's
layout exports its own `viewport.themeColor`, so the status bar is cream on the
hub and plum in the timer with no runtime code.

### 8.3 Result

On Android, Chrome installs a PWA by having Google mint a genuine Android
package on the device — it appears in the app drawer and in Settings → Apps and
uninstalls like any other app. On iOS, Add to Home Screen produces a full-screen
app with its own icon. No `.apk` file is produced, now or later (D8).

## 9. Testing and verification

The project uses vitest with five pure-logic tests in `src/lib/` and no
component-testing stack. None is introduced here — a component-testing stack
would be disproportionate for inert pages.

**Automated.** One new pure module, `src/lib/hubStats.ts`, computing today's
focus minutes and the current streak from `SessionRecord[]`, with
`hubStats.test.ts` following the existing pattern. Cases: empty history, one
session today, sessions spanning midnight, a broken streak, and a streak
including today.

**Manual checklist.**

- `npm run build` and `npm run lint` clean; `npm run test` passes.
- All nine routes render, each in the correct mood.
- Drawer: opens, closes on all four triggers, traps focus, returns focus to the
  hamburger, locks body scroll.
- Bottom bar shows four correct slots on mobile and is absent on desktop.
- A running timer survives navigation to `/finance` and back.
- Status bar colour flips between `/` and `/timer` on a real phone.
- Installed to a real Android home screen and a real iPhone home screen.

## 10. Risks

1. **`TimerEngine` must not move.** It lives in `AppShell`, above the route
   groups, which is what keeps a Pomodoro running across navigation. Easy to
   break while restructuring; verify explicitly.
2. **Dashboard is the hard recolour.** Recharts and `react-activity-calendar`
   need real theme ramps, not token swaps.
3. **No app icon exists.** One must be designed before the manifest is useful.
4. **Rachel's home-screen shortcut changes behaviour** — it will open the hub
   rather than the timer. Tell her rather than letting her discover it.

## 11. Resolved questions

Both questions raised during design were answered on 2026-08-15. Neither remains
open; they are recorded here because the reasoning matters to later work.

- **Shared-secret privacy — resolved: no separation (D7).** Authentication stays
  as it is: one shared password, then choose a name. Both users see all data,
  the period cycle included. This is deliberate, not inherited — shared
  visibility is the point of a couple's app. The consequence to carry forward:
  the `/cycle` feature spec must **not** introduce per-user scoping or a
  privacy toggle, and any future Supabase tables follow the existing
  `focus_sessions` pattern of readable-by-both rather than row-level per-user
  policies.
- **`.apk` file — resolved: not wanted (D8).** Home-screen install is the
  delivery mechanism for both phones. PWABuilder packaging is not planned. This
  removes the only reason the manifest would have needed to satisfy external
  packaging constraints, so it is written purely for browser install.
