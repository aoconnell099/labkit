/**
 * `<labkit-orbits>`: orbit paths, very slow and wide, for app orbs to ride
 * (#55). Wide, nearly flat ellipses seen a little from above, one to four of
 * them in layers, as hairlines in the accent with a faint glow, over a
 * transparent background. Lay it behind the orbs, as the tendrils are.
 *
 * An app gives it a list on its `orbits` property: each path has a `radius`
 * (a share of the element's half-width), an optional `color` (the theme's
 * `--accent` when unset) and `items`, how many orbs ride it, evenly spaced.
 *
 * Where an item is comes from ONE function, `orbitPlace`: the element draws its
 * paths and each item's trail with it, and an app moves its own orb elements
 * with it at the element's `loops`, so the two always agree. An item goes round
 * once in 30 to 60 loops of the theme's pace, the outer paths slower. Nothing
 * else turns: each path only leans a hair on its own slow wander (drift.ts).
 * Under calm and off it holds still, as every piece does.
 *
 * The look, after the owner's private reference (a star with planets on wide,
 * nearly flat paths, one solid and one dotted): every second path is dotted;
 * the far half of each path is dimmer than the near half; and behind each item
 * the path brightens a little, fading back over a short trail.
 *
 * Size and position come from the page: lay it over its parent with
 * `position: absolute; inset: 0`. The paths are centred in it.
 *
 * Each path is walked here, in pixels, into one ribbon mesh drawn with the
 * tendrils' own shaders, which only place and colour it.
 */
import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, Mesh, OneFactor, OrthographicCamera,
  RawShaderMaterial, Scene, SRGBColorSpace, Vector2, type WebGLRenderer,
} from 'three';
import { LabkitEffect, type EffectSettings } from './base';
import { makeWander, seedOf, wanderAt, type Wander } from './drift';
import tendrilVert from './shaders/tendril.vert.glsl?raw';
import tendrilFrag from './shaders/tendril.frag.glsl?raw';

export interface Orbit {
  /** Names the path: it seeds the path's wander and where its items start. */
  id: string;
  /** Its size, as a share of the element's half-width. */
  radius: number;
  /** A CSS colour for this path; the theme's `--accent` when unset. */
  color?: string;
  /** How many orbs ride it, evenly spaced. */
  items: number;
}

export interface OrbitPlaceAt {
  /** Where, as shares of the element's box: 0,0 its top left, 1,1 its bottom right. */
  x: number;
  y: number;
  /** How big an orb there is drawn: 1 at the nearest point, smaller at the back. */
  scale: number;
  /** True on the far half of the path, where an orb passes behind the middle. */
  behind: boolean;
}

export interface OrbitsSettings extends EffectSettings {
  /** Each path as it draws it: its colour with the accent filled in. */
  orbits: { id: string; radius: number; color: string; items: number }[];
}

/** At most this many paths are drawn. */
export const MAX_ORBITS = 4;
/** How high above the paths' plane the eye is, in radians: a little. */
const ELEVATION = 0.24;
/** How far a path leans on its wander, in radians: a hair. */
const LEAN = 0.035;
/** Loops of the pace for one round: the innermost path, and the outermost. */
const LAP_INNER = 30;
const LAP_OUTER = 60;
/** An orb's size at the far point, against 1 at the near point. */
const FAR_SCALE = 0.72;
/** The path's brightness at its far point and its near point. */
const FAR_LIGHT = 0.4;
const NEAR_LIGHT = 0.85;
/** How much of a round behind each item its trail runs, and how bright. */
const TRAIL = 0.08;
const TRAIL_LIGHT = 0.9;
/** Points along a solid path; dots along a dotted one, and the share of each
 *  dot's cell that is lit. */
const SEGMENTS = 192;
const DOTS = 110;
const DOT_SHARE = 0.38;
/** The hairline's half-width and the glow's at full glow, in CSS pixels. */
const CORE_PX = 0.7;
const GLOW_PX = 6;

/** Light adds up, as in the other pieces. */
const ADD = {
  blending: CustomBlending,
  blendSrc: OneFactor, blendDst: OneFactor,
  blendSrcAlpha: OneFactor, blendDstAlpha: OneFactor,
  transparent: true, depthTest: false, depthWrite: false,
} as const;

/** On the element: sized by the page, not square, and never in a touch's way. */
const STYLE = `
:host { aspect-ratio: auto; pointer-events: none; }
`;

/** Each path's wander and where its items start, by id. */
const wanders = new Map<string, { wander: Wander; start: number }>();
function seededFor(id: string): { wander: Wander; start: number } {
  let w = wanders.get(id);
  if (!w) {
    const seed = seedOf(id);
    w = { wander: makeWander(seed, LEAN), start: (seed % 997) / 997 };
    wanders.set(id, w);
  }
  return w;
}

/** How many loops of the pace one round of this path takes: 30 for the
 *  innermost, 60 for a path as wide as the element. */
export function orbitLap(orbit: Orbit): number {
  const r = Number.isFinite(orbit.radius) ? Math.min(1, Math.max(0, orbit.radius)) : 0;
  return LAP_INNER + (LAP_OUTER - LAP_INNER) * r;
}

/** A point `turn` of the way round the path (0 to 1, from its seeded start,
 *  the way items go), at `loops` into the pace, in a box `aspect` wide for each
 *  1 tall. The one place a path's shape is worked out. */
function pointAt(orbit: Orbit, turn: number, loops: number, aspect: number): OrbitPlaceAt & { near: number } {
  const { wander, start } = seededFor(orbit.id);
  const [tip, roll] = wanderAt(wander, loops);
  const a = (turn + start) * Math.PI * 2;
  const r = Number.isFinite(orbit.radius) ? Math.max(0, orbit.radius) : 0;
  // On the plane, in half-widths: across, and toward the eye (1 the nearest).
  const across = Math.cos(a), near = Math.sin(a);
  // Seen from a little above, the near side is lower on the screen; the
  // wander tips the plane and rolls it a hair.
  const px = r * across, py = r * near * Math.sin(ELEVATION + tip);
  const c = Math.cos(roll * 0.6), s = Math.sin(roll * 0.6);
  const x = px * c - py * s, y = px * s + py * c;
  return {
    x: 0.5 + 0.5 * x,
    y: 0.5 + 0.5 * y * aspect,
    scale: FAR_SCALE + (1 - FAR_SCALE) * (near + 1) / 2,
    behind: near < 0,
    near,
  };
}

/** How far round item `index` is at `loops`, from the path's start. */
function itemTurn(orbit: Orbit, index: number, loops: number): number {
  const n = Math.max(1, Math.floor(orbit.items) || 1);
  return index / n + loops / orbitLap(orbit);
}

/**
 * Where item `index` of `orbit` is at `loops` into the pace (elapsed time over
 * the pace's period; the element's own is its `loops`): `x` and `y` as shares
 * of the element's box, `scale` (smaller at the back), and `behind` (true on
 * the far half). `aspect` is the box's width over its height (1 when unset),
 * so the path keeps its shape in a box of any proportion. The element draws
 * with this, and an app moves its orbs with it.
 */
export function orbitPlace(orbit: Orbit, index: number, loops: number, aspect = 1): OrbitPlaceAt {
  const { x, y, scale, behind } = pointAt(orbit, itemTurn(orbit, index, loops), loops,
                                          Number.isFinite(aspect) && aspect > 0 ? aspect : 1);
  return { x, y, scale, behind };
}

export class Orbits extends LabkitEffect {
  #scene: Scene | null = null;
  #camera = new OrthographicCamera();
  #mesh: Mesh<BufferGeometry, RawShaderMaterial> | null = null;
  #orbits: Orbit[] = [];
  #loops = 0;
  #colour = new Color();
  #scratch = new Vector2();

  constructor() {
    super();
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.shadowRoot!.append(style);
  }

  /** The paths it draws, at most four. Setting the list draws one frame. */
  get orbits(): Orbit[] {
    return this.#orbits;
  }

  set orbits(list: Orbit[]) {
    this.#orbits = Array.isArray(list) ? list.slice(0, MAX_ORBITS) : [];
    this.redraw();
  }

  /** The loops into the pace it last drew at: give this to `orbitPlace` to put
   *  an orb where the element has its item. It holds still under calm and off. */
  get loops(): number {
    return this.#loops;
  }

  /** The base's settings, and each path's colour as it draws it. No canvas needed. */
  get settings(): OrbitsSettings {
    const base = super.settings;
    return {
      ...base,
      orbits: this.#orbits.map((o) => ({
        id: o.id, radius: o.radius, color: o.color || base.accent, items: o.items,
      })),
    };
  }

  /** A CSS colour as the sRGB it was written in, as the other pieces take it. */
  #rgb(css: string): [number, number, number] {
    this.#colour.set(css || '#ffffff');
    const c = this.#colour.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
    return [c.r, c.g, c.b];
  }

  protected create(): void {
    this.#scene = new Scene();
    this.#mesh = new Mesh(new BufferGeometry(), new RawShaderMaterial({
      vertexShader: tendrilVert, fragmentShader: tendrilFrag, ...ADD,
      uniforms: {
        uView: { value: [1, 1] }, uHalf: { value: 1 }, uCore: { value: CORE_PX }, uGlow: { value: 0 },
      },
    }));
    this.#mesh.frustumCulled = false;
    this.#scene.add(this.#mesh);
  }

  protected update(settings: EffectSettings): void {
    if (!this.#mesh) return;
    const u = this.#mesh.material.uniforms;
    u.uGlow.value = settings.glow;
    u.uHalf.value = CORE_PX + 1.5 + GLOW_PX * settings.glow;
  }

  protected draw(renderer: WebGLRenderer, elapsed: number, settings: EffectSettings): void {
    if (!this.#scene || !this.#mesh) return;
    const loops = elapsed / Math.max(1, settings.pace.period);
    this.#loops = loops;
    const size = this.cssSize(this.#scratch);
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    const half = this.#mesh.material.uniforms.uHalf.value as number;

    const pos: number[] = [], side: number[] = [], colour: number[] = [], fade: number[] = [];
    const index: number[] = [];
    /** One ribbon through these turns of a path. */
    const strip = (o: Orbit, rgb: [number, number, number], heads: number[], turns: number[]) => {
      const pts = turns.map((t) => {
        const p = pointAt(o, t, loops, w / h);
        // The far half dimmer; brighter just behind each item, fading back.
        let light = FAR_LIGHT + (NEAR_LIGHT - FAR_LIGHT) * (p.near + 1) / 2;
        for (const head of heads) {
          const d = head - t - Math.floor(head - t);
          if (d < TRAIL) light += TRAIL_LIGHT * (1 - d / TRAIL) ** 2;
        }
        return [p.x * w, p.y * h, Math.min(1, light)];
      });
      const first = side.length;
      for (let i = 0; i < pts.length; i++) {
        const q = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
        const dx = n[0] - q[0], dy = n[1] - q[1], l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l;
        for (const sgn of [-1, 1]) {
          pos.push(pts[i][0] + nx * half * sgn, pts[i][1] + ny * half * sgn, 0);
          side.push(sgn);
          colour.push(...rgb);
          fade.push(pts[i][2]);
        }
        if (i > 0) {
          const v = first + i * 2;
          index.push(v - 2, v - 1, v, v - 1, v + 1, v);
        }
      }
    };

    this.#orbits.forEach((o, k) => {
      if (!(o.radius > 0)) return;
      const rgb = this.#rgb(o.color || settings.accent);
      const n = Math.max(0, Math.floor(o.items) || 0);
      const heads = Array.from({ length: n }, (_, i) => itemTurn(o, i, loops));
      if (k % 2 === 0) {
        strip(o, rgb, heads, Array.from({ length: SEGMENTS + 1 }, (_, i) => i / SEGMENTS));
      } else {
        // Dotted: a short piece of path in each cell, three points each.
        for (let d = 0; d < DOTS; d++) {
          const t0 = d / DOTS, dt = DOT_SHARE / DOTS;
          strip(o, rgb, heads, [t0, t0 + dt / 2, t0 + dt]);
        }
      }
    });

    this.#fill(side.length, index.length);
    const g = this.#mesh.geometry;
    for (const [name, data] of [['position', pos], ['aSide', side], ['aColor', colour], ['aFade', fade]] as const) {
      const attr = g.getAttribute(name) as BufferAttribute;
      (attr.array as Float32Array).set(data);
      attr.needsUpdate = true;
    }
    (g.index!.array as Uint32Array).set(index);
    g.index!.needsUpdate = true;
    g.setDrawRange(0, index.length);

    this.#mesh.material.uniforms.uView.value = [w, h];
    renderer.render(this.#scene, this.#camera);
  }

  /** Room in the mesh for this many vertices and indices, replaced (the old
   *  freed) only when outgrown, as the tendrils do. */
  #fill(vertices: number, indices: number): void {
    const old = this.#mesh!.geometry;
    const room = old.getAttribute('aSide')?.count ?? -1;
    if (vertices <= room && indices <= (old.index?.count ?? 0)) return;
    const v = Math.max(256, vertices * 2), n = Math.max(1024, indices * 2);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(v * 3), 3));
    g.setAttribute('aSide', new BufferAttribute(new Float32Array(v), 1));
    g.setAttribute('aColor', new BufferAttribute(new Float32Array(v * 3), 3));
    g.setAttribute('aFade', new BufferAttribute(new Float32Array(v), 1));
    g.setIndex(new BufferAttribute(new Uint32Array(n), 1));
    old.dispose();
    this.#mesh!.geometry = g;
  }

  protected destroy(): void {
    this.#mesh?.geometry.dispose();
    this.#mesh?.material.dispose();
    this.#scene = this.#mesh = null;
  }
}
