import { phaseForDay, type Phase } from './cycle';

export const RING_CENTER = 110;
export const RING_RADIUS = 78;

const ARC_GAP = 0.15;

export interface RingArc {
  phase: Phase;
  startDay: number;
  endDay: number;
  d: string;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function ringPoint(
  day: number,
  cycleLen: number,
): { x: number; y: number } {
  const angle = ((-90 + ((day - 1) / cycleLen) * 360) * Math.PI) / 180;
  return {
    x: round(RING_CENTER + RING_RADIUS * Math.cos(angle)),
    y: round(RING_CENTER + RING_RADIUS * Math.sin(angle)),
  };
}

function arcPath(startDay: number, endDay: number, cycleLen: number): string {
  const start = ringPoint(startDay, cycleLen);
  const end = ringPoint(endDay + 1 - ARC_GAP, cycleLen);
  const sweep = (endDay + 1 - ARC_GAP - startDay) / cycleLen;
  const large = sweep > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RING_RADIUS} ${RING_RADIUS} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function ringArcs(cycleLen: number, periodLen: number): RingArc[] {
  const runs: { phase: Phase; startDay: number; endDay: number }[] = [];

  for (let day = 1; day <= cycleLen; day += 1) {
    const phase = phaseForDay(day, cycleLen, periodLen);
    const last = runs[runs.length - 1];
    if (last && last.phase === phase) last.endDay = day;
    else runs.push({ phase, startDay: day, endDay: day });
  }

  return runs.map((run) => ({
    ...run,
    d: arcPath(run.startDay, run.endDay, cycleLen),
  }));
}
