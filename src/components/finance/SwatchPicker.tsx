'use client';

import { Plus } from 'lucide-react';
import type { ColourSwatch } from '@/lib/colourPalette';

export default function SwatchPicker({
  swatches,
  value,
  onChange,
  onAdd,
}: {
  swatches: ColourSwatch[];
  value: string | null;
  onChange: (swatchId: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
      {swatches.map((swatch, index) => (
        <button
          key={swatch.id}
          type="button"
          role="radio"
          aria-checked={swatch.id === value}
          aria-label={`Colour ${index + 1}`}
          onClick={() => onChange(swatch.id)}
          className={`h-11 w-11 rounded-xl transition-shadow ${
            swatch.id === value
              ? 'ring-2 ring-[var(--mt-text)] ring-offset-2 ring-offset-[var(--mt-surface)]'
              : ''
          }`}
          style={{ background: swatch.fill }}
        />
      ))}
      {onAdd !== undefined && (
        <button
          type="button"
          aria-label="Add colour"
          onClick={onAdd}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[var(--mt-border)] text-[var(--mt-text-muted)]"
        >
          <Plus size={20} aria-hidden />
        </button>
      )}
    </div>
  );
}
