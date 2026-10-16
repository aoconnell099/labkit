<script lang="ts">
  /** The gallery: every primitive, every state, three palettes, both modes.
   *
   *  ⚠️ SIDE BY SIDE RATHER THAN A SWITCHER, deliberately. A palette picker
   *  shows one at a time and you compare from memory — which is exactly how
   *  drift survives. The whole reason this page exists is that a difference
   *  between two palettes is invisible sequentially and obvious in parallel.
   */
  import { flushSync } from 'svelte';
  import Frame from './Frame.svelte';
  import { EXAMPLES, THEMES, CHOSEN } from './palettes';
  import { auditPalette, auditTheme, applyTheme, shippedModes, type Mode, type MotionLevel,
           type ContrastCheck } from 'labkit';
  // The effects shelf: its own entry, so this import is what loads three.js.
  import 'labkit/effects';
  import { orbitLap, orbitPlace, type LabkitEffect, type Orbit, type Orbits, type Tendrils } from 'labkit/effects';

  let showBoth = $state(false);
  let narrow = $state(false);
  let level = $state<MotionLevel>('full');
  const LEVELS: MotionLevel[] = ['full', 'calm', 'off'];

  /** The effects panel shows ONE theme at a time, unlike the frames: each
   *  piece holds a WebGL context while on screen, and a browser keeps only a
   *  handful alive. Reading a theme needs no canvas (labkitEffectRead), so the
   *  render check still covers all of them. The planet orb is shown twice: in
   *  the theme's accent, and in a tint of its own, as an app would set it. The
   *  orbit rings frame the filament orb, as an app would place them, and one
   *  tendrils element behind them all joins it to both planet orbs, with the
   *  star dust behind everything. The arrangement picker chooses how the
   *  planet orbs relate to the filament orb: joined by the tendrils, or riding
   *  two orbit paths round it. Both elements stay in the panel, and the one not
   *  picked draws nothing. Under dials the filament orb sits in the flat dials
   *  instead of the orbit rings (only one of the two is in the panel), with the
   *  planet orbs joined by the tendrils, as under tendrils. */
  const PIECES = { filament: 'labkit-filament-orb', planet: 'labkit-planet-orb',
                   tinted: 'labkit-planet-orb', rings: 'labkit-orbit-rings',
                   tendrils: 'labkit-tendrils', stars: 'labkit-star-dust',
                   orbits: 'labkit-orbits', dials: 'labkit-dials' } as const;
  const TINT = '#3cc6a0';
  type Piece = keyof typeof PIECES;
  const ARRANGEMENTS = { tendrils: 'tendrils', orbits: 'orbit paths', dials: 'dials' } as const;
  type Arrangement = keyof typeof ARRANGEMENTS;
  /** The two paths: the plain planet orb on the inner one, in the accent, and
   *  the tinted one on the outer, in its tint. */
  const ORBITS: Orbit[] = [{ id: 'inner', radius: 0.55, items: 1 },
                           { id: 'outer', radius: 0.8, color: TINT, items: 1 }];
  const RIDERS = [['planet', 0], ['tinted', 1]] as const;
  let effectTheme = $state(CHOSEN[0].theme.name);
  let arrangement = $state<Arrangement>('tendrils');
  let effectPanel = $state<HTMLDivElement>();
  let tendrilsEl = $state<Tendrils>();
  let orbitsEl = $state<Orbits>();
  $effect(() => {
    const t = CHOSEN.find((c) => c.theme.name === effectTheme)!;
    if (effectPanel) applyTheme(t.theme, t.primary, level, effectPanel);
  });

  /** The tendrils' ends, from where the pieces sit in the panel: from the
   *  filament orb's rim to each planet orb's, the plain one half grown and in
   *  the accent, the tinted one blending from the accent to its tint. Only on a
   *  resize, as an app would, so under calm and off they stay still. */
  function joinOrbs() {
    if (!effectPanel || !tendrilsEl) return;
    if (arrangement === 'orbits') {
      tendrilsEl.tendrils = [];
      return;
    }
    const box = effectPanel.getBoundingClientRect();
    const at = (piece: Piece) => {
      const r = effectPanel!.querySelector(`[data-piece="${piece}"]`)!.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left - effectPanel!.clientLeft,
               y: r.top + r.height / 2 - box.top - effectPanel!.clientTop, r: r.width / 2 };
    };
    const orb = at('filament');
    const toward = (a: { x: number; y: number; r: number }, b: { x: number; y: number },
                    share: number): [number, number] => {
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return [a.x + ((b.x - a.x) / d) * a.r * share, a.y + ((b.y - a.y) / d) * a.r * share];
    };
    tendrilsEl.tendrils = (['planet', 'tinted'] as const).map((piece) => {
      const p = at(piece);
      return { id: piece, from: toward(orb, p, 0.55), to: toward(p, orb, 0.6),
               toColor: piece === 'tinted' ? TINT : undefined, grow: piece === 'planet' ? 0.5 : 1 };
    });
  }
  $effect(() => {
    if (!effectPanel) return;
    const ro = new ResizeObserver(joinOrbs);
    ro.observe(effectPanel);
    return () => ro.disconnect();
  });

  /** Where a planet orb's figure goes on its path, in pixels inside the orbit
   *  element's box (the planets share it), from orbitPlace at the element's
   *  own loops: the one function the element draws with. */
  function riderAt(path: number) {
    const w = orbitsEl!.clientWidth, h = Math.max(1, orbitsEl!.clientHeight);
    const p = orbitPlace(ORBITS[path], 0, orbitsEl!.loops, w / h);
    return { x: p.x * w, y: p.y * h, scale: p.scale, behind: p.behind };
  }

  /** The arrangement: the paths drawn or not, the tendrils joined or emptied,
   *  and under orbit paths the gallery's own animation frame moving the planet
   *  orbs' figures, in front of the filament orb on the near half and behind it
   *  on the far half. Under calm and off the element's loops hold, so they do. */
  $effect(() => {
    if (!effectPanel || !orbitsEl) return;
    const orbiting = arrangement === 'orbits';
    orbitsEl.orbits = orbiting ? ORBITS : [];
    joinOrbs();
    if (!orbiting) return;
    const figs = RIDERS.map(([piece, path]) =>
      [effectPanel!.querySelector<HTMLElement>(`[data-piece="${piece}"]`)!.closest('figure')!, path] as const);
    let raf = requestAnimationFrame(function place() {
      for (const [fig, path] of figs) {
        const p = riderAt(path);
        fig.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${p.scale})`;
        fig.style.zIndex = p.behind ? '1' : '3';
      }
      raf = requestAnimationFrame(place);
    });
    return () => {
      cancelAnimationFrame(raf);
      for (const [fig] of figs) fig.style.transform = fig.style.zIndex = '';
    };
  });

  /** The modes a theme frame is shown in. ⚠️ Only modes the theme ships:
   *  "show both modes" adds the other one only if it exists, so a dark-only
   *  theme is never offered a light ground it was not designed for. */
  function themeModes(primary: Mode, shipped: Mode[]): Mode[] {
    return showBoth ? [primary, ...shipped.filter((m) => m !== primary)] : [primary];
  }

  /** For the render check (render.json): each shown theme's contrast failures,
   *  per mode it ships. A mode it does not ship has no key at all. */
  (window as unknown as { labkitAudit: () => unknown }).labkitAudit = () =>
    Object.fromEntries(THEMES.map(({ theme }) => {
      const failures = auditTheme(theme).failures;
      const perMode: Partial<Record<Mode, ContrastCheck[]>> = {};
      for (const m of shippedModes(theme)) perMode[m] = failures.filter((f) => f.mode === m);
      return [theme.name, perMode];
    }));

  /** More for the render check, so a theme's steps there stay one short line:
   *  render.json caps a step at 500 characters and a scene at 60 steps, and
   *  every chosen theme adds its steps to the same three scenes. */
  const frame = (name: string, mode?: Mode) => document.querySelector<HTMLElement>(
    `.frame[data-theme="${name}"]${mode ? `[data-mode="${mode}"]` : ''}`)!;
  Object.assign(window, {
    /** The modes a theme is shown in, in page order: "dark", or "light,dark". */
    labkitModesShown: (name: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(`.frame[data-theme="${name}"]`))
        .map((f) => f.dataset.mode).join(),
    /** Every audited token and its ratio, as the theme's Contrast table measures it. */
    labkitRatios: (name: string, mode: Mode) =>
      auditTheme(THEMES.find((t) => t.theme.name === name)!.theme).checks
        .filter((c) => c.mode === mode)
        .map((c) => `${c.token}${c.on === 'accent' ? ' on accent' : ''} ${c.ratio}`).join(', '),
    /** The audit's failures for a COPY of a theme with one mode's label replaced.
     *  Never shown and never shipped: it is how the render check proves a label
     *  that fails is caught. "Banked ember", "dark", "#ffffff" -> its failures. */
    labkitAuditLabel: (name: string, mode: Mode, onAccent: string) => {
      const theme = THEMES.find((t) => t.theme.name === name)!.theme;
      const copy = { ...theme, modes: { ...theme.modes, [mode]: { ...theme.modes[mode]!, onAccent } } };
      return auditTheme(copy).failures
        .map((f) => `${f.mode} ${f.token} on ${f.on} ${f.ratio}:1 (needs ${f.required})`).join(', ');
    },
    /** A motion token, read off a real button in the theme's frame. */
    labkitToken: (name: string, token: string) =>
      getComputedStyle(frame(name).querySelector('.btn')!).getPropertyValue(token).trim(),
    /** The frame's entrance, paused at its first frame: its transform there. */
    labkitEnterStart: (name: string) => {
      const el = frame(name).querySelector<HTMLElement>('.enter')!;
      const a = el.getAnimations().find((x) => (x as CSSAnimation).animationName === 'labkit-enter')!;
      a.pause();
      a.currentTime = 0;
      return getComputedStyle(el).transform;
    },
    labkitShow: (name: string) => (frame(name).scrollIntoView(), true),
    /** The themes the effects panel offers, in picker order. */
    labkitThemes: () => CHOSEN.map((t) => t.theme.name),
    /** What a piece takes from a theme, with no canvas: a probe of the piece is
     *  put in the theme's frame, read, and taken out in the same task, before
     *  it could ever come on screen and make a renderer. */
    labkitEffectRead: (name: string, piece: Piece) => {
      const probe = document.createElement(PIECES[piece]);
      if (piece === 'tinted') probe.style.setProperty('--effect-tint', TINT);
      // One tendril with its start colour unset and its end in the tint.
      if (piece === 'tendrils') {
        (probe as Tendrils).tendrils = [{ id: 'probe', from: [0, 0], to: [100, 100], toColor: TINT }];
      }
      // The gallery's two paths: the inner one's colour unset, the outer's the tint.
      if (piece === 'orbits') (probe as Orbits).orbits = ORBITS;
      frame(name).append(probe);
      try {
        return probe.settings;
      } finally {
        probe.remove();
      }
    },
    /** Show the effects panel in a theme, and scroll to it. */
    labkitEffectPick: (name: string) => {
      effectTheme = name;
      flushSync();
      document.getElementById('effects')!.scrollIntoView();
      return true;
    },
    /** The panel's live piece: whether its loop runs, and the frames it drew.
     *  For the orbit paths, also `placed`: whether each planet orb's centre is
     *  within a pixel of where orbitPlace puts it at the element's loops. */
    labkitEffectState: (piece: Piece) => {
      const el = effectPanel!.querySelector<LabkitEffect>(`[data-piece="${piece}"]`)!;
      if (piece !== 'orbits') return { running: el.running, frames: el.frames };
      const box = el.getBoundingClientRect();
      const placed = RIDERS.every(([rider, path]) => {
        const r = effectPanel!.querySelector(`[data-piece="${rider}"]`)!.getBoundingClientRect();
        const p = riderAt(path);
        return Math.hypot(r.left + r.width / 2 - box.left - p.x, r.top + r.height / 2 - box.top - p.y) < 1;
      });
      return { running: el.running, frames: el.frames, placed };
    },
    /** The orbit paths' pure functions, as labkit/effects exports them, so the
     *  render check can test them with no element. */
    labkitOrbits: { place: orbitPlace, lap: orbitLap },
    /** Pick how the planet orbs relate to the filament orb: 'tendrils', 'orbits'
     *  or 'dials' (the filament orb in the dials, the planets as with tendrils). */
    labkitArrangement: (name: Arrangement) => {
      arrangement = name;
      flushSync();
      return true;
    },
  });

  // ⚠️ Surfaced at the top, not buried in a frame. If any shipped example fails
  // its own contrast bar, that is the first thing a reader should learn.
  /** ⚠️ Two identical examples demonstrate nothing, and the page still looks
   *  busy and correct — which is exactly how the first version shipped with two
   *  frames sharing every single value. Say so on screen rather than trusting
   *  anyone to spot two identical columns. */
  const duplicates = $derived(
    EXAMPLES.flatMap((a, i) =>
      EXAMPLES.slice(i + 1)
        .filter((b) => JSON.stringify(a.palette) === JSON.stringify(b.palette))
        .map((b) => `${a.name} = ${b.name}`)
    )
  );

  const failures = $derived([
    ...EXAMPLES.flatMap((e) =>
      auditPalette(e.palette).failures.map((f) => `${e.name} ${f.mode} ${f.token} ${f.ratio}:1`)
    ),
    ...THEMES.flatMap(({ theme }) =>
      auditTheme(theme).failures.map((f) => `${theme.name} theme ${f.mode} ${f.token} ${f.ratio}:1`)
    ),
  ]);
</script>

<div class="page">
  <header>
    <h1>labkit</h1>
    <p>
      Every primitive, in every state, in three palettes. Extracted from three
      apps that were built independently — nothing here was designed up front.
    </p>

    <div class="controls">
      <label><input type="checkbox" id="show-both" bind:checked={showBoth} /> show both modes</label>
      <label>
        <input type="checkbox" bind:checked={narrow} />
        <!-- ⚠️ Squeezing a container does NOT fire viewport media queries, so
             this proves less than a phone does. It catches overflow, which is
             the failure it is here for. Check a real device before believing it. -->
        390px column (catches overflow, not media queries)
      </label>
    </div>

    {#if duplicates.length}
      <p class="alarm">
        Identical example palettes: {duplicates.join(' · ')} — one of them is
        demonstrating nothing.
      </p>
    {/if}

    {#if failures.length}
      <p class="alarm">
        {failures.length} contrast failure(s) in the shipped examples: {failures.join(' · ')}
      </p>
    {:else}
      <p class="ok">Every shipped example clears its own contrast bar.</p>
    {/if}
  </header>

  <div class="grid" class:narrow>
    {#each EXAMPLES as ex (ex.name)}
      <Frame name={ex.name} character={ex.character} palette={ex.palette} mode={ex.primary} />
      {#if showBoth}
        <Frame name={ex.name} character={ex.character} palette={ex.palette}
               mode={ex.primary === 'dark' ? 'light' : 'dark'} />
      {/if}
    {/each}
  </div>

  <section class="themes">
    <h2>Themes</h2>
    <p>
      A theme is a palette for each mode it ships, plus type, surfaces and
      motion. It may ship one mode only, and then the gallery shows only that one.
      Cool dark is the example; the rest are the chosen themes labkit ships.
    </p>
    <fieldset class="controls">
      <legend>motion</legend>
      {#each LEVELS as l (l)}
        <label><input type="radio" name="motion" id={`motion-${l}`} value={l} bind:group={level} /> {l}</label>
      {/each}
    </fieldset>

    <div class="effects" id="effects">
      <h3>Effects</h3>
      <p>
        The effects shelf, imported on its own from <code>labkit/effects</code>.
        Each piece reads its colour, glow and pace from the theme around it, in
        one theme at a time. The motion picker above applies: under calm and off
        it draws one still frame and stops.
      </p>
      <div class="controls">
        <label>
          theme
          <select id="effect-theme" bind:value={effectTheme}>
            {#each CHOSEN as t (t.theme.name)}
              <option value={t.theme.name}>{t.theme.name}</option>
            {/each}
          </select>
        </label>
        <label>
          arrangement
          <select id="effect-arrangement" bind:value={arrangement}>
            {#each Object.entries(ARRANGEMENTS) as [value, label] (value)}
              <option {value}>{label}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="effect-panel" class:orbiting={arrangement === 'orbits'} bind:this={effectPanel}
           data-effect-theme={effectTheme} data-arrangement={arrangement}>
        <labkit-star-dust data-piece="stars"></labkit-star-dust>
        <labkit-tendrils data-piece="tendrils" bind:this={tendrilsEl}></labkit-tendrils>
        <labkit-orbits data-piece="orbits" bind:this={orbitsEl}></labkit-orbits>
        {#if arrangement === 'dials'}
          <labkit-dials data-piece="dials">
            <labkit-filament-orb data-piece="filament"></labkit-filament-orb>
          </labkit-dials>
        {:else}
          <labkit-orbit-rings data-piece="rings">
            <labkit-filament-orb data-piece="filament"></labkit-filament-orb>
          </labkit-orbit-rings>
        {/if}
        <span class="lbl">filament orb in {arrangement === 'dials' ? 'dials' : 'orbit rings'} &middot; {effectTheme} &middot; motion {level} &middot; {ARRANGEMENTS[arrangement]}</span>
        <div class="planets">
          <figure>
            <labkit-planet-orb data-piece="planet"></labkit-planet-orb>
            <figcaption class="lbl">planet orb &middot; accent</figcaption>
          </figure>
          <figure>
            <labkit-planet-orb data-piece="tinted" style:--effect-tint={TINT}></labkit-planet-orb>
            <figcaption class="lbl">planet orb &middot; tint {TINT}</figcaption>
          </figure>
        </div>
      </div>
    </div>

    <div class="grid" class:narrow>
      {#each THEMES as t (t.theme.name)}
        {#each themeModes(t.primary, shippedModes(t.theme)) as m (m)}
          <Frame name={t.theme.name} character={t.theme.character} theme={t.theme}
                 mode={m} {level} />
        {/each}
      {/each}
    </div>
  </section>
</div>

<style>
  /* Neutral chrome from prefers-color-scheme. The gallery must not have a
     palette of its own — see index.html. */
  .page {
    font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
    padding: 24px;
    max-width: 1600px;
    margin: 0 auto;
  }
  h1 { font-size: 1.4rem; margin: 0 0 6px; font-weight: 600; }
  header p { margin: 0 0 10px; opacity: .75; max-width: 62ch; }
  .controls { display: flex; gap: 18px; flex-wrap: wrap; margin: 14px 0; font-size: .85rem; }
  .controls label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .alarm, .ok { font-size: .82rem; padding: 8px 12px; border-radius: 6px; border: 1px solid #8886; }
  .alarm { border-color: #c0392b; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 20px;
    margin-top: 20px;
    align-items: start;
  }
  /* ⚠️ min-width: 0 on the ITEMS, not just the container. Grid children default
     to min-width:auto and will otherwise force a column wider than the page. */
  .grid > :global(*) { min-width: 0; }
  .grid.narrow { grid-template-columns: repeat(auto-fit, 390px); }
  .themes { margin-top: 36px; }
  h2 { font-size: 1.1rem; margin: 0 0 6px; font-weight: 600; }
  .themes p { margin: 0 0 10px; opacity: .75; max-width: 62ch; }
  fieldset.controls { border: 1px solid #8886; border-radius: 6px; padding: 6px 12px 8px; }
  h3 { font-size: 1rem; margin: 24px 0 6px; font-weight: 600; }
  /* Layout only, as in Frame: every colour comes from the theme stamped here. */
  .effect-panel {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 16px;
    border: 1px solid #8884;
    border-radius: 10px;
    background: var(--surface);
    position: relative;
  }
  /* Behind the pieces: first in the panel, the star dust under the tendrils
     and the orbit paths, and everything after them positioned, captions too,
     so it all paints over them. */
  .effect-panel labkit-star-dust, .effect-panel labkit-tendrils,
  .effect-panel labkit-orbits { position: absolute; inset: 0; }
  .effect-panel > :not(labkit-star-dust, labkit-tendrils, labkit-orbits) { position: relative; }
  .effect-panel labkit-orbit-rings, .effect-panel labkit-dials { width: min(100%, 400px); }
  .planets { display: flex; gap: 16px; justify-content: center; width: 100%; }
  .planets figure { margin: 0; display: grid; justify-items: center; gap: 6px; flex: 0 1 150px; }
  .planets labkit-planet-orb { width: 100%; }
  /* Orbit paths: the filament orb alone in the flow, so it sits in the middle
     of the panel where the paths are centred; the planet orbs ride over the
     same box as the paths, placed by the script, in front of the rings (3) or
     behind them (1). */
  .effect-panel.orbiting { padding-block: 56px; }
  .effect-panel.orbiting labkit-orbit-rings { width: min(50%, 300px); z-index: 2; }
  .effect-panel.orbiting > .lbl { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center; }
  .effect-panel.orbiting .planets { position: absolute; inset: 0; display: block; }
  .effect-panel.orbiting .planets figure {
    position: absolute; left: 0; top: 0; width: clamp(56px, 11vw, 96px);
  }
  .effect-panel.orbiting .planets figcaption { display: none; }
</style>
