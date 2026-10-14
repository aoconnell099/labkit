/**
 * Themes: a palette, plus type, surfaces and a motion personality.
 *
 * A `Theme` extends what a `Palette` holds rather than replacing it. For each
 * mode it ships, it carries exactly a palette's values for that mode (a
 * `ModePalette`), and those are stamped and audited by the same code
 * `applyPalette` and `auditPalette` use. So a theme is held to the same contrast
 * bar a palette is, with no second copy of the checks to drift.
 *
 * ⚠️ A theme may ship ONE mode. A palette has to supply both, so one built for a
 * dark ground ends up with a light half nobody designed. Here an unshipped mode
 * is simply absent: `applyTheme` refuses it and `auditTheme` does not invent one
 * to check.
 *
 * ⚠️ Values are the app's, as with a palette. labkit owns the shape.
 */
import { stampColours, type Mode, type ModePalette } from './palette';
import { auditMode, type ContrastCheck } from './contrast';

export interface ThemeType {
  /** Sets `--font-ui`. A font stack only: labkit ships no font files (tokens.css). */
  ui: string;
  /** Sets `--font-fig`. Use the `ui` stack when the theme's sans has even digits. */
  fig: string;
  /** Sets `--font-display`. Optional; without it, headings use the `ui` stack. */
  display?: string;
}

/** Each 0 means none, and 0 is the default for all three. */
export interface ThemeSurfaces {
  /** Backdrop blur behind a `.surface`, in px. */
  glass: number;
  /** Film grain over a `.surface`, 0 to 1. */
  grain: number;
  /** A glow in the accent around a `.surface`, 0 to 1. */
  glow: number;
}

/** How things enter: opacity alone, opacity and a short rise, or opacity and a
 *  slight scale. `calm` and `off` take away the distance from all three. */
export type EnterKind = 'fade' | 'rise' | 'scale';

export interface ThemeMotion {
  /** State changes: hover, press, a field's border. ms. */
  durState: number;
  /** Entrances. ms. */
  durEnter: number;
  /** `cubic-bezier(...)` strings. */
  easeOut: string;
  easeIn: string;
  enter: EnterKind;
}

/**
 * - `full`: the theme's motion as given.
 * - `calm`: state changes and fades at the theme's durations; entrances move no
 *   distance; infinite animations stop.
 * - `off`: what the reduced-motion block does.
 *
 * The system's reduce-motion setting forces `off` whatever the level (tokens.css).
 */
export type MotionLevel = 'full' | 'calm' | 'off';

export interface Theme {
  name: string;
  /** What the theme is FOR, in one line. */
  character: string;
  /** One entry per mode the theme ships: dark only, light only, or both. */
  modes: Partial<Record<Mode, ModePalette>>;
  type: ThemeType;
  surfaces: ThemeSurfaces;
  motion: ThemeMotion;
}

/** The modes a theme ships, in a fixed order. */
export function shippedModes(theme: Theme): Mode[] {
  return (['light', 'dark'] as Mode[]).filter((m) => theme.modes[m]);
}

/** How far an entrance travels. Not a theme value: a theme picks the KIND, and
 *  every theme moving the same short distance is part of reading as one kit. */
const ENTER: Record<EnterKind, { y: string; scale: string }> = {
  fade: { y: '0px', scale: '1' },
  rise: { y: '12px', scale: '1' },
  scale: { y: '0px', scale: '.96' },
};

/**
 * Stamp a theme onto `root`: its colours for `mode`, its type, surfaces and
 * motion, and `data-motion` for the level.
 *
 * ⚠️ The motion values go into `--motion-*`, never straight into `--dur-state`
 * and the rest. An inline style outranks every stylesheet rule, so a theme that
 * set `--dur-state` here would beat the `calm`, `off` and reduced-motion rules in
 * tokens.css, and the system setting would stop working on any themed element.
 * tokens.css derives the live tokens from `--motion-*` per level.
 */
export function applyTheme(
  theme: Theme,
  mode: Mode,
  level: MotionLevel = 'full',
  root: HTMLElement = document.documentElement,
): void {
  const values = theme.modes[mode];
  if (!values) {
    throw new Error(`labkit: theme "${theme.name}" does not ship a ${mode} mode`);
  }
  stampColours(mode, values, root);

  const s = root.style;
  s.setProperty('--font-ui', theme.type.ui);
  s.setProperty('--font-fig', theme.type.fig);
  s.setProperty('--font-display', theme.type.display ?? theme.type.ui);
  // The element too, for the reason applyPalette sets `color`: stamped on a
  // subtree, the token alone does not reach the inherited font-family.
  s.fontFamily = 'var(--font-ui)';

  s.setProperty('--glass', String(theme.surfaces.glass));
  s.setProperty('--grain', String(theme.surfaces.grain));
  s.setProperty('--glow', String(theme.surfaces.glow));

  const m = theme.motion;
  s.setProperty('--motion-dur-state', `${m.durState}ms`);
  s.setProperty('--motion-dur-enter', `${m.durEnter}ms`);
  s.setProperty('--motion-ease-out', m.easeOut);
  s.setProperty('--motion-ease-in', m.easeIn);
  s.setProperty('--motion-enter-y', ENTER[m.enter].y);
  s.setProperty('--motion-enter-scale', ENTER[m.enter].scale);

  root.dataset.motion = level;
}

/** `auditPalette`'s checks, on each mode the theme ships and only those. */
export function auditTheme(theme: Theme): {
  checks: ContrastCheck[];
  failures: ContrastCheck[];
} {
  const checks = shippedModes(theme).flatMap((m) => auditMode(m, theme.modes[m]!));
  return { checks, failures: checks.filter((c) => !c.passes) };
}
