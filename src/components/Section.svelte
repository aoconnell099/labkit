<script lang="ts">
  /** A titled region.
   *
   *  Replaces the bordered `.card`: regions are defined by a hairline and
   *  whitespace instead of a box. `meta` is the right-hand qualifier — the
   *  window, the count, the method in three words.
   *
   *  The most portable thing in the kit. Three independent ports produced this
   *  file with only two differences between them, both the prose colour
   *  corrected below. */
  import type { Snippet } from 'svelte';

  let { title, meta, note, children, footer }: {
    title: string;
    meta?: string;
    /** Shown under the rule, before the content — the thing that stops the
     *  section being misread. */
    note?: string;
    children: Snippet;
    /** Method, caveats, how the figure was derived. */
    footer?: Snippet;
  } = $props();
</script>

<section>
  <header>
    <span class="lbl">{title}</span>
    {#if meta}<span class="lbl meta">{meta}</span>{/if}
  </header>
  {#if note}<p class="note">{note}</p>{/if}
  {@render children()}
  {#if footer}
    <p class="method">{@render footer()}</p>
  {/if}
</section>

<style>
  section { min-width: 0; }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sp-3);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
    margin-bottom: var(--sp-3);
  }
  .meta { letter-spacing: .08em; }
  /* the note and the method footer are PROSE. --text-dim and a step larger
     than the label: one consumer changed this independently after measuring
     the faint step at 2.64:1 against its own surface. Labels recede; notes are
     read. */
  .note {
    font-size: .72rem;
    color: var(--text-dim);
    line-height: 1.55;
    margin: 0 0 var(--sp-3);
  }
  .method {
    font-size: .7rem;
    color: var(--text-dim);
    line-height: 1.6;
    margin: var(--sp-3) 0 0;
    padding-top: var(--sp-3);
    border-top: 1px solid var(--line);
  }
</style>
