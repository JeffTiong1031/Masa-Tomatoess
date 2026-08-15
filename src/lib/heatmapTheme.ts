/** Heatmap colours for react-activity-calendar under the light Study
 *  mood. Kept out of the page component so the ramp can be asserted in
 *  tests -- see heatmapTheme.test.ts.
 *
 *  IMPORTANT: element 0 is the EMPTY / no-activity level, not the
 *  lowest value. Treating it as a value is what made the first cream
 *  ramp unable to show five levels.
 *
 *  This ramp DARKENS as activity rises, where the old dark-mood ramp
 *  lightened. That inversion is the whole point: on a white card the
 *  eye reads "more ink" as "more", so the empty level has to be the
 *  palest swatch and the busiest day the deepest. Derived on the
 *  dashboard accent's own hue line at even L* steps of 15.5, which is
 *  what keeps the five levels looking like one colour deepening rather
 *  than five unrelated chips. */
export const HEATMAP_RAMP = [
  '#ECE6F4',
  '#C4B8D5',
  '#9D8CB6',
  '#776298',
  '#513A7B',
] as const;

/** Literal copies of light-mood tokens, for the props that consume a
 *  value before CSS custom properties resolve: react-activity-calendar's
 *  `theme` and Recharts' stroke / fill / contentStyle. Literals are
 *  correct at those sites; hand-copying them into the page was not.
 *
 *  Every entry below is pinned to its token in heatmapTheme.test.ts, so
 *  retuning a token fails loudly instead of leaving the chart on a
 *  colour that is no longer real. */
export const CHART_COLORS = {
  /** --mac-cocoa-muted. Axis labels. 5.34:1 on the white card. */
  axis: '#796763',
  /** --mac-border-light. Tooltip border and hover cursor fill. */
  border: '#F0E4DA',
  /** --mac-white. The .mt-soft card the chart sits on. */
  surface: '#FFFFFF',
  /** --mac-cocoa. The tooltip inverts against the card rather than
   *  floating a paler panel on a pale surface: under the dark mood the
   *  tooltip had to be LIGHTER than the card to separate at all, and
   *  the mirror of that here is to go dark. 13.04:1 against the card,
   *  so the edge needs no help from the border. */
  tooltipBackground: '#3B2E2A',
  /** --mac-cream. Tooltip text, 12.36:1 on the fill above. */
  tooltipText: '#FDF8F3',
  /** --mac-chart-lilac. Bar fill, and the top of the ramp above. */
  bar: '#513A7B',
} as const;

/** --mt-surface under the light mood: the card the heatmap sits on. */
export const HEATMAP_SURFACE = CHART_COLORS.surface;
