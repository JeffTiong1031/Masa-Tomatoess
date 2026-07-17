'use client';

import Modal from '@/components/ui/Modal';

interface SessionConflictDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SessionConflictDialog({
  open,
  onConfirm,
  onCancel,
}: SessionConflictDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Ongoing session"
      maxWidthClass="max-w-sm"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-11 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/15 transition-colors"
          >
            No
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 min-h-11 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors"
          >
            Yes
          </button>
        </div>
      }
    >
      <p className="text-sm text-white/70 leading-relaxed">
        You have an ongoing session. Do you wish to start a new one?
      </p>
    </Modal>
  );
}
