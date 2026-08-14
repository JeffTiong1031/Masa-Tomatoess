import { accentVar, type AccentName } from './PageShell';

export default function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: AccentName;
}) {
  return (
    <div
      className="mt-soft p-4"
      style={accent ? { ['--mt-accent' as string]: accentVar(accent) } : undefined}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--mt-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--mt-text)]">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-xs text-[var(--mt-text-subtle)]">{hint}</div>
      )}
    </div>
  );
}
