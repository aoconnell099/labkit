<script lang="ts">
  /** The gallery: every primitive, every state, three palettes, both modes.
   *
   *  ⚠️ SIDE BY SIDE RATHER THAN A SWITCHER, deliberately. A palette picker
   *  shows one at a time and you compare from memory — which is exactly how
   *  drift survives. The whole reason this page exists is that a difference
   *  between two palettes is invisible sequentially and obvious in parallel.
   */
  import Frame from './Frame.svelte';
  import { EXAMPLES, THEMES } from './palettes';
  import { auditPalette, auditTheme, shippedModes, type Mode, type MotionLevel,
           type ContrastCheck } from 'labkit';

  let showBoth = $state(false);
  let narrow = $state(false);
  let level = $state<MotionLevel>('full');
  const LEVELS: MotionLevel[] = ['full', 'calm', 'off'];

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
        .filter((c) => c.mode === mode).map((c) => `${c.token} ${c.ratio}`).join(', '),
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
</style>
