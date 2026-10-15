<script lang="ts">
  /** One palette (or theme), one mode, every primitive.
   *
   *  ⚠️ The palette is applied to THIS ELEMENT, not to :root. That is the whole
   *  trick that lets three palettes render on one page — and it is why
   *  `applyPalette` takes a root parameter rather than assuming the document.
   *  Without it a gallery can only ever show one palette at a time, which is
   *  exactly the blind spot it exists to remove.
   */
  import { Section, StatRow, Rail, Meter, Field, applyPalette, auditPalette,
           applyTheme, auditTheme, modePalette, onAccentFor,
           type Mode, type Palette, type Theme, type MotionLevel } from 'labkit';

  /** Either a palette or a theme. A theme frame also wears the theme's type,
   *  surfaces and motion, at the motion level the page picked. */
  let { name, character, palette, theme, mode, level = 'full' }: {
    name: string;
    character: string;
    palette?: Palette;
    theme?: Theme;
    mode: Mode;
    level?: MotionLevel;
  } = $props();

  let el: HTMLDivElement;
  $effect(() => {
    if (!el) return;
    if (theme) applyTheme(theme, mode, level, el);
    else if (palette) applyPalette(mode, palette, el);
  });

  /** This frame's colours. ⚠️ A theme's are only there for a mode it ships;
   *  the page never asks for another, and applyTheme refuses one. */
  const values = $derived(theme ? theme.modes[mode]! : modePalette(palette!, mode));

  /** ⚠️ EVERY TOKEN THE KIT PROMISES, RESOLVED FROM THE LIVE ELEMENT.
   *
   *  Added after tokens.css shipped with its entire `:root` block missing — the
   *  spacing scale, radii, easing and font fallbacks, all gone, deleted by a
   *  careless string edit during extraction. Nothing failed. svelte-check was
   *  clean, the gallery rendered, and it looked plausible, because an undefined
   *  custom property does not warn: it silently falls back and the declaration
   *  is dropped.
   *
   *  A gallery that only renders components cannot see that. This asks the
   *  browser what each token actually resolves to. */
  const EXPECTED = [
    '--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6',
    '--radius-sm', '--radius', '--ease-out', '--ease-in',
    '--dur-state', '--dur-enter', '--font-ui', '--font-fig', '--fig-tracking',
    '--bg', '--surface', '--surface-inset', '--line',
    '--text', '--text-dim', '--text-faint',
    '--accent', '--on-accent', '--tone-pos', '--tone-neg', '--floor',
    '--font-display', '--enter-y', '--enter-scale', '--glass', '--grain', '--glow',
  ];
  let missing = $state<string[]>([]);
  $effect(() => {
    if (!el) return;
    const cs = getComputedStyle(el);
    missing = EXPECTED.filter((t) => !cs.getPropertyValue(t).trim());
  });

  // ⚠️ Printed on screen, not asserted in a comment. A token at 2.64:1 looked
  // like a design decision for months; a number next to it does not.
  const audit = $derived(
    (theme ? auditTheme(theme) : auditPalette(palette)).checks.filter((c) => c.mode === mode)
  );

  const swatches = $derived([
    { name: 'surface', value: values.ink.surface },
    { name: 'raised', value: values.ink.surfaceRaised },
    { name: 'inset', value: values.ink.surfaceInset },
    { name: 'line', value: values.ink.line },
    { name: 'text', value: values.ink.text },
    { name: 'text-dim', value: values.ink.textDim },
    { name: 'text-faint', value: values.ink.textFaint },
    { name: 'tone-pos', value: values.status.pos },
    { name: 'tone-neg', value: values.status.neg },
    { name: 'accent', value: values.accent },
    { name: 'on-accent', value: onAccentFor(values) },
  ]);
</script>

<div class="frame" bind:this={el} data-mode={mode} data-theme={theme?.name}>
  <header class="fh">
    <span class="lbl">{name} &middot; {mode}{theme ? ` · theme · motion ${level}` : ''}</span>
    <span class="lbl ch">{character}</span>
  </header>

  <!-- Keyed on the level so a theme frame plays its entrance again when the
       level changes: the difference between full and calm is something to
       see, not only to read off a token. -->
  {#key level}
  <div class="body" class:enter={!!theme}>
    {#if missing.length}
      <p class="notice neg">
        {missing.length} token(s) undefined: {missing.join(', ')} — every rule
        using them was silently dropped.
      </p>
    {/if}

    <Section title="The palette" note="The values themselves. Added after the first render, when two frames turned out to be indistinguishable on screen because they share an ink ramp and differ only in an accent that barely appears in a component.">
      <div class="swatches">
        {#each swatches as sw (sw.name)}
          <div class="sw">
            <span class="chip" style:background={sw.value}
                  style:border-color={sw.value}></span>
            <span class="lbl">{sw.name}</span>
            <span class="mono val">{sw.value}</span>
          </div>
        {/each}
      </div>
    </Section>

    <Section title="Contrast" meta="measured" note="Every token that paints text, against this frame's own surface, and the button label against the accent. 4.5:1 for text, 3:1 for the focus ring.">
      <table>
        <thead>
          <tr><th>token</th><th class="r">ratio</th><th class="r">need</th><th></th></tr>
        </thead>
        <tbody>
          {#each audit as c (c.token)}
            <tr>
              <td class="mono">{c.token}{c.on === 'accent' ? ' on accent' : ''}</td>
              <td class="r mono ratio">{c.ratio.toFixed(2)}:1</td>
              <td class="r mono">{c.required}</td>
              <td class="r"><Rail code={c.passes ? 'PASS' : 'FAIL'}
                                  tone={c.passes ? 'pos' : 'neg'} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Section>

    <Section title="StatRow" note="Label, figure, caveat. One `big` per screen at most.">
      <StatRow label="Net this month" value="+$412.90" tone="pos" big
               sub="income − spend, confirmed only">
        <Rail code="LEDGER" tone="pos" asOf="synced 4 minutes ago" />
      </StatRow>
      <StatRow label="Spend" value="$3,140.12" tone="neg" sub="excludes pending" />
      <StatRow label="Awaiting review" value="7" tone="attention"
               sub="attention is FORM here — a weight change, never a third hue" />
      <StatRow label="Accounts" value="3" />
      {#snippet footer()}
        The caveat sits in <code>--text-dim</code>, not <code>--text-faint</code>:
        it is prose someone has to read, and the faint step is for labels whose
        job is to recede.
      {/snippet}
    </Section>

    <Section title="Rail" note="A tick, a short code, a qualifier. Four tones — and the third state is form, not a third hue.">
      <div class="stack">
        <Rail code="ACTIVE" tone="pos" asOf="last seen 3 hours ago" />
        <Rail code="INVITED" tone="attention" asOf="link expires in 6 days" />
        <Rail code="STOPPED" tone="neg" asOf="deactivated in March" />
        <Rail code="EST" asOf="computed, not observed" note="no source" />
      </div>
    </Section>

    <Section title="Meter" note="Takes a tone, never a value-to-colour rule: 90% of a spending target is a warning, 90% of a savings goal is good news.">
      <div class="stack">
        <div><span class="lbl">Savings goal &middot; 72%</span><Meter value={72} tone="pos" label="Savings goal" /></div>
        <div><span class="lbl">Spending target &middot; 94%</span><Meter value={94} tone="neg" label="Spending target" /></div>
        <div><span class="lbl">Needs a look &middot; 55%</span><Meter value={55} tone="attention" label="Needs a look" /></div>
        <div><span class="lbl">Neutral &middot; 40%</span><Meter value={40} label="Neutral" /></div>
      </div>
    </Section>

    <Section title="Field and controls" note="The kit extracted from data apps alone would have shipped with no way to build a form at all.">
      <Field label="Email" id={`e-${name}-${mode}`} hint="Read before the mistake, not after it.">
        <input class="ctl" id={`e-${name}-${mode}`} type="email" placeholder="you@example.com" />
      </Field>
      <Field label="Role" id={`r-${name}-${mode}`}>
        <select class="ctl" id={`r-${name}-${mode}`}>
          <option>Member</option><option>Admin</option>
        </select>
      </Field>
      <Field label="Password" id={`p-${name}-${mode}`} error="That does not match.">
        <input class="ctl" id={`p-${name}-${mode}`} type="password" value="wrong" />
      </Field>
      <div class="row-btn">
        <button class="btn primary">Primary</button>
        <button class="btn">Default</button>
        <button class="btn neg">Destructive</button>
        <button class="btn" disabled>Disabled</button>
        <button class="btn small">Small</button>
      </div>
    </Section>

    <Section title="The seven states" note="rest · hover · focus-visible · active · disabled · loading · empty. Most kits ship two. Tab through these — the ring is never removed to tidy a design.">
      <div class="row-btn">
        <button class="btn">rest</button>
        <button class="btn">hover me</button>
        <button class="btn">tab to me</button>
        <button class="btn" disabled>disabled</button>
        <button class="btn is-loading">loading</button>
      </div>
      <p class="empty">
        Nothing here yet. An empty state says what would appear and how to make
        it appear — never just &ldquo;No data&rdquo;.
      </p>
    </Section>

    <Section title="Notice" note="Often a refusal with a reason rather than a failure. Stated plainly, not shouted.">
      <p class="notice">Neutral — something worth knowing.</p>
      <p class="notice pos">Done. Every other session was signed out.</p>
      <p class="notice neg">That would leave no active administrator.</p>
    </Section>

    {#if theme}
      <Section title="Surface" note="A .surface panel wearing this theme's glass, grain and glow. All three at 0 is a plain raised panel.">
        <div class="surface demo">
          glass <span class="mono">{theme.surfaces.glass}px</span> &middot;
          grain <span class="mono">{theme.surfaces.grain}</span> &middot;
          glow <span class="mono">{theme.surfaces.glow}</span>
        </div>
      </Section>
    {/if}
  </div>
  {/key}
</div>

<style>
  /* ⚠️ Layout only. The frame contributes NO colour of its own — every colour
     inside comes from the palette stamped onto this element. If this stylesheet
     ever needs a hex, labkit has grown a fourth identity. */
  .frame {
    border: 1px solid #8884;
    border-radius: 10px;
    overflow: hidden;
    min-width: 0;
  }
  .fh {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
  }
  .ch { text-transform: none; letter-spacing: .02em; font-weight: 400; }
  .body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .stack { display: flex; flex-direction: column; gap: 12px; }

  .swatches { display: flex; flex-direction: column; gap: 6px; }
  .sw { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 10px; }
  /* A ring, so a swatch the same colour as the surface is still visible —
     otherwise `surface` and `raised` render as two blank rows. */
  .chip {
    width: 22px; height: 14px; border-radius: 3px;
    border: 1px solid var(--line);
    box-shadow: 0 0 0 1px var(--line);
  }
  .val { font-size: .68rem; color: var(--text-dim); }
  /* The measured number is what the table is for; it reads first. */
  .ratio { font-weight: 700; }
  .row-btn { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .demo { padding: 14px 16px; font-size: .8rem; color: var(--text-dim); }
</style>
