'use client';

import { useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import SwatchAddSheet from '@/components/colour/SwatchAddSheet';
import Modal from '@/components/ui/Modal';
import { STARTER_FILLS, type ColourSwatch } from '@/lib/colourPalette';
import type { Category, EntryKind } from '@/lib/finance';
import type { CategoryWrite } from '@/lib/financeRepo';
import SwatchPicker from './SwatchPicker';

const SECTIONS: { kind: EntryKind; title: string }[] = [
  { kind: 'expense', title: 'Expense' },
  { kind: 'income', title: 'Income' },
];

const field =
  'min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 text-sm text-[var(--mt-text)]';
const iconButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]';
const solid =
  'min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]';

type ColourTarget = EntryKind | 'edit';

function Dot({ fill }: { fill: string }) {
  return (
    <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: fill }} />
  );
}

function problemFor(result: CategoryWrite, name: string): string | null {
  if (result.status === 'ok') return null;
  return result.status === 'duplicate'
    ? `You already have a category called ${name.trim()}.`
    : 'That did not save. Check your connection.';
}

export default function CategorySheet({
  categories,
  swatches,
  fills,
  suggested,
  onClose,
  onAdd,
  onEdit,
  onArchive,
  onRestore,
  onAddColour,
}: {
  categories: Category[];
  swatches: ColourSwatch[];
  fills: Map<string, string>;
  suggested: string | null;
  onClose: () => void;
  onAdd: (kind: EntryKind, name: string, swatchId: string | null) => Promise<CategoryWrite>;
  onEdit: (category: Category, name: string, swatchId: string | null) => Promise<CategoryWrite>;
  onArchive: (category: Category) => void;
  onRestore: (category: Category) => Promise<CategoryWrite>;
  onAddColour: (fill: string) => Promise<ColourSwatch | null>;
}) {
  const [drafts, setDrafts] = useState<Record<EntryKind, string>>({ expense: '', income: '' });
  const [picks, setPicks] = useState<Record<EntryKind, string | null>>({
    expense: null,
    income: null,
  });
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    swatchId: string | null;
  } | null>(null);
  const [colourFor, setColourFor] = useState<ColourTarget | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const pickFor = (kind: EntryKind) => picks[kind] ?? suggested;

  const add = async (kind: EntryKind) => {
    const name = drafts[kind];
    if (name.trim() === '') return;
    const failure = problemFor(await onAdd(kind, name, pickFor(kind)), name);
    setProblem(failure);
    if (failure === null) {
      setDrafts((all) => ({ ...all, [kind]: '' }));
      setPicks((all) => ({ ...all, [kind]: null }));
    }
  };

  const edit = async (category: Category) => {
    if (editing === null || editing.name.trim() === '') return;
    const failure = problemFor(
      await onEdit(category, editing.name, editing.swatchId),
      editing.name,
    );
    setProblem(failure);
    if (failure === null) setEditing(null);
  };

  const choose = (target: ColourTarget, swatchId: string) => {
    if (target === 'edit') {
      setEditing((current) => (current === null ? null : { ...current, swatchId }));
      return;
    }
    setPicks((all) => ({ ...all, [target]: swatchId }));
  };

  const addColour = async (fill: string) => {
    if (colourFor === null) return;
    const created = await onAddColour(fill);
    if (created === null) {
      setProblem('Could not add a colour. Check your connection and try again.');
      return;
    }
    choose(colourFor, created.id);
    setColourFor(null);
  };

  const restore = async (category: Category) => {
    setProblem(problemFor(await onRestore(category), category.name));
  };

  const archived = categories.filter((category) => category.archived);

  const colourTitle =
    colourFor === null ? '' : colourFor === 'edit' ? (editing?.name ?? '') : drafts[colourFor];

  return (
    <>
      <Modal open onClose={onClose} title="Categories" variant="sheet">
        <div className="grid gap-6">
          {problem !== null && (
            <p role="alert" className="text-sm text-[var(--mt-danger)]">
              {problem}
            </p>
          )}
          {SECTIONS.map((section) => (
            <section key={section.kind}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
                {section.title}
              </h3>
              <ul className="divide-y divide-[var(--mt-border)]">
                {categories
                  .filter((c) => c.kind === section.kind && !c.archived)
                  .map((category) => (
                    <li key={category.id} className="flex min-h-12 items-center gap-3">
                      {editing?.id === category.id ? (
                        <form
                          className="grid flex-1 gap-3 py-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            edit(category);
                          }}
                        >
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              aria-label={`Rename ${category.name}`}
                              value={editing.name}
                              onChange={(event) =>
                                setEditing({ ...editing, name: event.target.value })
                              }
                              className={field}
                            />
                            <button type="submit" className={solid}>
                              Save
                            </button>
                          </div>
                          <SwatchPicker
                            swatches={swatches}
                            value={editing.swatchId}
                            onChange={(swatchId) => choose('edit', swatchId)}
                            onAdd={() => setColourFor('edit')}
                          />
                        </form>
                      ) : (
                        <>
                          <Dot fill={fills.get(category.id)!} />
                          <span className="flex-1 truncate text-sm text-[var(--mt-text)]">
                            {category.name}
                          </span>
                          {category.system === 'saving' ? (
                            <span
                              className={iconButton}
                              aria-label="Made by the app, cannot be changed"
                            >
                              <Lock size={16} aria-hidden />
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                aria-label={`Edit ${category.name}`}
                                onClick={() =>
                                  setEditing({
                                    id: category.id,
                                    name: category.name,
                                    swatchId: category.swatchId,
                                  })
                                }
                                className={iconButton}
                              >
                                <Pencil size={16} aria-hidden />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${category.name}`}
                                onClick={() => onArchive(category)}
                                className={iconButton}
                              >
                                <Trash2 size={16} aria-hidden />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </li>
                  ))}
              </ul>
              <form
                className="mt-2 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  add(section.kind);
                }}
              >
                <div className="flex gap-2">
                  <input
                    aria-label={`New ${section.title.toLowerCase()} category`}
                    placeholder={section.kind === 'expense' ? 'e.g. Food' : 'e.g. Salary'}
                    value={drafts[section.kind]}
                    onChange={(event) =>
                      setDrafts((all) => ({ ...all, [section.kind]: event.target.value }))
                    }
                    className={field}
                  />
                  <button type="submit" className={solid}>
                    Add
                  </button>
                </div>
                {drafts[section.kind].trim() !== '' && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-[var(--mt-text-muted)]">
                      Pick a colour
                    </p>
                    <SwatchPicker
                      swatches={swatches}
                      value={pickFor(section.kind)}
                      onChange={(swatchId) => choose(section.kind, swatchId)}
                      onAdd={() => setColourFor(section.kind)}
                    />
                  </div>
                )}
              </form>
            </section>
          ))}
          {archived.length > 0 && (
            <details>
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[var(--mt-text-muted)]">
                Archived ({archived.length})
              </summary>
              <ul className="divide-y divide-[var(--mt-border)]">
                {archived.map((category) => (
                  <li key={category.id} className="flex min-h-12 items-center gap-3">
                    <Dot fill={fills.get(category.id)!} />
                    <span className="flex-1 truncate text-sm text-[var(--mt-text-muted)]">
                      {category.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => restore(category)}
                      className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Modal>

      <SwatchAddSheet
        open={colourFor !== null}
        kind="finance"
        title={colourTitle.trim() === '' ? 'Category' : colourTitle}
        initialFill={STARTER_FILLS[0]}
        onClose={() => setColourFor(null)}
        onConfirm={addColour}
      />
    </>
  );
}
