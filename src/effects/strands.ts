/**
 * Strands: the line pieces the strand orb is drawn from, shared with the planet
 * orb's threads (labkit #53), so both draw a thread the same way. One
 * implementation: a piece that wants the strand orb's lines builds them here and
 * draws them with its shaders (filament.vert.glsl, filament.frag.glsl).
 */
import { BufferAttribute, BufferGeometry } from 'three';

export type V3 = [number, number, number];

/** What a vertex is, for the shader (`aKind`). */
export const FRAGMENT = 0, DIAL = 1, RIBBON = 2, THREAD = 3, STREAK = 4, REACH = 5;

/** Line pieces, gathered into one geometry: one draw call for every line. */
export class Lines {
  pos: number[] = [];
  layer: number[] = [];
  seed: number[] = [];
  gain: number[] = [];
  along: number[] = [];
  kind: number[] = [];
  index: number[] = [];

  /** A polyline through `pts`, as segments. */
  add(pts: V3[], layer: number, kind: number, gain: number, seed: number): void {
    const first = this.pos.length / 3;
    pts.forEach((p, i) => {
      this.pos.push(...p);
      this.layer.push(layer);
      this.seed.push(seed);
      this.gain.push(gain);
      this.along.push(pts.length > 1 ? i / (pts.length - 1) : 0);
      this.kind.push(kind);
      if (i > 0) this.index.push(first + i - 1, first + i);
    });
  }

  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    for (const [name, v] of [['aLayer', this.layer], ['aSeed', this.seed], ['aGain', this.gain],
                             ['aAlong', this.along], ['aKind', this.kind]] as const) {
      g.setAttribute(name, new BufferAttribute(new Float32Array(v), 1));
    }
    g.setIndex(this.index);
    return g;
  }
}

/** A point on a sphere of radius `r` at latitude `lat` and longitude `lon`. */
/** Rotate `p` so the plane z = 0 tilts by `tx` about x, then `ty` about y. */
export function tilt(p: V3, tx: number, ty: number): V3 {
  const [x, y, z] = p;
  const y1 = y * Math.cos(tx) - z * Math.sin(tx), z1 = y * Math.sin(tx) + z * Math.cos(tx);
  return [x * Math.cos(ty) + z1 * Math.sin(ty), y1, -x * Math.sin(ty) + z1 * Math.cos(ty)];
}

export function sph(r: number, lat: number, lon: number): V3 {
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)];
}

/**
 * A thread: a jagged line of light wandering over a sphere between `inner` and
 * `inner + depth` radii, kinked like a crack in glass. It takes `steps` to
 * `steps + more` kinks; `r` is the piece's seeded random (drift.ts).
 */
export function thread(r: () => number, inner: number, depth: number, steps = 6, more = 12): V3[] {
  let lat = Math.asin(r() * 2 - 1), lon = r() * Math.PI * 2;
  let heading = r() * Math.PI * 2;
  const radius = inner + r() * depth;
  const pts: V3[] = [sph(radius, lat, lon)];
  const n = steps + Math.floor(r() * more);
  for (let s = 0; s < n; s++) {
    heading += (r() - 0.5) * 1.8;
    const step = 0.03 + r() * 0.07;
    lat = Math.max(-1.45, Math.min(1.45, lat + Math.sin(heading) * step));
    lon += (Math.cos(heading) * step) / Math.max(0.3, Math.cos(lat));
    pts.push(sph(radius * (1 + (r() - 0.5) * 0.04), lat, lon));
  }
  return pts;
}
