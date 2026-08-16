import { SYMPTOMS } from '@/lib/cycle';
import { formatShortDate } from '@/lib/cycleDates';

export default function SymptomChips({
  date,
  selected,
  onToggle,
}: {
  date: string;
  selected: readonly string[];
  onToggle: (symptom: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
        How {formatShortDate(date)} felt
      </div>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((symptom) => {
          const active = selected.includes(symptom);
          return (
            <button
              key={symptom}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(symptom)}
              className="min-h-11 rounded-full border px-4 text-sm transition-colors"
              style={{
                borderColor: active ? 'transparent' : 'var(--mt-border)',
                background: active ? 'var(--mt-accent)' : 'transparent',
                color: active
                  ? 'var(--mt-accent-contrast)'
                  : 'var(--mt-text-muted)',
              }}
            >
              {symptom}
            </button>
          );
        })}
      </div>
    </div>
  );
}
