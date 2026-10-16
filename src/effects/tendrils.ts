/**
 * `<labkit-tendrils>`: hand-drawn vines between points, over a transparent
 * background. ONE element draws every tendril, so an app that lays it behind
 * its orbs pays one WebGL context however many tendrils it has.
 *
 * An app gives it a list on its `tendrils` property: each one runs from `from`
 * to `to` (CSS pixels inside the element), its colour blending along it from
 * `fromColor` to `toColor` (the theme's `--accent` where either is unset), with
 * `grow` 0 to 1 of it drawn, so the app can grow one in. Setting the list draws
 * one frame through the base's `redraw()`, so an app may move the ends every
 * frame while the element's own loop stays stopped under calm and off.
 *
 * The look, `variant="vine"` and the only one so far: a line that wanders,
 * kinks and steps on its way, rather than running straight or curving smoothly.
 * The wander is seeded by the tendril's `id`, so it keeps its shape from frame
 * to frame and as its ends move. It sways a little once per loop of the theme's
 * pace and holds still under calm and off; its glow is the theme's `--glow`.
 *
 * Size and position come from the page: unlike the orbs it is not square, so
 * lay it over its parent with `position: absolute; inset: 0`.
 *
 * Each path is walked here, in pixels, into one ribbon mesh for every tendril;
 * the shaders only colour it. Shaders are plain GLSL in shaders/, through
 * RawShaderMaterial, with no three.js chunk included.
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
}

export interface TendrilSettings extends EffectSettings {
  /** The one look so far. */
  variant: 'vine';
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

/** A tendril's shape, independent of where its ends are: the path's corners
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

export class Tendrils extends LabkitEffect {
  #scene: Scene | null = null;
  #camera = new OrthographicCamera();
  #mesh: Mesh<BufferGeometry, RawShaderMaterial> | null = null;
  #tendrils: Tendril[] = [];
  #shapes = new Map<string, Shape>();
  #colour = new Color();
  #scratch = new Vector2();

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

  /** The base's settings, the look, and each tendril's colours. No canvas needed. */
  get settings(): TendrilSettings {
    const base = super.settings;
    return {
      ...base,
      variant: 'vine',
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
    const u = this.#mesh.material.uniforms;
    u.uGlow.value = settings.glow;
    u.uHalf.value = CORE_PX + 1.5 + GLOW_PX * settings.glow;
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#mesh) return;
    const loops = elapsed / Math.max(1, settings.pace.period);
    const turn = (loops - Math.floor(loops)) * Math.PI * 2;
    const half = this.#mesh.material.uniforms.uHalf.value as number;

    const pos: number[] = [], side: number[] = [], colour: number[] = [], fade: number[] = [];
    const index: number[] = [];
    for (const t of this.#tendrils) {
      const grow = grown(t);
      const [ax, ay] = t.from, [bx, by] = t.to;
      const dx = bx - ax, dy = by - ay;
      const length = Math.hypot(dx, dy);
      if (!(length > 1) || grow <= 0) continue;
      const ux = dx / length, uy = dy / length;
      const a = this.#rgb(t.fromColor || settings.accent);
      const b = this.#rgb(t.toColor || settings.accent);
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
      // Only the grown part, ending exactly at `grow`.
      const path: [number, number][] = [];
      for (let i = 0; i < walked.length; i++) {
        if (walked[i][0] <= grow) { path.push(walked[i]); continue; }
        const [s0, c0] = walked[i - 1], [s1, c1] = walked[i];
        path.push([grow, c0 + (c1 - c0) * ((grow - s0) / Math.max(1e-6, s1 - s0))]);
        break;
      }
      if (path.length < 2) continue;

      // Into pixels, then a ribbon either side: the corners mitred, capped so
      // a sharp step does not throw a spike.
      const pts = path.map(([s, c]) => [ax + ux * s * length - uy * c, ay + uy * s * length + ux * c]);
      const first = pos.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
        let nx = 0, ny = 0, joined = 0;
        for (const [x0, y0, x1, y1] of [[q[0], q[1], p[0], p[1]], [p[0], p[1], n[0], n[1]]]) {
          const l = Math.hypot(x1 - x0, y1 - y0);
          if (l > 1e-6) { nx += -(y1 - y0) / l; ny += (x1 - x0) / l; joined++; }
        }
        const l = Math.hypot(nx, ny);
        if (l > 1e-6) { nx /= l; ny /= l; } else { nx = -uy; ny = ux; }
        // The miter's stretch: 1 on a straight run, at most 2 at a corner.
        const stretch = l > 1e-6 ? Math.min(2, joined / l) : 1;
        const s = path[i][0];
        const soft = smooth(s / FADE) * smooth((grow - s) / FADE);
        for (const sgn of [-1, 1]) {
          pos.push(p[0] + nx * half * stretch * sgn, p[1] + ny * half * stretch * sgn, 0);
          side.push(sgn);
          // The colour blends along the whole tendril, so a half-grown one
          // reaches only halfway to `toColor`.
          colour.push(a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s);
          fade.push(soft);
        }
        if (i > 0) {
          const v = first + i * 2;
          index.push(v - 2, v - 1, v, v - 1, v + 1, v);
        }
      }
    }

    this.#fill(side.length, index.length);
    const g = this.#mesh.geometry;
    for (const [name, data] of [['position', pos], ['aSide', side], ['aColor', colour], ['aFade', fade]] as const) {
      const attr = g.getAttribute(name) as BufferAttribute;
      (attr.array as Float32Array).set(data);
      attr.needsUpdate = true;
    }
    (g.index!.array as Uint32Array).set(index);
    g.index!.needsUpdate = true;
    g.setDrawRange(0, index.length);

    const size = renderer.getSize(this.#scratch);
    this.#mesh.material.uniforms.uView.value = [Math.max(1, size.x), Math.max(1, size.y)];
    renderer.render(this.#scene, this.#camera);
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
