import { mount } from 'svelte';
// ⚠️ The real stylesheet from the package, not a copy. See vite.config.ts.
import 'labkit/tokens.css';
import App from './App.svelte';

// `?gl=shared`: the effects share one WebGL context from the start (labkit/effects base.ts),
// so the render check sees that way of drawing as well as the default one.
if (new URLSearchParams(location.search).get('gl') === 'shared') {
  document.documentElement.dataset.labkitGl = 'shared';
}

export default mount(App, { target: document.getElementById('app')! });
