<script lang="ts">
  /** Comp B, "Workbench": dense and practical, a tool you keep open.
   *
   *  Neutral chrome round a themed canvas: the side panel, the tile frames and the
   *  inspector stay grey in light or dark (follow the device, or pick), and only
   *  the stages wear the picked theme. A piece's page is a stage on the left and
   *  an inspector on the right; on a phone, one above the other. */
  import { applyTheme } from 'labkit';
  import { PIECES, SHELVES, STATES, STATE_HOW, THEMES, LEVELS, statesOf, themeNamed, modeOf, piece } from './catalog';
  import { ui, kv, setKv } from './ui.svelte';
  import { route, hrefOf } from './route.svelte';
  import Piece from './Piece.svelte';
  import Knobs from './Knobs.svelte';
  import Markup from './Markup.svelte';
  import ThemeValues from './ThemeValues.svelte';

  ui.theme ||= 'Cold core';
  const theme = $derived(themeNamed(ui.theme));
  let canvas = $state<HTMLElement>();
  $effect(() => {
    if (canvas) applyTheme(theme, modeOf(theme), ui.level, canvas);
  });

  /** The chrome's own light or dark: the device's, unless picked. */
  let chrome = $state<'device' | 'light' | 'dark'>('device');
  $effect(() => {
    document.documentElement.style.colorScheme = chrome === 'device' ? 'light dark' : chrome;
  });

  let filter = $state('');
  const shown = $derived(PIECES.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase())));
  const open = $derived(route.piece ? piece(route.piece)! : null);
</script>

<div class="bench" data-screen={open ? 'piece' : 'home'}>
  <aside class="side">
    <a class="brand" href={hrefOf(null)}><span class="mono">labkit</span> <span class="dim">workbench</span></a>

    <label class="ctlrow">
      <span class="lbl">theme</span>
      <select class="ctl" bind:value={ui.theme}>
        <optgroup label="dark">
          {#each THEMES.filter((t) => modeOf(t) === 'dark') as t (t.name)}<option value={t.name}>{t.name}</option>{/each}
        </optgroup>
        <optgroup label="light">
          {#each THEMES.filter((t) => modeOf(t) === 'light') as t (t.name)}<option value={t.name}>{t.name}</option>{/each}
        </optgroup>
      </select>
    </label>
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

    <nav class="index" aria-label="Pieces">
      <input class="ctl find" type="search" placeholder="Find a piece" bind:value={filter} />
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
      <a href={hrefOf(null)}>library</a>{#if open}<span> / {open.shelf} / </span><b>{open.name}</b>{/if}
      <span class="crumb-theme">{theme.name} &middot; {modeOf(theme)} &middot; {ui.level}</span>
    </div>

    <div class="canvas" bind:this={canvas}>
      {#if open}
        {@const k = kv(open.id)}
        <div class="split">
          <section class="stage" data-stage={open.id}>
            <header class="bar"><span class="mono">{open.name}</span><span class="lbl">{open.kind}</span></header>
            <div class="stage-body"><Piece p={open} {k} uid="stage" /></div>
            <p class="blurb">{open.blurb}</p>
          </section>

          <section class="inspector">
            <details open>
              <summary class="lbl">Knobs</summary>
              <Knobs p={open} bind:k={() => kv(open.id), (v) => setKv(open.id, v)} />
            </details>
            <details open>
              <summary class="lbl">Markup</summary>
              <Markup text={open.markup(k)} />
            </details>
            <details>
              <summary class="lbl">Theme values &middot; {theme.name}</summary>
              <ThemeValues {theme} />
            </details>
          </section>
        </div>

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
      {:else}
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
    <p class="foot">A comp for the library’s look: labkit #83. Stand-ins are marked; everything else is the real piece.</p>
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
    grid-template-columns: 236px minmax(0, 1fr);
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
  .ctlrow { display: flex; flex-direction: column; gap: 4px; }
  .seg { display: flex; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }
  .seg button {
    flex: 1; appearance: none; border: none; background: none; color: var(--text-dim);
    font: inherit; font-size: .78rem; padding: 5px 0; cursor: pointer;
  }
  .seg button + button { border-left: 1px solid var(--line); }
  .seg button[aria-pressed='true'] { background: var(--surface-inset); color: var(--text); font-weight: 600; }
  .index { display: flex; flex-direction: column; gap: 6px; }
  .find { margin-bottom: 6px; }
  .index ul { list-style: none; margin: 0 0 8px; padding: 0; }
  .index a {
    display: flex; justify-content: space-between; padding: 3px 8px; border-radius: 4px;
    color: var(--text-dim); text-decoration: none; font-size: .84rem;
  }
  .index a:hover { background: var(--surface-inset); color: var(--text); }
  .index a[aria-current='page'] { background: var(--surface-inset); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }
  .si { font-size: .66rem; color: var(--text-faint); }

  .main { padding: 14px 20px 40px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .crumbs { font-size: .78rem; color: var(--text-dim); display: flex; flex-wrap: wrap; gap: 4px; }
  .crumbs a { color: var(--text-dim); }
  .crumbs b { color: var(--text); font-weight: 600; }
  .crumb-theme { margin-left: auto; }
  /* The themed area: its own ground, so the theme is seen whole. */
  .canvas { background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-width: 0; }
  .shelf-h, .states-h { margin: 18px 0 8px; display: flex; gap: 8px; }
  .shelf-h:first-child { margin-top: 0; }
  .count { color: var(--text-dim); }
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
  .tile-body { padding: 12px; display: flex; align-items: center; justify-content: center; min-height: 120px; flex: 1; }

  .split { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 12px; align-items: start; }
  .stage { border: 1px solid var(--line); border-radius: 6px; background: var(--surface); }
  .stage-body { padding: 28px 20px; display: flex; justify-content: center; align-items: center; min-height: 260px; }
  .blurb { margin: 0; padding: 8px 12px; border-top: 1px solid var(--line); font-size: .82rem; color: var(--text-dim); }
  .inspector { display: flex; flex-direction: column; gap: 8px; }
  details { border: 1px solid var(--line); border-radius: 6px; background: var(--surface); padding: 8px 12px 12px; }
  summary { cursor: pointer; padding: 2px 0 8px; }
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
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px;
    }
    .brand, .index { grid-column: 1 / -1; }
    /* The index becomes one row of links that scrolls inside itself. */
    .index { flex-direction: row; overflow-x: auto; gap: 4px; align-items: center; }
    .index > .lbl, .find { display: none; }
    .index ul { display: contents; }
    .index a { white-space: nowrap; border: 1px solid var(--line); }
    .main { padding: 10px 10px 32px; }
    .canvas { padding: 10px; }
    .crumb-theme { margin-left: 0; flex-basis: 100%; }
    .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .tile-body { padding: 8px; min-height: 100px; }
    .split { grid-template-columns: minmax(0, 1fr); }
    .states { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>
