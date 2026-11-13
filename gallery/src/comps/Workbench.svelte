<script lang="ts">
  /** Comp B, "Workbench": dense and practical, a tool you keep open. The owner's
   *  pick for the library (docs/library-look.md).
   *
   *  Neutral chrome round a themed canvas: the side panel, the tile frames and the
   *  inspector stay grey in light or dark (follow the device, or pick), and only
   *  the canvas wears the picked theme. The theme picker is a set of paint cards.
   *  A piece's page is a stage and an inspector side by side, the states below;
   *  on a phone the stage, then the states, then the inspector folded. On a phone
   *  the controls fold into the one line above the canvas. Three screens: the
   *  home, a piece's page (with its All themes view) and the sample screen. */
  import { applyTheme, type MotionLevel, type Theme } from 'labkit';
  import { PIECES, SHELVES, STATES, STATE_HOW, THEMES, LEVELS, statesOf, themeNamed, modeOf, piece } from './catalog';
  import { ui, kv, setKv } from './ui.svelte';
  import { route, hrefOf, SAMPLE } from './route.svelte';
  import Piece from './Piece.svelte';
  import Knobs from './Knobs.svelte';
  import Markup from './Markup.svelte';
  import ThemeValues from './ThemeValues.svelte';
  import Sample from './Sample.svelte';

  ui.theme ||= 'Cold core';
  const theme = $derived(themeNamed(ui.theme));
  let canvas = $state<HTMLElement>();
  $effect(() => {
    if (canvas) applyTheme(theme, modeOf(theme), ui.level, canvas);
  });

  /** One theme stamped on one element: the All themes view's tiles. */
  function themed(node: HTMLElement, [t, level]: [Theme, MotionLevel]) {
    applyTheme(t, modeOf(t), level, node);
    return { update: ([t2, l2]: [Theme, MotionLevel]) => applyTheme(t2, modeOf(t2), l2, node) };
  }

  /** The chrome's own light or dark: the device's, unless picked. */
  let chrome = $state<'device' | 'light' | 'dark'>('device');
  $effect(() => {
    document.documentElement.style.colorScheme = chrome === 'device' ? 'light dark' : chrome;
  });

  /** A phone: the controls fold into one line, and a piece's inspector folds. */
  const NARROW = matchMedia('(max-width: 760px)');
  let narrow = $state(NARROW.matches);
  NARROW.addEventListener('change', () => (narrow = NARROW.matches));
  let controlsOpen = $state(false);

  let filter = $state('');
  const shown = $derived(PIECES.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase())));
  const open = $derived(route.piece ? piece(route.piece)! : null);
  const screen = $derived(open ? 'piece' : route.sample ? 'sample' : 'home');
  // A new screen opens on its canvas, the controls folded again.
  $effect(() => {
    void screen;
    void open;
    controlsOpen = false;
  });

  /** All themes on a piece's page. Effects are live in one tile at a time (the
   *  picked theme's, or the one tapped), so a phone never holds more than a few
   *  WebGL pieces; components and classes are live in every tile. */
  let allThemes = $state(false);
  let liveTheme = $state('');
  const BY_MODE = (['dark', 'light'] as const).map((m) => ({ mode: m, list: THEMES.filter((t) => modeOf(t) === m) }));

  /** The picked paint card in view: on a phone the strip scrolls, and the pick
   *  may start off its edge. */
  let paints = $state<HTMLElement>();
  $effect(() => {
    const card = paints?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (paints && card && narrow) paints.scrollLeft = card.offsetLeft - paints.offsetLeft - 2;
  });
</script>

{#snippet controls()}
  <div class="controls" data-controls>
    <div class="ctlrow">
      <span class="lbl">theme</span>
      <div class="paints" role="group" aria-label="Theme" bind:this={paints}>
        {#each THEMES as t (t.name)}
          {@const v = t.modes[modeOf(t)]!}
          <button type="button" class="paint" aria-pressed={t.name === ui.theme} data-paint={t.name}
                  onclick={() => (ui.theme = t.name)} style:background={v.ink.surface} style:color={v.ink.text}>
            <span class="band" style:background={v.accent}></span>
            <span class="pn">{t.name}</span>
            <span class="pm">{modeOf(t)}</span>
          </button>
        {/each}
      </div>
    </div>
    <div class="ctlrow">
      <span class="lbl">motion</span>
      <div class="seg" role="group" aria-label="Motion">
        {#each LEVELS as l (l)}
          <button type="button" aria-pressed={l === ui.level} onclick={() => (ui.level = l)}>{l}</button>
        {/each}
      </div>
    </div>
    <div class="ctlrow">
      <span class="lbl">chrome</span>
      <div class="seg" role="group" aria-label="Chrome">
        {#each ['device', 'light', 'dark'] as const as c (c)}
          <button type="button" aria-pressed={c === chrome} onclick={() => (chrome = c)}>{c}</button>
        {/each}
      </div>
    </div>
  </div>
{/snippet}

<div class="bench" data-screen={screen}>
  <aside class="side">
    <a class="brand" href={hrefOf(null)}><span class="mono">labkit</span> <span class="dim">workbench</span></a>

    {#if !narrow}{@render controls()}{/if}

    <nav class="index" aria-label="Pieces">
      <input class="ctl find" type="search" placeholder="Find a piece" bind:value={filter} />
      <a class="to-sample" href={SAMPLE} aria-current={screen === 'sample' ? 'page' : undefined}>Sample screen</a>
      {#each SHELVES as shelf (shelf.id)}
        <span class="lbl">{shelf.name}</span>
        <ul>
          {#each shown.filter((p) => p.shelf === shelf.id) as p (p.id)}
            <li><a href={hrefOf(p.id)} aria-current={open?.id === p.id ? 'page' : undefined}>{p.name}{#if p.kind === 'stand-in'}<span class="si">stand-in</span>{/if}</a></li>
          {/each}
        </ul>
      {/each}
    </nav>
  </aside>

  <main class="main">
    <div class="crumbs mono">
      <a href={hrefOf(null)}>library</a>{#if open}<span> / {open.shelf} / </span><b>{open.name}</b>{:else if screen === 'sample'}<span> / </span><b>sample screen</b>{/if}
      {#if narrow}
        <button type="button" class="crumb-theme toggle" id="controls-toggle" aria-expanded={controlsOpen}
                onclick={() => (controlsOpen = !controlsOpen)}>
          <span class="dot" style:background={theme.modes[modeOf(theme)]!.accent}></span>
          {theme.name} &middot; {modeOf(theme)} &middot; {ui.level} <span aria-hidden="true">{controlsOpen ? '▴' : '▾'}</span>
        </button>
      {:else}
        <span class="crumb-theme">{theme.name} &middot; {modeOf(theme)} &middot; {ui.level}</span>
      {/if}
    </div>
    {#if narrow && controlsOpen}<div class="drop">{@render controls()}</div>{/if}

    <div class="canvas" bind:this={canvas}>
      {#if open}
        {@const k = kv(open.id)}
        <div class="layout">
          <section class="stage" data-stage={open.id}>
            <header class="bar">
              <span class="mono">{open.name}</span>
              <span class="lbl">{open.kind}</span>
              <button type="button" class="all-toggle" id="all-themes" aria-pressed={allThemes}
                      onclick={() => (allThemes = !allThemes)}>{allThemes ? 'one theme' : 'all themes'}</button>
            </header>
            {#if allThemes}
              <div class="all" data-all-themes>
                {#each BY_MODE as g (g.mode)}
                  {#each g.list as t (t.name)}
                    {@const live = open.shelf !== 'effects' || (liveTheme || ui.theme) === t.name}
                    <div class="at" use:themed={[t, ui.level]} data-all-tile={t.name}>
                      <span class="at-name"><b>{t.name}</b> <span>{g.mode}</span></span>
                      <div class="at-body">
                        {#if live}
                          <Piece p={open} {k} uid={`a-${t.name}`} />
                        {:else}
                          <button type="button" class="btn small" onclick={() => (liveTheme = t.name)}>Play here</button>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {/each}
              </div>
              {#if open.shelf === 'effects'}
                <p class="blurb">One theme plays at a time, so a phone is never asked for more than a few WebGL pieces. Tap Play here on another.</p>
              {/if}
            {:else}
              <div class="stage-body"><Piece p={open} {k} uid="stage" /></div>
            {/if}
            <p class="blurb">{open.blurb}</p>
          </section>

          <section class="states-box">
            <h2 class="lbl states-h">States &middot; {statesOf(open).length} of 7</h2>
            <div class="states">
              {#each STATES as st (st)}
                <div class="cell" class:na={!statesOf(open).includes(st)}>
                  <span class="mono">{st}</span>
                  <span class="how">{STATE_HOW[st]}</span>
                  <div class="cell-body"><Piece p={open} {k} at={st} uid={`s-${st}`} /></div>
                </div>
              {/each}
            </div>
          </section>

          <section class="inspector">
            <details open={!narrow}>
              <summary class="lbl">Knobs</summary>
              <Knobs p={open} bind:k={() => kv(open.id), (v) => setKv(open.id, v)} />
            </details>
            <details open={!narrow}>
              <summary class="lbl">Markup</summary>
              <Markup text={open.markup(k)} />
            </details>
            <details>
              <summary class="lbl">Theme values &middot; {theme.name}</summary>
              <ThemeValues {theme} />
            </details>
          </section>
        </div>
      {:else if screen === 'sample'}
        <Sample />
      {:else}
        <a class="sample-link" href={SAMPLE}>
          <span class="mono">Sample screen</span>
          <span class="how">the pieces as one app page, in {theme.name}</span>
        </a>
        {#each SHELVES as shelf (shelf.id)}
          {@const list = shown.filter((p) => p.shelf === shelf.id)}
          {#if list.length}
            <h2 class="lbl shelf-h">{shelf.name} <span class="count">{list.length}</span></h2>
            <div class="tiles">
              {#each list as p (p.id)}
                <a class="tile" href={hrefOf(p.id)} data-tile={p.id} class:standin={p.kind === 'stand-in'}>
                  <span class="bar"><span class="mono">{p.name}</span><span class="lbl">{p.kind}</span></span>
                  <span class="tile-body" inert><Piece p={p} k={kv(p.id)} uid={`t-${p.id}`} /></span>
                </a>
              {/each}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
    <p class="foot">A comp for the library’s look: labkit #83, the pick. Stand-ins are marked; everything else is the real piece.</p>
  </main>
</div>

<style>
  /* The chrome's own neutral greys, set as labkit's tokens so labkit's `.ctl`,
     `.btn` and `.lbl` draw the chrome as well. The canvas below stamps the
     picked theme over them. */
  .bench {
    --bg: light-dark(#f4f5f7, #121418);
    --surface: light-dark(#ffffff, #1a1d22);
    --surface-inset: light-dark(#eceef1, #23272d);
    --line: light-dark(#d9dce1, #2c3036);
    --text: light-dark(#16181c, #e8eaee);
    --text-dim: light-dark(#4f5560, #a3a9b3);
    --text-faint: light-dark(#5f6672, #8f96a1);
    --accent: light-dark(#3c5bd0, #7d97f0);
    --on-accent: light-dark(#ffffff, #121418);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: grid;
    grid-template-columns: 252px minmax(0, 1fr);
    font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif;
    position: relative;
  }
  /* `.side`, not `.rail`: tokens.css owns `.rail`, the state rail. */
  .side {
    border-right: 1px solid var(--line);
    background: var(--surface);
    padding: 16px 14px;
    display: flex; flex-direction: column; gap: 14px;
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
  }
  .brand { color: var(--text); text-decoration: none; font-size: 1rem; }
  .dim { color: var(--text-dim); }
  .controls { display: flex; flex-direction: column; gap: 14px; }
  .ctlrow { display: flex; flex-direction: column; gap: 4px; }
  .seg { display: flex; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }
  .seg button {
    flex: 1; appearance: none; border: none; background: none; color: var(--text-dim);
    font: inherit; font-size: .78rem; padding: 5px 0; cursor: pointer;
  }
  .seg button + button { border-left: 1px solid var(--line); }
  .seg button[aria-pressed='true'] { background: var(--surface-inset); color: var(--text); font-weight: 600; }
  .seg button:focus-visible, .paint:focus-visible, .toggle:focus-visible, .all-toggle:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }

  /* Paint cards: each theme's ground with a band of its accent, its name and its
     mode. Two columns in the side panel; on a phone, one strip that scrolls. */
  .paints { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .paint {
    height: 58px; position: relative; overflow: hidden; text-align: left; cursor: pointer;
    border: 1px solid var(--line); border-radius: 6px; padding: 6px 7px;
    display: flex; flex-direction: column; justify-content: flex-end; font: inherit;
  }
  .paint:hover { box-shadow: 0 0 0 1px var(--text-dim); }
  .paint:active { transform: translateY(1px); }
  .paint[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--text); }
  .band { position: absolute; left: 0; right: 0; top: 0; height: 30%; }
  .pn { font-size: .72rem; font-weight: 650; line-height: 1.15; }
  .pm { font-size: .62rem; opacity: .75; }

  .index { display: flex; flex-direction: column; gap: 6px; }
  .find { margin-bottom: 6px; }
  .index ul { list-style: none; margin: 0 0 8px; padding: 0; }
  .index a {
    display: flex; justify-content: space-between; padding: 3px 8px; border-radius: 4px;
    color: var(--text-dim); text-decoration: none; font-size: .84rem;
  }
  .index a:hover { background: var(--surface-inset); color: var(--text); }
  .index a[aria-current='page'] { background: var(--surface-inset); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }
  .to-sample { margin-bottom: 6px; }
  .si { font-size: .66rem; color: var(--text-faint); }

  .main { padding: 14px 20px 40px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .crumbs { font-size: .78rem; color: var(--text-dim); display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
  .crumbs a { color: var(--text-dim); }
  .crumbs b { color: var(--text); font-weight: 600; }
  .crumb-theme { margin-left: auto; }
  .toggle {
    appearance: none; font: inherit; color: var(--text); cursor: pointer;
    background: var(--surface); border: 1px solid var(--line); border-radius: 6px;
    padding: 7px 10px; display: flex; align-items: center; gap: 8px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px var(--line); }
  .drop { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }

  /* The themed area: its own ground, so the theme is seen whole. */
  .canvas { background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-width: 0; }
  .shelf-h, .states-h { margin: 18px 0 8px; display: flex; gap: 8px; }
  .states-h { margin-top: 0; }
  .count { color: var(--text-dim); }
  .sample-link {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; align-items: baseline;
    padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface);
    color: var(--text); text-decoration: none; margin-bottom: 4px;
  }
  .sample-link:hover { box-shadow: 0 0 0 1px var(--accent); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
  .tile {
    display: flex; flex-direction: column; min-width: 0;
    border: 1px solid var(--line); border-radius: 6px; background: var(--surface);
    color: inherit; text-decoration: none; overflow: hidden;
    transition: transform var(--dur-state) var(--ease-out);
  }
  .tile:hover { box-shadow: 0 0 0 1px var(--accent); }
  .tile:active { transform: translateY(1px); }
  .tile.standin { border-style: dashed; }
  .bar {
    display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
    padding: 6px 10px; border-bottom: 1px solid var(--line); font-size: .8rem;
  }
  .stage .bar { align-items: center; }
  .stage .bar .lbl { margin-left: auto; }
  .all-toggle {
    appearance: none; font: inherit; font-size: .75rem; cursor: pointer; color: var(--text);
    background: var(--surface-inset); border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px;
  }
  .all-toggle[aria-pressed='true'] { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .tile-body { padding: 12px; display: flex; align-items: center; justify-content: center; min-height: 120px; flex: 1; }

  /* A piece's page: stage and inspector side by side, the states below. */
  .layout {
    display: grid; gap: 12px; align-items: start;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    grid-template-areas: 'stage inspector' 'states states';
  }
  .stage { grid-area: stage; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); min-width: 0; }
  .states-box { grid-area: states; min-width: 0; margin-top: 6px; }
  .inspector { grid-area: inspector; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .stage-body { padding: 28px 20px; display: flex; justify-content: center; align-items: center; min-height: 260px; }
  .blurb { margin: 0; padding: 8px 12px; border-top: 1px solid var(--line); font-size: .82rem; color: var(--text-dim); }

  /* All themes: each tile wears its own theme over the canvas's. */
  .all { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; padding: 10px; }
  .at {
    background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 6px;
    display: flex; flex-direction: column; min-width: 0; overflow: hidden;
  }
  .at-name { padding: 5px 9px; font-size: .74rem; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; gap: 6px; }
  .at-name span { color: var(--text-dim); }
  .at-body { padding: 12px; display: flex; justify-content: center; align-items: center; min-height: 110px; flex: 1; }

  details { border: 1px solid var(--line); border-radius: 6px; background: var(--surface); padding: 8px 12px 12px; }
  details:not([open]) { padding-bottom: 8px; }
  summary { cursor: pointer; padding: 2px 0 8px; }
  details:not([open]) summary { padding-bottom: 2px; }
  .states { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
  .cell { border: 1px solid var(--line); border-radius: 6px; background: var(--surface); padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .cell.na { border-style: dashed; background: none; }
  .cell .mono { font-size: .78rem; }
  .how { font-size: .7rem; color: var(--text-faint); }
  .cell-body { margin-top: 8px; display: flex; justify-content: center; }
  .foot { margin: 0; font-size: .75rem; color: var(--text-faint); }

  @media (max-width: 760px) {
    .bench { grid-template-columns: minmax(0, 1fr); }
    .side {
      position: static; height: auto; border-right: none; border-bottom: 1px solid var(--line);
      gap: 10px; padding: 12px;
    }
    /* The index becomes one row of chips that scrolls inside itself. */
    .index { flex-direction: row; overflow-x: auto; gap: 4px; align-items: center; }
    .index > .lbl, .find { display: none; }
    .index ul { display: contents; }
    .index a { white-space: nowrap; border: 1px solid var(--line); }
    .to-sample { margin-bottom: 0; }
    .paints { display: flex; overflow-x: auto; scroll-snap-type: x proximity; padding: 2px 2px 6px; }
    .paint { flex: 0 0 104px; height: 70px; scroll-snap-align: start; }
    .main { padding: 10px 10px 32px; }
    .crumb-theme { margin-left: 0; flex-basis: 100%; margin-top: 6px; }
    .canvas { padding: 10px; }
    .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .tile-body { padding: 8px; min-height: 100px; }
    .layout { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'stage' 'states' 'inspector'; }
    .states-box { margin-top: 0; }
    .stage-body { min-height: 180px; padding: 20px 14px; }
    .states { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .all { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 8px; }
    .at-body { padding: 8px; min-height: 90px; }
  }
</style>
