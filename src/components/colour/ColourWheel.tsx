'use client';

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { isHexColor } from '@/lib/colourPalette';
import { hexToHsv, hsvToHex } from '@/lib/colourWheel';

const HUE_RAMP =
  'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)';

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function normalizeHexInput(raw: string): string | null {
  const trimmed = raw.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const upper = withHash.toUpperCase();
  return isHexColor(upper) ? upper : null;
}

export default function ColourWheel({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const parsed = hexToHsv(value);
  const [heldHue, setHeldHue] = useState(parsed.h);
  const [hexEditing, setHexEditing] = useState(false);
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());
  if (parsed.s > 0 && heldHue !== parsed.h) {
    setHeldHue(parsed.h);
  }
  const hue = parsed.s === 0 ? heldHue : parsed.h;
  const hexShown = hexEditing ? hexDraft : value.toUpperCase();
  const squareRef = useRef<HTMLDivElement>(null);
  const hueId = useId();
  const svId = useId();
  const hexId = useId();

  const emit = useCallback(
    (h: number, s: number, v: number) => {
      setHeldHue(h);
      onChange(hsvToHex({ h, s, v }));
    },
    [onChange],
  );

  const commitHex = () => {
    const next = normalizeHexInput(hexDraft);
    setHexEditing(false);
    if (next === null) {
      setHexDraft(value.toUpperCase());
      return;
    }
    setHexDraft(next);
    onChange(next);
  };

  const pickSv = useCallback(
    (clientX: number, clientY: number) => {
      const el = squareRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp01((clientX - rect.left) / rect.width);
      const v = clamp01(1 - (clientY - rect.top) / rect.height);
      emit(hue, s, v);
    },
    [emit, hue],
  );

  const onSquarePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pickSv(e.clientX, e.clientY);
  };

  const onSquarePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    pickSv(e.clientX, e.clientY);
  };

  const onSquareKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    let s = parsed.s;
    let v = parsed.v;
    if (e.key === 'ArrowRight') s = clamp01(s + step);
    else if (e.key === 'ArrowLeft') s = clamp01(s - step);
    else if (e.key === 'ArrowUp') v = clamp01(v + step);
    else if (e.key === 'ArrowDown') v = clamp01(v - step);
    else return;
    e.preventDefault();
    emit(hue, s, v);
  };

  const hueFill = hsvToHex({ h: hue, s: 1, v: 1 });

  return (
    <div className="flex items-start gap-4">
      <div
        className="size-11 shrink-0 rounded-full border border-[var(--mt-border)]"
        style={{ backgroundColor: value }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div
          ref={squareRef}
          id={svId}
          role="slider"
          tabIndex={0}
          aria-label="Saturation and brightness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(parsed.s * 100)}
          aria-valuetext={`Saturation ${Math.round(parsed.s * 100)} percent, brightness ${Math.round(parsed.v * 100)} percent`}
          onPointerDown={onSquarePointerDown}
          onPointerMove={onSquarePointerMove}
          onKeyDown={onSquareKeyDown}
          className="relative aspect-square w-full min-h-11 cursor-crosshair touch-none overflow-hidden rounded-lg border border-[var(--mt-border)]"
          style={{
            backgroundImage: `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #FFFFFF, ${hueFill})`,
          }}
        >
          <div
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--mt-surface)] shadow-[0_0_0_1px_var(--mt-text)]"
            style={{
              left: `${parsed.s * 100}%`,
              top: `${(1 - parsed.v) * 100}%`,
              backgroundColor: value,
            }}
          />
        </div>
        <div>
          <label htmlFor={hueId} className="sr-only">
            Hue
          </label>
          <div
            className="relative h-11 overflow-hidden rounded-full border border-[var(--mt-border)]"
            style={{ backgroundImage: HUE_RAMP }}
          >
            <input
              id={hueId}
              type="range"
              min={0}
              max={360}
              step={1}
              value={Math.round(hue)}
              onChange={(e) => emit(Number(e.target.value), parsed.s, parsed.v)}
              className="absolute inset-0 h-11 w-full cursor-ew-resize appearance-none bg-transparent accent-[var(--mt-text)]"
            />
          </div>
        </div>
        <label
          htmlFor={hexId}
          className="block text-xs font-semibold text-[var(--mt-text-muted)]"
        >
          Hex
          <input
            id={hexId}
            value={hexShown}
            spellCheck={false}
            autoCapitalize="characters"
            autoCorrect="off"
            onFocus={() => {
              setHexDraft(value.toUpperCase());
              setHexEditing(true);
            }}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={commitHex}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitHex();
              }
            }}
            className="mt-1 min-h-11 w-full rounded-xl border border-[var(--mt-border)] bg-[var(--mt-surface)] px-3 font-mono text-sm text-[var(--mt-text)] focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]"
            placeholder="#FF0000"
          />
        </label>
      </div>
    </div>
  );
}
