/**
 * Black glint: absolute black that holds still, with one small red glint. Dark only.
 *
 * Chosen themes, batch 2 (labkit #31). The text ramp and the ground are a
 * measured draft, carried over unchanged. Three values are NOT the draft's, and
 * each says why below: the accent, the line and the inset. The draft had no
 * status pair, so it starts from DEFAULT_PALETTE's dark pair.
 */
import type { Theme } from '../themes';

export const BLACK_GLINT: Theme = {
  name: 'Black glint',
  character: 'absolute black that holds still, with one small red glint, dark only',
  modes: {
    dark: {
      ink: {
        text: '#eeeeee', textDim: '#898989', textFaint: '#767676',
        // ⚠️ Raised panels are the ground itself: on this theme a panel is told
        // apart by its hairline, not its fill.
        surface: '#000000', surfaceRaised: '#000000',
        // The draft's #010101 and #030303 measure 1.0:1 on black: a Meter's
        // empty track and every border, a Field's included, disappeared. These
        // are the smallest greys that read: 1.21:1 and 1.50:1.
        surfaceInset: '#1a1a1a',
        line: '#2c2c2c',
      },
      // DEFAULT_PALETTE's dark pair, and neither value moved: on pure black it
      // measures 8.65:1 (pos) and 6.07:1 (neg) against the 4.5 bar.
      status: { pos: '#29bb97', neg: '#e06351' },
      // ⚠️ Not the draft's near-white. The primary button puts a white label on
      // the accent, so a white accent left it blank, and a grey one reads as no
      // focus ring at all. One small red instead: 3.57:1 on the ground, and the
      // white label on it 5.88:1.
      accent: '#c8102e',
      floor: 'rgba(0, 0, 0, 0.20)',
    },
  },
  // A thin, open sans for titles over the system face.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "'Segoe UI Light', 'Helvetica Neue', system-ui, sans-serif",
  },
  // A soft blur behind panels; no grain, no glow.
  surfaces: { glass: 8, grain: 0, glow: 0 },
  // Long holds: entrances fade slowly up out of the black.
  motion: {
    durState: 180,
    durEnter: 1160,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
