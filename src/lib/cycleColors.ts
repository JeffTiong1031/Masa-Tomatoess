import type { Phase } from './cycle';

export const PHASE_VAR: Record<Phase, string> = {
  menstrual: 'var(--mt-phase-menstrual)',
  follicular: 'var(--mt-phase-follicular)',
  fertile: 'var(--mt-phase-fertile)',
  luteal: 'var(--mt-phase-luteal)',
};

export const PHASE_LABELS: Record<Phase, string> = {
  menstrual: 'Period',
  follicular: 'Follicular',
  fertile: 'Fertile window',
  luteal: 'Luteal',
};

export const TINT = {
  period: 78,
  phase: 26,
  predicted: 18,
  outOfMonth: 12,
} as const;

export function phaseFill(phase: Phase, percent: number): string {
  return `color-mix(in srgb, ${PHASE_VAR[phase]} ${percent}%, var(--mt-surface))`;
}
