import { Pencil } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatLongDate } from '@/lib/dates';
import { budgetLines, budgetText, type BudgetBar as Bar, type BudgetTone } from '@/lib/financeBudget';
import { formatRM } from '@/lib/financeMoney';

const FILL: Record<BudgetTone, string> = {
  calm: 'var(--mt-budget-calm)',
  warning: 'var(--mt-budget-warn)',
  over: 'var(--mt-budget-over)',
};

const label = 'text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]';

export default function BudgetBar({ bar, onEdit }: { bar: Bar | null; onEdit: () => void }) {
  if (bar === null) {
    return (
      <Card>
        <div className={label}>Budget</div>
        <p className="mt-1 text-sm text-[var(--mt-text-muted)]">No budget yet.</p>
        <button
          type="button"
          onClick={onEdit}
          className="mt-3 min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
        >
          Set budget
        </button>
      </Card>
    );
  }

  const { period } = bar;
  const { headline, detail } = budgetLines(bar);
  const share = Math.min(bar.spentSen / period.amountSen, 1);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={label}>
            {formatLongDate(period.start)} – {formatLongDate(period.end)}
          </div>
          <div className="mt-1 text-sm text-[var(--mt-text-muted)]">
            {formatRM(bar.spentSen)} of {formatRM(period.amountSen)}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit budget"
          className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
        >
          <Pencil size={18} aria-hidden />
        </button>
      </div>
      <p className="mt-2" aria-label={budgetText(bar)}>
        <span className="block text-2xl font-semibold tabular-nums text-[var(--mt-text)]">
          {headline}
        </span>
        {detail !== null && (
          <span className="block text-sm text-[var(--mt-text)]">{detail}</span>
        )}
      </p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--mt-border)]" aria-hidden>
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${share * 100}%`, background: FILL[bar.tone] }}
        />
      </div>
      {bar.switchNote !== null && (
        <p className="mt-2 text-xs text-[var(--mt-text-muted)]">{bar.switchNote}</p>
      )}
    </Card>
  );
}
