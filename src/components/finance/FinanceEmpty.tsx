import Card from '@/components/ui/Card';

export default function FinanceEmpty({
  onCategories,
  onBudget,
}: {
  onCategories: () => void;
  onBudget: () => void;
}) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-[var(--mt-text)]">Let&apos;s get started</h2>
      <p className="mt-2 text-sm text-[var(--mt-text-muted)]">
        Start by adding a few categories, like Food or Transport, and setting a budget.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCategories}
          className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
        >
          Add categories
        </button>
        <button
          type="button"
          onClick={onBudget}
          className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
        >
          Set budget
        </button>
      </div>
    </Card>
  );
}
