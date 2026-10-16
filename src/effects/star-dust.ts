/**
 * `<labkit-star-dust>`: a field of fine points over a transparent background,
 * for a dark, starlit page to lay behind everything else on it.
 *
 * Most of the points are faint and a few are brighter. They are the theme's
 * ink (`--text`), each leaning a little toward `--accent`, and the brighter
 * ones carry a halo as strong as the theme's `--glow`. The field drifts slowly,
 * a little of the element's width once per loop of the theme's pace, and holds
 * still under calm and off.
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
  BufferAttribute, BufferGeometry, Color, CustomBlending, OneFactor, OrthographicCamera, Points,
  RawShaderMaterial, Scene, SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import starVert from './shaders/star.vert.glsl?raw';
import starFrag from './shaders/star.frag.glsl?raw';

export interface StarDustSettings extends EffectSettings {
  /** The theme's `--text`, as the theme wrote it: the points' colour. */
  ink: string;
  /** The app's offset, in CSS pixels. */
  offset: [number, number];
}

/** The most points it ever draws, and the CSS pixels of area per point. */
const MAX_STARS = 2400;
const AREA_PER_STAR = 1000;
/** The share of the points that are bright. */
const BRIGHT = 0.07;
/** How far the nearest points drift in one loop, as a share of the element. */
const DRIFT = 0.015;
/** The drift's direction: mostly across, a little down. */
const DRIFT_DIR = [0.94, 0.34] as const;
/** Nearness comes in tenths from 0.2 to 1, and the drift wraps at 10, so a
 *  wrap moves every point by a whole field: no jump, however long it runs. */
const NEAR_STEPS = 10;
const DRIFT_WRAP = 10;

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
  const pos = new Float32Array(MAX_STARS * 3);
  const near = new Float32Array(MAX_STARS);
  const bright = new Float32Array(MAX_STARS);
  const touch = new Float32Array(MAX_STARS);
  for (let i = 0; i < MAX_STARS; i++) {
    pos[i * 3] = r();
    pos[i * 3 + 1] = r();
    // Far points outnumber near ones.
    near[i] = (2 + Math.floor(r() * r() * (NEAR_STEPS - 1))) / NEAR_STEPS;
    if (r() < BRIGHT) {
      bright[i] = 0.75 + 0.25 * r();
      touch[i] = 0.3 + 0.3 * r();
    } else {
      // Mostly near the faint end.
      const b = r();
      bright[i] = 0.12 + 0.33 * b * b;
      touch[i] = 0.1 + 0.35 * r();
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aNear', new BufferAttribute(near, 1));
  g.setAttribute('aBright', new BufferAttribute(bright, 1));
  g.setAttribute('aTouch', new BufferAttribute(touch, 1));
  return g;
}

export class StarDust extends LabkitEffect {
  #scene: Scene | null = null;
  #camera = new OrthographicCamera();
  #points: Points<BufferGeometry, RawShaderMaterial> | null = null;
  #offset: [number, number] = [0, 0];
  #colour = new Color();
  #scratch = new Vector2();

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

  /** The base's settings, the ink, and the offset. No canvas needed. */
  get settings(): StarDustSettings {
    const base = super.settings;
    return {
      ...base,
      ink: getComputedStyle(this).getPropertyValue('--text').trim(),
      offset: this.offset,
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
        uOffset: { value: [0, 0] }, uGlow: { value: 0 },
        uInk: { value: [1, 1, 1] }, uAccent: { value: [1, 1, 1] },
      },
    }));
    this.#points.frustumCulled = false;
    this.#scene.add(this.#points);
  }

  protected update(settings: EffectSettings): void {
    if (!this.#points) return;
    const u = this.#points.material.uniforms;
    u.uGlow.value = settings.glow;
    u.uInk.value = this.#rgb(getComputedStyle(this).getPropertyValue('--text').trim());
    u.uAccent.value = this.#rgb(settings.accent);
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#points) return;
    const u = this.#points.material.uniforms;
    const size = renderer.getSize(this.#scratch);
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const along = (elapsed / Math.max(1, settings.pace.period)) * DRIFT;
    const wrap = (x: number) => x - Math.floor(x / DRIFT_WRAP) * DRIFT_WRAP;
    u.uView.value = [w, h];
    u.uPixelRatio.value = renderer.getPixelRatio();
    // Across in shares of the width, down in shares of the height scaled to
    // match, so the drift keeps its direction on a wide element. Each wraps
    // on its own.
    u.uDrift.value = [wrap(along * DRIFT_DIR[0]), wrap(along * DRIFT_DIR[1] * (w / h))];
    u.uOffset.value = [this.#offset[0], this.#offset[1]];
    this.#points.geometry.setDrawRange(0, Math.min(MAX_STARS, Math.ceil((w * h) / AREA_PER_STAR)));
    renderer.render(this.#scene, this.#camera);
  }

  protected destroy(): void {
    this.#points?.geometry.dispose();
    this.#points?.material.dispose();
    this.#scene = this.#points = null;
  }
}
