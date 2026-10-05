'use client';

import type { HandEntry } from '@/lib/finance';
import { formatRM } from '@/lib/financeMoney';
import type { DayGroup } from '@/lib/financeViews';
import EntryRow from './EntryRow';

function incomeText(sen: number): string {
  return `${sen > 0 ? '+' : ''}${formatRM(sen)} in`;
}

export default function DailyList({
  groups,
  emptyText,
  names,
  fills,
  onEdit,
  onDelete,
}: {
  groups: DayGroup[];
  emptyText: string;
  names: Map<string, string>;
  fills: Map<string, string>;
  onEdit: (entry: HandEntry) => void;
  onDelete: (entry: HandEntry) => void;
}) {
  if (groups.length === 0) {
    return <p className="mt-soft p-5 text-sm text-[var(--mt-text-muted)]">{emptyText}</p>;
  }

  return (
    <div className="grid gap-3">
      {groups.map((group) => (
        <section key={group.date} className="mt-soft overflow-hidden py-1" aria-label={group.label}>
          <header className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--mt-text-muted)]">
              {group.label}
            </h3>
            <div className="text-right text-sm font-semibold tabular-nums text-[var(--mt-text)]">
              {formatRM(group.spentSen)}
              {group.incomeSen !== 0 && (
                <span className="ml-2 text-xs font-normal text-[var(--mt-text-muted)]">
                  {incomeText(group.incomeSen)}
                </span>
              )}
            </div>
          </header>
          <ul className="divide-y divide-[var(--mt-border)]">
            {group.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                categoryName={names.get(entry.categoryId)!}
                fill={fills.get(entry.categoryId)!}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
