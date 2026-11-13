<script lang="ts">
  /** The markup for a piece at its knob values, and a copy button. */
  import { copyText } from './catalog';

  let { text }: { text: string } = $props();
  let said = $state('');

  async function copy() {
    said = (await copyText(text)) ? 'Copied' : 'This page may not copy: select the text instead';
    setTimeout(() => (said = ''), 2400);
  }
</script>

<div class="markup">
  <pre><code>{text}</code></pre>
  <div class="bar">
    <button class="btn small" type="button" onclick={copy}>Copy</button>
    <span class="said" role="status">{said}</span>
  </div>
</div>

<style>
  .markup { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  pre {
    margin: 0; padding: 12px 14px; overflow-x: auto;
    background: var(--surface-inset); border-radius: var(--radius-sm);
    font-size: .76rem; line-height: 1.55;
  }
  /* The global `code` style pads and wraps a word; a block wants neither. */
  pre code { background: none; padding: 0; font-size: inherit; word-break: normal; white-space: pre; }
  .bar { display: flex; align-items: center; gap: 10px; }
  .said { font-size: .75rem; color: var(--text-dim); }
</style>
