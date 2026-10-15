/**
 * Still violet: a violet-black ground where everything arrives slowly. Dark only.
 *
 * Chosen themes, batch 1 (labkit #29). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's dark pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const STILL_VIOLET: Theme = {
  name: 'Still violet',
  character: 'a violet-black ground where everything arrives slowly, dark only',
  modes: {
    dark: {
      ink: {
        text: '#eeedf6', textDim: '#95949c', textFaint: '#818188',
        surface: '#0e0d13', surfaceRaised: '#15151b', surfaceInset: '#1e1d23',
        line: '#252429',
      },
      // DEFAULT_PALETTE's dark pair, and neither value moved: on this ground it
      // measures 7.97:1 (pos) and 5.59:1 (neg) against the 4.5 bar. A darker
      // ground than the default's only raises a light hue's ratio.
      status: { pos: '#29bb97', neg: '#e06351' },
      // A muted indigo: 3.22:1 on the ground, exactly on the 0.10 chroma floor.
      accent: '#535f9d',
      floor: 'rgba(14, 13, 19, 0.20)',
    },
  },
  // A light, open sans throughout. Figures stay in it: the kit's `.fig` asks
  // for tabular digits.
  type: {
    ui: "'Segoe UI Variable Display', 'Segoe UI', system-ui, -apple-system, sans-serif",
    fig: "'Segoe UI Variable Display', 'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  // Soft panels: a little glass, a fine grain, a faint glow.
  surfaces: { glass: 6, grain: 0.25, glow: 0.3 },
  // The longest entrance in the kit, on a gentle curve; nothing snaps.
  motion: {
    durState: 180,
    durEnter: 1190,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
