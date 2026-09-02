/**
 * Theme resolution: an explicit choice, persisted.
 *
 * ⚠️ Deliberately NOT derived from `prefers-color-scheme`. An app in this kit
 * has an opinion about which surface suits it, and the toggle is how someone
 * overrides that opinion — not the other way round.
 *
 * ⚠️ One of the source apps resolves the default PER SCREEN (light on the one
 * screen used for long repetitive classification work, where a light ground is
 * less fatiguing). That indirection deliberately did NOT travel: it is a real
 * decision, but it belongs to an app that has such a screen. Two of the three
 * did not, and a kit that ships the more complicated shape teaches everyone to
 * carry it. Wrap this if you need per-screen defaults.
 */
import type { Mode } from './palette';

const KEY = 'labkit.theme';

export function storedPreference(): Mode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    // ⚠️ Private-mode Safari throws on localStorage. A theme preference is not
    // worth an exception that takes the whole app down.
    return null;
  }
}

export function setPreference(mode: Mode | null): void {
  try {
    if (mode === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch { /* see above */ }
}

/** Explicit choice wins; the app's own default otherwise. */
export function resolveMode(preference: Mode | null, fallback: Mode = 'dark'): Mode {
  return preference ?? fallback;
}
