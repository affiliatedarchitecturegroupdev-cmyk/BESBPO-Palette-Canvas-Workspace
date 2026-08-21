import { useState } from 'react';
import type { Palette } from '../types';
import { Swatch } from './Swatch';
import { paletteToCss, paletteToJson, download } from '../lib/export';
import { copyText } from '../lib/clipboard';
import { randomColor, slugify, uid } from '../lib/palette';

interface PaletteCardProps {
  palette: Palette;
  index: number;
  onChange: (palette: Palette) => void;
  onDelete: () => void;
  onToast: (message: string) => void;
}

export function PaletteCard({ palette, index, onChange, onDelete, onToast }: PaletteCardProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const setColors = (colors: string[]) => onChange({ ...palette, colors });

  const moveColor = (from: number, to: number) => {
    const colors = [...palette.colors];
    const [c] = colors.splice(from, 1);
    colors.splice(to, 0, c);
    setColors(colors);
  };

  const addColor = () => setColors([...palette.colors, randomColor()]);

  const removeColor = (i: number) => {
    if (palette.colors.length <= 1) return;
    setColors(palette.colors.filter((_, idx) => idx !== i));
  };

  const copyCss = async () => {
    const ok = await copyText(paletteToCss(palette));
    onToast(ok ? 'CSS variables copied' : 'Copy failed');
  };

  const exportJson = () => {
    download(`${slugify(palette.name)}-${uid()}.json`, paletteToJson(palette), 'application/json');
    onToast('Palette exported as JSON');
  };

  return (
    <section className="card" style={{ animationDelay: `${index * 70}ms` }}>
      <header className="card__head">
        <input
          className="card__name"
          value={palette.name}
          onChange={(e) => onChange({ ...palette, name: e.target.value })}
          aria-label="Palette name"
        />
        <div className="card__tools">
          <button onClick={addColor} title="Add color">+</button>
          <button onClick={copyCss} title="Copy CSS variables">{'{ }'}</button>
          <button onClick={exportJson} title="Export JSON">↓</button>
          <button onClick={onDelete} title="Delete palette" className="card__danger">×</button>
        </div>
      </header>
      <div className="card__strip">
        {palette.colors.map((color, i) => (
          <Swatch
            key={`${i}-${color}`}
            color={color}
            dragging={dragIndex === i}
            onCopy={(c) => onToast(`${c} copied`)}
            onChange={(c) => {
              const colors = [...palette.colors];
              colors[i] = c;
              setColors(colors);
            }}
            onRemove={() => removeColor(i)}
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) moveColor(dragIndex, i);
              setDragIndex(null);
            }}
          />
        ))}
      </div>
      <footer className="card__foot">
        <span>{palette.colors.length} color{palette.colors.length === 1 ? '' : 's'}</span>
      </footer>
    </section>
  );
}
