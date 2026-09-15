import type { ReactNode } from 'react';
import { PublicNav, PublicFooter } from '../components/PublicChrome';

/** Shared prose chrome for legal pages (spec §15.1–15.3). */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: string; children: ReactNode }) {
  return (
    <>
      <PublicNav />
      <main style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Legal</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4.5vw, 44px)', margin: '10px 0 8px' }}>{title}</h1>
        <p style={{ color: 'var(--ink-faint)', fontSize: 13, margin: '0 0 24px' }}>Last updated {updated}</p>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>{intro}</p>
        <div className="pc-legal-prose">{children}</div>
      </main>
      <PublicFooter />
    </>
  );
}

export function Clause({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ margin: '0 0 28px' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, margin: '0 0 10px' }}>{heading}</h2>
      <div style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.7, display: 'grid', gap: 10 }}>{children}</div>
    </section>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        borderLeft: '3px solid var(--warning)',
        background: 'var(--warning-soft)',
        padding: '12px 16px',
        borderRadius: 8,
        color: 'var(--ink)',
        fontSize: 14,
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}