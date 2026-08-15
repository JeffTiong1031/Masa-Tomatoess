import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const DAYS = [
  {
    label: 'Today',
    meals: [
      { time: '08:20', who: 'Jeff', what: 'Kaya toast and kopi' },
      { time: '13:05', who: 'Rachel', what: 'Chicken rice' },
    ],
  },
  {
    label: 'Yesterday',
    meals: [{ time: '19:40', who: 'Both', what: 'Hotpot' }],
  },
];

export default function MealsPage() {
  return (
    <PageShell title="Meals" subtitle="What we ate" accent="meals">
      {DAYS.map((day) => (
        <div key={day.label} className="mb-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
              {day.label}
            </span>
            <SampleChip />
          </div>
          <div className="flex flex-col gap-2">
            {day.meals.map((m) => (
              <Card key={`${day.label}-${m.time}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 shrink-0 rounded-xl"
                    style={{
                      background:
                        'color-mix(in srgb, var(--mt-accent) 45%, transparent)',
                    }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--mt-text)]">
                      {m.what}
                    </div>
                    <div className="text-xs text-[var(--mt-text-muted)]">
                      {m.time} · {m.who}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled
        className="mb-4 min-h-11 w-full rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] opacity-50"
      >
        Add meal
      </button>

      <ComingSoon note="Nothing here saves yet." />
    </PageShell>
  );
}
