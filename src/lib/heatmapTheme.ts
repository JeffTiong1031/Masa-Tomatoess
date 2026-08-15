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
