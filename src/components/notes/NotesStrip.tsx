'use client';

import {
  Bold,
  Image,
  IndentDecrease,
  IndentIncrease,
  ListChecks,
  Underline,
} from 'lucide-react';
import {
  isNoteLineGap,
  NOTE_LINE_GAP_LABEL,
  NOTE_LINE_GAPS,
  type NoteLineGap,
} from '@/lib/noteLineGap';

interface NotesStripProps {
  /** Where this note stands: saved in a folder, or not saved at all. It
   *  rides the end of this row so it is in view whenever you are typing,
   *  without a line of its own. */
  status: React.ReactNode;
  inWords: boolean;
  inChecklist: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  bold: boolean;
  underline: boolean;
  lineGap: NoteLineGap;
  selecting: boolean;
  canDeletePicked: boolean;
  onToggle: () => void;
  onBold: () => void;
  onUnderline: () => void;
  onInsertPicture: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onLineGap: (gap: NoteLineGap) => void;
  onSelect: () => void;
  onDeletePicked: () => void;
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
  status,
  inWords,
  inChecklist,
  canIndent,
  canOutdent,
  bold,
  underline,
  lineGap,
  selecting,
  canDeletePicked,
  onToggle,
  onBold,
  onUnderline,
  onInsertPicture,
  onIndent,
  onOutdent,
  onLineGap,
  onSelect,
  onDeletePicked,
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
      <button
        type="button"
        aria-label="Bold"
        aria-pressed={bold}
        className={`min-h-11 min-w-11 text-[var(--mt-text)] disabled:text-[var(--mt-text-muted)] ${
          bold
            ? 'bg-[color-mix(in_srgb,var(--mt-text)_8%,transparent)]'
            : ''
        }`}
        disabled={!inWords}
        onClick={onBold}
        onPointerDown={(event) => event.preventDefault()}
      >
        <Bold aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Underline"
        aria-pressed={underline}
        className={`min-h-11 min-w-11 text-[var(--mt-text)] disabled:text-[var(--mt-text-muted)] ${
          underline
            ? 'bg-[color-mix(in_srgb,var(--mt-text)_8%,transparent)]'
            : ''
        }`}
        disabled={!inWords}
        onClick={onUnderline}
        onPointerDown={(event) => event.preventDefault()}
      >
        <Underline aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Add a picture"
        className="min-h-11 min-w-11 text-[var(--mt-text)]"
        onClick={onInsertPicture}
        onPointerDown={(event) => event.preventDefault()}
      >
        <Image aria-hidden="true" />
      </button>
      <label className="flex min-h-11 items-center">
        <span className="sr-only">Line and paragraph spacing</span>
        <select
          aria-label="Line and paragraph spacing"
          className="min-h-11 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] px-3 text-sm text-[var(--mt-text)] focus:border-[var(--mt-focus)] focus:outline-none"
          value={lineGap}
          onChange={(event) => {
            if (isNoteLineGap(event.target.value)) {
              onLineGap(event.target.value);
            }
          }}
        >
          {NOTE_LINE_GAPS.map((gap) => (
            <option key={gap} value={gap} className="bg-[var(--mt-surface)]">
              {NOTE_LINE_GAP_LABEL[gap]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label={selecting ? 'Done' : 'Select notes'}
        className="min-h-11 shrink-0 px-3 text-sm text-[var(--mt-text)]"
        onClick={onSelect}
      >
        {selecting ? 'Done' : 'Select'}
      </button>
      {selecting && (
        <button
          type="button"
          aria-label="Delete selected notes"
          className="min-h-11 shrink-0 px-3 text-sm text-[var(--mt-text)] disabled:text-[var(--mt-text-muted)]"
          disabled={!canDeletePicked}
          onClick={onDeletePicked}
        >
          Delete
        </button>
      )}
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
      <span className="ml-auto shrink-0 pl-2 pr-3">{status}</span>
    </div>
  );
}
