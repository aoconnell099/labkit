<script lang="ts">
  /** A labelled form control.
   *
   *  ⚠️ THIS EXISTED IN ONLY ONE OF THE THREE SOURCE APPS, and that is the
   *  point. Two are read-mostly data apps whose only control styling is a
   *  `.ctl` class; the third is almost entirely forms. It is the clearest
   *  single piece of evidence about what changes when the app SHAPE changes —
   *  and the reason a kit extracted from data apps alone would have shipped
   *  with no way to build a form at all.
   *
   *  It exists rather than a bare <input> because three things have to travel
   *  together and get separated otherwise: the label must be associated with the
   *  control (not merely adjacent), the error must be announced rather than only
   *  coloured, and the hint must sit where it is read BEFORE the mistake. */
  import type { Snippet } from 'svelte';

  let { label, id, hint, error, children }: {
    label: string;
    /** Must be unique on the page — it wires the label to the control. */
    id: string;
    /** Read BEFORE the mistake, not after it. */
    hint?: string;
    /** Field-level failure. Announced, not just coloured. */
    error?: string;
    children: Snippet;
  } = $props();
</script>

<div class="field">
  <label class="lbl" for={id}>{label}</label>
  {#if hint}<p class="hint">{hint}</p>{/if}
  {@render children()}
  {#if error}
    <!-- ⚠️ role="alert" so a screen reader announces it. Colour alone would
         make the failure invisible to anyone not looking at that spot, and the
         danger hue is one of only two in this app. -->
    <p class="err" role="alert">{error}</p>
  {/if}
</div>

<style>
  .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: var(--sp-4); }
  .hint { font-size: .7rem; color: var(--text-faint); line-height: 1.5; margin: 0 0 2px; }
  .err { font-size: .74rem; color: var(--tone-neg); line-height: 1.5; margin: 3px 0 0; }
</style>
