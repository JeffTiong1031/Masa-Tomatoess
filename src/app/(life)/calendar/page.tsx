import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Demonstration only. Spec 8: Calendar holds events that happen ON a
 *  date; Countdown holds milestones you count TOWARD. */
const EVENTS = [
  { when: 'Today, 7:30 pm', what: 'Dinner with Rachel' },
  { when: 'Thu, 10:00 am', what: 'Dentist' },
  { when: 'Sat, all day', what: 'Trip to Penang' },
];

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      subtitle="What's happening, and when"
      accent="calendar"
    >
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-[var(--mt-text)]">
            August 2026
          </div>
          <SampleChip />
        </div>
        <div className="grid grid-cols-7 gap-1" role="presentation">
          {DAYS.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="pb-1 text-center text-[10px] font-semibold uppercase text-[var(--mt-text-subtle)]"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className="flex aspect-square items-center justify-center rounded-lg border border-[var(--mt-border)] text-xs text-[var(--mt-text-muted)]"
            >
              {n <= 31 ? n : ''}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 mb-4 flex flex-col gap-3">
        {EVENTS.map((e) => (
          <Card key={e.what}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-[var(--mt-text)]">
                  {e.what}
                </div>
                <div className="mt-0.5 text-sm text-[var(--mt-text-muted)]">
                  {e.when}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <SampleChip />
            </div>
          </Card>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Add event
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
