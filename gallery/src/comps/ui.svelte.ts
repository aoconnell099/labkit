/** A comp page's state: which theme, which motion level, and each piece's knob
 *  values. One page holds one comp, so this is that comp's. The screen is in
 *  route.svelte.ts. */
import type { MotionLevel } from 'labkit';
import { defaults, piece, type KnobValues } from './catalog';

export const ui = $state({
  theme: '',
  level: 'full' as MotionLevel,
  knobs: {} as Record<string, KnobValues>,
});

/** A piece's knob values: as last set on its page, or its defaults. The home's
 *  tiles read the same, so a tweak shows there too. */
export const kv = (id: string): KnobValues => ui.knobs[id] ?? defaults(piece(id)!);
export const setKv = (id: string, v: KnobValues) => {
  ui.knobs[id] = v;
};
