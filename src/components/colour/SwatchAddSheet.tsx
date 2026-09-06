'use client';

import { useState } from 'react';
import ColourWheel from '@/components/colour/ColourWheel';
import Modal from '@/components/ui/Modal';
import type { PaletteKind } from '@/lib/colourPalette';

const DEFAULT_TEXT = '#FFFFFF';

export default function SwatchAddSheet({
  open,
  kind,
  title,
  timeLabel,
  initialFill,
  initialText,
  onClose,
  onConfirm,
}: {
  open: boolean;
  kind: PaletteKind;
  title: string;
  timeLabel?: string;
  initialFill: string;
  initialText?: string;
  onClose: () => void;
  onConfirm: (fill: string, textColor: string | null) => void;
}) {
  if (!open) return null;
  return (
    <SwatchAddSheetOpen
      kind={kind}
      title={title}
      timeLabel={timeLabel}
      initialFill={initialFill}
      initialText={initialText}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function SwatchAddSheetOpen({
  kind,
  title,
  timeLabel,
  initialFill,
  initialText,
  onClose,
  onConfirm,
}: {
  kind: PaletteKind;
  title: string;
  timeLabel?: string;
  initialFill: string;
  initialText?: string;
  onClose: () => void;
  onConfirm: (fill: string, textColor: string | null) => void;
}) {
  const [fill, setFill] = useState(initialFill);
  const [text, setText] = useState(initialText ?? DEFAULT_TEXT);

  const save = () => {
    onConfirm(fill, kind === 'calendar' ? null : text);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add colour"
      variant="sheet"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-[var(--mt-border)] px-4 text-sm font-semibold text-[var(--mt-text)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="min-h-11 rounded-xl bg-[var(--mt-accent)] px-4 text-sm font-semibold text-[var(--mt-accent-contrast)]"
          >
            Save
          </button>
        </div>
      }
    >
      {kind === 'calendar' ? (
        <ColourWheel value={fill} onChange={setFill} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--mt-text-muted)]">
                Fill
              </p>
              <ColourWheel value={fill} onChange={setFill} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--mt-text-muted)]">
                Text
              </p>
              <ColourWheel value={text} onChange={setText} />
            </div>
          </div>
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: fill, color: text }}
          >
            <p className="text-sm font-semibold">{title}</p>
            {timeLabel !== undefined && (
              <p className="mt-1 text-sm">{timeLabel}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
