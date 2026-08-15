import PageShell from '@/components/ui/PageShell';
import Card from '@/components/ui/Card';
import ComingSoon, { SampleChip } from '@/components/ui/ComingSoon';

const CATEGORIES = [
  { name: 'Food', amount: 420, share: 0.42 },
  { name: 'Transport', amount: 180, share: 0.18 },
  { name: 'Study', amount: 150, share: 0.15 },
  { name: 'Fun', amount: 250, share: 0.25 },
];

const RECENT = [
  { what: 'Groceries', who: 'Jeff', amount: 62.4 },
  { what: 'Cinema', who: 'Rachel', amount: 38.0 },
  { what: 'Petrol', who: 'Jeff', amount: 90.0 },
];

export default function FinancePage() {
  return (
    <PageShell title="Finance" subtitle="Where the money went" accent="finance">
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            This month
          </span>
          <SampleChip />
        </div>
        <div className="text-3xl font-semibold text-[var(--mt-text)]">
          RM 1,000
        </div>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">
          of a RM 1,500 budget
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--mt-border)]">
          <div
            className="h-full rounded-full"
            style={{ width: '67%', background: 'var(--mt-accent)' }}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            By category
          </span>
          <SampleChip />
        </div>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => (
            <div key={c.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--mt-text)]">{c.name}</span>
                <span className="text-[var(--mt-text-muted)]">
                  RM {c.amount}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mt-border)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.share * 100}%`,
                    background: 'var(--mt-accent)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            Recent
          </span>
          <SampleChip />
        </div>
        <div className="flex flex-col gap-2.5">
          {RECENT.map((r) => (
            <div key={r.what} className="flex justify-between text-sm">
              <div>
                <div className="text-[var(--mt-text)]">{r.what}</div>
                <div className="text-xs text-[var(--mt-text-muted)]">{r.who}</div>
              </div>
              <span className="text-[var(--mt-text)]">
                RM {r.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <ComingSoon note="Nothing here saves yet. Every figure above is invented." />
    </PageShell>
  );
}
