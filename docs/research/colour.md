# Research: colour — a theme from a seed and contrast targets

Ticket: labkit#1. Part of the labkit v2 plan; feeds the tokens v2 colour model
and the "how many themes" decision. Research only — no token or component
changes here (a build ticket follows).

**Question.** How should labkit generate a palette, so that a new theme is a
seed colour plus contrast targets rather than hand-picked values?

**Read first, and what they constrain.**

- `README.md` — the four rules: (1) colour is computed, not chosen; (2) two
  status hues by default; (3) tone names belong to no domain; (4) all seven
  interaction states.
- `src/palette.ts` — the `Palette` shape (`ink` × mode, `status` × mode,
  `accent`, `floor`) and a hex `DEFAULT_PALETTE`.
- `src/contrast.ts` — WCAG 2 ratio and `auditPalette`. Its own comment says the
  lightness band, chroma floor and colour-vision checks are **not** in the repo.
- Commit 3dc971f — a third status hue passes on a cool near-white
  (`#f7f8fa`) and fails on a warm cream (`#f2ece0`). The variable is the
  **ground**, not the count. `attention` became optional; its absence selects
  form. ⚠️ `README.md` rule 2 still says "never three" and now disagrees with
  `palette.ts`. Noted below, not fixed here (out of scope).

**How this was read.** All sources were fetched live on 2026-10-04 by the
worker. `m3.material.io` renders client-side and returned only its page title,
so every Material row cites Material's own public repository docs and source
instead. Anything not confirmed from a live read is marked **unverified**.
No local measurement was run: the worker could not execute a script in this
session, so numbers below are the sources' claims, not labkit's re-measurement.

## Findings

| System | What it does, in our words | Take / adapt / skip | Why, against labkit's four rules | Source | Read on |
|---|---|---|---|---|---|
| Material 3 — HCT | A colour space of hue, chroma and tone. Tone is CIE L\*, which is a transform of the same luminance Y that the WCAG ratio is built on, so tone and contrast are tied by construction. When a colour falls outside sRGB, HCT holds the tone and gives up chroma. | **Adapt** the idea (solve lightness first, then fit chroma), not the colour space. | Rule 1: keeping lightness fixed while clipping chroma is exactly what keeps a computed contrast true after gamut mapping. labkit does not need CAM16 viewing conditions to get that. | https://github.com/material-foundation/material-color-utilities/blob/main/concepts/color_spaces.md | 2026-10-04 |
| Material 3 — tone difference rule | Material's docs state a shorthand: "a difference of 40 in tone guarantees a WCAG contrast ratio ≥ 3.0; a difference of 50 in tone guarantees a contrast ratio ≥ 4.5." (Material Color Utilities, *contrast_for_accessibility.md*) | **Skip** as a gate; keep as a sanity check. | Rule 1 says read the value back and measure it. A tone-delta guarantee is a lower bound, so it over-shoots near the target; labkit's `textFaint` is meant to sit just over 4.5:1, which a 50-tone rule would push darker than needed. Not re-measured here — the guarantee itself is the source's claim. | https://github.com/material-foundation/material-color-utilities/blob/main/concepts/contrast_for_accessibility.md | 2026-10-04 |
| Material 3 — contrast solver | The library's contrast module measures ratios and can return the lightest-darker or darkest-lighter tone that still reaches a given ratio against another tone. | **Take** the shape: a function that, given a ground and a target ratio, returns the lightness that just clears it. | Rule 1 directly: the value is the output of a target, not a pick. Implemented against labkit's existing `contrast()`, so the generator and the audit cannot disagree. | https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/contrast/contrast.ts | 2026-10-04 |
| Material 3 — dynamic colour | A scheme is a set of roles. Each role can name its background and a contrast curve; the role's tone is then solved so it meets that curve's ratio against its background. Pairs of roles can be held a minimum tone apart. A global contrast level moves every ratio up or down together. | **Adapt**: each labkit ink token names the surface it sits on and its target ratio. Skip the global contrast-level dial for now. | Rule 1: per-role targets are the model the ticket asks for. Rule 2: the "hold two roles apart" idea is the hook for a separation check between `pos` and `neg`. A contrast dial is a second theme axis; labkit has no consumer asking for one. | https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/dynamic_color.ts | 2026-10-04 |
| Material 3 — seed to tonal palettes | One source colour (picked, or extracted from an image) is turned into five key colours; each becomes a tonal palette of 13 tones from 0 (black) to 100 (white). Roles then draw from those palettes. | **Skip** the five-palette expansion and image extraction. | Rule 2 and the README's "what did not survive": derived secondary/tertiary hues are a colour budget labkit has deliberately refused (no categorical scale). Labkit needs one accent hue plus a neutral, not five palettes. | https://github.com/material-foundation/material-color-utilities/blob/main/concepts/dynamic_color_scheme.md | 2026-10-04 |
| Material 3 — public guidelines site | The designer-facing pages on HCT, dynamic colour and scheme variants. | — | Could not be read: the site rendered only its title to the fetcher. Anything about scheme variants (tonal spot, etc.) is **unverified** and not used above. | https://m3.material.io/styles/color/system/how-the-system-works | 2026-10-04 (failed) |
| Radix Colors — 12-step scale | Every scale has twelve steps and each step has one job: two app backgrounds, three component backgrounds (rest, hover, active), three borders (subtle, component/focus ring, hover), two solid fills (rest, hover), and two text steps. The text steps are stated to clear APCA Lc 60 and Lc 90 over step 2 of the same scale. | **Take** the "each step has a job" discipline; **skip** the numbers as token names. | Rule 4: steps 3–5 and 7–8 are exactly the hover and active paints that `InkPalette` lacks today. Rule 3: labkit names a token by what it does (`surfaceInset`, `textFaint`), which is what Radix itself recommends aliasing to; a bare `gray-11` would re-introduce a name that means nothing on its own. | https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale | 2026-10-04 |
| Radix Colors — aliasing | Recommends aliasing scale steps to names for their use case (subtle background, border, solid, text) and to semantic names (accent, success, danger). | **Take** the use-case aliasing; **skip** the domain-flavoured semantic set. | Rule 3: use-case names match labkit's. Its semantic list includes success, warning *and* danger, i.e. three status hues; rule 2 (as amended in 3dc971f) allows a third only when measured on the ground in use. | https://www.radix-ui.com/colors/docs/overview/aliasing | 2026-10-04 |
| Radix Colors — composing a palette | Pick one accent scale and one grey; tint the grey toward the accent's hue for a more unified look, or use pure grey for a neutral one. | **Take**: the neutral ramp is derived from the seed at very low chroma. | Rule 1: the tint is a computed function of the seed, not a second choice. Fits the existing `floor` token, which the code already wants "deliberately neutral". | https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette | 2026-10-04 |
| Radix Colors — custom generator | A tool that takes an accent, a grey, a background and a mode and produces matching 12-step scales. | **Skip** (reference only). | Its inputs confirm the seed + ground model. How it computes the steps was not visible in the page text, so the method is **unverified**; labkit cannot adopt an algorithm it has not read. | https://www.radix-ui.com/colors/custom | 2026-10-04 |
| Adobe Leonardo | Generates colours by target contrast ratio: you give key colours to interpolate between, a background, and a list of ratios; it returns the swatch on that ramp nearest each ratio. A theme can shift the background's lightness and apply one contrast multiplier to every ratio. The library uses WCAG 2 ratios; the README notes exact ratios are rarely hit because of sRGB quantisation. | **Take** the core model: a theme is *background + key colour + list of target ratios*. | Rule 1, almost word for word: the output is a function of the targets. Rule 2 is untouched (Leonardo makes ramps, not status sets). Skip its interpolation through several key colours and colour-space menu — one seed, one space is enough for a kit this size. | https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md | 2026-10-04 |
| Adobe Leonardo — site | The public tool; describes generating swatches from target ratios so contrast no longer has to be checked by hand. | Reference for the above. | — | https://leonardocolor.io/ | 2026-10-04 |
| Tailwind v4 — OKLCH palette | The default palette was moved from rgb to oklch to reach wider-gamut colours. Values are fixed `oklch()` literals, eleven steps per hue (50–950), across roughly two dozen hue families. | **Adapt** only OKLCH as the space the generator *works in*; **skip** the palette. | Rule 1: the docs describe the palette as crafted by designers, and neither page makes a contrast claim, so it is a set of chosen values. README: a wide named-hue set is the categorical scale labkit decided not to ship. | https://tailwindcss.com/blog/tailwindcss-v4 · https://tailwindcss.com/docs/colors | 2026-10-04 |
| *Added:* OKLCH explainer (Evil Martians) | Why OKLCH: its L stays consistent across hues, so changing hue does not silently change readability the way HSL does. Its own changelog adds that OKLCH alone is not enough to detect contrast. | **Take** the caveat. | Reason for adding: the Tailwind pages say *that* they use OKLCH, not what it does or does not guarantee. Rule 1: OKLCH L is a good handle to search on, but the WCAG ratio must still be measured, not inferred from L. | https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl | 2026-10-04 |
| *Added:* APCA | A perceptual contrast method that reports Lc (signed, polarity-aware) instead of a ratio. Its own repo describes it as beta and the standards adopting it as still developmental. | **Skip** as the gate; consider showing it in the gallery later. | Reason for adding: Radix states its text guarantees in APCA, so the comparison needs it. labkit's `contrast.ts` and 4.5:1 floor are WCAG 2; switching the gate to a draft method would change what "passes" means without a consumer asking. | https://github.com/Myndex/apca-w3 | 2026-10-04 |

## What the four systems agree on

A theme can be fully described by **a ground, a seed hue, and a target per
role**. Material solves each role's tone against its background; Leonardo
solves each swatch's position on a ramp against a background; Radix fixes text
steps to contrast floors over its own background step. None of them can say
what a role's value is without first knowing what it sits on — which is the
same lesson 3dc971f learned about the third status hue.

Where they differ: Material and Leonardo derive values from targets at runtime
or build time; Radix and Tailwind ship hand-tuned values with (Radix) or
without (Tailwind) stated contrast floors. Only the first pair meets rule 1.

## Implication for "how many themes"

If a theme is `(ground, seed, targets)`, then a theme is a few lines of input
and the number of themes stops being a design budget. The constraint moves to
what must be re-checked per ground: the two text floors and the status
separation. labkit should therefore ship **one generator and one default spec**,
and let each app supply its own spec, rather than curating a set of named
themes.

## What labkit takes

Five decisions. Each is a change for the build ticket that follows, not made
here.

1. **New file `src/generate.ts`: a theme is `{ ground, seed, targets }`.**
   `generatePalette(spec)` returns today's `Palette` shape. For each ink token
   it fixes the seed's hue and a low chroma in OKLCH, then searches lightness
   until `contrast()` from `src/contrast.ts` just clears that token's target
   against `surface` (Material's solver + Leonardo's model). Output is sRGB hex,
   so `contrast.ts` and `auditPalette` read it unchanged. *Rules: strengthens
   rule 1 — "computed" becomes literal.*

2. **`DEFAULT_PALETTE` in `src/palette.ts` becomes the output of
   `generatePalette(DEFAULT_SPEC)`, checked by a test that compares it to the
   committed hex.** The committed hex stays (so the value can be read back out
   of the file, as rule 1 asks), and the test fails if the two drift. The
   gallery's three example palettes become three specs. This is the "how many
   themes" answer: one spec per app, no theme catalogue.

3. **Targets are named per role, and `textFaint` keeps 4.5:1.** The default
   target table: `text` 4.5 minimum (labkit's existing bar, not raised), `textDim`
   4.5, `textFaint` 4.5, `status.*` 4.5, `accent` 3.0, with `surfaceRaised`,
   `surfaceInset` and `line` set as small lightness steps from `surface` rather
   than contrast ratios. WCAG 2 stays the gate; APCA is not adopted (draft).
   Material's 50-tone shorthand is not used as the gate: it is a guarantee (a
   lower bound), so it can only land at or past the floor, while `textFaint`
   is meant to sit just over it. How far past was not measured here.

4. **Add `surfaceHover` and `surfaceActive` to `InkPalette` (tokens
   `--surface-hover`, `--surface-active`), generated as lightness steps from
   `surfaceRaised`.** Taken from Radix's steps 3–5 having one job each. *Rule 4:*
   hover and active currently have no ground-relative token, so each component
   invents one. *Rule 3:* named by job, never by step number.

5. **Status hues are generated per ground, and the generator emits
   `attention` only if it measures a passing third.** `pos` and `neg` hues are
   inputs (they carry meaning, not the seed); their lightness is solved to 4.5:1
   against the ground. A candidate `attention` is solved the same way and then
   kept only if it clears the separation floors against the other two on that
   ground; otherwise it is left `undefined` and form takes over, exactly as
   3dc971f set up. This needs the colour-vision validator that `contrast.ts`
   says lives outside the repo to be brought in. *Rule 2:* this does not break
   it — it implements the amended rule. `README.md` rule 2 should be reworded to
   match `palette.ts` ("two by default; a third only where measured on that
   ground"); that text currently contradicts the code.

## Not covered

- Categorical / chart colours — the charts ticket.
- Image-based seed extraction (Material) — no consumer needs it.
- Wide-gamut (P3) output — `contrast.ts` parses hex sRGB only; out of scope
  until a consumer asks.
