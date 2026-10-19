/**
 * `<labkit-planet-orb>`: a glass ball in its own tint (or every hue at once,
 * with the `rainbow` attribute), full of slow smoke lit from within, a bright
 * rim, a few jagged threads of light running through it and a scatter of tiny
 * sparks, and outside the glass a sparse coat of the strand orb's fragments,
 * threads and streaks, its light as strong as the theme's `--glow`.
 *
 * It does not spin (labkit #53, after the phone check in #42). The shell, the
 * threads and the sparks each wander on their own slow lean, the whole floats a
 * hair, and its light pulses at irregular moments, the threads cracking bright
 * on each pulse (drift.ts), while the smoke billows.
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
import type { Pace } from './pace';
import { Bloom } from './bloom';
import { bobAt, FLARE_LOOPS, makeWander, pulseAt, seeded, wanderAt, type Pulse, type Wander } from './drift';
import { DIAL, FRAGMENT, Lines, RIBBON, sph, STREAK, thread, THREAD, tilt, type V3 } from './strands';
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
/** Layers that wander apart: the shell, the threads, the sparks, and outside
 *  the glass the coat of light and its streaks. The strand orb's shaders take
 *  eight leans; the rest are unused. */
const SHELL = 0, THREADS = 1, SPARKS = 2, COAT = 3, STREAKS = 4, ARCS = 5, STRANDS = 6, INNER = 7,
  LEANS = 8;
/** A rainbow planet's glow, as sRGB: every hue added up, a soft cool white. */
const RAINBOW_GLOW: [number, number, number] = [0.85, 0.85, 0.95];

export interface PlanetSettings extends EffectSettings {
  /** `--effect-tint` as written, or the theme's `--accent` when it is unset. */
  tint: string;
  /** The `rainbow` attribute: every hue at once instead of the tint. */
  rainbow: boolean;
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
  // Outside the glass, a coat of light (the owner's polish list: "light and
  // filament orb effect surrounding it"): the strand orb's fragments, threads
  // and streaks, thinned to a sixth or so, so Jarvis stays the richest thing on
  // a page. Fragments gather in a few clumps with dark gaps between; the threads
  // wrap round outside and crack bright on a pulse; streaks bristle out in
  // tufts, so the outline is ragged, not a clean ball. After everything above,
  // so the glass's own threads and sparks keep their seeds.
  const clumps = Array.from({ length: 11 }, () =>
    [Math.asin(r() * 2 - 1) * 0.9, r() * Math.PI * 2, 0.15 + r() * 0.3] as const);
  for (const [radius, count] of [[1.1, 200], [1.2, 150]] as const) {
    for (let n = 0; n < count; n++) {
      const c = clumps[Math.floor(r() * clumps.length)];
      const clumped = r() < 0.55;
      const lat = clumped ? c[0] + (r() - 0.5) * c[2] * 2 : Math.asin(r() * 2 - 1);
      let lon = clumped ? c[1] + ((r() - 0.5) * c[2] * 2.6) / Math.max(0.3, Math.cos(c[0])) : r() * Math.PI * 2;
      const pts: V3[] = [sph(radius, lat, lon)];
      const len = (0.03 + r() * 0.12) * (r() < 0.5 ? 1 : -1);
      const steps = Math.max(1, Math.round(Math.abs(len) / 0.02));
      for (let k = 1; k <= steps; k++) {
        lon += len / steps / Math.max(0.3, Math.cos(lat));
        pts.push(sph(radius, lat, lon));
      }
      L.add(pts, COAT, FRAGMENT, clumped ? 0.9 + 0.7 * r() : 0.4 + 0.4 * r(), r());
    }
  }
  for (let n = 0; n < 6; n++) L.add(thread(r, 1.08, 0.16, 10, 14), COAT, THREAD, 1.5 + 0.6 * r(), r());
  for (let n = 0; n < 90; n++) {
    const c = clumps[Math.floor(r() * clumps.length)];
    const tuft = r() < 0.7;
    const lat = tuft ? c[0] + (r() - 0.5) * 0.5 : Math.asin(r() * 2 - 1);
    const lon = tuft ? c[1] + (r() - 0.5) * 0.7 : r() * Math.PI * 2;
    const out = 1.08 + Math.pow(r(), 2.2) * 0.3;
    L.add([sph(1.02, lat, lon), sph((1.02 + out) / 2, lat + (r() - 0.5) * 0.02, lon), sph(out, lat, lon)],
          STREAKS, STREAK, 0.7 + 0.5 * r(), r());
  }

  // Strands of light round the outside (the owner, after seeing the coat: "moreso outer
  // filament strands, but some inner strands wouldn't hurt either"), the strand orb's
  // look in the planet's colour and far fewer of them. Arcs: partial circles at many
  // angles, steady, some doubled. Strands: long smooth curves wrapping round, leaning
  // slowly as they go, blinking gently like the fragments. Inside: one sparse shell of
  // fragments and a small curled ribbon at the heart. All after the coat, so its seeds hold.
  for (let n = 0; n < 10; n++) {
    const radius = 1.05 + r() * 0.2, tx = (r() - 0.5) * 2.6, ty = r() * Math.PI;
    const start = r() * Math.PI * 2, span = (0.18 + r() * 0.27) * Math.PI * 2;
    const seg = Math.ceil(span / 0.04);
    const ring = (rad: number): V3[] => Array.from({ length: seg + 1 }, (_, i) => {
      const a = start + (span * i) / seg;
      return tilt([rad * Math.cos(a), rad * Math.sin(a), 0], tx, ty);
    });
    const sd = r();
    L.add(ring(radius), ARCS, DIAL, 0.7 + 0.3 * r(), sd);
    if (r() < 0.35) L.add(ring(radius * 1.03), ARCS, DIAL, 0.5, sd);
  }
  for (let n = 0; n < 12; n++) {
    let lat = Math.asin(r() * 2 - 1), lon = r() * Math.PI * 2, heading = r() * Math.PI * 2;
    const base = 1.04 + r() * 0.2, wobble = r() * 6.283;
    const steps = 25 + Math.floor(r() * 20);
    const pts: V3[] = [];
    for (let k = 0; k <= steps; k++) {
      pts.push(sph(base + 0.05 * Math.sin(k * 0.3 + wobble), lat, lon));
      heading += (r() - 0.5) * 0.5;
      lat = Math.max(-1.4, Math.min(1.4, lat + Math.sin(heading) * 0.045));
      lon += (Math.cos(heading) * 0.045) / Math.max(0.3, Math.cos(lat));
    }
    L.add(pts, STRANDS, FRAGMENT, 0.8 + 0.4 * r(), r());
  }
  for (let n = 0; n < 120; n++) {
    let lon = r() * Math.PI * 2;
    const lat = Math.asin(r() * 2 - 1) * 0.9;
    const pts: V3[] = [sph(0.62, lat, lon)];
    const len = (0.03 + r() * 0.1) * (r() < 0.5 ? 1 : -1);
    const steps = Math.max(1, Math.round(Math.abs(len) / 0.02));
    for (let k = 1; k <= steps; k++) {
      lon += len / steps / Math.max(0.3, Math.cos(lat));
      pts.push(sph(0.62, lat, lon));
    }
    L.add(pts, INNER, FRAGMENT, 0.35 + 0.35 * r(), r());
  }
  for (let k = 0; k < 8; k++) {
    const off = (k - 3.5) * 0.008, ph = r() * 6.283;
    const pts: V3[] = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, th = 0.6 + u * Math.PI * 2.2;
      const rad = 0.05 + 0.3 * Math.pow(1 - u, 1.25) + off * (1 + 0.7 * Math.sin(u * 7 + ph));
      pts.push(tilt([rad * Math.cos(th), rad * Math.sin(th), 0.08 * Math.sin(u * 4.5 + ph * 0.2)], 1.0, 0.55));
    }
    L.add(pts, INNER, RIBBON, 0.3 + 0.25 * (1 - Math.abs(k - 3.5) / 4), r());
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
  #tint: [number, number, number] = [1, 1, 1];
  #scratch = new Vector2();
  /** Each layer's own resting lean, and its own wander. */
  #rest: Euler[] = [];
  #wanders: Wander[] = [];
  #whole = makeWander(5301, 0.2);
  #rot = Array.from({ length: LEANS }, () => new Matrix3());
  #m4 = new Matrix4();
  #m4b = new Matrix4();
  #euler = new Euler();

  /** Asked-for flares (`flare()`), as (when, in loops; strength), and ones asked for but
   *  not yet drawn. */
  #flares: [number, number][] = [];
  #pendingFlares: number[] = [];

  /** Brighten now, as one of its own pulses does, from the next frame: the hub flares an
   *  orb when a bead of light reaches it down its vine. `strength` 0 to 1. False, and
   *  nothing, under calm and off: a still frame never holds a flare. */
  flare(strength = 1): boolean {
    if (this.settings.pace.level !== 'full') return false;
    this.#pendingFlares.push(Math.min(1, Math.max(0, strength)));
    return true;
  }

  /** The flares showing now, the pending ones given this frame's time, the faded ones
   *  forgotten. `pulse="off"` leaves out the piece's own random pulses. */
  #pulse(pace: Pace, loops: number, seed: number): Pulse {
    if (pace.level !== 'full') this.#pendingFlares = [];
    for (const a of this.#pendingFlares) this.#flares.push([loops, a]);
    this.#pendingFlares = [];
    this.#flares = this.#flares.filter(([t]) => loops - t <= FLARE_LOOPS && loops >= t);
    return pulseAt(pace, loops, seed, this.#flares, this.getAttribute('pulse') !== 'off');
  }

  static get observedAttributes(): string[] {
    return ['rainbow', 'pulse'];
  }

  /** `rainbow` or `pulse` changed: draw a frame now, still or not. */
  attributeChangedCallback(): void {
    this.redraw();
  }

  /** The base's settings, the tint and the rainbow. No canvas needed. */
  get settings(): PlanetSettings {
    const base = super.settings;
    const tint = getComputedStyle(this).getPropertyValue('--effect-tint').trim();
    return { ...base, tint: tint || base.accent, rainbow: this.hasAttribute('rainbow') };
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
      uColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uPulse: { value: 0 }, uRainbow: { value: 0 },
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
          uRainbow: { value: 0 },
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
    this.#tint = [rgb.r, rgb.g, rgb.b];
    for (const m of [this.#planet?.material, this.#halo?.material, this.#lines?.material, this.#sparks?.material]) {
      if (!m) continue;
      m.uniforms.uColor.value = this.#tint;
      m.uniforms.uGlow.value = settings.glow;
    }
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#camera || !this.#group || !this.#planet || !this.#halo
        || !this.#lines || !this.#sparks) return;
    const pace = settings.pace;
    const loops = elapsed / Math.max(1, pace.period);

    const size = this.drawingSize(this.#scratch);
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

    const pulse = this.#pulse(pace, loops, 53);
    const level = Math.min(1, pulse.level);
    for (const m of [this.#lines.material, this.#sparks.material]) {
      const u = m.uniforms;
      u.uTime.value = loops;
      u.uPulse.value = pulse.level;
      u.uWave.value = pulse.wave;
      u.uStrength.value = pulse.strength;
    }
    const pu = this.#planet.material.uniforms;
    // The smoke drifts a quarter of a turn of its warp each loop.
    pu.uSwirl.value = loops * 0.25;
    const rainbow = this.hasAttribute('rainbow') ? 1 : 0;
    for (const m of [pu, this.#lines.material.uniforms, this.#sparks.material.uniforms]) m.uRainbow.value = rainbow;
    // A rainbow's glow is every hue added up: a soft white, not the tint.
    this.#halo.material.uniforms.uColor.value = rainbow ? RAINBOW_GLOW : this.#tint;
    pu.uBreath.value = level;
    this.#halo.material.uniforms.uBreath.value = level;
    // As the strand orb: sparks scale with the canvas, lines with the screen.
    this.#sparks.material.uniforms.uPx.value = size.x / 320;
    this.#lines.material.uniforms.uThin.value = Math.sqrt(this.pixelRatio);
    this.#bloom ??= new Bloom();
    const d = this.drawingSize(this.#scratch);
    this.#bloom.render(renderer, this.#scene, this.#camera, settings.glow * (0.8 + 0.4 * level), d.x, d.y, this.pixelRatio);
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
