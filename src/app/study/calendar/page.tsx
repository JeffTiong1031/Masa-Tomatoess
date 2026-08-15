import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** 1 August 2026 is a Saturday, and DAYS starts on Monday, so the month
 *  opens five cells in. Weekday alignment is the one thing a calendar
 *  mock exists to convey -- starting day 1 under "M" makes it wrong at a
 *  glance. Six rows of seven hold a 31-day month at this offset. */
const LEADING_BLANKS = 5;
const DAYS_IN_MONTH = 31;
const GRID_CELLS = 42;

const CELLS: (number | null)[] = Array.from({ length: GRID_CELLS }, (_, i) => {
  const day = i - LEADING_BLANKS + 1;
  return day >= 1 && day <= DAYS_IN_MONTH ? day : null;
});

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
          {CELLS.map((day, i) =>
            day === null ? (
              <div key={`blank-${i}`} className="aspect-square" aria-hidden />
            ) : (
              <div
                key={day}
                className="flex aspect-square items-center justify-center rounded-lg border border-[var(--mt-border)] text-xs text-[var(--mt-text-muted)]"
              >
                {day}
              </div>
            ),
          )}
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
