# The effects shelf

The per-piece working notes for `labkit/effects`, moved here from the README
unchanged. The README keeps the table of pieces and the knobs each reads.

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
- `violet`: clouds of colour across the whole sky, cyan to one side and magenta to the other,
  violet between, broad and soft with brighter wisps in them; and through the middle a band
  that is a blue haze, violet toward its edges, with a bright, nearly white-blue heart where
  its clouds gather, cut by fine dark lanes. Toward the bottom the sky's own light turns violet
  then pink, over a magenta-pink horizon.
- `colourful`: a dark night with a haze of teal round the band, never on its heart; the band
  warm peach, pinker in places, brightest where its clouds gather and cut deep by dark brown
  lanes; a violet horizon; and eleven **strands**, plumes of glittering dust in the colours
  of the owner's photograph of colourful dust (`STRAND_COLOURS`: teal, orange, magenta, blue,
  gold, violet, cyan, pink, green; the `strandColours` property, CSS colours taken in turn,
  replaces them). The strands before were thin straight lines that "look like concert
  lights". Each widens as it goes and curls, fibrous along its length and gathering in
  clumps, with two brighter wisps in it and grains of light caught in it that twinkle, its
  colour turning toward the next strand's along it, and it sways slowly.
  `strands="band"` fans them out of the band's middle to both sides, as the photograph's fan
  out of its horizon: each starts on the band near its middle, heads out across it at its own
  angle, and curls further from straight out (drawn 1.05 times as strong, `BAND_STRENGTH`).
  `strands="below"` (the attribute's default) fans them up like a fountain from one point just
  under the bottom edge instead, each curling further out the further out it starts. The hub
  offers both in its Settings, out of the band by default. They stay wide and dusty, so they
  never read as vines.

The glow is drawn once into a 512-texel square (`shaders/sky.frag.glsl`) whenever the sky, the
theme's accent or the element's shape changes, twice as bright as shown so its faint
gradient keeps more of an 8-bit texture's steps, then slid with the farthest stars every frame
(`skyquad.frag.glsl`, half of it, the horizon's glow and a hair of dither): it doesn't billow, as a real
sky doesn't, and costs a frame one texture read a pixel. Its noise lattice repeats exactly over
the field (whole cells across and down, four on the shorter side at its broadest, and the broad
patches on half as many, still whole), so the slide never shows a seam. The strands are laid
out in CSS pixels every frame (about 3,200 vertices) and drawn by `skystrand.*.glsl`: a
plume's fibres and grains are noise in the strand's own pixels, along and across it, so they
hold to it as it sways. Setting `sky` or `strands` draws a frame;
`skyReady` says whether the last frame drew the sky asked for, and `settings` add `sky` and
`strands`. All of it lives in `sky.ts`; `SKY_KINDS`, `STRAND_COLOURS` and the types are
exported. The gallery's effects panel has a **sky** and a **strands from** picker.

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
