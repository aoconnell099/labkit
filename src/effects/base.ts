/**
 * The shared base every effect stands on (ideas plan 71, ticket 2).
 *
 * An effect is a custom element that reads the theme from CSS variables on its
 * own element: the accent, the glow, and its pace (pace.ts). It draws only
 * while it is connected AND on screen, and gives its WebGL context back the
 * moment it is not.
 *
 * ⚠️ Contexts run out. Chrome keeps at most about 16 live WebGL contexts per
 * renderer process and silently loses the oldest past that; a lost one paints
 * as a white box with a broken-image mark. The hub holds 11, so two copies in
 * one process (a preview framed in the console, or two tabs on a phone, which
 * shares processes freely) went white (2026-10-17). So a page has two ways to
 * draw:
 *
 * - **own** (the default): each piece on screen has a context of its own and
 *   draws straight to its canvas. Fastest.
 * - **shared**: the pieces on screen share ONE context on a hidden canvas. Each
 *   draws its scene into the canvas's bottom-left corner, the size of the
 *   piece, and takes that corner as a bitmap for its own canvas straight away
 *   (#frame), keeping its place in the page, its CSS transforms, fade and
 *   stacking. A page in this mode never holds more than one context.
 *
 * When the browser takes away a context the page didn't give back, every piece
 * lets go at once (so nothing shows white), and then:
 *
 * - **some** of the page's contexts were lost: the browser was evicting the
 *   oldest for someone else's. The page switches to shared, for good.
 * - **all** of them were lost at once: a GPU reset, or a phone reclaiming the
 *   GPU in the background. The pieces come back in own mode after a second,
 *   unless that already happened in the last minute (then: shared).
 *
 * `<html data-labkit-gl="shared">` starts a page shared. Why not always shared:
 * the copy is cheap where Chrome composites on the GPU, but this lab's checks
 * run where it composites in software, and there the copy read the GPU back
 * once per piece: the hub fell from 60 frames a second to 9 (desktop,
 * 2026-10-17). Whether a phone keeps 60 shared is not measured yet.
 *
 * A piece sizes things by `cssSize`, `drawingSize` and `pixelRatio`, never by
 * the renderer's own size or ratio: the shared renderer is the biggest piece's
 * size, at a ratio of 1, in device pixels. `webglContexts()` and
 * `webglShared()` say how the page is drawing.
 *
 * Motion levels, which labkit otherwise applies in CSS, cannot reach a canvas.
 * So the element follows them itself:
 *
 * - `full`: its own requestAnimationFrame loop.
 * - `calm` and `off`: one still frame, then no loop.
 * - the system's reduce-motion setting forces `off` (readPace).
 *
 * The fade-in and the brighten on touch are CSS on the element (`opacity` and
 * `filter`), timed by `--dur-enter` and `--dur-state`, so under `calm` they keep
 * the theme's pace and under `off` they are instant, like everything else in
 * labkit; no frame is drawn for them.
 *
 * ⚠️ Reading is separate from drawing. `settings` needs only computed style, so
 * a check can read every theme without making a WebGL context per theme.
 */
import { Vector2, WebGLRenderer } from 'three';
import { readPace, REDUCE_MOTION, type Pace } from './pace';

export interface EffectSettings {
  /** The theme's `--accent`, as the theme wrote it. */
  accent: string;
  /** The theme's `--glow`, clamped to 0..1. */
  glow: number;
  pace: Pace;
}

/** On the element, not in the page: an app that imports an effect gets its
 *  fade and its brighten without adding a stylesheet. */
const STYLE = `
:host {
  display: block;
  position: relative;
  aspect-ratio: 1 / 1;
  opacity: 0;
  transition: opacity var(--dur-enter, 500ms) var(--ease-out, ease-out),
              filter var(--dur-state, 180ms) var(--ease-out, ease-out);
}
:host([data-shown]) { opacity: 1; }
:host(:hover), :host(:active), :host(:focus-visible) { filter: brightness(1.3); }
canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
`;

/** The page's one renderer in shared mode, while any piece is on screen. */
interface Shared {
  renderer: WebGLRenderer;
  users: Set<LabkitEffect>;
  /** The hidden canvas's size in device pixels: grows to the biggest piece, never shrinks. */
  width: number;
  height: number;
  /** When it was made (performance.now()). */
  made: number;
}

/** After a reset, the pieces come back in own mode this long after. */
const RESET_WAIT_MS = 1000;
/** A second reset this soon after the last is taken as crowding after all. */
const RESET_AGAIN_MS = 60_000;
/** The shared context's retries back off from 1 s, doubling to this... */
const SHARED_WAIT_MAX_MS = 30_000;
/** ...and start from 1 s again once a shared context has lasted this long. */
const SHARED_SETTLED_MS = 30_000;

/** Device pixels to a CSS pixel, at most 2. */
const deviceRatio = (): number => Math.min(2, window.devicePixelRatio || 1);

function newRenderer(pixelRatio: number): WebGLRenderer | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true,
                                   powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/** Give a context back on purpose (three's forceContextLoss), unless it is gone already. */
function release(renderer: WebGLRenderer): void {
  renderer.dispose();
  if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
}

export abstract class LabkitEffect extends HTMLElement {
  /** null until the first piece comes on screen and reads the page's choice. */
  static #mode: 'own' | 'shared' | null = null;
  static #shared: Shared | null = null;
  /** Every connected piece, and those holding a context now (either mode). */
  static #connected = new Set<LabkitEffect>();
  static #holding = new Set<LabkitEffect>();
  /** Own-mode canvases whose context the page gave back itself. Chrome fires
   *  `webglcontextlost` for those too, and maybe later, so a flag set around
   *  the call would be gone by then. */
  static #givenBack = new WeakSet<HTMLCanvasElement>();
  /** No piece attaches before this (performance.now()): a loss is being waited out. */
  static #waitUntil = 0;
  static #waitTimer = 0;
  /** A taken loss is judged once, at the end of the task it arrived in. */
  static #judging = false;
  static #lastReset = -Infinity;
  static #sharedWait = 1000;

  /** How many WebGL contexts the pieces on this page hold right now. */
  static get contexts(): number {
    return LabkitEffect.#mode === 'shared' ? (LabkitEffect.#shared ? 1 : 0) : LabkitEffect.#holding.size;
  }

  /** Whether this page's pieces share one context (see the top of this file). */
  static get shared(): boolean {
    return LabkitEffect.#mode === 'shared';
  }

  #renderer: WebGLRenderer | null = null;
  /** In own mode the renderer's canvas; in shared mode a bitmaprenderer one. */
  #canvas: HTMLCanvasElement | null = null;
  #bitmaps: ImageBitmapRenderingContext | null = null;
  /** Frames taken, and the newest one shown: bitmaps arrive asynchronously. */
  #taken = 0;
  #shownFrame = 0;
  #size = new Vector2(1, 1);
  #drawing = new Vector2(1, 1);
  #pr = 1;
  #visible = false;
  #raf = 0;
  #frames = 0;
  #started = 0;
  /** Where the loop stood when it last stopped, so a still frame holds there. */
  #elapsed = 0;
  #io: IntersectionObserver | null = null;
  #mo: MutationObserver | null = null;
  #ro: ResizeObserver | null = null;
  #mq: MediaQueryList | null = null;
  #current: EffectSettings | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    root.append(style);
  }

  /** What this effect takes from the theme around it. No canvas needed. */
  get settings(): EffectSettings {
    const cs = getComputedStyle(this);
    const glow = parseFloat(cs.getPropertyValue('--glow'));
    return {
      accent: cs.getPropertyValue('--accent').trim(),
      glow: Number.isFinite(glow) ? Math.min(1, Math.max(0, glow)) : 0,
      pace: readPace(this),
    };
  }

  /** Whether its own animation loop is running right now. */
  get running(): boolean {
    return this.#raf !== 0;
  }

  /** How many frames it has drawn since it was created. */
  get frames(): number {
    return this.#frames;
  }

  /** Whether it is drawing: on screen, with a renderer to draw with. */
  get drawing(): boolean {
    return this.#renderer !== null;
  }

  /** The piece's size in CSS pixels: what `renderer.getSize` gave when every
   *  renderer was the piece's own. */
  protected cssSize(target: Vector2): Vector2 {
    return target.copy(this.#size);
  }

  /** The piece's size in device pixels: what `renderer.getDrawingBufferSize`
   *  gave, and in shared mode the corner of the shared canvas it draws into. */
  protected drawingSize(target: Vector2): Vector2 {
    return target.copy(this.#drawing);
  }

  /** Device pixels to a CSS pixel, at most 2 (the shared renderer's own is 1). */
  protected get pixelRatio(): number {
    return this.#renderer ? this.#pr : deviceRatio();
  }

  /** Draw one frame now, where the loop stands, running or not: for a piece
   *  whose look changes on something the base does not watch. */
  protected redraw(): void {
    this.#frame(this.#elapsed);
  }

  /** Build the scene on the renderer (called each time it comes on screen). */
  protected abstract create(renderer: WebGLRenderer): void;
  /** Take new settings: colours, glow, pace. Called after create, and on change. */
  protected abstract update(settings: EffectSettings): void;
  /** Draw one frame at `elapsed` ms into the loop, to the canvas (render target
   *  null), sized by `cssSize`/`drawingSize`: the base has set the viewport. */
  protected abstract draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void;
  /** Free what create made. The renderer is the base's: never dispose it. */
  protected abstract destroy(): void;

  connectedCallback(): void {
    LabkitEffect.#connected.add(this);
    this.#io = new IntersectionObserver((entries) => {
      this.#visible = entries[entries.length - 1].isIntersecting;
      if (this.#visible) this.#attach(); else this.#detach();
    });
    this.#io.observe(this);

    this.#mo = new MutationObserver(this.#refresh);
    this.#watch();

    this.#mq = matchMedia(REDUCE_MOTION);
    this.#mq.addEventListener('change', this.#refresh);

    this.#ro = new ResizeObserver(() => this.#resize());
    this.#ro.observe(this);
  }

  disconnectedCallback(): void {
    LabkitEffect.#connected.delete(this);
    this.#io?.disconnect();
    this.#mo?.disconnect();
    this.#ro?.disconnect();
    this.#mq?.removeEventListener('change', this.#refresh);
    this.#io = this.#mo = this.#ro = this.#mq = null;
    this.#visible = false;
    this.#detach();
  }

  /**
   * A theme or level change lands as `style` or `data-motion` on the element
   * that was stamped: the nearest `[data-motion]` ancestor. ⚠️ Every ancestor is
   * watched, not only the one that has `data-motion` now. A framework mounts
   * the element first and stamps the theme after (the gallery's panel did), so
   * at connect time the nearest one is often `<html>`, and watching only that
   * missed every change after. The element itself is watched too, for an app
   * that stamps the effect directly.
   */
  #watch(): void {
    if (!this.#mo) return;
    this.#mo.disconnect();
    for (let el: Element | null = this; el; el = el.parentElement) {
      this.#mo.observe(el, { attributes: true, attributeFilter: ['data-motion', 'style'] });
    }
  }

  static #pageMode(): 'own' | 'shared' {
    LabkitEffect.#mode ??= document.documentElement.dataset.labkitGl === 'shared' ? 'shared' : 'own';
    return LabkitEffect.#mode;
  }

  /** Hold every attach for `ms`, then bring back the pieces on screen. */
  static #waitThenAttach(ms: number): void {
    LabkitEffect.#waitUntil = performance.now() + ms;
    clearTimeout(LabkitEffect.#waitTimer);
    LabkitEffect.#waitTimer = window.setTimeout(() => {
      LabkitEffect.#waitUntil = 0;
      for (const p of LabkitEffect.#connected) if (p.#visible) p.#attach();
    }, ms);
  }

  /** The browser took an own-mode context the page didn't give back. Judged once
   *  the task it arrived in is over, when every loss of that moment has landed. */
  static #takenAway(): void {
    if (LabkitEffect.#mode !== 'own' || LabkitEffect.#judging) return;
    LabkitEffect.#judging = true;
    setTimeout(() => {
      LabkitEffect.#judging = false;
      if (LabkitEffect.#mode !== 'own') return;
      const held = [...LabkitEffect.#holding];
      const lost = held.filter((p) => p.#renderer!.getContext().isContextLost()).length;
      const now = performance.now();
      const reset = held.length > 0 && lost === held.length && now - LabkitEffect.#lastReset > RESET_AGAIN_MS;
      for (const p of held) p.#detach();           // nothing left showing white
      if (reset) {
        LabkitEffect.#lastReset = now;
        console.info(`labkit: all ${held.length} WebGL contexts were lost at once (a GPU reset?); drawing again shortly`);
        LabkitEffect.#waitThenAttach(RESET_WAIT_MS);
      } else {
        LabkitEffect.#mode = 'shared';
        console.info(`labkit: the browser took ${lost} of this page's ${held.length} WebGL contexts away; its pieces now share one`);
        LabkitEffect.#waitThenAttach(0);
      }
    }, 0);
  }

  /** The page's shared renderer, made by the first piece to need it; null without WebGL. */
  static #join(piece: LabkitEffect): WebGLRenderer | null {
    let s = LabkitEffect.#shared;
    if (!s) {
      const renderer = newRenderer(1);
      if (!renderer) return null;
      const fresh: Shared = { renderer, users: new Set(), width: 1, height: 1, made: performance.now() };
      // three's own listener calls preventDefault; this one hands the pieces back.
      renderer.domElement.addEventListener('webglcontextlost', () => LabkitEffect.#sharedLost(fresh));
      s = LabkitEffect.#shared = fresh;
    }
    s.users.add(piece);
    return s.renderer;
  }

  /** The last piece out gives the shared context back. */
  static #leave(piece: LabkitEffect): void {
    const s = LabkitEffect.#shared;
    if (!s || !s.users.delete(piece) || s.users.size) return;
    LabkitEffect.#shared = null;
    release(s.renderer);
  }

  /** Make the hidden canvas big enough for a piece of w x h device pixels. */
  static #fit(w: number, h: number): void {
    const s = LabkitEffect.#shared;
    if (!s || (w <= s.width && h <= s.height)) return;
    s.width = Math.max(s.width, w);
    s.height = Math.max(s.height, h);
    s.renderer.setSize(s.width, s.height, false);
  }

  /** The browser took the shared context away: every piece lets go, and the ones
   *  on screen try a fresh one after a wait that doubles each time (to 30 s), and
   *  starts from 1 s again once a context has lasted 30 s. */
  static #sharedLost(s: Shared): void {
    if (LabkitEffect.#shared !== s) return;      // our own release, or old news
    LabkitEffect.#shared = null;
    for (const p of [...s.users]) p.#drop();
    s.renderer.dispose();
    if (performance.now() - s.made > SHARED_SETTLED_MS) LabkitEffect.#sharedWait = 1000;
    const wait = LabkitEffect.#sharedWait;
    LabkitEffect.#sharedWait = Math.min(SHARED_WAIT_MAX_MS, wait * 2);
    LabkitEffect.#waitThenAttach(wait);
  }

  #attach(): void {
    if (this.#renderer || !this.isConnected || performance.now() < LabkitEffect.#waitUntil) return;
    this.#watch();
    if (LabkitEffect.#pageMode() === 'own') {
      this.#pr = deviceRatio();
      const renderer = newRenderer(this.#pr);
      if (!renderer) { this.dataset.shown = ''; return; }    // no WebGL: an empty, faded-in box
      const canvas = renderer.domElement;
      canvas.addEventListener('webglcontextlost', () => {
        if (!LabkitEffect.#givenBack.has(canvas)) LabkitEffect.#takenAway();
      });
      this.#canvas = canvas;
      this.#renderer = renderer;
    } else {
      const renderer = LabkitEffect.#join(this);
      const canvas = document.createElement('canvas');
      const bitmaps = renderer ? canvas.getContext('bitmaprenderer') : null;
      if (!renderer || !bitmaps) {
        if (renderer) LabkitEffect.#leave(this);
        this.dataset.shown = '';
        return;
      }
      this.#pr = deviceRatio();
      this.#canvas = canvas;
      this.#bitmaps = bitmaps;
      this.#renderer = renderer;
    }
    LabkitEffect.#holding.add(this);
    this.shadowRoot!.append(this.#canvas!);
    this.create(this.#renderer!);
    this.#resize();
    this.#refresh();
    this.dataset.shown = '';
  }

  #detach(): void {
    const r = this.#renderer;
    if (!r) return;
    const shared = this.#bitmaps !== null;
    this.#drop();
    if (shared) LabkitEffect.#leave(this);
    else { LabkitEffect.#givenBack.add(r.domElement); release(r); }
  }

  /** Stop and free this piece's part; what happens to the renderer is the caller's. */
  #drop(): void {
    this.#stop();
    if (!this.#renderer) return;
    this.destroy();
    this.#canvas?.remove();
    this.#canvas = this.#bitmaps = this.#renderer = null;
    LabkitEffect.#holding.delete(this);
    delete this.dataset.shown;
  }

  #resize(): void {
    const r = this.#renderer;
    if (!r || !this.#canvas) return;
    const w = Math.max(1, Math.round(this.clientWidth));
    const h = Math.max(1, Math.round(this.clientHeight));
    this.#size.set(w, h);
    if (this.#bitmaps) {
      // Device pixels, whole: the shared renderer works at a ratio of 1, so the
      // viewport, the render targets and the corner taken all agree exactly.
      this.#drawing.set(Math.max(1, Math.round(w * this.#pr)), Math.max(1, Math.round(h * this.#pr)));
      this.#canvas.width = this.#drawing.x;
      this.#canvas.height = this.#drawing.y;
      LabkitEffect.#fit(this.#drawing.x, this.#drawing.y);
    } else {
      r.setSize(w, h, false);
      r.getDrawingBufferSize(this.#drawing);
    }
    // Resizing clears the canvas, and a ResizeObserver runs after this paint's
    // animation frames, so waiting for the loop's next tick would show a blank
    // frame. Draw now, running or not.
    this.#frame(this.#elapsed);
  }

  /** Re-read the theme and the level; start or stop the loop to match. */
  #refresh = (): void => {
    if (!this.#renderer) return;
    this.#current = this.settings;
    this.update(this.#current);
    if (this.#current.pace.level === 'full') {
      if (!this.running) {
        this.#started = performance.now() - this.#elapsed;
        this.#raf = requestAnimationFrame(this.#tick);
      }
    } else {
      this.#stop();
      this.#frame(this.#elapsed);
    }
  };

  #tick = (now: number): void => {
    this.#elapsed = now - this.#started;
    this.#frame(this.#elapsed);
    this.#raf = this.#renderer ? requestAnimationFrame(this.#tick) : 0;
  };

  #stop(): void {
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }

  /** Own mode: draw straight to the piece's canvas. Shared mode: draw into the
   *  shared canvas's bottom-left corner (the viewport's origin is the bottom-left
   *  in WebGL), then take that corner before anything else draws over it.
   *  `createImageBitmap` copies it at the call, and the piece's `bitmaprenderer`
   *  canvas shows the bitmap without another copy. */
  #frame(elapsed: number): void {
    const r = this.#renderer;
    if (!r || !this.#current) return;
    const bitmaps = this.#bitmaps;
    const { x: w, y: h } = this.#drawing;
    if (bitmaps) {
      r.setRenderTarget(null);
      r.setViewport(0, 0, w, h);
    }
    this.draw(r, elapsed, this.#current);
    this.#frames++;
    if (!bitmaps) return;
    const src = r.domElement;
    const n = ++this.#taken;
    createImageBitmap(src, 0, src.height - h, w, h).then((bitmap) => {
      // A later frame got there first, or the piece let go meanwhile.
      if (n < this.#shownFrame || this.#bitmaps !== bitmaps) { bitmap.close(); return; }
      this.#shownFrame = n;
      bitmaps.transferFromImageBitmap(bitmap);
    }, () => { /* the context went meanwhile: nothing to show */ });
  }
}

/** How many WebGL contexts labkit's pieces hold on this page right now. */
export function webglContexts(): number {
  return LabkitEffect.contexts;
}

/** Whether this page's pieces share one context (after the browser took some
 *  away, or because `<html data-labkit-gl="shared">` asked). */
export function webglShared(): boolean {
  return LabkitEffect.shared;
}
