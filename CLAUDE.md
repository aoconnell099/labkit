# CLAUDE.md — labkit

The lab's shared design substrate: tokens, primitives, themes, the effects shelf and
a gallery. Rules and a map only; history goes in commits and PRs.

## ⚠️ This repo is public

Apps' Docker builds fetch it without a key, so everything in it, files and issues
alike, is world-readable. Put nothing in either of:

- hostnames, IPs, ports, or any other private detail of the box or the apps;
- artist names, or links to the references a look was drawn from.

Say "the box" or "an app". Private write-ups live in the private homelab repo.

## The four rules (README has the reasons)

1. **Colour is computed, not chosen.** Every default passed the validator; re-run it
   before changing a value, and read the value back out of the file.
2. **Two status hues by default; a third only where it measures.**
3. **Tone names belong to no domain:** `--tone-pos` / `--tone-neg`, never `--money-in`.
4. **All seven interaction states:** rest, hover, focus-visible, active, disabled,
   loading, empty. The focus ring is never removed.

## The library's model (agreed with the owner, 2026-11-10)

- **Pieces read only the knobs.** A piece takes its look from tokens and its own
  attributes, never from a theme's name or a hard-coded value.
- **Themes set the knobs.** A theme is a set of values for the knobs, nothing else.
- **Every piece is shown in every theme in the gallery**, in all seven interaction
  states and under all three motion levels (`full`, `calm`, `off`, set by
  `data-motion`). A piece not in the gallery is not finished.

## Rules for code

- **three.js loads only in `labkit/effects`.** `labkit` never imports it, so an app
  that draws no 3D never loads it. It is an optional peer dependency.
- **Apps pin labkit by lockfile.** A git dependency has no version range: the
  lockfile names a commit, and a change here reaches an app only when someone
  re-runs the install there (`npm install labkit@github:aoconnell099/labkit`) and
  commits the lock.
- **The gallery imports the real components**, never copies.

## The render check

`render.json` is the play script. Its limits are the tool's: **10 scenes, 60 steps a
scene, 240 s of waits in all**. A new piece adds steps to existing scenes, not a scene.
The working notes (what each scene does, the gallery's helpers, the timing budget)
are in `docs/render-check.md`.

## Checks

```bash
python -m unittest discover tests     # the README check's own tests
python scripts/check_readme.py        # README at most 300 lines; nothing from main's README lost
```

The README stays a short guide for apps: Use, the four rules, What is in it, Themes,
Chosen themes, the effects table, Gallery, Licence. Working notes go in `docs/`, not
back into it. `preview.json` builds the gallery for review; the build's type checks
(`npm run check`, at the root and in `gallery/`) are the type checks.

## Map

| Path | What is there |
|---|---|
| `src/tokens.css` | spacing, motion levels, surfaces, focus rings, tables, form controls, buttons, the rail |
| `src/components/` | the Svelte primitives: `Section`, `StatRow`, `Rail`, `Meter`, `Field` |
| `src/palette.ts`, `src/contrast.ts` | the palette shape and default, `applyPalette`, the contrast audit |
| `src/themes.ts`, `src/themes/` | the `Theme` type, `applyTheme`, `auditTheme`, and the chosen themes, one file each |
| `src/mode.ts` | the persisted light/dark choice |
| `src/effects/` | the `labkit/effects` entry: one file per element, shared `base.ts`, `drift.ts`, `bloom.ts`, `pace.ts`, and the GLSL in `shaders/` |
| `gallery/` | the Svelte app that shows every piece in every theme and state; `gallery/src/palettes.ts` lists the themes it shows |
| `gallery/comps/`, `gallery/src/comps/` | three looks for a library site, one page each, sharing one list of pieces (`catalog.ts`); not the site |
| `docs/` | working notes and research (below) |
| `scripts/`, `tests/` | the README check and its tests |
| `render.json`, `preview.json` | the render check's play script; how the desktop worker builds the gallery for review |

## Docs that describe this code

| Doc | Describes |
|---|---|
| `README.md` | what labkit offers apps: use, the rules, the parts, themes, the effects table |
| `docs/effects.md` | each effect's build, drift, bloom and pace rules, and every knob in full |
| `docs/render-check.md` | `preview.json`, `render.json`, the scenes, the gallery helpers and the timing budget |
| `docs/research/` | the research set behind the tokens: colour, type and spacing, motion, behaviour, tables, charts |
