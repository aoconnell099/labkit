<script lang="ts">
  /** One figure with its label and its caveat.
   *
   *  The substrate's basic unit: hairline-separated rows rather than bordered
   *  cards. The label recedes, the figure is the content, and `sub` carries the
   *  thing that stops the number being misread.
   *
   *  ⚠️ RECONCILED FROM THREE INDEPENDENT VERSIONS, which disagreed in exactly
   *  two places. Both disagreements are recorded below because both were right
   *  locally and neither generalises as written.
   */
  import type { Snippet } from 'svelte';

  let { label, value, sub, tone = 'neutral', big = false, children }: {
    label: string;
    value: string;
    /** The caveat. "income − spend", "includes estimates", the delta. */
    sub?: string;
    /**
     * ⚠️ DOMAIN-NEUTRAL ON PURPOSE. The three source apps called these same
     * three slots `in`/`out`, `in`/`out` (with no third), and `ok`/`danger`.
     * A component shared across a ledger, a finance app and an admin portal
     * cannot use any one of those vocabularies without exporting that app's
     * meaning to the others — a value called `in` marking an ACTIVE ACCOUNT is
     * a second meaning waiting to be misread.
     *
     * Apps alias their own words on top:
     *     :root { --money-in: var(--tone-pos); }
     */
    tone?: 'neutral' | 'pos' | 'neg' | 'attention';
    /** Hero treatment, for the one figure a screen is actually about. */
    big?: boolean;
    /** A Rail, or anything else that belongs under the figure. */
    children?: Snippet;
  } = $props();
</script>

{#if big}
  <!-- Hero: label, then the figure, THEN its rail. Putting the rail above the
       number makes you read the caveat before the thing it qualifies. -->
  <div class="row big">
    <span class="lbl">{label}</span>
    <span class="val fig" class:pos={tone === 'pos'} class:neg={tone === 'neg'}
          class:attn={tone === 'attention'}>{value}</span>
    {#if sub}<span class="sub">{sub}</span>{/if}
    {#if children}<span class="extra">{@render children()}</span>{/if}
  </div>
{:else}
  <div class="row">
    <div class="left">
      <span class="lbl">{label}</span>
      {#if sub}<span class="sub">{sub}</span>{/if}
      {#if children}<span class="extra">{@render children()}</span>{/if}
    </div>
    <span class="val fig" class:pos={tone === 'pos'} class:neg={tone === 'neg'}
          class:attn={tone === 'attention'}>{value}</span>
  </div>
{/if}

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: var(--sp-3);
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
  }
  .row:last-child { border-bottom: none; }

  .left { display: flex; flex-direction: column; gap: 3px; min-width: 0; }

  /* ⚠️ --text-dim, not --text-faint, and slightly larger than the label.
     This is a caveat someone has to be able to READ; the faint step is for
     labels whose job is to recede. One consumer changed this independently
     after finding the faint step measured 2.64:1 against its own surface. */
  .sub { font-size: .7rem; color: var(--text-dim); line-height: 1.45; }
  .extra { margin-top: 2px; }

  .val { font-size: 1.12rem; font-weight: 600; }
  .val.pos { color: var(--tone-pos); }
  .val.neg { color: var(--tone-neg); }

  /* ⚠️ ATTENTION IS FORM, NOT A THIRD HUE.
     Three status hues at text contrast on a light ground has zero solutions —
     see palette.ts. Two consumers reached this independently: one dropped the
     third tone entirely, one made it a weight change. Weight is kept because
     dropping it leaves callers with nowhere to put "this needs a human", and
     they invent a hue. */
  .val.attn { font-weight: 500; }

  /* The hero. One per screen — if everything is big, nothing is. */
  .big {
    display: flex; flex-direction: column; align-items: flex-start; gap: 0;
    border-bottom: none; padding: 0 0 var(--sp-3);
  }
  .big .val { font-size: 2.4rem; line-height: 1.02; font-weight: 600; margin: 7px 0 0; }
  .big .extra { margin-top: 9px; }
  .big .sub { margin-top: 6px; }

  @media (max-width: 420px) {
    .big .val { font-size: 2rem; }
  }
</style>
