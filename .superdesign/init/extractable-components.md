# Extractable Components

The project has no general-purpose `ui/` primitive directory. The strongest extraction candidates are shared layout and trigger patterns already mounted across routes.

## AppNav

- Source: `src/components/AppNav.tsx`
- Category: layout
- Description: Path-aware three-destination navigation, currently rendered as a floating top pill and approved to become bottom navigation on phones.
- Extractable props: `activeItem` (string; derived from pathname by default), optional route href overrides if a draft needs non-production links.
- Hardcoded: Timer/Flexible/Dashboard labels, route order, route paths, rounded pill styling, active white treatment, inactive translucent treatment.
- Responsive redesign note: preserve the top floating treatment for wider layouts if useful, but render a thumb-reachable phone bottom bar with safe-area spacing on compact screens.

## AppShell

- Source: `src/components/AppShell.tsx`
- Category: layout
- Description: Full-screen composition layer that combines media background, global navigation, timer infrastructure, route content, theme management, embedded audio, and alarm output.
- Extractable props: `children` (React node), optional draft-only flags such as `showNavigation`, `showThemeTrigger`, or `backgroundMode` if needed to demonstrate states.
- Hardcoded: zinc-950 base canvas, overflow behavior, mounted global component order, full-screen minimum height.
- Redesign note: treat background media, scrim, focus canvas, navigation, and utilities as explicit visual layers while preserving the existing runtime responsibilities.

## ThemeModalTrigger

- Source pattern: trigger button inside `src/components/ThemeModal.tsx`
- Category: basic
- Description: Circular palette-icon utility button that opens the global theme manager; it is a reusable trigger pattern rather than a separate source component today.
- Extractable props: `isOpen` or `onOpen` for draft state, `label` for accessible naming if the pattern is generalized.
- Hardcoded: Lucide `Palette` icon, current absolute top-right position (`top-6 right-20`), 24px icon, circular translucent black surface, white opacity states.
- Current source pattern:

```tsx
<button
  onClick={() => setIsOpen(true)}
  className="absolute top-6 right-20 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all"
  title="Theme Manager"
>
  <Palette size={24} />
</button>
```

- Redesign note: preserve the palette/media-management meaning but integrate the trigger into responsive utility chrome. Avoid competing with phone bottom navigation or the minimal timer canvas.

## SessionConflictDialog

- Source: `src/components/SessionConflictDialog.tsx`
- Category: basic
- Description: Shared confirmation dialog used by classic and flexible controls when another timer mode owns the current session.
- Extractable props: `open`, `onConfirm`, `onCancel`.
- Hardcoded: title, explanatory copy, Yes/No labels, dark overlay, solid charcoal panel, white primary action.

## Not yet extractable as primitives

- Timer controls are visually related but differ in state model and action sets between `Controls` and `FlexibleControls`.
- `SettingsModal` and `FlexibleSettingsModal` share a visual pattern but expose different forms and store contracts.
- Dashboard cards and segmented leaderboard filters are inline in their feature files.
- Do not imply that `Button`, `Card`, `Dialog`, `Modal`, or `IconButton` source files already exist.
