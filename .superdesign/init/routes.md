# Routes

## Router

The project uses the Next.js 16 App Router. There is no separate router configuration file. Every route is wrapped by `src/app/layout.tsx`, then `ClientProviders`, `Gatekeeper`, and `AppShell`.

## Route map

### `/`

- Entry: `src/app/page.tsx`
- Layout: `src/app/layout.tsx`
- Page components: `TimerDisplay`, `Controls`, `SettingsModal`
- Summary: Classic Pomodoro timer with task/tag input, circular progress, cycle indicators, reset/play/skip controls, strict mode, duration settings, alarm selection, and background-audio URL.

### `/flexible`

- Entry: `src/app/flexible/page.tsx`
- Layout: `src/app/layout.tsx`
- Page components: `FlexibleDisplay`, `FlexibleControls`, `FlexibleSettingsModal`
- Summary: Open-ended study timer that derives rest duration from study time, with study/rest phases, conflict handling, alarm selection, and adjustable rest ratio.

### `/dashboard`

- Entry: `src/app/dashboard/page.tsx`
- Layout: `src/app/layout.tsx`
- Page component: `Leaderboard`
- Summary: Focus analytics dashboard with total sessions, hours, today's focus, leaderboard, annual activity heatmap, weekly bar chart, logout, and history clearing.

## Shared route chrome

All three routes receive:

- `Gatekeeper`: password and identity gate.
- `BackgroundManager`: gradient or custom local background.
- `AppNav`: Timer / Flexible / Dashboard navigation.
- `TimerEngine`: shared worker-driven clock and document title updates.
- `ThemeModal`: global theme trigger and picker.
- `AudioPlayer`: draggable Spotify/YouTube embed when configured.
- `AlarmPlayer`: shared synthesized alarm playback.

## Navigation state

`AppNav` uses `usePathname()`:

- `/` is active only on the exact root path.
- `/flexible` is active on `/flexible` and descendants.
- `/dashboard` is active on `/dashboard` and descendants.

Current navigation is a floating top-center pill. Approved redesign direction retains the three destinations but uses a compact bottom navigation on phones.
