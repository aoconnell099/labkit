/**
 * Bloom: the soft light round a piece's bright parts, the way a lens blooms.
 *
 * Lines in WebGL are one device pixel wide, so on a phone's dense screen they
 * are hairs, and light that adds up in hairs never glows. So a piece that wants
 * to glow draws its scene to a texture, a small copy of it is blurred twice, and
 * the blur is added back over the sharp picture, as strong as the theme's
 * `--glow`. A theme with no glow skips all of it and draws straight to the
 * canvas: nothing to bloom, nothing to pay for.
 *
 * The blur's size follows CSS pixels, not device pixels, so it looks the same on
 * a phone and a desktop. Everything stays premultiplied, as the pieces draw it.
 * Shaders are plain GLSL in shaders/, through RawShaderMaterial.
 */
import {
  Mesh, OrthographicCamera, PlaneGeometry, RawShaderMaterial, Scene, Vector2, WebGLRenderTarget,
  type Camera, type Texture, type WebGLRenderer,
} from 'three';
import quadVert from './shaders/quad.vert.glsl?raw';
import shrinkFrag from './shaders/shrink.frag.glsl?raw';
import blurFrag from './shaders/blur.frag.glsl?raw';
import bloomFrag from './shaders/bloom.frag.glsl?raw';

/** The blurred copy is this many CSS pixels to each of its pixels. */
const SHRINK = 3;

export class Bloom {
  #scene = new Scene();
  #camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  #quad = new Mesh(new PlaneGeometry(2, 2));
  #shrink = new RawShaderMaterial({
    vertexShader: quadVert, fragmentShader: shrinkFrag, depthTest: false, depthWrite: false,
    uniforms: { uTex: { value: null as Texture | null }, uTexel: { value: new Vector2() } },
  });
  #blur = new RawShaderMaterial({
    vertexShader: quadVert, fragmentShader: blurFrag, depthTest: false, depthWrite: false,
    uniforms: { uTex: { value: null as Texture | null }, uStep: { value: new Vector2() } },
  });
  #mix = new RawShaderMaterial({
    vertexShader: quadVert, fragmentShader: bloomFrag, depthTest: false, depthWrite: false,
    uniforms: { uSharp: { value: null as Texture | null }, uGlow: { value: null as Texture | null },
                uStrength: { value: 0 } },
  });
  #sharp: WebGLRenderTarget | null = null;
  #a: WebGLRenderTarget | null = null;
  #b: WebGLRenderTarget | null = null;
  #size = new Vector2();

  constructor() {
    this.#scene.add(this.#quad);
  }

  /** Draw `scene` to the canvas with a bloom of `strength` (0 for none). */
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, strength: number): void {
    if (strength <= 0) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }
    const size = renderer.getDrawingBufferSize(this.#size);
    const css = renderer.getPixelRatio();
    const qw = Math.max(1, Math.round(size.x / css / SHRINK));
    const qh = Math.max(1, Math.round(size.y / css / SHRINK));
    this.#targets(size.x, size.y, qw, qh);
    const sharp = this.#sharp!, a = this.#a!, b = this.#b!;

    renderer.setRenderTarget(sharp);
    renderer.render(scene, camera);

    this.#shrink.uniforms.uTex.value = sharp.texture;
    this.#shrink.uniforms.uTexel.value.set(1 / size.x, 1 / size.y);
    this.#pass(renderer, this.#shrink, a);
    // Two blurs, the second twice as wide: a tight glow and a wide one.
    for (const step of [1, 2.5]) {
      this.#blur.uniforms.uTex.value = a.texture;
      this.#blur.uniforms.uStep.value.set(step / qw, 0);
      this.#pass(renderer, this.#blur, b);
      this.#blur.uniforms.uTex.value = b.texture;
      this.#blur.uniforms.uStep.value.set(0, step / qh);
      this.#pass(renderer, this.#blur, a);
    }

    this.#mix.uniforms.uSharp.value = sharp.texture;
    this.#mix.uniforms.uGlow.value = a.texture;
    this.#mix.uniforms.uStrength.value = strength;
    this.#pass(renderer, this.#mix, null);
  }

  dispose(): void {
    for (const t of [this.#sharp, this.#a, this.#b]) t?.dispose();
    this.#sharp = this.#a = this.#b = null;
    this.#quad.geometry.dispose();
    for (const m of [this.#shrink, this.#blur, this.#mix]) m.dispose();
  }

  #pass(renderer: WebGLRenderer, material: RawShaderMaterial, target: WebGLRenderTarget | null): void {
    this.#quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.#scene, this.#camera);
  }

  #targets(w: number, h: number, qw: number, qh: number): void {
    if (!this.#sharp || this.#sharp.width !== w || this.#sharp.height !== h) {
      this.#sharp?.dispose();
      this.#sharp = new WebGLRenderTarget(w, h, { samples: 4, depthBuffer: false });
    }
    for (const key of ['a', 'b'] as const) {
      const t = key === 'a' ? this.#a : this.#b;
      if (t && t.width === qw && t.height === qh) continue;
      t?.dispose();
      const fresh = new WebGLRenderTarget(qw, qh, { depthBuffer: false });
      if (key === 'a') this.#a = fresh; else this.#b = fresh;
    }
  }
}
