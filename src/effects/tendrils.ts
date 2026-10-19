/**
 * `<labkit-tendrils>`: vines between points, over a transparent background. ONE
 * element draws every tendril, so an app that lays it behind its orbs pays one
 * WebGL context however many tendrils it has.
 *
 * An app gives it a list on its `tendrils` property: each one runs from `from`
 * to `to` (CSS pixels inside the element), its colour from `fromColor` to
 * `toColor` (the theme's `--accent` where either is unset), with `grow` 0 to 1
 * of it drawn, so the app can grow one in. Setting the list draws one frame
 * through the base's `redraw()`, so an app may move the ends every frame while
 * the element's own loop stays stopped under calm and off.
 *
 * Three looks, by the `variant` attribute:
 * - `vine`, the default: a line that wanders, kinks and steps on its way, as a
 *   hand draws a vine, its colour blending from one end to the other.
 * - `twist` and `bundle` (the owner's polish list, 2026-10-18: "less sharp turns,
 *   and act more like a rope floating in water", "filament type threads", "a
 *   swirl of both colored tendrils, alternating colors"): a smooth rope, its bend
 *   a few slow waves travelling along it, made of threads that wind round it.
 *   `twist` is two threads, one in each end's colour, spreading apart at the
 *   ends. `bundle` is BUNDLE_THREADS fine threads in alternating colours,
 *   swelling and pinching along the way, fanning out at `from` (where an app's
 *   orb is) and gathering in at `to`. A thread passing in front is brighter than
 *   one passing behind, so the winding reads. The owner asked to see both.
 * A tendril with `rainbow` set runs its `fromColor` threads through every hue
 * (twist and bundle).
 *
 * Every shape is seeded by the tendril's `id`, so it keeps its shape from frame
 * to frame and as its ends move. It sways through the theme's pace and holds
 * still under calm and off; its glow is the theme's `--glow`.
 *
 * Size and position come from the page: unlike the orbs it is not square, so
 * lay it over its parent with `position: absolute; inset: 0`.
 *
 * Each path is walked here, in pixels, into ribbons; the shaders only colour
 * them. Shaders are plain GLSL in shaders/, through RawShaderMaterial, with no
 * three.js chunk included.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, Mesh, OneFactor, OrthographicCamera,
  RawShaderMaterial, Scene, SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import tendrilVert from './shaders/tendril.vert.glsl?raw';
import tendrilFrag from './shaders/tendril.frag.glsl?raw';

export interface Tendril {
  /** Seeds the wander: the same id keeps the same shape. */
  id: string;
  /** Its two ends, in CSS pixels from the element's top left. */
  from: [number, number];
  to: [number, number];
  /** CSS colours at each end; the theme's `--accent` when unset. */
  fromColor?: string;
  toColor?: string;
  /** How much of it is drawn, 0 to 1, from `from`. 1 when unset. */
  grow?: number;
  /** Twist and bundle: the `fromColor` threads run through every hue instead. */
  rainbow?: boolean;
}

export type TendrilVariant = 'vine' | 'twist' | 'bundle';
export const TENDRIL_VARIANTS: readonly TendrilVariant[] = ['vine', 'twist', 'bundle'];

export interface TendrilSettings extends EffectSettings {
  /** The look: the `variant` attribute, `vine` unless it names another. */
  variant: TendrilVariant;
  /** Each tendril's colours as it draws them, the accent filled in, and its grow. */
  tendrils: { id: string; fromColor: string; toColor: string; grow: number }[];
}

/** Bends along the way, and how far each may stray, as a share of the length. */
const KNOTS = 6;
const WANDER = 0.14;
/** How far a bend sways through the loop, as a share of the length. */
const SWAY = 0.018;
/** Straight pieces between two points of the path, for the hand's wobble. */
const STEPS = 7;
/** The wobble, in CSS pixels. */
const WOBBLE_PX = 0.9;
/** The solid line's half-width, and the glow's at full glow, in CSS pixels. */
const CORE_PX = 1.1;
const GLOW_PX = 9;
/** The share of a tendril's length over which each end fades in. */
const FADE = 0.06;

/** The rope (twist, bundle): points along it, how far it bends (a share of its
 *  length, and at most this many pixels), and how fast its threads wind round
 *  through the loop (turns per loop). */
const ROPE_POINTS = 56;
const ROPE_BEND = 0.075;
const ROPE_BEND_PX = 42;
const ROPE_SPIN = 0.04;
/** Twist: the two threads' distance from the rope's middle, in CSS pixels, and
 *  how much further apart they spread at the ends. */
const TWIST_PX = 4;
const TWIST_SPREAD = 2.5;
/** Bundle: its threads, its half-width in CSS pixels, how wide it fans at `from`
 *  (at most, and as a share of the length). */
const BUNDLE_THREADS = 20;
const BUNDLE_PX = 7;
const BUNDLE_FAN_PX = 36;
const BUNDLE_FAN = 0.12;
/** Each bundle thread's share of a single line's light: its threads add up where they
 *  cross, and at full strength twenty of them burned into one solid band. */
const BUNDLE_LIGHT = 0.38;
/** Each look's line: the solid core's half-width, and the glow's at full glow. */
const LINE: Record<TendrilVariant, [number, number]> = {
  vine: [CORE_PX, GLOW_PX],
  twist: [1.0, 6],
  bundle: [0.55, 2.5],
};

/** Light adds up, as in the orbs and the rings. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

/** On the element: sized by the page, not square, and never in a touch's way. */
const STYLE = `
:host { aspect-ratio: auto; pointer-events: none; }
`;

/** A seed from an id: FNV-1a. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Numbers 0..1 from a seed, the same run every time. */
function random(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A vine's shape, independent of where its ends are: the path's corners
 *  as (along 0..1, across in lengths, sway's phase), and the wobble's waves. */
interface Shape {
  corners: [number, number, number][];
  wobble: [number, number, number][];
}

function shape(id: string): Shape {
  const r = random(hash(id));
  const corners: [number, number, number][] = [[0, 0, 0]];
  let across = 0;
  for (let i = 1; i <= KNOTS; i++) {
    const along = (i + (r() - 0.5) * 0.6) / (KNOTS + 1);
    const next = (r() * 2 - 1) * WANDER;
    const sway = r() * Math.PI * 2;
    // About half the bends are steps: the line runs on level, then jogs
    // sharply across, as a hand drawing a vine does.
    if (r() < 0.5) {
      corners.push([along - 0.035, across, sway], [along + 0.01, next, sway]);
    } else {
      corners.push([along, next, sway]);
    }
    across = next;
  }
  corners.push([1, 0, 0]);
  const wobble: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) wobble.push([20 + r() * 40, r() * Math.PI * 2, 1 / (i + 1)]);
  return { corners, wobble };
}

/** A rope's shape: its bend's waves as (cycles along it, phase, cycles per loop
 *  travelling along it, weight), each thread's place round it, how many times
 *  the threads wind round from end to end, and the bundle's swell. */
interface Rope {
  waves: [number, number, number, number][];
  threads: number[];
  turns: number;
  swell: [number, number];
}

function rope(id: string, count: number): Rope {
  const r = random(hash(id) ^ 0x2545f491);
  const tau = Math.PI * 2;
  const waves: [number, number, number, number][] = [
    [0.5 + 0.5 * r(), r() * tau, 0.05 + 0.05 * r(), 1],
    [1.2 + 0.6 * r(), r() * tau, -(0.06 + 0.06 * r()), 0.55],
    [2.2 + r(), r() * tau, 0.09 + 0.06 * r(), 0.3],
  ];
  const threads = Array.from({ length: count }, (_, j) => (j / count) * tau + (count > 2 ? (r() - 0.5) * 0.5 : 0));
  return { waves, threads, turns: 1.6 + 1.2 * r(), swell: [1 + r(), r() * tau] };
}

/** Every hue at full strength, 0 to 1 round the wheel, as sRGB. */
function hue(h: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return Math.min(1, Math.max(0, Math.abs(k - 3) - 1));
  };
  return [f(0), f(4), f(2)];
}

export class Tendrils extends LabkitEffect {
  #scene: Scene | null = null;
  #camera = new OrthographicCamera();
  #mesh: Mesh<BufferGeometry, RawShaderMaterial> | null = null;
  #tendrils: Tendril[] = [];
  #shapes = new Map<string, Shape>();
  #ropes = new Map<string, Rope>();
  #colour = new Color();
  #scratch = new Vector2();
  // The frame's ribbons, written by #ribbon and uploaded by draw.
  #pos: number[] = [];
  #side: number[] = [];
  #rgbs: number[] = [];
  #fade: number[] = [];
  #index: number[] = [];

  static get observedAttributes(): string[] {
    return ['variant'];
  }

  /** A new look draws a frame now, still or not. */
  attributeChangedCallback(): void {
    this.redraw();
  }

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.shadowRoot!.append(style);
  }

  /** The tendrils it draws. Setting the list draws one frame. */
  get tendrils(): Tendril[] {
    return this.#tendrils;
  }

  set tendrils(list: Tendril[]) {
    this.#tendrils = Array.isArray(list) ? [...list] : [];
    this.redraw();
  }

  /** The look: the `variant` attribute, `vine` unless it names another. */
  get variant(): TendrilVariant {
    const v = this.getAttribute('variant');
    return v === 'twist' || v === 'bundle' ? v : 'vine';
  }

  /** The base's settings, the look, and each tendril's colours. No canvas needed. */
  get settings(): TendrilSettings {
    const base = super.settings;
    return {
      ...base,
      variant: this.variant,
      tendrils: this.#tendrils.map((t) => ({
        id: t.id,
        fromColor: t.fromColor || base.accent,
        toColor: t.toColor || base.accent,
        grow: grown(t),
      })),
    };
  }

  #shape(id: string): Shape {
    let s = this.#shapes.get(id);
    if (!s) this.#shapes.set(id, (s = shape(id)));
    return s;
  }

  #rope(id: string, count: number): Rope {
    const key = `${id}|${count}`;
    let r = this.#ropes.get(key);
    if (!r) this.#ropes.set(key, (r = rope(id, count)));
    return r;
  }

  /** A CSS colour as the sRGB it was written in, as the other pieces take it. */
  #rgb(css: string): [number, number, number] {
    this.#colour.set(css || '#ffffff');
    const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    return [c.r, c.g, c.b];
  }

  protected create(): void {
    this.#scene = new Scene();
    this.#mesh = new Mesh(new BufferGeometry(), new RawShaderMaterial({
      vertexShader: tendrilVert, fragmentShader: tendrilFrag, ...ADD,
      uniforms: {
        uView: { value: [1, 1] }, uHalf: { value: 1 }, uCore: { value: CORE_PX }, uGlow: { value: 0 },
      },
    }));
    this.#mesh.frustumCulled = false;
    this.#scene.add(this.#mesh);
  }

  protected update(settings: EffectSettings): void {
    if (!this.#mesh) return;
    this.#mesh.material.uniforms.uGlow.value = settings.glow;
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#mesh) return;
    const loops = elapsed / Math.max(1, settings.pace.period);
    const variant = this.variant;
    const [core, glowPx] = LINE[variant];
    const u = this.#mesh.material.uniforms;
    u.uCore.value = core;
    u.uHalf.value = core + 1.5 + glowPx * settings.glow;
    const half = u.uHalf.value as number;

    this.#pos = []; this.#side = []; this.#rgbs = []; this.#fade = []; this.#index = [];
    for (const t of this.#tendrils) {
      const grow = grown(t);
      const length = Math.hypot(t.to[0] - t.from[0], t.to[1] - t.from[1]);
      if (!(length > 1) || grow <= 0) continue;
      if (variant === 'vine') this.#vine(t, grow, length, loops, half, settings.accent);
      else this.#threads(t, grow, length, loops, half, settings.accent, variant);
    }

    const pos = this.#pos, index = this.#index;
    this.#fill(this.#side.length, index.length);
    const g = this.#mesh.geometry;
    for (const [name, data] of [['position', pos], ['aSide', this.#side], ['aColor', this.#rgbs],
                                ['aFade', this.#fade]] as const) {
      const attr = g.getAttribute(name) as BufferAttribute;
      (attr.array as Float32Array).set(data);
      attr.needsUpdate = true;
    }
    (g.index!.array as Uint32Array).set(index);
    g.index!.needsUpdate = true;
    g.setDrawRange(0, index.length);

    const size = this.cssSize(this.#scratch);
    u.uView.value = [Math.max(1, size.x), Math.max(1, size.y)];
    renderer.render(this.#scene, this.#camera);
  }

  /** The hand-drawn vine. */
  #vine(t: Tendril, grow: number, length: number, loops: number, half: number, accent: string): void {
    const turn = (loops - Math.floor(loops)) * Math.PI * 2;
    const [ax, ay] = t.from;
    const ux = (t.to[0] - ax) / length, uy = (t.to[1] - ay) / length;
    const a = this.#rgb(t.fromColor || accent);
    const b = this.#rgb(t.toColor || accent);
    const { corners, wobble } = this.#shape(t.id);

    // The whole path as (along 0..1, across in pixels): each corner swayed,
    // each straight piece between corners cut into STEPS with the hand's
    // wobble added (none at the ends, which stay where the app put them).
    const whole: [number, number][] = [];
    for (let k = 0; k < corners.length; k++) {
      const [s, c, p] = corners[k];
      const end = k === 0 || k === corners.length - 1;
      whole.push([s, (c + (end ? 0 : SWAY * Math.sin(turn + p))) * length]);
    }
    const walked: [number, number][] = [];
    for (let k = 0; k < whole.length - 1; k++) {
      const [s0, c0] = whole[k], [s1, c1] = whole[k + 1];
      for (let j = 0; j < STEPS; j++) {
        const f = j / STEPS, s = s0 + (s1 - s0) * f;
        let w = 0;
        for (const [freq, phase, amp] of wobble) w += amp * Math.sin(s * freq + phase);
        walked.push([s, c0 + (c1 - c0) * f + w * WOBBLE_PX * Math.min(1, s * 20, (1 - s) * 20)]);
      }
    }
    walked.push(whole[whole.length - 1]);
    const path = upTo(walked, grow);
    if (path.length < 2) return;

    // Into pixels; the colour blends along the whole tendril, so a half-grown
    // one reaches only halfway to `toColor`.
    const pts = path.map(([s, c]) => [ax + ux * s * length - uy * c, ay + uy * s * length + ux * c]);
    const rgb = path.map(([s]) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]);
    const fade = path.map(([s]) => smooth(s / FADE) * smooth((grow - s) / FADE));
    this.#ribbon(pts, rgb, fade, half, [-uy, ux], 2);
  }

  /** Twist and bundle: threads winding round a smooth rope. */
  #threads(t: Tendril, grow: number, length: number, loops: number, half: number, accent: string,
           variant: 'twist' | 'bundle'): void {
    const tau = Math.PI * 2;
    const [ax, ay] = t.from;
    const ux = (t.to[0] - ax) / length, uy = (t.to[1] - ay) / length;
    const nx0 = -uy, ny0 = ux;
    const count = variant === 'twist' ? 2 : BUNDLE_THREADS;
    const r = this.#rope(t.id, count);
    const a = this.#rgb(t.fromColor || accent);
    const b = this.#rgb(t.toColor || accent);

    // The rope's middle: a few slow waves travelling along it, none at its ends.
    const n = Math.max(2, Math.round(ROPE_POINTS * grow));
    const bend = Math.min(ROPE_BEND * length, ROPE_BEND_PX);
    const weight = r.waves.reduce((sum, w) => sum + w[3], 0);
    const mid: [number, number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * grow;
      let across = 0;
      for (const [k, phase, rate, w] of r.waves) across += w * Math.sin(tau * (k * s - rate * loops) + phase);
      across *= (bend * Math.sin(Math.PI * s)) / weight;
      mid.push([s, ax + ux * s * length + nx0 * across, ay + uy * s * length + ny0 * across]);
    }
    // Each point's normal, across the rope there.
    const normals = mid.map((_, i) => {
      const p = mid[Math.max(0, i - 1)], q = mid[Math.min(mid.length - 1, i + 1)];
      const dx = q[1] - p[1], dy = q[2] - p[2], l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });

    for (let j = 0; j < count; j++) {
      const own = variant === 'twist' ? j === 0 : j % 2 === 0;
      const pts: number[][] = [], rgb: number[][] = [], fade: number[] = [];
      for (let i = 0; i < mid.length; i++) {
        const [s, x, y] = mid[i];
        const theta = r.threads[j] + tau * (r.turns * s + ROPE_SPIN * loops);
        let width: number;
        if (variant === 'twist') {
          width = TWIST_PX * (1 + TWIST_SPREAD * (1 - smooth(s / 0.15)) + TWIST_SPREAD * (1 - smooth((1 - s) / 0.15)));
        } else {
          const swell = 0.6 + 0.4 * Math.sin(tau * r.swell[0] * s + r.swell[1] + tau * 0.03 * loops);
          const fan = Math.min(BUNDLE_FAN_PX, length * BUNDLE_FAN) * (1 - smooth(s / 0.3)) ** 2;
          width = (BUNDLE_PX * swell + fan) * (0.25 + 0.75 * smooth((1 - s) / 0.12));
        }
        const across = width * Math.cos(theta);
        pts.push([x + normals[i][0] * across, y + normals[i][1] * across]);
        // In front brighter than behind, so the winding reads.
        const depth = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(theta));
        fade.push(smooth(s / FADE) * smooth((grow - s) / FADE) * depth * (variant === 'bundle' ? BUNDLE_LIGHT : 1));
        if (own && t.rainbow) {
          rgb.push(hue((variant === 'twist' ? s * 0.9 : j / count) + loops * 0.03));
        } else {
          rgb.push(own ? a : b);
        }
      }
      this.#ribbon(pts, rgb, fade, half, [nx0, ny0], 1.6);
    }
  }

  /** One ribbon down a line of points, either side of it: the corners mitred,
   *  each stretch capped at `cap` so a sharp turn does not throw a spike. */
  #ribbon(pts: number[][], rgb: number[][], fade: number[], half: number, fallback: [number, number],
          cap: number): void {
    const first = this.#pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
      let nx = 0, ny = 0, joined = 0;
      for (const [x0, y0, x1, y1] of [[q[0], q[1], p[0], p[1]], [p[0], p[1], n[0], n[1]]]) {
        const l = Math.hypot(x1 - x0, y1 - y0);
        if (l > 1e-6) { nx += -(y1 - y0) / l; ny += (x1 - x0) / l; joined++; }
      }
      const l = Math.hypot(nx, ny);
      if (l > 1e-6) { nx /= l; ny /= l; } else { [nx, ny] = fallback; }
      // The miter's stretch: 1 on a straight run, at most `cap` at a corner.
      const stretch = l > 1e-6 ? Math.min(cap, joined / l) : 1;
      for (const sgn of [-1, 1]) {
        this.#pos.push(p[0] + nx * half * stretch * sgn, p[1] + ny * half * stretch * sgn, 0);
        this.#side.push(sgn);
        this.#rgbs.push(rgb[i][0], rgb[i][1], rgb[i][2]);
        this.#fade.push(fade[i]);
      }
      if (i > 0) {
        const v = first + i * 2;
        this.#index.push(v - 2, v - 1, v, v - 1, v + 1, v);
      }
    }
  }

  /** Room in the mesh for this many vertices and indices. The buffers are
   *  written in place each frame, and only replaced (the old ones freed) when
   *  they are outgrown: a new buffer every frame would leave the old ones on
   *  the GPU until the renderer goes. */
  #fill(vertices: number, indices: number): void {
    const old = this.#mesh!.geometry;
    const room = old.getAttribute('aSide')?.count ?? -1;
    if (vertices <= room && indices <= (old.index?.count ?? 0)) return;
    const v = Math.max(256, vertices * 2), n = Math.max(1024, indices * 2);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(v * 3), 3));
    g.setAttribute('aSide', new BufferAttribute(new Float32Array(v), 1));
    g.setAttribute('aColor', new BufferAttribute(new Float32Array(v * 3), 3));
    g.setAttribute('aFade', new BufferAttribute(new Float32Array(v), 1));
    g.setIndex(new BufferAttribute(new Uint32Array(n), 1));
    old.dispose();
    this.#mesh!.geometry = g;
  }

  protected destroy(): void {
    this.#mesh?.geometry.dispose();
    this.#mesh?.material.dispose();
    this.#scene = this.#mesh = null;
  }
}

/** The part of a walked path (along 0..1, across) up to `grow`, ending exactly there. */
function upTo(walked: [number, number][], grow: number): [number, number][] {
  const path: [number, number][] = [];
  for (let i = 0; i < walked.length; i++) {
    if (walked[i][0] <= grow) { path.push(walked[i]); continue; }
    const [s0, c0] = walked[i - 1], [s1, c1] = walked[i];
    path.push([grow, c0 + (c1 - c0) * ((grow - s0) / Math.max(1e-6, s1 - s0))]);
    break;
  }
  return path;
}

/** A tendril's grow, 0 to 1; all of it when unset. */
function grown(t: Tendril): number {
  const g = t.grow ?? 1;
  return Number.isFinite(g) ? Math.min(1, Math.max(0, g)) : 1;
}

/** 0 to 1, eased, clamped. */
function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
