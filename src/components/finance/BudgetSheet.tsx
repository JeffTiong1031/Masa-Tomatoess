'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatLongDate } from '@/lib/dates';
import type { BudgetPeriodKind, BudgetPlan } from '@/lib/finance';
import { applyBudgetEdit, startNotes, type BudgetEdit } from '@/lib/financeBudget';
import { formatRM, inputToSen, senToInput } from '@/lib/financeMoney';
import AmountKeypad from './AmountKeypad';
import Segmented from './Segmented';

const PERIODS: { value: BudgetPeriodKind; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const NOUN: Record<BudgetPeriodKind, string> = { week: 'week', month: 'month' };

const field =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

export default function BudgetSheet({
  plan,
  today,
  onClose,
  onSave,
  onReset,
}: {
  plan: BudgetPlan | null;
  today: string;
  onClose: () => void;
  onSave: (edit: BudgetEdit, start: string) => Promise<string | null>;
  onReset: () => void;
}) {
  const start = plan?.next ?? plan;
  const [input, setInput] = useState(start === null ? '' : senToInput(start.amountSen));
  const [period, setPeriod] = useState<BudgetPeriodKind>(start?.period ?? 'week');
  const [startsOn, setStartsOn] = useState(today);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const amountSen = inputToSen(input);
  const preview =
    plan === null || amountSen === 0 ? null : applyBudgetEdit(plan, { amountSen, period }, today);

  const save = async () => {
    setBusy(true);
    setProblem(null);
    const failure = await onSave({ amountSen, period }, startsOn);
    setBusy(false);
    if (failure === null) onClose();
    else setProblem(failure);
  };

  return (
    <Modal open onClose={onClose} title="Budget" variant="sheet">
      <div className="grid gap-4">
        <Segmented label="Budget period" options={PERIODS} value={period} onChange={setPeriod} />
        <AmountKeypad value={input} onChange={setInput} />
        {plan === null ? (
          <>
            <label className="grid gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
                Starts on
              </span>
              <input
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
                className={field}
              />
            </label>
            {startsOn !== '' &&
              startNotes(period, startsOn, today).map((note) => (
                <p key={note} className="text-sm text-[var(--mt-text-muted)]">
                  {note}
                </p>
              ))}
          </>
        ) : null}
        {preview?.next && plan !== null ? (
          <p className="text-sm text-[var(--mt-text-muted)]">
            The {NOUN[preview.next.period]}ly budget starts {formatLongDate(preview.next.from)}.
            Until then this {NOUN[plan.period]} keeps {formatRM(plan.amountSen)}.
          </p>
        ) : null}
        {problem !== null && (
          <p role="alert" className="text-sm text-[var(--mt-danger)]">
            {problem}
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={amountSen === 0 || startsOn === '' || busy}
          className="min-h-12 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save budget'}
        </button>
        {plan !== null && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 justify-self-center px-4 text-sm font-semibold text-[var(--mt-danger)]"
          >
            Reset budget
          </button>
        )}
      </div>
    </Modal>
  );
}
