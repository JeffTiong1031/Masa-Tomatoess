import type { Confidence, Headline, Phase } from '@/lib/cycle';
import { PHASE_LABELS, PHASE_VAR, TINT, phaseFill } from '@/lib/cycleColors';
import { formatLongDate } from '@/lib/dates';
import { RING_CENTER, RING_RADIUS, ringArcs, ringPoint } from '@/lib/cycleRing';

const LEGEND_ORDER: Phase[] = ['menstrual', 'fertile', 'luteal', 'follicular'];

function headlineParts(headline: Headline): { value: string; unit: string } {
  switch (headline.kind) {
    case 'no-data':
      return { value: '—', unit: 'no history yet' };
    case 'period-day':
      return { value: `Day ${headline.day}`, unit: 'of your period' };
    case 'upcoming':
      return {
        value: `${headline.days}`,
        unit: headline.days === 1 ? 'day to period' : 'days to period',
      };
    case 'due-today':
      return { value: 'Today', unit: 'period expected' };
    case 'late':
      return {
        value: `${headline.days}`,
        unit: headline.days === 1 ? 'day late' : 'days late',
      };
  }
}

function confidenceNote(confidence: Confidence): string | null {
  switch (confidence) {
    case 'none':
      return null;
    case 'default':
      return 'Using a 28-day guess until there is more history.';
    case 'thin':
      return 'Based on one recorded cycle so far.';
    case 'learned':
      return null;
  }
}

export default function CycleRing({
  cycleLength,
  periodLength,
  dayOfCycle,
  phase,
  headline,
  nextStart,
  confidence,
}: {
  cycleLength: number;
  periodLength: number;
  dayOfCycle: number;
  phase: Phase;
  headline: Headline;
  nextStart: string;
  confidence: Confidence;
}) {
  const arcs = ringArcs(cycleLength, periodLength);
  const marker = ringPoint(Math.min(dayOfCycle, cycleLength), cycleLength);
  const { value, unit } = headlineParts(headline);
  const note = confidenceNote(confidence);

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[280px]">
        <svg viewBox="0 0 220 220" className="w-full" aria-hidden>
          <circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--mt-border)"
            strokeWidth="17"
          />
          {arcs.map((arc) => (
            <path
              key={arc.phase + arc.startDay}
              d={arc.d}
              fill="none"
              stroke={PHASE_VAR[arc.phase]}
              strokeWidth="17"
              strokeLinecap="round"
            />
          ))}
          <g transform={`translate(${marker.x} ${marker.y})`}>
            <circle
              r="13"
              fill="var(--mt-surface)"
              stroke="var(--mt-text)"
              strokeWidth="2.5"
            />
            <path
              d="M0 -5.2 c-2.6 -3.4 -7.4 -1.2 -7.4 2.6 c0 3.6 4.6 6.6 7.4 9 c2.8 -2.4 7.4 -5.4 7.4 -9 c0 -3.8 -4.8 -6 -7.4 -2.6 z"
              fill={PHASE_VAR.menstrual}
            />
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            {PHASE_LABELS[phase]}
          </span>
          <span className="mt-1 text-4xl font-semibold leading-none text-[var(--mt-text)]">
            {value}
          </span>
          <span className="mt-1.5 text-xs text-[var(--mt-text-muted)]">
            {unit}
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-[var(--mt-text-muted)]">
        {headline.kind === 'late'
          ? `Day ${dayOfCycle} · was expected ${formatLongDate(nextStart)}`
          : `Day ${dayOfCycle} of ${cycleLength} · expected ${formatLongDate(nextStart)}`}
      </p>
      {note && (
        <p className="mt-1 text-center text-xs text-[var(--mt-text-subtle)]">
          {note}
        </p>
      )}

      <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {LEGEND_ORDER.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-xs text-[var(--mt-text)]"
          >
            <span
              className="h-2.5 w-5 rounded-full"
              style={{ background: phaseFill(item, TINT.period) }}
              aria-hidden
            />
            {PHASE_LABELS[item]}
          </li>
        ))}
      </ul>
    </div>
  );
}
