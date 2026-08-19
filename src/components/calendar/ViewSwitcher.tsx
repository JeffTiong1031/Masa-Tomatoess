'use client';

import { Search, X } from 'lucide-react';

export type CalendarView = 'week' | 'month' | 'year';

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function ViewSwitcher({
  view,
  query,
  onView,
  onQuery,
}: {
  view: CalendarView;
  query: string;
  onView: (view: CalendarView) => void;
  onQuery: (query: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] p-1">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onView(key)}
            aria-pressed={view === key}
            className={`min-h-11 flex-1 rounded-full text-xs font-semibold ${
              view === key ? '' : 'text-[var(--mt-text-muted)]'
            }`}
            style={
              view === key
                ? {
                    background: 'var(--mt-accent)',
                    color: 'var(--mt-accent-contrast)',
                  }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 text-[var(--mt-text-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search events"
          className="min-h-11 w-32 rounded-full border border-[var(--mt-border)] bg-[var(--mt-surface)] pl-9 pr-8 text-sm text-[var(--mt-text)]"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => onQuery('')}
            aria-label="Clear search"
            className="absolute right-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--mt-text-muted)]"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
