/**
 * `<labkit-dials>`: flat dials round an orb, facing the viewer (#56), like an
 * interface drawn round it. Five concentric dials, each in segments with gaps:
 * one ruled with fine ticks inward, one in dashes and partly doubled, one a
 * hairline that ends in a run of short heavy bars, one a ruler with ticks
 * outward, and an outer one in a few long arcs, partly doubled. Small bright
 * marks ride three of them.
 *
 * It frames an orb exactly as `<labkit-orbit-rings>` does, with the same style:
 * an orb inside sits in the middle at ORB_SHARE of the dials' width, the
 * background is transparent, and with no orb inside it is the dials alone.
 * Where a dial passes under the orb's disc (the innermost one's ticks do) it is
 * dimmer, so it reads as behind the orb.
 *
 *     <labkit-dials><labkit-filament-orb></labkit-filament-orb></labkit-dials>
 *
 * In the theme's accent, glowing as strongly as its `--glow` (a ribbon's halo,
 * and the shared bloom over it). Nothing spins: each dial turns once in 28 to
 * 58 loops of the theme's pace (pace.ts), some one way and some the other, its
 * marks sliding a little faster along it, and each dial brightens on its own
 * irregular pulses (drift.ts). Under calm and off it holds still, as every
 * piece does.
 *
 * The look, after the owner's private references (layered flat interface rings
 * round a glowing core; an orb ringed by concentric circles with bright points
 * on them): segments and gaps, dense ruler ticks, short heavy blocks, a second
 * line along part of a ring, and a few bright points riding.
 *
 * Every dial is walked here, in CSS pixels, into one ribbon mesh drawn with the
 * tendrils' own shaders, which only place and colour it.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, Mesh, OneFactor, OrthographicCamera,
  RawShaderMaterial, Scene, SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import { Bloom } from './bloom';
import { pulseAt } from './drift';
import { FRAME_STYLE, ORB_DISC, ORB_SHARE } from './orbit-rings';
import tendrilVert from './shaders/tendril.vert.glsl?raw';
import tendrilFrag from './shaders/tendril.frag.glsl?raw';

/** One dial. Radii and lengths are shares of the element's half-width; spans
 *  are [from, to] in turns, from the top, clockwise. */
interface Dial {
  radius: number;
  /** Loops of the pace for one turn; negative turns it the other way. */
  lap: number;
  /** The spans its line is lit. */
  arcs: [number, number][];
  /** A tick every `every` of a turn along its arcs, `length` long, outward or
   *  inward, every `long`th one twice as long. */
  ticks?: { every: number; length: number; out: boolean; long: number };
  /** Where a second line runs beside it, and how far out (negative: in). */
  double?: { spans: [number, number][]; gap: number };
  /** Short heavy bars on the line. */
  bars?: [number, number][];
  /** Where its riding marks start, in turns. */
  riders?: number[];
}

/** Twelve dashes with a short gap after each. */
const DASHES = Array.from({ length: 12 }, (_, i): [number, number] => [i / 12 + 0.004, (i + 1) / 12 - 0.014]);

const DIALS: Dial[] = [
  { radius: 0.5, lap: 34, arcs: [[0.02, 0.31], [0.35, 0.64], [0.69, 0.97]],
    ticks: { every: 1 / 120, length: 0.032, out: false, long: 5 } },
  { radius: 0.61, lap: -48, arcs: DASHES, double: { spans: [[0.1, 0.42]], gap: -0.022 }, riders: [0.2] },
  { radius: 0.71, lap: 28, arcs: [[0, 0.58]],
    bars: [[0.62, 0.66], [0.68, 0.7], [0.72, 0.8], [0.84, 0.86], [0.9, 0.97]] },
  { radius: 0.82, lap: -40, arcs: [[0.05, 0.75]],
    ticks: { every: 1 / 180, length: 0.022, out: true, long: 6 }, riders: [0.4, 0.85] },
  { radius: 0.93, lap: 58, arcs: [[0.1, 0.22], [0.3, 0.33], [0.55, 0.82]],
    double: { spans: [[0.6, 0.75]], gap: -0.02 }, riders: [0.15] },
];

/** A mark goes round its dial this much faster than the dial turns. */
const RIDER_SPEED = 1.35;
/** How long a mark is, in turns, and how many hairlines thick. */
const RIDER_SPAN = 0.012;
const RIDER_LINES = 5;
/** Hairlines in a heavy bar, and the step between them in CSS pixels. */
const BAR_LINES = 4;
const LINE_STEP_PX = 1;
/** Points per turn along an arc. */
const STEPS = 360;
/** How bright each part is before its dial's pulse: the line, a tick, a long
 *  tick, a bar, a mark. A pulse brightens a dial by up to PULSE of that. */
const LINE_LIGHT = 0.6;
const TICK_LIGHT = 0.42;
const LONG_LIGHT = 0.6;
const BAR_LIGHT = 0.7;
const RIDER_LIGHT = 1;
const PULSE = 0.35;
/** Brightness under the orb's disc, against 1 outside it. */
const UNDER = 0.3;
/** The hairline's half-width and the glow's at full glow, in CSS pixels. */
const CORE_PX = 0.7;
const GLOW_PX = 5;
/** Each dial's pulses are its own: this seed plus its place. */
const SEED = 5611;

/** Light adds up, as in the other pieces. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

export interface DialsSettings extends EffectSettings {
  /** Each dial: its radius (a share of the half-width) and its lap, the loops
   *  of the pace for one turn, negative for the other way. */
  dials: { radius: number; lap: number }[];
}

export class Dials extends LabkitEffect {
  #scene: Scene | null = null;
  #camera = new OrthographicCamera();
  #mesh: Mesh<BufferGeometry, RawShaderMaterial> | null = null;
  #bloom: Bloom | null = null;
  #slot: HTMLSlotElement;
  #colour = new Color();
  #rgb: [number, number, number] = [1, 1, 1];
  #scratch = new Vector2();

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = FRAME_STYLE;
    this.#slot = document.createElement('slot');
    // An orb put in or taken out changes what the dials dim behind it.
    this.#slot.addEventListener('slotchange', () => this.redraw());
    this.shadowRoot!.append(style, this.#slot);
  }

  /** The base's settings, and each dial's radius and lap. No canvas needed. */
  get settings(): DialsSettings {
    return { ...super.settings, dials: DIALS.map((d) => ({ radius: d.radius, lap: d.lap })) };
  }

  /** The orb's disc, as a share of the half-width, or 0 when none is inside. */
  get #hole(): number {
    return this.#slot.assignedElements().length ? ORB_SHARE * ORB_DISC : 0;
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
    // As the other pieces: the shaders take the accent as the sRGB the theme wrote.
    this.#colour.set(settings.accent || '#ffffff');
    const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    this.#rgb = [c.r, c.g, c.b];
    if (!this.#mesh) return;
    const u = this.#mesh.material.uniforms;
    u.uGlow.value = settings.glow;
    u.uHalf.value = CORE_PX + 1.5 + GLOW_PX * settings.glow;
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#mesh) return;
    const loops = elapsed / Math.max(1, settings.pace.period);
    const size = this.cssSize(this.#scratch);
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const cx = w / 2, cy = h / 2, unit = Math.min(w, h) / 2;
    const half = this.#mesh.material.uniforms.uHalf.value as number;
    const hole = this.#hole;
    const rgb = this.#rgb;

    const pos: number[] = [], side: number[] = [], colour: number[] = [], fade: number[] = [];
    const index: number[] = [];
    /** A point `r` from the middle (in half-widths) at `turn` from the top. */
    const at = (r: number, turn: number, light: number): [number, number, number] => {
      const a = (turn - 0.25) * Math.PI * 2;
      return [cx + Math.cos(a) * r * unit, cy + Math.sin(a) * r * unit,
              Math.min(1, light * (r < hole ? UNDER : 1))];
    };
    /** One ribbon through these points. */
    const strip = (pts: [number, number, number][]) => {
      const first = side.length;
      for (let i = 0; i < pts.length; i++) {
        const q = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
        const dx = n[0] - q[0], dy = n[1] - q[1], l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l;
        for (const sgn of [-1, 1]) {
          pos.push(pts[i][0] + nx * half * sgn, pts[i][1] + ny * half * sgn, 0);
          side.push(sgn);
          colour.push(...rgb);
          fade.push(pts[i][2]);
        }
        if (i > 0) {
          const v = first + i * 2;
          index.push(v - 2, v - 1, v, v - 1, v + 1, v);
        }
      }
    };
    /** An arc from `from` to `to` turns, `lines` hairlines thick, centred on `r`. */
    const arc = (r: number, from: number, to: number, light: number, lines = 1) => {
      const n = Math.max(2, Math.ceil((to - from) * STEPS) + 1);
      for (let k = 0; k < lines; k++) {
        const rk = r + ((k - (lines - 1) / 2) * LINE_STEP_PX) / unit;
        strip(Array.from({ length: n }, (_, i) => at(rk, from + ((to - from) * i) / (n - 1), light)));
      }
    };

    DIALS.forEach((d, k) => {
      const turned = loops / d.lap;
      const light = 1 + PULSE * Math.min(1, pulseAt(settings.pace, loops, SEED + k).level);
      for (const [a, b] of d.arcs) arc(d.radius, a + turned, b + turned, LINE_LIGHT * light);
      if (d.double) {
        for (const [a, b] of d.double.spans) {
          arc(d.radius + d.double.gap, a + turned, b + turned, LINE_LIGHT * 0.8 * light);
        }
      }
      for (const [a, b] of d.bars ?? []) arc(d.radius, a + turned, b + turned, BAR_LIGHT * light, BAR_LINES);
      if (d.ticks) {
        const { every, length, out, long } = d.ticks;
        for (const [a, b] of d.arcs) {
          for (let i = Math.ceil(a / every); i * every <= b; i++) {
            const big = i % long === 0;
            const len = (big ? 2 : 1) * length * (out ? 1 : -1);
            const t = i * every + turned, l = (big ? LONG_LIGHT : TICK_LIGHT) * light;
            strip([at(d.radius, t, l), at(d.radius + len, t, l)]);
          }
        }
      }
      for (const start of d.riders ?? []) {
        const t = start + turned * RIDER_SPEED;
        arc(d.radius, t, t + RIDER_SPAN, RIDER_LIGHT, RIDER_LINES);
      }
    });

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

    this.#mesh.material.uniforms.uView.value = [w, h];
    this.#bloom ??= new Bloom();
    const d = this.drawingSize(this.#scratch);
    this.#bloom.render(renderer, this.#scene, this.#camera, settings.glow * 0.9, d.x, d.y, this.pixelRatio);
  }

  /** Room in the mesh for this many vertices and indices, replaced (the old
   *  freed) only when outgrown, as the tendrils do. */
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
    this.#bloom?.dispose();
    this.#scene = this.#mesh = this.#bloom = null;
  }
}
