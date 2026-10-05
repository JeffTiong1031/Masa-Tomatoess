import type {
  BudgetPeriodKind,
  BudgetPlan,
  Category,
  Entry,
  EntryDraft,
  EntryKind,
  HandEntry,
  NewSaving,
  Template,
} from './finance';
import type { SavingUpdate } from './financeBudget';
import type { UserName } from './identity';
import { firstRemoteError, logRemoteError, type RemoteError } from './remoteError';
import { supabase } from './supabase';

export const ENTRY_PAGE = 1000;

const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];
const DUPLICATE_CODE = '23505';

const CATEGORY_COLUMNS = 'id, kind, name, system, archived_at, swatch_id';
const ENTRY_COLUMNS =
  'id, kind, amount_sen, category_id, date, note, period_start, budget_sen, created_at';
const TEMPLATE_COLUMNS = 'id, kind, label, amount_sen, category_id';
const BUDGET_COLUMNS = 'amount_sen, period, anchor, next_period, next_from, next_amount_sen';

interface CategoryRow {
  id: string;
  kind: EntryKind;
  name: string;
  system: 'saving' | null;
  archived_at: string | null;
  swatch_id: string | null;
}

interface EntryRow {
  id: string;
  kind: EntryKind;
  amount_sen: number;
  category_id: string;
  date: string;
  note: string | null;
  period_start: string | null;
  budget_sen: number | null;
  created_at: string;
}

interface TemplateRow {
  id: string;
  kind: EntryKind;
  label: string;
  amount_sen: number;
  category_id: string;
}

interface BudgetRow {
  amount_sen: number;
  period: BudgetPeriodKind;
  anchor: string;
  next_period: BudgetPeriodKind | null;
  next_from: string | null;
  next_amount_sen: number | null;
}

export interface FinanceData {
  categories: Category[];
  entries: Entry[];
  templates: Template[];
  plan: BudgetPlan | null;
}

export type FinanceFetch =
  | { status: 'ok'; data: FinanceData }
  | { status: 'missing-table' }
  | { status: 'error' };

export type CategoryWrite =
  | { status: 'ok'; category: Category }
  | { status: 'duplicate' }
  | { status: 'error' };

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    system: row.system,
    archived: row.archived_at !== null,
    swatchId: row.swatch_id,
  };
}

function toEntry(row: EntryRow): Entry {
  const base = {
    id: row.id,
    amountSen: row.amount_sen,
    categoryId: row.category_id,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
  if (row.period_start === null || row.budget_sen === null) {
    return { ...base, source: 'hand', kind: row.kind };
  }
  return {
    ...base,
    source: 'saving',
    kind: 'income',
    periodStart: row.period_start,
    budgetSen: row.budget_sen,
  };
}

function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    amountSen: row.amount_sen,
    categoryId: row.category_id,
  };
}

function toPlan(row: BudgetRow): BudgetPlan {
  return {
    amountSen: row.amount_sen,
    period: row.period,
    anchor: row.anchor,
    next:
      row.next_period === null || row.next_from === null || row.next_amount_sen === null
        ? null
        : { period: row.next_period, from: row.next_from, amountSen: row.next_amount_sen },
  };
}

function draftRow(owner: UserName, draft: EntryDraft) {
  return {
    owner,
    kind: draft.kind,
    amount_sen: draft.amountSen,
    category_id: draft.categoryId,
    date: draft.date,
    note: draft.note,
  };
}

async function fetchEntries(
  owner: UserName,
): Promise<{ rows: EntryRow[]; error: RemoteError | null }> {
  const rows: EntryRow[] = [];
  for (let from = 0; ; from += ENTRY_PAGE) {
    const { data, error } = await supabase
      .from('finance_entries')
      .select(ENTRY_COLUMNS)
      .eq('owner', owner)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + ENTRY_PAGE - 1);
    if (error) return { rows, error };
    const page = data as EntryRow[];
    rows.push(...page);
    if (page.length < ENTRY_PAGE) return { rows, error: null };
  }
}

export async function loadFinance(owner: UserName): Promise<FinanceFetch> {
  const [categories, templates, budget, entries] = await Promise.all([
    supabase
      .from('finance_categories')
      .select(CATEGORY_COLUMNS)
      .eq('owner', owner)
      .order('created_at', { ascending: true }),
    supabase
      .from('finance_templates')
      .select(TEMPLATE_COLUMNS)
      .eq('owner', owner)
      .order('created_at', { ascending: true }),
    supabase.from('finance_budgets').select(BUDGET_COLUMNS).eq('owner', owner).maybeSingle(),
    fetchEntries(owner),
  ]);

  const error = firstRemoteError(categories.error, templates.error, budget.error, entries.error);
  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code ?? '')) return { status: 'missing-table' };
    logRemoteError('Failed to load finance:', error);
    return { status: 'error' };
  }

  return {
    status: 'ok',
    data: {
      categories: (categories.data as CategoryRow[]).map(toCategory),
      templates: (templates.data as TemplateRow[]).map(toTemplate),
      plan: budget.data === null ? null : toPlan(budget.data as BudgetRow),
      entries: entries.rows.map(toEntry),
    },
  };
}

function settled(label: string, error: RemoteError | null): boolean {
  if (error) {
    logRemoteError(label, error);
    return false;
  }
  return true;
}

function upsertSaving(owner: UserName) {
  return supabase
    .from('finance_categories')
    .upsert(
      { owner, kind: 'income', name: 'Saving', system: 'saving' },
      { onConflict: 'owner,system', ignoreDuplicates: true },
    );
}

export async function ensureSaving(owner: UserName): Promise<boolean | 'missing-table'> {
  let { error } = await upsertSaving(owner);
  if (error && MISSING_TABLE_CODES.includes(error.code)) return 'missing-table';
  if (error?.code === DUPLICATE_CODE) ({ error } = await upsertSaving(owner));
  if (error && MISSING_TABLE_CODES.includes(error.code)) return 'missing-table';
  return settled('Failed to create the Saving category:', error);
}

export async function insertSavings(
  owner: UserName,
  categoryId: string,
  rows: NewSaving[],
): Promise<boolean> {
  const { error } = await supabase.from('finance_entries').upsert(
    rows.map((row) => ({
      owner,
      kind: 'income',
      amount_sen: row.amountSen,
      category_id: categoryId,
      date: row.date,
      note: null,
      period_start: row.periodStart,
      budget_sen: row.budgetSen,
    })),
    { onConflict: 'owner,period_start', ignoreDuplicates: true },
  );
  return settled('Failed to close a budget period:', error);
}

export async function updateSavingAmounts(
  owner: UserName,
  updates: SavingUpdate[],
): Promise<boolean> {
  for (const update of updates) {
    const { error } = await supabase
      .from('finance_entries')
      .update({ amount_sen: update.amountSen, updated_at: new Date().toISOString() })
      .eq('id', update.id)
      .eq('owner', owner);
    if (!settled('Failed to recalculate a Saving entry:', error)) return false;
  }
  return true;
}

export async function insertEntry(owner: UserName, draft: EntryDraft): Promise<Entry | null> {
  const { data, error } = await supabase
    .from('finance_entries')
    .insert(draftRow(owner, draft))
    .select(ENTRY_COLUMNS)
    .single();
  if (!settled('Failed to add an entry:', error)) return null;
  return toEntry(data as EntryRow);
}

export async function restoreEntry(owner: UserName, entry: HandEntry): Promise<boolean> {
  const { error } = await supabase.from('finance_entries').insert({
    ...draftRow(owner, entry),
    id: entry.id,
    created_at: entry.createdAt,
  });
  return settled('Failed to put an entry back:', error);
}

export async function updateEntry(
  owner: UserName,
  id: string,
  draft: EntryDraft,
): Promise<Entry | null> {
  const { data, error } = await supabase
    .from('finance_entries')
    .update({ ...draftRow(owner, draft), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner', owner)
    .select(ENTRY_COLUMNS)
    .single();
  if (!settled('Failed to edit an entry:', error)) return null;
  return toEntry(data as EntryRow);
}

export async function deleteEntry(owner: UserName, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('finance_entries')
    .delete()
    .eq('id', id)
    .eq('owner', owner);
  return settled('Failed to delete an entry:', error);
}

function categoryResult(
  label: string,
  data: unknown,
  error: RemoteError | null,
): CategoryWrite {
  if (error?.code === DUPLICATE_CODE) return { status: 'duplicate' };
  if (!settled(label, error)) return { status: 'error' };
  return { status: 'ok', category: toCategory(data as CategoryRow) };
}

export async function insertCategory(
  owner: UserName,
  kind: EntryKind,
  name: string,
  swatchId: string | null,
): Promise<CategoryWrite> {
  const { data, error } = await supabase
    .from('finance_categories')
    .insert({ owner, kind, name: name.trim(), swatch_id: swatchId })
    .select(CATEGORY_COLUMNS)
    .single();
  return categoryResult('Failed to add a category:', data, error);
}

async function changeCategory(
  owner: UserName,
  id: string,
  change: { name?: string; swatch_id?: string | null; archived_at?: string | null },
  label: string,
): Promise<CategoryWrite> {
  const { data, error } = await supabase
    .from('finance_categories')
    .update({ ...change, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner', owner)
    .is('system', null)
    .select(CATEGORY_COLUMNS)
    .single();
  return categoryResult(label, data, error);
}

export function editCategory(owner: UserName, id: string, name: string, swatchId: string | null) {
  return changeCategory(
    owner,
    id,
    { name: name.trim(), swatch_id: swatchId },
    'Failed to change a category:',
  );
}

export function archiveCategory(owner: UserName, id: string) {
  return changeCategory(
    owner,
    id,
    { archived_at: new Date().toISOString() },
    'Failed to delete a category:',
  );
}

export function restoreCategory(owner: UserName, id: string) {
  return changeCategory(owner, id, { archived_at: null }, 'Failed to restore a category:');
}

export async function insertTemplate(
  owner: UserName,
  template: Omit<Template, 'id'>,
): Promise<Template | null> {
  const { data, error } = await supabase
    .from('finance_templates')
    .insert({
      owner,
      kind: template.kind,
      label: template.label.trim(),
      amount_sen: template.amountSen,
      category_id: template.categoryId,
    })
    .select(TEMPLATE_COLUMNS)
    .single();
  if (!settled('Failed to save a template:', error)) return null;
  return toTemplate(data as TemplateRow);
}

export async function deleteTemplate(owner: UserName, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('finance_templates')
    .delete()
    .eq('id', id)
    .eq('owner', owner);
  return settled('Failed to delete a template:', error);
}

export async function resetBudget(owner: UserName): Promise<boolean> {
  const savings = await supabase
    .from('finance_entries')
    .delete()
    .eq('owner', owner)
    .not('period_start', 'is', null);
  if (!settled('Failed to delete the budget Savings:', savings.error)) return false;
  const { error } = await supabase.from('finance_budgets').delete().eq('owner', owner);
  return settled('Failed to delete the budget:', error);
}

export async function saveBudget(owner: UserName, plan: BudgetPlan): Promise<boolean> {
  const { error } = await supabase.from('finance_budgets').upsert(
    {
      owner,
      amount_sen: plan.amountSen,
      period: plan.period,
      anchor: plan.anchor,
      next_period: plan.next?.period ?? null,
      next_from: plan.next?.from ?? null,
      next_amount_sen: plan.next?.amountSen ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner' },
  );
  return settled('Failed to save the budget:', error);
}
