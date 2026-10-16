/**
 * labkit/effects — the effects shelf (ideas plan 71).
 *
 * Set pieces built once, each reading its colour, glow and pace from the theme
 * around it. ⚠️ A separate entry, and the ONLY place three.js loads: `labkit`
 * itself never imports this, so an app that draws no 3D never loads three.js.
 *
 * Usage:
 *     import 'labkit/effects';            // defines the elements, once
 *     // <labkit-filament-orb></labkit-filament-orb> inside a themed element
 *     // <labkit-planet-orb style="--effect-tint: #2fb5a0"></labkit-planet-orb>
 *     // <labkit-orbit-rings><labkit-filament-orb></labkit-filament-orb></labkit-orbit-rings>
 *     // <labkit-tendrils style="position: absolute; inset: 0"></labkit-tendrils>,
 *     //   then el.tendrils = [{ id: 'a', from: [40, 40], to: [300, 220] }]
 *
 * A piece's colour is the theme's `--accent`; the planet orb takes
 * `--effect-tint` first, so each app's orb can wear its own colour.
 *
 * three.js is an optional peer dependency: an app that imports this entry
 * installs it.
 */
import { FilamentOrb } from './filament-orb';
import { PlanetOrb } from './planet-orb';
import { OrbitRings, ORB_SHARE } from './orbit-rings';
import { Tendrils } from './tendrils';

export { LabkitEffect, type EffectSettings } from './base';
export { readPace, readLevel, parseEase, cubicBezier, PERIOD_PER_ENTER,
         type Pace, type Ease } from './pace';
export { seeded, makeWander, wanderAt, bobAt, pulseAt, type Wander, type Pulse } from './drift';
export { Bloom } from './bloom';
export { type PlanetSettings } from './planet-orb';
export { type Tendril, type TendrilSettings } from './tendrils';
export { FilamentOrb, PlanetOrb, OrbitRings, ORB_SHARE, Tendrils };

/** Guarded, so two copies of the entry in one page don't throw on a second
 *  define. */
if (!customElements.get('labkit-filament-orb')) {
  customElements.define('labkit-filament-orb', FilamentOrb);
}
if (!customElements.get('labkit-planet-orb')) {
  customElements.define('labkit-planet-orb', PlanetOrb);
}
if (!customElements.get('labkit-orbit-rings')) {
  customElements.define('labkit-orbit-rings', OrbitRings);
}
if (!customElements.get('labkit-tendrils')) {
  customElements.define('labkit-tendrils', Tendrils);
}

declare global {
  interface HTMLElementTagNameMap {
    'labkit-filament-orb': FilamentOrb;
    'labkit-planet-orb': PlanetOrb;
    'labkit-orbit-rings': OrbitRings;
    'labkit-tendrils': Tendrils;
  }
}
