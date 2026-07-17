'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** `sheet` slides up on small screens; `dialog` stays centered. */
  variant?: 'dialog' | 'sheet';
  maxWidthClass?: string;
  footer?: ReactNode;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  variant = 'dialog',
  maxWidthClass = 'max-w-md',
  footer,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', handleKeyDown);
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const panelBase =
    variant === 'sheet'
      ? `mt-auto w-full ${maxWidthClass} sm:mt-0 sm:mx-auto rounded-t-3xl sm:rounded-2xl max-h-[90dvh]`
      : `w-full ${maxWidthClass} rounded-2xl max-h-[90dvh]`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-[var(--mt-surface)] text-white shadow-2xl border border-white/10 relative flex flex-col overflow-hidden ${panelBase}`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
          <h2 id={titleId} className="text-xl sm:text-2xl font-light tracking-wide">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
        {footer ? (
          <div className="px-5 py-4 border-t border-white/10 shrink-0">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
