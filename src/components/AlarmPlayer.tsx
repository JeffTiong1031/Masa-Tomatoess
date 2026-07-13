'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useRef } from 'react';

export default function AlarmPlayer() {
  const { isAlarmRinging } = useTimerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isAlarmRinging) {
        audioRef.current.play().catch((err) => console.error("Audio play failed:", err));
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0; // reset to beginning
      }
    }
  }, [isAlarmRinging]);

  return (
    <audio 
      ref={audioRef} 
      src="https://cdn.freesound.org/previews/316/316847_4939433-lq.mp3" 
      loop 
      className="hidden" 
    />
  );
}
