'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { addDays } from '@/lib/dates';
import type { Category, EntryDraft, EntryKind, HandEntry, Template } from '@/lib/finance';
import { inputToSen, senToInput } from '@/lib/financeMoney';
import type { CategoryWrite } from '@/lib/financeRepo';
import AmountKeypad from './AmountKeypad';
import Segmented from './Segmented';
import TemplateChips from './TemplateChips';

export type SheetMode = { kind: 'add' } | { kind: 'edit'; entry: HandEntry };

type DateChoice = 'today' | 'yesterday' | 'pick';

const KINDS: { value: EntryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const SAVED_MS = 1500;

const field =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';

function chipClass(chosen: boolean): string {
  return `inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-sm ${
    chosen
      ? 'border-transparent bg-[var(--mt-accent)] font-semibold text-[var(--mt-accent-contrast)]'
      : 'border-[var(--mt-border)] text-[var(--mt-text)]'
  }`;
}

function initialChoice(date: string, today: string): DateChoice {
  if (date === today) return 'today';
  return date === addDays(today, -1) ? 'yesterday' : 'pick';
}

export default function AddSheet({
  mode,
  today,
  categoriesFor,
  templates,
  names,
  onClose,
  onSave,
  onDelete,
  onUseTemplate,
  onAddTemplate,
  onDeleteTemplate,
  onAddCategory,
}: {
  mode: SheetMode;
  today: string;
  categoriesFor: (kind: EntryKind) => Category[];
  templates: Template[];
  names: Map<string, string>;
  onClose: () => void;
  onSave: (draft: EntryDraft) => Promise<boolean>;
  onDelete: (entry: HandEntry) => void;
  onUseTemplate: (template: Template, date: string) => Promise<boolean>;
  onAddTemplate: (template: Omit<Template, 'id'>) => Promise<boolean>;
  onDeleteTemplate: (template: Template) => void;
  onAddCategory: (kind: EntryKind, name: string) => Promise<CategoryWrite>;
}) {
  const editing = mode.kind === 'edit' ? mode.entry : null;
  const [kind, setKind] = useState<EntryKind>(editing?.kind ?? 'expense');
  const [input, setInput] = useState(editing === null ? '' : senToInput(editing.amountSen));
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [choice, setChoice] = useState<DateChoice>(
    editing === null ? 'today' : initialChoice(editing.date, today),
  );
  const [picked, setPicked] = useState(editing?.date ?? today);
  const [note, setNote] = useState(editing?.note ?? '');
  const [newName, setNewName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const categories = categoriesFor(kind);
  const amountSen = inputToSen(input);
  const date = choice === 'today' ? today : choice === 'yesterday' ? addDays(today, -1) : picked;
  const trimmedNote = note.trim();
  const canSave = amountSen > 0 && categoryId !== null && date !== '' && !busy;

  const finish = (ok: boolean, failure: string) => {
    setBusy(false);
    if (!ok) {
      setProblem(failure);
      return;
    }
    if (editing !== null) {
      onClose();
      return;
    }
    setSaved(true);
    setInput('');
    setNote('');
  };

  const save = async () => {
    if (categoryId === null) return;
    setBusy(true);
    setProblem(null);
    const ok = await onSave({
      kind,
      amountSen,
      categoryId,
      date,
      note: trimmedNote === '' ? null : trimmedNote,
    });
    finish(ok, 'Could not save. Check your connection and press Save again.');
  };

  const pickTemplate = async (template: Template) => {
    setBusy(true);
    setProblem(null);
    finish(await onUseTemplate(template, date), 'Could not add that. Check your connection.');
  };

  const saveTemplate = async () => {
    if (categoryId === null) return;
    setProblem(null);
    const ok = await onAddTemplate({ kind, label: trimmedNote, amountSen, categoryId });
    if (!ok) setProblem('Could not save the template.');
  };

  const createCategory = async () => {
    if (newName === null || newName.trim() === '') return;
    const result = await onAddCategory(kind, newName);
    if (result.status === 'ok') {
      setCategoryId(result.category.id);
      setNewName(null);
      return;
    }
    setProblem(
      result.status === 'duplicate'
        ? `You already have a category called ${newName.trim()}.`
        : 'Could not add the category.',
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing === null ? 'Add' : 'Edit entry'}
      variant="sheet"
      footer={
        <div className="grid gap-2">
          {problem !== null && (
            <p role="alert" className="text-sm text-[var(--mt-danger)]">
              {problem}
            </p>
          )}
          <div className="flex items-center gap-2">
            {editing !== null && (
              <button
                type="button"
                onClick={() => onDelete(editing)}
                className="min-h-12 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-danger)]"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="min-h-12 flex-1 rounded-xl bg-[var(--mt-accent)] text-sm font-semibold text-[var(--mt-accent-contrast)] disabled:opacity-50"
            >
              {saved ? (
                <span className="inline-flex items-center gap-1">
                  Saved <Check size={16} aria-hidden />
                </span>
              ) : busy ? (
                'Saving…'
              ) : (
                'Save'
              )}
            </button>
          </div>
          <span role="status" className="sr-only">
            {saved ? 'Saved' : ''}
          </span>
        </div>
      }
    >
      <div className="grid gap-4">
        <input
          aria-label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What was it? (optional)"
          className={field}
        />

        <Segmented
          label="Entry type"
          options={KINDS}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setCategoryId(null);
          }}
        />

        <AmountKeypad value={input} onChange={setInput} />

        {editing === null && (
          <TemplateChips
            templates={templates}
            names={names}
            onUse={pickTemplate}
            onDelete={onDeleteTemplate}
          />
        )}

        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            Category
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={category.id === categoryId}
                onClick={() => setCategoryId(category.id)}
                className={chipClass(category.id === categoryId)}
              >
                {category.name}
              </button>
            ))}
            {editing !== null && !categories.some((c) => c.id === categoryId) && categoryId !== null && (
              <span className={chipClass(true)}>{names.get(categoryId)}</span>
            )}
            {newName === null ? (
              <button type="button" onClick={() => setNewName('')} className={chipClass(false)}>
                <Plus size={16} aria-hidden /> New
              </button>
            ) : (
              <form
                className="flex w-full gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  createCategory();
                }}
              >
                <input
                  autoFocus
                  aria-label="New category name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className={field}
                  placeholder="e.g. Food"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
            Date
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={choice === 'today'} onClick={() => setChoice('today')} className={chipClass(choice === 'today')}>
              Today
            </button>
            <button type="button" aria-pressed={choice === 'yesterday'} onClick={() => setChoice('yesterday')} className={chipClass(choice === 'yesterday')}>
              Yesterday
            </button>
            <button type="button" aria-pressed={choice === 'pick'} onClick={() => setChoice('pick')} className={chipClass(choice === 'pick')}>
              Pick date
            </button>
          </div>
          {choice === 'pick' && (
            <input
              type="date"
              aria-label="Date"
              value={picked}
              max={today}
              onChange={(event) => setPicked(event.target.value)}
              className={`${field} mt-2`}
            />
          )}
        </div>

        {editing === null && (
          <button
            type="button"
            onClick={saveTemplate}
            disabled={amountSen === 0 || categoryId === null || trimmedNote === ''}
            className="min-h-11 justify-self-start text-sm font-semibold text-[var(--mt-text-muted)] underline underline-offset-2 disabled:no-underline disabled:opacity-50"
          >
            Save as quick add
          </button>
        )}
      </div>
    </Modal>
  );
}
