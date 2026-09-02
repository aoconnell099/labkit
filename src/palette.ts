/**
 * The palette machinery. Values are the app's; the SHAPE is labkit's.
 *
 * ⚠️ This file deliberately ships no categorical hues and no category registry.
 * Extracted from three apps, and those were the two things that did not travel:
 * a categorical scale only means something in an app with series, and a registry mapping
 * category names to colour slots is a statement about one dataset, not a design
 * decision. Both stay in the app that owns them.
 *
 * ⚠️ Every value below was COMPUTED, not chosen — lightness band, chroma floor,
 * CVD separation, contrast against the surface. Re-run a validator before
 * changing any of them, and read the values back out of the file afterwards
 * rather than trusting what you meant to type. The defaults here are a starting
 * point that passes; an app is expected to supply its own.
 */
export type Mode = 'light' | 'dark';

/**
 * ⚠️ TWO HUES. NOT THREE.
 *
 * Three status hues at text contrast on a light ground has **zero solutions** —
 * green, clay and amber sit too close in lightness, and green-vs-red is the
 * deuteranopia collision. Two apps discovered this independently, and both
 * solved it the same way: the third state carries **form** instead of hue.
 *
 * Do not add an amber. The search has been run.
 */
export interface StatusPalette {
  /** The good direction. Money in, an active account, a healthy check. */
  pos: string;
  /** The bad direction. Money out, a stopped account, a failure. */
  neg: string;
}

/**
 * Surfaces and text.
 *
 * ⚠️ `textFaint` must clear 4.5:1 against `surface`. It paints small uppercase
 * labels, notes and empty states — and in some apps the label IS the content
 * ("AWAITING INVITE"), not a decoration beside a big figure.
 *
 * The originating app shipped 2.64:1 (light) and 3.94:1 (dark) here for months.
 * Two ports found it independently and fixed it two different ways — one
 * corrected the value, one moved prose onto `textDim`. labkit does BOTH, because
 * they are not competing: a passing `textFaint` is the floor for labels, and
 * prose someone has to actually read deserves `textDim`.
 */
export interface InkPalette {
  text: string;
  /** Prose, captions, anything read rather than glanced at. */
  textDim: string;
  /** Labels that recede. Still must clear 4.5:1 — see above. */
  textFaint: string;
  surface: string;
  surfaceRaised: string;
  surfaceInset: string;
  line: string;
}

export interface Palette {
  ink: Record<Mode, InkPalette>;
  status: Record<Mode, StatusPalette>;
  /** Focus rings and the ONE primary action per screen. Never a series.
   *  ⚠️ Must clear the 0.10 chroma floor in BOTH modes or it reads as grey and
   *  a focus ring looks like a rendering artifact rather than "you are here". */
  accent: Record<Mode, string>;
  /** Always-on ambient wash so a dark app does not read as flat black.
   *  Deliberately neutral: an ambient signal that carries meaning must be
   *  anchored to a figure the screen is already stating in words. */
  floor: Record<Mode, string>;
}

/** A validated starting point. Apps are expected to supply their own. */
export const DEFAULT_PALETTE: Palette = {
  ink: {
    light: {
      text: '#14171c', textDim: '#6a7280', textFaint: '#6b7380',
      surface: '#f7f8fa', surfaceRaised: '#ffffff', surfaceInset: '#eef1f4',
      line: '#dfe3e8',
    },
    dark: {
      text: '#e9ecf0', textDim: '#98a1ae', textFaint: '#747e8d',
      surface: '#101317', surfaceRaised: '#171b21', surfaceInset: '#1f242c',
      line: '#232830',
    },
  },
  status: {
    light: { pos: '#047a60', neg: '#9c240a' },
    dark: { pos: '#29bb97', neg: '#e06351' },
  },
  accent: { light: '#59388a', dark: '#9c6ce4' },
  floor: {
    light: 'rgba(138, 145, 156, 0.07)',
    dark: 'rgba(92, 102, 114, 0.20)',
  },
};

/**
 * Stamp a palette onto the document root.
 *
 * ⚠️ Sets `background` and `colorScheme` on the ELEMENT, not only the tokens.
 * The originating app shipped a bug here for months: `index.html` painted
 * `:root { background: #101317 }` so the first paint would not be white, and
 * `applyPalette` set the `--bg` TOKEN but never the element background. `:root`
 * (0,1,0) outranks `html, body` (0,0,1), so the hardcoded hex won permanently —
 * invisible across five dark screens, and on the one light screen it painted
 * most of a short viewport near-black. **Port a light screen early.**
 */
export function applyPalette(
  mode: Mode,
  palette: Palette = DEFAULT_PALETTE,
  root: HTMLElement = document.documentElement,
): void {
  const s = root.style;
  const ink = palette.ink[mode];
  const st = palette.status[mode];

  s.setProperty('--bg', ink.surface);
  s.setProperty('--surface', ink.surfaceRaised);
  s.setProperty('--surface-inset', ink.surfaceInset);
  s.setProperty('--line', ink.line);
  s.setProperty('--text', ink.text);
  s.setProperty('--text-dim', ink.textDim);
  s.setProperty('--text-faint', ink.textFaint);

  s.setProperty('--accent', palette.accent[mode]);
  s.setProperty('--floor', palette.floor[mode]);

  // ⚠️ Domain-neutral names. Three apps named this same pigment `--money-in`,
  // `--ok` and `--pos`. A token called `--money-in` marking an ACTIVE ACCOUNT is
  // a second meaning waiting to be misread, so labkit ships the neutral name and
  // apps alias their own vocabulary on top:
  //     :root { --money-in: var(--tone-pos); }
  s.setProperty('--tone-pos', st.pos);
  s.setProperty('--tone-neg', st.neg);

  // See the note above — the token alone is not enough.
  s.background = ink.surface;
  s.colorScheme = mode;
}
