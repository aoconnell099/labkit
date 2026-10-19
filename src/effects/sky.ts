/**
 * The star dust's sky (the owner's polish list, 2026-10-18): the glow of the band
 * its stars gather along, in one of three looks after the owner's three folders of
 * night-sky photographs, and for the colourful one, strands of light in the page's
 * own colours. `<labkit-star-dust>` owns one and draws it under its stars; with no
 * `sky` attribute there is none, and the star dust is as it was.
 *
 * - **deep-blue:** a quiet navy haze along the band, in the theme's accent.
 * - **violet:** blue at the band's edges, violet then pink at its heart, and soft
 *   nebulae along it.
 * - **colourful:** warm gold dust at the heart, teal at the edges, and seven faint
 *   strands in the page's colours (`strandColours`), each a soft wide glow with
 *   three fine lines in it, swaying slowly. They rise from below the screen
 *   (`strands="below"`, the default) or grow out of the band (`strands="band"`):
 *   the owner asked to see both. They stay faint and wide, so they never read as
 *   vines.
 *
 * The glow is drawn once into a texture (TEX square) whenever the sky, the theme's
 * accent or the element's shape changes (`shaders/sky.frag.glsl`), then slid with
 * the farthest stars every frame (`skyquad.frag.glsl`): it doesn't billow, as a
 * real sky doesn't, and costs a frame one texture read a pixel. Its noise repeats
 * exactly over the field, so the slide never shows a seam. The strands are laid
 * out in CSS pixels every frame, a few thousand vertices, and drawn by
 * `skystrand.*.glsl`.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, DoubleSide, DynamicDrawUsage, LinearFilter,
  Mesh, NoBlending, OneFactor, OrthographicCamera, PlaneGeometry, RawShaderMaterial, RepeatWrapping,
  Scene, SRGBColorSpace, WebGLRenderTarget, type WebGLRenderer,
} from 'three';
import { seeded } from './drift';
import quadVert from './shaders/quad.vert.glsl?raw';
import skyFrag from './shaders/sky.frag.glsl?raw';
import skyQuadFrag from './shaders/skyquad.frag.glsl?raw';
import strandVert from './shaders/skystrand.vert.glsl?raw';
import strandFrag from './shaders/skystrand.frag.glsl?raw';

export type SkyKind = 'deep-blue' | 'violet' | 'colourful';
export type StrandOrigin = 'below' | 'band';
export const SKY_KINDS: readonly SkyKind[] = ['deep-blue', 'violet', 'colourful'];
const SKY_CODE: Record<SkyKind, number> = { 'deep-blue': 1, violet: 2, colourful: 3 };
/** The colourful sky's strands when the app gives none: the hub's orb colours. */
export const STRAND_COLOURS: readonly string[] = [
  '#3d9bff', '#b04ad8', '#33c46a', '#f2c230', '#e5484d', '#7b5cff', '#2ec4b6',
];

/** The glow texture's side, in texels. */
const TEX = 512;
/** Noise lattice cells across the field's shorter side, at its broadest octave. */
const CELLS = 4;
/** Strands, the segments along each, and the fine lines in each beside its glow. */
const STRANDS = 7, SEGMENTS = 48, LINES = 3;
const RIBBONS = STRANDS * (1 + LINES);
const POINTS = SEGMENTS + 1;

const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

interface StrandSeed {
  jitter: number;
  angle: number;
  length: number;
  phase: number;
  rate: number;
  /** Each fine line: where it sits across the glow (-1 to 1), and its own phase. */
  lines: [number, number][];
}

/** A `sky` attribute as a kind, or null for none. */
export function skyKind(value: string | null): SkyKind | null {
  return value && (SKY_KINDS as readonly string[]).includes(value) ? value as SkyKind : null;
}

export class Sky {
  #gen = new Scene();
  #camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  #genMat = new RawShaderMaterial({
    vertexShader: quadVert, fragmentShader: skyFrag, blending: NoBlending,
    depthTest: false, depthWrite: false,
    uniforms: {
      uSky: { value: 1 }, uAccent: { value: [1, 1, 1] }, uPeriod: { value: [CELLS, CELLS] },
      uBandAt: { value: 0.37 },
    },
  });
  #target: WebGLRenderTarget | null = null;
  #key = '';
  #quad: Mesh<PlaneGeometry, RawShaderMaterial>;
  #strands: Mesh<BufferGeometry, RawShaderMaterial>;
  #seeds: StrandSeed[];
  #colour = new Color();
  #colours = '';

  constructor(scene: Scene, bandAt: number) {
    this.#genMat.uniforms.uBandAt.value = bandAt;
    const genQuad = new Mesh(new PlaneGeometry(2, 2), this.#genMat);
    genQuad.frustumCulled = false;
    this.#gen.add(genQuad);

    this.#quad = new Mesh(new PlaneGeometry(2, 2), new RawShaderMaterial({
      vertexShader: quadVert, fragmentShader: skyQuadFrag, ...ADD,
      uniforms: { uSky: { value: null }, uShift: { value: [0, 0] } },
    }));
    this.#quad.frustumCulled = false;
    this.#quad.renderOrder = -2;
    this.#quad.visible = false;
    scene.add(this.#quad);

    const r = seeded(0x5ca9);
    this.#seeds = Array.from({ length: STRANDS }, () => ({
      jitter: r(), angle: r(), length: r(), phase: r(), rate: 0.08 + 0.08 * r(),
      lines: Array.from({ length: LINES }, () => [r() * 2 - 1, r() * 6.283] as [number, number]),
    }));
    this.#strands = new Mesh(this.#ribbons(), new RawShaderMaterial({
      vertexShader: strandVert, fragmentShader: strandFrag, ...ADD, side: DoubleSide,
      uniforms: { uView: { value: [1, 1] }, uGlow: { value: 0 } },
    }));
    this.#strands.frustumCulled = false;
    this.#strands.renderOrder = -1;
    this.#strands.visible = false;
    scene.add(this.#strands);
  }

  /** Whether the glow texture holds the sky last asked for, at the element's shape. */
  get ready(): boolean {
    return this.#key !== '' && this.#quad.visible;
  }

  /** Set before the frame's render: draws the glow texture when anything it shows
   *  has changed, slides it, and lays out the strands. */
  draw(renderer: WebGLRenderer, kind: SkyKind | null, origin: StrandOrigin, accent: [number, number, number],
       glow: number, colours: readonly string[], w: number, h: number, shift: [number, number],
       loops: number, bandAt: number): void {
    this.#quad.visible = !!kind;
    this.#strands.visible = kind === 'colourful';
    if (!kind) return;
    const short = Math.min(w, h);
    const period: [number, number] = [Math.max(1, Math.round((CELLS * w) / short)),
                                      Math.max(1, Math.round((CELLS * h) / short))];
    const key = `${kind}|${accent.map((v) => v.toFixed(3)).join()}|${period.join()}`;
    if (key !== this.#key) {
      this.#target ??= new WebGLRenderTarget(TEX, TEX, {
        wrapS: RepeatWrapping, wrapT: RepeatWrapping, minFilter: LinearFilter, magFilter: LinearFilter,
        generateMipmaps: false, depthBuffer: false,
      });
      const u = this.#genMat.uniforms;
      u.uSky.value = SKY_CODE[kind];
      u.uAccent.value = accent;
      u.uPeriod.value = period;
      renderer.setRenderTarget(this.#target);
      renderer.render(this.#gen, this.#camera);
      renderer.setRenderTarget(null);
      this.#key = key;
    }
    this.#quad.material.uniforms.uSky.value = this.#target!.texture;
    this.#quad.material.uniforms.uShift.value = shift;
    if (kind === 'colourful') this.#layout(origin, colours, glow, w, h, shift, loops, bandAt);
  }

  dispose(): void {
    this.#target?.dispose();
    this.#target = null;
    this.#key = '';
    for (const m of [this.#quad, this.#strands]) {
      m.geometry.dispose();
      m.material.dispose();
    }
    (this.#gen.children[0] as Mesh).geometry.dispose();
    this.#genMat.dispose();
  }

  /** The strands' fixed parts: which ribbon each vertex is on, which side, what kind. */
  #ribbons(): BufferGeometry {
    const verts = RIBBONS * POINTS * 2;
    const g = new BufferGeometry();
    const pos = new BufferAttribute(new Float32Array(verts * 3), 3);
    const fade = new BufferAttribute(new Float32Array(verts), 1);
    pos.setUsage(DynamicDrawUsage);
    fade.setUsage(DynamicDrawUsage);
    const side = new Float32Array(verts), kindA = new Float32Array(verts);
    const index: number[] = [];
    for (let ribbon = 0; ribbon < RIBBONS; ribbon++) {
      const fine = ribbon % (1 + LINES) === 0 ? 0 : 1;
      for (let k = 0; k < POINTS; k++) {
        const v = (ribbon * POINTS + k) * 2;
        side[v] = -1; side[v + 1] = 1;
        kindA[v] = kindA[v + 1] = fine;
        if (k < SEGMENTS) index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    g.setAttribute('position', pos);
    g.setAttribute('aFade', fade);
    g.setAttribute('aSide', new BufferAttribute(side, 1));
    g.setAttribute('aKind', new BufferAttribute(kindA, 1));
    g.setAttribute('aColour', new BufferAttribute(new Float32Array(verts * 3), 3));
    g.setIndex(index);
    return g;
  }

  /** Each strand's path this frame, as ribbons: its wide glow, then its fine lines. */
  #layout(origin: StrandOrigin, colours: readonly string[], glow: number, w: number, h: number,
          shift: [number, number], loops: number, bandAt: number): void {
    const g = this.#strands.geometry;
    const pos = g.getAttribute('position') as BufferAttribute;
    const fade = g.getAttribute('aFade') as BufferAttribute;
    const list = colours.length ? colours : STRAND_COLOURS;
    const ck = list.join();
    if (ck !== this.#colours) {
      const col = g.getAttribute('aColour') as BufferAttribute;
      for (let s = 0; s < STRANDS; s++) {
        this.#colour.set(list[s % list.length]);
        const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
        for (let v = s * (1 + LINES) * POINTS * 2; v < (s + 1) * (1 + LINES) * POINTS * 2; v++) {
          col.setXYZ(v, c.r, c.g, c.b);
        }
      }
      col.needsUpdate = true;
      this.#colours = ck;
    }
    this.#strands.material.uniforms.uView.value = [w, h];
    this.#strands.material.uniforms.uGlow.value = glow;
    const diag = Math.hypot(w, h);
    const px: [number, number][] = Array.from({ length: POINTS }, () => [0, 0]);
    const half: number[] = new Array(POINTS).fill(0);
    for (let s = 0; s < STRANDS; s++) {
      const sd = this.#seeds[s];
      let bx: number, by: number, dx: number, dy: number, length: number;
      if (origin === 'band') {
        // A point on the band (x + y = bandAt, wrapping), slid with the far stars,
        // growing out across it, to either side in turn.
        const v = (s + 0.5) / STRANDS + (sd.jitter - 0.5) * 0.08;
        const fx = (((bandAt - v + shift[0]) % 1) + 1) % 1, fy = (((v + shift[1]) % 1) + 1) % 1;
        bx = fx * w; by = fy * h;
        const n = Math.hypot(h, w), turn = (sd.angle - 0.5) * 0.9, sign = s % 2 ? 1 : -1;
        const nx = (sign * h) / n, ny = (sign * w) / n;
        dx = nx * Math.cos(turn) - ny * Math.sin(turn);
        dy = nx * Math.sin(turn) + ny * Math.cos(turn);
        length = (0.45 + 0.3 * sd.length) * diag * 0.5;
      } else {
        // From one point just below the screen's bottom, fanning upward.
        bx = w * (0.5 + 0.08 * (sd.jitter - 0.5));
        by = h * 1.08;
        const a = -Math.PI / 2 + (((s + 0.5) / STRANDS) * 2 - 1) * 1.1 + (sd.angle - 0.5) * 0.25;
        dx = Math.cos(a); dy = Math.sin(a);
        length = (0.75 + 0.35 * sd.length) * diag * 0.62;
      }
      const sway = Math.sin(2 * Math.PI * (loops * sd.rate + sd.phase));
      const qx = -dy, qy = dx;
      for (let ribbon = 0; ribbon <= LINES; ribbon++) {
        const [across, ph] = ribbon === 0 ? [0, 0] : sd.lines[ribbon - 1];
        for (let k = 0; k < POINTS; k++) {
          const t = k / SEGMENTS;
          const bend = Math.sin(t * 2.4 + sd.phase * 6.283 + sway * 0.8) * 0.07 * length * t;
          const wide = origin === 'band' ? 5 + 22 * t : 6 + 30 * t;
          const off = ribbon === 0 ? 0 : across * wide * 0.6 + Math.sin(t * 5 + ph + sway) * 2;
          px[k][0] = bx + dx * length * t + qx * (bend + off);
          px[k][1] = by + dy * length * t + qy * (bend + off);
          half[k] = ribbon === 0 ? wide : 1.4;
        }
        const base = (s * (1 + LINES) + ribbon) * POINTS * 2;
        for (let k = 0; k < POINTS; k++) {
          const a = px[Math.max(0, k - 1)], b = px[Math.min(SEGMENTS, k + 1)];
          let tx = b[0] - a[0], ty = b[1] - a[1];
          const tl = Math.hypot(tx, ty) || 1;
          tx /= tl; ty /= tl;
          const t = k / SEGMENTS;
          // Out of the band they show from the start; from below, the start is off the screen anyway.
          const f = Math.min(1, t / (origin === 'band' ? 0.05 : 0.15)) * (1 - Math.max(0, Math.min(1, (t - 0.55) / 0.45)));
          const v = base + k * 2;
          pos.setXYZ(v, px[k][0] - ty * half[k], px[k][1] + tx * half[k], 0);
          pos.setXYZ(v + 1, px[k][0] + ty * half[k], px[k][1] - tx * half[k], 0);
          fade.setX(v, f);
          fade.setX(v + 1, f);
        }
      }
    }
    pos.needsUpdate = true;
    fade.needsUpdate = true;
  }
}
