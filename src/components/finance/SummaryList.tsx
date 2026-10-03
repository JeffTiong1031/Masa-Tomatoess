import { formatRM } from '@/lib/financeMoney';
import type { MonthSummary } from '@/lib/financeViews';

export default function SummaryList({ summary }: { summary: MonthSummary }) {
  return (
    <div className="mt-soft grid gap-4 p-5">
      {summary.rows.length === 0 ? (
        <p className="text-sm text-[var(--mt-text-muted)]">No spending this month.</p>
      ) : (
        <ul className="grid gap-3">
          {summary.rows.map((row) => (
            <li key={row.categoryId}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate text-[var(--mt-text)]">{row.name}</span>
                <span className="tabular-nums text-[var(--mt-text)]">
                  {formatRM(row.spentSen)}
                  <span className="ml-2 text-[var(--mt-text-muted)]">{row.percent}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mt-border)]" aria-hidden>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${row.percent}%`, background: 'var(--mt-budget-calm)' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid gap-1 border-t border-[var(--mt-border)] pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--mt-text-muted)]">Total spent</dt>
          <dd className="font-semibold tabular-nums text-[var(--mt-text)]">
            {formatRM(summary.totalSpentSen)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--mt-text-muted)]">Total income</dt>
          <dd className="font-semibold tabular-nums text-[var(--mt-text)]">
            {formatRM(summary.totalIncomeSen)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
