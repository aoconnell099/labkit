/**
 * Blue haze: a deep navy haze cut by hard, cold light. Dark only.
 *
 * Chosen themes, batch 2 (labkit #31). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's dark pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const BLUE_HAZE: Theme = {
  name: 'Blue haze',
  character: 'a deep navy haze cut by hard, cold light, dark only',
  modes: {
    dark: {
      ink: {
        text: '#e7effc', textDim: '#9097a3', textFaint: '#7d8390',
        surface: '#0a101b', surfaceRaised: '#121823', surfaceInset: '#19202c',
        line: '#222730',
      },
      // DEFAULT_PALETTE's dark pair, and neither value moved: on this ground it
      // measures 7.84:1 (pos) and 5.51:1 (neg) against the 4.5 bar.
      status: { pos: '#29bb97', neg: '#e06351' },
      // A cold mid blue: 3.22:1 on the ground.
      accent: '#395fbe',
      floor: 'rgba(10, 16, 27, 0.20)',
    },
  },
  // Tall, condensed caps for titles and a thin mono for figures. Stacks only:
  // labkit ships no fonts.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "ui-monospace, 'Cascadia Mono', Consolas, monospace",
    display: "'Bahnschrift Condensed', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif",
  },
  // Hazy glass panels with a cold glow in the accent; no grain.
  surfaces: { glass: 10, grain: 0, glow: 0.5 },
  // Quick, direct state changes; panels fade in long while the haze drifts.
  motion: {
    durState: 180,
    durEnter: 1200,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
