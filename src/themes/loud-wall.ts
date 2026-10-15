/**
 * Loud wall: flat poster red on a bright white wall. Light only.
 *
 * Chosen themes, batch 3 (labkit #32). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's light pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const LOUD_WALL: Theme = {
  name: 'Loud wall',
  character: 'flat poster red on a bright white wall, light only',
  modes: {
    light: {
      ink: {
        text: '#161614', textDim: '#61605e', textFaint: '#72726f',
        surface: '#fbfbf8', surfaceRaised: '#ffffff', surfaceInset: '#e4e4e1',
        line: '#dadad8',
      },
      // DEFAULT_PALETTE's light pair, and neither value moved: on this ground it
      // measures 5.12:1 (pos) and 7.59:1 (neg) against the 4.5 bar.
      status: { pos: '#047a60', neg: '#9c240a' },
      // A flat red: 4.79:1 on the ground, and the white label on it 4.96:1.
      accent: '#d8262a',
      floor: 'rgba(251, 251, 248, 0.07)',
    },
  },
  // A heavy grotesk for titles and a mono for figures.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "ui-monospace, 'Cascadia Mono', Consolas, monospace",
    display: "'Arial Black', 'Helvetica Neue', Impact, system-ui, sans-serif",
  },
  // Flat fields with a light grain; no glass, no glow.
  surfaces: { glass: 0, grain: 0.15, glow: 0 },
  // Percussive: state changes snap, entrances land hard and settle.
  motion: {
    durState: 70,
    durEnter: 1200,
    easeOut: 'cubic-bezier(.16, 1, .3, 1)',
    easeIn: 'cubic-bezier(.4, 0, .2, 1)',
    enter: 'fade',
  },
};
