<script lang="ts">
  /** Comp A, "Specimen book": quiet, one column, the pieces do the talking.
   *
   *  The whole page wears the picked theme, so its light or dark comes from the
   *  theme: six of the thirteen ship light, seven dark. Theme chips each show
   *  their own ground and accent; a piece's page sets the live stage beside the
   *  theme's knob values. */
  import { applyTheme, Section } from 'labkit';
  import { PIECES, SHELVES, STATES, STATE_HOW, THEMES, LEVELS, statesOf, themeNamed, modeOf, piece } from './catalog';
  import { ui, kv, setKv } from './ui.svelte';
  import { route, hrefOf } from './route.svelte';
  import Piece from './Piece.svelte';
  import Knobs from './Knobs.svelte';
  import Markup from './Markup.svelte';
  import ThemeValues from './ThemeValues.svelte';

  ui.theme ||= 'Film page';
  const theme = $derived(themeNamed(ui.theme));
  $effect(() => applyTheme(theme, modeOf(theme), ui.level, document.documentElement));

  const open = $derived(route.piece ? piece(route.piece)! : null);
</script>

<main class="book" data-screen={open ? 'piece' : 'home'}>
  <header class="top">
    <a class="lbl home" href={hrefOf(null)}>labkit &middot; specimen book</a>
    {#if open}
      <h1>{open.name}</h1>
      <p class="lede">{open.blurb}</p>
    {:else}
      <h1>The library</h1>
      <p class="lede">
        Every piece, live, in the theme you pick. {PIECES.length} pieces on three shelves.
      </p>
    {/if}

    <nav class="chips" aria-label="Theme">
      {#each THEMES as t (t.name)}
        {@const v = t.modes[modeOf(t)]!}
        <button type="button" class="chip" aria-pressed={t.name === ui.theme}
                style:background={v.ink.surface} style:color={v.ink.text} style:border-color={v.ink.line}
                onclick={() => (ui.theme = t.name)}>
          <span class="dot" style:background={v.accent}></span>{t.name}
        </button>
      {/each}
    </nav>
    <div class="motion" role="group" aria-label="Motion">
      <span class="lbl">motion</span>
      {#each LEVELS as l (l)}
        <button type="button" class="lvl" aria-pressed={l === ui.level} onclick={() => (ui.level = l)}>{l}</button>
      {/each}
      <span class="lbl ch">{theme.character}</span>
    </div>
  </header>

  {#if open}
    {@const k = kv(open.id)}
    <a class="back" href={hrefOf(null)}>&larr; all pieces</a>
    <div class="spread">
      <div class="stage" data-stage={open.id}>
        <Piece p={open} {k} uid="stage" />
      </div>
      <aside class="beside">
        <span class="lbl">{theme.name}</span>
        <ThemeValues {theme} />
      </aside>
    </div>

    <Section title="States" meta={`${statesOf(open).length} of 7`}>
      <ol class="states">
        {#each STATES as st (st)}
          <li>
            <span class="sn"><span class="mono">{st}</span><span class="how">{STATE_HOW[st]}</span></span>
            <div class="sp"><Piece p={open} {k} at={st} uid={`s-${st}`} /></div>
          </li>
        {/each}
      </ol>
    </Section>

    <Section title="Knobs" meta={open.kind}>
      <Knobs p={open} bind:k={() => kv(open.id), (v) => setKv(open.id, v)} />
    </Section>

    <Section title="Markup">
      <Markup text={open.markup(k)} />
    </Section>
  {:else}
    {#each SHELVES as shelf (shelf.id)}
      {@const list = PIECES.filter((p) => p.shelf === shelf.id)}
      <Section title={shelf.name} meta={String(list.length)} note={shelf.blurb}>
        <ol class="specimens">
          {#each list as p, i (p.id)}
            <li class="specimen" data-tile={p.id}>
              <div class="sh">
                <span class="mono num">{String(i + 1).padStart(2, '0')}</span>
                <a class="name" href={hrefOf(p.id)}>{p.name}</a>
                <span class="lbl">{p.kind}</span>
              </div>
              <div class="tile-stage"><Piece p={p} k={kv(p.id)} uid={`t-${p.id}`} /></div>
              <p class="blurb">{p.blurb}</p>
            </li>
          {/each}
        </ol>
      </Section>
    {/each}
  {/if}
  <p class="foot">A comp for the library’s look: labkit #83. Stand-ins are marked; everything else is the real piece.</p>
</main>

<style>
  /* Layout only: every colour is the picked theme's. */
  .book {
    max-width: 760px;
    margin: 0 auto;
    padding: 28px 20px 60px;
    display: flex;
    flex-direction: column;
    gap: 34px;
    position: relative;
    font-size: 15px;
    line-height: 1.55;
  }
  .top { display: flex; flex-direction: column; gap: 12px; }
  .home { text-decoration: none; }
  h1 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(2rem, 7vw, 3.2rem);
    line-height: 1.05;
    margin: 6px 0 0;
    letter-spacing: -.01em;
  }
  .lede { margin: 0; color: var(--text-dim); max-width: 52ch; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip {
    display: inline-flex; align-items: center; gap: 7px;
    font: inherit; font-size: .74rem; padding: 4px 10px 4px 6px;
    border: 1px solid; border-radius: 999px; cursor: pointer;
    transition: transform var(--dur-state) var(--ease-out);
  }
  .chip:active { transform: translateY(1px); }
  .chip[aria-pressed='true'] { outline: 2px solid var(--accent); outline-offset: 1px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .motion { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
  .lvl {
    appearance: none; background: none; border: none; padding: 2px 0; font: inherit;
    font-size: .85rem; color: var(--text-dim); cursor: pointer;
  }
  .lvl[aria-pressed='true'] { color: var(--text); text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--accent); }
  .ch { text-transform: none; letter-spacing: .02em; font-weight: 400; flex-basis: 100%; }

  .specimens, .states { list-style: none; margin: 0; padding: 0; }
  .specimen { padding: 18px 0 22px; border-bottom: 1px solid var(--line); }
  .specimen:last-child { border-bottom: none; }
  .sh { display: flex; align-items: baseline; gap: 12px; }
  .num { color: var(--text-faint); font-size: .75rem; }
  .name {
    font-family: var(--font-display); font-size: 1.35rem; color: var(--text);
    text-decoration: none; flex: 1;
  }
  .name::after { content: ' →'; color: var(--accent); }
  .name:hover { text-decoration: underline; text-decoration-color: var(--accent); }
  .tile-stage { margin: 14px 0 8px; display: flex; justify-content: center; }
  .tile-stage :global(.fx) { max-width: 320px; }
  .blurb { margin: 0; font-size: .85rem; color: var(--text-dim); }

  .back { font-size: .85rem; color: var(--text-dim); margin-bottom: -18px; }
  .spread { display: grid; grid-template-columns: minmax(0, 1fr) 210px; gap: 28px; align-items: start; }
  .stage {
    padding: 28px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    display: flex; justify-content: center; min-height: 220px; align-items: center;
  }
  .beside { display: flex; flex-direction: column; gap: 10px; position: sticky; top: 16px; }
  .states li {
    display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 16px; align-items: center;
    padding: 12px 0; border-bottom: 1px solid var(--line);
  }
  .states li:last-child { border-bottom: none; }
  .sn { display: flex; flex-direction: column; }
  .how { font-size: .75rem; color: var(--text-faint); }
  .sp :global(.fx) { max-width: 200px; }
  .foot { margin: 0; font-size: .75rem; color: var(--text-faint); }

  @media (max-width: 640px) {
    .book { padding: 20px 16px 48px; gap: 28px; }
    .spread { grid-template-columns: minmax(0, 1fr); }
    .beside { position: static; }
    .states li { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .sn { flex-direction: row; gap: 10px; align-items: baseline; }
  }
</style>
