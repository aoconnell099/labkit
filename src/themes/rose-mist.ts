/**
 * Rose mist: frosted cards floating over a soft pink wash. Light only.
 *
 * Chosen themes, batch 3 (labkit #32). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's light pair, and pos had to move; see `status`.
 */
import type { Theme } from '../themes';

export const ROSE_MIST: Theme = {
  name: 'Rose mist',
  character: 'frosted cards floating over a soft pink wash, light only',
  modes: {
    light: {
      ink: {
        text: '#1d1218', textDim: '#52454b', textFaint: '#64565d',
        surface: '#e7ccd9', surfaceRaised: '#edd3e0', surfaceInset: '#d0b6c3',
        line: '#c1afb8',
      },
      // ⚠️ pos is NOT the default. DEFAULT_PALETTE's #047a60 measures 3.55:1 on
      // this pink and fails the 4.5 bar. #046852 is the same green, its green
      // and blue scaled down together, at the smallest step that passes: 4.52:1
      // (green one step up, #046952, comes to about 4.46:1). neg kept the default at
      // 5.26:1.
      status: { pos: '#046852', neg: '#9c240a' },
      // A dusky mauve: 3.04:1 on the ground, just over the 3 bar.
      accent: '#9f6195',
      // The draft's label on the accent: black, the primary button's text.
      onAccent: '#000000',
      floor: 'rgba(231, 204, 217, 0.07)',
    },
  },
  // A light, rounded sans where the system has one.
  type: {
    ui: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  // Frosted glass over the wash, with a faint glow; no grain.
  surfaces: { glass: 14, grain: 0, glow: 0.2 },
  // Slow and ambient: cards fade in softly.
  motion: {
    durState: 180,
    durEnter: 500,
    easeOut: 'cubic-bezier(.22, .61, .36, 1)',
    easeIn: 'cubic-bezier(.55, .06, .68, .19)',
    enter: 'fade',
  },
};
