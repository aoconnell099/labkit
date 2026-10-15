# labkit

The shared design substrate for a small set of self-hosted apps: tokens,
primitives, and a gallery to look at them in.

**Nothing here was designed up front.** It was extracted from three apps that
had already been built independently — a personal-finance app, a shared-house
ledger, and an identity service. Every piece survived at least two of the three.

The comments record what did **not** survive, which is usually the more useful
half: a categorical colour scale (meaningless without series), a category→slot
registry (a statement about one dataset), an ambient wash keyed to a figure
(only safe in an app that leads with one), and per-screen theme defaults (a real
decision, but one app's).

## Use

```bash
npm install github:aoconnell099/labkit
```

⚠️ **A git dependency has no version range, so the LOCKFILE is the version.**
`npm install` records the resolved commit and every later build uses it — which
is what you want for reproducibility, but it means labkit updates do not reach an
app until someone re-runs the install there and commits the new lock. Two
consumers were a commit apart within an hour of the first release, and the
deployed CSS was the tell. To update:

```bash
npm install labkit@github:aoconnell099/labkit   # then commit the lockfile
```

```js
import 'labkit/tokens.css';
import { Section, StatRow, Rail, applyPalette } from 'labkit';

applyPalette('dark', MY_PALETTE);   // or omit for DEFAULT_PALETTE
```

You supply your own fonts (`--font-ui`, `--font-fig`) and your own palette
values. labkit owns the *shape*, not the choices.

## The four rules it enforces

1. **Colour is computed, not chosen.** Every default was run through a validator
   — lightness band, chroma floor, colour-vision separation, contrast against
   the surface. Re-run it before changing a value, and read the value back out
   of the file afterwards rather than trusting what you meant to type.

2. **Two status hues by default; a third only where it measures.** Three status
   hues at text contrast on a light ground often have *no* solution: green, clay
   and amber collide in lightness, and green-vs-red is the deuteranopia pair.
   `src/palette.ts` allows an optional third hue (`attention`) only where it
   measures as passing on the ground in use — it passes on a cool near-white and
   fails on a warm cream. Where it does not pass, the third state carries
   **form** — a segmented tick, a dashed fill, a weight change. Two of the three
   source apps discovered this separately. Measure before going looking for an
   amber.

3. **Tone names belong to no domain.** The same pigment was called `--money-in`,
   `--ok` and `--pos` by the three apps. A token named `--money-in` marking an
   *active account* is a second meaning waiting to be misread, so labkit ships
   `--tone-pos` / `--tone-neg` and apps alias their own vocabulary on top.

4. **All seven interaction states.** rest · hover · focus-visible · active ·
   disabled · loading · empty. Most kits ship two. `focus-visible` is a visible
   ring, always, and is never removed to tidy up a design.

## What is in it

| | |
|---|---|
| `tokens.css` | spacing, motion and the three motion levels, the `.enter` entrance, the `.surface` panel, focus rings, table paint, form controls, buttons, the rail |
| `Section` | a titled region with a hairline, optional meta and method footer |
| `StatRow` | label / figure / caveat, with a `big` hero mode |
| `Rail` | a tick, a short code, a qualifier |
| `Meter` | a progress mark — takes a **tone**, never a value-to-colour rule |
| `Field` | a labelled control with its hint and an announced error |
| `palette.ts` | the palette shape, a validated default, and `applyPalette` |
| `contrast.ts` | `contrast` and `auditPalette`: every text token against its surface |
| `themes.ts` | `Theme`, `applyTheme` and `auditTheme`: a palette per mode plus type, surfaces and motion |
| `themes/` | the chosen themes, one file each (see Chosen themes below) |
| `mode.ts` | an explicit light/dark choice, persisted (renamed in #28, when "theme" came to mean an art theme; the storage key is still `labkit.theme`) |

### Themes

A **`Theme`** extends what a palette holds. It has a name and a one-line
character; `modes`, holding a palette's values (ink, status, accent, floor) for
**each mode it ships**, which may be dark only, light only, or both; `type`, the
font stacks for `--font-ui`, `--font-fig` and an optional `--font-display` (stacks
only: labkit ships no font files); `surfaces`, `glass` (blur in px), `grain` and
`glow` (0 to 1), each 0 meaning none; and `motion`: `durState` and `durEnter` in
ms, `easeOut` and `easeIn` as `cubic-bezier(...)`, and `enter`, one of `fade`,
`rise` or `scale`.

```js
applyTheme(MY_THEME, 'dark', 'full');          // or (theme, mode, level, element)
expect(auditTheme(MY_THEME).failures).toEqual([]);
```

**`applyTheme(theme, mode, level, root)`** throws for a mode the theme does not
ship. It stamps the colours through the same code as `applyPalette`, sets the
type and surface tokens, puts the motion in `--motion-*`, and sets `data-motion`
on the element. **`auditTheme(theme)`** runs `auditPalette`'s checks (one shared
function) on each mode the theme ships, and only those.

**Three motion levels**, set by `data-motion`:

- `full`: the theme's motion as given.
- `calm`: state changes and fades keep the theme's durations, entrances move no
  distance, and infinite animations stop (`.is-loading` included: it holds still,
  dimmed).
- `off`: what the reduced-motion block does: durations 0, every animation and
  transition at 1 ms.

The system's reduce-motion setting forces `off` under every level.

`.surface` is a raised panel wearing the theme's glass, grain and glow. With all
three at 0, the default, it is plain and opaque.

### Chosen themes

labkit ships these, one file each in `src/themes/`, exported from the package:

```js
import { COLD_CORE } from 'labkit';
applyTheme(COLD_CORE, 'dark', 'full');
```

| theme | export | character | modes | motion |
|---|---|---|---|---|
| Cold core | `COLD_CORE` | near-black instrument panels lit by one cold glow | dark only | state 20 ms, entrance 870 ms, fade |
| Still violet | `STILL_VIOLET` | a violet-black ground where everything arrives slowly | dark only | state 180 ms, entrance 1190 ms, fade |

Each passes `auditTheme` in every mode it ships. Both start from the default dark
status pair, and on these grounds neither value had to move: Cold core measures
8.15:1 and 5.72:1, Still violet 7.97:1 and 5.59:1, against a bar of 4.5. More
themes come in two later batches (#29 was the first).

## Gallery

`gallery/` renders every primitive in every state across all three palettes and
both modes. It exists because drift between apps is invisible one repo at a time
and obvious side by side — and because it is the only place all seven
interaction states can be seen at once.

```bash
cd gallery && npm install && npm run dev    # http://127.0.0.1:5178/labkit/
```

It imports the real components. A gallery built from copies is a mockup that
drifts, and gets believed because it looks authoritative.

It also earns its keep immediately: the first render showed two of the three
example palettes rendering identically, because they shared every value. Reading
the source would not have caught it. There is now a check on the page for that
exact mistake, and each frame prints its own measured contrast ratios.

## Licence

MIT.

## Previews

`preview.json` tells the desktop worker how to build this repo for review by looking
(lab-harness #86, ideas `plans/49`): a worker PR that passes its Verifier gets the gallery
built from that exact commit and a link on the PR, served sandboxed at
the lab's private previews site (its address is in the private homelab repo). The build uses `--base ./` because the
gallery's own base is `/labkit/`, which would point every asset outside the preview.
Before `vite build` it runs `npm run check` (svelte-check) at the root and in `gallery/`,
so a preview exists only when the types check, and a failure shows on the PR as the
build's last lines. The PR checker may not install packages, so this is where labkit's
type checks run (#24).
Checked 2026-10-08: it renders in the sandbox with no errors (`mode.ts`, under its old
name, already wrapped `localStorage`, which a sandboxed page can't use).

`render.json` is the play script for the lab's render check (lab-harness #155). Its first
two scenes, "motion tokens", open the gallery with the system's reduce-motion setting on
and off, and read the motion tokens off a real button and field: with it on, `--dur-state`
is `0ms` and every transition at most 1 ms; with it off, `--dur-state` is `180ms`. The fix
in #26 (a stray `*` had swallowed the whole reduced-motion block) is checked this way on
each worker PR once its preview is built, and by the worker and the PR checker themselves
when a ticket runs on the desktop worker. Read the tokens from an element, as here: an
undefined custom property doesn't warn, it silently falls back.

The theme scenes (#28) run at phone width against the gallery's dark-only Cool dark theme
and its motion picker. "dark-only theme" ticks "show both modes" and finds the palettes
doubled but no light frame for the theme. "theme audit" calls `window.labkitAudit()`, which
the gallery exposes: each shown theme's contrast failures, keyed by the modes it ships,
and expects none. "full motion" and "calm motion" pause the frame's entrance at its first
frame and read its transform: 12 px down under `full` (so the check can see a distance), none
under `calm`, where the loading pulse also has no running animation and `--dur-state` stays
`180ms`; `off` makes it `0ms`. "theme motion levels" runs with reduce motion on and finds
`--dur-state` at `0ms` under all three levels.

The chosen themes (#29) share three scenes, because the tool allows ten scenes of 60
steps, and thirteen themes would not fit one scene each. A new theme adds its steps to
each, and a line to `CHOSEN` in `gallery/src/palettes.ts`; nothing else changes.
"chosen themes: audit" ticks "show both modes", notes each theme's measured ratios, and
expects it shown and audited in exactly the modes it ships, with 0 failures in each.
"chosen themes: reduced motion" runs with reduce motion on, finds each theme's
`--dur-state` at `0ms`, and takes a screenshot of each frame. "chosen themes: calm"
checks each theme's own durations land under `full`, then picks `calm` and finds no
entrance distance. Both batch 1 themes enter with a fade, which moves no distance under
`full` either, so for them the calm check confirms nothing was added rather than taken
away. The steps call small helpers the gallery puts on `window` (`labkitModesShown`,
`labkitRatios`, `labkitToken`, `labkitEnterStart`, `labkitShow`) to stay under the
tool's 500 characters a step.
