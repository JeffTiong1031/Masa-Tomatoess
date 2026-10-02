'use client';

import { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { formatRM, inputToSen, pressKey, type KeypadKey } from '@/lib/financeMoney';

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

function keyFromEvent(event: KeyboardEvent): KeypadKey | null {
  if (event.key === 'Backspace') return 'back';
  return KEYS.find((key) => key === event.key && key !== 'back') ?? null;
}

export default function AmountKeypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      const key = keyFromEvent(event);
      if (key === null) return;
      event.preventDefault();
      onChange(pressKey(value, key));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange]);

  return (
    <div>
      <output
        aria-live="polite"
        aria-label="Amount"
        className="block py-2 text-center text-4xl font-semibold tabular-nums text-[var(--mt-text)]"
      >
        {formatRM(inputToSen(value))}
      </output>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(pressKey(value, key))}
            aria-label={key === 'back' ? 'Delete last digit' : key}
            className="flex min-h-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] text-lg font-semibold text-[var(--mt-text)] active:bg-[color-mix(in_srgb,var(--mt-text)_12%,transparent)]"
          >
            {key === 'back' ? <Delete size={20} aria-hidden /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
