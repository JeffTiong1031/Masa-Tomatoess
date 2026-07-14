/**
 * Alarm Sound Synthesizer using Web Audio API
 * 
 * Generates all alarm tones programmatically — no external files needed.
 * Each alarm is crafted with specific frequencies, envelopes, and effects
 * to sound distinct and be loud enough to cut through background music.
 */

export type AlarmSoundId = 'bell' | 'beep' | 'chime' | 'siren' | 'retro' | 'marimba' | 'radar';

export const ALARM_LABELS: Record<AlarmSoundId, string> = {
  bell: '🔔 Classic Bell',
  beep: '📟 Digital Beep',
  chime: '🎵 Gentle Chime',
  siren: '🚨 Alert Siren',
  retro: '👾 Retro Arcade',
  marimba: '🎶 Marimba',
  radar: '📡 Radar Pulse',
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Master gain to ensure loudness
function createMasterGain(ctx: AudioContext, volume = 0.85): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  return gain;
}

// --- Individual Sound Generators ---

function playBell(ctx: AudioContext, master: GainNode, time: number) {
  // Two-tone bell strike
  [880, 1174.66].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.6, time + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.15 + 1.2);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time + i * 0.15);
    osc.stop(time + i * 0.15 + 1.3);
  });
}

function playBeep(ctx: AudioContext, master: GainNode, time: number) {
  // Sharp digital beeps
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.5, time + i * 0.2);
    gain.gain.setValueAtTime(0, time + i * 0.2 + 0.1);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time + i * 0.2);
    osc.stop(time + i * 0.2 + 0.15);
  }
}

function playChime(ctx: AudioContext, master: GainNode, time: number) {
  // Ascending major chord arpeggio
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, time + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.2 + 1.0);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time + i * 0.2);
    osc.stop(time + i * 0.2 + 1.1);
  });
}

function playSiren(ctx: AudioContext, master: GainNode, time: number) {
  // Rising and falling siren
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, time);
  osc.frequency.linearRampToValueAtTime(900, time + 0.6);
  osc.frequency.linearRampToValueAtTime(400, time + 1.2);
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.setValueAtTime(0.4, time + 1.1);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
  osc.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + 1.5);
}

function playRetro(ctx: AudioContext, master: GainNode, time: number) {
  // 8-bit style descending notes
  [1200, 900, 600, 900, 1200].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.35, time + i * 0.12);
    gain.gain.setValueAtTime(0, time + i * 0.12 + 0.1);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time + i * 0.12);
    osc.stop(time + i * 0.12 + 0.12);
  });
}

function playMarimba(ctx: AudioContext, master: GainNode, time: number) {
  // Warm marimba-like tones using sine + quick decay
  [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc2.type = 'sine';
    osc2.frequency.value = freq * 4; // 4th harmonic for brightness
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.1, time + i * 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + i * 0.25 + 0.3);
    gain.gain.setValueAtTime(0.5, time + i * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.25 + 0.6);
    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(master);
    gain2.connect(master);
    osc.start(time + i * 0.25);
    osc.stop(time + i * 0.25 + 0.7);
    osc2.start(time + i * 0.25);
    osc2.stop(time + i * 0.25 + 0.35);
  });
}

function playRadar(ctx: AudioContext, master: GainNode, time: number) {
  // Sonar-like ping
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1500;
    gain.gain.setValueAtTime(0.6, time + i * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.8 + 0.7);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time + i * 0.8);
    osc.stop(time + i * 0.8 + 0.75);
  }
}

// --- Public API ---

const SOUND_MAP: Record<AlarmSoundId, (ctx: AudioContext, master: GainNode, time: number) => void> = {
  bell: playBell,
  beep: playBeep,
  chime: playChime,
  siren: playSiren,
  retro: playRetro,
  marimba: playMarimba,
  radar: playRadar,
};

/** Play a single alarm sound once. Returns the AudioContext for management. */
export function playAlarmOnce(soundId: AlarmSoundId): AudioContext {
  const ctx = getAudioContext();
  const master = createMasterGain(ctx, 0.85);
  const playFn = SOUND_MAP[soundId] || SOUND_MAP.bell;
  playFn(ctx, master, ctx.currentTime);
  return ctx;
}

/** 
 * Play an alarm sound on a loop. Returns a cleanup function to stop it. 
 * The loop interval is tuned per sound to feel natural.
 */
export function playAlarmLoop(soundId: AlarmSoundId): () => void {
  const ctx = getAudioContext();
  const master = createMasterGain(ctx, 0.85);
  const playFn = SOUND_MAP[soundId] || SOUND_MAP.bell;

  // Each sound has a different natural duration
  const intervals: Record<AlarmSoundId, number> = {
    bell: 1800,
    beep: 1000,
    chime: 2000,
    siren: 1800,
    retro: 1200,
    marimba: 1800,
    radar: 2000,
  };

  let stopped = false;

  const play = () => {
    if (stopped) return;
    playFn(ctx, master, ctx.currentTime);
  };

  play();
  const intervalId = setInterval(play, intervals[soundId] || 2000);

  return () => {
    stopped = true;
    clearInterval(intervalId);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
  };
}
