/**
 * The shared base every effect stands on (ideas plan 71, ticket 2).
 *
 * An effect is a custom element that reads the theme from CSS variables on its
 * own element: the accent, the glow, and its pace (pace.ts). It holds a
 * three.js renderer only while it is connected AND on screen, and gives the
 * WebGL context back the moment it is not: browsers keep a handful of live
 * contexts (Chrome drops the oldest past about 16), and a page of effects
 * scrolled past should not hold one each.
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
import { WebGLRenderer } from 'three';
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

export abstract class LabkitEffect extends HTMLElement {
  #renderer: WebGLRenderer | null = null;
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

  /** Build the scene on a fresh renderer (called each time it comes on screen). */
  protected abstract create(renderer: WebGLRenderer): void;
  /** Take new settings: colours, glow, pace. Called after create, and on change. */
  protected abstract update(settings: EffectSettings): void;
  /** Draw one frame at `elapsed` ms into the loop. */
  protected abstract draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void;
  /** Free what create made. The renderer itself is the base's to dispose. */
  protected abstract destroy(): void;

  connectedCallback(): void {
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

  #attach(): void {
    if (this.#renderer || !this.isConnected) return;
    this.#watch();
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true,
                                     powerPreference: 'low-power' });
    } catch {
      // No WebGL here: the element stays an empty, faded-in box rather than
      // throwing into the app.
      this.dataset.shown = '';
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    this.shadowRoot!.append(renderer.domElement);
    this.#renderer = renderer;
    this.create(renderer);
    this.#resize();
    this.#refresh();
    this.dataset.shown = '';
  }

  #detach(): void {
    this.#stop();
    if (!this.#renderer) return;
    this.destroy();
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
    this.#renderer.domElement.remove();
    this.#renderer = null;
    delete this.dataset.shown;
  }

  #resize(): void {
    const r = this.#renderer;
    if (!r) return;
    const w = Math.max(1, Math.round(this.clientWidth));
    const h = Math.max(1, Math.round(this.clientHeight));
    r.setSize(w, h, false);
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

  #frame(elapsed: number): void {
    if (!this.#renderer || !this.#current) return;
    this.draw(this.#renderer, elapsed, this.#current);
    this.#frames++;
  }
}
