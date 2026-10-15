/**
 * Cold core: near-black instrument panels lit by one cold cyan glow. Dark only.
 *
 * Chosen themes, batch 1 (labkit #29). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's dark pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const COLD_CORE: Theme = {
  name: 'Cold core',
  character: 'near-black instrument panels lit by one cold glow, dark only',
  modes: {
    dark: {
      ink: {
        text: '#eceef5', textDim: '#909298', textFaint: '#7d7e85',
        surface: '#090a0e', surfaceRaised: '#101116', surfaceInset: '#18191e',
        line: '#1f2024',
      },
      // DEFAULT_PALETTE's dark pair, and neither value moved: on this ground it
      // measures 8.15:1 (pos) and 5.72:1 (neg) against the 4.5 bar. A darker
      // ground than the default's only raises a light hue's ratio.
      status: { pos: '#29bb97', neg: '#e06351' },
      // A deep cyan-blue: 3.45:1 on the ground, chroma 0.128 over the 0.10 floor.
      accent: '#0e6aaa',
      floor: 'rgba(9, 10, 14, 0.20)',
    },
  },
  // A narrow, engineered face for titles and a mono for figures. Stacks only:
  // labkit ships no fonts.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "ui-monospace, 'Cascadia Mono', Consolas, monospace",
    display: "Bahnschrift, 'DIN Alternate', 'Arial Narrow', system-ui, sans-serif",
  },
  // See-through panels with a glow in the accent; no grain.
  surfaces: { glass: 14, grain: 0, glow: 0.6 },
  // State changes all but instant, entrances long and soft: panels fade in
  // slowly and nothing travels.
  motion: {
    durState: 20,
    durEnter: 870,
    easeOut: 'cubic-bezier(.16, 1, .3, 1)',
    easeIn: 'cubic-bezier(.7, 0, .84, 0)',
    enter: 'fade',
  },
};
