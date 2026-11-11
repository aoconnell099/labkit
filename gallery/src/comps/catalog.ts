/**
 * What the three library comps (labkit #83) show: every piece by shelf, its
 * knobs, its states and its markup, and the current theme's knob values.
 *
 * ⚠️ One list for all three comps. They differ in layout and mood only, so the
 * owner compares looks, not three slightly different inventories.
 *
 * ⚠️ A comp is a look, not the site. Pieces marked `standIn` are not built: the
 * tile says so on screen. Everything else is the real piece from `labkit` or
 * `labkit/effects`, or a real class from tokens.css.
 */
import { onAccentFor, shippedModes, type Mode, type Theme } from 'labkit';
import { CHOSEN } from '../palettes';

export type Shelf = 'components' | 'effects' | 'motion';
export const SHELVES: { id: Shelf; name: string; blurb: string }[] = [
  { id: 'components', name: 'Components', blurb: 'The Svelte pieces and the classes in tokens.css.' },
  { id: 'effects', name: 'Effects', blurb: 'Set pieces from labkit/effects. Each reads its colour, glow and pace from the theme.' },
  { id: 'motion', name: 'Motion', blurb: 'How things move, set by the theme and the motion level.' },
];

/** A knob: one of the piece's own props or attributes, with a control. */
export type Knob =
  | { key: string; label: string; kind: 'text'; value: string }
  | { key: string; label: string; kind: 'range'; value: number; min: number; max: number }
  | { key: string; label: string; kind: 'select'; value: string; options: string[] }
  | { key: string; label: string; kind: 'toggle'; value: boolean };
export type KnobValues = Record<string, string | number | boolean>;

export interface Piece {
  id: string;
  name: string;
  shelf: Shelf;
  /** One line: what it is for. */
  blurb: string;
  /** How an app gets it: a component, a class, or a custom element. */
  kind: 'component' | 'class' | 'element' | 'stand-in';
  knobs: Knob[];
  /** The markup for these knob values. */
  markup: (k: KnobValues) => string;
}

const TONES = ['neutral', 'pos', 'neg', 'attention'];
const attr = (name: string, v: unknown, skip?: unknown) =>
  v === skip || v === '' ? '' : typeof v === 'number' ? ` ${name}={${v}}` : ` ${name}="${v}"`;
const flag = (name: string, on: unknown) => (on ? ` ${name}` : '');
const IMPORT = (names: string) => `<script>\n  import { ${names} } from 'labkit';\n</script>\n\n`;
const EFFECT = `<script>\n  import 'labkit/effects';\n</script>\n\n`;

export const PIECES: Piece[] = [
  {
    id: 'section', name: 'Section', shelf: 'components', kind: 'component',
    blurb: 'A titled region: a hairline and whitespace instead of a box.',
    knobs: [
      { key: 'title', label: 'title', kind: 'text', value: 'This month' },
      { key: 'meta', label: 'meta', kind: 'text', value: '30 days' },
      { key: 'note', label: 'note', kind: 'text', value: 'Confirmed rows only.' },
    ],
    markup: (k) => `${IMPORT('Section')}<Section${attr('title', k.title)}${attr('meta', k.meta)}${attr('note', k.note)}>\n  …\n</Section>`,
  },
  {
    id: 'statrow', name: 'StatRow', shelf: 'components', kind: 'component',
    blurb: 'One figure with its label and its caveat.',
    knobs: [
      { key: 'label', label: 'label', kind: 'text', value: 'Net this month' },
      { key: 'value', label: 'value', kind: 'text', value: '+$412.90' },
      { key: 'sub', label: 'sub', kind: 'text', value: 'income − spend' },
      { key: 'tone', label: 'tone', kind: 'select', value: 'pos', options: TONES },
      { key: 'big', label: 'big', kind: 'toggle', value: true },
    ],
    markup: (k) => `${IMPORT('StatRow')}<StatRow${attr('label', k.label)}${attr('value', k.value)}${attr('sub', k.sub)}${attr('tone', k.tone, 'neutral')}${flag('big', k.big)} />`,
  },
  {
    id: 'rail', name: 'Rail', shelf: 'components', kind: 'component',
    blurb: 'A tick, a short code and a qualifier. The third state is form, not a hue.',
    knobs: [
      { key: 'code', label: 'code', kind: 'text', value: 'ACTIVE' },
      { key: 'asOf', label: 'asOf', kind: 'text', value: 'last seen 3 hours ago' },
      { key: 'note', label: 'note', kind: 'text', value: '' },
      { key: 'tone', label: 'tone', kind: 'select', value: 'pos', options: TONES },
    ],
    markup: (k) => `${IMPORT('Rail')}<Rail${attr('code', k.code)}${attr('asOf', k.asOf)}${attr('note', k.note)}${attr('tone', k.tone, 'neutral')} />`,
  },
  {
    id: 'meter', name: 'Meter', shelf: 'components', kind: 'component',
    blurb: 'A track and a fill. It takes a tone, never a value-to-colour rule.',
    knobs: [
      { key: 'value', label: 'value', kind: 'range', value: 72, min: 0, max: 100 },
      { key: 'tone', label: 'tone', kind: 'select', value: 'pos', options: TONES },
      { key: 'label', label: 'label', kind: 'text', value: 'Savings goal' },
    ],
    markup: (k) => `${IMPORT('Meter')}<Meter${attr('value', k.value)}${attr('tone', k.tone, 'neutral')}${attr('label', k.label)} />`,
  },
  {
    id: 'field', name: 'Field', shelf: 'components', kind: 'component',
    blurb: 'A labelled control: the label wired, the hint first, the error announced.',
    knobs: [
      { key: 'label', label: 'label', kind: 'text', value: 'Email' },
      { key: 'hint', label: 'hint', kind: 'text', value: 'We send the link here.' },
      { key: 'error', label: 'error', kind: 'text', value: '' },
    ],
    markup: (k) => `${IMPORT('Field')}<Field${attr('label', k.label)} id="email"${attr('hint', k.hint)}${attr('error', k.error)}>\n  <input class="ctl" id="email" type="email" />\n</Field>`,
  },
  {
    id: 'button', name: 'Button', shelf: 'components', kind: 'class',
    blurb: 'Three weights, by consequence: default, primary, destructive.',
    knobs: [
      { key: 'text', label: 'text', kind: 'text', value: 'Save changes' },
      { key: 'weight', label: 'weight', kind: 'select', value: 'primary', options: ['default', 'primary', 'neg'] },
      { key: 'small', label: 'small', kind: 'toggle', value: false },
    ],
    markup: (k) => `<button class="btn${k.weight === 'default' ? '' : ` ${k.weight}`}${k.small ? ' small' : ''}">${k.text}</button>`,
  },
  {
    id: 'notice', name: 'Notice', shelf: 'components', kind: 'class',
    blurb: 'Often a refusal with a reason. Stated plainly, not shouted.',
    knobs: [
      { key: 'text', label: 'text', kind: 'text', value: 'That would leave no active administrator.' },
      { key: 'tone', label: 'tone', kind: 'select', value: 'neg', options: ['neutral', 'pos', 'neg'] },
    ],
    markup: (k) => `<p class="notice${k.tone === 'neutral' ? '' : ` ${k.tone}`}">${k.text}</p>`,
  },
  {
    id: 'table', name: 'Table', shelf: 'components', kind: 'class',
    blurb: 'Hairline rules, no box, small tracked-out headers.',
    knobs: [{ key: 'rows', label: 'rows', kind: 'range', value: 3, min: 0, max: 5 }],
    markup: () => `<div class="scroll-x">\n  <table>\n    <thead><tr><th>Item</th><th class="r">Amount</th></tr></thead>\n    <tbody><tr><td>…</td><td class="r fig">…</td></tr></tbody>\n  </table>\n</div>`,
  },
  {
    id: 'surface', name: 'Surface', shelf: 'components', kind: 'class',
    blurb: 'A raised panel wearing the theme’s glass, grain and glow.',
    knobs: [{ key: 'text', label: 'text', kind: 'text', value: 'A raised panel.' }],
    markup: (k) => `<div class="surface">${k.text}</div>`,
  },
  {
    id: 'tabs', name: 'Tabs', shelf: 'components', kind: 'stand-in',
    blurb: 'Stand-in: not built yet. Shown so the shelf’s shape is clear.',
    knobs: [],
    markup: () => '<!-- Not built yet. -->',
  },
  {
    id: 'toast', name: 'Toast', shelf: 'components', kind: 'stand-in',
    blurb: 'Stand-in: not built yet. Shown so the shelf’s shape is clear.',
    knobs: [],
    markup: () => '<!-- Not built yet. -->',
  },

  {
    id: 'filament-orb', name: 'Filament orb', shelf: 'effects', kind: 'element',
    blurb: 'A glass ball of light threads in the accent.',
    knobs: [{ key: 'cloud', label: 'cloud', kind: 'toggle', value: false }],
    markup: (k) => `${EFFECT}<labkit-filament-orb${flag('cloud', k.cloud)}></labkit-filament-orb>`,
  },
  {
    id: 'planet-orb', name: 'Planet orb', shelf: 'effects', kind: 'element',
    blurb: 'A small world in the accent, or in a tint of its own.',
    knobs: [
      { key: 'tint', label: '--effect-tint', kind: 'text', value: '' },
      { key: 'rainbow', label: 'rainbow', kind: 'toggle', value: false },
    ],
    markup: (k) => `${EFFECT}<labkit-planet-orb${k.tint ? ` style="--effect-tint: ${k.tint}"` : ''}${flag('rainbow', k.rainbow)}></labkit-planet-orb>`,
  },
  {
    id: 'orbit-rings', name: 'Orbit rings', shelf: 'effects', kind: 'element',
    blurb: 'Rings that frame an orb set inside them.',
    knobs: [],
    markup: () => `${EFFECT}<labkit-orbit-rings>\n  <labkit-filament-orb></labkit-filament-orb>\n</labkit-orbit-rings>`,
  },
  {
    id: 'dials', name: 'Dials', shelf: 'effects', kind: 'element',
    blurb: 'The same frame, flat and facing you.',
    knobs: [],
    markup: () => `${EFFECT}<labkit-dials>\n  <labkit-filament-orb></labkit-filament-orb>\n</labkit-dials>`,
  },
  {
    id: 'tendrils', name: 'Tendrils', shelf: 'effects', kind: 'element',
    blurb: 'Vines of light between two points the app gives.',
    knobs: [{ key: 'variant', label: 'variant', kind: 'select', value: 'vine', options: ['vine', 'twist', 'bundle'] }],
    markup: (k) => `${EFFECT}<labkit-tendrils variant="${k.variant}" style="position: absolute; inset: 0"></labkit-tendrils>\n<!-- then: el.tendrils = [{ id: 'a', from: [40, 40], to: [300, 220] }] -->`,
  },
  {
    id: 'star-dust', name: 'Star dust', shelf: 'effects', kind: 'element',
    blurb: 'A field of stars behind everything, with a sky if you want one.',
    knobs: [{ key: 'sky', label: 'sky', kind: 'select', value: '', options: ['', 'deep-blue', 'violet', 'colourful'] }],
    markup: (k) => `${EFFECT}<labkit-star-dust${attr('sky', k.sky)} style="position: absolute; inset: 0"></labkit-star-dust>`,
  },
  {
    id: 'orbits', name: 'Orbit paths', shelf: 'effects', kind: 'element',
    blurb: 'Paths round a centre for the app’s own orbs to ride.',
    knobs: [{ key: 'paths', label: 'paths', kind: 'range', value: 2, min: 1, max: 3 }],
    markup: () => `${EFFECT}<labkit-orbits style="position: absolute; inset: 0"></labkit-orbits>\n<!-- then: el.orbits = [{ id: 'inner', radius: 0.6, items: 2 }] -->`,
  },
  {
    id: 'planet-inside', name: 'Inside a planet', shelf: 'effects', kind: 'element',
    blurb: 'The level an app dives into: smoke in the planet’s colour.',
    knobs: [{ key: 'rainbow', label: 'rainbow', kind: 'toggle', value: false }],
    markup: (k) => `${EFFECT}<labkit-planet-inside${flag('rainbow', k.rainbow)}></labkit-planet-inside>`,
  },

  {
    id: 'entrance', name: 'Entrance', shelf: 'motion', kind: 'class',
    blurb: 'One entrance for everything: a fade, plus the theme’s rise or scale.',
    knobs: [],
    markup: () => `<div class="enter">…</div>`,
  },
  {
    id: 'loading', name: 'Loading', shelf: 'motion', kind: 'class',
    blurb: 'A pulse under full; a still, dimmed look under calm and off.',
    knobs: [],
    markup: () => `<button class="btn is-loading">Saving</button>`,
  },
  {
    id: 'state-change', name: 'State change', shelf: 'motion', kind: 'class',
    blurb: 'Hover and press, at the theme’s state duration. Transform and opacity only.',
    knobs: [],
    markup: () => `<button class="btn">Press me</button>`,
  },
];

export const piece = (id: string) => PIECES.find((p) => p.id === id);
export const defaults = (p: Piece): KnobValues => Object.fromEntries(p.knobs.map((k) => [k.key, k.value]));

/** The seven interaction states (labkit's rule 4), and how to see each on a live piece. */
export const STATES = ['rest', 'hover', 'focus-visible', 'active', 'disabled', 'loading', 'empty'] as const;
export type State = (typeof STATES)[number];
export const STATE_HOW: Record<State, string> = {
  rest: 'as it sits',
  hover: 'point at it',
  'focus-visible': 'tab to it',
  active: 'press it',
  disabled: 'disabled',
  loading: 'loading',
  empty: 'nothing to show',
};

const INTERACTIVE: State[] = ['rest', 'hover', 'focus-visible', 'active', 'disabled', 'loading'];
/** The states a piece has. The rest are shown as "does not apply", never hidden. */
export function statesOf(p: Piece): State[] {
  if (p.kind === 'stand-in') return ['rest'];
  if (p.shelf === 'effects') return ['rest', 'hover', 'active'];
  switch (p.id) {
    case 'button': case 'state-change': return INTERACTIVE;
    case 'field': return [...INTERACTIVE, 'empty'];
    case 'section': case 'statrow': case 'meter': case 'table': return ['rest', 'loading', 'empty'];
    case 'entrance': return ['rest'];
    case 'loading': return ['loading'];
    default: return ['rest', 'loading'];
  }
}

/** The themes the picker offers: labkit's chosen thirteen, each in the mode it ships. */
export const THEMES = CHOSEN.map((c) => c.theme);
export const themeNamed = (name: string) => THEMES.find((t) => t.name === name) ?? THEMES[0];
export const modeOf = (t: Theme): Mode => shippedModes(t)[0];
export const LEVELS = ['full', 'calm', 'off'] as const;

/** The theme's knob values, as the side panel prints them. */
export function themeKnobs(t: Theme): { group: string; rows: { name: string; value: string; swatch?: boolean }[] }[] {
  const m = modeOf(t);
  const v = t.modes[m]!;
  return [
    {
      group: `colour · ${m}`,
      rows: [
        { name: 'accent', value: v.accent, swatch: true },
        { name: 'on-accent', value: onAccentFor(v), swatch: true },
        { name: 'bg', value: v.ink.surface, swatch: true },
        { name: 'surface', value: v.ink.surfaceRaised, swatch: true },
        { name: 'surface-inset', value: v.ink.surfaceInset, swatch: true },
        { name: 'line', value: v.ink.line, swatch: true },
        { name: 'text', value: v.ink.text, swatch: true },
        { name: 'text-dim', value: v.ink.textDim, swatch: true },
        { name: 'text-faint', value: v.ink.textFaint, swatch: true },
        { name: 'tone-pos', value: v.status.pos, swatch: true },
        { name: 'tone-neg', value: v.status.neg, swatch: true },
      ],
    },
    {
      group: 'surfaces',
      rows: [
        { name: 'glass', value: `${t.surfaces.glass}px` },
        { name: 'grain', value: String(t.surfaces.grain) },
        { name: 'glow', value: String(t.surfaces.glow) },
      ],
    },
    {
      group: 'motion',
      rows: [
        { name: 'dur-state', value: `${t.motion.durState}ms` },
        { name: 'dur-enter', value: `${t.motion.durEnter}ms` },
        { name: 'enter', value: t.motion.enter },
      ],
    },
    {
      group: 'type',
      rows: [
        { name: 'ui', value: firstFace(t.type.ui) },
        { name: 'fig', value: firstFace(t.type.fig) },
        { name: 'display', value: firstFace(t.type.display ?? t.type.ui) },
      ],
    },
  ];
}
const firstFace = (stack: string) => stack.split(',')[0].replace(/['"]/g, '').trim();

/** Copy text; false where the page may not (a sandboxed preview), so the comp
 *  can say "select and copy" instead of pretending. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
