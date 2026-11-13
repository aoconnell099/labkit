# The library's look

Which of the three comps (#83) the library site is built from, and what that build must
hold. The site itself is the next ticket (#84); this is its brief. The comps are in
`gallery/comps/`, their code in `gallery/src/comps/`.

## The pick: Workbench

Picked by the owner on 2026-11-13, over Specimen book and Shop window, which stay in
`gallery/comps/` marked "not picked" for comparison and are not to be built.

Why it holds up:

- **The frame stays readable in any theme.** The side panel, the tile frames and the
  inspector are the library's own neutral greys, in light or dark; only the canvas wears
  the picked theme. A loud theme cannot make the library hard to use.
- **A piece's page shows every state at once,** which is what a review judges a piece by.
- **The index and its search scale.** They suit a library of many more pieces than
  today's 22.

## What the build holds

Workbench as the comp draws it, with these, all already in the comp:

1. **Paint cards for themes.** Each card is the theme's ground with a band of its
   accent, its name, and light or dark. On a wide screen they sit two to a row in the
   side panel; on a phone they are one strip that scrolls sideways.
2. **A piece's page on a phone** runs top to bottom: the stage, the states grid, then the
   knobs, the markup and the theme's values, each folded. A wide screen keeps the stage
   and the inspector side by side with the states below.
3. **The controls fold on a phone.** The line above the canvas (theme, light or dark,
   motion level) is a button: it opens the paint cards, the motion level and the chrome's
   light or dark. Folded, the phone shows the index chips and the canvas. A new screen
   opens folded. A wide screen keeps the side panel.
4. **All themes,** a toggle in the stage's bar, shows the piece in all 13 themes at
   once, each tile labelled with its theme and its mode, the dark themes then the light.
   Components and classes are live in every tile. An effect is live in one tile at a
   time (the picked theme's to start; Play here moves it), so a phone never holds more
   than a handful of WebGL pieces. The render check holds it to at most 8 contexts.
5. **A sample screen,** linked from the home's top and the index, puts the pieces
   together as one small app page in the picked theme: a header with tabs (a stand-in),
   a Section with StatRows and a Meter, a table, a Field, the three button weights, a
   notice and a toast (a stand-in). It answers what an app would look like in a theme.

The screens are by hash, as in the comp: `#/` the home, `#/piece/<id>` a piece's page,
`#/sample` the sample screen.

## Not decided here

- Where the site lives in the built gallery, and whether the test bench moves.
- Pieces not built yet (Tabs, Toast) stay stand-ins until they are their own tickets.
