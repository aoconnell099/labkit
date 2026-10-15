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
| `palette.ts` | the palette shape, a validated default, `applyPalette`, and `onAccentFor`, the button label's colour |
| `contrast.ts` | `contrast` and `auditPalette`: every text token against its surface, and the button label against the accent |
| `themes.ts` | `Theme`, `applyTheme` and `auditTheme`: a palette per mode plus type, surfaces and motion |
| `themes/` | the chosen themes, one file each (see Chosen themes below) |
| `mode.ts` | an explicit light/dark choice, persisted (renamed in #28, when "theme" came to mean an art theme; the storage key is still `labkit.theme`) |

### Themes

A **`Theme`** extends what a palette holds. It has a name and a one-line
character; `modes`, holding a palette's values (ink, status, accent, onAccent, floor) for
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

**The button label.** The primary button's text sits on the accent, not the
surface, so it has its own colour: `onAccent`, optional per mode in a palette
(`onAccent: { light, dark }`) and in each of a theme's modes. `applyPalette` and
`applyTheme` stamp it as `--on-accent`, and `.btn.primary` paints its label with
it. A mode that gives none gets the kit's choice, `onAccentFor(values)`: white
wherever white clears 4.5:1 on the accent, so a label that already passed stays as
it was; otherwise whichever of white, the mode's `ink.text` and its `ink.surface`
measures highest. (The surface is in that list because in a dark mode the text is
light too, and a light accent would otherwise get a choice of two light labels.)
The audit checks it as one more row, `onAccent` on `accent`, at 4.5:1.

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
| Blue haze | `BLUE_HAZE` | a deep navy haze cut by hard, cold light | dark only | state 180 ms, entrance 1200 ms, fade |
| Banked ember | `BANKED_EMBER` | a warm brown-black lit by one gold glow | dark only | state 0 ms, entrance 1170 ms, fade |
| Magenta tube | `MAGENTA_TUBE` | glossy black under a hot magenta glow | dark only | state 30 ms, entrance 1200 ms, fade |
| Rust terminal | `RUST_TERMINAL` | a monospace screen in rust red on near-black | dark only | state 30 ms, entrance 1210 ms, fade |
| Black glint | `BLACK_GLINT` | absolute black that holds still, with one small white glint | dark only | state 180 ms, entrance 1160 ms, fade |
| Pen and seal | `PEN_AND_SEAL` | black ink on white paper, drawn by hand | light only | state 180 ms, entrance 500 ms, fade |
| Candy glass | `CANDY_GLASS` | soft pastel toys under frosted glass | light only | state 180 ms, entrance 1130 ms, fade |
| Loud wall | `LOUD_WALL` | flat poster red on a bright white wall | light only | state 70 ms, entrance 1200 ms, fade |
| Film page | `FILM_PAGE` | a white page with thin rules and a serif voice | light only | state 30 ms, entrance 1120 ms, fade |
| Screen print | `SCREEN_PRINT` | two inks pulled by hand on cream paper | light only | state 60 ms, entrance 1200 ms, fade |
| Rose mist | `ROSE_MIST` | frosted cards floating over a soft pink wash | light only | state 180 ms, entrance 500 ms, fade |

Each passes `auditTheme` in every mode it ships. The dark themes start from the
default dark status pair, and on these grounds no value had to move (pos / neg,
against a bar of 4.5):

| theme | pos | neg |
|---|---|---|
| Cold core | 8.15:1 | 5.72:1 |
| Still violet | 7.97:1 | 5.59:1 |
| Blue haze | 7.84:1 | 5.51:1 |
| Banked ember | 7.80:1 | 5.48:1 |
| Magenta tube | 8.17:1 | 5.73:1 |
| Rust terminal | 8.13:1 | 5.71:1 |
| Black glint | 8.65:1 | 6.07:1 |

The light themes start from the default light pair. One value moved: on Rose mist's
pink, the default green measures 3.55:1, so its pos is the same green darkened to
`#046852`, the smallest step that passes, at 4.52:1. Everything else kept the default:

| theme | pos | neg |
|---|---|---|
| Pen and seal | 5.26:1 | 7.80:1 |
| Candy glass | 4.88:1 | 7.23:1 |
| Loud wall | 5.12:1 | 7.59:1 |
| Film page | 5.31:1 | 7.86:1 |
| Screen print | 5.09:1 | 7.54:1 |
| Rose mist | 4.52:1 (moved) | 5.26:1 |

Each sets its draft's button label (`onAccent`), and each clears 4.5:1 on its accent:

| theme | label | on the accent |
|---|---|---|
| Cold core | `#eceef5` | 4.95:1 |
| Still violet | `#eeedf6` | 5.18:1 |
| Blue haze | `#e7effc` | 5.11:1 |
| Banked ember | `#190e0b` | 7.33:1 |
| Magenta tube | `#0b090d` | 4.89:1 |
| Rust terminal | `#f0eeed` | 4.75:1 |
| Black glint | `#000000` | 20.47:1 |
| Pen and seal | `#fefefe` | 20.82:1 |
| Candy glass | `#161616` | 5.49:1 |
| Loud wall | `#fbfbf8` | 4.79:1 |
| Film page | `#ffffff` | 19.67:1 |
| Screen print | `#000000` | 4.84:1 |
| Rose mist | `#000000` | 4.62:1 |

Black glint departs from its draft in two values, each for a reason in its file:
a visible line and inset where the draft's measured 1.0:1 on black. Its accent is
the draft's near-white `#fcfcfc` with a black label; batch 2 had swapped in a red,
while the label was still a fixed white that vanished on it (#35). ⚠️ Banked
ember's gold is light for an accent: a white label on it measures 2.58:1, so its
label is a dark, the ground's own brown-black, and the audit fails a copy of it
set back to white. Candy glass's pink and Screen print's red also fail a white
label (about 3.3:1 and 4.34:1), so theirs are dark too. Rose mist's accent clears
its 3:1 bar by the least, at 3.04:1.

That is all thirteen, in three batches (#29, #31 and #32).

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
and its motion picker. "dark-only theme and audit" ticks "show both modes" and finds the
palettes doubled but no light frame for the theme, then calls `window.labkitAudit()`, which
the gallery exposes: each shown theme's contrast failures, keyed by the modes it ships,
and expects none. The audit reads the themes themselves, not the page, so it runs after
the tick without being changed by it. "full motion" and "calm motion" pause the frame's
entrance at its first frame and read its transform: 12 px down under `full` (so the check
can see a distance), none under `calm`, where the loading pulse also has no running
animation and `--dur-state` stays `180ms`; `off` makes it `0ms`.

There are eight scenes (#38): "motion tokens" twice, "dark-only theme and audit", "full
motion", "calm motion", "chosen themes: reduced motion", "chosen themes: audit" and
"chosen themes: calm". The tool allows ten, so two are free, kept for the effects shelf
(ideas `plans/71`). It also caps the waits and holds of the whole file at 120 s, summed over
every scene: each `wait_ms`, `hold` and `touch` counts its `ms`, and each `wait_for` or
`wait_until` its `ms`, or 10 s when it has none, so give every wait an `ms`. The eight use
86.4 s, leaving 33.6 s: the effects shelf's ticket 2 may add 14 s, tickets 3 and 4 8 s each.

The chosen themes (#29) share three scenes, because the tool allows ten scenes of 60
steps, and thirteen themes would not fit one scene each. A new theme adds its steps to
each, and a line to `CHOSEN` in `gallery/src/palettes.ts`; nothing else changes.
"chosen themes: audit" ticks "show both modes", notes each theme's measured ratios, and
expects it shown and audited in exactly the modes it ships, with 0 failures in each.
"chosen themes: reduced motion" runs with reduce motion on. It first finds the Cool dark
frame's `--dur-state` at `0ms` under all three motion levels, then finds each theme's
`--dur-state` at `0ms`, and takes a screenshot of each frame. "chosen themes: calm"
checks each theme's own durations land under `full`, then picks `calm` and finds no
entrance distance. Both batch 1 themes enter with a fade, which moves no distance under
`full` either, so for them the calm check confirms nothing was added rather than taken
away; the same holds for every batch 2 theme (#31) and every batch 3 theme (#32). The
batch 3 themes ship light only, so the audit scene expects each shown and audited in
light alone. Banked ember's state duration is
0 ms under `full`, so its reduced-motion step also finds `--dur-enter` at `0ms`, which
is the part that changes. The steps call small helpers the gallery puts on `window` (`labkitModesShown`,
`labkitRatios`, `labkitToken`, `labkitEnterStart`, `labkitShow`) to stay under the
tool's 500 characters a step.
