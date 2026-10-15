/**
 * Pen and seal: black ink on white paper, drawn by hand. Light only.
 *
 * Chosen themes, batch 3 (labkit #32). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's light pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const PEN_AND_SEAL: Theme = {
  name: 'Pen and seal',
  character: 'black ink on white paper, drawn by hand, light only',
  modes: {
    light: {
      ink: {
        text: '#161616', textDim: '#626262', textFaint: '#747474',
        surface: '#fefefe', surfaceRaised: '#ffffff', surfaceInset: '#e7e7e7',
        line: '#dddddd',
      },
      // DEFAULT_PALETTE's light pair, and neither value moved: on this ground it
      // measures 5.26:1 (pos) and 7.80:1 (neg) against the 4.5 bar.
      status: { pos: '#047a60', neg: '#9c240a' },
      // Solid ink: 20.8:1 on the ground, and the primary button's white label
      // on it 21:1.
      accent: '#000000',
      floor: 'rgba(254, 254, 254, 0.07)',
    },
  },
  // A humanist serif for titles over the system face. Stacks only: labkit
  // ships no fonts.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif",
  },
  // Flat paper with a little tooth; no glass, no glow.
  surfaces: { glass: 0, grain: 0.15, glow: 0 },
  // Quick and plain: lines are drawn on, not slid in, so entrances only fade.
  motion: {
    durState: 180,
    durEnter: 500,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
