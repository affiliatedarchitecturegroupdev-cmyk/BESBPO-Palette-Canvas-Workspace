import { useEffect, useRef, useState } from 'react';
import type { Palette } from './types';
import { PaletteCard } from './components/PaletteCard';
import { loadPalettes, savePalettes } from './lib/storage';
import { workspaceToJson, download } from './lib/export';
import { makeHarmonyPalette, nextName, uid } from './lib/palette';

export default function App() {
  const [palettes, setPalettes] = useState<Palette[]>(() => loadPalettes());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    savePalettes(palettes);
  }, [palettes]);

  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  };

  const newPalette = () =>
    setPalettes((ps) => [
      ...ps,
      {
        id: uid(),
        name: nextName(ps.map((p) => p.name)),
        colors: makeHarmonyPalette(5),
      },
    ]);

  const updatePalette = (updated: Palette) =>
    setPalettes((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));

  const deletePalette = (id: string) =>
    setPalettes((ps) => ps.filter((p) => p.id !== id));

  const exportAll = () => {
    download('palette-canvas-workspace.json', workspaceToJson(palettes), 'application/json');
    notify('Workspace exported as JSON');
  };

  const totalColors = palettes.reduce((n, p) => n + p.colors.length, 0);

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__title">
          <span className="masthead__kicker">BESBPO</span>
          <h1>Palette Canvas <em>Workspace</em></h1>
          <p>A studio table for color. Phase one: create, refine, and export.</p>
        </div>
        <div className="masthead__actions">
          <button className="btn btn--primary" onClick={newPalette}>+ New palette</button>
          <button className="btn" onClick={exportAll}>Export workspace ↓</button>
        </div>
        <div className="masthead__meta">
          <span>{palettes.length} palette{palettes.length === 1 ? '' : 's'}</span>
          <span>{totalColors} colors</span>
        </div>
      </header>

      <main className="canvas">
        {palettes.length === 0 ? (
          <div className="canvas__empty">
            <p>The table is clear.</p>
            <button className="btn btn--primary" onClick={newPalette}>Lay out a palette</button>
          </div>
        ) : (
          palettes.map((p, i) => (
            <PaletteCard
              key={p.id}
              palette={p}
              index={i}
              onChange={updatePalette}
              onDelete={() => deletePalette(p.id)}
              onToast={notify}
            />
          ))
        )}
      </main>

      <footer className="colophon">
        <span>Palette Canvas Workspace — phase one</span>
        <span>Every swatch: click to copy, drag to reorder, ✎ to tune.</span>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
