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

2. **Two status hues, never three.** Three status hues at text contrast on a
   light ground has *zero* solutions: green, clay and amber collide in lightness,
   and green-vs-red is the deuteranopia pair. The third state carries **form** —
   a segmented tick, a dashed fill, a weight change. Two of the three source apps
   discovered this separately. Do not go looking for an amber.

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
| `tokens.css` | spacing, motion, focus rings, table paint, form controls, buttons, the rail |
| `Section` | a titled region with a hairline, optional meta and method footer |
| `StatRow` | label / figure / caveat, with a `big` hero mode |
| `Rail` | a tick, a short code, a qualifier |
| `Meter` | a progress mark — takes a **tone**, never a value-to-colour rule |
| `Field` | a labelled control with its hint and an announced error |
| `palette.ts` | the palette shape, a validated default, and `applyPalette` |
| `theme.ts` | an explicit light/dark choice, persisted |

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
