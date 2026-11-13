<script lang="ts">
  /** Comp C, "Shop window": loud and roomy, the pieces as goods on display.
   *
   *  Big type, big cards, the effects given double-width windows. The theme
   *  picker is a strip of paint cards, each its theme's ground with a band of its
   *  accent. The chrome is its own light or dark (the device's, or picked) and
   *  every card wears the picked theme. A piece's page opens on a full-width
   *  window with the piece large, then the states as a row of small windows. */
  import { applyTheme } from 'labkit';
  import { PIECES, SHELVES, STATES, STATE_HOW, THEMES, LEVELS, statesOf, themeNamed, modeOf, piece } from './catalog';
  import { ui, kv, setKv } from './ui.svelte';
  import { route, hrefOf } from './route.svelte';
  import Piece from './Piece.svelte';
  import Knobs from './Knobs.svelte';
  import Markup from './Markup.svelte';
  import ThemeValues from './ThemeValues.svelte';

  ui.theme ||= 'Candy glass';
  const theme = $derived(themeNamed(ui.theme));
  let goods = $state<HTMLElement>();
  $effect(() => {
    if (goods) applyTheme(theme, modeOf(theme), ui.level, goods);
  });

  let chrome = $state<'device' | 'light' | 'dark'>('device');
  $effect(() => {
    document.documentElement.style.colorScheme = chrome === 'device' ? 'light dark' : chrome;
  });

  const open = $derived(route.piece ? piece(route.piece)! : null);

  /** The picked paint card in view: on a phone the strip scrolls, and the pick
   *  may start off its edge. */
  let paints = $state<HTMLElement>();
  $effect(() => {
    const card = paints?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (paints && card) paints.scrollLeft = card.offsetLeft - paints.offsetLeft - 2;
  });
</script>

<div class="shop" data-screen={open ? 'piece' : 'home'}>
  <header class="mast">
    <a class="logo" href={hrefOf(null)}>labkit</a>
    <div class="switches">
      <div class="seg" role="group" aria-label="Motion">
        {#each LEVELS as l (l)}
          <button type="button" aria-pressed={l === ui.level} onclick={() => (ui.level = l)}>{l}</button>
        {/each}
      </div>
      <div class="seg" role="group" aria-label="Light or dark around the cards">
        {#each ['device', 'light', 'dark'] as const as c (c)}
          <button type="button" aria-pressed={c === chrome} onclick={() => (chrome = c)}>{c}</button>
        {/each}
      </div>
    </div>
  </header>

  {#if open}
    <a class="back" href={hrefOf(null)}>&larr; back to the shelves</a>
    <h1 class="big">{open.name}</h1>
    <p class="lede">{open.blurb}</p>
  {:else}
    <h1 class="big">Pick a look.<br />Every piece follows.</h1>
    <p class="lede">{PIECES.length} pieces on three shelves, live. Tap a paint card to re-skin them all.</p>
  {/if}

  <div class="paints" role="group" aria-label="Theme" bind:this={paints}>
    {#each THEMES as t (t.name)}
      {@const v = t.modes[modeOf(t)]!}
      <button type="button" class="paint" aria-pressed={t.name === ui.theme} onclick={() => (ui.theme = t.name)}
              style:background={v.ink.surface} style:color={v.ink.text}>
        <span class="band" style:background={v.accent}></span>
        <span class="pn">{t.name}</span>
        <span class="pm">{modeOf(t)}</span>
      </button>
    {/each}
  </div>

  <div class="goods" bind:this={goods}>
    {#if open}
      {@const k = kv(open.id)}
      <section class="window hero" data-stage={open.id}>
        <span class="tag">{open.kind}</span>
        <div class="hero-body"><Piece p={open} {k} uid="stage" /></div>
      </section>

      <h2 class="h">States <span class="dimmed">{statesOf(open).length} of 7</span></h2>
      <div class="row">
        {#each STATES as st (st)}
          <div class="window mini" class:na={!statesOf(open).includes(st)}>
            <span class="tag">{st}</span>
            <div class="mini-body"><Piece p={open} {k} at={st} uid={`s-${st}`} /></div>
            <span class="how">{STATE_HOW[st]}</span>
          </div>
        {/each}
      </div>

      <div class="pair">
        <section class="window card">
          <h2 class="h">Knobs</h2>
          <Knobs p={open} bind:k={() => kv(open.id), (v) => setKv(open.id, v)} />
        </section>
        <section class="window card">
          <h2 class="h">Take it home</h2>
          <Markup text={open.markup(k)} />
        </section>
      </div>
      <details class="window card">
        <summary class="h">What {theme.name} sets</summary>
        <ThemeValues {theme} />
      </details>
    {:else}
      {#each SHELVES as shelf (shelf.id)}
        {@const list = PIECES.filter((p) => p.shelf === shelf.id)}
        <h2 class="h shelf">{shelf.name}</h2>
        <div class="grid" class:fx={shelf.id === 'effects'}>
          {#each list as p (p.id)}
            <a class="window good" href={hrefOf(p.id)} data-tile={p.id} class:standin={p.kind === 'stand-in'}>
              <span class="tag">{p.kind === 'stand-in' ? 'stand-in' : p.kind}</span>
              <span class="good-body" inert><Piece p={p} k={kv(p.id)} uid={`t-${p.id}`} /></span>
              <span class="gn">{p.name}</span>
            </a>
          {/each}
        </div>
      {/each}
    {/if}
  </div>
  <p class="foot">A comp for the library’s look: labkit #83. Stand-ins are marked; everything else is the real piece.</p>
</div>

<style>
  .shop {
    --c-bg: light-dark(#fbfaf7, #0f0f12);
    --c-ink: light-dark(#141414, #f3f2ee);
    --c-dim: light-dark(#55524c, #b4b1aa);
    --c-line: light-dark(#e2ded5, #2a2a30);
    background: var(--c-bg);
    color: var(--c-ink);
    min-height: 100vh;
    padding: 18px 28px 60px;
    font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
    display: flex; flex-direction: column; gap: 16px;
    position: relative;
  }
  .mast { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .logo { font-weight: 800; font-size: 1.25rem; letter-spacing: -.03em; color: inherit; text-decoration: none; }
  .switches { display: flex; gap: 8px; flex-wrap: wrap; }
  .seg { display: flex; border: 1.5px solid var(--c-ink); border-radius: 999px; overflow: hidden; }
  .seg button {
    appearance: none; border: none; background: none; color: inherit; cursor: pointer;
    font: inherit; font-size: .75rem; font-weight: 600; padding: 4px 11px;
  }
  .seg button[aria-pressed='true'] { background: var(--c-ink); color: var(--c-bg); }
  .seg button:focus-visible, .paint:focus-visible { outline: 2px solid var(--c-ink); outline-offset: 2px; }
  .big {
    font-size: clamp(2.4rem, 9vw, 5.2rem); line-height: .95; letter-spacing: -.045em;
    font-weight: 800; margin: 18px 0 0;
  }
  .lede { margin: 0; color: var(--c-dim); font-size: 1.05rem; max-width: 46ch; }
  .back { color: var(--c-dim); font-size: .9rem; }

  /* Paint cards: a strip that scrolls inside itself on a phone. */
  .paints { display: flex; gap: 10px; overflow-x: auto; padding: 6px 2px 10px; scroll-snap-type: x proximity; }
  .paint {
    flex: 0 0 116px; height: 92px; scroll-snap-align: start;
    position: relative; overflow: hidden; text-align: left; cursor: pointer;
    border: 1.5px solid var(--c-line); border-radius: 14px; padding: 10px;
    display: flex; flex-direction: column; justify-content: flex-end; font: inherit;
    transition: transform 160ms ease-out;
  }
  .paint:hover { transform: translateY(-2px); }
  .paint[aria-pressed='true'] { border-color: var(--c-ink); box-shadow: 0 0 0 2px var(--c-ink); }
  .band { position: absolute; left: 0; right: 0; top: 0; height: 34%; }
  .pn { font-size: .78rem; font-weight: 700; line-height: 1.15; }
  .pm { font-size: .66rem; opacity: .75; }

  /* The display floor wears the theme (applyTheme paints its ground); the
     windows on it are the theme's raised surface. */
  .goods { display: flex; flex-direction: column; gap: 14px; border-radius: 26px; padding: 6px 18px 22px; }
  .h { font-size: 1.5rem; font-weight: 800; letter-spacing: -.03em; margin: 14px 0 0; color: var(--text); font-family: var(--font-display); }
  .shelf { font-size: 2rem; margin-top: 20px; }
  .dimmed { color: var(--text-dim); font-weight: 500; font-size: 1rem; letter-spacing: 0; }
  .window {
    position: relative; background: var(--surface); color: var(--text);
    border-radius: 18px; border: 1px solid var(--line); overflow: hidden; min-width: 0;
    font-family: var(--font-ui);
  }
  .tag {
    position: absolute; top: 10px; left: 12px; z-index: 2;
    font-size: .66rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
    background: var(--accent); color: var(--on-accent); padding: 2px 8px; border-radius: 999px;
  }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .grid.fx { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
  .good {
    display: flex; flex-direction: column; text-decoration: none; min-height: 230px;
    transition: transform var(--dur-state) var(--ease-out);
  }
  .good:hover { transform: translateY(-3px); }
  .good.standin { border-style: dashed; }
  .good-body { flex: 1; display: flex; align-items: center; justify-content: center; padding: 42px 18px 12px; }
  .gn {
    padding: 10px 14px 14px; font-family: var(--font-display); font-weight: 700;
    font-size: 1.3rem; letter-spacing: -.01em; color: var(--text);
  }

  .hero { min-height: 340px; }
  .hero-body { display: flex; justify-content: center; align-items: center; padding: 56px 24px 32px; min-height: 340px; }
  .hero-body :global(.fx) { max-width: 560px; }
  .row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
  .mini { flex: 0 0 200px; display: flex; flex-direction: column; }
  .mini.na { opacity: .55; border-style: dashed; }
  .mini-body { flex: 1; padding: 40px 12px 6px; display: flex; align-items: center; justify-content: center; min-height: 120px; }
  .mini-body :global(.fx) { max-width: 160px; }
  .how { padding: 0 12px 10px; font-size: .72rem; color: var(--text-dim); }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .card { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  .card .h { margin: 0; color: var(--text); font-size: 1.15rem; font-family: var(--font-display); }
  summary.h { cursor: pointer; }
  .foot { margin: 8px 0 0; font-size: .75rem; color: var(--c-dim); }

  @media (max-width: 640px) {
    .shop { padding: 14px 12px 48px; }
    .goods { padding: 4px 10px 16px; border-radius: 18px; }
    .grid, .grid.fx { grid-template-columns: minmax(0, 1fr); }
    .good { min-height: 180px; }
    .pair { grid-template-columns: minmax(0, 1fr); }
    .paint { flex-basis: 104px; height: 84px; }
    .mini { flex-basis: 160px; }
  }
</style>
