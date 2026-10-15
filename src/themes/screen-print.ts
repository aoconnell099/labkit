/**
 * Screen print: two inks pulled by hand on cream paper. Light only.
 *
 * Chosen themes, batch 3 (labkit #32). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's light pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const SCREEN_PRINT: Theme = {
  name: 'Screen print',
  character: 'two inks pulled by hand on cream paper, light only',
  modes: {
    light: {
      ink: {
        text: '#15170d', textDim: '#5e6154', textFaint: '#707366',
        surface: '#f8fced', surfaceRaised: '#ffffff', surfaceInset: '#e1e5d6',
        line: '#d7dad0',
      },
      // DEFAULT_PALETTE's light pair, and neither value moved: on this ground it
      // measures 5.09:1 (pos) and 7.54:1 (neg) against the 4.5 bar.
      status: { pos: '#047a60', neg: '#9c240a' },
      // A print red: 4.16:1 on the ground. ⚠️ A white label on it measures
      // 4.34:1, under the 4.5 bar, so the label is the draft's black.
      accent: '#d64834',
      onAccent: '#000000',
      floor: 'rgba(248, 252, 237, 0.07)',
    },
  },
  // A slab serif for titles over the system face.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "Rockwell, 'Roboto Slab', Georgia, serif",
  },
  // Paper with a visible grain; no glass, no glow.
  surfaces: { glass: 0, grain: 0.25, glow: 0 },
  // Hand-paced: quick state changes, long fades in.
  motion: {
    durState: 60,
    durEnter: 1200,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.4, 0, .2, 1)',
    enter: 'fade',
  },
};
