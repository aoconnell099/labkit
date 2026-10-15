/**
 * Banked ember: a warm brown-black lit by one gold glow. Dark only.
 *
 * Chosen themes, batch 2 (labkit #31). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's dark pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const BANKED_EMBER: Theme = {
  name: 'Banked ember',
  character: 'a warm brown-black lit by one gold glow, dark only',
  modes: {
    dark: {
      ink: {
        text: '#fbeae6', textDim: '#a49491', textFaint: '#8e7f7c',
        surface: '#190e0b', surfaceRaised: '#211613', surfaceInset: '#2a1e1b',
        line: '#2f2624',
      },
      // DEFAULT_PALETTE's dark pair, and neither value moved: on this warm
      // ground it measures 7.80:1 (pos) and 5.48:1 (neg) against the 4.5 bar.
      // The red is the closer of the two, since the ground leans red itself.
      status: { pos: '#29bb97', neg: '#e06351' },
      // A gold: 7.33:1 on the ground. ⚠️ Light for an accent: the primary
      // button's white label sits on it at about 2.6:1.
      accent: '#dd903d',
      floor: 'rgba(25, 14, 11, 0.20)',
    },
  },
  // A high-contrast serif for titles over a quiet sans. Figures stay in the
  // sans: the kit's `.fig` asks for tabular digits.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "Didot, 'Bodoni 72', 'Bodoni MT', 'Playfair Display', Georgia, serif",
  },
  // Opaque panels with a coarse grain and a warm glow; no glass.
  surfaces: { glass: 0, grain: 0.35, glow: 0.5 },
  // States change at once; entrances swell in slowly, like heat.
  motion: {
    durState: 0,
    durEnter: 1170,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
