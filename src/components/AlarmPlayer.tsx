'use client';

import { useTimerStore } from '@/store/useTimerStore';
import { useFlexibleStore } from '@/store/useFlexibleStore';
import { useEffect, useRef } from 'react';
import { playAlarmLoop, type AlarmSoundId } from '@/utils/alarmSounds';

export default function AlarmPlayer() {
  const classicRinging = useTimerStore((s) => s.isAlarmRinging);
  const flexibleRinging = useFlexibleStore((s) => s.isAlarmRinging);
  const alarmSound = useTimerStore((s) => s.settings.alarmSound);
  const isAlarmRinging = classicRinging || flexibleRinging;
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isAlarmRinging) {
      const soundId = (alarmSound || 'bell') as AlarmSoundId;
      stopRef.current = playAlarmLoop(soundId);
    } else {
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
  }, [isAlarmRinging, alarmSound]);

  return null;
}
