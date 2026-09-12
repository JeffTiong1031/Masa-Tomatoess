import { Timer } from 'lucide-react';
import { accentVar } from '@/components/ui/PageShell';
import { filledFocusBars } from '@/lib/homeField';

export default function HomeFocusTile({ minutes }: { minutes: number }) {
  const bars = filledFocusBars(minutes);

  return (
    <div
      className="mt-soft flex items-center justify-between p-4"
      style={{
        ['--mt-accent' as string]: accentVar('timer'),
        background:
          'color-mix(in srgb, var(--mt-accent) 18%, var(--mt-surface))',
      }}
    >
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mt-text-muted)]">
          Today
        </div>
        <div className="mt-0.5 text-2xl font-semibold tracking-tight text-[var(--mt-text)]">
          {minutes} min
        </div>
        <div className="mt-3 flex items-center gap-1">
          {bars.map((filled, index) => (
            <span
              key={index}
              className="h-1.5 w-6 rounded-full"
              style={{
                background: filled
                  ? 'var(--mt-accent)'
                  : 'color-mix(in srgb, var(--mt-accent) 22%, transparent)',
              }}
            />
          ))}
        </div>
      </div>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--mt-accent)]">
        <Timer
          size={20}
          strokeWidth={1.9}
          aria-hidden
          className="text-[var(--mt-accent-contrast)]"
        />
      </span>
    </div>
  );
}
