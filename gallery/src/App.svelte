<script lang="ts">
  /** The gallery: every primitive, every state, three palettes, both modes.
   *
   *  ⚠️ SIDE BY SIDE RATHER THAN A SWITCHER, deliberately. A palette picker
   *  shows one at a time and you compare from memory — which is exactly how
   *  drift survives. The whole reason this page exists is that a difference
   *  between two palettes is invisible sequentially and obvious in parallel.
   */
  import Frame from './Frame.svelte';
  import { EXAMPLES } from './palettes';
  import { auditPalette } from 'labkit';

  let showBoth = $state(false);
  let narrow = $state(false);

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

  const failures = $derived(
    EXAMPLES.flatMap((e) =>
      auditPalette(e.palette).failures.map((f) => `${e.name} ${f.mode} ${f.token} ${f.ratio}:1`)
    )
  );
</script>

<div class="page">
  <header>
    <h1>labkit</h1>
    <p>
      Every primitive, in every state, in three palettes. Extracted from three
      apps that were built independently — nothing here was designed up front.
    </p>

    <div class="controls">
      <label><input type="checkbox" bind:checked={showBoth} /> show both modes</label>
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
</style>
