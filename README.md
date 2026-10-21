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
| `<labkit-planet-orb>` | a glass ball (#53) in `--effect-tint` (the accent when unset), or every hue at once with the `rainbow` attribute: a bright rim and no highlight dot, slow smoke inside at two depths lit from within, a few jagged threads of light running through it and a scatter of tiny sparks, and outside the glass a sparse coat of the strand orb's fragments, threads and streaks with arcs and long strands of light wrapping round; its inner light, halo and bloom from `--glow`. It no longer spins: it drifts, floats and pulses (`drift.ts`), its threads cracking bright on each pulse, while its smoke billows |
| `<labkit-orbit-rings>` | three hairline rings at different tilts, each carrying small nodes that go round it once per loop, in the accent, the rings' glow band and the nodes' halo from `--glow`; a transparent frame that holds either orb inside it |
| `<labkit-dials>` | flat dials (#56): five concentric dials facing the viewer, like an interface drawn round an orb, in segments with gaps, with ruler ticks, heavy bars, a doubled stretch or two and small marks riding them, in the accent, glowing and blooming from `--glow`; each turns very slowly, some one way and some the other, and pulses. The same transparent frame for an orb as the orbit rings |
| `<labkit-tendrils>` | hand-drawn vines between points the app gives it, each wandering, kinking and stepping on its way, its colour blending from one end to the other, its glow from `--glow`, swaying a little once per loop; one element, over a transparent background, draws every tendril |
| `<labkit-star-dust>` | a field of fine points over a transparent background, nearly all faint dust gathering along a diagonal band and a few brighter, in the theme's ink (`--text`) touched by the accent, the brighter ones' halo from `--glow`; each twinkles at its own pace, a shooting star crosses about once a minute (`shoot()` sends one), it drifts slowly once per loop, and shifts by the app's `offset`, nearer points more |
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
the dials (#56) take `pulseAt` alone, one seed per dial. `seedOf(id)` turns a name an app gives (an orbit
path's `id`) into a seed.

**Bloom** (`src/effects/bloom.ts`, #52). A WebGL line is one device pixel wide, so on
a phone's dense screen it is a hair, and hairs never glow. A piece that wants to glow
draws its scene to a texture. A copy shrunk to a third of the CSS size is blurred
twice, a tight blur and a wide one, and added back over the sharp picture as strongly
as the theme's `--glow`. A theme with no glow skips the passes and draws straight to
the canvas. Its shaders are `quad.vert.glsl`, `shrink.frag.glsl`, `blur.frag.glsl` and
`bloom.frag.glsl`. The glow fades to nothing in a ring that ends at the canvas edge
(from 72% of the way out from the centre), so it ends in a circle round the orb. The
blur stops at the canvas edge still lit, so without the fade each orb sat in a faint
square over the stars and orbit paths behind it.

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
accent), and `rainbow`.

**`cloud`**, an attribute on the filament orb (the owner's polish list, 2026-10-18, after
private references described in our own words): a nebula round the orb, a soft lumpy haze
with no clean outline and folded sheets of fine glowing net in it, the accent deepening to
violet and lifting to teal in places, with fine specks of light caught in it, out to about
1.75 radii (more of it since 2026-10-19). It drifts in place like a
jellyfish: three lobes' worth of swell go round its outline at their own rates, so one
side swells as another settles, and it never turns. It floats as a jellyfish does (the
owner, 2026-10-20: "more of a gradual floating effect and less of a pulse", replacing the
quick bell beat of 2026-10-19): over 1.25 loops (about 11 s at Cold core) it rises a little,
drawing in gently at its sides, and sinks back as it relaxes, on one smooth wave. Its folds
drift on their own, re-forming over about 30 s. It never lights itself: brighter, it would
read as the orb pulsing, and Jarvis's pulses are for working and speaking. The pulse
brightens and swells it a little. All of it holds still under `calm` and `off`. While it
shows, the camera stands back (6.6 for 4.6), so the orb sits smaller inside it. Drawn on its
own square behind the orb (`shaders/cloud.frag.glsl`, 2.05 radii), in the orb's canvas, so it
costs no context. Setting it draws a frame. The gallery's **cloud** box turns it on.

**`flare(strength)`** brightens the planet orb (and the filament orb) now, as one of its
own pulses does, through the same envelope in `drift.ts` (`pulseAt` takes the asked-for
flares): the hub flares a planet when a bead lands on it. False, and nothing, under `calm`
and `off`. **`pulse="off"`** leaves out the piece's own random pulses, so only asked-for
flares show (the hub's planets, and Jarvis until it is working). Setting it draws a frame.

**`seed`**, an attribute (any text, read as the planet comes on screen), gives a planet its
own threads, sparks, coat and strands; unset it keeps the one look it always had. **`reach`**,
a property, is which way a vine leaves the planet, in radians on the page (0 right, a quarter
turn down, CSS's y), or null: a planet with a reach turns nine threads from its glass out to
its canvas's edge (1.28 to 1.42 radii) to meet the vine there, steady and shimmering, on a
layer that faces the vine instead of wandering (the tufts of streaks ride it too). With no
reach they never show (`uReach` 0). Setting it draws a frame only while the piece is still.

**Glow is light, never coverage** (the owner, 2026-10-19: "the tendrils just hit the black
circle and stop"). The halo writes no alpha, and the bloom's blurred copy adds only its
colour: its alpha was the glass ball's opacity spread round it, a dark disc round every planet
(and the filament orb) that hid the vines and stars behind. Coverage is now exactly the sharp
picture's: the glass, the lines and the sparks.

**`rainbow`**, an attribute, draws the planet in every hue at once instead of its tint
(the hub's Apps orb, which holds every app): the smoke's hue follows the same warp that
curls it, so the colours mix the way it curls, its far layer a third of the wheel round
from its near one; each coat fragment, thread and spark takes a hue of its own (its seed
round the wheel); the rim burns toward white; and the glow behind is a soft cool white,
every hue added up. Setting or removing it draws a frame, still or not.

```html
<labkit-planet-orb style="--effect-tint: #3cc6a0"></labkit-planet-orb>
<labkit-planet-orb rainbow></labkit-planet-orb>
```

The planet orb (#53) blends the glassy planet it was with the strand orb, after the
owner's private reference images. Its ball is worked out per pixel on one square
facing the viewer (`shaders/planet.frag.glsl`, on the glow square's `halo.vert.glsl`),
with the strand orb's glow square behind it, so it needs no sphere mesh. The glass is
see-through, darkening what is behind it, more solid where the smoke is, with a thin
bright rim and a faint sheen inside it, and no highlight dot (it read as plastic). The
smoke (the owner's polish list, 2026-10-18: "more of a smoke effect inside") replaced
the marbled clouds: noise bent by noise (a domain warp) curls it into wisps, sampled at
two depths on each line of sight, a near layer over a dimmer deeper one that shifts
against it as the shell leans, so it reads as a volume; the warp drifts on its own, so
it billows rather than turning. It is lit from within: strongest toward the heart, and
at two hot spots that ride with it. Under a theme with no glow it shows in the tint
alone. The cost is about the marbling's: 14 noise lookups a pixel (two three-octave
warps, two four-octave layers) where the marbling took 12. Its threads (`strands.ts`)
and sparks are drawn with the strand orb's own shaders, over the glass, so they read as
inside it. **Outside the glass** is a coat of light ("light and filament orb effect
surrounding it"): the strand orb's own fragments on two sparse shells (1.1 and 1.2
radii, 350 in all, gathered in eleven clumps with dark gaps), six threads wrapping round
outside, and 90 streaks bristling out in tufts so the outline is ragged, about a sixth
of the strand orb's, so Jarvis stays the richest thing on a page. The vines will leave
from it. **Strands of light** wrap round it too (the owner, after the coat: "moreso outer
filament strands, but some inner strands wouldn't hurt either"): ten partial arcs at
many angles between 1.05 and 1.25 radii (the strand orb's dials, steady, a third of them
doubled) and twelve long smooth curves wrapping round, leaning slowly as they go and
blinking gently like the fragments. Inside, under the smoke, one sparse shell of 120
fragments at 0.62 and a small curled ribbon of eight lines at the heart. `tilt`, which
sets a dial at its angle, moved from the strand orb into `strands.ts` so both share it. The shell, the threads, the sparks, the coat, its streaks, the arcs, the strands and
the inner pieces each wander on their own lean (all eight of the shaders' leans), the whole bobs, a pulse brightens the smoke and halo and cracks the
threads bright, and the whole is drawn through `bloom.ts`. Nothing turns round.

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

**The dials frame an orb flat** (#56). `<labkit-dials>` holds an orb exactly as the
orbit rings do, with the same style (`FRAME_STYLE` in `orbit-rings.ts`): the orb in the
middle at `ORB_SHARE`, a transparent background, a touch going through to the orb. But
nothing in it is tilted: five concentric dials face the viewer, like an interface drawn
round the orb, where the tilted rings read as an electron's orbits. Swap one for the
other to taste; the orbit rings stay.

```html
<labkit-dials><labkit-filament-orb></labkit-filament-orb></labkit-dials>
```

From the inside out: a dial in three long segments, ruled inward with fine ticks
(every fifth twice as long), whose ticks reach in under the orb's disc; a ring of twelve
dashes, doubled along a third of it; a hairline over half the turn that ends in a run of
short heavy bars; a ruler over most of the turn with ticks outward; and an outer dial in
a few long arcs, doubled along one. Small bright marks ride three of them. All of it is
in the accent, with a glow either side of each line and the shared bloom over it, both
as strong as `--glow`. Where a dial passes under the orb's disc it is drawn at under a
third of its brightness, so it reads as behind the orb.

Nothing spins. Each dial turns once in 28 to 58 loops of the pace, some one way and
some the other, its marks sliding along it a little faster, and each dial brightens on
its own irregular pulses (`pulseAt`). In Cold core the fastest dial takes about four
minutes a turn. Under `calm` and `off` it draws one still frame. Its `settings` add
`dials`, each dial's `radius` (a share of the half-width) and `lap` (the loops for one
turn, negative for the other way). Each dial is walked on the CPU, in pixels, into one
ribbon mesh drawn with the tendrils' own shaders, and through `bloom.ts`.

The look follows the owner's private references (layered flat interface rings round a
glowing core, and an orb ringed by concentric circles with bright points on them):
segments and gaps, dense ruler ticks, short heavy blocks, a second line along part of a
ring, and a few bright points riding.

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
`{id, from: [x, y], to: [x, y], fromColor, toColor, grow, fromRadius}`:

- `from` and `to`: its ends, in CSS pixels from the element's top left.
- `fromColor` and `toColor`: CSS colours at each end, blended along its length; the
  theme's `--accent` where either is unset.
- `grow`: how much of it is drawn, 0 to 1 from `from` (1 when unset), so an app can
  grow one in.
- `id`: seeds its wander, so a tendril keeps its shape from frame to frame and as its
  ends move.
- `fromRadius`: for a tendril that starts at the middle of an orb's ball, the ball's
  radius in CSS pixels. It fades in across the ball, so it grows out of the glass instead
  of ending at a cut, and the bundle's fan is never wider than the ball (the owner,
  2026-10-19: "the tendrils getting cut off"). Unset, a tendril starts at `from`, fading
  in over 6% of its length.

Setting `tendrils` draws one frame through the base's `redraw()`, so an app may move
the ends every frame (its orbs float) while the element's own loop stays stopped under
`calm` and `off`. Its `settings` add `variant` and, per tendril, its `id`, `grow` and
the `fromColor` and `toColor` it draws in (the accent filled in). Three looks, by the
**`variant`** attribute (setting it draws a frame; `TENDRIL_VARIANTS` lists them):
- `vine`, the default: a line that wanders, kinks and steps on its way rather than
  running straight or curving smoothly, a thin solid line with a glow either side of
  it, its colour blending from one end to the other. It sways a little once per loop.
- `twist` and `bundle` (the owner's polish list, 2026-10-18: "less sharp turns, and act
  more like a rope floating in water", "filament type threads", "a swirl of both
  colored tendrils, alternating colors"; the owner asked to see both): a smooth rope
  whose bend is three slow waves travelling along it (at most 7.5% of its length or 42
  px, none at its ends), made of threads winding round it, about 1.6 to 2.8 turns from
  end to end and turning on slowly. A thread in front is brighter than one behind, so
  the winding reads. `twist` is two threads, one in each end's colour, 4 px out from the
  middle and spreading further apart at the ends. `bundle` is twenty fine threads in
  alternating colours, each at a little over a third of a line's light (at full they
  burned into one solid band), swelling and pinching along the way, fanning out at
  `from` (up to 36 px, where an app's orb is) and gathering in at `to`.
A tendril's **`rainbow`** sends its `fromColor` threads through every hue instead (twist:
along the thread; bundle: one hue per thread), turning slowly. A tendril's **`beads`** sends beads of
light down it from `to` to `from` (the owner's polish list: "a pulse of light travels from
the base of the Jarvis-side tendril through the tendrils to the planet orb"): `'idle'` now
and then, one idle tendril at a time (slots of 0.95 loops, 70% holding one, about every 12 s
at Cold core), each taking 0.13 loops (1.1 s) and burning toward white; or a number, a
heartbeat every that many ms, a lub and a weaker dub 0.022 loops later (0.19 s), each
taking 0.085 loops (0.7 s) and keeping the tendril's own colour (red, in an alarm). A bead
brightens what it passes 2.5 times (5 on the bundle's faint threads). As one reaches
`from` the element dispatches **`labkit-arrive`**, `{id, kind: 'idle' | 'beat'}`, once,
so an app can flare the orb there; `beads` (the getter) gives each tendril's beads now.
None under `calm` and `off`, and none is told after a pause of half a loop. All of them hold still
under `calm` and `off`. Each path is walked on the CPU, in pixels, into ribbons (one per
vine, one per thread), and `shaders/tendril.vert.glsl` and `tendril.frag.glsl` only
place and colour them. The gallery's effects panel has a **vine** picker.

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
160 square CSS pixels, at most 12000: about 2000 on a phone). 1.2% are bright, with a
halo, and 7% middling; the rest are dust, pinpoints most of them barely there. Two in
five gather along a band, a diagonal across the field (where `x + y` is near 0.37,
spread on a bell curve), like the galaxy's plane in a night photograph; it wraps with the
field. One in seven leans warm, rose or violet instead of toward the accent. Its `settings` add `ink` (`--text` as the theme
wrote it) and `offset`. `shaders/star.vert.glsl` places each point and
`star.frag.glsl` draws its dot and halo.

Every point **twinkles** at its own pace: its light swells and fades on two waves of its
own and catches brighter for a moment near the top of a swell, the faint ones deepest,
the bright few only a little. Each wave is a whole number of cycles in four loops of the
pace (a swell every 2.3 to 5.8 s at Cold core), so it never jumps however long a page
stays open. Now and then a **shooting star** crosses: a fine line with a bright head and
a tail that grows and fades, down and across a quarter to nearly half the element's
shorter side, gone in under a second. The time is cut into slots of two loops (17.4 s at
Cold core), each holding one with a 30% chance at a seeded moment, so about one a
minute, never on a beat you can see, and the same page at the same moment shows the
same sky. **`shoot()`** sends one from the next frame (false under `calm` and `off`), and
**`shooting`** says whether the last frame drew one. Twinkle and crossings hold still
with the drift: under `calm` and `off` the field is one still moment, with no shooting
star in it. `shaders/meteor.vert.glsl` lays a crossing's quad and `meteor.frag.glsl`
draws it.

**A sky behind the stars** (the owner's polish list, 2026-10-18, after three folders of
night-sky photographs): the `sky` attribute gives the band the stars gather along a glow of
its own, in one of three looks, and is none when unset, as before.
Since 2026-10-20 each sky follows two or more of the owner's photographs (their words: "a
combination of those two images ... tuned slightly to not overpower the foreground"). Each
has a colour of its own across the whole field rather than black, in broad slow patches, a
wider, brighter band, and a glow rising from the element's bottom edge that stays put as the
stars slide, like the light over a horizon. The band is never a clean stripe (the owner,
the same day: "a little bit wider and more chaotic like the reference images"): its line
wanders, it swells and narrows along its length, its edges are torn, and it has knots of
brighter cloud, fine dark lanes and broad dark rifts, the rifts more to one side of its line
than on it. The glow is stored at twice its brightness and capped as a whole, so the
brightest heart keeps its colour rather than going grey or yellow. **The band has stars of
its own** (the owner: "maybe add star clusters inside the bands? Or just increase the number
and density of stars inside and around the band"): up to 14000 more places, one per 75
square CSS pixels, spread wider across the band than the field's own band stars, a quarter
of them in 36 tight clusters, each round on any shape of element. Each is drawn only where
the sky's texture says the band's stars are thick enough (its alpha: thickest in the heart
and the knots, thinner round the band, few in the lanes and rifts), so they follow the
band's wandering, torn shape; they sit at the farthest nearness, so they slide exactly with
it, and take on a little of its colour. Nearly all are faint dust. **Each sky lays the field** so its band crosses
the middle: the stars and the glow move together by `(1 - 0.37) / 2` of the element each way
(x + y from 0.37 to 1, through the centre), and deep blue and violet also mirror it across,
so their band runs from top left to bottom right as in their photographs; the colourful one
runs bottom left to top right, as in its. With no `sky` the field is laid as it always was.
- `deep-blue`: a royal blue night, deeper in patches, and a soft band of pale-blue cloud with
  dark lanes in it, paler where its clouds gather; a pale-blue horizon; and half as many
  stars again, as the photographs are thick with them.
- `violet`: a nebula down the band, after the owner's photograph of one (2026-10-20: the band
  before read as "grey/white clouds instead of the reference image", and they asked for it
  "much closer to the reference"): a broad column of cloud swirled and folded into filaments,
  gritty with stars too many to tell apart, fainter cloud across the rest of the sky, a bright
  heart where the band's knots gather, and the band's dark lanes. Its colour is where it is on
  the screen, as in the photograph: cyan at the top, through blue and purple, to magenta and
  pink at the bottom, over a magenta-pink horizon. The colours stay put as the sky slides.
- `colourful`: a dark teal night with a haze of rose and teal round the band; the band
  striking, glowing peach to cream from its heart outward, gritty, threaded with dark lanes;
  a violet horizon; and **dust**, streams of glittering dust in the colours of the owner's
  photograph of colourful dust (`STRAND_COLOURS`: teal, orange, magenta, blue, gold, violet,
  cyan, pink, green; the `strandColours` property, CSS colours taken in turn, replaces them).
  The ribbons before "are kind of looking like the tendrils, when in the reference image its
  much more random and swirled together" (the owner, 2026-10-20), and drawing them every
  frame made this sky the slow one. Now the streams radiate from one place and curve hard
  outward as they go, twisting round near it, each mostly one colour, broad feathers with
  dark sky between, clumps along them, a soft glow under them and glitter all through them.
  `strands="band"` sends them out of the band's middle to both sides, sliding with the sky as
  the band does; `strands="below"` (the attribute's default) up from one point just under the
  bottom edge, staying put on the screen. The hub offers both in its Settings, out of the band
  by default. Under this sky nearly half of all the stars take one of the dust's colours,
  anywhere in the sky, not only in the dust.

The glow is drawn once into a texture (`shaders/sky.frag.glsl`) whenever the sky, the theme's
accent or the element's shape changes, and the colourful sky's dust into a second
(`skydust.frag.glsl`, its colour baked in, so the colours given are part of what redraws it).
Each is 1024 texels along the element's longer side, in its proportions. For deep blue and
colourful the glow is colour, twice as bright as shown so its faint gradient keeps more of an
8-bit texture's steps; for violet it is the nebula's shape (how much cloud, its bright heart, a
nudge to its colour), which `skyquad.frag.glsl` colours by its place on the screen. Every frame
they are slid with the farthest stars (`skyquad.frag.glsl`, with the horizon's glow and a hair
of dither; the dust from below is not slid): they don't billow, as a real sky doesn't, and
cost a frame one or two texture reads a pixel, the colourful sky no more than the others. The
noise (`shaders/noise.glsl`: value noise and five-octave fbm, ridged noise for filaments, a
swirl that moves the field by noise of its own twice, and a texel-fine grit) repeats exactly
over the field (whole cells across and down, four on the shorter side at its broadest, and
the broad patches on half as many, still whole), so the slide never shows a seam; the dust
out of the band fades before the field's edges for the same reason. Setting `sky` or
`strands` draws a frame; `skyReady` says whether the last frame drew the sky asked for, and
`settings` add `sky` and `strands`. All of it lives in `sky.ts`; `SKY_KINDS`,
`STRAND_COLOURS` and the types are exported. The gallery's effects panel has a **sky** and a
**strands from** picker.

**A picture instead.** Noise drawn by hand reads as smoke beside a photograph, however it is
tuned (the owner, 2026-10-21: "every attempt has fallen short of capturing what the
references are showing"), so an app can give the sky as a picture: `sky-picture`, its
address, and `sky-picture-wide`, another for an element wider than it is tall (the first
serves both without it). It is drawn as it is, in place of the drawn sky and its horizon,
covering the element a fifth bigger than it so the app's `offset` can shift it (by a fifth
of the offset, as the farthest stars, kept inside that margin); the field's drift, a few
pixels a minute, leaves it be. The band's own stars go, as a picture has its own, and the
`sky` still says which sky it is: the colourful sky's stars still take the dust's colours.
A picture is loaded once and kept; until it has loaded, or if it fails to, the drawn sky
shows, and `skyReady` stays false, so a picture that never arrives is caught. The picture
costs a frame one texture read a pixel. labkit ships none: the app brings its own.

**Inside a planet** (the owner's polish list, 2026-10-18: "backgrounds inside of the
planets shouldn't be blank walls of the planet color"): `<labkit-planet-inside>` is the level
an app dives into, full-bleed, the planet orb's smoke seen from within. Two layers of noise
bent by noise, a near one and a dimmer far one, drifting so they billow; thin bright
filaments where the warped noise folds; the page's dark showing through where the smoke
thins; a little darker toward the edges. Now and then lightning flickers in the clouds
(slots of 1.4 loops, 55% holding a flash at a seeded moment and place, a quick double
flicker over 0.07 loops that lights the clouds round it). It holds still under `calm` and
`off`, with no lightning. Its colour is `--effect-tint` or the accent, and `rainbow` runs
every hue at once, as the rainbow planet does. It draws small, one texel per 3 CSS pixels
and at most 480 on its longer side, into a texture it scales up over its canvas
(`shaders/inside.frag.glsl`, `texquad.frag.glsl`): smoke is soft, so a phone pays for a
fraction of its pixels. Like the star dust it takes its size from the page: lay it over the
level, under its contents. The gallery's **inside a planet** box draws it over the effects
panel, in the tinted planet's colour (rainbow with the rainbow box).

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
everything else in labkit. An effect draws only while it is connected and on screen
(an `IntersectionObserver`) and gives its WebGL context back when it is not, because a
browser keeps only a handful alive: Chrome about 16 per renderer process, losing the
oldest past that, and a lost one paints as a white box. So a page draws one of two
ways (`src/effects/base.ts`):

- **own** (the default): each piece on screen has a context of its own. Fastest.
- **shared**: the pieces share ONE context. Each draws into a corner of a hidden canvas
  and shows that as a bitmap on its own canvas, keeping its place, transforms and fade.

A page starts own and switches to shared for good the first time the browser takes a
context away that the page didn't give back (two copies of the hub in one process did
that, 2026-10-17). `<html data-labkit-gl="shared">` starts it shared; the gallery's
`?gl=shared` sets that. `webglContexts()` and `webglShared()` say how a page is
drawing. Shared isn't the default because its copy was measured only where Chrome
composites in software, as the lab's checks do, and there it read the GPU back once per
piece: 9 frames a second instead of 60. On a phone, which composites on the GPU, it is
not measured yet.

It re-reads the theme and the level when an ancestor's `style` or `data-motion`
changes, and when the reduce-motion setting does. A resize clears the canvas, so it
draws a frame straight after, whether or not its loop runs, rather than leave the
canvas blank until the loop's next tick. It reports `running` (whether its loop runs),
`frames` (frames drawn) and `drawing` (whether it has a renderer now).

New pieces extend `LabkitEffect` (`src/effects/base.ts`): `create`, `update`, `draw`
and `destroy`; the base owns the renderer, the loop, the levels and the observers. A
piece sizes things by the base's `cssSize`, `drawingSize` and `pixelRatio`, never by
the renderer's own size, which in shared mode is the biggest piece's.

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
`--effect-tint` set to `#3cc6a0` (the **rainbow** box turns that one's `rainbow` on). One tendrils element lies behind them all, joining
the filament orb to both planet orbs: to the plain one in the accent, and to the
tinted one blending from the accent to its tint. The plain one shows `grow`: whenever
the panel shows the tendrils (on load, once the panel is on screen, on a theme change,
and on picking tendrils or dials) it grows in from 0 to 1 over two loops of the theme's
pace, on its ease-out, then stays reached; under `calm` and `off`, and with reduce
motion, both are drawn fully grown at once. The gallery sets their ends from where the
pieces sit, only when the panel resizes. Under everything, the star dust
fills the panel at no offset.

Beside the theme picker, an **arrangement** picker chooses how the planet orbs relate to
the filament orb: `tendrils`, as above, `orbit paths`, or `dials`. Under dials the
filament orb sits in a `<labkit-dials>` in place of the orbit rings (only one of the two
is in the panel), and the planet orbs are joined by the tendrils, as above. Under orbit paths the
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
step each: 59 steps. The tendril growing in (#62) turned the 0.7 s wait before the
Cold core shot into a wait of up to 25 s for the plain tendril to reach its orb (two
loops of Cold core's pace is 17.4 s), and added no step: its checks ride existing ones.

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
Cold core their loop runs, the panel holds two tendrils (the plain one still growing
in, its `grow` below 1, the tinted one at 1), and the element fills the panel on a
transparent canvas; the scene then waits for the plain one to reach its orb (`grow` 1,
read as `planet:1,tinted:1` and checked with the orbit paths' placing) before the
shot (#62). Under `calm` and `off`, the settle's first step picks the tendrils and reads
`planet:1,tinted:1` at once, then picks the orbit paths back; with reduce motion the
still frame reads the same. In Film page they read its
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
