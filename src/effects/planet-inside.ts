/**
 * `<labkit-planet-inside>`: inside a planet orb, full-bleed, for the level an app
 * dives into (the owner's polish list, 2026-10-18: "backgrounds inside of the planets
 * shouldn't be blank walls of the planet color. It should be a representation of the
 * outside, so slowly moving smoky background with some of the filament effect, and the
 * slight lightning effect in the smoky clouds, and some bits of the black outside
 * coming through").
 *
 * The planet orb's smoke, seen from within: two layers of noise bent by noise, a near
 * one and a dimmer far one, drifting so they billow and never repeat; thin bright
 * filaments where the warped noise folds; the page's own dark showing through where the
 * smoke thins; a little darker toward the edges. Now and then lightning flickers in the
 * clouds: slots of FLASH_SLOT loops, each holding a flash with FLASH_CHANCE at a seeded
 * moment and place, a quick double flicker that lights the clouds round it from inside.
 * None under calm and off, where it is one still moment.
 *
 * Its colour is `--effect-tint` (the orb's), or the accent; `rainbow` runs every hue at
 * once, as the rainbow planet does. It draws small (one texel per SCALE CSS pixels, at
 * most MAX_SIDE across) into a texture and scales it up over the canvas: smoke is soft,
 * so a phone pays for a fraction of its pixels. Size and place come from the page: lay
 * it over the level, under its contents, with `position: absolute; inset: 0`.
 */
import {
  CustomBlending, LinearFilter, Mesh, NoBlending, OneFactor, OrthographicCamera, PlaneGeometry,
  RawShaderMaterial, Scene, SRGBColorSpace, Color, Vector2, WebGLRenderTarget, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import quadVert from './shaders/quad.vert.glsl?raw';
import insideFrag from './shaders/inside.frag.glsl?raw';
import texquadFrag from './shaders/texquad.frag.glsl?raw';

export interface PlanetInsideSettings extends EffectSettings {
  /** `--effect-tint` as written, or the theme's `--accent` when it is unset. */
  tint: string;
  /** The `rainbow` attribute. */
  rainbow: boolean;
}

/** CSS pixels to a texel of the smoke, and the most texels on its longer side. */
const SCALE = 3;
const MAX_SIDE = 480;
/** Lightning: slots of FLASH_SLOT loops, each holding a flash with FLASH_CHANCE, lasting
 *  FLASH_LOOPS (about 0.6 s at Cold core). */
const FLASH_SLOT = 1.4;
const FLASH_CHANCE = 0.55;
const FLASH_LOOPS = 0.07;
const FLASH_SEED = 0x11f1a5;

const STYLE = `
:host { aspect-ratio: auto; pointer-events: none; }
`;

const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

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

/** The lightning at `loops`: how bright now (0 to 1), and where (0 to 1 across, down). */
function flashAt(loops: number): [number, [number, number]] {
  const n = Math.floor(loops / FLASH_SLOT);
  for (let k = n; k >= n - 1; k--) {
    const r = random(FLASH_SEED ^ Math.imul(k, 7919));
    if (r() >= FLASH_CHANCE) continue;
    const at = k * FLASH_SLOT + r() * (FLASH_SLOT - FLASH_LOOPS);
    const where: [number, number] = [0.15 + 0.7 * r(), 0.15 + 0.7 * r()];
    const p = (loops - at) / FLASH_LOOPS;
    if (p < 0 || p >= 1) continue;
    // A quick double flicker, the second brighter, then gone.
    const f = Math.max(Math.exp(-(((p - 0.15) / 0.07) ** 2)) * 0.6, Math.exp(-(((p - 0.45) / 0.12) ** 2)));
    return [f, where];
  }
  return [0, [0.5, 0.5]];
}

export class PlanetInside extends LabkitEffect {
  #scene: Scene | null = null;
  #small: Scene | null = null;
  #camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  #smoke: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #show: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #target: WebGLRenderTarget | null = null;
  #colour = new Color();
  #scratch = new Vector2();

  static get observedAttributes(): string[] {
    return ['rainbow'];
  }

  /** `rainbow` on or off draws a frame now, still or not. */
  attributeChangedCallback(): void {
    this.redraw();
  }

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.shadowRoot!.append(style);
  }

  /** The base's settings, the tint and the rainbow. No canvas needed. */
  get settings(): PlanetInsideSettings {
    const base = super.settings;
    const tint = getComputedStyle(this).getPropertyValue('--effect-tint').trim();
    return { ...base, tint: tint || base.accent, rainbow: this.hasAttribute('rainbow') };
  }

  protected create(): void {
    this.#small = new Scene();
    this.#smoke = new Mesh(new PlaneGeometry(2, 2), new RawShaderMaterial({
      vertexShader: quadVert, fragmentShader: insideFrag, blending: NoBlending,
      depthTest: false, depthWrite: false,
      uniforms: {
        uColor: { value: [1, 1, 1] }, uRainbow: { value: 0 }, uGlow: { value: 0 }, uTime: { value: 0 },
        uAspect: { value: 1 }, uFlash: { value: 0 }, uFlashAt: { value: [0.5, 0.5] },
      },
    }));
    this.#smoke.frustumCulled = false;
    this.#small.add(this.#smoke);
    this.#scene = new Scene();
    this.#show = new Mesh(new PlaneGeometry(2, 2), new RawShaderMaterial({
      vertexShader: quadVert, fragmentShader: texquadFrag, ...ADD,
      uniforms: { uTex: { value: null } },
    }));
    this.#show.frustumCulled = false;
    this.#scene.add(this.#show);
  }

  protected update(settings: EffectSettings): void {
    if (!this.#smoke) return;
    this.#colour.set((settings as PlanetInsideSettings).tint || '#ffffff');
    const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    const u = this.#smoke.material.uniforms;
    u.uColor.value = [c.r, c.g, c.b];
    u.uGlow.value = settings.glow;
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#small || !this.#smoke || !this.#show) return;
    const size = this.cssSize(this.#scratch);
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const fit = Math.min(1 / SCALE, MAX_SIDE / Math.max(w, h));
    const tw = Math.max(8, Math.round(w * fit)), th = Math.max(8, Math.round(h * fit));
    if (!this.#target || this.#target.width !== tw || this.#target.height !== th) {
      this.#target?.dispose();
      this.#target = new WebGLRenderTarget(tw, th, {
        minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false, depthBuffer: false,
      });
    }
    const loops = elapsed / Math.max(1, settings.pace.period);
    const u = this.#smoke.material.uniforms;
    u.uTime.value = loops;
    u.uAspect.value = w / h;
    u.uRainbow.value = this.hasAttribute('rainbow') ? 1 : 0;
    const [flash, where] = settings.pace.level === 'full' ? flashAt(loops) : [0, [0.5, 0.5] as [number, number]];
    u.uFlash.value = flash;
    u.uFlashAt.value = where;
    renderer.setRenderTarget(this.#target);
    renderer.render(this.#small, this.#camera);
    renderer.setRenderTarget(null);
    this.#show.material.uniforms.uTex.value = this.#target.texture;
    renderer.render(this.#scene, this.#camera);
  }

  protected destroy(): void {
    for (const m of [this.#smoke, this.#show]) {
      m?.geometry.dispose();
      m?.material.dispose();
    }
    this.#target?.dispose();
    this.#target = null;
    this.#scene = this.#small = this.#smoke = this.#show = null;
  }
}
