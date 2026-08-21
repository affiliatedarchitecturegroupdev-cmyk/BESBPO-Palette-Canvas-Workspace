import type { Palette } from '../types';

const HEX_RE = /^#?[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function normalizeHex(input: string): string | null {
  if (!HEX_RE.test(input.trim())) return null;
  let h = input.trim().replace(/^#/, '').toUpperCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h}`;
}

export function isLight(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // perceived luminance
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function randomColor(): string {
  const h = Math.random();
  const s = 0.45 + Math.random() * 0.5;
  const l = 0.3 + Math.random() * 0.45;
  return hslToHex(h, s, l);
}

export function makeHarmonyPalette(count = 5): string[] {
  const baseHue = Math.random();
  const golden = 0.618;
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + i * golden) % 1;
    const s = 0.42 + Math.random() * 0.48;
    const l = 0.28 + Math.random() * 0.5;
    colors.push(hslToHex(hue, s, l));
  }
  return colors;
}

const NAME_POOL = [
  'Ember Tones', 'Harbor Dusk', 'Verdant Study', 'Porcelain Light',
  'Signal Flare', 'Moss & Iron', 'Cadmium Drift', 'Blue Hour',
  'Field Notes', 'Tide Pool', 'Ochre Room', 'Night Market',
];

export function nextName(taken: string[]): string {
  const available = NAME_POOL.filter((n) => !taken.includes(n));
  if (available.length === 0) return `Palette ${taken.length + 1}`;
  return available[Math.floor(Math.random() * available.length)];
}

export function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return s || 'palette';
}

export function seedPalettes(): Palette[] {
  return [
    {
      id: uid(),
      name: 'Ember Tones',
      colors: ['#E4572E', '#F3A712', '#F0E6D2', '#6B2D26', '#2B2118'],
    },
    {
      id: uid(),
      name: 'Harbor Dusk',
      colors: ['#0E2A3B', '#1F6F8B', '#9BC4CB', '#E8DCC4', '#C4602F'],
    },
  ].map((p) => ({ ...p, colors: p.colors.map((c) => normalizeHex(c) ?? c) }));
}
