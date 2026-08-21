# Palette Canvas Workspace

A studio table for color. React + TypeScript + Vite.

## Phase 1 — core workspace

- Create palettes; each new palette is seeded with a randomized, harmonized set of colors.
- Edit each swatch with a native color picker or typed hex value (3- or 6-digit, with or without `#`).
- Click a swatch to copy its hex; drag swatches to reorder; add or remove colors per palette.
- Rename palettes inline; delete palettes.
- Copy a palette as CSS custom properties; export a palette or the whole workspace as JSON.
- All work persists in `localStorage` (`palette-canvas:v1`).

## Run

```sh
npm install
npm run dev      # http://localhost:12000
npm run build    # type-check + production build
```

## Roadmap (later phases)

- Color harmonies (complementary, analogous, triadic) and shade/tint ramps
- Contrast and accessibility checks (WCAG ratios)
- Import palettes (JSON, CSS, image extraction)
- Sharing via URL and cloud sync
