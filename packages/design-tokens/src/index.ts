/**
 * Palette Canvas design tokens — single source of truth.
 * Aligned to the planning document's design-system foundation requirement.
 * Keep values neutral-brand; brand-specific themes layer on top later.
 */

export const color = {
  // Neutrals — dark-first UI foundation (matches creative-tool aesthetic)
  ink: '#f2ead9',
  inkDim: '#9a8f7c',
  inkFaint: '#5f574a',
  paper: '#16130f',
  paperRaise: '#1e1a15',
  line: '#2c2620',
  // Action / brand accent
  accent: '#e4572e',
  accentSoft: '#f3a712',
  // Status — used only for delivery/approval/QA semantics, never decorative
  status: {
    intake: '#5ca4d6',
    qualified: '#8e7fd1',
    inProgress: '#f3a712',
    internalQa: '#9bc4cb',
    proofing: '#e8a03b',
    changeControl: '#c4602f',
    handover: '#79c48d',
    done: '#79c48d',
    blocked: '#e4572e',
  },
  visibility: {
    internal: '#e4572e',        // Internal (restricted)
    agencyShared: '#5ca4d6',    // Agency shared
    clientShared: '#9bc4cb',    // Client shared
    restrictedThird: '#c4602f', // Restricted third party
  },
} as const;

export const typography = {
  serif: "'Fraunces', Georgia, serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
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
} as const;

export const radii = {
  sm: '2px',
  md: '6px',
  lg: '12px',
} as const;

export const elevation = {
  card: '0 2px 8px rgba(0,0,0,0.35)',
  toast: '0 6px 24px rgba(0,0,0,0.45)',
} as const;

export default { color, typography, spacing, radii, elevation };
