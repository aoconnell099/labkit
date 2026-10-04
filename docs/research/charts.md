# Research: a chart layer generated from the tokens

Ticket: labkit #6. One of six labkit v2 research tickets (colour · type and
spacing · motion · behaviour · tables · charts). It feeds step 3 of the plan,
the chart layer.

**Question.** How should a chart layer built from labkit's tokens work? That
covers the ECharts theme, the default chart types and their rules, annotation,
and accessibility. budget already uses ECharts 6, so the engine is settled.
This file is about what labkit puts on top of it.

**Constraints any answer has to survive.** These come from `README.md` and
`src/palette.ts`:

- *Colour is computed, not chosen.* A chart theme typed out by hand is a second
  copy of the palette, and it will drift.
- *Two status hues by default.* A third (`attention`) is optional and only
  valid against a ground where someone has measured it. Without it, the third
  state carries **form**.
- *No categorical scale in labkit.* It was cut during extraction as
  "meaningless without series". This file has to say when a chart earns one,
  and who owns it.
- `accent` is documented as "Never a series". It is for focus rings and the one
  primary action.
- `src/contrast.ts` already separates text contrast (4.5:1) from the *mark*
  threshold, and warns against checking status colours at the mark threshold.

**Method.** Everything was read on 2026-10-04 with a fetch tool that turns a
page into text and summarises it. So "read" here means that tool's account of
the page. I did not view the pages in a browser or run any chart. A cell marked
*unverified* is either my inference or something the tool could not confirm.
The "Fetch failures" section lists the pages that did not load and what replaced
them. Nothing in this file is copied from a source except the quotes, which are
attributed and one sentence at most. No code from any source is reproduced.

Every table below uses the same columns:
source · what it does, in our words · take / adapt / skip · why · source URL · read on.

---

## 1. The ECharts theme

| Source | What it does, in our words | Take / adapt / skip | Why | Source URL | Read on |
|---|---|---|---|---|---|
| ECharts handbook: style and themes | A chart picks up a theme when it is created, by name. ECharts ships a light default and a `dark` theme. Other themes come as JSON or JS files and are registered under a name before use. Below the theme, styling can come from a palette, explicit per-series styles, or a `visualMap`. | **Take** (registration by name) | Registering a named theme is the hook a generated theme plugs into. Nothing in it requires the theme to be a file someone wrote. | https://echarts.apache.org/handbook/en/concepts/style/ | 2026-10-04 |
| ECharts handbook: palettes | A palette is a list of colours that series and data items take in turn. It can be global or given to one series, and a single item can override its colour. | **Adapt** | Cycling through a list is exactly how a categorical scale gets in without anyone deciding to add one. labkit's generated palette should be short on purpose (see §3). | https://echarts.apache.org/handbook/en/concepts/style/ | 2026-10-04 |
| ECharts 6 release notes: new default theme | v6 rebuilds the default theme from design tokens for colour and spacing, so components look consistent. The v5 look ships as a separate theme file for migration. | **Take** (the idea) | ECharts now does internally what labkit wants: the theme is derived from tokens rather than written out. labkit should do the same from *its own* tokens. | https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/ | 2026-10-04 |
| ECharts 6 release notes: `setTheme` | v6 adds `setTheme` on a chart instance, so the theme can change without disposing and rebuilding the chart (which used to replay the entry animation). The page shows it taking a theme *name*. Whether it also takes a theme object is *unverified*. | **Take** | labkit's `theme.ts` already has an explicit light/dark choice. Registering one theme per mode and calling `setTheme` on toggle fits it with no re-init. | https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/ | 2026-10-04 |
| ECharts source: `src/visual/tokens.ts` | ECharts' own token module: a 20-step neutral scale, a 20-step accent scale, named roles (borders, backgrounds, axis line, tick, label, split line), a nine-colour series palette, and size steps from 2 to 50px. Dark colours are *computed* from light ones by HSL transforms. The series palette is left unchanged in dark. | **Adapt** (the role list) | It is the best map of which chart surfaces need a colour role: axis line, tick, label, split line, background, border. labkit already has ink roles that cover these. **Skip** the nine-colour palette and the HSL inversion: labkit validates each mode on its own rather than inverting one. | https://github.com/apache/echarts/blob/master/src/visual/tokens.ts | 2026-10-04 |
| ECharts source: `src/theme/dark.ts` | The built-in dark theme imports that token module and fills its keys from it. The top-level keys include `color`, `backgroundColor`, `textStyle`, `title`, `legend`, `tooltip`, `axisPointer`, the four axis types (`categoryAxis`, `valueAxis`, `logAxis`, `timeAxis`), `dataZoom`, `visualMap`, and per-series blocks such as `line`, `gauge` and `candlestick`. | **Take** (as the output shape) | This is the shape a labkit generator should return. It is also proof that a theme built by a function is normal in ECharts, not a hack. | https://github.com/apache/echarts/blob/master/src/theme/dark.ts | 2026-10-04 |
| ECharts Theme Builder | A web page for building a theme by hand and downloading it as JSON or JS. | **Skip** | It produces a hand-chosen file, which breaks rule 1. Once exported, it is a copy of the palette that no validator watches. | https://echarts.apache.org/handbook/en/concepts/style/ (links to the builder; I did not open the builder itself) | 2026-10-04 |

**What the sources did not say.** No page I read says whether ECharts can read a
CSS custom property (`var(--line)`) as a colour. ECharts draws to canvas by
default, and canvas fill styles do not resolve `var()`, so my working assumption
is that the theme must be given resolved values. That is *unverified* inference,
not a sourced fact. It is also why decision 1 below generates from the `Palette`
object and not from the CSS.

## 2. Chart grammar and default chart types

| Source | What it does, in our words | Take / adapt / skip | Why | Source URL | Read on |
|---|---|---|---|---|---|
| Observable Plot: marks | Plot has no chart types. A chart is a stack of *marks*, each a kind of shape drawn from data. Mark options called *channels* (x, y, fill, stroke) are bound to *scales*, which turn data values into positions and colours and drive the axes and legends. A rule mark at y=0 is the standard way to draw a baseline under a time series. | **Adapt** (as a way of thinking) | It is the clearest vocabulary for labkit's rules: "a bar is a mark whose length is the value, so its scale must include zero" reads better than a list of chart-type exceptions. labkit stays on ECharts, so this informs the rules, not the engine. | https://github.com/observablehq/plot/blob/main/docs/features/marks.md | 2026-10-04 |
| Observable Plot: scales | Plot infers the scale type from the data: strings and booleans become ordinal, dates become time, everything else linear. The default categorical scheme is Observable10, sequential is turbo, diverging is RdBu. A linear domain defaults to the data's min and max, and only radius and opacity default to starting at zero. | **Skip** (the defaults); **take** (the inference) | A multi-hue rainbow (turbo) and a ten-colour categorical default are exactly what rule 1 forbids. But "strings imply categories" is a useful warning: the moment a series key is a string, a categorical scale appears unless something stops it. | https://github.com/observablehq/plot/blob/main/docs/features/scales.md | 2026-10-04 |
| Observable Plot: legends | Legends are opt-in. Categorical and ordinal colour gets swatches, continuous colour gets a ramp. When colour and symbol encode the same thing, the symbol legend carries the colour too. | **Take** (opt-in) | A legend should be something a chart has to ask for. The colour-plus-symbol pairing is the same idea as ECharts decals (§4). | https://github.com/observablehq/plot/blob/main/docs/features/legends.md | 2026-10-04 |
| Datawrapper: chart-type guide | Start from the one thing the chart has to say, then pick the form. Change over time: line, area, column. Comparison: bar, column, dot plot. Part-to-whole: stacked bars, waffles, treemaps, with pies only for a few shares. Distribution and correlation: scatter. The guide warns that pie slices are hard to compare and stacked bars are poor for comparing totals. | **Take** | It is short, built around the question being asked, and agrees with Carbon. It gives labkit a small default set rather than a catalogue. | https://www.datawrapper.de/blog/chart-types-guide | 2026-10-04 |
| Datawrapper, on the method | One sentence that sums up the guide: "The chart's main statement becomes a compass that helps you not just when picking a chart type, but also when choosing e.g. the title and colors for your chart." | **Take** | It ties chart choice, title and colour to one decision, which is how labkit's `Section` already works (a title that states something). | https://www.datawrapper.de/blog/chart-types-guide | 2026-10-04 |
| Carbon: simple charts | Carbon lists bar (simple, floating, grouped, stacked), line, pie and donut, scatter, sparkline, meter and others, each with a one-line purpose: bars compare values, lines show trends over time, scatter explores correlation. The page gives no slice limit for pies. | **Adapt** | It confirms the same core set as Datawrapper. Carbon's meter overlaps labkit's existing `Meter`, which is already the right primitive for a single proportion. | https://carbondesignsystem.com/data-visualization/simple-charts/ | 2026-10-04 |
| Carbon: chart-type overview | Groups charts by structure (simple, flow, spatial), not by the question they answer. | **Skip** | Grouping by structure helps browse a catalogue. It does not help choose, and choosing is the job here. | https://carbondesignsystem.com/data-visualization/chart-types/ | 2026-10-04 |
| Carbon: axes and labels | Numeric axes start at zero for bar, area and part-to-whole charts, because a cut axis exaggerates differences. Lines and scatter plots may crop the axis to show a trend. Tick steps stay constant and dates use the reader's locale. | **Take** | It is the rule a generated theme cannot enforce on its own but a labkit chart helper can: bars and areas start at zero, lines may not. | https://carbondesignsystem.com/data-visualization/axes-and-labels/ | 2026-10-04 |
| Carbon, on the baseline | "Always start numerical axes at zero for part-to-whole and comparisons charts, such as bar and area chart." | **Take** | The clearest one-line statement of the rule among the sources. | https://carbondesignsystem.com/data-visualization/axes-and-labels/ | 2026-10-04 |

## 3. Colour in charts, and when a categorical scale is earned

| Source | What it does, in our words | Take / adapt / skip | Why | Source URL | Read on |
|---|---|---|---|---|---|
| Datawrapper: choosing colours | Grey is the most important colour. Context, secondary series and annotations go grey so the one highlight stands out. Use at most about seven colours. Use different hues for categories so no order is implied, and lightness ramps for ordered data. Reuse a colour across charts only when it means the same thing. Build ramps from lightness so colour-blind readers can still read them. | **Take** | It is the closest match to labkit's rules. "Grey plus one highlight" needs no categorical scale at all. The tool reported contrast floors of 2.5 for large text and 4 for small text. Those are lower than labkit's 4.5:1, so labkit keeps its own floor. The exact figures are as the tool reported them; I did not confirm them on the page. | https://www.datawrapper.de/academy/what-to-consider-when-choosing-colors-for-data-visualization | 2026-10-04 |
| Carbon: colour palettes | A 14-colour categorical sequence, applied in a fixed order so neighbours contrast. Single-hue groups when the number of categories is known. Monochrome sequential ramps (darkest = largest on light, lightest = largest on dark) and two diverging ramps. A four-colour alert palette: red, orange, yellow, green. | **Adapt** (the sequential rule); **skip** (the categorical and alert palettes) | The dark-mode flip of the ramp is worth keeping, and it is easy to get wrong. A four-hue alert palette directly breaks labkit's rule 2. A fixed 14-colour list is a chosen palette, not a computed one. The page gave no contrast ratio for marks and no category limit. | https://carbondesignsystem.com/data-visualization/color-palettes/ | 2026-10-04 |
| Observable Plot: scales | Covered in §2. It is listed here because its defaults show what an engine does unasked: ten categorical hues for any string key. | **Skip** | It is the failure mode labkit's generated theme has to prevent. | https://github.com/observablehq/plot/blob/main/docs/features/scales.md | 2026-10-04 |

**So when does a chart earn a categorical scale?** I put this together from the
three rows above. It is my synthesis, not something any one source says:

1. Never for one series. One series is ink, and status hues mark sign.
2. Not when direct labels or small multiples would do (Carbon and Datawrapper
   both prefer labelling in place to a legend; see §4).
3. Only when two or more *peer* series share one plot area, none of them is the
   highlight, and a reader has to tell them apart at a glance. Even then it
   stays under Datawrapper's rough ceiling of seven.
4. When it is earned, **the app owns it**, which is why labkit cut it. labkit
   can ship the *slot* in the theme generator and the validator that checks it
   (lightness band, CVD separation, 3:1 against the surface for marks), but the
   hues stay with the app that has the series. This keeps the README's reason
   for cutting it and still gives a lawful way back in.

## 4. Annotation and labelling

| Source | What it does, in our words | Take / adapt / skip | Why | Source URL | Read on |
|---|---|---|---|---|---|
| Datawrapper: text in charts | Put text next to the data it explains, label lines directly instead of using a legend, repeat units, use annotations to explain a spike or an outlier, and write the title as the finding. Keep to about two type sizes, left-align, and do not rotate axis labels. Round numbers sensibly and say what they count. | **Take** | Almost all of it maps onto existing labkit roles: the title is `Section`'s title, notes are `textDim`, units and labels are `textFaint`. | https://www.datawrapper.de/blog/text-in-data-visualizations | 2026-10-04 |
| Datawrapper, on eye travel | "Don't make your readers eye-travel that much." | **Take** | The reason direct labels beat legends, in one line. | https://www.datawrapper.de/blog/text-in-data-visualizations | 2026-10-04 |
| Datawrapper: text annotations (how-to) | Annotations can be text plus a line, an arrow or a circle pointing at the data. They work on bar, column, line, area, scatter and map charts. On small screens they can turn into numbered keys under the chart. | **Adapt** | The numbered-key fallback on narrow screens is a good rule for a layer used on phones. The editor features themselves are Datawrapper's product and not relevant. | https://www.datawrapper.de/academy/how-to-create-text-annotations | 2026-10-04 |
| Carbon: legends | Avoid a legend where possible and label the data directly. A single-series chart needs no legend. If a legend is used, it defaults to the bottom, or top or bottom in tight dashboards. | **Take** | Matches Plot (legends are opt-in) and Datawrapper. The generated theme should default to no legend. | https://carbondesignsystem.com/data-visualization/legends/ | 2026-10-04 |
| Observable Plot: text mark | Text is just another mark placed by x and y, with offsets and anchors. It can label only selected points (for example the last point of each line), and it can draw a halo in the background colour so it stays readable over marks. Plot's docs say direct labels can be read faster and more accurately than an axis alone. | **Adapt** | Two details are worth copying into ECharts defaults: label the line's end, and give labels a halo in `surface`. Both can be generated from tokens. | https://github.com/observablehq/plot/blob/main/docs/marks/text.md | 2026-10-04 |
| ECharts docs source: `markLine` | A line attached to a series. It can sit at a computed statistic (min, max, average, median) or at a fixed x or y value, with a label at its start, middle or end. ECharts also has `markPoint` and `markArea` for points and ranges. I only read the `markLine` page. The other two are known from search results, *unverified*. | **Take** | Thresholds, averages and "this period" bands are the annotations a finance app actually needs. They should be styled from tokens (`line` or `textDim`, dashed), never from a status hue unless they mean good or bad. | https://github.com/apache/echarts-doc/blob/master/en/option/partial/mark-line.md | 2026-10-04 |

## 5. Accessibility

| Source | What it does, in our words | Take / adapt / skip | Why | Source URL | Read on |
|---|---|---|---|---|---|
| ECharts handbook: aria | When `aria` is turned on, ECharts writes an `aria-label` on the chart: a sentence naming the title and chart type, then the data. The wording comes from templates that can be changed, and a hand-written `aria.description` can replace it. It is **off by default**. The page warns that charts with many points (for example a large scatter) produce descriptions too long to be useful. | **Adapt** | Turn it on in every labkit chart. The auto description is fine for a short bar chart but not for a long time series, so the chart helper should ask for a one-sentence description, ideally the same finding the title states. | https://echarts.apache.org/handbook/en/best-practices/aria/ | 2026-10-04 |
| ECharts handbook: decals | Decals are patterns laid over fills so series can be told apart without colour. They are switched on under `aria` and can be customised per pattern. In the handbook's words, "Apache ECharts 5 adds support for decal patterns as a secondary representation of color to further differentiate data." Which series types support decals, and that lines need an area fill for them to show, comes from search results and a third-party mirror, not the handbook. That part is *unverified*. | **Take** | This is labkit's "third state carries form" rule, ready-made. When `attention` is absent, the third state can be a decal on the fill rather than a third hue. It also makes a categorical scale, if an app earns one, survive greyscale and print. | https://echarts.apache.org/handbook/en/best-practices/aria/ | 2026-10-04 |
| Datawrapper: choosing colours | Test with a colour-blindness simulator before publishing, and make ramps vary in lightness, not only hue. | **Take** | labkit's validator already checks CVD separation. The generator should run it over whatever palette it emits, including any app-supplied categorical slot. | https://www.datawrapper.de/academy/what-to-consider-when-choosing-colors-for-data-visualization | 2026-10-04 |
| Carbon: chart accessibility | I could not find a Carbon page for chart accessibility (404, see below). Carbon's colour page says only that its palette was designed for accessibility, with no ratios. | **Skip** (nothing to take) | No content was read, so nothing is claimed. | https://carbondesignsystem.com/data-visualization/color-palettes/ | 2026-10-04 |
| WCAG non-text contrast (added: it is the threshold `contrast.ts` alludes to) | Marks such as bars, lines and points are graphical objects, which WCAG 2.1 SC 1.4.11 holds to 3:1 against what is next to them. **Not read live in this session.** This is from memory and *unverified*. | **Take**, pending verification | It is the floor a generated chart palette should be checked at for *marks*. Text in the chart (labels, annotations) stays at labkit's 4.5:1. | https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html (not fetched) | not read |

**Not covered by any source read here:** keyboard navigation through data points,
and a table alternative for screen readers. A labkit chart sitting inside a
`Section` that also states its key figures in a `StatRow` gives a text
alternative for free. That is my suggestion, not a sourced finding.

---

## Fetch failures

| Page tried | Result | What replaced it |
|---|---|---|
| https://observablehq.com/plot/features/marks and `/scales` | HTTP 429 (rate limited), twice | The same docs in the Plot repo on GitHub: `docs/features/marks.md`, `scales.md`, `legends.md`, `docs/marks/text.md`. They are the source of the site, but I read the repo copy, not the rendered page. |
| https://academy.datawrapper.de/article/140-… and `/133-…` | 301 to `www.datawrapper.de/academy/…` | The colours article loaded at its new address. The chart-type article 404'd there, so `www.datawrapper.de/blog/chart-types-guide` (linked from `datawrapper.de/learn`) replaced it. |
| https://carbondesignsystem.com/data-visualization/accessibility/ | HTTP 404 | Nothing. A search found no Carbon chart-accessibility page. |
| https://echarts.apache.org/handbook/en/how-to/interaction/aria/ and `/how-to/data-presentation/annotation/` | HTTP 404 | The handbook's `best-practices/aria/` page, and the `markLine` page in the `apache/echarts-doc` repo. |
| ECharts option reference (`echarts.apache.org/en/option.html`) | Not tried. It renders on the client, which this tool cannot run. | The `echarts-doc` repo source for `markLine`. |

No fetched page contained instructions aimed at the agent.

---

## What labkit takes

1. **The ECharts theme is generated from the `Palette` object, never written by
   hand.** labkit adds a function that takes a `Palette` and a `Mode` (the same
   input `applyPalette` takes) and returns an ECharts theme object, in the shape
   of ECharts' own `dark.ts` (§1). The mapping comes from roles labkit already
   has: `text` for titles and emphasised labels, `textDim` for annotations,
   `textFaint` for axis labels and units, `line` for axis lines, ticks and split
   lines, a transparent background so the `Section` surface shows through, and
   `surface` for label halos. The app registers one theme per mode under fixed
   names and calls `setTheme` when `theme.ts` toggles. It generates from the
   object rather than the CSS because canvas probably cannot resolve `var()`
   (*unverified*, §1). Before it returns, the generator runs the validator on
   what it emits: 4.5:1 for anything that paints text, 3:1 for marks (the 3:1
   figure is pending verification), plus CVD separation for any fill set. If
   that fails, it throws instead of returning a theme that drifts. ECharts 6
   building its own default theme from tokens is the precedent.

2. **The default series palette has no categorical hues.** A single series is
   drawn in ink, with Datawrapper's grey for context and one emphasised series
   in full `text`. Sign is shown with `--tone-pos` and `--tone-neg`, nothing
   else. A third state uses `attention` only if the app supplied a measured one.
   Otherwise it is a **decal or dash**, not a hue. `accent` is never a series,
   as `palette.ts` already says. A categorical slot exists in the generator's
   input but is empty by default. An app fills it only when it has two or more
   peer series in one plot that cannot be labelled directly or split into small
   multiples, keeps it to seven at most, and has it validated with the rest. The
   hues belong to the app (§3).

3. **Four default forms, chosen by the question.** Line for change over time,
   where the axis may crop. Bar or column for comparison, horizontal when labels
   are long. Stacked bar for part-to-whole instead of a pie. Scatter for
   relationships. Bars and areas always start at zero, and a labkit helper
   enforces this rather than leaving it to the theme (Carbon, §2). A single
   proportion is labkit's existing `Meter`, not a gauge or a donut. Pie, gauge
   and dual-axis charts get no defaults. An app that wants one builds it itself.

4. **Annotation is labelling in place, and the title states the finding.** No
   legend by default (Carbon, Plot). Lines are labelled at their end with a halo
   in `surface` (Plot). Thresholds, averages and periods use `markLine` and
   `markArea` in `line` or `textDim`, dashed. They get a status hue only when
   the threshold itself means good or bad. The chart's statement goes in the
   `Section` title, its caveats in the method footer. On narrow screens,
   annotations collapse to numbered notes under the chart (Datawrapper).

5. **Accessibility is on by default, and the description is written by hand.**
   Every labkit chart turns on `aria` and passes a one-sentence `aria.description`,
   normally the same sentence as the title, because the auto-generated text gets
   too long for real time series (ECharts, §5). Decals are on whenever a chart
   has more than one filled series or a form-carried third state. The figures a
   chart exists to show also appear as text nearby (a `StatRow` in the same
   `Section`), so the chart is never the only place they live. Keyboard access
   to data points is left open. No source read here covered it.
