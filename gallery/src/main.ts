import { mount } from 'svelte';
// ⚠️ The real stylesheet from the package, not a copy. See vite.config.ts.
import 'labkit/tokens.css';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });
