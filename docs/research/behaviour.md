# Research: the behaviour layer, and a web-components build for non-Svelte consumers

Ticket: labkit#4. Part of the labkit v2 research set (colour · type and spacing ·
motion · behaviour · tables · charts). This file covers behaviour only.

**Question.** Which headless behaviour layer should labkit adopt for dialogs,
menus, popovers, comboboxes and tabs, given three kinds of consumer: Svelte 5
apps, the console (plain JS, no build step), and possibly an Angular app later?
And can Svelte 5 compile labkit's display components (StatRow, Meter, Rail) into
web components that the console could load as one prebuilt file?

**Method.** Every row was read live on 2026-10-04 unless it says
**unverified**. Package versions, licences and peer ranges were read from the
public npm registry JSON (`registry.npmjs.org/<name>/latest`) or from the
project's own `LICENSE`/`package.json` on GitHub, because the npm CLI was not
available to this session. All summaries are in our own words; quotes are one
sentence at most and attributed.

⚠️ **The web-components answer was not built.** The ticket asks for a scratch
build in a branch-local folder. This session had no Svelte compiler on disk and
`npm install` was not permitted, so no build was run. Everything in the
web-components section is a reading of the Svelte docs against labkit's own
source. It is marked **unverified** wherever it predicts runtime behaviour. The
build ticket has to run the check before anything ships.

## What labkit needs from a behaviour layer

labkit is display-only today: `Section`, `StatRow`, `Rail`, `Meter`, `Field`.
None of them traps focus, opens a layer or handles arrow keys. The five patterns
in the question are where hand-rolled code goes wrong. The APG lists what each
one has to get right:

| pattern | what is hard to get right (per APG) | source | read on |
|---|---|---|---|
| Dialog (modal) | Focus moves inside on open, Tab and Shift+Tab wrap inside, Escape closes, focus goes back to the opener on close, and the dialog is named by its title. | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | 2026-10-04 |
| Menu button | The trigger is a button with `aria-haspopup` and `aria-expanded`. Enter or Space opens the menu and focuses the first item. Down and Up Arrow can open it at the first or last item. | https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/ | 2026-10-04 |
| Combobox | An input with a popup (listbox, grid, tree or dialog) and four autocomplete variants. DOM focus stays in the input while `aria-activedescendant` moves the assistive-technology focus through the options. Down Arrow, Escape, Enter and optionally Alt+Down each have a defined job. | https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ | 2026-10-04 |
| Tabs | Tablist, tab and tabpanel roles wired to each other, with a roving tabindex so only one tab is in the Tab order. Arrow keys move between tabs and optionally wrap. Activation is automatic unless showing a panel is slow enough to get in the way. | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | 2026-10-04 |
| Popover (non-modal) | APG has no "popover" pattern by that name. Its closest patterns are Disclosure and Tooltip, and the platform now has a Popover API (row below). | https://www.w3.org/WAI/ARIA/apg/patterns/ | 2026-10-04 |

## Sources

| library | what it does, in our words | take / adapt / skip | why | license | Svelte 5 support | usable without a framework | source URL | read on |
|---|---|---|---|---|---|---|---|---|
| WAI-ARIA Authoring Practices Guide (APG) | The reference for how each widget should behave: roles, states, keyboard model and focus moves for about thirty patterns, including all five above. Its examples are demonstrations, not a library. It says it doesn't cover workarounds for browser or screen-reader gaps, and in its own words: "Testing assistive technology interoperability is essential before using code from this guide in production." (APG, Read Me First) | **take** (as the spec) | This is what any library we pick gets checked against. labkit's tests for these components should be written from the APG keyboard tables, not from a library's docs. | W3C. The footer cites W3C's permissive licence and software licence. The exact terms for the example code were not read (**unverified**). Guidance only, not a dependency. | n/a | yes (it is a spec) | https://www.w3.org/WAI/ARIA/apg/patterns/ · https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/ · https://www.w3.org/WAI/ARIA/apg/about/ | 2026-10-04 |
| React Aria (Adobe) | Unstyled React components and hooks that handle keyboard, focus, interaction states and internationalisation. State is exposed as data attributes for styling. | **skip** (reference only) | React-only, so none of our three consumers can use it. Worth reading when we decide how a component reports its states to CSS, because labkit's "all seven interaction states" rule needs the same thing. Licence was not on the page read (**unverified**). | not read (**unverified**) | no | no | https://react-aria.adobe.com/getting-started (redirected from react-spectrum.adobe.com/react-aria/getting-started.html) | 2026-10-04 |
| Radix Primitives | Unstyled React components that handle ARIA attributes, focus management and keyboard navigation. They are uncontrolled by default, can be controlled, and expose each part separately. | **skip** (reference only) | React-only. Its part-by-part API (Root / Trigger / Content / Title) is the shape Bits UI copied, so reading it helps with Bits UI too. | MIT, © WorkOS 2022 (from its LICENSE file) | no | no | https://www.radix-ui.com/primitives/docs/overview/introduction · https://raw.githubusercontent.com/radix-ui/primitives/main/LICENSE | 2026-10-04 |
| Bits UI | Headless Svelte components (45+, including Dialog, Dropdown Menu, Popover, Combobox and Tabs). Its architecture comes from Melt UI and its API design from Radix. The Dialog traps focus, focuses the first focusable element on open, returns focus to the trigger on close, closes on Escape (configurable), locks body scroll, and portals to the body. It doesn't use the native `<dialog>`. Current release 2.19.5, which depends on `@floating-ui/dom` and `tabbable`. | **adapt** (fallback, or Svelte-only option) | It would be the most comfortable choice for Svelte apps. But it is Svelte-only, so the console and any Angular app would still need a second behaviour layer, and labkit would own two implementations of every pattern. | MIT, © Hunter Johnston, Pavel Stianko, Adrian Gonz 2024 (from its LICENSE file) | yes. Peer `svelte ^5.33.0` (from its package.json) | no | https://bits-ui.com/docs/introduction · https://bits-ui.com/docs/components/dialog · https://raw.githubusercontent.com/huntabyte/bits-ui/main/LICENSE · https://raw.githubusercontent.com/huntabyte/bits-ui/main/packages/bits-ui/package.json | 2026-10-04 |
| Melt UI (next-gen, npm `melt`) | The Svelte 5 rewrite of Melt UI. Builders are classes whose instances return attributes to spread onto your own elements, plus reactive state. The nav lists Combobox, Dialog, Popover, Select, Tabs, Tooltip and others. It has no Menu builder (only a "Spatial Menu", marked WIP). Version 0.44.0, so pre-1.0. | **skip** (for now) | The builder model fits labkit well, because labkit keeps its own markup. But it is pre-1.0, it lacks a menu, and it is still Svelte-only, so it has the same two-implementations problem as Bits UI. | MIT (registry and repo) | yes. Peer `svelte ^5.30.1`, `@floating-ui/dom ^1.6.0` (registry) | no | https://next.melt-ui.com/ · https://next.melt-ui.com/guides/how-to-use · https://github.com/melt-ui/next-gen · https://registry.npmjs.org/melt/latest | 2026-10-04 |
| Melt UI (classic, `@melt-ui/svelte`) | The original, store-based Melt UI builders. Its site now points readers to the runes version. | **skip** | It is superseded by the next-gen package above. Its Svelte 5 status wasn't read because the project's own site points away from it. | not read (**unverified**) | **unverified** | no | https://melt-ui.com/ | 2026-10-04 |
| Zag.js | Each widget is a framework-neutral state machine (50+ widgets, including Dialog, Menu, Popover, Combobox and Tabs). Each is its own npm package. Thin adapters connect a machine to a framework and return props to spread onto your own elements, and the widgets themselves are unstyled. The Dialog machine traps focus, takes configurable initial and final focus elements, closes on Escape and on outside interaction (both configurable), locks scroll, and supports `alertdialog`. The repo has adapters for React, Solid, Vue, Svelte, Preact and **vanilla**. `@zag-js/vanilla` 1.44.0 exports a machine class plus helpers that normalise props and spread them onto DOM elements. The repo has a `vanilla-ts` example. | **take** | It is the only candidate where one implementation of each pattern serves Svelte 5 (`@zag-js/svelte`, peer `svelte >=5`) **and** plain DOM (`@zag-js/vanilla`). That covers the console now, and an Angular app later through the vanilla adapter. Angular has no adapter of its own, so the Angular route is **unverified**. The vanilla docs page returned a server error, so the vanilla wiring here comes from the package's exports and a search result, not a docs page. | MIT, © Chakra UI 2021 (from its LICENSE file) | yes. `@zag-js/svelte` 1.44.0, peer `svelte >=5` (from its package.json). The Svelte docs examples use runes. | yes, through `@zag-js/vanilla`. It still ships bare-specifier imports (`@zag-js/core`, …), so a no-build console has to load a pre-bundled file. Loading it straight from source is **unverified**. | https://zagjs.com/overview/introduction · https://zagjs.com/overview/installation · https://zagjs.com/components/svelte/dialog · https://github.com/chakra-ui/zag/tree/main/packages/frameworks · https://github.com/chakra-ui/zag/tree/main/examples · https://registry.npmjs.org/@zag-js/vanilla/latest · https://raw.githubusercontent.com/chakra-ui/zag/main/packages/frameworks/svelte/package.json · https://raw.githubusercontent.com/chakra-ui/zag/main/LICENSE | 2026-10-04 |
| Ark UI | Ready-made headless components built on Zag.js for React, Solid, Vue and Svelte. `@ark-ui/svelte` 5.24.2 pins about 65 `@zag-js/*` packages at 1.43.3. | **skip** | Ark is the comfortable layer on top of Zag, but it has no vanilla or Angular build. It would also pull in every Zag machine when labkit needs five. labkit should use Zag directly and write its own thin Svelte wrappers. | MIT (its "about" page, and the registry) | yes. Peer `svelte >=5.20.0` (registry) | no | https://ark-ui.com/ · https://ark-ui.com/docs/overview/about · https://registry.npmjs.org/@ark-ui/svelte/latest | 2026-10-04 |
| Floating UI | Positioning only, in the DOM package: it anchors an absolutely positioned element to a reference element and keeps it inside the viewport. Interaction behaviour exists only in the React package. `@floating-ui/dom` is 1.8.0 and depends only on its own `core` and `utils`. It is modular and tree-shakeable. | **adapt** (as a transitive concern, not a direct pick) | It solves where a popover sits, not how it behaves, so it can't be the behaviour layer. Bits UI and Melt already depend on it. Whether Zag's popover and menu use it internally was not read (**unverified**). If labkit ever positions something itself, use the DOM package. | MIT (getting-started page) | n/a (framework-free) | yes | https://floating-ui.com/docs/getting-started · https://registry.npmjs.org/@floating-ui/dom/latest | 2026-10-04 |
| Svelte 5 `customElement` compile option | Compiles a Svelte component into a custom element class. Props become element properties, and attributes too where they can. Attribute values are strings unless a prop declares `type` `Boolean`/`Number`/`Array`/`Object`, and attribute names default to the lowercased prop name. Shadow DOM is on by default; `shadow: "none"` turns it off and slots go with it. Styles are inlined as JS strings and kept inside the shadow root. Without a tag name, the constructor is on a static `element` property for the consumer to `define()`. The inner component is created on the tick after `connectedCallback`. | **adapt** | It answers the second half of the question. See "Web components" below for what it would mean for StatRow, Meter and Rail. | MIT, © Svelte Contributors (from sveltejs/svelte LICENSE.md, https://raw.githubusercontent.com/sveltejs/svelte/main/LICENSE.md) | yes (it is Svelte 5) | the output is: one script, no framework at the call site | https://svelte.dev/docs/svelte/custom-elements · https://svelte.dev/docs/svelte/svelte-options | 2026-10-04 |
| *Added:* HTML `<dialog>` + `showModal()` (MDN). **Reason:** a no-build console can get a correct modal from the platform with no library at all, which bears directly on the dependency choice. | `showModal()` puts the dialog in the top layer, makes the rest of the page inert, moves focus inside, closes on Escape (subject to `closedby`), gives it `aria-modal`, and offers `::backdrop`. With several modals open, Escape closes only the newest. Baseline widely available since March 2022. The page read doesn't say focus returns to the opener on close. | **take** (for modal dialogs, under any library) | It covers most of the APG modal checklist natively. Bits UI and Zag both build their own dialog instead (neither page mentions `<dialog>`). labkit's Dialog should be a native `<dialog>` and use the library only for what the platform doesn't do. Focus return needs a test (**unverified**). | Web platform feature; no licence to record | n/a | yes | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog | 2026-10-04 |
| *Added:* Popover API (MDN). **Reason:** the platform equivalent of a non-modal popover, usable from the console with zero JS. | The `popover` attribute (`auto` / `hint` / `manual`) plus `popovertarget` on a button gives top-layer display, light dismiss (outside click, Escape) and `::backdrop`. The page doesn't describe positioning or focus management. Baseline 2025, newly available since January 2025, and MDN notes some parts vary in support. | **adapt** | Good enough for simple disclosure-style popovers in the console today. It is not a menu or a combobox: arrow keys, roving focus and `aria-activedescendant` still need a behaviour layer. Positioning still needs Floating UI or CSS anchor positioning, which was not studied here. | Web platform feature; no licence to record | n/a | yes | https://developer.mozilla.org/en-US/docs/Web/API/Popover_API | 2026-10-04 |
| *Added:* MDN, Using shadow DOM. **Reason:** needed to judge which labkit styles survive a web-components build. | Page CSS does not reach nodes inside a shadow root. `lang`/`dir` inherit from the shadow host. `::part` and constructable stylesheets (`adoptedStyleSheets`) are the ways in. The page does **not** discuss CSS custom properties crossing the boundary. | n/a (evidence) | Grounds the limits listed below. | MDN content licence (not checked further) | n/a | n/a | https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM | 2026-10-04 |

## Web components: StatRow, Meter and Rail

**Short answer: yes, it is possible in principle, with limits. Not verified by a
build.** Svelte 5's `customElement` option is documented, and all three
components are display-only, with no context, no `let:` and no SSR need. Of the
documented caveats, those three are the ones that would rule them out. But
reading labkit's source against the docs shows four places where a naive build
would compile cleanly and then render or behave wrongly:

1. **Global classes don't reach into the shadow root.** MDN: page CSS doesn't
   affect shadow nodes. Svelte: global styles and `:global()` don't apply. Rail's
   tick and code are styled by `.rail .tick` / `.rail .code` in `src/tokens.css`
   (lines 179–213), not in `Rail.svelte`. The component's own comment says
   those classes are global on purpose. StatRow puts its figure in the
   `.fig` class from `tokens.css` (line 99). Inside a shadow root, Rail's tick
   would have no size or colour, and StatRow's figure would lose `--font-fig`.
   Options for the build ticket: move those rules into the components, adopt
   `tokens.css` as a constructable sheet, or compile with `shadow: "none"`,
   which gives up encapsulation and slots.
2. **Attributes arrive as strings.** By default Svelte converts attributes to
   `String`. Meter clamps with `Number.isFinite(value)`, and that is false for
   the string `"40"`, so `<labkit-meter value="40">` would render **empty**
   unless `value` is declared `type: "Number"`. StatRow's `big` needs
   `type: "Boolean"` or `big="false"` would be truthy. (This is a reading of
   `src/components/Meter.svelte` lines 28–30 and the Svelte docs. **Unverified**
   at runtime.)
3. **StatRow's `children` is a snippet.** A plain-HTML consumer can't pass a
   snippet. The Svelte custom-elements page talks about `<slot>` and says
   nothing about snippets or `{@render}`. So a Rail nested under a StatRow in
   the console would need a slot-based variant. Whether a `children` snippet
   maps to the default slot is **unverified**.
4. **Tokens are assumed, not proven, to flow in.** labkit's colours, spacing
   and fonts are CSS custom properties on `:root`. That custom properties
   inherit into shadow trees is widely relied on, but none of the pages read
   here states it, so it is **unverified** in this document.

Other documented limits that apply: styles ship inside the JS, so a CSP that
blocks inline styles would need checking (**unverified**). Elements render only
after JS runs, on the tick after connection, so there is no SSR and there is a
flash before first paint. Prop names starting with `on` become listeners (none
of the three has one). Every prebuilt file carries the Svelte runtime, and its
size was **not measured**.

**What the build ticket should run first** (this is the check this ticket could
not run): compile the three components with `customElement: true`, with
`props` types declared for `value` and `big`, into one ES module. Load it from a
plain HTML page that also loads `tokens.css`, then confirm: the Meter fill width
from a string attribute, the Rail tick's size and colour, the figure font, a
nested Rail under StatRow, and the gzipped file size.

### Behaviour components are a different question

The web-components route is fine for display components. It is the wrong route
for the behaviour layer. A dialog, menu or combobox inside a shadow root runs
into portals, focus trapping across shadow boundaries, and ARIA ID references
(`aria-labelledby`, `aria-controls`, `aria-activedescendant`) that may not
resolve across the boundary. None of these was read in a source this session
(**unverified**), and each is a known risk worth testing before anyone tries.
Zag's vanilla adapter avoids all of them, because it attaches behaviour to the
console's own light-DOM elements.

## What labkit takes

1. **Behaviour library: Zag.js**, used directly as `@zag-js/<widget>` plus
   `@zag-js/svelte` and `@zag-js/vanilla`, not through Ark UI. It is the only
   candidate read here that gives one implementation of dialog, menu, popover,
   combobox and tabs to both Svelte 5 apps and plain DOM. That means the console
   and Svelte apps behave identically, and an Angular app later has a path
   through the vanilla adapter (**unverified** for Angular). It is MIT and
   unstyled, and it hands back props for labkit's own markup, so labkit keeps
   its tokens and its seven interaction states. labkit would wrap each machine
   in its own Svelte component and add only the widgets it uses.
   - **Bits UI is the fallback** if the console turns out not to need
     behaviour components, because it is the better Svelte-only experience.
     Choosing it means accepting a second, hand-rolled layer for the console.
   - **Platform first, where the platform is enough:** labkit's modal Dialog
     should be a native `<dialog>` with `showModal()`, and simple console
     popovers can use the `popover` attribute. Zag fills the gaps: menu,
     combobox, tabs, and anything that needs positioning or roving focus.
   - **APG is the test oracle.** Each behaviour component gets keyboard tests
     written from the APG pattern page, whatever library it uses inside.
   - Adding the dependency is out of scope here and belongs to the build ticket.
2. **Web-components build for StatRow, Meter and Rail: yes, with limits, but
   unverified.** No scratch build was run in this session (no Svelte compiler
   was available and package installs were not permitted). Known limits from
   the docs and labkit's source: global `tokens.css` classes don't reach the
   shadow root (Rail's tick, the figure font); `Meter.value` and `StatRow.big`
   need declared prop types; StatRow's snippet child has no plain-HTML
   equivalent; there's no SSR; styles are inlined in the JS; and every file
   carries the Svelte runtime. The build ticket must run the check listed above
   before shipping.
3. **Don't ship behaviour components as web components.** The console gets
   behaviour from `@zag-js/vanilla` on its own elements, and display from the
   web-components file.
