# Research: what a labkit table should be

Ticket: labkit #5. One of six labkit v2 research tickets (colour · type and
spacing · motion · behaviour · tables · charts).

**Question.** Should a labkit table be paint only, or paint plus an engine? If an
engine, which one? The answer decides whether labkit ships a table at all.

**Constraint any answer has to survive.** This comes from homelab
`docs/FRONTEND_HANDOFF.md` §3, which this clone cannot read, so it is restated
from the ticket rather than verified here. budget's Overview, Review and Explorer
each hand-roll a table. They want the same *paint*, not the same *behaviour*.
Explorer needs `border-collapse: separate` and a two-row sticky header with
filters. labkit's `src/tokens.css` already says the same about paint and
behaviour (the "Tables" block). **But that block ships `table { border-collapse:
collapse }`, which is exactly the mode Explorer cannot use.** The browser
problem behind this has public sources (the "Sticky cells and collapsed
borders" section below).

**Method.** Everything was read on 2026-10-04 with a fetch tool that turns a
page into text and summarises it. So "read" here means that tool's account of
the page, and I did not view the pages in a browser. A cell marked
*unverified* is either inference or a page the tool could not load. The
"Fetch failures" section lists those pages. Nothing in this file is copied from
a source except the quotes, which are attributed and one sentence at most.

Every table below uses the same columns:
system · what it does, in our words · take / adapt / skip · why · license · source · read on.

---

## The systems in one line

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| IBM Carbon data table | A full design spec plus React and Web Components builds. It defines five parts (title and description, toolbar, column header, rows, pagination bar) and five row sizes. | **Adapt** (paint and states) | It is the best-written *paint* spec of the four. Its behaviour is tied to its own components. | Apache-2.0 | https://carbondesignsystem.com/components/data-table/usage/ · https://github.com/carbon-design-system/carbon | 2026-10-04 |
| AG Grid | A complete grid engine that renders its own DOM. Community edition covers sort, filter and pagination. Grouping, pivoting, server-side rows and more are Enterprise. | **Skip** (use as the bar) | It owns the markup, so labkit paint cannot reach it. Its best features are paid. It is the bar for what "a real grid" means, not a candidate. | Community MIT; Enterprise commercial EULA | https://www.ag-grid.com/javascript-data-grid/licensing/ | 2026-10-04 |
| TanStack Table | A headless engine: state, sorting, filtering and pinning maths, with no markup or styles. You render the `<table>` yourself. | **Skip for labkit; the candidate if an app later needs an engine** | Because it renders nothing, it adds nothing to *paint*. It is the only engine studied that would leave labkit paint intact. | MIT | https://tanstack.com/table/latest/docs/overview · https://github.com/TanStack/table | 2026-10-04 |
| Material data table (MDC Web, M2) | A web component over native `<table>` markup, with checkboxes for selection, a sort button per header, a sticky-header modifier, numeric cell classes and a progress scrim. | **Skip** (cite for density numbers) | The repo was archived in January 2025, and Material 3 has no data table (see the next row). | MIT (*unverified*: the tool did not report the licence, and this is from memory) | https://github.com/material-components/material-components-web/blob/master/packages/mdc-data-table/README.md | 2026-10-04 |

**Added, with a one-line reason each:**

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| Material Web (M3) roadmap | Lists a data table as future work, and says no future work is planned while the project is in maintenance mode. | **Skip** | Added to check whether the M2 table has a living successor. It does not. | n/a (roadmap) | https://github.com/material-components/material-web/blob/main/docs/roadmap.md | 2026-10-04 |
| Angular Material table | The maintained Material-styled table, built on the Angular CDK table. It works on native tables or flex layouts and supports sticky rows and columns. | **Skip** | Added because the MDC Web repo is archived. This is where Material's table still lives, but it is Angular-only. | MIT (*unverified*, from memory) | https://github.com/angular/components/blob/main/src/material/table/table.md | 2026-10-04 |
| Chrome "TablesNG" post | Chromium's 2021 table rewrite. It allows `position: sticky` anywhere in a table, and still warns against borders on sticky tables. | **Take** (as a constraint) | Added because it is the vendor's own source for the Explorer constraint. | CC-BY page (*unverified*) | https://developer.chrome.com/blog/tablesng | 2026-10-04 |
| CSSWG issue #3136 | An open spec issue: when a cell sticks, the collapsed borders stay behind, because the table owns those borders, not the cell. | **Take** (as a constraint) | Added because it shows the problem is in the spec, not a passing Chrome bug, so labkit should not wait for a fix. | W3C issue tracker | https://github.com/w3c/csswg-drafts/issues/3136 | 2026-10-04 |

---

## Anatomy

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| Carbon | Five named parts: title and description, toolbar (search and batch actions), column header, table rows, pagination bar. Expandable rows and single or multi selection are optional. | **Adapt**: take the *naming* of the parts. Ship paint for header, rows and an optional caption. Leave toolbar and pagination to apps. | The toolbar and pagination are behaviour, and our three tables differ exactly there. | Apache-2.0 | https://carbondesignsystem.com/components/data-table/usage/ | 2026-10-04 |
| Carbon (style) | Column headers sit on a slightly raised layer with hover and active states. Rows are split by a subtle bottom border. Header text is semibold and body text regular, both 14px. Cell text is vertically centred. | **Adapt** | labkit already does hairline rows and quiet headers. The one useful addition is that a *sortable* header gets a hover state and a plain one does not. | Apache-2.0 | https://carbondesignsystem.com/components/data-table/style/ | 2026-10-04 |
| MDC (M2) | Plain `<table>/<thead>/<tbody>/<th>/<td>` with classes, a scroll container for horizontal overflow, and separate numeric header and cell modifiers. | **Take** native table markup and a numeric-cell modifier (labkit already has `.r`) | It confirms semantic table markup as the base, which TanStack also leaves you free to use. | MIT (*unverified*) | https://github.com/material-components/material-components-web/blob/master/packages/mdc-data-table/README.md | 2026-10-04 |
| AG Grid | Div-based, not `<table>`. It uses ARIA roles (`grid`, or `treegrid` when grouping) on rows, cells and column headers. | **Skip** | A div grid cannot wear `th`/`td` paint. Adopting it means adopting its theme system instead of ours. | MIT / commercial | https://www.ag-grid.com/javascript-data-grid/accessibility/ | 2026-10-04 |

## Density modes

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| Carbon | Five row heights: 24, 32, 40 (default), 48 and 64px. The tallest is for rows that wrap to two lines. | **Adapt**: two modes, not five | Five sizes is a design-system catalogue. Our apps need "normal" and "compact" at most. | Apache-2.0 | https://carbondesignsystem.com/components/data-table/usage/ | 2026-10-04 |
| MDC (M2) | Default row 52px, header 4px taller (56px), with a density scale that bottoms out at 36px. | **Skip** the numbers | They are touch-first heights and much looser than labkit's current padding. | MIT (*unverified*) | https://raw.githubusercontent.com/material-components/material-components-web/master/packages/mdc-data-table/_data-table-theme.scss | 2026-10-04 |
| AG Grid | One row height for the whole grid, set by the theme (42px in its default theme). It can be overridden per grid, per row by callback, or auto-sized to the content. | **Skip** | Density is a theme setting there, which is a fair point but tied to its own engine. | MIT / commercial | https://www.ag-grid.com/javascript-data-grid/row-height/ | 2026-10-04 |

## Sticky header and pinned columns

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| Chrome TablesNG | Sticky now works on `thead` and on vertical label columns. The post still tells authors to keep borders off sticky tables. Quote: "If you're using `position: sticky` on a table, make sure it doesn't have borders." (Chrome for Developers, *TablesNG*, 2021) | **Take** | This is the root of the Explorer constraint. Under `collapse` the table owns the borders, so they do not travel with a stuck cell. | CC-BY (*unverified*) | https://developer.chrome.com/blog/tablesng | 2026-10-04 |
| CSSWG #3136 | Still open: browsers stick the cells but not the collapsed borders, and nobody has decided whether the fix belongs in CSS, the browsers or the spec. | **Take** | No fix is coming soon, so the paint has to work under `separate`. | W3C | https://github.com/w3c/csswg-drafts/issues/3136 | 2026-10-04 |
| Carbon | The React `DataTable` has a `stickyHeader` prop that its own source labels experimental and possibly broken with some prop combinations. The usage and style pages do not mention sticky headers at all. | **Skip** | Even Carbon has not solved this inside an engine. Not evidence that labkit should try. | Apache-2.0 | https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/react/src/components/DataTable/DataTable.tsx | 2026-10-04 |
| MDC (M2) | Sticky header is one modifier class on the root. | **Adapt**: sticky as a paint modifier | This is the right *shape*: sticky as an opt-in class, not engine behaviour. labkit's version has to cover two header rows. | MIT (*unverified*) | https://github.com/material-components/material-components-web/blob/master/packages/mdc-data-table/README.md | 2026-10-04 |
| TanStack | Pinning is state only. You either apply sticky positioning yourself using the start and end offsets it computes, or split pinned columns into separate tables. | **Skip for labkit** | The offsets are the only hard part, and they only matter once columns are resizable or reorderable. None of our three tables needs that today (*unverified*: based on the handoff summary in the ticket). | MIT | https://tanstack.com/table/v8/docs/guide/column-pinning | 2026-10-04 |
| AG Grid | Pin columns left or right in the column definitions. Users can drag columns into the pinned areas, or pin them from the column menu (Enterprise only). The centre area always keeps some room. | **Skip** (as the bar) | This is what full pinning looks like. It is far beyond paint. | MIT / commercial | https://www.ag-grid.com/javascript-data-grid/column-pinning/ | 2026-10-04 |
| Angular Material | Any header row, footer row or column can be marked sticky (start or end). | **Skip** | Angular-only, but it confirms that "sticky" can be a per-row, per-column flag. | MIT (*unverified*) | https://github.com/angular/components/blob/main/src/material/table/table.md | 2026-10-04 |

## Sorting and filtering UX

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| Carbon | Three sort states (unsorted, up, down). Only the sorted column shows its arrow all the time; the others show it on hover. Search lives in the toolbar, either behind an icon or always open. Batch actions appear in a bar once rows are selected. | **Adapt**: the indicator only | Showing the arrow on just the active column keeps headers quiet, which matches labkit's quiet headers. The toolbar is app behaviour. | Apache-2.0 | https://carbondesignsystem.com/components/data-table/usage/ | 2026-10-04 |
| MDC (M2) | Sortable headers carry `aria-sort` and a sort button whose icon flips. The component fires an event and the consumer does the actual reordering. | **Take**: style off `th[aria-sort]` | Paint driven by the ARIA attribute means apps keep the behaviour, the indicator stays shared, and it is accessible without extra effort. | MIT (*unverified*) | https://github.com/material-components/material-components-web/blob/master/packages/mdc-data-table/README.md | 2026-10-04 |
| AG Grid floating filters | A second header row under the column headers, where each column's filter is visible and editable. The page does not mark it Enterprise, although its example also loads some Enterprise modules (so Community-only use is *unverified*). | **Adapt**: the shape, not the engine | This is Explorer's two-row sticky header with filters, so a mainstream grid has made the same choice. labkit paint should cover a second header row of inputs. | MIT / commercial | https://www.ag-grid.com/javascript-data-grid/floating-filters/ | 2026-10-04 |
| TanStack sorting | Client or server sorting, multi-sort on a modifier key, a per-column choice of which direction comes first, and an option to stop returning to "unsorted". No UI is rendered. | **Skip for labkit** | Useful later, but as app logic. The docs say plainly that the library draws no sort UI. | MIT | https://tanstack.com/table/v8/docs/guide/sorting | 2026-10-04 |
| TanStack filtering | Client or server filtering, a set of built-in match functions, and getters and setters per column. No UI is rendered. The docs argue client-side filtering is fine into the thousands of rows. | **Skip for labkit** | Same as sorting: it is logic, not paint. | MIT | https://tanstack.com/table/v8/docs/guide/column-filtering | 2026-10-04 |

## Loading and empty states

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| Carbon | When loading will take a noticeable time, show skeleton rows rather than a spinner. | **Take** | A skeleton keeps the table's shape and column widths, so nothing jumps when data arrives. This fits labkit rule 4 (`loading` is one of the seven states). | Apache-2.0 | https://carbondesignsystem.com/components/data-table/usage/ | 2026-10-04 |
| Carbon empty-states pattern | Separates "nothing here yet" (explain, then offer the action that fills it) from "no results" (explain why, then suggest loosening the search or filter). | **Take** | Explorer's filters make "no results" the common empty state, and it needs different words from "no data". | Apache-2.0 | https://carbondesignsystem.com/patterns/empty-states-pattern/ | 2026-10-04 |
| MDC (M2) | An indeterminate progress bar plus a scrim over the body, switched on and off by methods. | **Skip** | A scrim hides data the user may already be reading. A skeleton or a quiet bar in the header is kinder. | MIT (*unverified*) | https://github.com/material-components/material-components-web/blob/master/packages/mdc-data-table/README.md | 2026-10-04 |
| AG Grid overlays | A loading overlay (shown on request, or automatically until the first data and columns arrive) that wins over a no-rows overlay. The no-rows overlay appears on an empty array. Both are replaceable. | **Adapt**: the precedence rule | "Loading beats empty" is the one rule worth copying, so a table never flashes "no results" before data arrives. | MIT / commercial | https://www.ag-grid.com/javascript-data-grid/overlays/ | 2026-10-04 |

## Engine fit for labkit (Svelte 5)

| System | What it does, in our words | Take / adapt / skip | Why | License | Source | Read on |
|---|---|---|---|---|---|---|
| TanStack v9 Svelte adapter | Rewritten for v9. It requires Svelte 5, is built on runes, and has no Svelte 3/4 shim. The v8 overview lists Svelte among its adapters. | **Candidate, app-side only** | labkit's peer dependency is `svelte ^5`, so it is compatible. Whether v9 is *stable* is **unverified**: the migration page does not say. | MIT | https://tanstack.com/table/latest/docs/framework/svelte/guide/migrating.md | 2026-10-04 |
| AG Grid virtualisation | Renders only the rows and columns in view, adding and removing cells as you scroll. | **Skip** | Virtualisation is the main reason to want a grid engine. Nothing in the handoff suggests our tables are large enough to need it (*unverified*). | MIT / commercial | https://www.ag-grid.com/javascript-data-grid/dom-virtualisation/ | 2026-10-04 |

---

## Fetch failures (so nothing above leans on them)

- `https://tanstack.com/table/latest/docs/introduction` and
  `https://tanstack.com/table/latest/docs/guide/column-pinning` returned HTTP 500.
  I used the `/docs/overview` and `/v8/` pages instead.
- `https://m2.material.io/components/data-tables` and
  `https://material.angular.dev/components/table/overview` render client-side, and
  the tool got only a heading. I used the GitHub sources for the same docs instead.
- The npm page for `@tanstack/svelte-table` returned HTTP 403, so I have no live
  version number or publish date.
- No fetched page contained instructions aimed at the reader or agent.

---

## What labkit takes

1. **Paint only, with no engine in labkit.** The engines studied split two
   ways. AG Grid renders its own div grid, so labkit paint cannot reach it, and
   its strongest features are paid. TanStack renders nothing, so it adds nothing
   to paint. Neither gives the three budget tables what they actually share,
   which is how they look. When two screens need the *same interaction*, that
   app should reach for TanStack v9 (Svelte 5, MIT, headless, so it keeps labkit
   paint). labkit should still not wrap it.

2. **The paint must work under `border-collapse: separate`, and labkit should
   default to it.** Today `tokens.css` sets `collapse`. Under `collapse` the
   table owns the borders, and they stay behind when a cell sticks (CSSWG
   #3136, still open; Chrome's own TablesNG post says to keep borders off sticky
   tables). labkit already draws every rule as a per-cell `border-bottom`, so
   `separate` with zero spacing should look the same. The build ticket has to
   check that in the gallery, because it has not been checked here.

3. **Sticky is a paint modifier, and it covers two header rows plus a pinned
   first column.** It is an opt-in class (the MDC shape), not engine behaviour.
   It needs an opaque surface background on stuck cells and an offset for the
   second header row. That row holds per-column filter inputs, which matches
   Explorer and AG Grid's floating filters. Pinning beyond the first column is
   out until an app needs it.

4. **Two densities, set by one custom property.** "Normal" is today's padding
   and "compact" is tighter. Carbon's five sizes and Material's touch heights
   are catalogues for other products.

5. **Sort, loading and empty states are paint, keyed to markup the app already
   writes.** The sort indicator is styled from `th[aria-sort]`, shown always on
   the active column and on hover elsewhere (Carbon), so the app owns the
   sorting. Loading is skeleton rows in the real columns, never a scrim (Carbon
   over MDC). Loading beats empty, so "no results" never flashes before data
   arrives (AG Grid). Empty has two wordings, "nothing yet" and "no matches,
   loosen the filter" (Carbon). This is labkit rule 4's `loading` and `empty`
   applied to a table.
