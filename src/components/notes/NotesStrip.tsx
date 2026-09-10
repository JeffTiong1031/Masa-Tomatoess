'use client';

import {
  IndentDecrease,
  IndentIncrease,
  ListChecks,
} from 'lucide-react';

interface NotesStripProps {
  inWords: boolean;
  inChecklist: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  onToggle: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}

interface StripButtonProps {
  label: string;
  visible: boolean;
  enabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function StripButton({
  label,
  visible,
  enabled,
  onClick,
  children,
}: StripButtonProps) {
  return (
    <button
      type="button"
      aria-hidden={!visible}
      aria-label={label}
      className={`min-h-11 min-w-11 text-[var(--mt-text)] disabled:text-[var(--mt-text-muted)] ${
        visible ? '' : 'invisible'
      }`}
      disabled={!visible || !enabled}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      onPointerDown={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

export function NotesStrip({
  inWords,
  inChecklist,
  canIndent,
  canOutdent,
  onToggle,
  onIndent,
  onOutdent,
}: NotesStripProps) {
  return (
    <div className="flex min-h-11 shrink-0 items-center border-b border-[var(--mt-border)]">
      <button
        type="button"
        aria-label="Checklist"
        aria-pressed={inChecklist}
        className="min-h-11 min-w-11 text-[var(--mt-text)] disabled:text-[var(--mt-text-muted)]"
        disabled={!inWords}
        onClick={onToggle}
        onPointerDown={(event) => event.preventDefault()}
      >
        <ListChecks aria-hidden="true" />
      </button>
      <StripButton
        label="Indent"
        visible={inChecklist}
        enabled={canIndent}
        onClick={onIndent}
      >
        <IndentIncrease aria-hidden="true" />
      </StripButton>
      <StripButton
        label="Outdent"
        visible={inChecklist}
        enabled={canOutdent}
        onClick={onOutdent}
      >
        <IndentDecrease aria-hidden="true" />
      </StripButton>
    </div>
  );
}
