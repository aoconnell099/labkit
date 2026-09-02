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
} from './palette';

export { resolveMode, storedPreference, setPreference } from './theme';
