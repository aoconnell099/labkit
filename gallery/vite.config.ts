import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [svelte()],

  // Served under /labkit/ on the homelab box, behind identity. Design decisions
  // here get made by looking at a phone, so it has to be reachable from one.
  base: '/labkit/',

  resolve: {
    alias: {
      // ⚠️ The REAL source, not a copy. A gallery built from copies is a mockup
      // that drifts — and it gets believed precisely because it looks
      // authoritative. If this alias is ever pointed at a snapshot, the gallery
      // stops being evidence.
      labkit: fileURLToPath(new URL('../src', import.meta.url)),
    },
  },

  server: { port: 5178, host: '127.0.0.1' },
  build: { outDir: 'dist', cssMinify: false },
});
