import type { Palette } from '../types';
import { slugify } from './palette';

export function paletteToCss(palette: Palette): string {
  const slug = slugify(palette.name);
  const lines = palette.colors.map(
    (c, i) => `  --${slug}-${i + 1}: ${c.toLowerCase()};`,
  );
  return `/* ${palette.name} */\n:root {\n${lines.join('\n')}\n}`;
}

export function paletteToJson(palette: Palette): string {
  return JSON.stringify(
    { name: palette.name, colors: palette.colors },
    null,
    2,
  );
}

export function workspaceToJson(palettes: Palette[]): string {
  return JSON.stringify(
    palettes.map((p) => ({ name: p.name, colors: p.colors })),
    null,
    2,
  );
}

export function download(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
