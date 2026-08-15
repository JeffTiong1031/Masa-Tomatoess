import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const EVENTS = [
  { name: 'Our anniversary', when: '12 Sep 2026', days: 28 },
  { name: "Rachel's birthday", when: '3 Nov 2026', days: 80 },
  { name: 'Semester starts', when: '5 Jan 2027', days: 143 },
];

export default function CountdownPage() {
  return (
    <PageShell
      title="Countdown"
      subtitle="Dates we're counting down to"
      accent="countdown"
    >
      <div className="mb-4 flex flex-col gap-3">
        {EVENTS.map((e) => (
          <Card key={e.name}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-[var(--mt-text)]">
                  {e.name}
                </div>
                <div className="mt-0.5 text-sm text-[var(--mt-text-muted)]">
                  {e.when}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-semibold text-[var(--mt-text)]">
                  {e.days}
                </div>
                <div className="text-xs text-[var(--mt-text-subtle)]">days</div>
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
        Add date
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
