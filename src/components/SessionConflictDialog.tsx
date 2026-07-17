'use client';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] text-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
        <h2 className="text-xl font-light mb-3 tracking-wide">Ongoing session</h2>
        <p className="text-sm text-white/70 mb-6 leading-relaxed">
          You have an ongoing session. Do you wish to start a new one?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/15 transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
