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

/** Literal copies of dark-mood tokens, for the props that consume a
 *  value before CSS custom properties resolve: react-activity-calendar's
 *  `theme` and Recharts' stroke / fill / contentStyle. Literals are
 *  correct at those sites; hand-copying them into the page was not.
 *
 *  Every entry below is pinned to its token in heatmapTheme.test.ts, so
 *  retuning a token fails loudly instead of leaving the chart on a
 *  colour that is no longer real. */
export const CHART_COLORS = {
  /** --mac-shell-muted. Axis labels. */
  axis: '#B5A2AC',
  /** --mac-border-dark. Tooltip border and hover cursor fill. */
  border: '#453640',
  /** --mac-plum-raised. The .mt-soft card the chart sits on. */
  surface: '#31262E',
  /** --mac-plum-elevated. One step UP from the card, deliberately: a
   *  tooltip painted in the card's own colour reads as unpanelled
   *  floating text, since a --mac-border-dark edge between two identical
   *  greys is only 1.282:1. Going the other way, toward --mac-plum, is
   *  worse still at 1.145:1 -- the tooltip has to float above the card,
   *  not sink into the page behind it. This clears it by 1.525:1. */
  tooltipBackground: '#553F4E',
  /** --mac-shell. Tooltip text. */
  tooltipText: '#F7EFEA',
  /** --mac-accent-dashboard. Bar fill, and the top of the ramp above. */
  bar: '#C4B0E0',
} as const;

/** --mt-surface under the dark mood: the card the heatmap sits on. */
export const HEATMAP_SURFACE = CHART_COLORS.surface;
