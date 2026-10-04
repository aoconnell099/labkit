# Research: type, spacing and density — the non-colour foundations

Ticket: labkit #2 · part of the labkit v2 plan (*Component library vs framework*).
Feeds the non-colour foundations of tokens v2. Colour and motion have their own
tickets and are deliberately left out here, even where a source talks about them.

All sources were read on **2026-10-04** through a fetch tool that turns the page
into text and summarises it. Numbers below are as that tool reported them from
the page. Anything I could not read live is marked **unverified**.

## Where labkit is today (read from `src/` at 3dc971f)

- **Spacing** — `--sp-1..6` = 4, 8, 12, 18, 26, 38px. The bottom three steps sit
  on a 4px grid and the top three do not, so a gap of `--sp-4` can never line up
  with two stacked 8px units or a 4px-multiple line height.
- **Type** — there is no type scale. `src/` uses 13 distinct `rem` font sizes,
  and ten of them fall between .6rem and .85rem (9.6–13.6px at a 16px root):
  .6, .62, .64, .66, .7, .72, .74, .8, .82, .85. At that spacing two neighbours
  are not visibly different sizes; they are the same size set twice.
- **Line height** — `.btn`, `.ctl` and `td` set none, so they inherit `normal`.
  MDN says `normal` depends on the element's `font-family` (row 21), so the
  height of every button, input and table row currently changes with whichever
  face the consumer supplies in `--font-ui`. That is the one place where "labkit
  apps bring their own fonts" already breaks layout rather than just look.
- **Density** — controls and rows are sized by padding plus that inherited line
  height (`.ctl` 7px/10px, `.btn` 7px/13px, `td` 9px/8px). A button and an input
  side by side are close to, but not guaranteed, the same height.
- **Radius** — `--radius-sm` 5px, `--radius` 8px, plus a hard-coded 4px on `code`.
- **Elevation** — none. No shadow token exists; separation is hairline `--line`
  plus surface steps (`--surface`, `--surface-inset`).
- **Figures** — commit d3f459b: `--font-fig` is a real choice, not a fallback,
  and tracking is face-dependent (`--fig-tracking`). Any scale has to hold for a
  consumer whose figures are a mono *and* one whose figures are its sans.

## Sources

| # | System | What it does, in our words | Take / adapt / skip | Why | Source URL | Read on |
|---|---|---|---|---|---|---|
| 1 | Material 3 — type scale | Five roles (display, headline, title, body, label), each in large / medium / small: fifteen styles running from 57 down to 11. Title and label steps use a medium weight, the rest regular. | **Adapt** | The *role* names are useful; fifteen sizes is far more than a dense tool UI needs. labkit wants the body, label and title end of it only. Line heights and tracking per style are **unverified**: the Android doc lists only size and weight, and m3.material.io did not render (row 4). | https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Typography.md | 2026-10-04 |
| 2 | Material 3 — typeface references | Two reference faces, a "brand" one and a "plain" one, that every type style points at. Changing those two re-fonts the whole scale; a single style can still override its own face. | **Take** (already have it) | This is exactly labkit's `--font-ui` / `--font-fig` split. It confirms the shape: the scale should name *sizes and line heights*, never faces. | https://github.com/material-components/material-web/blob/main/docs/theming/typography.md | 2026-10-04 |
| 3 | Material 3 — shape scale | Seven corner steps: none 0, extra-small 4, small 8, medium 12, large 16, extra-large 28, full (pill). Components are assigned a step rather than a number. | **Adapt** | Assigning components to a step is right. Seven steps, and corners as large as 28, belong to a softer, touch-first style than labkit's; three steps cover everything labkit ships. (The material-web shape doc shows 4/6/8 only as an *example override*, not as defaults.) | https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Shape.md | 2026-10-04 |
| 4 | Material 3 — m3.material.io | The canonical guideline pages for type scale tokens and corner radius. | **Unverified** | Both pages are rendered client-side and returned only a title to the fetch tool. Nothing in this doc rests on them; rows 1–3 use the published GitHub docs instead. | https://m3.material.io/styles/typography/type-scale-tokens · https://m3.material.io/styles/shape/corner-radius-scale | 2026-10-04 (fetch returned title only) |
| 5 | IBM Carbon — 2x grid | An 8px "mini unit" is the base square; boxes and components are sized in its multiples. Type is aligned to the inside edge of box padding, so text in neighbouring boxes starts on the same line. | **Take** | The alignment rule is the cheapest professional-looking trait available: a shared left edge for text. Needs a 4/8 spacing scale to work, which labkit's top three steps break. | https://carbondesignsystem.com/elements/2x-grid/overview/ | 2026-10-04 |
| 6 | IBM Carbon — spacing | Thirteen steps: 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160px, described as multiples of two, four and eight that match the grid and type scale. | **Adapt** | Take the 4–32 run (4, 8, 12, 16, 24, 32) plus 48 as one large step. labkit's first three steps already match; 18 → 16, 26 → 24, 38 → 32 brings the rest onto the grid. The 2px and 64+ steps are for page layout labkit does not own. | https://carbondesignsystem.com/elements/spacing/overview/ | 2026-10-04 |
| 7 | IBM Carbon — type sets | Two sets: *productive* (smaller, tighter, fixed sizes, for product screens) and *expressive* (larger, responsive headings, for editorial pages). "The productive type set is primarily used within product spaces, where users benefit from a more condensed treatment." — Carbon, Typography overview. | **Take** productive · **skip** expressive | labkit is only product screens. The split is also a useful rule for consumers: marketing type is a different system, not a bigger setting of this one. | https://carbondesignsystem.com/elements/typography/overview/ | 2026-10-04 |
| 8 | IBM Carbon — productive tokens | Small text 12/16 (label, helper, code); body 14/20, with a "compact" 14/18 variant; small headings 14 at semibold; larger headings 20/28, 28/36, 32/40 at regular weight. Every line height is a multiple of 2 and most of 4. | **Adapt** | The pattern labkit lacks: each size ships *with* its line height in absolute units, and a compact variant only tightens the line height, never the size. Weight, not size, separates a small heading from body. | https://carbondesignsystem.com/elements/typography/type-sets/ | 2026-10-04 |
| 9 | IBM Carbon — type scale formula | One formula generates twenty sizes from 12 to 92px, with the increment growing every four steps. | **Skip** | Twenty generated sizes is the opposite problem from labkit's; a hand-picked set of five or six is easier to hold to. | https://carbondesignsystem.com/elements/typography/overview/ | 2026-10-04 |
| 10 | IBM Carbon — field sizes | Inputs come in three heights, 32 / 40 / 48px, with smaller for constrained or long forms. | **Adapt** | Density as a *height* token rather than per-component padding: a control is a fixed height and the text centres in it. labkit wants two modes, not three. | https://carbondesignsystem.com/components/form/usage/ | 2026-10-04 |
| 11 | IBM Carbon — data table rows | Row heights 24 / 32 / 40 / 48 / 64px; the tallest only for two-line rows; the table toolbar's height is paired with the row size. | **Adapt** | Pairing is the point: the toolbar, its buttons and the rows share heights, so edges line up across a dense screen. labkit's `td` padding should derive from a row-height token. | https://carbondesignsystem.com/components/data-table/style/ | 2026-10-04 |
| 12 | Vercel Geist — typography | Named by pixel size per job: heading, button, label, copy. *Label* is for single lines and has room for an icon; *copy* is for running text with a taller line height. Label has mono sizes at 12–14 and a tabular-figures option. | **Take** | The label/copy split matches labkit's two kinds of text: one-line UI chrome (buttons, cells, rails) and prose (`.empty`, `.notice`, hints). Each wants its own line height at the *same* font size. Tabular is a modifier on label, which fits `.fig`. | https://vercel.com/geist/typography | 2026-10-04 |
| 13 | Vercel Geist — materials | Surfaces and floating layers are a single scale that pairs radius with lift: in-page surfaces at 6 or 12px radius; tooltip 6, menu and modal 12, fullscreen 16, each with more shadow than the last. | **Adapt** | Tying radius to how far a thing floats is a clean rule labkit can use with three radii. The shadow values themselves are colour and are left to the colour ticket. | https://vercel.com/geist/materials | 2026-10-04 |
| 14 | Vercel Geist — grid | A component for visible cell-and-guide layouts on marketing and docs pages; plain column layouts should just use CSS grid; never nest more than one level. | **Skip** | Marketing layout; labkit has no visible guides. | https://vercel.com/geist/grid | 2026-10-04 |
| 15 | Linear — 2024 UI redesign | Headings moved to a display cut of the same family as body text (Inter Display over Inter). Stated aims: less visual noise, keep alignment, more hierarchy and density in navigation. Layouts were tried from condensed to spacious across platforms. (It also moved theme generation to LCH with three inputs, which is colour and out of scope.) | **Take** (as advice to consumers) | The pairing is inside one family: a display cut for large text, a text cut for small. That is advice for a consumer choosing `--font-ui`, not a token. The density aims back the two-mode plan. Post dated 2024-03-28 per the page. | https://linear.app/now/how-we-redesigned-the-linear-ui | 2026-10-04 |
| 16 | Linear — 2026 refresh | Dims the sidebar so content leads, compacts tab bars, uses fewer and smaller icons, softens borders and separators, keeps the density. "…not every element of the interface should carry equal visual weight." — Charlie Aufmann and Maxime Heckel, Linear, 2026-03-12. | **Take** | Hierarchy by *dimming and removing*, not by adding size steps. That is the reason labkit's type scale can be short. | https://linear.app/now/behind-the-latest-design-refresh | 2026-10-04 |
| 17 | Stripe Apps — style tokens | A named spacing scale: 0, 2, 4, 8, 16, 24, 32, 48px (xxsmall to xxlarge). Apps cannot choose arbitrary faces; layout uses "stacks" with a gap token instead of margins. | **Take** the scale shape | Independently lands on nearly the same 4/8 run as Carbon (row 6). Two unrelated systems agreeing is the evidence for 16/24/32. | https://docs.stripe.com/stripe-apps/style | 2026-10-04 |
| 18 | Stripe Apps — type tokens | Reported as four named styles: heading, subheading, body, caption. | **Unverified** | The table of type styles did not render through the fetch tool; the four names come from a search-result summary only. Not relied on. | https://docs.stripe.com/stripe-apps/style | 2026-10-04 (table not rendered) |
| 19 | Stripe Apps — design guidelines | Custom styling is limited on purpose, to keep apps consistent with the Dashboard and to hold an accessibility bar. Brand colour is allowed in one place only, the app indicator. | **Take** (as a principle) | Restraint enforced by the API rather than by review. Matches labkit's existing habit of putting the rule in the token file. | https://docs.stripe.com/stripe-apps/design | 2026-10-04 |
| 20 | Stripe — Elements Appearance API | One `spacingUnit` that all spacing derives from (raise it for a roomier layout); one `fontSizeBase` from which the other sizes scale in `rem`; one `borderRadius` reused across inputs, tabs and the rest. It also advises inputs of at least 16px on mobile. | **Take** | Density as one knob is the model for labkit's density modes. The 16px input note matters because tokens.css calls Mobile Safari a delivery surface, and `.ctl` is .85rem (13.6px). That this triggers zoom-on-focus in iOS Safari is common knowledge but **unverified** here. | https://docs.stripe.com/elements/appearance-api.md?api-integration=paymentintents | 2026-10-04 |
| 21 | MDN — `line-height` *(added: proves the font-dependence claim, which matters because every consumer brings its own face)* | `normal` is set by the browser, roughly 1.2, and varies with the element's font family. For paragraph text MDN recommends at least 1.5. | **Take** | This is why labkit's controls change height with the consumer's font. Explicit line heights remove that. | https://developer.mozilla.org/en-US/docs/Web/CSS/line-height | 2026-10-04 |
| 22 | Stripe — "Connect: behind the front-end experience" (2017) | A front-end implementation write-up, mostly about animation. | **Skip** | Read as a candidate for "Stripe's published writing on its design system"; it does not cover type, spacing or density. Motion is another ticket. | https://stripe.com/blog/connect-front-end-experience | 2026-10-04 |

**Not used:** search results for "Stripe design system" mostly pointed to
third-party style dumps (sites reverse-engineering Stripe's marketing CSS).
They are not Stripe's writing, so they were not cited. I found no public Stripe
post on its internal design system's type or spacing. The "Stripe" rows above
come from its public developer docs.

## Why it reads as professional

Observable traits, not adjectives. Each is something you could check on a
screenshot.

1. **Few sizes, separated by weight and dimming.** Product UI runs on two or
   three body-range sizes. A small heading is body size at a heavier weight
   (Carbon, row 8), and less important chrome is dimmed rather than shrunk
   (Linear, row 16). labkit instead has ten sizes inside 4px, which reads as
   unintentional.
2. **Every vertical measure lands on a 4px grid.** Line heights, control
   heights, row heights and gaps are all multiples of 4 (Carbon rows 5, 6, 8;
   Stripe row 17), so baselines and edges line up across neighbouring panels.
3. **Shared edges.** Text in adjacent boxes starts at the same x, because type
   aligns to box padding (Carbon, row 5). A button, an input and a table row in
   the same toolbar share a height (Carbon, rows 10–11).
4. **Dense by default, with density as one switch.** Body at 13–14px with
   single-line UI text at a tight line height, and a single knob to open it up
   (Stripe row 20, Carbon rows 10–11, Linear row 15). The density does not come
   from shrinking type below that range.
5. **Restraint in chrome.** Hairlines over boxes, small and consistent corners,
   few icons, borders at low contrast, and shadow kept for things that float
   (Linear row 16, Geist row 13, Stripe row 19).
6. **Type pairing within one voice.** One family for UI text, with a display cut
   only for large text (Linear row 15). A second face, mono or tabular, is used
   only for figures and code (Geist row 12; labkit's `--font-fig`).

## What labkit takes

Five decisions for the tokens v2 build ticket. This ticket does not change
`tokens.css`.

1. **Put `--sp-*` on a 4px grid.** In `src/tokens.css`, `--sp-4/5/6` change
   from 18/26/38 to 16/24/32, and a new `--sp-7: 48px` is added. The names stay,
   so the gallery's `EXPECTED` list in `gallery/src/Frame.svelte` only gains
   `--sp-7`, plus the new tokens from decisions 2–4. Component literals that sit beside the scale (`gap: 5px` in Field,
   `gap: 6px` on `.rail`, the 7/9/13px paddings) move onto it or derive from
   decision 3. *(Carbon row 6, Stripe row 17.)*
2. **Replace the 13 ad-hoc font sizes with six size+line-height pairs, in
   `rem`, line heights on the 4px grid.** New tokens `--fs-xs` .6875rem/1rem
   (11/16), `--fs-sm` .75rem/1rem (12/16), `--fs-md` .8125rem/1.25rem (13/20),
   `--fs-base` .875rem/1.25rem (14/20), `--fs-lg` 1.125rem/1.75rem (18/28),
   `--fs-xl` 2rem/2.5rem (32/40), each with a matching `--lh-*`. Mapping: the
   .6–.66rem labels, `th` and rail go to `xs`; `.btn.small`, hints, errors and
   the 0.7–0.74rem subs go to `sm`; `.btn`, `.ctl`, `table` and `.notice` go to
   `md`; `.empty` and prose go to `base` with a prose line height ≥ 1.5 (MDN);
   `StatRow .val` goes to `lg` and `.big .val` to `xl`. Rule in the file header:
   *no `font-size` outside these tokens, and no element left on
   `line-height: normal`*, because `normal` follows the consumer's face (row 21).
   *(Carbon row 8, Geist row 12.)*
3. **Add density as two height tokens and one switch.** New `--ctl-h` and
   `--row-h`, with `html[data-density="compact"]` giving 28/32px and the
   default, comfortable, giving 32/40px. `.btn`, `.ctl` and `td` use the height
   and centre their text, instead of padding plus an inherited line height, so a
   button, an input and a row in one toolbar are the same height under any
   consumer font. On `(pointer: coarse)` `.ctl` uses at least 16px text (Stripe
   row 20). *(Carbon rows 10–11, Stripe row 20.)*
4. **Three radii tied to layer, no hard-coded corners.** `--radius-sm` 5 → 4px
   (controls, `code`, focus ring; replaces the literal `4px` on `code`),
   `--radius` stays 8px (in-page surfaces), new `--radius-lg: 12px` for floating
   layers (menus, popovers, dialogs). The rule goes in a comment: radius is
   chosen by how far the thing floats, never per component. *(M3 row 3, Geist
   row 13.)*
5. **Elevation is one token for floating layers only, and it lives with the
   palette.** In-page separation stays hairline `--line` plus surface steps. The
   build adds a single `--shadow-float` used only alongside `--radius-lg`.
   Because a shadow is a colour, `applyPalette()` in `src/palette.ts` stamps it,
   per the tokens.css header, and the colour ticket owns its value. tokens.css
   only references it. *(Geist row 13, Linear row 16.)*

Left with consumers, not tokens: the choice of face and a display cut for
large sizes (row 15). The existing `--font-fig` / `--fig-tracking` contract
from d3f459b is unchanged. The sizes above are in `rem` and carry explicit line
heights, so they hold whether figures are a mono or the UI sans.
