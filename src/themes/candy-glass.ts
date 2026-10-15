/**
 * Candy glass: soft pastel toys under frosted glass. Light only.
 *
 * Chosen themes, batch 3 (labkit #32). The ink and accent are a measured draft,
 * carried over unchanged. The draft had no status pair, so it starts from
 * DEFAULT_PALETTE's light pair; see `status` for what that measured.
 */
import type { Theme } from '../themes';

export const CANDY_GLASS: Theme = {
  name: 'Candy glass',
  character: 'soft pastel toys under frosted glass, light only',
  modes: {
    light: {
      ink: {
        text: '#161616', textDim: '#5e5d5d', textFaint: '#6f6e6f',
        surface: '#f6f5f5', surfaceRaised: '#fdfcfc', surfaceInset: '#dfdede',
        line: '#d5d4d4',
      },
      // DEFAULT_PALETTE's light pair, and neither value moved: on this ground it
      // measures 4.88:1 (pos) and 7.23:1 (neg) against the 4.5 bar. pos has the
      // least room of the light themes that kept it.
      status: { pos: '#047a60', neg: '#9c240a' },
      // A candy pink: 3.03:1 on the ground. ⚠️ Light for an accent: the primary
      // button's white label sits on it at about 3.3:1; the kit does not audit
      // that pairing yet.
      accent: '#e75c97',
      floor: 'rgba(246, 245, 245, 0.07)',
    },
  },
  // A rounded sans where the system has one.
  type: {
    ui: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fig: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  // Frosted panels with a soft pink glow; no grain.
  surfaces: { glass: 12, grain: 0, glow: 0.3 },
  // Springy: a sharp ease-out that lands soft, and a long fade in.
  motion: {
    durState: 180,
    durEnter: 1130,
    easeOut: 'cubic-bezier(.16, 1, .3, 1)',
    easeIn: 'cubic-bezier(.7, 0, .84, 0)',
    enter: 'fade',
  },
};
