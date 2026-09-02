/**
 * WCAG contrast, so a palette can be ASSERTED rather than admired.
 *
 * ⚠️ This exists because the rule "colour is computed, not chosen" was, for
 * months, enforced only by comments — and a comment did not stop the originating
 * app shipping a text token at 2.64:1 against its own background. It painted
 * every small label in the app. Nobody noticed by looking, because a low-contrast
 * grey looks like a design decision.
 *
 * Import it in your own test suite:
 *
 *     import { contrast, auditPalette } from 'labkit';
 *
 *     test('the palette clears the text bar', () => {
 *       expect(auditPalette(MY_PALETTE).failures).toEqual([]);
 *     });
 *
 * ⚠️ This checks CONTRAST only. It is not a substitute for the full validator —
 * lightness band, chroma floor and colour-vision separation are not here, and a
 * palette that passes this can still put two status hues a colour-blind reader
 * cannot tell apart. Run the real thing when choosing values; run this to stop
 * them regressing.
 */
import { DEFAULT_PALETTE, type Mode, type Palette } from './palette';

/** sRGB channel -> linear. The 0.03928 kink is the spec's, not a rounding. */
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colours, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastCheck {
  mode: Mode;
  token: string;
  against: string;
  ratio: number;
  required: number;
  passes: boolean;
}

/**
 * Every token that paints text, checked against the surface it sits on.
 *
 * ⚠️ The bar is 4.5:1, not 3:1. These paint TEXT — a state label in a table
 * cell, a caveat under a figure — not chart marks. Checking status colours at
 * the mark threshold is exactly what lets an unusable pair look fine.
 */
export function auditPalette(palette: Palette = DEFAULT_PALETTE): {
  checks: ContrastCheck[];
  failures: ContrastCheck[];
} {
  const checks: ContrastCheck[] = [];

  for (const mode of ['light', 'dark'] as Mode[]) {
    const ink = palette.ink[mode];
    const st = palette.status[mode];

    const against = ink.surface;
    const text: [string, string, number][] = [
      ['text', ink.text, 4.5],
      ['textDim', ink.textDim, 4.5],
      // ⚠️ Yes, the faint step too. In some apps the small uppercase label IS
      // the content of the row, not a caption beside a big figure.
      ['textFaint', ink.textFaint, 4.5],
      ['status.pos', st.pos, 4.5],
      ['status.neg', st.neg, 4.5],
      // A focus ring is a non-text UI element, so 3:1 — but it must still be
      // visible, and an accent that reads as grey is not a focus ring.
      ['accent', palette.accent[mode], 3],
    ];

    for (const [token, value, required] of text) {
      const ratio = contrast(value, against);
      checks.push({
        mode, token, against,
        ratio: Math.round(ratio * 100) / 100,
        required,
        passes: ratio >= required,
      });
    }
  }

  return { checks, failures: checks.filter((c) => !c.passes) };
}
