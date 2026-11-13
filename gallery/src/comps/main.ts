/**
 * The entry for the three library comps (labkit #83). Each comp is its own page
 * in comps/, and names itself on its <body data-comp>.
 */
import { mount, type Component } from 'svelte';
// ⚠️ The real stylesheet and the real effects, as in the gallery (vite.config.ts).
import 'labkit/tokens.css';
import 'labkit/effects';
import { webglContexts, webglShared } from 'labkit/effects';
import Specimen from './Specimen.svelte';
import Workbench from './Workbench.svelte';
import ShopWindow from './ShopWindow.svelte';

/** What went wrong on the page, for the render check: errors, failed promises and
 *  console errors, each as text. It reads `window.compErrors`. */
const errors: string[] = [];
Object.assign(window, { compErrors: errors });
addEventListener('error', (e) => errors.push(String(e.message)));
addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
const consoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '));
  consoleError(...args);
};

// A home shows up to eight effects at once: they share one WebGL context
// (labkit/effects base.ts) rather than ask the browser for eight.
document.documentElement.dataset.labkitGl = 'shared';
/** The WebGL contexts the page's pieces hold, as the gallery's `labkitWebgl`. */
Object.assign(window, { labkitWebgl: () => ({ contexts: webglContexts(), shared: webglShared() }) });

const COMPS: Record<string, Component> = { specimen: Specimen, workbench: Workbench, 'shop-window': ShopWindow };
const name = document.body.dataset.comp ?? 'specimen';
mount(COMPS[name] ?? Specimen, { target: document.getElementById('app')! });
document.documentElement.dataset.comp = name;
