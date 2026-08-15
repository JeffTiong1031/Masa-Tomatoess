import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import StatTile from '@/components/ui/StatTile';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const WEEK = [
  { day: 'Mon', active: true },
  { day: 'Tue', active: false },
  { day: 'Wed', active: true },
  { day: 'Thu', active: true },
  { day: 'Fri', active: false },
  { day: 'Sat', active: true },
  { day: 'Sun', active: false },
];

export default function FitnessPage() {
  return (
    <PageShell title="Fitness" subtitle="Moving this week" accent="fitness">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatTile label="Workouts" value="4" hint="this week" accent="fitness" />
        <StatTile label="Minutes" value="185" hint="this week" accent="fitness" />
      </div>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            This week
          </span>
          <SampleChip />
        </div>
        <ul
          className="grid grid-cols-7 gap-1.5"
          aria-label="Workout activity for this week"
        >
          {WEEK.map(({ day, active }) => (
            <li
              key={day}
              className="flex flex-col items-center gap-1.5"
              aria-label={`${day}: ${active ? 'worked out' : 'rest day'}`}
            >
              <div
                className="flex aspect-square w-full items-center justify-center rounded-lg text-[11px] font-semibold"
                style={{
                  background: active
                    ? 'var(--mt-accent)'
                    : 'color-mix(in srgb, var(--mt-border) 60%, transparent)',
                  color: 'var(--mt-accent-contrast)',
                  // Second, non-colour affordance so the distinction survives
                  // greyscale and colour-blind vision.
                  boxShadow: active
                    ? 'inset 0 0 0 2px var(--mt-text)'
                    : undefined,
                }}
                aria-hidden
              >
                {active ? '✓' : ''}
              </div>
              <span className="text-[10px] text-[var(--mt-text-muted)]" aria-hidden>
                {day}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <button
        type="button"
        disabled
        className="mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Log workout
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
