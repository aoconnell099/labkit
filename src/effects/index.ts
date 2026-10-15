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
 *
 * three.js is an optional peer dependency: an app that imports this entry
 * installs it.
 */
import { FilamentOrb } from './filament-orb';

export { LabkitEffect, type EffectSettings } from './base';
export { readPace, readLevel, parseEase, cubicBezier, PERIOD_PER_ENTER,
         type Pace, type Ease } from './pace';
export { FilamentOrb };

/** Guarded, so two copies of the entry in one page don't throw on a second
 *  define. */
if (!customElements.get('labkit-filament-orb')) {
  customElements.define('labkit-filament-orb', FilamentOrb);
}

declare global {
  interface HTMLElementTagNameMap {
    'labkit-filament-orb': FilamentOrb;
  }
}
