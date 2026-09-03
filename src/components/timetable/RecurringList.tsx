import { Plus, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import { swatchToken } from '@/lib/categories';
import { WEEKDAYS_SHORT } from '@/lib/dates';
import { sortRules, type TimetableRule } from '@/lib/timetableRule';

export default function RecurringList({
  rules,
  isMine,
  onAdd,
  onEdit,
  onClearAll,
}: {
  rules: TimetableRule[];
  isMine: boolean;
  onAdd: () => void;
  onEdit: (rule: TimetableRule) => void;
  onClearAll: () => void;
}) {
  return (
    <Card className="mb-4">
      <div className="mb-1 flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--mt-text)]">
          Recurring events
        </h2>
        {isMine && rules.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--mt-danger)] hover:bg-[color-mix(in_srgb,var(--mt-danger)_8%,transparent)]"
          >
            <Trash2 size={16} aria-hidden />
            Clear all
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-[var(--mt-text-muted)]">
        These repeat every week until you delete them.
      </p>

      {rules.length === 0 ? (
        <p className="text-sm text-[var(--mt-text-muted)]">
          No classes yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {sortRules(rules).map((rule) => (
            <li key={rule.id}>
              <button
                type="button"
                disabled={!isMine}
                onClick={() => onEdit(rule)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm text-[var(--mt-text)] enabled:hover:bg-[color-mix(in_srgb,var(--mt-text)_5%,transparent)] disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: `var(${swatchToken(rule.swatch)})` }}
                />
                <span className="w-9 shrink-0 text-xs text-[var(--mt-text-subtle)]">
                  {WEEKDAYS_SHORT[rule.weekday]}
                </span>
                <span className="w-24 shrink-0 text-xs text-[var(--mt-text-subtle)]">
                  {rule.startTime}–{rule.endTime}
                </span>
                <span className="truncate">{rule.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isMine && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--mt-border)] text-sm font-semibold text-[var(--mt-text-muted)]"
        >
          <Plus size={16} aria-hidden />
          Add recurring event
        </button>
      )}
    </Card>
  );
}
