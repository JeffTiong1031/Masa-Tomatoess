/** Marks demonstration content so a placeholder number is never mistaken
 *  for a real one. Required on every shell page (spec §7.2). */
export function SampleChip() {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--mt-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--mt-text-subtle)]">
      Sample
    </span>
  );
}

export default function ComingSoon({ note }: { note?: string }) {
  return (
    <div className="mt-soft flex flex-col items-center gap-1 p-6 text-center">
      <div
        className="mb-1 h-2 w-2 rounded-full"
        style={{ background: 'var(--mt-accent)' }}
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--mt-text)]">Coming soon</p>
      {note && (
        <p className="text-xs text-[var(--mt-text-muted)]">{note}</p>
      )}
    </div>
  );
}
