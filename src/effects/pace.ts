/**
 * Pace: the one place an effect gets its motion (ideas plan 71, the motion
 * shelf's first piece).
 *
 * A theme has no speed field, and gets none here. An effect's loop period is a
 * fixed multiple of the theme's entrance duration, and its easing is the
 * theme's own two curves. So a theme that arrives slowly also turns slowly,
 * and no theme file changes.
 *
 * ⚠️ It reads `--motion-*`, the theme's own values, and NEVER `--dur-*`. The
 * live `--dur-*` tokens are 0 under `off` and under the system's reduce-motion
 * setting (tokens.css), so a period read from them would be 0 exactly when the
 * effect most needs to know it should hold still. The level is read on its own,
 * from `data-motion` and the media query.
 */
import type { MotionLevel } from '../themes';

/** The loop period is this many times the theme's `--motion-dur-enter`. Cold
 *  core's 870 ms entrance turns its orb once every 8.7 s; Pen and seal's 500 ms,
 *  once every 5 s. Slow enough to read as ambient, never as a spinner. */
export const PERIOD_PER_ENTER = 10;

/** tokens.css's own default, for an element with no theme above it. */
const DEFAULT_ENTER_MS = 500;

export const REDUCE_MOTION = '(prefers-reduced-motion: reduce)';

/** A timing curve: progress 0..1 in, eased progress out. */
export type Ease = (t: number) => number;

export interface Pace {
  /** The motion level the effect obeys: the nearest `data-motion`, or `off`
   *  whenever the system asks for reduced motion. */
  level: MotionLevel;
  /** One loop, in ms: PERIOD_PER_ENTER × the theme's `--motion-dur-enter`. */
  period: number;
  /** The theme's `--motion-ease-out` and `--motion-ease-in`, as functions. */
  easeOut: Ease;
  easeIn: Ease;
}

/** A CSS time ("870ms", "0.87s") in ms, or `fallback` when it is not one. */
function ms(value: string, fallback: number): number {
  const m = /^(-?[\d.]+)(ms|s)$/.exec(value.trim());
  if (!m) return fallback;
  const n = parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** The CSS keywords, as the curves the spec gives them. */
const KEYWORDS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/**
 * A cubic Bézier timing function, as CSS defines it: the curve from (0,0) to
 * (1,1) through (x1,y1) and (x2,y2), read as y for a given x. Newton's method
 * from a good first guess, then bisection if it stalls; x1 and x2 are clamped
 * to 0..1 as CSS requires, so x is monotonic and the bisection always lands.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  x1 = Math.min(1, Math.max(0, x1));
  x2 = Math.min(1, Math.max(0, x2));
  // Polynomial coefficients of B(s) = ((a s + b) s + c) s, per axis.
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;

  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = x(s) - t;
      if (Math.abs(err) < 1e-6) return y(s);
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0, hi = 1;
    s = t;
    for (let i = 0; i < 40; i++) {
      const v = x(s);
      if (Math.abs(v - t) < 1e-6) break;
      if (v < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return y(s);
  };
}

/** `cubic-bezier(a, b, c, d)` or a keyword, as a function; linear when it is
 *  neither, so a typo slows nothing to a stop. */
export function parseEase(value: string): Ease {
  const v = value.trim();
  const k = KEYWORDS[v];
  if (k) return cubicBezier(...k);
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(v);
  const n = m ? m[1].split(',').map((p) => parseFloat(p)) : [];
  if (n.length === 4 && n.every(Number.isFinite)) return cubicBezier(n[0], n[1], n[2], n[3]);
  return cubicBezier(...KEYWORDS.linear);
}

/** The level for `el`: its nearest `data-motion` (itself included), `full`
 *  when there is none, and `off` whenever the system asks for reduced motion. */
export function readLevel(el: Element): MotionLevel {
  if (typeof matchMedia === 'function' && matchMedia(REDUCE_MOTION).matches) return 'off';
  const v = el.closest('[data-motion]')?.getAttribute('data-motion');
  return v === 'calm' || v === 'off' ? v : 'full';
}

/** How `el` should move, read from the theme around it. Needs no canvas. */
export function readPace(el: Element): Pace {
  const cs = getComputedStyle(el);
  const enter = ms(cs.getPropertyValue('--motion-dur-enter'), DEFAULT_ENTER_MS);
  return {
    level: readLevel(el),
    period: PERIOD_PER_ENTER * enter,
    easeOut: parseEase(cs.getPropertyValue('--motion-ease-out')),
    easeIn: parseEase(cs.getPropertyValue('--motion-ease-in')),
  };
}
