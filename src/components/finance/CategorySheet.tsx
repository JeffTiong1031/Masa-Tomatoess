'use client';

import { useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Category, EntryKind } from '@/lib/finance';
import type { CategoryWrite } from '@/lib/financeRepo';

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

function problemFor(result: CategoryWrite, name: string): string | null {
  if (result.status === 'ok') return null;
  return result.status === 'duplicate'
    ? `You already have a category called ${name.trim()}.`
    : 'That did not save. Check your connection.';
}

export default function CategorySheet({
  categories,
  onClose,
  onAdd,
  onRename,
  onArchive,
  onRestore,
}: {
  categories: Category[];
  onClose: () => void;
  onAdd: (kind: EntryKind, name: string) => Promise<CategoryWrite>;
  onRename: (category: Category, name: string) => Promise<CategoryWrite>;
  onArchive: (category: Category) => void;
  onRestore: (category: Category) => Promise<CategoryWrite>;
}) {
  const [drafts, setDrafts] = useState<Record<EntryKind, string>>({ expense: '', income: '' });
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const add = async (kind: EntryKind) => {
    const name = drafts[kind];
    if (name.trim() === '') return;
    const failure = problemFor(await onAdd(kind, name), name);
    setProblem(failure);
    if (failure === null) setDrafts((all) => ({ ...all, [kind]: '' }));
  };

  const rename = async (category: Category) => {
    if (renaming === null || renaming.name.trim() === '') return;
    const failure = problemFor(await onRename(category, renaming.name), renaming.name);
    setProblem(failure);
    if (failure === null) setRenaming(null);
  };

  const restore = async (category: Category) => {
    setProblem(problemFor(await onRestore(category), category.name));
  };

  const archived = categories.filter((category) => category.archived);

  return (
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
                  <li key={category.id} className="flex min-h-12 items-center gap-2">
                    {renaming?.id === category.id ? (
                      <form
                        className="flex flex-1 gap-2 py-1"
                        onSubmit={(event) => {
                          event.preventDefault();
                          rename(category);
                        }}
                      >
                        <input
                          autoFocus
                          aria-label={`Rename ${category.name}`}
                          value={renaming.name}
                          onChange={(event) => setRenaming({ id: category.id, name: event.target.value })}
                          className={field}
                        />
                        <button type="submit" className={solid}>
                          Save
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm text-[var(--mt-text)]">
                          {category.name}
                        </span>
                        {category.system === 'saving' ? (
                          <span className={iconButton} aria-label="Made by the app, cannot be changed">
                            <Lock size={16} aria-hidden />
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-label={`Rename ${category.name}`}
                              onClick={() => setRenaming({ id: category.id, name: category.name })}
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
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                add(section.kind);
              }}
            >
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
                <li key={category.id} className="flex min-h-12 items-center gap-2">
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
  );
}
