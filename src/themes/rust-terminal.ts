/**
 * Rust terminal: a monospace screen in rust red on near-black. Dark only.
 *
 * Chosen themes, batch 2 (labkit #31). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's dark pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

const MONO = "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace";

export const RUST_TERMINAL: Theme = {
  name: 'Rust terminal',
  character: 'a monospace screen in rust red on near-black, dark only',
  modes: {
    dark: {
      ink: {
        text: '#f0eeed', textDim: '#949291', textFaint: '#807e7d',
        surface: '#0c0a0a', surfaceRaised: '#141211', surfaceInset: '#1c1a19',
        line: '#222120',
      },
      // DEFAULT_PALETTE's dark pair, and neither value moved: on this ground it
      // measures 8.13:1 (pos) and 5.71:1 (neg) against the 4.5 bar. ⚠️ The red
      // and the rust accent sit close in hue; the bad state still carries its
      // tick and its words.
      status: { pos: '#29bb97', neg: '#e06351' },
      // A rust red: 3.59:1 on the ground.
      accent: '#ba3f21',
      // The draft's label on the accent, the primary button's text.
      onAccent: '#f0eeed',
      floor: 'rgba(12, 10, 10, 0.20)',
    },
  },
  // Mono throughout: text, figures and titles.
  type: { ui: MONO, fig: MONO, display: MONO },
  // Flat, opaque panels with a coarse grain standing in for dither; no glow.
  surfaces: { glass: 0, grain: 0.4, glow: 0 },
  // States tick over almost at once; entrances fade in long.
  motion: {
    durState: 30,
    durEnter: 1210,
    easeOut: 'cubic-bezier(.16, 1, .3, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
