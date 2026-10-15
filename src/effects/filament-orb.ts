/**
 * `<labkit-filament-orb>`: a sphere of many thin glowing strands in the
 * theme's accent, its glow as strong as the theme's `--glow`, turning once per
 * loop of the theme's pace (pace.ts).
 *
 * Each strand is an arc of a circle on the sphere, round a random axis, so the
 * whole reads as one wound ball of light. A slow ripple runs along every strand
 * and the brightness breathes once per loop: up on the theme's ease-out, down on
 * its ease-in. The glow is a soft light inside and a ring at the rim; a theme
 * with no glow gets the strands alone.
 *
 * Shaders are plain GLSL in shaders/, through RawShaderMaterial: every uniform
 * and attribute is declared in the shader, and no three.js chunk is included.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, LineSegments, Mesh,
  OneFactor, PerspectiveCamera, PlaneGeometry, RawShaderMaterial, Scene,
  SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import filamentVert from './shaders/filament.vert.glsl?raw';
import filamentFrag from './shaders/filament.frag.glsl?raw';
import haloVert from './shaders/halo.vert.glsl?raw';
import haloFrag from './shaders/halo.frag.glsl?raw';

const STRANDS = 220;
const SEGMENTS = 72;
/** The glow square's half-width, in orb radii. */
const HALO_EXTENT = 1.5;

/** A small seeded random, so every orb is wound the same way. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The strands: positions on the unit sphere, how far along each point is, and
 *  each strand's seed; drawn as line segments. */
function strands(): BufferGeometry {
  const rand = seeded(71);
  const per = SEGMENTS + 1;
  const pos = new Float32Array(STRANDS * per * 3);
  const along = new Float32Array(STRANDS * per);
  const seed = new Float32Array(STRANDS * per);
  const index: number[] = [];
  for (let s = 0; s < STRANDS; s++) {
    // A random axis, and two directions across it.
    const z = rand() * 2 - 1, az = rand() * Math.PI * 2, rr = Math.sqrt(1 - z * z);
    const a = [rr * Math.cos(az), rr * Math.sin(az), z];
    const ref = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = norm(cross(a, ref));
    const v = cross(a, u);
    const lat = (rand() - 0.5) * 1.2;
    const h = Math.sin(lat), r = Math.cos(lat);
    const start = rand() * Math.PI * 2;
    const arc = (0.35 + rand() * 0.55) * Math.PI * 2;
    const sd = rand();
    for (let i = 0; i < per; i++) {
      const t = i / SEGMENTS, phi = start + arc * t;
      const k = s * per + i;
      for (let j = 0; j < 3; j++) {
        pos[k * 3 + j] = a[j] * h + (u[j] * Math.cos(phi) + v[j] * Math.sin(phi)) * r;
      }
      along[k] = t;
      seed[k] = sd;
      if (i < SEGMENTS) index.push(k, k + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aAlong', new BufferAttribute(along, 1));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  g.setIndex(index);
  return g;
}

function cross(a: number[], b: number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: number[]): number[] {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** Light adds up: premultiplied colour and alpha, both summed. On a dark ground
 *  the dense strands burn toward white; on a light one the accent darkens it. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

export class FilamentOrb extends LabkitEffect {
  #scene: Scene | null = null;
  #camera: PerspectiveCamera | null = null;
  #lines: LineSegments<BufferGeometry, RawShaderMaterial> | null = null;
  #halo: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  #colour = new Color();
  #scratch = new Vector2();

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
    this.#lines = new LineSegments(
      strands(),
      new RawShaderMaterial({
        vertexShader: filamentVert, fragmentShader: filamentFrag, ...ADD,
        uniforms: { ...shared, uAngle: { value: 0 }, uPhase: { value: 0 } },
      }),
    );
    this.#scene.add(this.#halo, this.#lines);
  }

  protected update(settings: EffectSettings): void {
    // The shaders write straight to the canvas with no colour conversion, so
    // they take the accent as the sRGB values the theme wrote.
    this.#colour.set(settings.accent || '#ffffff');
    const rgb = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    for (const m of [this.#lines?.material, this.#halo?.material]) {
      if (!m) continue;
      m.uniforms.uColor.value = [rgb.r, rgb.g, rgb.b];
      m.uniforms.uGlow.value = settings.glow;
    }
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#camera || !this.#lines || !this.#halo) return;
    const { period, easeOut, easeIn } = settings.pace;
    const loops = elapsed / Math.max(1, period);
    const phase = loops - Math.floor(loops);
    const breath = phase < 0.5 ? easeOut(phase * 2) : 1 - easeIn((phase - 0.5) * 2);

    const size = renderer.getDrawingBufferSize(this.#scratch);
    this.#camera.aspect = size.x / Math.max(1, size.y);
    this.#camera.updateProjectionMatrix();

    const lu = this.#lines.material.uniforms;
    lu.uAngle.value = phase * Math.PI * 2;
    lu.uPhase.value = phase;
    lu.uBreath.value = breath;
    this.#halo.material.uniforms.uBreath.value = breath;
    renderer.render(this.#scene, this.#camera);
  }

  protected destroy(): void {
    this.#lines?.geometry.dispose();
    this.#lines?.material.dispose();
    this.#halo?.geometry.dispose();
    this.#halo?.material.dispose();
    this.#scene = this.#camera = this.#lines = this.#halo = null;
  }
}
