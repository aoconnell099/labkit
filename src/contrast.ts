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
import { DEFAULT_PALETTE, modePalette, onAccentFor, type Mode, type ModePalette, type Palette } from './palette';

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
  /** The token it sits on: `surface`, or `accent` for the label on a button. */
  on: 'surface' | 'accent';
  /** That token's value. */
  against: string;
  ratio: number;
  required: number;
  passes: boolean;
}

/**
 * Every token that paints text, checked against the surface it sits on, and the
 * primary button's label against the accent it sits on.
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
    checks.push(...auditMode(mode, modePalette(palette, mode)));
  }

  return { checks, failures: checks.filter((c) => !c.passes) };
}

/** One mode's checks. The one implementation behind `auditPalette` and
 *  `auditTheme`, so a theme is held to exactly the bar a palette is. */
export function auditMode(mode: Mode, values: ModePalette): ContrastCheck[] {
  const ink = values.ink;
  const st = values.status;

  const text: [string, string, number, 'surface' | 'accent'][] = [
    ['text', ink.text, 4.5, 'surface'],
    ['textDim', ink.textDim, 4.5, 'surface'],
    // ⚠️ Yes, the faint step too. In some apps the small uppercase label IS
    // the content of the row, not a caption beside a big figure.
    ['textFaint', ink.textFaint, 4.5, 'surface'],
    ['status.pos', st.pos, 4.5, 'surface'],
    ['status.neg', st.neg, 4.5, 'surface'],
    // A focus ring is a non-text UI element, so 3:1 — but it must still be
    // visible, and an accent that reads as grey is not a focus ring.
    ['accent', values.accent, 3, 'surface'],
    // ⚠️ The primary button's label, on the accent rather than the surface. It
    // was a fixed white for months, unchecked: on a gold accent it measured
    // about 2.6:1, and a white accent left it blank (labkit #35).
    ['onAccent', onAccentFor(values), 4.5, 'accent'],
  ];

  return text.map(([token, value, required, on]) => {
    const against = on === 'accent' ? values.accent : ink.surface;
    const ratio = contrast(value, against);
    return {
      mode, token, on, against,
      ratio: Math.round(ratio * 100) / 100,
      required,
      passes: ratio >= required,
    };
  });
}
