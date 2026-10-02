'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatLongDate } from '@/lib/dates';
import type { BudgetPeriodKind, BudgetPlan } from '@/lib/finance';
import { applyBudgetEdit } from '@/lib/financeBudget';
import { formatRM, inputToSen, senToInput } from '@/lib/financeMoney';
import AmountKeypad from './AmountKeypad';
import Segmented from './Segmented';

const PERIODS: { value: BudgetPeriodKind; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const NOUN: Record<BudgetPeriodKind, string> = { week: 'week', month: 'month' };

export default function BudgetSheet({
  plan,
  today,
  onClose,
  onSave,
}: {
  plan: BudgetPlan | null;
  today: string;
  onClose: () => void;
  onSave: (amountSen: number, period: BudgetPeriodKind) => Promise<string | null>;
}) {
  const start = plan?.next ?? plan;
  const [input, setInput] = useState(start === null ? '' : senToInput(start.amountSen));
  const [period, setPeriod] = useState<BudgetPeriodKind>(start?.period ?? 'week');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const amountSen = inputToSen(input);
  const preview =
    plan === null || amountSen === 0 ? null : applyBudgetEdit(plan, { amountSen, period }, today);

  const save = async () => {
    setBusy(true);
    setProblem(null);
    const failure = await onSave(amountSen, period);
    setBusy(false);
    if (failure === null) onClose();
    else setProblem(failure);
  };

  return (
    <Modal open onClose={onClose} title="Budget" variant="sheet">
      <div className="grid gap-4">
        <Segmented label="Budget period" options={PERIODS} value={period} onChange={setPeriod} />
        <AmountKeypad value={input} onChange={setInput} />
        {preview?.next && plan !== null ? (
          <p className="text-sm text-[var(--mt-text-muted)]">
            The {NOUN[preview.next.period]}ly budget starts {formatLongDate(preview.next.from)}.
            Until then this {NOUN[plan.period]} keeps {formatRM(plan.amountSen)}.
          </p>
        ) : null}
        {plan === null ? (
          <p className="text-sm text-[var(--mt-text-muted)]">
            Your first {NOUN[period]} starts today.
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
          disabled={amountSen === 0 || busy}
          className="min-h-12 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save budget'}
        </button>
      </div>
    </Modal>
  );
}
