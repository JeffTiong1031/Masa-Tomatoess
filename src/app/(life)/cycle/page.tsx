import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const PREDICTED = new Set([6, 7, 8, 9, 10]);
const SYMPTOMS = ['Cramps', 'Headache', 'Tired', 'Bloating', 'Mood'];

export default function CyclePage() {
  return (
    <PageShell
      title="Period"
      subtitle="Cycle tracking, shared between both of us"
      accent="cycle"
    >
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            Next period
          </span>
          <SampleChip />
        </div>
        <div className="text-3xl font-semibold text-[var(--mt-text)]">
          In 6 days
        </div>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          Estimated from a 28-day cycle
        </p>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            This cycle
          </span>
          <SampleChip />
        </div>
        <div
          className="grid grid-cols-7 gap-1.5"
          role="grid"
          aria-label="Your 28-day cycle"
        >
          {DAYS.map((day) => {
            const isPredicted = PREDICTED.has(day);
            return (
              <div
                key={day}
                role="gridcell"
                aria-label={`Day ${day}${isPredicted ? ', predicted period day' : ''}`}
                className="flex aspect-square items-center justify-center rounded-lg text-xs text-[var(--mt-text)]"
                style={{
                  background: isPredicted
                    ? 'var(--mt-accent)'
                    : 'color-mix(in srgb, var(--mt-border) 60%, transparent)',
                  border: isPredicted ? '2px solid var(--mt-text-muted)' : 'none',
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
          Symptoms
        </div>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-[var(--mt-border)] px-3 py-1.5 text-sm text-[var(--mt-text-muted)]"
            >
              {s}
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled
          className="mt-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
        >
          Log period
        </button>
      </Card>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
