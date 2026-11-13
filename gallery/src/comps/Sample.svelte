<script lang="ts">
  /** Workbench's sample screen: the pieces put together as one small app page,
   *  so a theme can be judged as an app would wear it, not piece by piece.
   *
   *  ⚠️ No colour here, as in Piece.svelte: the page wears the theme stamped on
   *  the canvas round it. Stand-ins are marked, as on the tiles. */
  import { Section, StatRow, Rail, Meter, Field } from 'labkit';
</script>

<div class="app" data-sample>
  <header class="head">
    <span class="name">Your app</span>
    <span class="standin">
      <span class="lbl tag">stand-in</span>
      <span class="tabs" role="presentation"><span class="tab on">Month</span><span class="tab">Year</span><span class="tab">All</span></span>
    </span>
    <button class="btn small">Sign out</button>
  </header>

  <Section title="This month" meta="30 days" note="Confirmed rows only.">
    <StatRow label="Net this month" value="+$412.90" sub="income − spend" tone="pos" big>
      <Rail code="LEDGER" tone="pos" asOf="synced 4 minutes ago" />
    </StatRow>
    <StatRow label="Spend" value="$3,140.12" tone="neg" sub="excludes pending" />
    <div class="stack">
      <span class="lbl">Savings goal &middot; 72%</span>
      <Meter value={72} tone="pos" label="Savings goal" />
    </div>
  </Section>

  <Section title="Recent" meta="5 rows">
    <div class="scroll-x">
      <table>
        <thead><tr><th>Item</th><th class="r">Amount</th></tr></thead>
        <tbody>
          {#each [['Groceries', '$84.20'], ['Rent', '$1,450.00'], ['Bus pass', '$75.00'], ['Books', '$31.99'], ['Power', '$62.18']] as [item, amt] (item)}
            <tr><td>{item}</td><td class="r fig">{amt}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Section>

  <Section title="Invite someone">
    <Field label="Email" id="sample-email" hint="We send the link here.">
      <input class="ctl" id="sample-email" type="email" placeholder="you@example.com" />
    </Field>
    <div class="actions">
      <button class="btn primary">Send invite</button>
      <button class="btn">Cancel</button>
      <button class="btn neg">Remove</button>
    </div>
    <p class="notice neg">That would leave no active administrator.</p>
  </Section>

  <div class="standin">
    <span class="lbl tag">stand-in</span>
    <div class="surface toast"><span>Saved.</span><span class="lbl">undo</span></div>
  </div>
</div>

<style>
  /* Layout only: no colour of its own. */
  .app { display: flex; flex-direction: column; gap: 22px; max-width: 720px; margin: 0 auto; min-width: 0; }
  .head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
  .name { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: var(--text); }
  .head .btn { margin-left: auto; }
  .stack { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  .standin { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; opacity: .8; }
  .head .standin { flex-direction: row; align-items: center; gap: 10px; }
  .tag { border: 1px dashed var(--text-faint); padding: 2px 6px; border-radius: 4px; }
  .tabs { display: flex; gap: 14px; }
  .tab { padding: 4px 0; font-size: .85rem; color: var(--text-dim); }
  .tab.on { color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); }
  .toast { display: flex; justify-content: space-between; gap: 18px; padding: 12px 16px; min-width: 220px; color: var(--text); }
</style>
