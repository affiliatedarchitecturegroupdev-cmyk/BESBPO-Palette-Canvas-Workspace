import Link from 'next/link';
import { brandRamp } from '@palette-canvas/design-tokens';
import { PublicNav, PublicFooter } from '../components/PublicChrome';

export const metadata = { title: "What's new — Palette Canvas" };

const RECENTLY_SHIPPED = [
  { title: 'Invitations and external boundaries', body: 'Token-based invitations, confidentiality tiers and a hard boundary between internal and client-facing channels.', tag: 'Shipped' },
  { title: 'Boards, columns and views', body: 'A configurable board model with a 25-type column catalog, semantic roles, and saved views per role.', tag: 'Shipped' },
  { title: 'Cross-board dashboards', body: 'Semantic-role metrics aggregated on item write, surfaced as capacity, QA and engagement-health widgets.', tag: 'Shipped' },
  { title: 'Files and version chains', body: 'Upload, re-upload and version history with signed URLs and media inspection for common image formats.', tag: 'Shipped' },
  { title: 'Guests scoped to a single item', body: 'Expiring guest links resolved through role bindings, with the engagement boundary enforced on read and write.', tag: 'Shipped' },
  { title: 'Governed agents', body: 'Six bounded agents that propose, remind or flag — every run recorded, every decision made by a human.', tag: 'Shipped' },
];

const IN_DEVELOPMENT = [
  { title: 'Live provider exchange', body: 'The identity seam is in place with a development stub; wiring a real identity provider is the remaining step.', tag: 'In development' },
  { title: 'S3-compatible storage backend', body: 'The storage layer exposes an S3-shaped interface today and ships against local disk; moving the backend is configuration, not a rewrite.', tag: 'In development' },
  { title: 'Board view accessibility', body: 'A stacked layout for the densest board views at high zoom, and a further manual assistive-technology pass.', tag: 'In development' },
  { title: 'Agent inference provider', body: 'The provider seam and graceful no-op path are live; selecting an open-weight host is a human decision still open.', tag: 'In development' },
];

const STATUS = [
  { label: 'Workspace API', state: 'Operational' },
  { label: 'Web application', state: 'Operational' },
  { label: 'File storage and media workers', state: 'Operational' },
  { label: 'Background queue and reminders', state: 'Operational' },
  { label: 'Agent inference provider', state: 'Not configured' },
];

export default function ResourcesPage() {
  return (
    <>
      <PublicNav />
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Resources</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4.5vw, 44px)', margin: '10px 0 12px' }}>What&apos;s new</h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, lineHeight: 1.7, maxWidth: 640, margin: 0 }}>
          An honest read on where the platform stands: what is live, what is being built, and what is deliberately parked until a
          human decision is made.
        </p>

        <section id="status" aria-labelledby="status-title" style={{ marginTop: 44 }}>
          <h2 id="status-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 14px' }}>Current status</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 1, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
            {STATUS.map((s) => (
              <li key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--brand-raise)' }}>
                <span style={{ fontSize: 14 }}>{s.label}</span>
                <span style={{ fontSize: 12, color: s.state === 'Operational' ? 'var(--success)' : 'var(--ink-faint)' }}>{s.state}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="dev-title" style={{ marginTop: 44 }}>
          <h2 id="dev-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 14px' }}>In development</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {IN_DEVELOPMENT.map((c) => (
              <article key={c.title} style={panelCard}>
                <span style={{ color: brandRamp.violet, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.tag}</span>
                <h3 style={{ fontSize: 16, margin: '10px 0 8px' }}>{c.title}</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="agents" aria-labelledby="shipped-title" style={{ marginTop: 44 }}>
          <h2 id="shipped-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 24, margin: '0 0 14px' }}>Recently shipped</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {RECENTLY_SHIPPED.map((c) => (
              <article key={c.title} style={panelCard}>
                <span style={{ color: 'var(--success)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.tag}</span>
                <h3 style={{ fontSize: 16, margin: '10px 0 8px' }}>{c.title}</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <p style={{ marginTop: 40 }}>
          <Link href="/help" style={{ color: brandRamp.cobalt, fontSize: 14, textDecoration: 'none' }}>Need help instead? Visit the help centre →</Link>
        </p>
      </main>
      <PublicFooter />
    </>
  );
}

const panelCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 20,
  borderRadius: 16,
  border: '1px solid var(--line)',
  background: 'var(--brand-raise)',
};