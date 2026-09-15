/**
 * Palette Canvas design tokens — single source of truth for the Atelier Dark
 * design system (UI/UX phase, PR #21).
 *
 * Brand anchor is the company aubergine-navy `#1E1A2E`. Every surface derives
 * from it, so the whole app reads as "brand", not as a generic near-black UI.
 *
 * Server components import these values directly; CSS custom properties mirror
 * them in `apps/web/app/globals.css` for use in inline styles / client apps.
 */

export const brandColor = {
  /** Primary brand colour. All dark surfaces are built on it. */
  base: '#1E1A2E',
  /** Lifted surface tint (cards, panels) — one step up from the base. */
  raise: '#26213a',
  /** High-emphasis surface (hover, active, modals) */
  raise2: '#2e2947',
  /** Deepest background (page recesses, modals scrim) */
  deep: '#131021',
  deep2: '#0d0b19',
  /** Hairline / border colour (on the brand base) */
  line: 'rgba(255, 255, 255, 0.09)',
  lineStrong: 'rgba(255, 255, 255, 0.16)',
} as const;

export const color = {
  ...brandColor,
  /** Ink (primary text) — warm ivory, tuned for the aubergine surface */
  ink: '#f5f1e8',
  inkDim: '#b3ab97',
  inkFaint: '#7d7592',
  inkSubtle: '#554f6b',
  /** Actions / wayfinding */
  accent: '#4f7dff', // cobalt ink-blue — the "active tool" signal
  accentHover: '#6a92ff',
  accentSoft: 'rgba(79, 125, 255, 0.14)',
  /** Secondary flare — warm rose, used for highlights + marks */
  flare: '#ff5e7a',
  flareSoft: 'rgba(255, 94, 122, 0.14)',
  /** Support hues */
  success: '#43d9a3',
  successSoft: 'rgba(67, 217, 163, 0.14)',
  warning: '#f5b04c',
  warningSoft: 'rgba(245, 176, 76, 0.14)',
  danger: '#ff5470',
  dangerSoft: 'rgba(255, 84, 112, 0.14)',
  info: '#59b7ff',
  infoSoft: 'rgba(89, 183, 255, 0.14)',
  /** Status — used only for delivery/approval/QA semantics, never decorative */
  status: {
    intake: '#59b7ff',
    qualified: '#9e8cff',
    inProgress: '#f5b04c',
    internalQa: '#59c2d1',
    proofing: '#e8a03b',
    changeControl: '#ff7b4f',
    handover: '#6ee7a7',
    done: '#43d9a3',
    blocked: '#ff5470',
    onTrack: '#43d9a3',
    atRisk: '#f5b04c',
    overdue: '#ff5470',
  },
  visibility: {
    internal: '#ff5e7a',        // Internal (restricted)
    agencyShared: '#59b7ff',    // Agency shared
    clientShared: '#43d9a3',    // Client shared
    restrictedThird: '#f5b04c', // Restricted third party
  },
} as const;

export const typography = {
  /** Editorial display — used for page titles, hero numbers, empty states */
  serif: "'Fraunces', Georgia, serif",
  /** Technical / utilitarian body — measurement, tables, labels */
  mono: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace",
  /** UI sans — controls, nav, buttons, dense data */
  sans: "'Manrope', 'Avenir Next', sans-serif",
  size: {
    xs: '11px',
    sm: '13px',
    md: '15px',
    lg: '18px',
    xl: '24px',
    '2xl': '36px',
    '3xl': '54px',
  },
} as const;

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const;

export const radii = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '999px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(10, 8, 20, 0.4)',
  md: '0 8px 24px rgba(10, 8, 20, 0.45)',
  lg: '0 24px 64px rgba(10, 8, 20, 0.6)',
  glow: '0 0 0 1px rgba(79, 125, 255, 0.35), 0 0 24px rgba(79, 125, 255, 0.18)',
} as const;

/**
 * V2 spec §8.1 — the public-surface ramp, taken from the authoritative logo
 * assets supplied in the specification package rather than sampled by eye.
 *
 * The mark is a five-stop ramp (indigo → violet → mauve → pink → rose) with the
 * accent blue as a separate centre dot; it is deliberately NOT a three-stop
 * accent gradient. Treating `cobalt` as the gradient start produced a mark that
 * did not match the real logo.
 */
export const brandRamp = {
  /** Accent blue: the centre dot of the mark, and the app's accent. */
  accent: '#4f7dff',
  indigo: '#7876e0',
  violet: '#9471cb',
  mauve: '#ba6aae',
  pink: '#cd67a0',
  magenta: '#d66599',
  gradient:
    'linear-gradient(90deg, #7876e0 0%, #9471cb 25%, #ba6aae 50%, #cd67a0 75%, #d66599 100%)',
  /** The landing/marketing ink, per the mockup (distinct from app `base`). */
  ink: '#131021',
  raise: '#1c1830',
} as const;

/**
 * The five dots of the logo mark, in mark order. Note this is the *ramp*
 * sequence, which differs from the three dots drawn beside the wordmark in the
 * landing mockup (`indigo, mauve, pink`).
 */
export const brandDots = [
  brandRamp.indigo,
  brandRamp.violet,
  brandRamp.mauve,
  brandRamp.pink,
  brandRamp.magenta,
] as const;

/** The three-dot pair used in the mockup's header lockup. */
export const brandDotsCompact = [brandRamp.indigo, brandRamp.mauve, brandRamp.magenta] as const;

/** Status semantic → tone key. Imported by Badge/StatusDot components. */
export const STATUS_TONE: Record<string, string> = {
  inbox: 'info',
  intake: 'info',
  qualified: 'qualified',
  active: 'onTrack',
  in_progress: 'inProgress',
  'in-review': 'internalQa',
  internal_qa: 'internalQa',
  proofing: 'proofing',
  change_control: 'changeControl',
  change_request: 'changeControl',
  handover: 'handover',
  done: 'done',
  blocked: 'blocked',
  overdue: 'overdue',
  at_risk: 'atRisk',
  on_track: 'onTrack',
  trial: 'qualified',
  suspended: 'blocked',
  active_trial: 'qualified',
  draft: 'inkFaint',
  closed: 'inkFaint',
};

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 960,
  desktop: 1200,
} as const;




