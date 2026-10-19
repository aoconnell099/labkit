/**
 * `<labkit-filament-orb>`: a hologram of a mind. Thousands of short glowing
 * fragments on nested shells you can see through, partial dials at many angles,
 * a curled bright ribbon at the core, jagged threads of light, sparks, and
 * streaks breaking the edge, all in the theme's accent. Where pieces overlap on a
 * dark ground the light adds up toward white, as strong as the theme's `--glow`.
 *
 * It does not spin. Each layer wanders on its own slowly changing lean, the
 * whole floats a hair, and brightness pulses at irregular moments, with a wave
 * of light running out from the core on each pulse (drift.ts). Fragments flicker
 * on and off at their own rates. Every cycle is a multiple of the theme's pace,
 * so a slow theme drifts slowly; under calm and off it holds one still moment.
 *
 * The look follows the owner's private reference images (labkit #52, after the
 * phone check in #42), described here in our own words: a dense, layered sphere
 * of interface fragments with a bright swirl at its heart, and tangled threads of
 * light over it.
 *
 * Shaders are plain GLSL in shaders/, through RawShaderMaterial: every uniform
 * and attribute is declared in the shader, and no three.js chunk is included.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, Euler, Group, LineSegments, Matrix3,
  Matrix4, Mesh, OneFactor, PerspectiveCamera, PlaneGeometry, Points, RawShaderMaterial, Scene,
  SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import type { Pace } from './pace';
import { Bloom } from './bloom';
import { bobAt, FLARE_LOOPS, makeWander, pulseAt, seeded, wanderAt, type Pulse, type Wander } from './drift';
import { DIAL, FRAGMENT, Lines, RIBBON, sph, STREAK, thread, THREAD, tilt, type V3 } from './strands';
import filamentVert from './shaders/filament.vert.glsl?raw';
import filamentFrag from './shaders/filament.frag.glsl?raw';
import sparkVert from './shaders/spark.vert.glsl?raw';
import sparkFrag from './shaders/spark.frag.glsl?raw';
import haloVert from './shaders/halo.vert.glsl?raw';
import haloFrag from './shaders/halo.frag.glsl?raw';
import cloudFrag from './shaders/cloud.frag.glsl?raw';

/** The glow square's half-width, in orb radii. */
const HALO_EXTENT = 1.5;
/** The cloud's square's half-width, in orb radii, and how far back the camera stands while
 *  the cloud shows (4.6 without), so the orb sits a little smaller inside it. */
const CLOUD_EXTENT = 2.05;
const CAMERA_Z = 4.6;
const CLOUD_CAMERA_Z = 6.6;
/** Layers that wander apart: six shells of fragments, the core, the threads. */
const LAYERS = 8;
const CORE = 6, THREADS = 7;
/** The shells' radii, inside out. */
const SHELLS = [0.42, 0.57, 0.7, 0.82, 0.93, 1.02];

function build(): { lines: BufferGeometry; sparks: BufferGeometry } {
  const r = seeded(49);
  const L = new Lines();

  // Fragments: short circuit-like runs on each shell. A run goes along a line of
  // latitude, sometimes turns a right angle onto a meridian and back, like a
  // trace on a board. Bands of latitude are favoured, so rings show through.
  SHELLS.forEach((radius, layer) => {
    const count = Math.round(380 + 230 * layer);
    // Clumps: most fragments gather round a few centres, bright and dense, with
    // darker gaps between, as the reference's light does.
    const clumps = Array.from({ length: 10 + 3 * layer }, () =>
      [Math.asin(r() * 2 - 1) * 0.9, r() * Math.PI * 2, 0.12 + r() * 0.3] as const);
    for (let n = 0; n < count; n++) {
      const clumped = r() < 0.62;
      const c = clumps[Math.floor(r() * clumps.length)];
      const band = (Math.floor(r() * 9) - 4) / 4.6;
      let lat = clumped ? c[0] + (r() - 0.5) * c[2] * 2 : band + (r() - 0.5) * (r() < 0.6 ? 0.12 : 0.9);
      let lon = clumped ? c[1] + ((r() - 0.5) * c[2] * 2.6) / Math.max(0.3, Math.cos(c[0])) : r() * Math.PI * 2;
      const pts: V3[] = [sph(radius, lat, lon)];
      const turns = r() < 0.55 ? 0 : r() < 0.7 ? 1 : 2;
      for (let t = 0; t <= turns; t++) {
        const along = t % 2 === 0;
        const len = (along ? 0.025 + r() * 0.14 : 0.015 + r() * 0.05) * (r() < 0.5 ? 1 : -1);
        const steps = Math.max(1, Math.round(Math.abs(len) / 0.02));
        for (let s = 1; s <= steps; s++) {
          if (along) lon += len / steps / Math.max(0.3, Math.cos(lat)); else lat += len / steps;
          pts.push(sph(radius, lat, lon));
        }
      }
      L.add(pts, layer, FRAGMENT, clumped ? 0.6 + 0.6 * r() : 0.3 + 0.4 * r() * r(), r());
    }
    // Panels: small closed boxes on the shell, like windows of an interface.
    for (let n = 0; n < 18 + 8 * layer; n++) {
      const lat = (r() - 0.5) * 2.4, lon = r() * Math.PI * 2;
      const w = (0.03 + r() * 0.07) / Math.max(0.3, Math.cos(lat)), h = 0.02 + r() * 0.05;
      L.add([sph(radius, lat, lon), sph(radius, lat, lon + w), sph(radius, lat + h, lon + w),
             sph(radius, lat + h, lon), sph(radius, lat, lon)], layer, FRAGMENT, 0.8, r());
    }
    // Streaks: lines bristling out of the outer shells in tufts, so the outline
    // is ragged, not a clean ball.
    if (layer >= 4) {
      for (let n = 0; n < 190; n++) {
        const c = clumps[Math.floor(r() * clumps.length)];
        const tuft = r() < 0.7;
        const lat = tuft ? c[0] + (r() - 0.5) * 0.5 : Math.asin(r() * 2 - 1);
        const lon = tuft ? c[1] + (r() - 0.5) * 0.7 : r() * Math.PI * 2;
        const out = radius + 0.03 + Math.pow(r(), 2.2) * 0.36;
        L.add([sph(radius - 0.03, lat, lon), sph((radius + out) / 2, lat + (r() - 0.5) * 0.02, lon),
               sph(out, lat, lon)], layer, STREAK, 0.55 + 0.5 * r(), r());
      }
    }
  });

  // Dials: partial circles at many angles, some doubled, some with tick marks,
  // each riding one of the shells.
  for (let n = 0; n < 18; n++) {
    const layer = 1 + Math.floor(r() * 5);
    const radius = SHELLS[layer] * (1.0 + r() * 0.06);
    const tx = (r() - 0.5) * 2.6, ty = r() * Math.PI;
    const start = r() * Math.PI * 2, span = (0.22 + r() * 0.42) * Math.PI * 2;
    const seg = Math.ceil(span / 0.03);
    const ring = (rad: number): V3[] =>
      Array.from({ length: seg + 1 }, (_, i) => {
        const a = start + (span * i) / seg;
        return tilt([rad * Math.cos(a), rad * Math.sin(a), 0], tx, ty);
      });
    const sd = r();
    // A bold band: three hairlines close together, which the bloom fuses.
    const bold = r() < 0.4 ? 3 : 1;
    for (let k = 0; k < bold; k++) L.add(ring(radius * (1 + k * 0.006)), layer, DIAL, 1.0, sd);
    if (r() < 0.45) L.add(ring(radius * 1.035), layer, DIAL, 0.55, sd);
    if (r() < 0.55) {
      const every = 0.05 + r() * 0.07, len = 0.025 + r() * 0.035;
      for (let a = start; a < start + span; a += every) {
        const c = Math.cos(a), s = Math.sin(a);
        L.add([tilt([radius * c, radius * s, 0], tx, ty),
               tilt([(radius + len) * c, (radius + len) * s, 0], tx, ty)], layer, DIAL, 0.7, sd);
      }
    }
  }

  // The core: a swoosh of fine lines curling in toward the heart, seen at a
  // slant so it reads as a twisted ribbon, its strands braiding and fanning out
  // at the tail; a small bright eye at the heart; and short arcs round it.
  for (let k = 0; k < 22; k++) {
    const off = (k - 10.5) * 0.0065, ph = r() * 6.283, fan = (r() - 0.5) * 0.12;
    const pts: V3[] = [];
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      const th = 0.6 + u * Math.PI * 2.5;
      const rad = 0.07 + 0.5 * Math.pow(1 - u, 1.25)
                + off * (1 + 0.7 * Math.sin(u * 7 + ph)) + fan * Math.pow(1 - u, 3);
      pts.push(tilt([rad * Math.cos(th), rad * Math.sin(th), 0.12 * Math.sin(u * 4.5 + ph * 0.2)], 1.0, 0.55));
    }
    L.add(pts, CORE, RIBBON, 0.55 + 0.45 * (1 - Math.abs(k - 10.5) / 11), r());
  }
  for (let n = 0; n < 7; n++) {
    const rad = 0.05 + r() * 0.08, tx = r() * 3, ty = r() * 3;
    const span = (0.4 + r() * 0.6) * Math.PI * 2, s0 = r() * 6.283;
    const pts: V3[] = Array.from({ length: 33 }, (_, i) => {
      const a = s0 + (span * i) / 32;
      return tilt([rad * Math.cos(a), rad * Math.sin(a), 0], tx, ty);
    });
    L.add(pts, CORE, RIBBON, 1, r());
  }
  for (let n = 0; n < 6; n++) {
    const rad = 0.2 + r() * 0.12, tx = (r() - 0.5) * 2.4, ty = r() * 3;
    const span = (0.15 + r() * 0.3) * Math.PI * 2, s0 = r() * 6.283;
    const pts: V3[] = Array.from({ length: 41 }, (_, i) => {
      const a = s0 + (span * i) / 40;
      return tilt([rad * Math.cos(a), rad * Math.sin(a), 0], tx, ty);
    });
    L.add(pts, CORE, DIAL, 0.8, r());
  }

  // Threads: jagged lines of light wandering over the outer shell, kinked like
  // a crack in glass (strands.ts).
  for (let n = 0; n < 34; n++) L.add(thread(r, 0.86, 0.16), THREADS, THREAD, 0.6 + 0.4 * r(), r());

  // Sparks: points through the shells, thicker toward the core, and a spray past
  // the edge that makes the outline ragged.
  const sp: number[] = [], sl: number[] = [], ss: number[] = [], sg: number[] = [];
  for (let n = 0; n < 1500; n++) {
    const outer = r() < 0.22;
    const radius = outer ? 1.03 + Math.pow(r(), 2) * 0.32 : 0.12 + Math.pow(r(), 0.6) * 0.92;
    sp.push(...sph(radius, Math.asin(r() * 2 - 1), r() * Math.PI * 2));
    sl.push(outer ? 5 : Math.min(5, Math.floor((radius / 1.02) * 6)));
    ss.push(r());
    sg.push(r() < 0.08 ? 1 : 0.25 + 0.5 * r());
  }
  const sparks = new BufferGeometry();
  sparks.setAttribute('position', new BufferAttribute(new Float32Array(sp), 3));
  sparks.setAttribute('aLayer', new BufferAttribute(new Float32Array(sl), 1));
  sparks.setAttribute('aSeed', new BufferAttribute(new Float32Array(ss), 1));
  sparks.setAttribute('aGain', new BufferAttribute(new Float32Array(sg), 1));

  return { lines: L.geometry(), sparks };
}

/** Light adds up: premultiplied colour and alpha, both summed. On a dark ground
 *  dense pieces burn toward white; on a light one the accent darkens it. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

export class FilamentOrb extends LabkitEffect {
  #scene: Scene | null = null;
  #camera: PerspectiveCamera | null = null;
  #group: Group | null = null;
  #lines: LineSegments<BufferGeometry, RawShaderMaterial> | null = null;
  #sparks: Points<BufferGeometry, RawShaderMaterial> | null = null;
  #halo: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #cloud: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #colour = new Color();
  #scratch = new Vector2();
  /** Each layer's own resting lean, and its own wander. */
  #rest: Euler[] = [];
  #wanders: Wander[] = [];
  #whole = makeWander(4901, 0.22);
  #rot = Array.from({ length: LAYERS }, () => new Matrix3());
  #m4 = new Matrix4();
  #m4b = new Matrix4();
  #euler = new Euler();
  #bloom: Bloom | null = null;

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
    return ['pulse', 'cloud'];
  }

  /** `pulse` or `cloud` changed: draw a frame now, still or not. */
  attributeChangedCallback(): void {
    this.redraw();
  }

  protected create(): void {
    this.#scene = new Scene();
    this.#camera = new PerspectiveCamera(35, 1, 0.1, 20);
    this.#camera.position.set(0, 0, CAMERA_Z);
    const r = seeded(4902);
    this.#rest = Array.from({ length: LAYERS }, (_, i) =>
      i === CORE ? new Euler(0, 0, 0) : new Euler((r() - 0.5) * 1.2, r() * 6.283, (r() - 0.5) * 0.8));
    this.#wanders = Array.from({ length: LAYERS }, (_, i) => makeWander(4910 + i, i === CORE ? 0.45 : 0.3));

    const { lines, sparks } = build();
    const shared = () => ({
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
    this.#lines = new LineSegments(lines, new RawShaderMaterial({
      vertexShader: filamentVert, fragmentShader: filamentFrag, ...ADD,
      uniforms: { ...shared(), uThin: { value: 1 } },
    }));
    this.#sparks = new Points(sparks, new RawShaderMaterial({
      vertexShader: sparkVert, fragmentShader: sparkFrag, ...ADD,
      uniforms: { ...shared(), uPx: { value: 1 } },
    }));
    // The cloud (`cloud`): a nebula round the orb, drifting like a jellyfish (cloud.frag.glsl).
    this.#cloud = new Mesh(
      new PlaneGeometry(CLOUD_EXTENT * 2, CLOUD_EXTENT * 2),
      new RawShaderMaterial({
        vertexShader: haloVert, fragmentShader: cloudFrag, ...ADD,
        uniforms: { uColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uBreath: { value: 0 },
                    uTime: { value: 0 }, uExtent: { value: CLOUD_EXTENT } },
      }),
    );
    this.#cloud.visible = false;
    this.#group = new Group();
    this.#group.add(this.#cloud, this.#halo, this.#lines, this.#sparks);
    this.#scene.add(this.#group);
  }

  protected update(settings: EffectSettings): void {
    // The shaders write straight to the canvas with no colour conversion, so
    // they take the accent as the sRGB values the theme wrote.
    this.#colour.set(settings.accent || '#ffffff');
    const rgb = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    for (const m of [this.#lines?.material, this.#sparks?.material, this.#halo?.material, this.#cloud?.material]) {
      if (!m) continue;
      m.uniforms.uColor.value = [rgb.r, rgb.g, rgb.b];
      m.uniforms.uGlow.value = settings.glow;
    }
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#camera || !this.#group || !this.#lines || !this.#sparks || !this.#halo) return;
    const pace = settings.pace;
    const loops = elapsed / Math.max(1, pace.period);

    const size = this.drawingSize(this.#scratch);
    this.#camera.aspect = size.x / Math.max(1, size.y);
    const cloud = this.hasAttribute('cloud');
    this.#camera.position.z = cloud ? CLOUD_CAMERA_Z : CAMERA_Z;
    this.#camera.updateProjectionMatrix();

    // Every layer: its resting lean, its own wander, then the whole's wander.
    const whole = wanderAt(this.#whole, loops);
    this.#m4b.makeRotationFromEuler(this.#euler.set(whole[0], whole[1], whole[2]));
    for (let i = 0; i < LAYERS; i++) {
      const w = wanderAt(this.#wanders[i], loops), rest = this.#rest[i];
      this.#m4.makeRotationFromEuler(this.#euler.set(rest.x + w[0], rest.y + w[1], rest.z + w[2]));
      this.#rot[i].setFromMatrix4(this.#m4.premultiply(this.#m4b));
    }
    const [bx, by] = bobAt(loops);
    this.#group.position.set(bx, by, 0);

    const pulse = this.#pulse(pace, loops, 71);
    for (const m of [this.#lines.material, this.#sparks.material]) {
      const u = m.uniforms;
      u.uTime.value = loops;
      u.uPulse.value = pulse.level;
      u.uWave.value = pulse.wave;
      u.uStrength.value = pulse.strength;
    }
    // A spark's size in device pixels, scaled with the canvas: 1 at 320 CSS px wide.
    this.#sparks.material.uniforms.uPx.value = size.x / 320;
    // Lines are one device pixel wide whatever the screen: on a dense one,
    // give them back the light a CSS pixel's worth of line would have.
    this.#lines.material.uniforms.uThin.value = Math.sqrt(this.pixelRatio);
    this.#halo.material.uniforms.uBreath.value = Math.min(1, pulse.level);
    if (this.#cloud) {
      this.#cloud.visible = cloud;
      this.#cloud.material.uniforms.uTime.value = loops;
      this.#cloud.material.uniforms.uBreath.value = Math.min(1, pulse.level);
    }
    this.#bloom ??= new Bloom();
    const d = this.drawingSize(this.#scratch);
    this.#bloom.render(renderer, this.#scene, this.#camera, settings.glow * (1.1 + 0.5 * Math.min(1, pulse.level)),
                       d.x, d.y, this.pixelRatio);
  }

  protected destroy(): void {
    for (const o of [this.#lines, this.#sparks, this.#halo, this.#cloud]) {
      o?.geometry.dispose();
      o?.material.dispose();
    }
    this.#bloom?.dispose();
    this.#bloom = null;
    this.#scene = this.#camera = this.#group = this.#lines = this.#sparks = this.#halo = this.#cloud = null;
  }
}
