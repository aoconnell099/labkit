<script lang="ts">
  /** The current theme's knob values, read out of the theme itself. */
  import type { Theme } from 'labkit';
  import { themeKnobs } from './catalog';

  let { theme }: { theme: Theme } = $props();
  const groups = $derived(themeKnobs(theme));
</script>

<dl class="values" data-theme-values={theme.name}>
  {#each groups as g (g.group)}
    <dt class="lbl">{g.group}</dt>
    {#each g.rows as r (r.name)}
      <dd>
        {#if r.swatch}<span class="chip" style:background={r.value}></span>{/if}
        <span class="name">{r.name}</span>
        <span class="mono">{r.value}</span>
      </dd>
    {/each}
  {/each}
</dl>

<style>
  .values { margin: 0; display: grid; gap: 4px; font-size: .76rem; }
  dt { margin-top: 10px; }
  dt:first-child { margin-top: 0; }
  dd { margin: 0; display: grid; grid-template-columns: 14px 1fr auto; align-items: center; gap: 8px; }
  .name { color: var(--text-dim); grid-column: 2; }
  .mono { color: var(--text); font-size: .72rem; overflow: hidden; text-overflow: ellipsis; max-width: 14ch; }
  /* A ring, so a chip the colour of the ground still shows. */
  .chip { width: 14px; height: 14px; border-radius: 3px; box-shadow: 0 0 0 1px var(--line); }
</style>
