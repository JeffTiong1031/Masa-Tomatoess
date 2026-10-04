'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useHasMounted } from '@/hooks/useHasMounted';
import { formatMonthYear, malaysiaDate, monthOf, msUntilNextMalaysiaMidnight } from '@/lib/dates';
import type {
  Category,
  Entry,
  EntryDraft,
  EntryKind,
  HandEntry,
  Template,
} from '@/lib/finance';
import {
  allSavingRecalcs,
  applyBudgetEdit,
  budgetView,
  foldPlan,
  missingSavings,
  resetNote,
  savedSoFar,
  savingRecalcs,
  startPlan,
  withSavingUpdates,
  type BudgetEdit,
} from '@/lib/financeBudget';
import { monthSpan } from '@/lib/financeMonths';
import {
  archiveCategory,
  deleteEntry,
  deleteTemplate,
  ensureSaving,
  insertCategory,
  insertEntry,
  insertSavings,
  insertTemplate,
  loadFinance,
  renameCategory,
  resetBudget,
  restoreCategory,
  restoreEntry,
  saveBudget,
  updateEntry,
  updateSavingAmounts,
  type CategoryWrite,
  type FinanceData,
} from '@/lib/financeRepo';
import {
  categoriesByUse,
  dailyGroups,
  liveTemplates,
  monthSummary,
} from '@/lib/financeViews';
import { isUserName, type UserName } from '@/lib/identity';
import AddSheet from './AddSheet';
import BudgetBar from './BudgetBar';
import BudgetSheet from './BudgetSheet';
import CategorySheet from './CategorySheet';
import DailyList from './DailyList';
import FinanceEmpty from './FinanceEmpty';
import FinanceSetupMissing from './FinanceSetupMissing';
import MonthPicker from './MonthPicker';
import Segmented from './Segmented';
import SummaryList from './SummaryList';
import UndoBar from './UndoBar';

type Status = 'loading' | 'ok' | 'missing-table' | 'error';

type View = 'daily' | 'summary';

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; entry: HandEntry }
  | { kind: 'budget' }
  | { kind: 'reset' }
  | { kind: 'categories' }
  | { kind: 'archive'; category: Category };

type Settlement = 'unchanged' | 'changed' | 'failed';

const EMPTY: FinanceData = { categories: [], entries: [], templates: [], plan: null };

const VIEWS: { value: View; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'summary', label: 'Summary' },
];

const UNDO_MS = 5000;
const MIDNIGHT_SLACK_MS = 1000;
const OFFLINE = 'Could not reach the database. Check your connection and try again.';

function signedInName(): UserName {
  const stored = localStorage.getItem('user_name');
  return isUserName(stored) ? stored : 'Jeff';
}

async function settle(owner: UserName, data: FinanceData, today: string): Promise<Settlement> {
  let changed = false;
  if (data.plan !== null) {
    const missing = missingSavings(data.plan, data.entries, today);
    if (missing.length > 0) {
      const saving = data.categories.find((category) => category.system === 'saving')!;
      if (!(await insertSavings(owner, saving.id, missing))) return 'failed';
      changed = true;
    }
    const folded = foldPlan(data.plan, today);
    if (folded !== data.plan) {
      if (!(await saveBudget(owner, folded))) return 'failed';
      changed = true;
    }
  }
  const updates = allSavingRecalcs(data.entries);
  if (updates.length > 0) {
    if (!(await updateSavingAmounts(owner, updates))) return 'failed';
    changed = true;
  }
  return changed ? 'changed' : 'unchanged';
}

export default function FinanceBoard() {
  const mounted = useHasMounted();
  const [owner, setOwner] = useState<UserName>('Jeff');
  const [today, setToday] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<FinanceData>(EMPTY);
  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const [view, setView] = useState<View>('daily');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [undo, setUndo] = useState<HandEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (who: UserName, day: string) => {
    const made = await ensureSaving(who);
    if (made === 'missing-table') {
      setStatus('missing-table');
      return;
    }
    if (!made) {
      setStatus('error');
      return;
    }
    let result = await loadFinance(who);
    if (result.status !== 'ok') {
      setStatus(result.status);
      return;
    }
    const outcome = await settle(who, result.data, day);
    if (outcome === 'changed') {
      const again = await loadFinance(who);
      if (again.status === 'ok') result = again;
    }
    setData(result.data);
    setStatus('ok');
    setNotice(
      outcome === 'failed'
        ? 'Could not close the last budget period. It will try again next time.'
        : null,
    );
  }, []);

  useEffect(() => {
    if (!mounted) return;
    queueMicrotask(() => {
      const who = signedInName();
      const day = malaysiaDate();
      setOwner(who);
      setToday(day);
      load(who, day);
    });
  }, [mounted, load]);

  useEffect(() => {
    if (today === '') return;
    const timer = window.setTimeout(() => {
      const day = malaysiaDate();
      setToday(day);
      load(owner, day);
    }, msUntilNextMalaysiaMidnight() + MIDNIGHT_SLACK_MS);
    return () => window.clearTimeout(timer);
  }, [today, owner, load]);

  useEffect(() => {
    if (undo === null) return;
    const timer = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const names = useMemo(
    () => new Map(data.categories.map((category) => [category.id, category.name])),
    [data.categories],
  );

  const recalcAfter = async (entries: Entry[], dates: string[]) => {
    const updates = savingRecalcs(entries, dates);
    setData((current) => ({ ...current, entries: withSavingUpdates(entries, updates) }));
    if (updates.length > 0 && !(await updateSavingAmounts(owner, updates))) {
      setNotice('A closed budget period could not be updated. It will try again next time.');
    }
  };

  const saveDraft = async (draft: EntryDraft): Promise<boolean> => {
    if (dialog?.kind === 'edit') {
      const before = dialog.entry;
      const saved = await updateEntry(owner, before.id, draft);
      if (saved === null) return false;
      const entries = data.entries.map((entry) => (entry.id === before.id ? saved : entry));
      await recalcAfter(entries, [before.date, saved.date]);
      return true;
    }
    const saved = await insertEntry(owner, draft);
    if (saved === null) return false;
    await recalcAfter([...data.entries, saved], [saved.date]);
    return true;
  };

  const addFromTemplate = (template: Template, date: string) =>
    saveDraft({
      kind: template.kind,
      amountSen: template.amountSen,
      categoryId: template.categoryId,
      date,
      note: template.label,
    });

  const removeEntry = async (entry: HandEntry) => {
    setDialog(null);
    const remaining = data.entries.filter((candidate) => candidate.id !== entry.id);
    setData((current) => ({ ...current, entries: remaining }));
    if (!(await deleteEntry(owner, entry.id))) {
      setData((current) => ({ ...current, entries: [...current.entries, entry] }));
      setNotice('Could not delete that entry. Check your connection.');
      return;
    }
    setUndo(entry);
    await recalcAfter(remaining, [entry.date]);
  };

  const undoDelete = async () => {
    if (undo === null) return;
    const entry = undo;
    setUndo(null);
    if (!(await restoreEntry(owner, entry))) {
      setNotice('Could not put that entry back. Check your connection.');
      return;
    }
    await recalcAfter([...data.entries, entry], [entry.date]);
  };

  const keepCategory = (result: CategoryWrite): CategoryWrite => {
    if (result.status === 'ok') {
      const saved = result.category;
      setData((current) => ({
        ...current,
        categories: current.categories.some((c) => c.id === saved.id)
          ? current.categories.map((c) => (c.id === saved.id ? saved : c))
          : [...current.categories, saved],
      }));
    }
    return result;
  };

  const addCategory = async (kind: EntryKind, name: string) =>
    keepCategory(await insertCategory(owner, kind, name));

  const archive = async (category: Category) => {
    const result = keepCategory(await archiveCategory(owner, category.id));
    if (result.status !== 'ok') setNotice('Could not delete that category. Check your connection.');
    setDialog({ kind: 'categories' });
  };

  const addTemplate = async (template: Omit<Template, 'id'>) => {
    const saved = await insertTemplate(owner, template);
    if (saved === null) return false;
    setData((current) => ({ ...current, templates: [...current.templates, saved] }));
    return true;
  };

  const removeTemplate = async (template: Template) => {
    setData((current) => ({
      ...current,
      templates: current.templates.filter((t) => t.id !== template.id),
    }));
    if (!(await deleteTemplate(owner, template.id))) {
      setData((current) => ({ ...current, templates: [...current.templates, template] }));
      setNotice('Could not delete that quick add. Check your connection.');
    }
  };

  const saveBudgetEdit = async (edit: BudgetEdit, start: string): Promise<string | null> => {
    const fresh = await loadFinance(owner);
    if (fresh.status !== 'ok') return OFFLINE;
    if ((await settle(owner, fresh.data, today)) === 'failed') {
      return 'Could not close the last budget period first, so the budget was not changed. Check your connection.';
    }
    const plan =
      fresh.data.plan === null
        ? startPlan(edit, start)
        : applyBudgetEdit(fresh.data.plan, edit, today);
    if (!(await saveBudget(owner, plan))) return OFFLINE;
    await load(owner, today);
    return null;
  };

  const clearBudget = async () => {
    setDialog(null);
    const cleared = await resetBudget(owner);
    await load(owner, today);
    if (!cleared) setNotice('Could not reset the budget. Check your connection and try again.');
  };

  if (!mounted) return null;

  if (status === 'missing-table') return <FinanceSetupMissing />;

  if (status === 'loading') {
    return <p className="text-sm text-[var(--mt-text-muted)]">Loading…</p>;
  }

  if (status === 'error') {
    return <p className="text-sm text-[var(--mt-danger)]">{OFFLINE}</p>;
  }

  const month = chosenMonth ?? monthOf(today);
  const fresh = data.plan === null && !data.categories.some((c) => c.system === null);

  return (
    <div className="grid gap-4 pb-24">
      {notice !== null && (
        <p role="status" className="text-sm text-[var(--mt-danger)]">
          {notice}
        </p>
      )}

      {fresh ? (
        <FinanceEmpty
          onCategories={() => setDialog({ kind: 'categories' })}
          onBudget={() => setDialog({ kind: 'budget' })}
        />
      ) : (
        <>
          <BudgetBar
            view={budgetView(data.plan, data.entries, today)}
            onEdit={() => setDialog({ kind: 'budget' })}
          />
          <MonthPicker
            month={month}
            span={monthSpan(data.entries, today)}
            onChange={setChosenMonth}
          />
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <Segmented label="View" options={VIEWS} value={view} onChange={setView} />
            <button
              type="button"
              onClick={() => setDialog({ kind: 'categories' })}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] px-4 text-sm font-semibold text-[var(--mt-text)]"
            >
              <Tags size={16} aria-hidden />
              Categories
            </button>
          </div>
          {view === 'daily' ? (
            <DailyList
              groups={dailyGroups(data.entries, month, today)}
              emptyText={`Nothing logged in ${formatMonthYear(month)}.`}
              names={names}
              onEdit={(entry) => setDialog({ kind: 'edit', entry })}
              onDelete={removeEntry}
            />
          ) : (
            <SummaryList
              summary={monthSummary(data.entries, data.categories, month)}
              savedSen={savedSoFar(data.entries)}
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setDialog({ kind: 'add' })}
        aria-label="Add an entry"
        className="fixed bottom-[calc(var(--mt-safe-bottom)+1.5rem)] right-[max(1.5rem,var(--mt-safe-right))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)] shadow-lg"
      >
        <Plus size={26} aria-hidden />
      </button>

      {undo !== null && <UndoBar onUndo={undoDelete} />}

      {(dialog?.kind === 'add' || dialog?.kind === 'edit') && (
        <AddSheet
          key={dialog.kind === 'edit' ? dialog.entry.id : 'add'}
          mode={dialog}
          today={today}
          categoriesFor={(kind) => categoriesByUse(data.categories, data.entries, kind)}
          templates={liveTemplates(data.templates, data.categories)}
          names={names}
          onClose={() => setDialog(null)}
          onSave={saveDraft}
          onDelete={removeEntry}
          onUseTemplate={addFromTemplate}
          onAddTemplate={addTemplate}
          onDeleteTemplate={removeTemplate}
          onAddCategory={addCategory}
        />
      )}

      {dialog?.kind === 'budget' && (
        <BudgetSheet
          plan={data.plan}
          today={today}
          onClose={() => setDialog(null)}
          onSave={saveBudgetEdit}
          onReset={() => setDialog({ kind: 'reset' })}
        />
      )}

      {dialog?.kind === 'categories' && (
        <CategorySheet
          categories={data.categories}
          onClose={() => setDialog(null)}
          onAdd={addCategory}
          onRename={async (category, name) =>
            keepCategory(await renameCategory(owner, category.id, name))
          }
          onArchive={(category) => setDialog({ kind: 'archive', category })}
          onRestore={async (category) => keepCategory(await restoreCategory(owner, category.id))}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'reset'}
        title="Reset budget?"
        body={resetNote(data.entries)}
        onDismiss={() => setDialog({ kind: 'budget' })}
        choices={[
          { label: 'Cancel', tone: 'plain', onPick: () => setDialog({ kind: 'budget' }) },
          { label: 'Reset', tone: 'danger', onPick: clearBudget },
        ]}
      />

      <ConfirmDialog
        open={dialog?.kind === 'archive'}
        title={dialog?.kind === 'archive' ? `Delete ${dialog.category.name}?` : ''}
        body="It will no longer be offered when you add an entry. Past entries keep it and still show in your history."
        onDismiss={() => setDialog({ kind: 'categories' })}
        choices={[
          { label: 'Cancel', tone: 'plain', onPick: () => setDialog({ kind: 'categories' }) },
          {
            label: 'Delete',
            tone: 'danger',
            onPick: () => {
              if (dialog?.kind === 'archive') archive(dialog.category);
            },
          },
        ]}
      />
    </div>
  );
}
