# Pomodoro Timer Design System

## Product and implementation context

- Product name in metadata: **Masa Tomato**
- Framework: Next.js 16 App Router, React 19
- Styling: Tailwind CSS v4
- Components: custom React components; no shadcn/ui or shared `ui/` primitives
- State: Zustand with persisted classic and flexible timer stores
- Local persistence: Dexie and `idb-keyval`
- Icons: Lucide React
- Current routes: `/`, `/flexible`, `/dashboard`

This document captures both the **current visual system** and the **approved redesign direction**. Current-source facts describe what exists today. Target guidance describes what future Superdesign drafts should move toward.

## Current visual system

### Overall character

The current interface is a dark, glassmorphic productivity app. It combines a near-black zinc canvas, white translucent panels, large rounded shapes, thin low-opacity borders, and blue accent glow. Timer pages center a single large timer object over a gradient or image background; analytics use a denser grid of glass cards.

### Current palette

- Application base: `bg-zinc-950`
- Global dark background: `#0a0a0a`
- Solid modal surface: `#1a1a1a`
- Audio surface: `#121212`
- Main text: white
- Secondary text: white at 40–70% opacity
- Glass: white at 5–10% opacity or black at 20–40% opacity
- Borders: white at 5–20% opacity
- Main accent: Tailwind `blue-500` (`#3b82f6`)
- Timer glow: `rgba(59,130,246,0.6)`
- Default ambience: blue-900 / zinc-950 / purple-900 diagonal gradient
- Supporting status colors: emerald, purple, yellow, red

### Current typography

- Geist and Geist Mono are loaded as CSS variables through `next/font`.
- The global body currently declares Arial/Helvetica fallbacks directly.
- Timer numerals are oversized, very light, tabular, tightly tracked, and white.
- Headings favor light/extralight weight and restrained tracking.
- Eyebrows use small uppercase text with wide letter spacing.
- Supporting labels are compact, medium weight, and low contrast.

### Current surfaces and geometry

- Classic timer canvas: 360×360, `rounded-[3rem]`, black translucent glass, heavy backdrop blur, large shadow.
- Flexible timer canvas: 18–20rem square, `rounded-3xl`, black translucent glass.
- Primary timer action: 5rem circular white button with dark icon and hover glow.
- Navigation: floating top-center glass pill with white active segment.
- Modals: centered charcoal panels with `rounded-2xl`, dark scrim, and blur.
- Dashboard cards: white/5 glass, white/10 border, `rounded-[2rem]` to `rounded-[2.5rem]`.
- Icons: Lucide outlines, typically 16–32px.

### Current motion

- Background transitions: 1000ms.
- Circular timer progress: 1000ms linear.
- Modal entry classes: fade and zoom, 200ms.
- Controls: color, scale, and glow transitions.
- Alarm state: pulse animation and red ring/glow.
- No explicit `prefers-reduced-motion` behavior is currently implemented.

### Current background behavior

`BackgroundManager` renders a global layer behind all content:

- `themeId: "none"` uses a blue/zinc/purple gradient.
- Bundled static image paths can be selected in `ThemeModal`.
- A custom image file can be stored locally in IndexedDB and rendered through an object URL.
- Image backgrounds receive a black/40 overlay and 2px backdrop blur.
- The current custom upload input accepts `image/*`; current code does not yet render video backgrounds.

## Approved redesign direction

### North star: Cinematic Midnight / Immersive Focus

The redesigned experience should feel like entering a quiet, cinematic focus environment rather than opening a utility dashboard. The reference quality is LifeAt-like immersion: the background establishes atmosphere, while the timer remains calm, minimal, readable, and immediately actionable.

The interface should not become ornamental or crowded. Atmosphere belongs mainly in the media, lighting, depth, and subtle motion. Core timer controls remain simple.

### Brand expression

- Foundation: midnight navy rather than flat black.
- Brand signal: cool blue light, used as a controlled glow and active-state cue.
- Foreground: soft near-white, not stark white everywhere.
- Secondary copy: cool blue-gray with enough contrast over media.
- Surfaces: deep navy glass with subtle cool borders.
- Avoid purple as a dominant brand color; it may remain only as incidental background variation.
- Red stays reserved for destructive actions, strict-mode failure, and alarm urgency.
- Emerald can continue to represent rest or recovery.

Suggested draft values, pending implementation tokenization:

- Midnight canvas: `#050914`
- Deep navy: `#081226`
- Elevated navy: `#0C1830`
- Cool border: `rgba(148, 190, 255, 0.16)`
- Primary text: `#F5F8FF`
- Secondary text: `#A8B4CA`
- Brand blue: `#5B9CFF`
- Bright focus blue: `#7DB7FF`
- Blue glow: `rgba(67, 139, 255, 0.35)`
- Media scrim: adaptive navy/black, typically 35–65%

These are direction-setting values for design drafts, not current CSS tokens.

### Minimal timer canvas

- The timer is the visual anchor, not a dense card.
- Reduce competing chrome around the countdown.
- Use a restrained translucent field, subtle edge light, or soft radial halo rather than a heavy glass block when the media already provides depth.
- Keep tabular numerals large and stable.
- Keep phase, task, and cycle information subordinate.
- Preserve obvious play/pause behavior and adequate touch targets.
- Prefer one primary action plus quiet secondary controls.
- Controls must remain legible against both still and moving media.

### Responsive navigation

- Desktop/tablet may retain a floating compact navigation treatment.
- Phones use a fixed bottom navigation for Timer, Flexible, and Dashboard.
- Respect `env(safe-area-inset-bottom)`.
- Keep the primary timer action visually separate from route navigation.
- Each destination needs an icon and concise label in design drafts; use Lucide icons.
- Active state uses cool-blue light and clear contrast, not only a subtle opacity shift.
- Bottom navigation should feel integrated with the midnight environment through a navy glass surface and top edge highlight.

### Live image and video backgrounds

- Support immersive still-image and video backgrounds.
- **Local uploads only**: users choose media from their own device.
- Do not add remote stock providers, search APIs, cloud media libraries, external media URLs, or social/video imports.
- Store media locally using the project's browser persistence approach; do not imply server upload.
- Image backgrounds use cover sizing and centered positioning by default.
- Video backgrounds should be muted, looped, inline, and non-interactive.
- Use an adaptive readability scrim and optional subtle blur behind content, not a blanket blur that destroys the scene.
- Provide a no-media Midnight default that still feels branded.
- The existing bundled theme thumbnails are current behavior, but the approved redesign's user-supplied media workflow is local-upload-only.

### Smart motion fallback

Motion must adapt to user preference and runtime capability:

1. Honor `prefers-reduced-motion: reduce`.
2. In reduced-motion mode, do not autoplay moving backgrounds; show a poster frame or static Midnight fallback.
3. Pause or degrade background video when the document is hidden.
4. If video decode/playback fails, fall back to a still poster when available, then to the Midnight default.
5. Avoid continuous decorative animation around timer numerals.
6. Preserve essential state feedback with color, icon, text, and instant/short transitions.
7. Keep timer accuracy independent of visual animation; the existing worker/store engine remains authoritative.

### Content layering

Recommended visual stack:

1. Local image/video media
2. Adaptive midnight scrim and optional vignette
3. Atmospheric blue radial glow
4. App navigation and utilities
5. Minimal timer or page content
6. Modal/dialog layer
7. Alarm/conflict urgency layer

Background media must never reduce timer readability or obscure focus/action states.

### Dashboard direction

- Keep dashboard information-rich but visually related to the focus environment.
- Use midnight navy cards with quieter glass, cool borders, and disciplined spacing.
- Preserve the three key summary metrics, leaderboard, heatmap, and weekly chart.
- Brand blue should carry primary chart emphasis; semantic colors can distinguish recovery, trend, ranking, and danger.
- On phones, stack metrics and charts cleanly above the fixed bottom navigation.
- Avoid applying the minimal timer canvas literally to analytics; the dashboard needs hierarchy and scanability.

### Dialogs and settings

- Continue centered dialogs on larger screens.
- Consider bottom sheets or near-full-width panels on phones.
- Use shared visual anatomy even though the current source has no shared dialog primitive: scrim, navy panel, title, close action, form region, primary action.
- Local media selection belongs in the Theme Manager.
- Clearly communicate file type, local-only storage, active background, and motion fallback.
- Destructive actions remain visually distinct and require confirmation.

### Accessibility and interaction

- Maintain WCAG-readable text and controls over every media state.
- Minimum touch target: approximately 44×44px.
- Do not communicate active timer mode, selected route, or alarm state with color alone.
- Add accessible names to icon-only actions.
- Keyboard focus should be clearly visible with a cool-blue ring.
- Modal focus management and Escape handling should be part of implementation even though current custom dialogs do not provide it.
- Keep timer numerals stable with tabular figures.

## Existing architecture to preserve

- `AppShell` remains the global composition boundary.
- `BackgroundManager` owns background rendering.
- `ThemeModal` owns the media/theme management entry point.
- `AppNav` owns route navigation.
- `TimerEngine` and Zustand stores own timekeeping state, independent of presentation.
- `AudioPlayer` and `AlarmPlayer` remain global utilities.
- Classic and flexible modes retain their distinct behavior and route structure.
- Dexie/IndexedDB remain the basis for local-first persistence.

## Component strategy

No shared UI primitive library exists today. Design drafts must not pretend that shadcn components are already installed. Reuse or extract from:

- `AppShell`
- `AppNav`
- `ThemeModal` trigger pattern
- `SessionConflictDialog`

If implementation later introduces primitives, prioritize only repeated needs such as icon buttons, modal anatomy, glass panels, segmented controls, and form controls. Preserve custom visual identity rather than adopting a default component-library appearance.

## Do / do not

Do:

- Lead with an immersive midnight scene.
- Keep the timer calm, spacious, and dominant.
- Use cool blue as a focused light source.
- Design phone navigation at the bottom.
- Support local image and video media.
- Specify reduced-motion and playback failure states.
- Use real route/component architecture from the init files.

Do not:

- Add shadcn or fictional shared primitives to design context.
- Use remote background providers or URL-based background imports.
- Overload the timer with cards, widgets, metrics, or decorative controls.
- Depend on animation for comprehension.
- Use heavy blur that erases user media.
- Turn the dashboard into the same sparse layout as the timer.
- Replace timer engine behavior with visual animation timing.
