/**
 * Drift: how an effect moves when it is not a spinner (labkit #52).
 *
 * The owner's phone check of the first shelf (labkit #42): the orbs "were
 * spinning, and way too fast", where the look they come from floats and pulses
 * at random. So nothing here turns round and round. A piece:
 *
 * - **wanders:** each layer leans a little on its own slowly changing axis, and
 *   comes back, never completing a turn;
 * - **bobs:** the whole floats up and down a hair;
 * - **pulses:** brightness jumps at irregular moments, fast up on the theme's
 *   ease-out and slowly down on its ease-in, sometimes twice in quick succession.
 *
 * Everything is a pure function of the time into the loop and the pace
 * (pace.ts), so a still frame under calm or off is just one moment of it, and
 * the same moment always looks the same. Its speed is the theme's: every cycle
 * is a multiple of the pace's period, so a theme that arrives slowly drifts
 * slowly. One implementation: every piece that moves takes it from here.
 */
import type { Pace } from './pace';

/** A small seeded random, so every piece is built, and pulses, the same way. */
export function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from a string, the same every time (FNV-1a): for a piece the app
 *  names, such as an orbit path by its id. */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** One number from two, the same every time: for a slot's pulse. */
function hash(a: number, b: number): number {
  return seeded((Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) | 0)();
}

/** A wander: three lean angles, in radians, each the sum of two slow sines
 *  whose cycles are this many loops of the pace. Cycles that share no common
 *  multiple never line up, so the path never visibly repeats. */
export interface Wander {
  /** Largest lean on each axis, in radians. */
  reach: [number, number, number];
  /** The two cycles of each axis, in loops. */
  cycles: [number, number][];
  /** Where each sine starts, in radians. */
  phases: [number, number][];
}

/** A wander of its own for a seed: leans up to `reach` radians, cycles of 3 to
 *  9 loops. */
export function makeWander(seed: number, reach: number): Wander {
  const r = seeded(seed);
  const axis = () => reach * (0.6 + 0.4 * r());
  return {
    reach: [axis(), axis(), axis() * 0.5],
    cycles: [0, 1, 2].map(() => [3 + r() * 3, 5.5 + r() * 3.5] as [number, number]),
    phases: [0, 1, 2].map(() => [r() * 6.283, r() * 6.283] as [number, number]),
  };
}

/** The three lean angles at `loops` into the loop (elapsed / period). */
export function wanderAt(w: Wander, loops: number): [number, number, number] {
  return [0, 1, 2].map((i) => {
    const [c1, c2] = w.cycles[i], [p1, p2] = w.phases[i];
    return w.reach[i] * (0.62 * Math.sin((loops / c1) * 6.283 + p1)
                       + 0.38 * Math.sin((loops / c2) * 6.283 + p2));
  }) as [number, number, number];
}

/** The float: an offset in orb radii, up and down over about 1.7 loops, with a
 *  smaller sway across. */
export function bobAt(loops: number): [number, number] {
  return [0.012 * Math.sin((loops / 2.9) * 6.283 + 1.3),
          0.024 * Math.sin((loops / 1.7) * 6.283)];
}

export interface Pulse {
  /** How bright the pulse is now, 0 to about 1. */
  level: number;
  /** How far the latest pulse's wave has gone, 0 to 1 (1: done). */
  wave: number;
  /** The latest pulse's strength, 0 to 1. */
  strength: number;
}

/** A pulse's rise and fall, in loops: quick up, slow down. */
const RISE = 0.025, FALL = 0.2, WAVE = 0.14;
/** Pulses come about once per this many loops, at a random point in each slot. */
const SLOT = 0.55;

/**
 * The pulse at `loops` into the loop, for a piece's `seed`. Time is cut into
 * slots of SLOT loops; each slot holds one pulse at a random moment, of random
 * strength, and one slot in four a second, weaker pulse just after. Rise and
 * fall take the theme's own curves.
 *
 * `flares` are pulses an app asked for (a piece's `flare()`: the hub flares a
 * planet when a bead of light reaches it down its vine), as (when, in loops;
 * strength 0 to 1), and `own` false leaves out the piece's own random pulses
 * (its `pulse="off"`), so only the asked-for ones show. Both rise and fall the
 * same way, through the one envelope.
 */
export function pulseAt(pace: Pace, loops: number, seed: number, flares: readonly [number, number][] = [],
                        own = true): Pulse {
  const beats: [number, number][] = [...flares];
  if (own) {
    const slot = Math.floor(loops / SLOT);
    for (let k = slot - 3; k <= slot; k++) {
      const at = (k + 0.15 + 0.7 * hash(seed, k)) * SLOT;
      const amp = 0.35 + 0.65 * hash(seed + 1, k);
      beats.push([at, amp]);
      if (hash(seed + 2, k) < 0.25) beats.push([at + 0.04 + 0.03 * hash(seed + 3, k), amp * 0.6]);
    }
  }
  let level = 0, last = -Infinity, strength = 0;
  for (const [t0, a] of beats) {
    const dt = loops - t0;
    if (dt < 0) continue;
    const e = dt < RISE ? pace.easeOut(dt / RISE)
                        : dt < RISE + FALL ? 1 - pace.easeIn((dt - RISE) / FALL) : 0;
    level += a * e;
    if (t0 > last) { last = t0; strength = a; }
  }
  const since = loops - last;
  return { level: Math.min(1.2, level), wave: Math.min(1, since / WAVE), strength };
}

/** How long, in loops, an asked-for flare still shows: a piece may forget older ones. */
export const FLARE_LOOPS = RISE + FALL;
