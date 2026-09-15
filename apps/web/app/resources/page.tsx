import Link from 'next/link';
import { brandRamp } from '@palette-canvas/design-tokens';
import { PublicNav, PublicFooter } from '../components/PublicChrome';
import { SUPPORT_EMAIL } from '../legal/contact';

export const metadata = { title: "Resources & what's new — Palette Canvas" };

/**
 * Resources / What's New (spec §15.4), interpreted as a release-notes page.
 * The spec is explicit that this should reflect what is *actually* built and
 * verified rather than a roadmap presented as live. Keep every entry here
 * traceable to something that has shipped and passed a gate.
 */

const SPECIFIED_IN_DEVELOPMENT = [
  { title: 'Capacity & seat management', body: 'Seat utilisation tracked against the real productive ceiling.' },
  { title: 'Board, column and view system', body: 'Kanban, Gantt, Calendar, Workload, Chart and Gallery over one data model.' },
  { title: 'Cross-board exec dashboards', body: 'Semantic-role-based metric rollups across engagements.' },
  { title: 'Unified communication layer', body: 'Instant and threaded messaging, item comments, self-hosted meetings.' },
  { title: 'White-label Compliance Guard', body: 'Automated pre-delivery metadata and attribution checks.' },
  { title: 'Adobe, Canva and Dropbox integrations', body: 'In-app plugin, public app, and backup sync.' },
  { title: 'Guest-tier, time-boxed access', body: 'Scoped external access for stakeholder review.' },
];

const RECENTLY_SHIPPED = [
  { title: 'Boards, columns and views', body: 'A configurable board model with a 25-type column catalog, semantic roles, and saved views per role.' },
  { title: 'Cross-board dashboards', body: 'Semantic-role metrics aggregated on item write, surfaced as capacity, QA and engagement-health widgets.' },
  { title: 'Communication layer', body: 'Channels with visibility fixed at creation, threaded messages, mentions, item comments and meetings.' },
  { title: 'Files and version chains', body: 'Upload and re-upload with version history, references from items, comments and messages, and gallery view data.' },
  { title: 'Compliance Guard', body: 'Pre-delivery metadata, filename and attribution checks that can block release, with clearing attributed to a person.' },
  { title: 'Governed AI agents', body: 'Six bounded agents that propose, remind or flag — every run recorded, every decision made by a human.' },
  { title: 'Guest access scoped to one item', body: 'Expiring guest links resolved through role bindings, with the engagement boundary enforced on read and write.' },
  { title: 'Landing, sign-up and legal pages', body: 'A public surface with a real sign-up branch per account type, and terms, privacy and accessibility pages.' },
];

const STATUS = [
  { label: 'Workspace API', state: 'Operational' },
  { label: 'Web application', state: 'Operational' },
  { label: 'File storage and media inspection', state: 'Operational' },
  { label: 'Job queue and retries', state: 'Operational' },
  { label: 'Raster thumbnail worker', state: 'Pending external worker' },
  { label: 'Agent inference provider', state: 'Not configured' },
];

const GUIDES = [
  { title: 'Employee guide', href: '/help' },
  { title: 'Account / production manager guide', href: '/help' },
  { title: 'Partner agency guide', href: '/help' },
];

export default function ResourcesPage() {
  return (
    <>
      <PublicNav />
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px)' }}>
        <span style={{ color: 'var(--ink-faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Resources</span>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(30px, 4.5vw, 44px)', margin: '10px 0 12px' }}>
          Resources &amp; what&apos;s new
        </h1>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, lineHeight: 1.7, maxWidth: 660, margin: 0 }}>
          An honest read on where the platform stands: what is live, what is being built, and what is deliberately parked until a
          human decision is made.
        </p>

        <section id="status" aria-labelledby="status-title" style={{ marginTop: 44 }}>
          <h2 id="status-title" style={{ fontFamily: 'var(--display)', fontSize: 22, margin: '0 0 14px' }}>Platform status</h2>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: '0 0 14px', maxWidth: 640 }}>
            Palette Canvas Workspace is under active development. This page tracks real capability as it ships — not a roadmap
            presented as already-live functionality.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 1, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
            {STATUS.map((s) => (
              <li
                key={s.label}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--brand-raise)' }}
              >
                <span style={{ fontSize: 14 }}>{s.label}</span>
                <span style={{ fontSize: 12, color: s.state === 'Operational' ? 'var(--success)' : 'var(--ink-faint)' }}>{s.state}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="dev-title" style={{ marginTop: 44 }}>
          <h2 id="dev-title" style={{ fontFamily: 'var(--display)', fontSize: 22, margin: '0 0 14px' }}>Specified, in development</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {SPECIFIED_IN_DEVELOPMENT.map((c) => (
              <article key={c.title} style={panelCard}>
                <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>{c.title}</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="shipped" aria-labelledby="shipped-title" style={{ marginTop: 44 }}>
          <h2 id="shipped-title" style={{ fontFamily: 'var(--display)', fontSize: 22, margin: '0 0 14px' }}>Recently shipped</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {RECENTLY_SHIPPED.map((c) => (
              <article key={c.title} style={panelCard}>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--success)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Shipped
                </span>
                <h3 style={{ fontSize: 15, margin: '10px 0 8px' }}>{c.title}</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="guides-title" style={{ marginTop: 44 }}>
          <h2 id="guides-title" style={{ fontFamily: 'var(--display)', fontSize: 22, margin: '0 0 14px' }}>Guides &amp; documentation</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {GUIDES.map((g) => (
              <li key={g.title}>
                <Link href={g.href} className="pc-public-link" style={{ color: brandRamp.accent, fontSize: 14, textDecoration: 'none' }}>
                  {g.title} →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="feedback-title" style={{ marginTop: 44 }}>
          <h2 id="feedback-title" style={{ fontFamily: 'var(--display)', fontSize: 22, margin: '0 0 10px' }}>Questions or feedback</h2>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, margin: 0 }}>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: brandRamp.accent }}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
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