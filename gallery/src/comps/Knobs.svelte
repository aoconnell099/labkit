<script lang="ts">
  /** A piece's own knobs as controls, setting its values. Drawn with labkit's
   *  `.ctl`, so they wear the theme they sit in. */
  import type { KnobValues, Piece } from './catalog';

  let { p, k = $bindable() }: { p: Piece; k: KnobValues } = $props();

  const set = (key: string, v: string | number | boolean) => (k = { ...k, [key]: v });
</script>

{#if p.knobs.length === 0}
  <p class="none">No knobs: it takes everything from the theme.</p>
{:else}
  <div class="knobs">
    {#each p.knobs as knob (knob.key)}
      <label class="knob">
        <span class="lbl">{knob.label}</span>
        {#if knob.kind === 'text'}
          <input class="ctl" type="text" value={String(k[knob.key] ?? '')} placeholder="unset"
                 oninput={(e) => set(knob.key, e.currentTarget.value)} />
        {:else if knob.kind === 'range'}
          <span class="range">
            <input type="range" min={knob.min} max={knob.max} value={Number(k[knob.key])}
                   oninput={(e) => set(knob.key, Number(e.currentTarget.value))} />
            <span class="fig">{k[knob.key]}</span>
          </span>
        {:else if knob.kind === 'select'}
          <select class="ctl" value={String(k[knob.key])} onchange={(e) => set(knob.key, e.currentTarget.value)}>
            {#each knob.options as o (o)}<option value={o}>{o || 'none'}</option>{/each}
          </select>
        {:else}
          <input type="checkbox" checked={!!k[knob.key]} onchange={(e) => set(knob.key, e.currentTarget.checked)} />
        {/if}
      </label>
    {/each}
  </div>
{/if}

<style>
  .knobs { display: grid; gap: 10px; }
  .knob { display: grid; grid-template-columns: minmax(80px, 30%) minmax(0, 1fr); align-items: center; gap: 10px; }
  .knob input[type='checkbox'] { justify-self: start; accent-color: var(--accent); width: 18px; height: 18px; }
  .range { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .range input { flex: 1; min-width: 0; accent-color: var(--accent); }
  .none { margin: 0; font-size: .85rem; color: var(--text-dim); }
</style>
