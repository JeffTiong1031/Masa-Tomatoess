'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Template } from '@/lib/finance';
import { formatRM } from '@/lib/financeMoney';

const chip =
  'inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--mt-border)] px-3 text-sm text-[var(--mt-text)]';

export default function TemplateChips({
  templates,
  names,
  onUse,
  onDelete,
}: {
  templates: Template[];
  names: Map<string, string>;
  onUse: (template: Template) => void;
  onDelete: (template: Template) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (templates.length === 0) return null;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
          Quick add
        </span>
        <button
          type="button"
          onClick={() => setEditing((on) => !on)}
          className="min-h-11 px-2 text-xs font-semibold text-[var(--mt-text-muted)]"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {templates.map((template) => {
          const text = `${template.label} · ${formatRM(template.amountSen)} · ${names.get(template.categoryId)}`;
          return editing ? (
            <button
              key={template.id}
              type="button"
              onClick={() => onDelete(template)}
              aria-label={`Delete template ${text}`}
              className={`${chip} border-[var(--mt-danger)]`}
            >
              {text}
              <X size={16} aria-hidden className="text-[var(--mt-danger)]" />
            </button>
          ) : (
            <button
              key={template.id}
              type="button"
              onClick={() => onUse(template)}
              className={`${chip} bg-[color-mix(in_srgb,var(--mt-accent)_35%,transparent)]`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
