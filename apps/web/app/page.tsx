import { Role, VisibilityLevel } from '@palette-canvas/shared';

export default function Page() {
  return (
    <main style={{ padding: 48, maxWidth: 1100, margin: '0 auto' }}>
      <header>
        <p style={{ letterSpacing: '0.35em', color: 'var(--accent)', fontSize: 11, border: '1px solid var(--accent)', padding: '3px 10px', display: 'inline-block' }}>
          PALETTE CANVAS
        </p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 48, margin: '16px 0 8px', fontWeight: 500 }}>
          Workspace Foundation
        </h1>
        <p style={{ color: 'var(--ink-dim)', maxWidth: 640 }}>
          Workspace shell for the Palette Canvas production operating system.
          This is Phase 1 of the planning document — the foundation on which
          identity, tenancy, and permission gates are built in later phases.
        </p>
      </header>

      <section style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 24 }}>
          <h2 style={{ marginTop: 0, fontFamily: 'var(--serif)' }}>Roles</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: 'var(--ink-dim)' }}>
            {Object.values(Role).map((r) => (
              <li key={r} style={{ padding: '4px 0', fontSize: 13 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 24 }}>
          <h2 style={{ marginTop: 0, fontFamily: 'var(--serif)' }}>Visibility Levels</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: 'var(--ink-dim)' }}>
            {Object.values(VisibilityLevel).map((v) => (
              <li key={v} style={{ padding: '4px 0', fontSize: 13 }}>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 24 }}>
          <h2 style={{ marginTop: 0, fontFamily: 'var(--serif)' }}>Foundation Outputs</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: 'var(--ink-dim)' }}>
            <li style={{ padding: '4px 0', fontSize: 13 }}>Design tokens</li>
            <li style={{ padding: '4px 0', fontSize: 13 }}>Permission matrix</li>
            <li style={{ padding: '4px 0', fontSize: 13 }}>Audit log (in-memory)</li>
            <li style={{ padding: '4px 0', fontSize: 13 }}>NestJS API skeleton</li>
          </ul>
        </div>
      </section>

      <footer style={{ marginTop: 64, color: 'var(--ink-faint)', fontSize: 12, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
        Palette Canvas Workspace — Phase 1 foundation
      </footer>
    </main>
  );
}
