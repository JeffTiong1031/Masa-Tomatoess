'use client';

export default function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${
            option.value === value
              ? 'bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)]'
              : 'text-[var(--mt-text-muted)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
