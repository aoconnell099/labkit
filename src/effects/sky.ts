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
 * - **colourful:** warm gold dust at the heart, teal at the edges, and seven
 *   plumes of glittering dust in the page's colours (`strandColours`), after the
 *   owner's photograph of colourful dust fanning up from a horizon (2026-10-20:
 *   the thin straight strands before "look like concert lights"). Each widens as
 *   it goes and curls outward, fibrous along its length, with two brighter wisps
 *   in it and fine grains of light caught in it that twinkle, its colour turning
 *   toward the next strand's along it. They sway slowly. They rise from below the
 *   screen (`strands="below"`, the default) or grow out of the band
 *   (`strands="band"`): both are a choice in the hub's Settings.
 *
 * Every sky has a colour of its own across the whole field and a glow along the
 * element's bottom that stays put, like the light over a horizon in the
 * photographs (2026-10-20: "a little more vibrant, closer to the reference
 * images, including the band").
 *
 * The glow is drawn once into a texture (TEX square) whenever the sky, the theme's
 * accent or the element's shape changes (`shaders/sky.frag.glsl`), then slid with
 * the farthest stars every frame (`skyquad.frag.glsl`, which adds the horizon's
 * glow): it doesn't billow, as a real sky doesn't, and costs a frame one texture
 * read a pixel. Its noise repeats exactly over the field, so the slide never shows
 * a seam. The strands are laid out in CSS pixels every frame, a few thousand
 * vertices, and drawn by `skystrand.*.glsl`.
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
/** Strands, the segments along each, and the brighter wisps in each beside its plume. */
const STRANDS = 7, SEGMENTS = 48, LINES = 2;
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
      uniforms: { uSky: { value: null }, uShift: { value: [0, 0] }, uKind: { value: 1 } },
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
      uniforms: { uView: { value: [1, 1] }, uGlow: { value: 0 }, uTime: { value: 0 } },
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
    this.#quad.material.uniforms.uKind.value = SKY_CODE[kind];
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
    const local = new BufferAttribute(new Float32Array(verts * 2), 2);
    pos.setUsage(DynamicDrawUsage);
    fade.setUsage(DynamicDrawUsage);
    local.setUsage(DynamicDrawUsage);
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
    g.setAttribute('aLocal', local);
    g.setAttribute('aSide', new BufferAttribute(side, 1));
    g.setAttribute('aKind', new BufferAttribute(kindA, 1));
    g.setAttribute('aColour', new BufferAttribute(new Float32Array(verts * 3), 3));
    g.setIndex(index);
    return g;
  }

  /** Each strand's path this frame, as ribbons: its plume, then its wisps. */
  #layout(origin: StrandOrigin, colours: readonly string[], glow: number, w: number, h: number,
          shift: [number, number], loops: number, bandAt: number): void {
    const g = this.#strands.geometry;
    const pos = g.getAttribute('position') as BufferAttribute;
    const fade = g.getAttribute('aFade') as BufferAttribute;
    const local = g.getAttribute('aLocal') as BufferAttribute;
    const list = colours.length ? colours : STRAND_COLOURS;
    const ck = list.join();
    if (ck !== this.#colours) {
      // Each strand's colour, turning toward the next strand's along its length.
      const col = g.getAttribute('aColour') as BufferAttribute;
      const rgb = (css: string) => {
        this.#colour.set(css);
        const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
        return [c.r, c.g, c.b];
      };
      for (let s = 0; s < STRANDS; s++) {
        const a = rgb(list[s % list.length]), b = rgb(list[(s + 1) % list.length]);
        for (let ribbon = 0; ribbon <= LINES; ribbon++) {
          for (let k = 0; k < POINTS; k++) {
            const m = 0.55 * (k / SEGMENTS) ** 1.5;
            const v = ((s * (1 + LINES) + ribbon) * POINTS + k) * 2;
            for (const i of [v, v + 1]) {
              col.setXYZ(i, a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m, a[2] + (b[2] - a[2]) * m);
            }
          }
        }
      }
      col.needsUpdate = true;
      this.#colours = ck;
    }
    const u = this.#strands.material.uniforms;
    u.uView.value = [w, h];
    u.uGlow.value = glow;
    u.uTime.value = loops;
    const diag = Math.hypot(w, h);
    const px: [number, number][] = Array.from({ length: POINTS }, () => [0, 0]);
    const along: number[] = new Array(POINTS).fill(0);
    const spread: number[] = new Array(POINTS).fill(0);
    const half: number[] = new Array(POINTS).fill(0);
    for (let s = 0; s < STRANDS; s++) {
      const sd = this.#seeds[s];
      const sway = Math.sin(2 * Math.PI * (loops * sd.rate + sd.phase));
      let x: number, y: number, heading: number, length: number, curl: number, wide: number;
      if (origin === 'band') {
        // A point on the band (x + y = bandAt, wrapping), slid with the far stars,
        // growing out across it, to either side in turn, curling the way it leans.
        const v = (s + 0.5) / STRANDS + (sd.jitter - 0.5) * 0.08;
        const fx = (((bandAt - v + shift[0]) % 1) + 1) % 1, fy = (((v + shift[1]) % 1) + 1) % 1;
        x = fx * w; y = fy * h;
        const sign = s % 2 ? 1 : -1;
        heading = Math.atan2(sign * w, sign * h) + (sd.angle - 0.5) * 0.7;
        length = (0.5 + 0.3 * sd.length) * diag * 0.5;
        curl = (sd.angle < 0.5 ? -1 : 1) * (0.25 + 0.35 * sd.length);
        wide = (0.045 + 0.035 * sd.length) * diag;
      } else {
        // From one point just below the screen's bottom, fanning upward like a fountain:
        // each curls further out the further out it starts.
        x = w * (0.5 + 0.06 * (sd.jitter - 0.5));
        y = h * 1.04;
        const out = ((s + 0.5) / STRANDS) * 2 - 1;
        heading = -Math.PI / 2 + out * 0.95 + (sd.angle - 0.5) * 0.2;
        length = (0.65 + 0.35 * sd.length) * diag * 0.6;
        curl = (Math.abs(out) < 0.01 ? (sd.angle < 0.5 ? -1 : 1) : Math.sign(out)) * (0.5 + 1.2 * Math.abs(out));
        wide = (0.05 + 0.05 * sd.length) * diag;
      }
      // Walk the path: the heading turns as it goes, faster toward the tip (the curl, in
      // radians over the whole length at its fastest), and the sway bends it either way.
      const step = length / SEGMENTS;
      for (let k = 0; k < POINTS; k++) {
        const t = k / SEGMENTS;
        px[k][0] = x;
        px[k][1] = y;
        along[k] = step * k;
        half[k] = 6 + wide * t ** 0.85;
        heading += (curl * 2 * t + sway * 0.15) / SEGMENTS;
        x += Math.cos(heading) * step;
        y += Math.sin(heading) * step;
      }
      for (let ribbon = 0; ribbon <= LINES; ribbon++) {
        const [across, ph] = ribbon === 0 ? [0, 0] : sd.lines[ribbon - 1];
        for (let k = 0; k < POINTS; k++) {
          const t = k / SEGMENTS;
          spread[k] = ribbon === 0 ? 0 : across * half[k] * 0.45 + Math.sin(t * 5 + ph + sway) * half[k] * 0.08;
        }
        const base = (s * (1 + LINES) + ribbon) * POINTS * 2;
        for (let k = 0; k < POINTS; k++) {
          const a = px[Math.max(0, k - 1)], b = px[Math.min(SEGMENTS, k + 1)];
          let tx = b[0] - a[0], ty = b[1] - a[1];
          const tl = Math.hypot(tx, ty) || 1;
          tx /= tl;
          ty /= tl;
          const t = k / SEGMENTS;
          const cx = px[k][0] - ty * spread[k], cy = px[k][1] + tx * spread[k];
          const hw = ribbon === 0 ? half[k] : 2 + half[k] * 0.22;
          // Out of the band they show from the start; from below, the start is off the screen anyway.
          const f = Math.min(1, t / (origin === 'band' ? 0.06 : 0.12)) * (1 - Math.max(0, Math.min(1, (t - 0.5) / 0.5)));
          const v = base + k * 2;
          pos.setXYZ(v, cx - ty * hw, cy + tx * hw, 0);
          pos.setXYZ(v + 1, cx + ty * hw, cy - tx * hw, 0);
          fade.setX(v, f);
          fade.setX(v + 1, f);
          local.setXY(v, along[k], hw);
          local.setXY(v + 1, along[k], hw);
        }
      }
    }
    pos.needsUpdate = true;
    fade.needsUpdate = true;
    local.needsUpdate = true;
  }
}
