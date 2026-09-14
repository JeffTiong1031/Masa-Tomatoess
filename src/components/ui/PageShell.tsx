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
  | 'todo'
  | 'notes';

/** Resolves to the raw accent token. Set on a wrapper so descendants
 *  inherit it through --mt-accent without prop-drilling. */
export function accentVar(accent: AccentName): string {
  return `var(--mac-accent-${accent})`;
}

/** `wide` exists for Notes alone: a folder rail beside a card grid does not
 *  fit the measure the reading pages use. */
export type ShellWidth = 'normal' | 'wide';

const WIDTH_CLASS: Record<ShellWidth, string> = {
  normal: 'max-w-3xl',
  wide: 'max-w-6xl',
};

export default function PageShell({
  title,
  subtitle,
  accent,
  width = 'normal',
  children,
}: {
  title: string;
  subtitle?: string;
  accent: AccentName;
  width?: ShellWidth;
  children: React.ReactNode;
}) {
  const measure = WIDTH_CLASS[width];
  return (
    <main
      className="mt-page-pad flex-1"
      style={{ ['--mt-accent' as string]: accentVar(accent) }}
    >
      <header className={`mx-auto mb-6 w-full ${measure}`}>
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
      <div className={`mx-auto w-full ${measure}`}>{children}</div>
    </main>
  );
}
