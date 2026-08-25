export type AccentName =
  | 'timer'
  | 'flexible'
  | 'dashboard'
  | 'cycle'
  | 'countdown'
  | 'meals'
  | 'fitness'
  | 'finance'
  | 'calendar'
  | 'timetable'
  | 'todo';

/** Resolves to the raw accent token. Set on a wrapper so descendants
 *  inherit it through --mt-accent without prop-drilling. */
export function accentVar(accent: AccentName): string {
  return `var(--mac-accent-${accent})`;
}

export default function PageShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: AccentName;
  children: React.ReactNode;
}) {
  return (
    <main
      className="mt-page-pad flex-1"
      style={{ ['--mt-accent' as string]: accentVar(accent) }}
    >
      <header className="mx-auto mb-6 w-full max-w-3xl">
        <div
          className="mb-3 h-1 w-12 rounded-full"
          style={{ background: 'var(--mt-accent)' }}
          aria-hidden
        />
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--mt-text-muted)]">{subtitle}</p>
        )}
      </header>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}
