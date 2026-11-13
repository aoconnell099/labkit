<script lang="ts">
  /** One piece, live, at its knob values and in one state. All three comps draw
   *  every tile and stage with this, so they show the same pieces.
   *
   *  ⚠️ No colour here. Every colour comes from the theme stamped on an ancestor,
   *  as in the gallery's Frame. */
  import { Section, StatRow, Rail, Meter, Field } from 'labkit';
  import type { Orbit, Orbits, Tendrils } from 'labkit/effects';
  import { statesOf, type KnobValues, type Piece, type State } from './catalog';

  let { p, k, at = 'rest', uid = 'x' }: {
    p: Piece;
    k: KnobValues;
    /** The state to show it in. */
    at?: State;
    /** Makes a Field's id unique on a page that shows it more than once. */
    uid?: string;
  } = $props();

  const s = (key: string) => String(k[key] ?? '');
  type Tone = 'neutral' | 'pos' | 'neg' | 'attention';
  const tone = $derived((k.tone ?? 'neutral') as Tone);
  const applies = $derived(statesOf(p).includes(at));
  const loading = $derived(at === 'loading');
  const disabled = $derived(at === 'disabled');
  const empty = $derived(at === 'empty');

  // The entrance plays again on Replay.
  let replay = $state(0);

  // Tendrils and orbit paths take their shape from the app, in pixels or shares.
  let tendrilsEl = $state<Tendrils>();
  let orbitsEl = $state<Orbits>();
  $effect(() => {
    const el = tendrilsEl;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      el.tendrils = [
        { id: 'a', from: [w * 0.18, h * 0.78], to: [w * 0.82, h * 0.24] },
        { id: 'b', from: [w * 0.2, h * 0.3], to: [w * 0.78, h * 0.72] },
      ];
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
  $effect(() => {
    if (!orbitsEl) return;
    const all: Orbit[] = [{ id: 'inner', radius: 0.45, items: 1 }, { id: 'mid', radius: 0.65, items: 2 },
                          { id: 'outer', radius: 0.85, items: 1 }];
    orbitsEl.orbits = all.slice(0, Number(k.paths ?? 2));
  });
</script>

{#if !applies}
  <p class="na lbl">does not apply</p>
{:else if p.shelf === 'effects'}
  <div class="fx" data-fx={p.id}>
    {#if p.id === 'filament-orb'}
      <labkit-filament-orb cloud={k.cloud ? '' : undefined}></labkit-filament-orb>
    {:else if p.id === 'planet-orb'}
      <labkit-planet-orb style:--effect-tint={s('tint') || undefined} rainbow={k.rainbow ? '' : undefined}></labkit-planet-orb>
    {:else if p.id === 'orbit-rings'}
      <labkit-orbit-rings><labkit-filament-orb></labkit-filament-orb></labkit-orbit-rings>
    {:else if p.id === 'dials'}
      <labkit-dials><labkit-filament-orb></labkit-filament-orb></labkit-dials>
    {:else if p.id === 'tendrils'}
      <labkit-tendrils class="fill" bind:this={tendrilsEl} variant={s('variant')}></labkit-tendrils>
    {:else if p.id === 'star-dust'}
      <labkit-star-dust class="fill" sky={s('sky') || undefined}></labkit-star-dust>
    {:else if p.id === 'orbits'}
      <labkit-orbits class="fill" bind:this={orbitsEl}></labkit-orbits>
    {:else if p.id === 'planet-inside'}
      <labkit-planet-inside class="fill" rainbow={k.rainbow ? '' : undefined}></labkit-planet-inside>
    {/if}
  </div>
{:else}
  <div class="live" class:solo={['button', 'loading', 'state-change'].includes(p.id)} class:is-loading={loading && p.id !== 'button' && p.id !== 'state-change' && p.id !== 'loading'}>
    {#if p.id === 'section'}
      <Section title={s('title')} meta={s('meta') || undefined} note={s('note') || undefined}>
        {#if empty}
          <p class="empty">Nothing this month yet. Rows appear here once a statement is in.</p>
        {:else}
          <StatRow label="Spend" value="$3,140.12" tone="neg" sub="excludes pending" />
          <StatRow label="Accounts" value="3" />
        {/if}
      </Section>
    {:else if p.id === 'statrow'}
      <StatRow label={s('label')} value={empty ? '—' : s('value')} sub={empty ? 'no rows yet' : s('sub') || undefined}
               tone={empty ? 'neutral' : tone} big={!!k.big}>
        {#if k.big && !empty}<Rail code="LEDGER" tone="pos" asOf="synced 4 minutes ago" />{/if}
      </StatRow>
    {:else if p.id === 'rail'}
      <Rail code={s('code')} asOf={s('asOf') || undefined} note={s('note') || undefined} {tone} />
    {:else if p.id === 'meter'}
      <div class="stack">
        <span class="lbl">{s('label')} &middot; {empty ? 0 : k.value}%</span>
        <Meter value={empty ? 0 : Number(k.value)} {tone} label={s('label')} />
      </div>
    {:else if p.id === 'field'}
      <Field label={s('label')} id={`f-${uid}`} hint={s('hint') || undefined} error={s('error') || undefined}>
        <input class="ctl" class:is-loading={loading} id={`f-${uid}`} type="email" {disabled}
               placeholder="you@example.com" value={empty ? '' : 'sam@example.com'} />
      </Field>
    {:else if p.id === 'button'}
      <button class="btn" class:primary={k.weight === 'primary'} class:neg={k.weight === 'neg'}
              class:small={!!k.small} class:is-loading={loading} {disabled}>{s('text')}</button>
    {:else if p.id === 'notice'}
      <p class="notice" class:pos={k.tone === 'pos'} class:neg={k.tone === 'neg'}>{s('text')}</p>
    {:else if p.id === 'table'}
      {#if empty || Number(k.rows) === 0}
        <p class="empty">No rows yet. They appear once a statement is in.</p>
      {:else}
        <div class="scroll-x">
          <table>
            <thead><tr><th>Item</th><th class="r">Amount</th></tr></thead>
            <tbody>
              {#each [['Groceries', '$84.20'], ['Rent', '$1,450.00'], ['Bus pass', '$75.00'], ['Books', '$31.99'], ['Power', '$62.18']].slice(0, Number(k.rows)) as [item, amt] (item)}
                <tr><td>{item}</td><td class="r fig">{amt}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {:else if p.id === 'surface'}
      <div class="surface pad">{s('text')}</div>
    {:else if p.id === 'tabs'}
      <div class="standin">
        <span class="lbl tag">stand-in</span>
        <div class="tabs" role="presentation">
          <span class="tab on">Month</span><span class="tab">Year</span><span class="tab">All</span>
        </div>
      </div>
    {:else if p.id === 'toast'}
      <div class="standin">
        <span class="lbl tag">stand-in</span>
        <div class="surface pad toast"><span>Saved.</span><span class="lbl">undo</span></div>
      </div>
    {:else if p.id === 'entrance'}
      <div class="stack">
        {#key replay}
          <div class="surface pad enter">I came in with the theme’s entrance.</div>
        {/key}
        <button class="btn small" onclick={() => replay++}>Replay</button>
      </div>
    {:else if p.id === 'loading'}
      <button class="btn is-loading">Saving</button>
    {:else if p.id === 'state-change'}
      <button class="btn" class:is-loading={loading} {disabled}>Press me</button>
    {/if}
  </div>
{/if}

<style>
  /* Layout only: no colour of its own. */
  .live { width: 100%; min-width: 0; }
  .live.solo { display: flex; justify-content: center; }
  .stack { display: flex; flex-direction: column; gap: 8px; }
  .pad { padding: 14px 16px; font-size: .85rem; color: var(--text-dim); }
  .na { margin: 0; padding: 12px 0; }
  .fx { position: relative; width: 100%; aspect-ratio: 4 / 3; display: grid; place-items: center; }
  .fx > :not(.fill) { width: 62%; }
  .fx[data-fx='planet-orb'] > * { width: 48%; }
  .fx[data-fx='orbit-rings'] > *, .fx[data-fx='dials'] > * { width: 70%; }
  .fx .fill { position: absolute; inset: 0; aspect-ratio: auto; }
  .standin { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; opacity: .8; }
  .tag { border: 1px dashed var(--text-faint); padding: 2px 6px; border-radius: 4px; }
  .tabs { display: flex; gap: 18px; border-bottom: 1px solid var(--line); width: 100%; }
  .tab { padding: 6px 0; font-size: .85rem; color: var(--text-dim); }
  .tab.on { color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); }
  .toast { display: flex; justify-content: space-between; gap: 18px; width: 100%; color: var(--text); }
</style>
