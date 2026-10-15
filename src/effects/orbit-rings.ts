/**
 * `<labkit-orbit-rings>`: hairline rings at a few tilts round a centre, each
 * carrying small nodes that travel round it, in the theme's accent. The rings
 * and the nodes glow as strongly as the theme's `--glow`; the nodes go round
 * once per loop of the theme's pace (pace.ts), and the whole breathes on its
 * curves like the orbs.
 *
 * It is a frame for an orb: put one inside it and it sits in the middle, at
 * ORB_SHARE of the rings' width, and the rings pass in front of it and behind
 * it (the parts behind are hidden by its disc). Its background is transparent,
 * so with no orb inside it is the rings alone, over whatever is behind.
 *
 *     <labkit-orbit-rings><labkit-planet-orb></labkit-planet-orb></labkit-orbit-rings>
 *
 * One vertex shader places a point on a ring for the hairline, its glow band
 * and the nodes alike, so the three always agree. Shaders are plain GLSL in
 * shaders/, through RawShaderMaterial, with no three.js chunk included.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, LineSegments, Mesh, OneFactor,
  PerspectiveCamera, Points, RawShaderMaterial, Scene, SRGBColorSpace, Vector2,
  type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import orbitVert from './shaders/orbit.vert.glsl?raw';
import orbitFrag from './shaders/orbit.frag.glsl?raw';

/** The orb inside, as a share of the rings' width. */
export const ORB_SHARE = 0.68;
/** An orb's disc as a share of its own box: the orbs' camera sees a unit
 *  sphere from 4.6 away at 35°, which fills 0.707 of the box. */
const ORB_DISC = 0.707;

/** Radius, tilt toward the viewer (0 is edge on), roll on screen, node turns
 *  per loop, nodes. */
const RINGS: [number, number, number, number, number][] = [
  [1.0, 0.38, 0.35, 1, 2],
  [1.13, -0.52, -0.6, -1, 3],
  [1.26, 0.24, 1.2, 1, 1],
];
const SEGMENTS = 160;
/** The glow band's half-width, and a node's solid core, in CSS pixels. */
const BAND_PX = 6;
const CORE_PX = 4;

/** On the element: the orb inside sits in the middle, under the rings' canvas,
 *  and the canvas lets a touch through to it. */
const STYLE = `
::slotted(*) {
  position: absolute;
  left: ${(1 - ORB_SHARE) * 50}%; top: ${(1 - ORB_SHARE) * 50}%;
  width: ${ORB_SHARE * 100}%; height: ${ORB_SHARE * 100}%;
}
canvas { pointer-events: none; }
`;

/** Light adds up, as in the orbs. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

/** Every point of every ring: its angle, the ring, and its side of the band. */
function ringGeometry(band: boolean): BufferGeometry {
  const per = SEGMENTS + 1, sides = band ? 2 : 1;
  const count = RINGS.length * per * sides;
  const angle = new Float32Array(count);
  const ring = new Float32Array(count * 4);
  const side = new Float32Array(count);
  const index: number[] = [];
  RINGS.forEach(([r, tilt, roll, speed], n) => {
    for (let i = 0; i < per; i++) {
      for (let s = 0; s < sides; s++) {
        const k = (n * per + i) * sides + s;
        angle[k] = (i / SEGMENTS) * Math.PI * 2;
        ring.set([r, tilt, roll, speed], k * 4);
        side[k] = band ? s * 2 - 1 : 0;
      }
      if (i === SEGMENTS) continue;
      const k = (n * per + i) * sides;
      if (band) index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      else index.push(k, k + 1);
    }
  });
  const g = new BufferGeometry();
  // three.js wants a position to size the draw; the shader places every point.
  g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aAngle', new BufferAttribute(angle, 1));
  g.setAttribute('aRing', new BufferAttribute(ring, 4));
  g.setAttribute('aSide', new BufferAttribute(side, 1));
  g.setIndex(index);
  return g;
}

/** The nodes: evenly spaced round their ring, each ring's set at its own start. */
function nodeGeometry(): BufferGeometry {
  const count = RINGS.reduce((t, x) => t + x[4], 0);
  const angle = new Float32Array(count);
  const ring = new Float32Array(count * 4);
  let k = 0;
  RINGS.forEach(([r, tilt, roll, speed, nodes], n) => {
    for (let i = 0; i < nodes; i++, k++) {
      angle[k] = n * 2.1 + (i / nodes) * Math.PI * 2;
      ring.set([r, tilt, roll, speed], k * 4);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aAngle', new BufferAttribute(angle, 1));
  g.setAttribute('aRing', new BufferAttribute(ring, 4));
  g.setAttribute('aSide', new BufferAttribute(new Float32Array(count), 1));
  return g;
}

export class OrbitRings extends LabkitEffect {
  #scene: Scene | null = null;
  #camera: PerspectiveCamera | null = null;
  #band: Mesh<BufferGeometry, RawShaderMaterial> | null = null;
  #lines: LineSegments<BufferGeometry, RawShaderMaterial> | null = null;
  #nodes: Points<BufferGeometry, RawShaderMaterial> | null = null;
  #slot: HTMLSlotElement;
  #colour = new Color();
  #scratch = new Vector2();

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.#slot = document.createElement('slot');
    // An orb put in or taken out changes what the rings hide behind it.
    this.#slot.addEventListener('slotchange', () => this.redraw());
    this.shadowRoot!.append(style, this.#slot);
  }

  /** The orb's disc in the canvas's -1..1 units, or 0 when none is inside. */
  get #hole(): number {
    return this.#slot.assignedElements().length ? ORB_SHARE * ORB_DISC : 0;
  }

  #material(kind: number, move: number): RawShaderMaterial {
    return new RawShaderMaterial({
      vertexShader: orbitVert, fragmentShader: orbitFrag, ...ADD,
      uniforms: {
        uColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uBreath: { value: 0 },
        uKind: { value: kind }, uMove: { value: move }, uTurn: { value: 0 },
        uWidth: { value: 0 }, uSize: { value: 1 }, uCore: { value: 1 }, uHole: { value: 0 },
      },
    });
  }

  protected create(): void {
    this.#scene = new Scene();
    this.#camera = new PerspectiveCamera(35, 1, 0.1, 20);
    this.#camera.position.set(0, 0, 4.6);
    this.#band = new Mesh(ringGeometry(true), this.#material(1, 0));
    this.#lines = new LineSegments(ringGeometry(false), this.#material(0, 0));
    this.#nodes = new Points(nodeGeometry(), this.#material(2, 1));
    for (const o of [this.#band, this.#lines, this.#nodes]) o.frustumCulled = false;
    this.#scene.add(this.#band, this.#lines, this.#nodes);
  }

  get #materials(): RawShaderMaterial[] {
    return [this.#band, this.#lines, this.#nodes].flatMap((o) => (o ? [o.material] : []));
  }

  protected update(settings: EffectSettings): void {
    // As the orbs: the shaders take the accent as the sRGB the theme wrote.
    this.#colour.set(settings.accent || '#ffffff');
    const rgb = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    for (const m of this.#materials) {
      m.uniforms.uColor.value = [rgb.r, rgb.g, rgb.b];
      m.uniforms.uGlow.value = settings.glow;
    }
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#camera || !this.#band || !this.#nodes) return;
    const { period, easeOut, easeIn } = settings.pace;
    const loops = elapsed / Math.max(1, period);
    const phase = loops - Math.floor(loops);
    const breath = phase < 0.5 ? easeOut(phase * 2) : 1 - easeIn((phase - 0.5) * 2);

    const size = renderer.getDrawingBufferSize(this.#scratch);
    this.#camera.aspect = size.x / Math.max(1, size.y);
    this.#camera.updateProjectionMatrix();

    // Pixels to the shaders' units: the band in clip units, the node in device px.
    const dpr = renderer.getPixelRatio();
    const nodePx = CORE_PX + 10 * settings.glow;
    const hole = this.#hole;
    for (const m of this.#materials) {
      const u = m.uniforms;
      u.uTurn.value = phase * Math.PI * 2;
      u.uBreath.value = breath;
      u.uHole.value = hole;
    }
    this.#band.material.uniforms.uWidth.value = (BAND_PX * dpr * 2) / Math.max(1, size.y);
    this.#nodes.material.uniforms.uSize.value = nodePx * dpr;
    this.#nodes.material.uniforms.uCore.value = CORE_PX / nodePx;
    renderer.render(this.#scene, this.#camera);
  }

  protected destroy(): void {
    for (const o of [this.#band, this.#lines, this.#nodes]) {
      o?.geometry.dispose();
      o?.material.dispose();
    }
    this.#scene = this.#camera = this.#band = this.#lines = this.#nodes = null;
  }
}
