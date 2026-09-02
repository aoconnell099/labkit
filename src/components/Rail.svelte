<script lang="ts">
  /** A tick, a short code, and a qualifier.
   *
   *  ⚠️ THE EXTRACTION IS THE FINDING, AND IT IS WHY THIS IS NOT CALLED
   *  `Provenance`.
   *
   *  In a data app it answers "where did this figure come from, how fresh is
   *  it, how sure are we" — the signature move of an app whose failure mode is
   *  a plausible wrong number.
   *
   *  An app with almost no figures needed the identical FORM for a completely
   *  different question: what can this account do right now, and since when.
   *  The `code` slot became a capability (ACTIVE, INVITED, STOPPED) rather than
   *  a data source; `asOf` did not change at all.
   *
   *  So the component is general and its NAME was not. `Rail` describes the
   *  shape, and each app names the concept it is describing.
   *
   *  ⚠️ THREE STATES, TWO HUES. `attention` is a SEGMENTED tick, not a third
   *  colour: three status hues at text contrast on a light ground has zero
   *  solutions (green/clay/amber collide in lightness, and green-vs-red is the
   *  deuteranopia pair). Two consumers found this independently and both solved
   *  it with form. Do not go looking for an amber.
   *
   *  ⚠️ Segmented rather than hollow, and that was measured: a hollow 4px tick
   *  leaves a 2x9 interior which just reads as a lighter solid bar. Dashes keep
   *  the exact footprint of the solid ticks and survive being 2px wide. */
  let { code, asOf, note, tone = 'neutral' }: {
    /** Short uppercase capability code: ACTIVE, INVITED, STOPPED, TEMP. */
    code: string;
    /** Human freshness — "last seen 4 minutes ago", "expires in 6 days". */
    asOf?: string;
    /** Anything else worth saying inline. */
    note?: string;
    /** pos = working. attention = needs a human. neg = stopped.
     *  Domain-neutral: see StatRow for why no single source app's vocabulary
     *  could be shared. */
    tone?: 'neutral' | 'pos' | 'attention' | 'neg';
  } = $props();
</script>

<span class="rail">
  <span class="tick" class:pos={tone === 'pos'} class:attention={tone === 'attention'}
        class:neg={tone === 'neg'}></span>
  <span class="code">{code}</span>
  {#if asOf}<span>&middot; {asOf}</span>{/if}
  {#if note}<span class="note">&middot; {note}</span>{/if}
</span>

<style>
  /* .rail / .tick / .code are global in app.css so the rail looks the same
     everywhere it appears, including where a screen builds one by hand. */
  .rail { display: inline-flex; }
  .note { color: var(--text-faint); }
</style>
