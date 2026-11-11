# The render check and the preview

The working notes for `preview.json` and `render.json`, moved here from the README
unchanged.

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
