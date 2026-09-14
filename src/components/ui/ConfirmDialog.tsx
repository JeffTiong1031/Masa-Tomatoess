'use client';

import Modal from './Modal';

export interface ConfirmChoice {
  label: string;
  tone: 'primary' | 'danger' | 'plain' | 'quiet';
  onPick: () => void;
}

const TONE_CLASS: Record<ConfirmChoice['tone'], string> = {
  primary:
    'bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)] border-transparent font-semibold',
  danger:
    'bg-[var(--mt-danger)] text-[var(--mt-danger-contrast)] border-transparent font-semibold',
  plain:
    'bg-[var(--mt-surface)] text-[var(--mt-text)] border-[var(--mt-border)] font-semibold',
  quiet: 'bg-transparent text-[var(--mt-text-muted)] border-transparent',
};

/** One floating question, two or three answers. Notes uses this instead of
 *  window.confirm: a browser pop-up cannot say which of "put away" and
 *  "delete for good" it means, and cannot offer a third way out. */
export default function ConfirmDialog({
  open,
  title,
  body,
  choices,
  onDismiss,
}: {
  open: boolean;
  title: string;
  body?: string;
  choices: ConfirmChoice[];
  onDismiss: () => void;
}) {
  return (
    <Modal open={open} onClose={onDismiss} title={title} maxWidthClass="max-w-sm">
      {body !== undefined && (
        <p className="text-sm leading-relaxed text-[var(--mt-text-muted)]">
          {body}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            onClick={choice.onPick}
            className={`min-h-11 rounded-xl border px-4 text-sm ${TONE_CLASS[choice.tone]}`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
