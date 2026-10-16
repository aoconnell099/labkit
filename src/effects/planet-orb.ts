/**
 * `<labkit-planet-orb>`: a glass ball in its own tint, with glowing clouds inside
 * lit from within, a bright rim, a few jagged threads of light running through
 * it and a scatter of tiny sparks, its light as strong as the theme's `--glow`.
 *
 * It does not spin (labkit #53, after the phone check in #42). The shell, the
 * threads and the sparks each wander on their own slow lean, the whole floats a
 * hair, and its light pulses at irregular moments, the threads cracking bright
 * on each pulse (drift.ts), while the marbling slowly swirls.
 *
 * Its colour is `--effect-tint` when one is set on it or above it, and the
 * theme's `--accent` when none is: the app orbs are the planet orb in different
 * colours (ideas plan 71), so each app sets its own tint and keeps its theme.
 *
 * The look blends the glassy planet it was with the strand orb, after the
 * owner's private reference images, described here in our own words: a dark
 * glass ball with a fiery crack inside and a glowing rim, marbled fluid, clouds
 * lit from inside, and threads of light. The ball is worked out per pixel on one
 * square facing the viewer, behind it the strand orb's glow square; the threads
 * and sparks are the strand orb's own (strands.ts, its shaders). Shaders are
 * plain GLSL in shaders/, through RawShaderMaterial, with no three.js chunk.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, Euler, Group, LineSegments, Matrix3,
  Matrix4, Mesh, OneFactor, OneMinusSrcAlphaFactor, PerspectiveCamera, PlaneGeometry, Points,
  RawShaderMaterial, Scene, SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import { Bloom } from './bloom';
import { bobAt, makeWander, pulseAt, seeded, wanderAt, type Wander } from './drift';
import { Lines, sph, thread, THREAD } from './strands';
import haloVert from './shaders/halo.vert.glsl?raw';
import haloFrag from './shaders/halo.frag.glsl?raw';
import planetFrag from './shaders/planet.frag.glsl?raw';
import filamentVert from './shaders/filament.vert.glsl?raw';
import filamentFrag from './shaders/filament.frag.glsl?raw';
import sparkVert from './shaders/spark.vert.glsl?raw';
import sparkFrag from './shaders/spark.frag.glsl?raw';

/** The glow square's half-width, in orb radii. */
const HALO_EXTENT = 1.5;
/** The planet's square: a hair wider than the orb, for its soft edge. */
const PLANET_EXTENT = 1.02;
/** Layers that wander apart: the shell, the threads, the sparks. The strand
 *  orb's shaders take eight leans; the rest are unused. */
const SHELL = 0, THREADS = 1, SPARKS = 2, LEANS = 8;

export interface PlanetSettings extends EffectSettings {
  /** `--effect-tint` as written, or the theme's `--accent` when it is unset. */
  tint: string;
}

/** Light adds up, as in the strand orb's glow. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

/** The glass covers what is behind it by its alpha: premultiplied "over". */
const OVER = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneMinusSrcAlphaFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

function build(): { lines: BufferGeometry; sparks: BufferGeometry } {
  const r = seeded(53);
  // A few long threads running through the ball, inside the glass.
  const L = new Lines();
  for (let n = 0; n < 9; n++) L.add(thread(r, 0.5, 0.4, 10, 14), THREADS, THREAD, 1.4 + 0.6 * r(), r());

  // Tiny sparks through the ball, thicker toward the middle, a few past the rim.
  const sp: number[] = [], sl: number[] = [], ss: number[] = [], sg: number[] = [];
  for (let n = 0; n < 260; n++) {
    const outer = r() < 0.12;
    const radius = outer ? 1.02 + Math.pow(r(), 2) * 0.14 : 0.1 + Math.pow(r(), 0.7) * 0.85;
    sp.push(...sph(radius, Math.asin(r() * 2 - 1), r() * Math.PI * 2));
    sl.push(SPARKS);
    ss.push(r());
    sg.push(r() < 0.08 ? 1 : 0.3 + 0.4 * r());
  }
  const sparks = new BufferGeometry();
  sparks.setAttribute('position', new BufferAttribute(new Float32Array(sp), 3));
  sparks.setAttribute('aLayer', new BufferAttribute(new Float32Array(sl), 1));
  sparks.setAttribute('aSeed', new BufferAttribute(new Float32Array(ss), 1));
  sparks.setAttribute('aGain', new BufferAttribute(new Float32Array(sg), 1));
  return { lines: L.geometry(), sparks };
}

export class PlanetOrb extends LabkitEffect {
  #scene: Scene | null = null;
  #camera: PerspectiveCamera | null = null;
  #group: Group | null = null;
  #planet: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #halo: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #lines: LineSegments<BufferGeometry, RawShaderMaterial> | null = null;
  #sparks: Points<BufferGeometry, RawShaderMaterial> | null = null;
  #bloom: Bloom | null = null;
  #colour = new Color();
  #scratch = new Vector2();
  /** Each layer's own resting lean, and its own wander. */
  #rest: Euler[] = [];
  #wanders: Wander[] = [];
  #whole = makeWander(5301, 0.2);
  #rot = Array.from({ length: LEANS }, () => new Matrix3());
  #m4 = new Matrix4();
  #m4b = new Matrix4();
  #euler = new Euler();

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
    const r = seeded(5302);
    this.#rest = Array.from({ length: LEANS }, (_, i) =>
      i === SHELL ? new Euler(0, 0, 0) : new Euler((r() - 0.5) * 1.2, r() * 6.283, (r() - 0.5) * 0.8));
    this.#wanders = Array.from({ length: LEANS }, (_, i) => makeWander(5310 + i, i === SHELL ? 0.35 : 0.3));

    const { lines, sparks } = build();
    const strands = () => ({
      uColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uPulse: { value: 0 },
      uWave: { value: 1 }, uStrength: { value: 0 }, uTime: { value: 0 }, uRot: { value: this.#rot },
    });
    this.#halo = new Mesh(
      new PlaneGeometry(HALO_EXTENT * 2, HALO_EXTENT * 2),
      new RawShaderMaterial({
        vertexShader: haloVert, fragmentShader: haloFrag, ...ADD,
        uniforms: { uColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uBreath: { value: 0 },
                    uExtent: { value: HALO_EXTENT } },
      }),
    );
    this.#planet = new Mesh(
      new PlaneGeometry(PLANET_EXTENT * 2, PLANET_EXTENT * 2),
      new RawShaderMaterial({
        vertexShader: haloVert, fragmentShader: planetFrag, ...OVER,
        uniforms: {
          uColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uBreath: { value: 0 },
          uExtent: { value: PLANET_EXTENT }, uRot: { value: this.#rot[SHELL] }, uSwirl: { value: 0 },
        },
      }),
    );
    this.#lines = new LineSegments(lines, new RawShaderMaterial({
      vertexShader: filamentVert, fragmentShader: filamentFrag, ...ADD,
      uniforms: { ...strands(), uThin: { value: 1 } },
    }));
    this.#sparks = new Points(sparks, new RawShaderMaterial({
      vertexShader: sparkVert, fragmentShader: sparkFrag, ...ADD,
      uniforms: { ...strands(), uPx: { value: 1 } },
    }));
    // The glow behind, the glass over it, the threads and sparks lit inside.
    this.#group = new Group();
    this.#group.add(this.#halo, this.#planet, this.#lines, this.#sparks);
    this.#scene.add(this.#group);
  }

  protected update(settings: EffectSettings): void {
    // As the strand orb: the shaders take the colour as the sRGB it was written in.
    this.#colour.set((settings as PlanetSettings).tint || '#ffffff');
    const rgb = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    for (const m of [this.#planet?.material, this.#halo?.material, this.#lines?.material, this.#sparks?.material]) {
      if (!m) continue;
      m.uniforms.uColor.value = [rgb.r, rgb.g, rgb.b];
      m.uniforms.uGlow.value = settings.glow;
    }
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#camera || !this.#group || !this.#planet || !this.#halo
        || !this.#lines || !this.#sparks) return;
    const pace = settings.pace;
    const loops = elapsed / Math.max(1, pace.period);

    const size = renderer.getDrawingBufferSize(this.#scratch);
    this.#camera.aspect = size.x / Math.max(1, size.y);
    this.#camera.updateProjectionMatrix();

    // Every layer: its resting lean, its own wander, then the whole's wander.
    const whole = wanderAt(this.#whole, loops);
    this.#m4b.makeRotationFromEuler(this.#euler.set(whole[0], whole[1], whole[2]));
    for (let i = 0; i < LEANS; i++) {
      const w = wanderAt(this.#wanders[i], loops), rest = this.#rest[i];
      this.#m4.makeRotationFromEuler(this.#euler.set(rest.x + w[0], rest.y + w[1], rest.z + w[2]));
      this.#rot[i].setFromMatrix4(this.#m4.premultiply(this.#m4b));
    }
    const [bx, by] = bobAt(loops);
    this.#group.position.set(bx, by, 0);

    const pulse = pulseAt(pace, loops, 53);
    const level = Math.min(1, pulse.level);
    for (const m of [this.#lines.material, this.#sparks.material]) {
      const u = m.uniforms;
      u.uTime.value = loops;
      u.uPulse.value = pulse.level;
      u.uWave.value = pulse.wave;
      u.uStrength.value = pulse.strength;
    }
    const pu = this.#planet.material.uniforms;
    // The marbling flows a quarter of the way round its swirl each loop.
    pu.uSwirl.value = loops * 0.25;
    pu.uBreath.value = level;
    this.#halo.material.uniforms.uBreath.value = level;
    // As the strand orb: sparks scale with the canvas, lines with the screen.
    this.#sparks.material.uniforms.uPx.value = size.x / 320;
    this.#lines.material.uniforms.uThin.value = Math.sqrt(renderer.getPixelRatio());
    this.#bloom ??= new Bloom();
    this.#bloom.render(renderer, this.#scene, this.#camera, settings.glow * (0.8 + 0.4 * level));
  }

  protected destroy(): void {
    for (const o of [this.#planet, this.#halo, this.#lines, this.#sparks]) {
      o?.geometry.dispose();
      o?.material.dispose();
    }
    this.#bloom?.dispose();
    this.#bloom = null;
    this.#scene = this.#camera = this.#group = this.#planet = this.#halo = this.#lines = this.#sparks = null;
  }
}
