import { describe, expect, it } from 'vitest';
import { ringArcs, ringPoint, RING_CENTER, RING_RADIUS } from './cycleRing';

describe('ringPoint', () => {
  it('puts day one at the top of the circle', () => {
    expect(ringPoint(1, 28)).toEqual({ x: RING_CENTER, y: RING_CENTER - RING_RADIUS });
  });

  it('puts the halfway day at the bottom', () => {
    const point = ringPoint(15, 28);
    expect(point.x).toBeCloseTo(RING_CENTER, 0);
    expect(point.y).toBeCloseTo(RING_CENTER + RING_RADIUS, 0);
  });

  it('stays on the circle for every day', () => {
    for (let day = 1; day <= 28; day += 1) {
      const { x, y } = ringPoint(day, 28);
      const distance = Math.hypot(x - RING_CENTER, y - RING_CENTER);
      expect(distance).toBeCloseTo(RING_RADIUS, 0);
    }
  });
});

describe('ringArcs', () => {
  it('produces one arc per phase run, in cycle order', () => {
    expect(ringArcs(28, 5).map((arc) => arc.phase)).toEqual([
      'menstrual',
      'follicular',
      'fertile',
      'luteal',
    ]);
  });

  it('covers every day of the cycle exactly once', () => {
    const arcs = ringArcs(29, 5);
    expect(arcs[0].startDay).toBe(1);
    expect(arcs[arcs.length - 1].endDay).toBe(29);
    for (let i = 1; i < arcs.length; i += 1) {
      expect(arcs[i].startDay).toBe(arcs[i - 1].endDay + 1);
    }
  });

  it('drops a phase that has no days', () => {
    expect(ringArcs(21, 6).map((arc) => arc.phase)).toEqual([
      'menstrual',
      'fertile',
      'luteal',
    ]);
  });

  it('emits a drawable arc path for each run', () => {
    for (const arc of ringArcs(28, 5)) {
      expect(arc.d).toMatch(/^M [\d.]+ [\d.]+ A /);
    }
  });

  it('uses the large-arc flag only for runs longer than half the cycle', () => {
    const arcs = ringArcs(28, 5);
    const luteal = arcs.find((arc) => arc.phase === 'luteal')!;
    const menstrual = arcs.find((arc) => arc.phase === 'menstrual')!;
    expect(luteal.d).toContain(' 0 0 1 ');
    expect(menstrual.d).toContain(' 0 0 1 ');
  });
});
