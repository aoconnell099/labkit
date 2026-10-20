/**
 * `<labkit-star-dust>`: a field of fine points over a transparent background,
 * for a dark, starlit page to lay behind everything else on it.
 *
 * Nearly all of the points are dust, pinpoints most of them barely there; some
 * are middling and a very few bright. They are the theme's ink (`--text`), each
 * leaning a little toward `--accent` (a few lean warm, rose or violet instead),
 * and the bright ones carry a halo as strong as the theme's `--glow`. Two in
 * five gather along a band, a diagonal across the field like the galaxy's plane
 * in a night photograph, wrapping with it. The field drifts slowly,
 * a little of the element's width once per loop of the theme's pace, and holds
 * still under calm and off.
 *
 * Each point twinkles at its own pace: its light swells and dims on two waves
 * of its own, and catches brighter for a moment near the top of a swell. The
 * faint ones twinkle deepest. Every twinkle is a whole number of cycles in
 * TWINKLE_LOOPS loops, so it never jumps, however long the page stays open.
 *
 * Now and then a shooting star crosses it: a bright head with a fading tail,
 * down and across, gone in under a second, about once a minute at Cold core's
 * pace and never on a schedule you can see. When it comes is a pure function of
 * the time, like the rest of the motion. An app can send one now with
 * `shoot()`; `shooting` says whether the last frame drew one. None cross under
 * calm and off.
 *
 * Every point has a nearness, and nearer points move further: they drift
 * faster, and they shift further when the app sets `offset`, `[x, y]` in CSS
 * pixels (a point at full nearness moves by all of it, the farthest by a
 * fifth). An app moves it as its camera moves, for depth. Setting it draws one
 * frame through the base's `redraw()`, so it follows the camera under calm and
 * off too, while the element's own loop stays stopped.
 *
 * The field wraps at the element's edges, so drift and offset never uncover a
 * bare strip. Its points are seeded, so a page shows the same sky each visit;
 * how many are drawn follows the element's area.
 *
 * Size and position come from the page, as with the tendrils: lay it over its
 * parent with `position: absolute; inset: 0`.
 *
 * Shaders are plain GLSL in shaders/, through RawShaderMaterial, with no
 * three.js chunk included.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, DoubleSide, Mesh, OneFactor,
  OrthographicCamera, Points, RawShaderMaterial, Scene, SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import starVert from './shaders/star.vert.glsl?raw';
import starFrag from './shaders/star.frag.glsl?raw';
import meteorVert from './shaders/meteor.vert.glsl?raw';
import meteorFrag from './shaders/meteor.frag.glsl?raw';
import { Sky, skyKind, STRAND_COLOURS, type SkyKind, type StrandOrigin } from './sky';

export interface StarDustSettings extends EffectSettings {
  /** The theme's `--text`, as the theme wrote it: the points' colour. */
  ink: string;
  /** The app's offset, in CSS pixels. */
  offset: [number, number];
  /** The `sky` attribute (sky.ts), or null for none. */
  sky: SkyKind | null;
  /** Where the colourful sky's strands start: the `strands` attribute, `below` unless `band`. */
  strands: StrandOrigin;
}

/** The most points it ever draws, and the CSS pixels of area per point. */
const MAX_STARS = 12000;
const AREA_PER_STAR = 160;
/** The share of the points that are bright, with a halo, and that are middling.
 *  The rest are dust: pinpoints, most of them barely there. */
const BRIGHT = 0.012;
const MIDDLING = 0.07;
/** The share that gather along the band, a diagonal across the field, as in a
 *  photograph of the galaxy's plane: where it crosses (x + y, wrapping) and how
 *  wide it spreads (one standard deviation, in shares of the field). */
const IN_BAND = 0.4;
const BAND_AT = 0.37;
const BAND_SPREAD = 0.07;
/** How each sky lays the field (the owner, 2026-10-20, after their photographs): every sky
 *  moves it so the band crosses the middle (x + y from BAND_AT to 1, wrapping, so through
 *  the centre); deep blue and violet mirror it, so their band runs from top left to bottom
 *  right as in theirs, and the colourful one keeps it bottom left to top right. With no sky
 *  the field is as it always was. `stars` is how many more points it draws: the deep blue
 *  photographs are thick with them. */
const LAY = (1 - BAND_AT) / 2;
const SKY_LAYS: Record<SkyKind, { flip: boolean; stars: number }> = {
  'deep-blue': { flip: true, stars: 1.5 },
  violet: { flip: true, stars: 1 },
  colourful: { flip: false, stars: 1 },
};
/** A few points lean warm, rose or violet instead of toward the accent: the
 *  colour, as sRGB, and the share of the points. */
const SHADES: readonly [[number, number, number], number][] = [
  [[1, 0.78, 0.55], 0.06],
  [[1, 0.7, 0.85], 0.04],
  [[0.78, 0.68, 1], 0.05],
];
/** How far the nearest points drift in one loop, as a share of the element. */
const DRIFT = 0.015;
/** The drift's direction: mostly across, a little down. */
const DRIFT_DIR = [0.94, 0.34] as const;
/** Nearness comes in tenths from 0.2 to 1, and the drift wraps at 10, so a
 *  wrap moves every point by a whole field: no jump, however long it runs. */
const NEAR_STEPS = 10;
const DRIFT_WRAP = 10;
/** The twinkle's loop, in loops of the pace: 34.8 s at Cold core. Each point's
 *  two waves run a whole number of cycles in it, 6 to 15 and 9 to 22, so a
 *  point swells every 2.3 to 5.8 s there. */
const TWINKLE_LOOPS = 4;

/** Shooting stars: the time is cut into slots of SLOT_LOOPS loops, and each
 *  slot holds one with this chance, at a seeded moment inside it. 17.4 s slots
 *  at Cold core, so one about every minute. */
const SLOT_LOOPS = 2;
const CHANCE = 0.3;
const METEOR_SEED = 0x5ca7;
/** One crossing lasts this share of a loop, at least and at most: 0.6 to 0.9 s
 *  at Cold core. */
const METEOR_DUR = [0.07, 0.1] as const;

/** Light adds up, as in the other pieces. */
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

/** The whole field, MAX_STARS points in a random order, so any first n of them
 *  are spread as evenly as all of them. */
function field(): BufferGeometry {
  const r = random(0x5eed);
  // The twinkle has its own run, so a point's place and brightness don't hang on it.
  const tw = random(0x7a1e);
  const pos = new Float32Array(MAX_STARS * 3);
  const near = new Float32Array(MAX_STARS);
  const bright = new Float32Array(MAX_STARS);
  const touch = new Float32Array(MAX_STARS);
  const twinkle = new Float32Array(MAX_STARS * 4);
  const shade = new Float32Array(MAX_STARS * 4);
  for (let i = 0; i < MAX_STARS; i++) {
    if (r() < IN_BAND) {
      // Along the band, spread across it on a bell curve: x + y stays near
      // BAND_AT, and both wrap, so the band wraps with the field.
      const along = r();
      const across = BAND_SPREAD * Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
      pos[i * 3] = (((along + across / 2) % 1) + 1) % 1;
      pos[i * 3 + 1] = (((BAND_AT - along + across / 2) % 1) + 1) % 1;
    } else {
      pos[i * 3] = r();
      pos[i * 3 + 1] = r();
    }
    // Far points outnumber near ones.
    near[i] = (2 + Math.floor(r() * r() * (NEAR_STEPS - 1))) / NEAR_STEPS;
    const kind = r();
    const lit = kind < BRIGHT;
    if (lit) {
      bright[i] = 0.7 + 0.3 * r();
      touch[i] = 0.3 + 0.3 * r();
    } else if (kind < BRIGHT + MIDDLING) {
      bright[i] = 0.32 + 0.26 * r();
      touch[i] = 0.2 + 0.35 * r();
    } else {
      // Dust: most of it at the faint end, but never so faint the grain is lost.
      const b = r();
      bright[i] = 0.13 + 0.27 * b * b;
      touch[i] = 0.1 + 0.35 * r();
    }
    // A few lean warm, rose or violet; the rest keep the ink and accent.
    let pick = r();
    for (const [rgb, share] of SHADES) {
      if (pick < share) {
        shade.set([...rgb, 0.35 + 0.35 * r()], i * 4);
        break;
      }
      pick -= share;
    }
    // Two waves, whole cycles per twinkle loop; a phase; how deep it dims.
    twinkle[i * 4] = 6 + Math.floor(tw() * 10);
    twinkle[i * 4 + 1] = 9 + Math.floor(tw() * 14);
    twinkle[i * 4 + 2] = tw() * Math.PI * 2;
    twinkle[i * 4 + 3] = lit ? 0.15 + 0.2 * tw() : 0.4 + 0.4 * tw();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aNear', new BufferAttribute(near, 1));
  g.setAttribute('aBright', new BufferAttribute(bright, 1));
  g.setAttribute('aTouch', new BufferAttribute(touch, 1));
  g.setAttribute('aTwinkle', new BufferAttribute(twinkle, 4));
  g.setAttribute('aShade', new BufferAttribute(shade, 4));
  return g;
}

/** One crossing: when it starts, where, which way it goes, how far and for how long. */
interface Crossing {
  at: number;
  dur: number;
  from: [number, number];
  dir: [number, number];
  length: number;
}

/** A crossing from a seeded run, sized to the element: down and across, a
 *  quarter to nearly half the element's shorter side. */
function crossing(rnd: () => number, at: number, period: number, w: number, h: number): Crossing {
  const dur = (METEOR_DUR[0] + (METEOR_DUR[1] - METEOR_DUR[0]) * rnd()) * period;
  const from: [number, number] = [(0.1 + 0.8 * rnd()) * w, (0.05 + 0.5 * rnd()) * h];
  const angle = ((15 + 35 * rnd()) * Math.PI) / 180;
  const side = rnd() < 0.5 ? -1 : 1;
  const length = Math.min(420, Math.max(90, (0.25 + 0.2 * rnd()) * Math.min(w, h)));
  return { at, dur, from, dir: [side * Math.cos(angle), Math.sin(angle)], length };
}

/** The quad one crossing is drawn on: x along it (0 the tail, 1 past the head),
 *  y across it (-1 to 1). */
function strip(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([
    0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0,
  ]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

export class StarDust extends LabkitEffect {
  #scene: Scene | null = null;
  #camera = new OrthographicCamera();
  #points: Points<BufferGeometry, RawShaderMaterial> | null = null;
  /** The slot's crossing and one sent by `shoot()`, at most one of each at once. */
  #meteors: Mesh<BufferGeometry, RawShaderMaterial>[] = [];
  #offset: [number, number] = [0, 0];
  #colour = new Color();
  #scratch = new Vector2();
  #shot: Crossing | null = null;
  #shotSeed = 0;
  #pending = false;
  #shooting = false;
  #sky: Sky | null = null;
  #strandColours: string[] = [...STRAND_COLOURS];

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.shadowRoot!.append(style);
  }

  /** How far the app's camera has moved, in CSS pixels. Setting it draws one frame. */
  get offset(): [number, number] {
    return [...this.#offset];
  }

  set offset(value: [number, number]) {
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    this.#offset = Array.isArray(value) ? [n(value[0]), n(value[1])] : [0, 0];
    this.redraw();
  }

  static get observedAttributes(): string[] {
    return ['sky', 'strands'];
  }

  /** A new sky or strand origin draws a frame now, still or not. */
  attributeChangedCallback(): void {
    this.redraw();
  }

  /** The colourful sky's strands' colours, CSS colours taken in turn (sky.ts's
   *  STRAND_COLOURS until set). Setting it draws a frame. */
  get strandColours(): string[] {
    return [...this.#strandColours];
  }

  set strandColours(value: string[]) {
    this.#strandColours = Array.isArray(value) ? value.filter((c) => typeof c === 'string' && c) : [];
    this.redraw();
  }

  /** Whether the last frame drew the sky its `sky` attribute asks for (false with none). */
  get skyReady(): boolean {
    return !!this.#sky?.ready;
  }

  /** Whether the last frame drew a shooting star. */
  get shooting(): boolean {
    return this.#shooting;
  }

  /** Send a shooting star across from the next frame. False, and none, under
   *  calm and off. */
  shoot(): boolean {
    if (this.settings.pace.level !== 'full') return false;
    this.#pending = true;
    return true;
  }

  /** The base's settings, the ink, and the offset. No canvas needed. */
  get settings(): StarDustSettings {
    const base = super.settings;
    return {
      ...base,
      ink: getComputedStyle(this).getPropertyValue('--text').trim(),
      offset: this.offset,
      sky: skyKind(this.getAttribute('sky')),
      strands: this.getAttribute('strands') === 'band' ? 'band' : 'below',
    };
  }

  /** A CSS colour as the sRGB it was written in, as the other pieces take it. */
  #rgb(css: string): [number, number, number] {
    this.#colour.set(css || '#ffffff');
    const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    return [c.r, c.g, c.b];
  }

  protected create(): void {
    this.#scene = new Scene();
    this.#points = new Points(field(), new RawShaderMaterial({
      vertexShader: starVert, fragmentShader: starFrag, ...ADD,
      uniforms: {
        uView: { value: [1, 1] }, uPixelRatio: { value: 1 }, uDrift: { value: [0, 0] },
        uOffset: { value: [0, 0] }, uGlow: { value: 0 }, uTwinkle: { value: 0 },
        uInk: { value: [1, 1, 1] }, uAccent: { value: [1, 1, 1] }, uLay: { value: [0, 0] }, uFlip: { value: 0 },
      },
    }));
    this.#points.frustumCulled = false;
    this.#scene.add(this.#points);
    // The sky goes under the stars (its pieces' renderOrder is below theirs).
    this.#sky = new Sky(this.#scene, BAND_AT);
    const g = strip();
    for (let i = 0; i < 2; i++) {
      const m = new Mesh(g, new RawShaderMaterial({
        // Either side faces the camera: which way the quad winds depends on where it goes.
        vertexShader: meteorVert, fragmentShader: meteorFrag, ...ADD, side: DoubleSide,
        uniforms: {
          uView: { value: [1, 1] }, uOffset: { value: [0, 0] }, uHead: { value: [0, 0] },
          uTail: { value: [0, 0] }, uHalf: { value: 1 }, uLen: { value: 1 }, uFade: { value: 0 },
          uGlow: { value: 0 }, uColour: { value: [1, 1, 1] },
        },
      }));
      m.frustumCulled = false;
      m.visible = false;
      this.#meteors.push(m);
      this.#scene.add(m);
    }
  }

  protected update(settings: EffectSettings): void {
    if (!this.#points) return;
    const u = this.#points.material.uniforms;
    u.uGlow.value = settings.glow;
    u.uInk.value = this.#rgb(getComputedStyle(this).getPropertyValue('--text').trim());
    u.uAccent.value = this.#rgb(settings.accent);
    // A crossing is the bright stars' colour: the ink, leaning toward the accent.
    const ink = u.uInk.value as number[], accent = u.uAccent.value as number[];
    const colour = ink.map((v, i) => v + (accent[i] - v) * 0.35);
    for (const m of this.#meteors) {
      m.material.uniforms.uGlow.value = settings.glow;
      m.material.uniforms.uColour.value = colour;
    }
  }

  /** The slot's crossing at `elapsed`, or null when its slot has none. */
  #scheduled(elapsed: number, period: number, w: number, h: number): Crossing | null {
    const slot = SLOT_LOOPS * period;
    const n = Math.floor(elapsed / slot);
    const rnd = random(METEOR_SEED + Math.imul(n, 7919));
    if (rnd() >= CHANCE) return null;
    const at = rnd();
    const c = crossing(rnd, 0, period, w, h);
    c.at = n * slot + at * (slot - c.dur);
    return c;
  }

  /** Lay a crossing on its quad at `elapsed`; false when it isn't crossing now. */
  #place(m: Mesh<BufferGeometry, RawShaderMaterial>, c: Crossing | null, elapsed: number,
         w: number, h: number): boolean {
    const p = c ? (elapsed - c.at) / c.dur : -1;
    m.visible = !!c && p >= 0 && p < 1;
    if (!c || !m.visible) return false;
    const u = m.material.uniforms;
    // The head runs the whole length; the tail grows behind it, never past the start.
    const run = c.length * p;
    const tail = Math.min(run, c.length * 0.45 * Math.min(1, p / 0.35));
    const head: [number, number] = [c.from[0] + c.dir[0] * run, c.from[1] + c.dir[1] * run];
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const glow = u.uGlow.value as number;
    u.uView.value = [w, h];
    // Far off, like the faint stars: half the camera's move.
    u.uOffset.value = [this.#offset[0] * 0.5, this.#offset[1] * 0.5];
    u.uHead.value = head;
    u.uTail.value = [head[0] - c.dir[0] * tail, head[1] - c.dir[1] * tail];
    u.uLen.value = Math.max(0.001, tail);
    u.uHalf.value = 3 * (2.5 + 3 * glow);
    u.uFade.value = smooth(0, 0.12, p) * (1 - smooth(0.55, 1, p));
    return true;
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#points) return;
    const u = this.#points.material.uniforms;
    const size = this.cssSize(this.#scratch);
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const period = Math.max(1, settings.pace.period);
    const along = (elapsed / period) * DRIFT;
    const wrap = (x: number) => x - Math.floor(x / DRIFT_WRAP) * DRIFT_WRAP;
    u.uView.value = [w, h];
    u.uPixelRatio.value = this.pixelRatio;
    // Across in shares of the width, down in shares of the height scaled to
    // match, so the drift keeps its direction on a wide element. Each wraps
    // on its own.
    u.uDrift.value = [wrap(along * DRIFT_DIR[0]), wrap(along * DRIFT_DIR[1] * (w / h))];
    u.uOffset.value = [this.#offset[0], this.#offset[1]];
    const loop = elapsed / (period * TWINKLE_LOOPS);
    u.uTwinkle.value = (loop - Math.floor(loop)) * Math.PI * 2;
    const kind = skyKind(this.getAttribute('sky'));
    const lay = kind ? SKY_LAYS[kind] : null;
    u.uLay.value = lay ? [LAY, LAY] : [0, 0];
    u.uFlip.value = lay?.flip ? 1 : 0;
    this.#points.geometry.setDrawRange(0, Math.min(MAX_STARS, Math.ceil((w * h * (lay?.stars ?? 1)) / AREA_PER_STAR)));

    // Shooting stars only while the loop runs: a still frame never holds one.
    const full = settings.pace.level === 'full';
    if (full && this.#pending) {
      this.#pending = false;
      this.#shot = crossing(random(METEOR_SEED ^ Math.imul(++this.#shotSeed, 104729)), elapsed, period, w, h);
    }
    const [slotMesh, shotMesh] = this.#meteors;
    const a = this.#place(slotMesh, full ? this.#scheduled(elapsed, period, w, h) : null, elapsed, w, h);
    const b = this.#place(shotMesh, full ? this.#shot : null, elapsed, w, h);
    if (this.#shot && elapsed - this.#shot.at >= this.#shot.dur) this.#shot = null;
    this.#shooting = a || b;

    // The sky slides with the farthest stars (nearness 0.2), as they wrap.
    const shift: [number, number] = [(u.uDrift.value[0] + this.#offset[0] / w) * 0.2,
                                      (u.uDrift.value[1] + this.#offset[1] / h) * 0.2];
    // The band where this sky lays it: x + y = BAND_AT + 2 LAY, with x mirrored when it flips.
    this.#sky?.draw(renderer, kind,
                    this.getAttribute('strands') === 'band' ? 'band' : 'below',
                    u.uAccent.value as [number, number, number], settings.glow, this.#strandColours,
                    w, h, shift, elapsed / period, lay ? (BAND_AT + 2 * LAY) % 1 : BAND_AT, !!lay?.flip);
    renderer.render(this.#scene, this.#camera);
  }

  protected destroy(): void {
    this.#points?.geometry.dispose();
    this.#points?.material.dispose();
    this.#meteors[0]?.geometry.dispose();
    for (const m of this.#meteors) m.material.dispose();
    this.#meteors = [];
    this.#sky?.dispose();
    this.#sky = null;
    this.#scene = this.#points = null;
    this.#shot = null;
    this.#shooting = false;
  }
}
