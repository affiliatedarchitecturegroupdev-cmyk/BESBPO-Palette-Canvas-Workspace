import type { Palette } from '../types';
import { normalizeHex, seedPalettes } from './palette';

const KEY = 'palette-canvas:v1';

export function loadPalettes(): Palette[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedPalettes();
    const parsed = JSON.parse(raw) as Palette[];
    if (!Array.isArray(parsed)) return seedPalettes();
    return parsed
      .filter((p) => p && typeof p.name === 'string' && Array.isArray(p.colors))
      .map((p) => ({
        id: String(p.id),
        name: p.name,
        colors: p.colors.map((c) => normalizeHex(String(c)) ?? '#000000'),
      }));
  } catch {
    return seedPalettes();
  }
}

export function savePalettes(palettes: Palette[]): void {
  localStorage.setItem(KEY, JSON.stringify(palettes));
}
