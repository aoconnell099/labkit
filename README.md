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
| `effects/` | **a separate entry, `labkit/effects`**: the effects shelf, set pieces drawn with three.js that read the theme (see Effects below) |

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

### Effects

The effects shelf (ideas `plans/71`): set pieces built once, each reading its colour,
glow and pace from the theme around it, so one piece worn in two themes is two looks.
It is **its own entry, `labkit/effects`, and the only place three.js loads**. `labkit`
itself never imports it, so an app that draws no 3D never loads three.js.

```bash
npm install three@0.170  # an optional peer dependency: only apps that use effects
```

```js
import 'labkit/effects';   // defines the elements, once
import { applyTheme, COLD_CORE } from 'labkit';

// <div id="hero"><labkit-filament-orb></labkit-filament-orb></div>
applyTheme(COLD_CORE, 'dark', 'full', document.getElementById('hero'));
```

Importing the entry defines each element once (guarded by `customElements.get`, so a
second copy in the page does not throw). The shaders are plain GLSL files in
`src/effects/shaders/`, imported as text with Vite's `?raw`, and used through
`RawShaderMaterial`: every uniform and attribute is declared in the shader and no
three.js chunk is included, so another engine can compile them as they stand.

| piece | what it is |
|---|---|
| `<labkit-filament-orb>` | a hologram of a mind (#52): thousands of short glowing fragments on nested shells you can see through, in bright clumps, with small panels, partial dials at many angles, a curled ribbon of light at the core, jagged threads over the outer shell, sparks, and streaks breaking the edge, in the accent, burning toward white and blooming as strongly as `--glow`. It never spins: it drifts, floats and pulses (`drift.ts`) |
| `<labkit-planet-orb>` | a glass ball (#53) in `--effect-tint` (the accent when unset): a bright rim and no highlight dot, glowing marbled clouds inside lit from within, a few jagged threads of light running through it and a scatter of tiny sparks, its inner light, halo and bloom from `--glow`. It no longer spins: it drifts, floats and pulses (`drift.ts`), its threads cracking bright on each pulse, while its marbling slowly swirls |
| `<labkit-orbit-rings>` | three hairline rings at different tilts, each carrying small nodes that go round it once per loop, in the accent, the rings' glow band and the nodes' halo from `--glow`; a transparent frame that holds either orb inside it |
| `<labkit-tendrils>` | hand-drawn vines between points the app gives it, each wandering, kinking and stepping on its way, its colour blending from one end to the other, its glow from `--glow`, swaying a little once per loop; one element, over a transparent background, draws every tendril |
| `<labkit-star-dust>` | a field of fine points over a transparent background, mostly faint and a few brighter, in the theme's ink (`--text`) touched by the accent, the brighter ones' halo from `--glow`; it drifts slowly once per loop, and shifts by the app's `offset`, nearer points more |
| `<labkit-orbits>` | orbit paths (#55): one to four wide, nearly flat ellipses seen a little from above, as hairlines in the accent with a faint glow from `--glow`, over a transparent background; app orbs ride them very slowly, placed with `orbitPlace`, the one function the element draws with |

**What an effect reads from a theme**, from computed style on its own element, with
no canvas (its `settings`): `--accent`; `--glow`, 0 to 1 (a theme with no glow gets
the strands with no halo); and its pace from `readPace`.

**Drift, not spin** (`src/effects/drift.ts`, #52). The owner's phone check of the
first shelf (#42) found the orbs "spinning, and way too fast", where the look they come
from floats and pulses at random. So a piece that moves takes its motion from
`drift.ts`, one implementation. Nothing in it turns round and round:

- `wanderAt`: each layer leans a little on its own slowly changing axis and comes
  back. Each axis is two slow sines of 3 to 9 loops that never line up.
- `bobAt`: the whole floats a hair, up and down over about 1.7 loops.
- `pulseAt`: brightness jumps at irregular moments, about once every 0.55 loop and
  sometimes twice. It rises in 0.025 loop on the theme's ease-out and falls over 0.2
  on its ease-in. `wave` says how far its light has run out from the core.
- `seeded`: the small seeded random every piece is built with.

All of it is a pure function of the time into the loop, so a still frame under calm
or off is one moment of it, the same every time. The strand orb and the planet orb
(#53) use all four. The orbit paths (#55) take `wanderAt` alone, for a path's lean;
dials take it in their ticket (#56). `seedOf(id)` turns a name an app gives (an orbit
path's `id`) into a seed.

**Bloom** (`src/effects/bloom.ts`, #52). A WebGL line is one device pixel wide, so on
a phone's dense screen it is a hair, and hairs never glow. A piece that wants to glow
draws its scene to a texture. A copy shrunk to a third of the CSS size is blurred
twice, a tight blur and a wide one, and added back over the sharp picture as strongly
as the theme's `--glow`. A theme with no glow skips the passes and draws straight to
the canvas. Its shaders are `quad.vert.glsl`, `shrink.frag.glsl`, `blur.frag.glsl` and
`bloom.frag.glsl`.

**How the strand orb is built.** One `LineSegments` holds every line, in one draw
call. Each vertex says which of eight layers leans it (six shells, the core and the
threads), and the shader turns it by that layer's matrix (`uRot[8]`). The sparks are
one `Points` with the same layers. Each piece blinks at its own rate, and one in five
goes fully dark between blinks. On a pulse, everything brightens, the threads crack
bright, and a shell of light runs out from the core. The far side is dimmer, so it
reads as depth. A line is drawn brighter by the square root of the pixel ratio,
because it is thinner on a dense screen. Its look follows the owner's private
reference images, described here in our own words. Its line builder (`Lines`), `sph`
and the jagged walk a thread takes (`thread`) are in `src/effects/strands.ts`, one
implementation the planet orb's threads share.

**`--effect-tint`** gives the planet orb a colour of its own, set on the element or
anywhere above it, while it keeps the theme's glow and pace. Unset, it falls back to
the theme's `--accent`. The app orbs are the planet orb in different colours (ideas
`plans/71`): each app sets its own tint and wears its own theme. The planet orb's
`settings` add `tint`, the colour it draws in (`--effect-tint` as written, or the
accent).

```html
<labkit-planet-orb style="--effect-tint: #3cc6a0"></labkit-planet-orb>
```

The planet orb (#53) blends the glassy planet it was with the strand orb, after the
owner's private reference images. Its ball is worked out per pixel on one square
facing the viewer (`shaders/planet.frag.glsl`, on the glow square's `halo.vert.glsl`),
with the strand orb's glow square behind it, so it needs no sphere mesh. The glass is
see-through, darkening what is behind it, more solid where the clouds are, with a thin
bright rim and a faint sheen inside it, and no highlight dot (it read as plastic). The
clouds are the old marbling's bright parts, lit from within: strongest where the ball
is thickest, and at two hot spots that ride with it. Under a theme with no glow they
show in the tint alone. Its threads (`strands.ts`) and sparks are drawn with the strand
orb's own shaders, over the glass, so they read as inside it. The shell, the threads
and the sparks each wander on their own lean, the whole bobs, a pulse brightens the
clouds and halo and cracks the threads bright, and the whole is drawn through
`bloom.ts`. Nothing turns round.

**The orbit rings hold an orb.** Put either orb inside `<labkit-orbit-rings>` and it
sits in the middle at `ORB_SHARE` (0.68) of the rings' width, slotted into the rings'
shadow root under their canvas; the rings pass in front of it, and the parts behind it
are hidden by its disc. The rings' background is transparent, so with nothing inside
they are rings alone over whatever is behind, and a touch goes through the canvas to
the orb. Size the rings, not the orb: a width set on the orb from the page wins over
the slot's.

```html
<labkit-orbit-rings><labkit-planet-orb></labkit-planet-orb></labkit-orbit-rings>
```

One vertex shader (`shaders/orbit.vert.glsl`) places a point on a ring for the
hairline, the glow band along it (pushed sideways on screen, so it keeps its width
edge on) and the nodes alike, and one fragment shader draws all three. A piece whose
look changes on something the base does not watch calls the base's `redraw()`; the
rings do when an orb is put in or taken out.

**The tendrils join things up.** One `<labkit-tendrils>` draws every tendril on one
canvas, so an app that lays it behind its orbs pays one WebGL context however many
tendrils it has. It is not square like the orbs: its size and place come from the
page, so lay it over its parent and put it first, under the pieces it joins. A touch
goes through it.

```html
<div style="position: relative">
  <labkit-tendrils style="position: absolute; inset: 0"></labkit-tendrils>
  <!-- the orbs it joins -->
</div>
```

Its JS property **`tendrils`** is the list it draws, each
`{id, from: [x, y], to: [x, y], fromColor, toColor, grow}`:

- `from` and `to`: its ends, in CSS pixels from the element's top left.
- `fromColor` and `toColor`: CSS colours at each end, blended along its length; the
  theme's `--accent` where either is unset.
- `grow`: how much of it is drawn, 0 to 1 from `from` (1 when unset), so an app can
  grow one in.
- `id`: seeds its wander, so a tendril keeps its shape from frame to frame and as its
  ends move.

Setting `tendrils` draws one frame through the base's `redraw()`, so an app may move
the ends every frame (its orbs float) while the element's own loop stays stopped under
`calm` and `off`. Its `settings` add `variant` and, per tendril, its `id`, `grow` and
the `fromColor` and `toColor` it draws in (the accent filled in). The one look so far
is `variant="vine"`, the default: a line that wanders, kinks and steps on its way
rather than running straight or curving smoothly, a thin solid line with a glow either
side of it. It sways a little once per loop of the theme's pace and holds still under
`calm` and `off`. Each path is walked on the CPU, in pixels, into one ribbon mesh for
every tendril, and `shaders/tendril.vert.glsl` and `tendril.frag.glsl` only place and
colour it.

**The star dust is the sky behind a page.** `<labkit-star-dust>` draws a field of fine
points over a transparent background, for a dark, starlit page: most of them faint, a
few brighter. They are the theme's ink (`--text`), each leaning a little toward
`--accent`, and the brighter ones carry a halo as strong as `--glow`. Like the
tendrils, its size and place come from the page: lay it over its parent, first, under
everything else. A touch goes through it.

```html
<div style="position: relative">
  <labkit-star-dust style="position: absolute; inset: 0"></labkit-star-dust>
  <!-- the page -->
</div>
```

Every point has a nearness, 0.2 to 1. The field drifts slowly, mostly sideways, the
nearest points 1.5% of the element per loop of the theme's pace and the farthest a
fifth of that, and holds still under `calm` and `off`. Its JS property **`offset`**,
`[x, y]` in CSS pixels, shifts the field for depth: a point at full nearness moves by
all of it, the farthest by a fifth. An app sets it as its camera moves; setting it draws
one frame through the base's `redraw()`, so the field follows the camera under `calm`
and `off` too while its own loop stays stopped. The field wraps at the element's edges,
so neither drift nor offset uncovers a bare strip. Its points are seeded, so the same
page shows the same sky, and how many it draws follows the element's area (one per
1000 square CSS pixels, at most 2400). Its `settings` add `ink` (`--text` as the theme
wrote it) and `offset`. `shaders/star.vert.glsl` places each point and
`star.frag.glsl` draws its dot and halo.

**The orbit paths are what the app orbs ride** (#55). `<labkit-orbits>` draws wide,
nearly flat ellipses, seen a little from above, one to four of them in layers, centred
in the element: hairlines in the accent with a faint glow, over a transparent
background. Like the tendrils, its size and place come from the page: lay it over its
parent and put it under the orbs. A touch goes through it.

```html
<div style="position: relative">
  <labkit-orbits style="position: absolute; inset: 0"></labkit-orbits>
  <!-- the middle orb, and the app orbs that ride the paths -->
</div>
```

Its JS property **`orbits`** is the list it draws (at most four, `MAX_ORBITS`), each
`{id, radius, color, items}`:

- `radius`: the path's size, as a share of the element's half-width.
- `color`: a CSS colour for this path; the theme's `--accent` when unset.
- `items`: how many orbs ride it, evenly spaced.
- `id`: seeds where its items start and its hair of wander, so a path keeps them.

**`orbitPlace(orbit, index, loops, aspect?)`** is where item `index` is at `loops` into
the pace: `{x, y}` as shares of the element's box (0,0 its top left), `scale` (1 at the
nearest point, 0.72 at the farthest) and `behind` (true on the far half, where an orb
should pass behind the middle one). `aspect`, the box's width over its height (1 when
unset), keeps the path's shape in a box of any proportion. It is a pure function, and
the one implementation: the element draws its paths and each item's trail with it, and
an app moves its own orb elements with it at the element's **`loops`** (the loops into
the pace it last drew at, which hold still under `calm` and `off`), so the two always
agree:

```js
const el = document.querySelector('labkit-orbits');
el.orbits = [{ id: 'inner', radius: 0.6, items: 2 }, { id: 'outer', radius: 0.92, items: 1 }];
requestAnimationFrame(function place() {
  const w = el.clientWidth, h = el.clientHeight;
  const p = orbitPlace(el.orbits[0], 0, el.loops, w / h);
  orb.style.transform = `translate(${p.x * w}px, ${p.y * h}px) translate(-50%, -50%) scale(${p.scale})`;
  orb.style.zIndex = p.behind ? '1' : '3';
  requestAnimationFrame(place);
});
```

It is very slow: an item goes round once in 30 loops of the pace on a path of no
radius, 60 on one as wide as the element (`orbitLap(orbit)`), so the outer paths are
slower. In Cold core that is four to nine minutes a round. Nothing else turns: each path
only leans a hair (about two degrees) on its own `wanderAt`. Under `calm` and `off` it
draws one still frame, and setting `orbits` draws one frame through the base's
`redraw()`. Its `settings` add `orbits`, each path's `id`, `radius`, `items` and the
`color` it draws in (the accent filled in).

The look follows a private reference (a star with two planets on wide, nearly flat
orbits, one path solid and one dotted): every second path in the list is dotted, the
far half of each path is dimmer than the near half, and the path brightens just behind
each item and fades back over a short trail. Each path is walked on the CPU, in pixels,
into one ribbon mesh, drawn with the tendrils' own `tendril.vert.glsl` and
`tendril.frag.glsl` with a thinner line.

**`readPace(el)`** (`src/effects/pace.ts`) is the one place an effect gets its
motion, and the motion shelf's first piece. A theme has no speed field, and gets none:

- `period`, the loop, is **10 × the theme's `--motion-dur-enter`**
  (`PERIOD_PER_ENTER`): 8.7 s for Cold core's 870 ms entrance, 5 s for Pen and
  seal's 500 ms. A theme that arrives slowly also moves slowly. Since #52 the strand
  orb, and since #53 the planet orb, do not turn once per loop. Their drift's cycles
  are multiples of the loop.
- `easeOut` and `easeIn`, the theme's `--motion-ease-out` and `--motion-ease-in`
  parsed into functions by a small cubic-Bézier evaluator of our own (`parseEase`,
  `cubicBezier`).
- `level`, the nearest `data-motion` (itself included; `full` when there is none),
  forced to `off` whenever `prefers-reduced-motion: reduce` matches.

⚠️ It reads `--motion-*`, the theme's own values, and never `--dur-*`: those are 0
under `off` and under reduce motion, so a period read from them would be 0 exactly
when the effect should hold still.

**The motion levels for effects.** labkit applies its levels in CSS, which cannot
reach a canvas, so an effect follows them itself:

- `full`: its own `requestAnimationFrame` loop.
- `calm`: one still frame, then no loop. It still fades in and brightens when
  touched, at the theme's pace.
- `off`: one still frame, and the fade and brighten are instant. Reduce motion
  forces `off`.

The fade-in and the brighten on touch are CSS on the element (`opacity` and
`filter`), timed by `--dur-enter` and `--dur-state`, so they follow the levels like
everything else in labkit. An effect makes its three.js renderer only while it is
connected and on screen (an `IntersectionObserver`) and disposes it when it is not,
because a browser keeps only a handful of WebGL contexts alive. It re-reads the theme
and the level when an ancestor's `style` or `data-motion` changes, and when the
reduce-motion setting does. A resize clears the canvas, so it draws a frame straight
after, whether or not its loop runs, rather than leave the canvas blank until the
loop's next tick. It reports `running` (whether its loop runs) and `frames` (frames
drawn).

New pieces extend `LabkitEffect` (`src/effects/base.ts`): `create`, `update`, `draw`
and `destroy`; the base owns the renderer, the loop, the levels and the observers.

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

The gallery's **effects panel** shows each piece in one chosen theme at a time, with a
picker over all thirteen and the same motion picker as the theme frames: one theme at
a time, so at most one canvas per piece is alive. The filament orb sits inside the
orbit rings. The planet orb is there twice: in the theme's accent, and with
`--effect-tint` set to `#3cc6a0`. One tendrils element lies behind them all, joining
the filament orb to both planet orbs: to the plain one half grown, in the accent, and
to the tinted one blending from the accent to its tint. The gallery sets their ends
from where the pieces sit, only when the panel resizes. Under everything, the star dust
fills the panel at no offset.

Beside the theme picker, an **arrangement** picker chooses how the planet orbs relate to
the filament orb: `tendrils`, as above, or `orbit paths`. Under orbit paths the
tendrils draw nothing, a `<labkit-orbits>` behind the pieces draws two paths round the
filament orb (the inner in the accent, the outer in the tint), and the planet orbs ride
them, one each, placed with `orbitPlace` at the element's `loops` in the gallery's own
animation frame: in front of the filament orb on the near half, behind it on the far.
Both elements stay in the panel whichever is picked.

## Licence

MIT.

`labkit/effects` builds on **three.js**, MIT licensed. It is an optional peer
dependency, not bundled: an app that imports the entry installs it, under its own
licence. The peer range is `^0.170.0`, the one version the effects are built and
render-checked against. three changes its API between 0.x releases, so an app
should not pair these effects with an untested one: with this range a plain
`npm install three` picks 0.170, and asking for a newer three fails with `ERESOLVE`
(checked against 0.186). Moving to a newer three is its own change: the
devDependency, its types and this range together, with the render check's shots
compared.

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

There are ten scenes, the most the tool allows: "motion tokens" twice, "dark-only theme
and audit", "full motion", "calm motion", "chosen themes: reduced motion", "chosen themes:
audit", "chosen themes: calm" (merged down to these eight in #38), then "effects" and
"effects: reduced motion" (#39). A new effect adds its steps to the two effects scenes.
The tool also caps the waits and holds of the whole file at 240 s (120 s until
2026-10-15), summed over every scene: each `wait_ms`, `hold` and `touch` counts its
`ms`, and each `wait_for` or `wait_until` its `ms`, or 10 s when it has none, so give
every wait an `ms`. The ten use
104.1 s (the first eight 86.4 s, the effects scenes 17.7 s), leaving 135.9 s. The planet
orb (#40) added 4.7 s: its own steps run inside the filament orb's waits, since every
piece in the panel comes on screen, and changes level, together, and the 4.7 s are a
wait for new frames before the Film page shot (3 s) and the `off` settle becoming a
wait for the pieces (2 s, in place of a fixed 0.3 s). The orbit rings (#41) added
nothing: all their steps run inside the same waits, so the file still uses 104.1 s.
The tendrils (#49) added nothing either, for the same reason: 104.1 s, leaving 135.9 s.
Nor did the star dust (#50): 104.1 s. To fit it under the tool's 60 steps a scene,
"effects" now notes every piece's frame count in one step before each half-second
wait (as it already did after each pick), not one step per piece. The orbit paths
(#55) added 6 s, two waits for new frames after picking them (3 s each), so the file
uses 110.1 s. To fit their steps, "effects" now checks every piece's rise under `full`
in one step, and the loops running in Cold core and stopped after each settle in one
step each: 59 steps.

The effects scenes run at phone width. "effects" picks Cold core in the effects panel,
waits for the filament orb's first frames, finds its loop running, and takes a
screenshot; picks Film page, finds the panel and the orb wearing it, and takes a second;
then finds the frame count rising over half a second under `full`. It picks `calm`, and
after a settle the loop is not running and the count holds over half a second; the
same under `off`. "effects: reduced motion" runs with reduce motion on: for every theme
in `labkitThemes()`, `labkitEffectRead` gives the theme's own `--accent` (as
`labkitToken` reads it), its `--glow`, a period of 10 × its `--motion-dur-enter`, and
level `off`, and no canvas was made doing it. Then the live orb draws a still frame,
its loop is not running, and the count holds. Screenshots are only in Cold core and
Film page: WebGL draws on the processor in the check, slowly. The gallery's helpers
for them: `labkitThemes()` (the chosen themes' names), `labkitEffectRead(theme,
piece)` (a piece's `settings` in that theme, read from a probe put in the theme's
frame and taken out in the same task, so no canvas), `labkitEffectPick(theme)` (shows
the panel in that theme and scrolls to it) and `labkitEffectState(piece)` (`{running,
frames}` of the panel's live piece). The piece is `'filament'`, `'planet'` (the planet
orb in the accent), `'tinted'` (the one with `--effect-tint` set), `'rings'` (the
orbit rings), `'tendrils'` (the tendrils; its probe is given one tendril with its
start colour unset and its end in `#3cc6a0`) or `'stars'` (the star dust), or
`'orbits'` (the orbit paths; its probe is given the gallery's two paths, the inner
one's colour unset and the outer's `#3cc6a0`, and its live state adds `placed`: whether
each planet orb's centre is within a pixel of where `orbitPlace` puts it).
`labkitArrangement(name)` picks `'tendrils'` or `'orbits'`, and `labkitOrbits` holds
`orbitPlace` and `orbitLap` as the entry exports them.

The planet orbs ride the same steps. Before each screenshot the scene notes every
piece's frame count right after the pick and waits until all three have drawn a new
frame, so no shot catches a piece before it has drawn in the picked theme. Both planet
orbs' loops run under `full`, in Film page the plain one's tint is Film page's accent
and the tinted one's is its tint, and their frame counts rise under `full` and hold
under `calm` and `off` over the same waits. ⚠️ Clicking the motion picker scrolls the
planet orbs off screen, so they give their canvas back and draw one frame on coming
back: the `calm` and `off` settles wait until all three pieces are shown again
(`data-shown`) and none is running, or the count moves after it is noted.
The orbit rings ride them too (#41): every frame wait and settle counts four pieces,
the rings' loop runs under `full` in Cold core, the filament orb is slotted inside
them and their element and canvas have a transparent background, in Film page they
read its accent and glow, and their count rises under `full` and holds, loop stopped,
under `calm` and `off`. In "effects: reduced motion" they read every theme's accent,
glow and pace at level `off` with no probe or canvas left, then draw a still frame
and hold.
The tendrils ride them too (#49): every frame wait and settle counts five pieces. In
Cold core their loop runs, the panel holds two tendrils (the plain one at grow 0.5),
and the element fills the panel on a transparent canvas; in Film page they read its
glow, both unset colours fall back to its accent and the other blends to the tint.
Their count rises under `full` and holds, loop stopped, under `calm` and `off`. Under
`calm` one step moves their ends by setting `tendrils` and finds the count rose by
exactly one, with no loop started. In "effects: reduced motion" they read every
theme's accent (the probe's unset start colour too), glow and pace at level `off`
with no probe or canvas left, then draw a still frame and hold.
The star dust rides them too (#50): every frame wait and settle counts six pieces. In
Cold core its loop runs, and it is first in the panel and fills it, its element and
canvas transparent; in Film page it reads its ink, accent and glow, at no offset. Its
count rises under `full` and holds, loop stopped, under `calm` and `off`. Under `calm`
one step sets `offset` to `[12, -6]` and finds the count rose by exactly one, with no
loop started, and the offset read back. In "effects: reduced motion" it reads every
theme's ink, accent, glow and pace at level `off` with no probe or canvas left, then
draws a still frame and holds.
The orbit paths ride them too (#55): every frame wait and settle counts seven pieces.
In Cold core, after the tendrils' shot, `labkitArrangement('orbits')` picks them: their
loop runs, two paths fill the panel on a transparent canvas, the tendrils are emptied,
and each planet orb sits where `orbitPlace` puts it, in front of the filament orb or
behind it; then a shot. Film page takes its tendrils shot, picks the orbit paths, finds
them wearing its glow, the inner path its accent and the outer the tint, and takes a
second. They stay picked from there: their count rises under `full` and holds, loop
stopped and the planet orbs still on them, under `calm` and `off`. Under `calm` one step
sets `orbits` and finds the count rose by exactly one, with no loop started and `loops`
unchanged. In "effects: reduced motion" they read every theme's accent (the unset
colour falling back to it, the set one kept), glow and pace at level `off` with no probe
or canvas left. Three steps test `orbitPlace` and `orbitLap` with no element: a round
takes 30 to 60 loops, the outer path slower; four items on a path sit opposite in pairs;
and over a round about half is behind, higher on the screen and smaller. Then they draw
a still frame and hold.
In "effects: reduced motion", for every theme the plain planet orb's tint is the
theme's accent, the tinted one's is `#3cc6a0` while its accent is still the theme's,
both read the theme's glow and pace at level `off`, and no probe or canvas is left;
then both draw a still frame and hold.

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
