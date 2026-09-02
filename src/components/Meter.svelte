<script lang="ts">
  /** The progress mark. A track and a fill — nothing else.
   *
   *  ⚠️ IT TAKES A TONE, NOT A VALUE-TO-COLOUR RULE, and this was learned the
   *  hard way. Two screens in the originating app disagree about what a
   *  percentage means: 90% of a spending target is a warning, 90% of a savings
   *  goal is good news. A component deriving colour from the number would have
   *  to know which screen it was on. Extracting from ONE of those screens would
   *  have baked in the wrong rule — it took two consumers to see it.
   *
   *  The label placement is the caller's too — Targets sets it beside the bar,
   *  Goals underneath with a caveat next to it. Those are layout decisions and
   *  they are why this renders no text at all.
   */
  let { value, tone = 'neutral', label }: {
    /** Percent, 0–100. Clamped here rather than at each call site: a spending
     *  target can be exceeded and a savings goal can go backwards, and neither
     *  should paint outside its track. Callers still decide what to SAY about
     *  the out-of-range case — clamping the bar is not the same as hiding it. */
    value: number;
    /** Domain-neutral — see StatRow. Never decorative. */
    tone?: 'neutral' | 'pos' | 'neg' | 'attention';
    /** Required. A bar with no accessible name is a decoration that screen
     *  readers announce as nothing at all. */
    label: string;
  } = $props();

  const pct = $derived(
    Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  );
</script>

<div class="track" role="progressbar" aria-label={label}
     aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100">
  <div class="fill" class:pos={tone === 'pos'} class:neg={tone === 'neg'}
       class:attn={tone === 'attention'} style:--v={pct / 100}></div>
</div>

<style>
  /* A shallow rule rather than a pill. Instrument does not do rounded chrome —
     999px reads as an app component, 2px reads as a measurement. */
  .track {
    height: 8px;
    background: var(--surface-inset);
    border-radius: 2px;
    overflow: hidden;
  }

  /* ⚠️ scaleX, not width. DESIGN.md allows transform and opacity only, and it is
     right here for a concrete reason: both screens render a column of these, and
     animating `width` lays out every row on every frame while a transform
     composites. Both hand-rolled versions animated width. */
  .fill {
    height: 100%;
    background: var(--text-faint);
    transform-origin: left center;
    transform: scaleX(var(--v));
    transition: transform var(--dur-enter) var(--ease-out);
  }
  .fill.pos { background: var(--tone-pos); }
  .fill.neg { background: var(--tone-neg); }
  /* Attention is FORM, not a third hue — see palette.ts. A dashed fill reads at
     bar scale where a third colour would not survive light mode. */
  .fill.attn {
    background: var(--tone-attention, repeating-linear-gradient(90deg,
                  var(--text-dim) 0 4px, transparent 4px 7px));
  }
</style>
