/**
 * Film page: a white page with thin rules and a serif voice. Light only.
 *
 * Chosen themes, batch 3 (labkit #32). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's light pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const FILM_PAGE: Theme = {
  name: 'Film page',
  character: 'a white page with thin rules and a serif voice, light only',
  modes: {
    light: {
      ink: {
        text: '#161616', textDim: '#636363', textFaint: '#747474',
        // ⚠️ Raised panels are the page itself: a panel is told apart by its
        // rule, not its fill.
        surface: '#ffffff', surfaceRaised: '#ffffff', surfaceInset: '#e7e7e7',
        line: '#dddddd',
      },
      // DEFAULT_PALETTE's light pair, and neither value moved: on white it
      // measures 5.31:1 (pos) and 7.86:1 (neg) against the 4.5 bar.
      status: { pos: '#047a60', neg: '#9c240a' },
      // Near-black: 19.7:1 on the page. The label on it is the draft's white.
      accent: '#0a0b0f',
      onAccent: '#ffffff',
      floor: 'rgba(255, 255, 255, 0.07)',
    },
  },
  // Serif text, thin condensed caps for titles, and the system sans for
  // figures, whose digits sit even.
  type: {
    ui: "Georgia, 'Times New Roman', serif",
    fig: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "'Bahnschrift SemiLight Condensed', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif",
  },
  // A soft film grain; no glass, no glow.
  surfaces: { glass: 0, grain: 0.1, glow: 0 },
  // Measured: state changes are near instant, entrances fade in slow.
  motion: {
    durState: 30,
    durEnter: 1120,
    easeOut: 'cubic-bezier(.16, 1, .3, 1)',
    easeIn: 'cubic-bezier(.7, 0, .84, 0)',
    enter: 'fade',
  },
};
