# Research: motion as tokens, and whether labkit needs an animation library

Ticket: labkit#3. Part of the labkit v2 research set (colour · type and spacing ·
motion · behaviour · tables · charts). This file covers motion only.

**Question.** How should motion live in labkit as tokens (durations, easings,
springs, when to animate and when not to, reduced motion), and does labkit need
an animation library at all?

**Method.** Every row below was read live on 2026-10-04 unless it says
**unverified**. Two official sites (m3.material.io and Apple's HIG page) render
their content with JavaScript and returned only a title to the fetcher, so:

- Material 3 values were read from Material's own published docs in the
  `material-components-android` repository, which documents the same token set.
  The m3.material.io pages themselves were **not** read.
- Apple's HIG was read through the JSON that backs the same page
  (`developer.apple.com/tutorials/data/design/...`), which is the page's own text.

All summaries are in our own words. Quotes are one sentence at most and
attributed.

## Where labkit is today

`src/tokens.css` already has a small motion vocabulary: one entrance curve
(`--ease-out`), one exit curve (`--ease-in`), two durations (`--dur-state`
180ms, `--dur-enter` 500ms), a rule that transitions touch only `transform` and
`opacity`, and a `prefers-reduced-motion` block that zeroes both durations and
clamps every animation and transition to 1ms.

⚠️ **Finding: that reduced-motion block is probably not being applied.** Line 51
of `src/tokens.css` is a stray ` *` left between the closing `}` of `:root` and
the comment above the `@media` rule. In the first commit (53932ee) that line sat
inside the file's opening block comment; when 07ec955 restored the deleted
`:root` block above it, the line was left outside any comment. By the CSS Syntax spec, a
top-level `*` starts a style rule, and everything up to the next `{` — including
`@media (prefers-reduced-motion: reduce)` — becomes that rule's selector. That
selector is invalid, so the whole rule, reduced-motion contents included, is
dropped. Source: CSS Syntax Level 3, "consume a qualified rule",
https://www.w3.org/TR/css-syntax-3/#consume-qualified-rule (read 2026-10-04).
This is a reading of the spec; it has **not** been confirmed in a browser in this
session. Fixing it is a build task, not part of this ticket — it is flagged here
because every reduced-motion decision below depends on that block working.

## Sources

| system | what it does, in our words | take / adapt / skip | why | license | source URL | read on |
|---|---|---|---|---|---|---|
| Material 3 — easing and duration tokens | Seven named curves in two families: *standard* (plain, with accelerate/decelerate variants, e.g. standard = `cubic-bezier(0.2, 0, 0, 1)`) and *emphasized* (a sharper, path-based curve plus decelerate/accelerate cubic approximations), plus linear. Sixteen durations in four bands — short, medium, long, extra-long — at 50ms steps up to 600ms, then 100ms steps to 1000ms. | **adapt** | The split into "entering decelerates, leaving accelerates, staying-on-screen uses standard" is the useful part, and labkit already has two of the three. Sixteen durations is a scale for a platform; labkit needs three or four named by *use*, not by size. | Apache-2.0 (material-components-android repo; verified from its LICENSE file). Guidance only — not a dependency. | https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md · https://raw.githubusercontent.com/material-components/material-components-android/master/LICENSE | 2026-10-04 |
| Material 3 — springs | A newer system described alongside easing: springs come in two kinds — *spatial* (position/size, slightly underdamped, damping 0.9, so a small overshoot) and *effects* (colour/opacity, damping 1, never overshoots) — at three speeds (fast/default/slow, for small components → full screen). Stiffness ranges from 300 to 3800 across the six. | **adapt** (the idea, not the numbers) | The spatial-vs-effects rule is a good one: things that move may overshoot a little, things that fade or change colour must not. labkit should keep that rule even where it uses curves rather than springs. Copying stiffness numbers is pointless without M3's spring runtime. | Apache-2.0 (as above) | https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md | 2026-10-04 |
| Material 3 — m3.material.io motion pages | The official M3 web guidance (overview, "how it works", easing and duration specs). | **unverified** | Page content is rendered client-side and the fetcher received only the title. Anything attributed to m3.material.io specifically — including whether M3 publishes reduced-motion guidance — is unverified. | not checked | https://m3.material.io/styles/motion/easing-and-duration/tokens-specs · https://m3.material.io/styles/motion/overview/how-it-works | 2026-10-04 (attempted; no content) |
| IBM Carbon — productive vs expressive | Two motion "moods". *Productive* is quick and quiet, for task moments (button states, dropdowns, table rendering). *Expressive* is bigger and more visible, kept for rare important moments (a new page, a system alert). Each mood has its own standard / entrance / exit curve — e.g. productive standard `cubic-bezier(0.2, 0, 0.38, 0.9)`, expressive standard `cubic-bezier(0.4, 0.14, 0.3, 1)`. | **take** (the productive half) | labkit's consumers are finance, ledger and identity apps: almost every moment is a task moment. Declaring labkit productive-only is a clear, defensible rule and stops each app inventing an "expressive" flourish. | Apache-2.0 (carbon repo; verified from its LICENSE file). Guidance only. | https://carbondesignsystem.com/elements/motion/overview/ · https://raw.githubusercontent.com/carbon-design-system/carbon/main/LICENSE | 2026-10-04 |
| IBM Carbon — duration tokens | Six durations named by speed band and keyed to use: 70ms and 110ms for micro-interactions, 150ms and 240ms for small and normal expansions, 400ms for large expansions and notifications, 700ms for dimming a background. | **adapt** | The labelling — each duration documented with what it is *for* — is what labkit should copy. labkit's current 500ms entrance sits above Carbon's largest expansion; worth re-checking against a real Meter render in the build ticket rather than changed on paper. | Apache-2.0 | https://carbondesignsystem.com/elements/motion/overview/ | 2026-10-04 |
| Apple HIG — Motion | Motion should give feedback, show status and help orientation; keep it brief and precise; don't add it to frequent interactions the system already animates; never make motion the only carrier of important information. | **take** | The "never the only carrier" rule matches labkit's existing stance on colour (README rule 2: the third state carries *form*). Same principle, applied to time. In Apple's words: "Add motion purposefully, supporting the experience without overshadowing it." (Apple HIG, Motion) | Documentation, not a dependency; Apple's terms, no open licence (not checked further). | https://developer.apple.com/design/human-interface-guidelines/motion (read via https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json) | 2026-10-04 |
| Apple HIG — Accessibility (Reduce Motion) | When Reduce Motion is on: cut automatic and repeating animation (zoom, scale, peripheral motion); tighten springs so they don't bounce; tie animation directly to the user's gesture; don't animate depth; swap x/y/z movement for fades; don't animate into or out of blur. | **take** | This is the most concrete reduced-motion guidance of the six, and it says *reduce*, not *remove*: a fade is still allowed. That argues against labkit's current "everything to 1ms" approach as the *only* behaviour. | Documentation; Apple's terms (not checked further). | https://developer.apple.com/design/human-interface-guidelines/accessibility (read via https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json) | 2026-10-04 |
| Motion (motion.dev) | A JS animation library (npm `motion`), usable from plain JS through an `animate()` function as well as from React; animates transforms/opacity/filter on the compositor where it can; has springs; advertises a 2.3kb "mini" `animate()`. Its React docs offer a site-wide setting that, when following the user's preference, drops transform and layout animation but keeps opacity and colour, plus a hook that reads the preference. | **skip** (as a dependency) | Licence is fine (MIT). But labkit is a Svelte 5 kit and Svelte already ships transitions, tweens, springs and a reduced-motion signal (next rows). Motion would add a second animation model for no capability labkit needs today. Its reduced-motion default — keep fades, drop movement — is worth copying as a *rule*. Whether the plain-JS `animate()` honours reduced motion automatically was not read: **unverified**. Svelte is not mentioned on the quick-start page. | MIT, © Motion B.V. (verified from LICENSE.md in motiondivision/motion) | https://motion.dev/docs/quick-start · https://motion.dev/docs/react-accessibility · https://raw.githubusercontent.com/motiondivision/motion/main/LICENSE.md | 2026-10-04 |
| Svelte — `svelte/transition` | Enter/leave transitions as element directives (`in:`, `out:`, `transition:`), local to their own block by default (`|global` to also play when a parent block changes); custom transitions can return CSS keyframes or a per-frame tick. | **take** | Already a peer dependency; covers every enter/leave case labkit has. Transitions do **not** honour `prefers-reduced-motion` on their own — the docs tell you to check the preference yourself and adjust or disable. labkit must wrap that once, not leave it to each component. The same page also notes that because transitions run through the Web Animations API, a global CSS rule zeroing transition and animation durations does nothing to them — so labkit's 1ms clamp in `tokens.css` cannot cover Svelte transitions even once it parses. | MIT (verified from sveltejs/svelte LICENSE.md) | https://svelte.dev/docs/svelte/transition · https://raw.githubusercontent.com/sveltejs/svelte/main/LICENSE.md | 2026-10-04 |
| Svelte — `svelte/motion` | `Tween` (eased approach to a target value, with duration and delay) and `Spring` (physics approach with stiffness and damping), both as classes since 5.8; plus `prefersReducedMotion` (since 5.7), a reactive read of the media query. The older `tweened()`/`spring()` stores are deprecated. | **take** | Gives labkit springs for value-driven motion (a Meter fill, a number settling) without a dependency, and a single reactive switch for reduced motion that both CSS-less and JS motion can read. | MIT | https://svelte.dev/docs/svelte/svelte-motion | 2026-10-04 |
| View Transitions API (MDN) | Browser API that snapshots the page before and after a DOM change (same-document, `document.startViewTransition()`) or a navigation (cross-document, opted into with the `@view-transition` at-rule), then animates between them — a cross-fade by default, with movement/scaling for elements whose position or size changed. `startViewTransition()` is Baseline 2025, newly available since October 2025. | **skip** (for components); note for apps | It animates *views*, which is an app-routing concern, not a primitive's. Neither MDN page read mentions `prefers-reduced-motion`, so an app that opts in has to gate it itself. Older-browser support is not yet "widely available". | Browser platform API — no package, no licence to record. | https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API · https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using · https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition | 2026-10-04 |
| *Added:* CSS `linear()` easing (MDN) — **reason:** it is how a spring-like curve can be a plain CSS token, which bears directly on the dependency question. | An easing function made of many points joined by straight segments, so it can approximate bounces and springs in pure CSS. Baseline widely available since December 2023. | **adapt** (hold in reserve) | If labkit ever wants a gentle spatial overshoot on a CSS transition, a `linear()` token does it with no JS. Not needed now: labkit is productive-only and its two cubic curves suffice. | Web platform feature — no licence to record. | https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear | 2026-10-04 |
| *Added:* CSS Syntax Level 3 — **reason:** needed to judge whether labkit's own reduced-motion block parses (see finding above). | Defines how a stylesheet is tokenised into rules; a top-level token that is not an at-keyword starts a style rule whose selector runs to the next `{`, and a rule that is invalid is ignored. | n/a (evidence for the finding) | Explains why the stray `*` would swallow the `@media` rule. | W3C document licence (not checked further) | https://www.w3.org/TR/css-syntax-3/#consume-qualified-rule | 2026-10-04 |

## Reduced motion, system by system

| system | what it does when the user asks for reduced motion | source |
|---|---|---|
| Material 3 | **Unverified.** The Android motion docs read here describe no reduced-motion behaviour, and the m3.material.io pages could not be read. | https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md (read 2026-10-04) |
| IBM Carbon | Says, in general terms, that a large share of users can't comfortably perceive or handle motion, and asks for static alternatives to state transitions and simpler motion on small devices. The overview page does not name `prefers-reduced-motion` and gives no token-level reduced variant. | https://carbondesignsystem.com/elements/motion/overview/ (read 2026-10-04) |
| Apple HIG | Most specific of the six: reduce automatic/repeating motion, remove bounce, follow gestures directly, no depth animation, replace movement with fades, no blur transitions. One sentence: "When this setting is active, ensure your app or game responds by reducing automatic and repetitive animations, including zooming, scaling, and peripheral motion." (Apple HIG, Accessibility) | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json (read 2026-10-04) |
| Motion (motion.dev) | React: a site-wide option that, when following the user, turns off transform and layout animation but keeps opacity and colour; plus a hook returning the preference so authors can swap movement for fades, stop autoplay, drop parallax. Plain JS: **unverified**. | https://motion.dev/docs/react-accessibility (read 2026-10-04) |
| Svelte | Nothing automatic: transitions run regardless, and a global CSS duration clamp doesn't reach them (they run through the Web Animations API). In the docs' words: "A global `@media (prefers-reduced-motion: reduce)` rule that zeroes `transition-duration` and `animation-duration` therefore has no effect on them." (Svelte docs, Transitions) `prefersReducedMotion` from `svelte/motion` gives a reactive flag, and the transition docs point at it. | https://svelte.dev/docs/svelte/transition · https://svelte.dev/docs/svelte/svelte-motion (read 2026-10-04) |
| View Transitions API | The two MDN pages read don't mention it, so no automatic behaviour is documented there; whether any browser skips view transitions under reduced motion is **unverified**. Treat gating as the author's job. | https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API · https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using (read 2026-10-04) |
| labkit today | Intends to zero durations and clamp all animation/transition to 1ms — but see the finding above: the block is probably being discarded by the parser. Even when fixed, "1ms everything" is a removal, where Apple and Motion both describe a *replacement* (fade instead of move). | https://github.com/aoconnell099/labkit/blob/3dc971f/src/tokens.css#L51-L62 (read 2026-10-04) |

## What labkit takes

1. **No animation dependency.** labkit already requires Svelte 5 (MIT), which
   provides enter/leave transitions, `Tween`, `Spring` and a reactive
   `prefersReducedMotion`. CSS covers state changes, and `linear()` can carry a
   spring-like curve if one is ever wanted. Motion is MIT and would be
   licence-safe, but it adds a second animation model for no capability labkit
   needs. Revisit only if a component needs gesture-driven or layout (FLIP)
   animation that Svelte cannot do.

2. **Productive motion only (Carbon), named by use (Carbon/M3).** Keep
   `--ease-out` for entering and `--ease-in` for leaving, add one standard curve
   for things that stay on screen while they change, and keep durations to a
   short list named for what they are for (state change, enter, exit) — not a
   size scale. No expressive variant ships in labkit; an app that wants one owns it.

3. **Things that fade never overshoot (M3 spatial vs effects).** Opacity and
   colour use a non-overshooting curve or a critically damped spring; only
   position and size may overshoot, and under reduced motion nothing does.

4. **Reduced motion means *replace*, not just *remove* (Apple, Motion).** Under
   `prefers-reduced-motion`, movement, scaling and repeating animation become an
   opacity change or nothing; the global 1ms clamp stays as a backstop for CSS
   transitions and animations only. Svelte transitions neither honour the
   preference nor feel that clamp, so labkit should wrap the check once (via
   `prefersReducedMotion`) rather than per component. First,
   the build ticket should fix the stray `*` at `src/tokens.css:51` and confirm
   in a browser that the media block applies.

5. **Motion never carries meaning alone, and view transitions stay in the apps
   (Apple; MDN).** Any state shown by motion is also shown by form or text, in
   the same way README rule 2 handles colour. View Transitions animate whole
   views, which is routing, so labkit primitives don't use them; an app that does
   must gate them on reduced motion itself.
