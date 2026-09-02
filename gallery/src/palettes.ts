/**
 * The example palettes the gallery renders side by side.
 *
 * ⚠️ Named by CHARACTER, not by the app they came from. Three private apps use
 * these; a public gallery labelling a frame "budget" would be a dangling
 * reference to a repo nobody can open, and it would also imply the palette is
 * that app's property rather than one point in a range.
 *
 * The point of showing three is that the primitives are supposed to survive all
 * of them. Drift between apps is invisible one repo at a time and obvious when
 * the same `Section` renders three ways on one screen.
 *
 * ⚠️ Every value here is measured, and the gallery prints the measurement. If a
 * frame shows a FAIL, that is not a gallery bug — it is the palette, and the
 * point of putting the number on the screen.
 */
import type { Palette } from 'labkit';

export interface Example {
  name: string;
  /** What this palette is FOR — the reason it looks the way it does. */
  character: string;
  palette: Palette;
  /** Which mode this palette was actually designed against. */
  primary: 'light' | 'dark';
}

/** A cool near-neutral dark. The default: dense data on a near-black ground. */
const COOL_DARK: Palette = {
  ink: {
    dark: {
      text: '#e9ecf0', textDim: '#98a1ae', textFaint: '#747e8d',
      surface: '#101317', surfaceRaised: '#171b21', surfaceInset: '#1f242c',
      line: '#232830',
    },
    light: {
      text: '#14171c', textDim: '#6a7280', textFaint: '#6b7380',
      surface: '#f7f8fa', surfaceRaised: '#ffffff', surfaceInset: '#eef1f4',
      line: '#dfe3e8',
    },
  },
  status: {
    dark: { pos: '#29bb97', neg: '#e06351' },
    light: { pos: '#047a60', neg: '#9c240a' },
  },
  /* A data blue. ⚠️ This was the violet until the gallery rendered both dark
     frames side by side and they were identical — the two palettes differed in
     nothing at all. Measured: 5.43:1 dark / 4.59:1 light against their surfaces,
     and ΔE 12.5 / 16.9 from the violet, so the frames now tell the truth about
     being different. */
  accent: { dark: '#4a8ce0', light: '#2f6fd0' },
  floor: {
    dark: 'rgba(92, 102, 114, 0.20)',
    light: 'rgba(138, 145, 156, 0.07)',
  },
};

/**
 * A warm light. Paper rather than screen — for an app read at length, where a
 * near-black ground is fatiguing.
 *
 * ⚠️ Its status pair sits at 15.7 / 8.2 separation against a floor of 15 / 8.
 * Warm light is the hardest ground to find a passing pair on, which is the
 * concrete reason the two-hues rule exists.
 */
const WARM_LIGHT: Palette = {
  ink: {
    light: {
      text: '#272521', textDim: '#56524b', textFaint: '#6d6861',
      surface: '#f2ece0', surfaceRaised: '#faf6ec', surfaceInset: '#eae3d4',
      line: '#d9cfb9',
    },
    dark: {
      text: '#f0ece3', textDim: '#a9a294', textFaint: '#8b8478',
      surface: '#1a1814', surfaceRaised: '#23201a', surfaceInset: '#2b2721',
      line: '#37322a',
    },
  },
  status: {
    light: { pos: '#1a7856', neg: '#742304' },
    dark: { pos: '#4fb98c', neg: '#dd7a55' },
  },
  accent: { light: '#23483e', dark: '#6fae97' },
  floor: {
    light: 'rgba(160, 145, 120, 0.10)',
    dark: 'rgba(120, 110, 92, 0.18)',
  },
};

/**
 * Chrome. Near-achromatic with a restrained violet accent, for a service that
 * is infrastructure rather than an app with an opinion.
 *
 * ⚠️ The accent sits exactly on the 0.10 chroma floor in both modes — the most
 * restrained colour that still reads as a colour rather than grey. Four earlier
 * candidates cleared contrast and failed that floor at 0.024–0.075, which would
 * have made every focus ring look like a rendering artifact.
 */
const VIOLET_CHROME: Palette = {
  // Same ink and the same status pair as Cool dark — the ONLY difference is the
  // accent, and that is the demonstration: an app's identity moves with one hue,
  // without touching a component or a contrast ratio.
  ink: COOL_DARK.ink,
  status: COOL_DARK.status,
  accent: { dark: '#9c6ce4', light: '#59388a' },
  floor: COOL_DARK.floor,
};

export const EXAMPLES: Example[] = [
  {
    name: 'Cool dark',
    character: 'dense data on a near-black ground',
    palette: COOL_DARK,
    primary: 'dark',
  },
  {
    name: 'Warm light',
    character: 'paper, for an app read at length',
    palette: WARM_LIGHT,
    primary: 'light',
  },
  {
    name: 'Violet chrome',
    character: 'same ink as Cool dark, one different accent — which is the point',
    palette: VIOLET_CHROME,
    primary: 'dark',
  },
];
