/**
 * labkit — the lab's shared design substrate.
 *
 * Extracted 2026-09-02 from three independently-built apps: a personal-finance
 * app, a shared-house ledger, and an identity service. Nothing here was designed
 * up front. Every piece survived at least two of the three, and the comments
 * record what did NOT survive, which is usually the more useful half.
 *
 * Usage:
 *     import 'labkit/tokens.css';
 *     import { Section, StatRow, Rail, applyPalette } from 'labkit';
 *
 *     applyPalette('dark', MY_PALETTE);
 *     // or a whole theme: colours, type, surfaces and motion
 *     applyTheme(MY_THEME, 'dark', 'full');
 */
export { default as Section } from './components/Section.svelte';
export { default as StatRow } from './components/StatRow.svelte';
export { default as Rail } from './components/Rail.svelte';
export { default as Meter } from './components/Meter.svelte';
export { default as Field } from './components/Field.svelte';

export {
  applyPalette,
  DEFAULT_PALETTE,
  type Mode,
  type Palette,
  type InkPalette,
  type StatusPalette,
  modePalette,
  type ModePalette,
} from './palette';

export { resolveMode, storedPreference, setPreference } from './mode';

export { contrast, auditPalette, type ContrastCheck } from './contrast';

export {
  applyTheme,
  auditTheme,
  shippedModes,
  type Theme,
  type ThemeType,
  type ThemeSurfaces,
  type ThemeMotion,
  type EnterKind,
  type MotionLevel,
} from './themes';

// The chosen themes, one file each in themes/. Batches 2 and 3 add lines here.
export { COLD_CORE } from './themes/cold-core';
export { STILL_VIOLET } from './themes/still-violet';
