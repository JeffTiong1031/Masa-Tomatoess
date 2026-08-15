import { Fragment } from 'react';
import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

/** Demonstration only. Two columns so the shared, two-person shape of
 *  this page is obvious before any of it works. */
const PLAN = [
  { time: '09:00', jeff: 'Lectures', rachel: 'Library' },
  { time: '12:30', jeff: 'Lunch together', rachel: 'Lunch together' },
  { time: '14:00', jeff: 'Lab session', rachel: 'Tutorial' },
  { time: '19:00', jeff: 'Gym', rachel: 'Free' },
];

export default function TimetablePage() {
  return (
    <PageShell
      title="Timetable"
      subtitle="What we're each doing tomorrow"
      accent="timetable"
    >
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-[var(--mt-text)]">
            Tomorrow
          </div>
          <SampleChip />
        </div>

        <div className="grid grid-cols-[3.5rem_1fr_1fr] gap-x-3 gap-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
            Time
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
            Jeff
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
            Rachel
          </div>

          {PLAN.map((row) => (
            <Fragment key={row.time}>
              <div className="text-xs text-[var(--mt-text-muted)]">
                {row.time}
              </div>
              <div className="text-sm text-[var(--mt-text)]">{row.jeff}</div>
              <div className="text-sm text-[var(--mt-text)]">{row.rachel}</div>
            </Fragment>
          ))}
        </div>
      </Card>

      <button
        type="button"
        disabled
        className="mt-4 mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Add to tomorrow
      </button>

      <ComingSoon note="Nothing here saves or syncs yet." />
    </PageShell>
  );
}
