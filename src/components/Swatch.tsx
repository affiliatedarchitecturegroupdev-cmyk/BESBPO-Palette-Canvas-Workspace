import { useState } from 'react';
import { isLight, normalizeHex } from '../lib/palette';

interface SwatchProps {
  color: string;
  onCopy: (color: string) => void;
  onChange: (color: string) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
}

export function Swatch({
  color, onCopy, onChange, onRemove,
  onDragStart, onDragOver, onDrop, dragging,
}: SwatchProps) {
  const [editing, setEditing] = useState(false);
  const light = isLight(color);
  const tone = light ? '#1c1610' : '#f6f1e7';

  const commitText = (value: string) => {
    const hex = normalizeHex(value);
    if (hex) onChange(hex);
  };

  return (
    <div
      className={`swatch${dragging ? ' swatch--dragging' : ''}`}
      style={{ background: color, color: tone }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title="Drag to reorder · click to copy"
      onClick={() => onCopy(color)}
    >
      <span className="swatch__hex">{color.replace('#', '')}</span>
      <span className="swatch__actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="swatch__btn"
          style={{ color: tone }}
          onClick={() => setEditing((v) => !v)}
          aria-label="Edit color"
        >
          ✎
        </button>
        <button
          className="swatch__btn"
          style={{ color: tone }}
          onClick={onRemove}
          aria-label="Remove color"
        >
          ×
        </button>
      </span>
      {editing && (
        <div
          className="swatch__editor"
          style={{ color: tone }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label="Pick color"
          />
          <input
            type="text"
            defaultValue={color}
            maxLength={7}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText((e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => commitText(e.target.value)}
            aria-label="Hex value"
          />
        </div>
      )}
    </div>
  );
}
