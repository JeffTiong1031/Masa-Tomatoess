import { CalendarDays, Gauge, Pencil, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatLongDate } from '@/lib/dates';
import {
  budgetTank,
  budgetText,
  type BudgetTone,
  type BudgetView,
} from '@/lib/financeBudget';

const WATER: Record<BudgetTone, string> = {
  calm: 'var(--mt-budget-water-calm)',
  warning: 'var(--mt-budget-water-warn)',
  over: 'var(--mt-budget-water-over)',
};

const STAT_ICONS = [Wallet, CalendarDays, Gauge] as const;

const WAVE_PATH =
  'M0 20 Q100 0 200 20 T400 20 T600 20 T800 20 T1000 20 T1200 20 T1400 20 T1600 20 V40 H0 Z';

const BUBBLES = [
  { left: '20%', top: '2.5rem', size: 8, delay: '0s' },
  { left: '60%', top: '5rem', size: 12, delay: '1s' },
  { left: '85%', top: '1.25rem', size: 6, delay: '0.5s' },
  { left: '40%', top: '8rem', size: 10, delay: '2s' },
];

const label = 'text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]';

function Wave({
  className,
  seconds,
  reverse,
}: {
  className: string;
  seconds: number;
  reverse: boolean;
}) {
  return (
    <svg
      viewBox="0 0 1600 40"
      preserveAspectRatio="none"
      className={`mt-wave absolute bottom-full left-0 w-[200%] fill-current ${className}`}
      style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
    >
      <path d={WAVE_PATH} />
    </svg>
  );
}

function Water({ level, color }: { level: number; color: string }) {
  return (
    <div
      aria-hidden
      className="mt-water absolute inset-x-0 bottom-0 -z-10 bg-current"
      style={{ height: `${level * 100}%`, color }}
    >
      <Wave className="h-7 opacity-50" seconds={14} reverse />
      <Wave className="h-5" seconds={9} reverse={false} />
      {BUBBLES.map((bubble) => (
        <span
          key={bubble.left}
          className="mt-bubble absolute rounded-full bg-[var(--mt-surface)]"
          style={{
            left: bubble.left,
            top: bubble.top,
            width: bubble.size,
            height: bubble.size,
            animationDelay: bubble.delay,
          }}
        />
      ))}
    </div>
  );
}

function EditButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label="Edit budget"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] text-[var(--mt-text-muted)] shadow-sm"
    >
      <Pencil size={18} aria-hidden />
    </button>
  );
}

export default function BudgetBar({ view, onEdit }: { view: BudgetView; onEdit: () => void }) {
  if (view.kind === 'none') {
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

  if (view.kind === 'pending') {
    return (
      <Card className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <div className={label}>Budget</div>
          <p className="mt-1 text-sm text-[var(--mt-text-muted)]">{view.note}</p>
        </div>
        <EditButton onEdit={onEdit} />
      </Card>
    );
  }

  const { bar } = view;
  const tank = budgetTank(bar);

  return (
    <div className="mt-soft relative isolate grid min-h-72 content-between gap-4 overflow-hidden p-4 sm:p-5">
      {tank.level > 0 && <Water level={tank.level} color={WATER[bar.tone]} />}

      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="mt-glass justify-self-start rounded-2xl p-4">
          <div className={label}>
            {formatLongDate(bar.period.start)} – {formatLongDate(bar.period.end)}
          </div>
          <p className="mt-1" aria-label={budgetText(bar)}>
            <span className="block text-4xl font-semibold tabular-nums text-[var(--mt-text)]">
              {tank.amount}
            </span>
            <span className="block text-sm text-[var(--mt-text-muted)]">{tank.caption}</span>
          </p>
          {bar.switchNote !== null && (
            <p className="mt-2 text-xs text-[var(--mt-text-muted)]">{bar.switchNote}</p>
          )}
        </div>
        <EditButton onEdit={onEdit} />
      </div>

      <dl className="mt-glass grid grid-cols-3 divide-x divide-[var(--mt-border)] rounded-2xl">
        {tank.stats.map((stat, index) => {
          const Icon = STAT_ICONS[index];
          return (
            <div
              key={stat.label}
              className="flex min-w-0 flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--mt-accent)] text-[var(--mt-accent-ink)]">
                <Icon size={16} aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt-text-muted)]">
                  {stat.label}
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-[var(--mt-text)]">
                  {stat.value}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
