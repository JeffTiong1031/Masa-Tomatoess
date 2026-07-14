'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useEffect, useRef } from 'react';
import { playAlarmLoop, type AlarmSoundId } from '@/utils/alarmSounds';

export default function AlarmPlayer() {
  const { isAlarmRinging, settings } = useTimerStore();
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isAlarmRinging) {
      // Start looping the selected alarm sound
      const soundId = (settings?.alarmSound || 'bell') as AlarmSoundId;
      stopRef.current = playAlarmLoop(soundId);
    } else {
      // Stop the alarm
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    }

    return () => {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
  }, [isAlarmRinging, settings?.alarmSound]);

  // No DOM element needed — Web Audio API plays directly
  return null;
}
