'use client';

import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useIsTouch } from '@/hooks/useMediaQuery';

export default function CameraButton({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [asking, setAsking] = useState(false);
  const touch = useIsTouch();

  function take(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onCapture(file);
    event.target.value = '';
    setAsking(false);
  }

  const CHOICE_CLASS =
    'flex min-h-14 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-[var(--mt-text)]';

  return (
    <>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={take}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={take}
      />

      <button
        type="button"
        onClick={() => (touch ? setAsking(true) : gallery.current?.click())}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{
          background: 'var(--mt-accent)',
          color: 'var(--mt-accent-contrast)',
        }}
        aria-label="Add a meal"
      >
        <Camera size={22} />
      </button>

      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title="Add a meal"
        variant="sheet"
        maxWidthClass="max-w-sm"
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => camera.current?.click()}
            className={CHOICE_CLASS}
            style={{ background: 'var(--mt-accent-wash)' }}
          >
            <Camera size={20} aria-hidden />
            Take a photo
          </button>
          <button
            type="button"
            onClick={() => gallery.current?.click()}
            className={CHOICE_CLASS}
            style={{ background: 'var(--mt-accent-wash)' }}
          >
            <ImageIcon size={20} aria-hidden />
            Choose from gallery
          </button>
        </div>
      </Modal>
    </>
  );
}
