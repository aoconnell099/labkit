/**
 * Magenta tube: glossy black under a hot magenta glow. Dark only.
 *
 * Chosen themes, batch 2 (labkit #31). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's dark pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const MAGENTA_TUBE: Theme = {
  name: 'Magenta tube',
  character: 'glossy black under a hot magenta glow, dark only',
  modes: {
    dark: {
      ink: {
        text: '#f1edf3', textDim: '#949196', textFaint: '#817d83',
        surface: '#0b090d', surfaceRaised: '#131014', surfaceInset: '#1b181c',
        line: '#211f22',
      },
      // DEFAULT_PALETTE's dark pair, and neither value moved: on this ground it
      // measures 8.17:1 (pos) and 5.73:1 (neg) against the 4.5 bar.
      status: { pos: '#29bb97', neg: '#e06351' },
      // A hot magenta: 4.89:1 on the ground.
      accent: '#d342b0',
      // The draft's label on the accent: near-black, since white on this
      // magenta is the weaker side.
      onAccent: '#0b090d',
      floor: 'rgba(11, 9, 13, 0.20)',
    },
  },
  // Heavy, tight caps for titles and a mono for figures.
  type: {
    ui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "ui-monospace, 'Cascadia Mono', Consolas, monospace",
    display: "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif",
  },
  // A thin gloss over the panels and the strongest glow in the kit, a halo
  // round a tube; no grain.
  surfaces: { glass: 4, grain: 0, glow: 0.8 },
  // States flick over almost at once; entrances fade in long.
  motion: {
    durState: 30,
    durEnter: 1200,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
