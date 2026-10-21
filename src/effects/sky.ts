/**
 * The star dust's sky (the owner's polish list, 2026-10-18): the glow of the band
 * its stars gather along, in one of three looks after the owner's three folders of
 * night-sky photographs. `<labkit-star-dust>` owns one and draws it under its stars;
 * with no `sky` attribute there is none, and the star dust is as it was.
 *
 * - **deep-blue:** a royal blue night and a soft band of pale-blue cloud with dark lanes.
 * - **violet:** a nebula down the band, swirled and folded into filaments and gritty with
 *   unresolved stars, coloured by where it is on the screen as in the owner's photograph:
 *   cyan at the top, through blue and purple, to magenta and pink at the bottom over a pink
 *   horizon (2026-10-20: the band before read as "grey/white clouds instead of the
 *   reference image").
 * - **colourful:** a dark teal night and a striking band, bright peach to cream, gritty,
 *   cut deep by dark lanes, with swirled, glittering dust in the colours of the owner's
 *   photograph of colourful dust (`STRAND_COLOURS`, or the `strandColours` given) mixed
 *   together over it (2026-10-20: the plumes before looked "like the tendrils, when in the
 *   reference image its much more random and swirled together"). It fans out of the band's
 *   middle to both sides (`strands="band"`) or up from below the screen (`strands="below"`,
 *   the attribute's default): both are a choice in the hub's Settings.
 *
 * Every sky is a little dimmer than its photographs so it never overpowers the page in
 * front of it: a colour of its own across the whole field, a band through the middle
 * (star-dust.ts lays the field so), and a glow along the element's bottom that stays put,
 * like the light over a horizon.
 *
 * The glow is drawn once into a texture whenever the sky, the theme's accent or the
 * element's shape changes (`shaders/sky.frag.glsl`), and for the colourful sky its dust into
 * a second (`skydust.frag.glsl`), each TEX texels along the element's longer side and in
 * its proportions. Both are then slid with the farthest stars every frame
 * (`skyquad.frag.glsl`, which colours them and adds the horizon's glow): they don't billow,
 * as a real sky doesn't, and cost a frame one or two texture reads a pixel. Their noise
 * repeats exactly over the field (`noise.glsl`), so the slide never shows a seam.
 */
import {
  Color, CustomBlending, LinearFilter, Mesh, NoBlending, OneFactor, OrthographicCamera, PlaneGeometry,
  RawShaderMaterial, RepeatWrapping, Scene, SRGBColorSpace, WebGLRenderTarget, type Texture,
  type WebGLRenderer,
} from 'three';
import quadVert from './shaders/quad.vert.glsl?raw';
import noise from './shaders/noise.glsl?raw';
import skyFrag from './shaders/sky.frag.glsl?raw';
import dustFrag from './shaders/skydust.frag.glsl?raw';
import skyQuadFrag from './shaders/skyquad.frag.glsl?raw';

export type SkyKind = 'deep-blue' | 'violet' | 'colourful';
export type StrandOrigin = 'below' | 'band';
export const SKY_KINDS: readonly SkyKind[] = ['deep-blue', 'violet', 'colourful'];
const SKY_CODE: Record<SkyKind, number> = { 'deep-blue': 1, violet: 2, colourful: 3 };
/** The colourful sky's dust when the app gives no colours: the colours of the owner's
 *  photograph of colourful dust (2026-10-20: "the colors should pretty much be these"),
 *  teal, orange, magenta, blue, gold, violet, cyan, pink and green, warm and cool in turn. */
export const STRAND_COLOURS: readonly string[] = [
  '#33d1b8', '#ff9442', '#e2479c', '#4d74ff', '#ffc14f', '#9a5cff', '#40b8ff', '#ff6aa6', '#45cf8c',
];
/** How many colours the dust takes at most (skydust.frag.glsl's palette), the list cycled to fill it. */
export const PALETTE_SIZE = 9;

/** The textures' longer side, in texels. */
const TEX = 1024;
/** Noise lattice cells across the field's shorter side, at its broadest octave. */
const CELLS = 4;

const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

/** A `sky` attribute as a kind, or null for none. */
export function skyKind(value: string | null): SkyKind | null {
  return value && (SKY_KINDS as readonly string[]).includes(value) ? value as SkyKind : null;
}

/** A texture-drawing shader with noise.glsl put in where it asks. */
function withNoise(source: string): string {
  return source.replace('// #include noise', noise);
}

function target(w: number, h: number): WebGLRenderTarget {
  return new WebGLRenderTarget(w, h, {
    wrapS: RepeatWrapping, wrapT: RepeatWrapping, minFilter: LinearFilter, magFilter: LinearFilter,
    generateMipmaps: false, depthBuffer: false,
  });
}

export class Sky {
  #gen = new Scene();
  #camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  #genQuad: Mesh<PlaneGeometry, RawShaderMaterial>;
  #skyMat = new RawShaderMaterial({
    vertexShader: quadVert, fragmentShader: withNoise(skyFrag), blending: NoBlending,
    depthTest: false, depthWrite: false,
    uniforms: {
      uSky: { value: 1 }, uAccent: { value: [1, 1, 1] }, uPeriod: { value: [CELLS, CELLS] },
      uBandAt: { value: 0.37 }, uFlip: { value: 0 }, uTexels: { value: [TEX, TEX] },
    },
  });
  #dustMat = new RawShaderMaterial({
    vertexShader: quadVert, fragmentShader: withNoise(dustFrag), blending: NoBlending,
    depthTest: false, depthWrite: false,
    uniforms: {
      uPeriod: { value: [CELLS, CELLS] }, uFlip: { value: 0 }, uOrigin: { value: 0 }, uTexels: { value: [TEX, TEX] },
      uPalette: { value: new Array(PALETTE_SIZE * 3).fill(1) },
    },
  });
  #target: WebGLRenderTarget | null = null;
  #dust: WebGLRenderTarget | null = null;
  #key = '';
  #dustKey = '';
  #quad: Mesh<PlaneGeometry, RawShaderMaterial>;
  #colour = new Color();
  #colours = '';

  constructor(scene: Scene, bandAt: number) {
    this.#skyMat.uniforms.uBandAt.value = bandAt;
    this.#genQuad = new Mesh(new PlaneGeometry(2, 2), this.#skyMat);
    this.#genQuad.frustumCulled = false;
    this.#gen.add(this.#genQuad);

    this.#quad = new Mesh(new PlaneGeometry(2, 2), new RawShaderMaterial({
      vertexShader: quadVert, fragmentShader: skyQuadFrag, ...ADD,
      uniforms: {
        uSky: { value: null }, uDust: { value: null }, uShift: { value: [0, 0] }, uKind: { value: 1 },
        uOrigin: { value: 0 },
      },
    }));
    this.#quad.frustumCulled = false;
    this.#quad.renderOrder = -2;
    this.#quad.visible = false;
    scene.add(this.#quad);
  }

  /** Whether the glow texture holds the sky last asked for, at the element's shape. */
  get ready(): boolean {
    return this.#key !== '' && this.#quad.visible;
  }

  /** The glow texture, its alpha the band's star thickness; null until first drawn. */
  get texture(): Texture | null {
    return this.#target?.texture ?? null;
  }

  /** Set before the frame's render: draws the textures when anything they show has
   *  changed, and slides them. */
  draw(renderer: WebGLRenderer, kind: SkyKind | null, origin: StrandOrigin, accent: [number, number, number],
       colours: readonly string[], w: number, h: number, shift: [number, number],
       bandAt: number, flip = false): void {
    this.#quad.visible = !!kind;
    if (!kind) return;
    const short = Math.min(w, h);
    const period: [number, number] = [Math.max(1, Math.round((CELLS * w) / short)),
                                      Math.max(1, Math.round((CELLS * h) / short))];
    // The textures in the element's proportions (as the lattice has them, so a small change
    // of size doesn't draw them again), TEX texels along the longer side.
    const big = Math.max(period[0], period[1]);
    const texels: [number, number] = [Math.round((TEX * period[0]) / big), Math.round((TEX * period[1]) / big)];
    const key = `${kind}|${accent.map((v) => v.toFixed(3)).join()}|${period.join()}|${bandAt.toFixed(4)}|${flip}`;
    if (key !== this.#key) {
      this.#target = this.#sized(this.#target, texels);
      const u = this.#skyMat.uniforms;
      u.uSky.value = SKY_CODE[kind];
      u.uAccent.value = accent;
      u.uPeriod.value = period;
      u.uBandAt.value = bandAt;
      u.uFlip.value = flip ? 1 : 0;
      u.uTexels.value = texels;
      this.#render(renderer, this.#skyMat, this.#target);
      this.#key = key;
    }
    this.#palette(colours);
    const dustKey = `${period.join()}|${flip}|${origin}|${this.#colours}`;
    if (kind === 'colourful' && dustKey !== this.#dustKey) {
      this.#dust = this.#sized(this.#dust, texels);
      const u = this.#dustMat.uniforms;
      u.uPeriod.value = period;
      u.uFlip.value = flip ? 1 : 0;
      u.uOrigin.value = origin === 'below' ? 1 : 0;
      u.uTexels.value = texels;
      this.#render(renderer, this.#dustMat, this.#dust);
      this.#dustKey = dustKey;
    }
    const u = this.#quad.material.uniforms;
    u.uSky.value = this.#target!.texture;
    u.uDust.value = kind === 'colourful' ? this.#dust!.texture : this.#target!.texture;
    u.uShift.value = shift;
    u.uKind.value = SKY_CODE[kind];
    u.uOrigin.value = origin === 'below' ? 1 : 0;
  }

  dispose(): void {
    this.#target?.dispose();
    this.#dust?.dispose();
    this.#target = this.#dust = null;
    this.#key = this.#dustKey = '';
    this.#quad.geometry.dispose();
    this.#quad.material.dispose();
    this.#genQuad.geometry.dispose();
    this.#skyMat.dispose();
    this.#dustMat.dispose();
  }

  /** A target of the given size: the one there is, resized when it must be. */
  #sized(t: WebGLRenderTarget | null, [w, h]: [number, number]): WebGLRenderTarget {
    if (!t) return target(w, h);
    if (t.width !== w || t.height !== h) t.setSize(w, h);
    return t;
  }

  #render(renderer: WebGLRenderer, mat: RawShaderMaterial, to: WebGLRenderTarget): void {
    this.#genQuad.material = mat;
    renderer.setRenderTarget(to);
    renderer.render(this.#gen, this.#camera);
    renderer.setRenderTarget(null);
  }

  /** Copies the dust's palette, flat sRGB, into `out` (PALETTE_SIZE * 3 numbers): the stars
   *  take the same colours. */
  paletteInto(out: number[]): void {
    const flat = this.#dustMat.uniforms.uPalette.value as number[];
    for (let i = 0; i < flat.length; i++) out[i] = flat[i];
  }

  /** The dust's colours, the list cycled to fill the palette. */
  #palette(colours: readonly string[]): void {
    const list = colours.length ? colours : STRAND_COLOURS;
    const key = list.join();
    if (key === this.#colours) return;
    const flat = this.#dustMat.uniforms.uPalette.value as number[];
    for (let i = 0; i < PALETTE_SIZE; i++) {
      this.#colour.set(list[i % list.length]);
      const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
      flat[i * 3] = c.r;
      flat[i * 3 + 1] = c.g;
      flat[i * 3 + 2] = c.b;
    }
    this.#colours = key;
  }
}
