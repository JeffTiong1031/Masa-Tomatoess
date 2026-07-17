# Theme

## Theme architecture

- Tailwind CSS v4 is loaded directly with `@import "tailwindcss"`.
- There is no `tailwind.config.ts/js`; the project uses Tailwind v4 defaults plus the inline `@theme` block in `globals.css`.
- Fonts are loaded in `src/app/layout.tsx` with `next/font/google`: Geist and Geist Mono expose `--font-geist-sans` and `--font-geist-mono`.
- The body currently declares an Arial/Helvetica fallback stack directly, while Tailwind's `font-sans` token maps to Geist.
- Theme/background selection is state-driven through `useTimerStore.settings.themeId`; a custom file is persisted locally through `idb-keyval`.

## Full global stylesheet

Source: `src/app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

## De facto current palette

The visual system is defined mostly by repeated Tailwind utility values in components rather than semantic tokens.

- Base canvas: `zinc-950` / `#09090b`, dark mode global background `#0a0a0a`.
- Modal/panel solid: `#1a1a1a`; audio panel uses `#121212`.
- Foreground: white, `white/90`, `white/80`, `white/70`, `white/60`, `white/50`, `white/40`, `white/30`.
- Glass surfaces: `black/20`, `black/30`, `black/40`, `white/5`, `white/10`.
- Borders: predominantly `white/10`, occasionally `white/5` or `white/20`.
- Brand/action accent: `blue-500` / `#3b82f6`; blue glow uses `rgba(59,130,246,0.6)`.
- Default background: `from-blue-900/20 via-zinc-950 to-purple-900/20`.
- Semantic accents: emerald for rest/time, purple for trends, yellow for rank/cycles, red for destructive/strict/alarm states.
- Heatmap colors: zinc `#27272a` through emerald `#064e3b`, `#065f46`, `#047857`, `#10b981`, `#34d399`.

## Typography

- Display timers: very light weight, tabular numerals, tight tracking, white with drop shadow.
- Classic timer: `text-[5.5rem]`, `font-extralight`, `tabular-nums`, `tracking-tighter`.
- Flexible timer: `text-6xl sm:text-7xl`, `font-light`, `tabular-nums`.
- Dashboard title: `text-5xl`, `font-extralight`, `tracking-tight`.
- Eyebrows: small uppercase text with wide tracking (`tracking-[0.2em]` to `tracking-[0.25em]`).
- Modal titles: `text-2xl font-light tracking-wide`.

## Shape, depth, and spacing

- Timer canvas: 360×360 desktop square, `rounded-[3rem]`, glass background, large shadow.
- Flexible canvas: 18–20rem square, `rounded-3xl`.
- Modal/dialog panels: `rounded-2xl`.
- Dashboard cards: `rounded-[2rem]` to `rounded-[2.5rem]`.
- Primary timer control: 5rem circular button.
- Navigation: compact rounded-full segmented pill.
- Depth: backdrop blur, low-opacity borders, `shadow-2xl`, and selective blue/white glow.
- Motion: Tailwind transitions from 200ms modal fades to 1000ms background and timer progress changes.

## Approved target palette direction

The redesign should evolve the current system into **Cinematic Midnight / Immersive Focus**:

- Midnight navy replaces neutral black as the expressive foundation.
- Cool blue remains the brand signal and becomes a restrained atmospheric glow.
- Text stays near-white with cool, low-contrast secondary copy.
- Glass should be sparse and purposeful; keep the timer canvas visually minimal.
- Suggested semantic roles for drafts: midnight canvas, navy scrim, glass panel, cool-blue focus, cyan-blue glow, soft white text, muted blue-gray text, danger red.
- Preserve readable contrast over user media with adaptive dark scrims.

These target roles describe the approved direction, not tokens currently implemented in `globals.css`.
