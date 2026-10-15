/**
 * `<labkit-planet-orb>`: a glossy, marbled sphere lit from inside, in its own
 * tint, its inner light as strong as the theme's `--glow`, turning once per loop
 * of the theme's pace (pace.ts) while its marbling slowly swirls.
 *
 * Its colour is `--effect-tint` when one is set on it or above it, and the
 * theme's `--accent` when none is: the app orbs are the planet orb in different
 * colours (ideas plan 71), so each app sets its own tint and keeps its theme.
 *
 * The sphere is worked out per pixel on one square facing the viewer, behind it
 * the same glow square the filament orb uses. Shaders are plain GLSL in
 * shaders/, through RawShaderMaterial, with no three.js chunk included.
 */
import {
  Color, CustomBlending, Mesh, OneFactor, OneMinusSrcAlphaFactor, PerspectiveCamera,
  PlaneGeometry, RawShaderMaterial, Scene, SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import haloVert from './shaders/halo.vert.glsl?raw';
import haloFrag from './shaders/halo.frag.glsl?raw';
import planetFrag from './shaders/planet.frag.glsl?raw';

/** The glow square's half-width, in orb radii. */
const HALO_EXTENT = 1.5;
/** The planet's square: a hair wider than the orb, for its soft edge. */
const PLANET_EXTENT = 1.02;

export interface PlanetSettings extends EffectSettings {
  /** `--effect-tint` as written, or the theme's `--accent` when it is unset. */
  tint: string;
}

/** Light adds up, as in the filament orb's glow. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

/** The planet covers what is behind it: premultiplied "over". */
const OVER = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneMinusSrcAlphaFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

export class PlanetOrb extends LabkitEffect {
  #scene: Scene | null = null;
  #camera: PerspectiveCamera | null = null;
  #planet: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #halo: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #colour = new Color();
  #scratch = new Vector2();

  /** The base's settings, and the tint. No canvas needed. */
  get settings(): PlanetSettings {
    const base = super.settings;
    const tint = getComputedStyle(this).getPropertyValue('--effect-tint').trim();
    return { ...base, tint: tint || base.accent };
  }

  protected create(): void {
    this.#scene = new Scene();
    this.#camera = new PerspectiveCamera(35, 1, 0.1, 20);
    this.#camera.position.set(0, 0, 4.6);

    const shared = { uColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uBreath: { value: 0 } };
    this.#halo = new Mesh(
      new PlaneGeometry(HALO_EXTENT * 2, HALO_EXTENT * 2),
      new RawShaderMaterial({
        vertexShader: haloVert, fragmentShader: haloFrag, ...ADD,
        uniforms: { ...shared, uExtent: { value: HALO_EXTENT } },
      }),
    );
    this.#planet = new Mesh(
      new PlaneGeometry(PLANET_EXTENT * 2, PLANET_EXTENT * 2),
      new RawShaderMaterial({
        vertexShader: haloVert, fragmentShader: planetFrag, ...OVER,
        uniforms: {
          ...shared, uExtent: { value: PLANET_EXTENT }, uAngle: { value: 0 }, uSwirl: { value: 0 },
        },
      }),
    );
    this.#scene.add(this.#halo, this.#planet);
  }

  protected update(settings: EffectSettings): void {
    // As the filament orb: the shaders take the colour as the sRGB it was written in.
    this.#colour.set((settings as PlanetSettings).tint || '#ffffff');
    const rgb = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    for (const m of [this.#planet?.material, this.#halo?.material]) {
      if (!m) continue;
      m.uniforms.uColor.value = [rgb.r, rgb.g, rgb.b];
      m.uniforms.uGlow.value = settings.glow;
    }
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#camera || !this.#planet || !this.#halo) return;
    const { period, easeOut, easeIn } = settings.pace;
    const loops = elapsed / Math.max(1, period);
    const phase = loops - Math.floor(loops);
    const breath = phase < 0.5 ? easeOut(phase * 2) : 1 - easeIn((phase - 0.5) * 2);

    const size = renderer.getDrawingBufferSize(this.#scratch);
    this.#camera.aspect = size.x / Math.max(1, size.y);
    this.#camera.updateProjectionMatrix();

    const pu = this.#planet.material.uniforms;
    pu.uAngle.value = phase * Math.PI * 2;
    // The swirl surges and settles on the theme's curves; the breath is 0 at
    // both ends of the loop, so it joins up with no jump.
    pu.uSwirl.value = phase + 0.12 * breath;
    pu.uBreath.value = breath;
    this.#halo.material.uniforms.uBreath.value = breath;
    renderer.render(this.#scene, this.#camera);
  }

  protected destroy(): void {
    this.#planet?.geometry.dispose();
    this.#planet?.material.dispose();
    this.#halo?.geometry.dispose();
    this.#halo?.material.dispose();
    this.#scene = this.#camera = this.#planet = this.#halo = null;
  }
}
