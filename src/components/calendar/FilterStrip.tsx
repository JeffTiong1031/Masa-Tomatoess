'use client';

import { SlidersHorizontal } from 'lucide-react';
import { swatchToken, type Category } from '@/lib/categories';
import type { OwnerFilter } from '@/lib/calendarViews';
import { USERS } from '@/lib/identity';

export default function FilterStrip({
  owner,
  categories,
  categoryIds,
  onOwner,
  onToggleCategory,
  onManage,
}: {
  owner: OwnerFilter;
  categories: Category[];
  categoryIds: string[];
  onOwner: (owner: OwnerFilter) => void;
  onToggleCategory: (id: string) => void;
  onManage: () => void;
}) {
  const options: OwnerFilter[] = [...USERS, 'both'];

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onOwner(option)}
            aria-pressed={owner === option}
            className="min-h-11 shrink-0 rounded-full border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
            style={
              owner === option
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            {option === 'both' ? 'Both' : option}
          </button>
        ))}

        {categories.length > 0 && (
          <span
            className="my-2 w-px shrink-0 bg-[var(--mt-border)]"
            aria-hidden
          />
        )}

        {categories.map((category) => {
          const active = categoryIds.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onToggleCategory(category.id)}
              aria-pressed={active}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--mt-border)] px-4 text-sm text-[var(--mt-text)]"
              style={active ? { background: 'var(--mt-accent)' } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: `var(${swatchToken(category.swatch)})` }}
                aria-hidden
              />
              {category.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onManage}
        aria-label="Manage categories"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-[var(--mt-border)] text-[var(--mt-text-muted)]"
      >
        <SlidersHorizontal size={16} aria-hidden />
      </button>
    </div>
  );
}
