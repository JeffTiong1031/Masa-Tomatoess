@AGENTS.md

# Masa Tomato

A shared life dashboard for two people, grown out of a Pomodoro timer. Study
holds the focus tools; the rest of the app holds the everyday sections. Local
first: sessions are written to IndexedDB and synced to Supabase, so the timer
keeps working offline and the leaderboard reconciles later.

Installable as a PWA. Launched locally through `PomodoroOS.vbs`.

## How to explain things

Write for Jeff in plain English. Everyday words first. If a technical
name cannot be avoided (a file, a page path, a command), say what it
does in ordinary language, then name it.

- Explain what he will see and do, not the machinery behind it.
- Do not lead with component names, function names, or CSS tokens unless
  the question is about those.
- When a term is needed, define it once in a short clause.
- Keep the same voice in chat, summaries, and any other writing meant
  for him. Code itself still follows the conventions below.

## Core tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack), React 19.2 |
| Language | TypeScript, strict |
| Styling | Tailwind v4 via `@tailwindcss/postcss`, CSS custom properties |
| State | Zustand (`persist` to localStorage) |
| Local data | Dexie (IndexedDB), `idb-keyval` for wallpaper blobs |
| Remote data | Supabase (`focus_sessions`) |
| Charts | Recharts, `react-activity-calendar` |
| Icons | `lucide-react` |
| Tests | Vitest (no DOM env, no React Testing Library) |

Next.js 16 is not the Next.js in your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing App Router code.

## Common commands

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm test
```

`npm run test:watch` for a watcher, `npm run lint` for ESLint, `npx tsc --noEmit`
to typecheck alone.

Never start the dev server with a raw shell command; use the preview tooling so
the browser attaches. Moving or deleting files under `src/app/` fails with
"permission denied" while the dev server is running: stop it first. After moving
routes, delete `.next/` or `tsc` keeps reporting the old paths.

## Code conventions and standards

- **Use the macaron palette.** Never hardcode a colour. Reference `--mt-*`
  semantic tokens in components; the raw `--mac-*` hues stay inside
  `globals.css`. Where a library needs a literal before CSS resolves
  (Recharts, `react-activity-calendar`), put it in `lib/heatmapTheme.ts` and
  pin it to its token in a test.
- **Do not write comments.** Let names and structure carry the meaning.
  (Existing comments predate this rule and are not to be swept out unless
  asked; several encode measured values that cannot be recovered by reading
  the code.)
- **Avoid overly defensive programming.** No guards for states the types
  already exclude, no fallbacks for cases that cannot occur.
- **Avoid instance checks.** No `instanceof`, no `typeof` branching to
  discriminate shapes. Model the union properly.
- **Handle exceptions only where there is something to do about them.** The
  sync layer and IndexedDB access catch because the network and storage really
  fail. Pure functions do not.
- Server Components by default; `'use client'` only on the leaf that needs it.
- Grid over flex percentage maths. `min-h-dvh`, never `h-screen`.
- Touch targets at least 44px.

## The macaron palette

Two layers. Raw hues are `--mac-*` and never referenced outside `globals.css`.
Semantic tokens are `--mt-*` and are what components use, re-pointed by a
`data-mood` attribute on the route-group wrapper.

Surfaces: `--mac-cream` `#FDF8F3`, `--mac-white` `#FFFFFF`,
`--mac-border-light` `#F0E4DA`, `--mac-cocoa` `#3B2E2A`,
`--mac-cocoa-muted` `#796763`.

Section accents, one per section, each pinned in `accents.test.ts`:

| timer | flexible | dashboard | cycle | countdown |
|---|---|---|---|---|
| `#EF9A8D` | `#F0CE87` | `#C4B0E0` | `#F2A7BE` | `#A8DCD1` |

| meals | fitness | finance | calendar | timetable |
|---|---|---|---|---|
| `#D9AC80` | `#B4D9A0` | `#A9C4E8` | `#FFB5F4` | `#72E2FF` |

`PageShell` sets `--mt-accent` on `<main>`, so descendants inherit the section
accent without prop drilling.

Accents are pastels built to sit *behind* text. When one is needed as ink
(a bar fill, a ramp top) it fails contrast and needs a deeper sibling:
`--mac-chart-lilac`, `--mac-danger-deep`, `--mac-rank-*-light`.

The `dark` mood tokens are fully defined but currently unused; every route
renders `data-mood="light"`.

## File and folder map

```
src/
  app/
    layout.tsx              root shell, fonts, AppShell
    manifest.ts             PWA manifest
    (life)/                 data-mood light; the everyday sections
      page.tsx              the hub at /
      cycle countdown meals fitness finance
    study/                  data-mood light, data-section study
      layout.tsx            FocusPill + StudyPanel
      page.tsx              redirects to /study/timer
      timer flexible dashboard    the Focus pill
      calendar timetable          the section panel
    actions/                server actions (auth, clearSessions)
  components/
    AppShell BackgroundManager TimerEngine ClientProviders
    TimerDisplay Controls FlexibleDisplay FlexibleControls
    Leaderboard HubGrid Gatekeeper ThemeModal SettingsModal
    nav/
      navLinks.ts           the nav spine; every list and predicate
      NavDrawer StudyPanel FocusPill
    ui/                     PageShell Card Modal StatTile ComingSoon
  lib/
    color.ts                contrast, L*, Lab, deltaE for palette tests
    heatmapTheme.ts         chart literals, pinned to tokens
    backgroundField.ts      route to backdrop
    backgrounds.ts          wallpaper presets and validation
    sync.ts sessionSync.ts supabase.ts
    hubStats.ts heatmapRange.ts flexibleTime.ts sessionDuration.ts
  store/                    useTimerStore, useFlexibleStore
  db/db.ts                  Dexie schema, SessionRecord
  worker/timer.worker.ts    keeps the countdown honest when backgrounded
  hooks/                    useHasMounted, useMediaQuery
docs/superpowers/           plans, specs, verification checklists
```

Tests sit beside their source as `*.test.ts`.

## Routing and navigation

`navLinks.ts` is the single source of truth. `ALL_LINKS` is the flat menu,
`STUDY_PANEL` the three Study tabs, `FOCUS_SEGMENTS` the pill.

Study is a real URL segment, and that matters: prefix matching via
`isActiveHref(pathname, '/study')` lights the menu entry on every child. An
earlier flat layout needed a hand-written special case for this and one
consumer forgot to call it. Do not flatten these routes back out.

- `FocusPill` renders only on the three Focus routes and returns `null`
  elsewhere. `.mt-page-pad-focus` assumes it is above; `.mt-page-pad` carries
  its own hamburger clearance for pages without it.
- `StudyPanel` renders at every width, because the drawer does not list
  Calendar or Timeline. It is the only bottom bar in the app; every other
  section navigates through the drawer alone. There was once a Home / Study /
  Period bar on phones and it is gone on purpose -- it floated over page
  content and duplicated the drawer. Do not bring it back.
- `[data-section='study'] .mt-page-pad` is the only rule that reserves bottom
  nav height, because Study is the only section with a fixed bottom bar.

## Backdrops and contrast

`backgroundFieldFor(pathname)` returns `themed` (the user's wallpaper, on the
three Focus routes) or `plain` (cream with accent blobs). The backdrop is
`fixed`, so it stays put while a long page scrolls.

There is no veil over the wallpaper. The rule that replaces it:

> On a wallpapered route, nothing renders text directly onto the background.
> If it has words, it sits on a panel.

`--mt-glass` is 94% white because of that. Against a black wallpaper,
`--mt-text-muted` measures 4.06:1 at 88% and 4.67:1 at 94%. Do not lower it
without redoing that sum.

Contrast targets: WCAG AA, 4.5:1 for body text, 3:1 for icons and large text.
Measure against what the text *actually* sits on. Tints compound, and a colour
verified on `--mac-white` can still fail on a tinted row inside a white card;
that is exactly how the rank badges shipped at 4.35:1.

## Testing

Vitest runs pure functions only. There is no DOM environment and no component
rendering, so anything worth asserting gets extracted into `lib/`. That is why
`backgroundField.ts` and `heatmapTheme.ts` exist as modules rather than living
inside their components.

Palette decisions are assertions, not opinions. `color.ts` provides the maths;
`accents.test.ts` guards perceptual separation between section accents with
CIE deltaE (not hue angle, which ignores lightness and chroma);
`heatmapTheme.test.ts` pins every chart literal to its token in `globals.css`
so retuning a token fails loudly.

When fixing a bug, write the test so it fails against the bug first.

## Gotchas

- **`var()` inside a custom property resolves where the property is
  *declared*, not where it is used.** Putting an accent-tinted shadow behind a
  token declared on the `[data-mood]` wrapper freezes `--mt-accent` at the
  wrapper's value and silently collapses every section's tint to the default.
  Keep such expressions in the rule that consumes them.
- `THEMED_ROUTES` and "is this route dark" are different questions. Conflating
  them once put dark cards on a cream background.
- Route order matters where a route is both themed and something else; resolve
  it in `backgroundFieldFor`, not in a chain of `if`s in the component.
- `useHasMounted` guards `localStorage` and wall-clock reads so SSR and the
  first client render match.
- `TimerEngine` lives above the route groups in `AppShell` so a running timer
  survives navigation. Do not move it.

## Commits

Commit as Jeff's account only. Never add a `Co-Authored-By` trailer or any
other generated-with attribution.
