import Link from 'next/link';
import { currentEmail } from '@/lib/api';
import { Card, PageHeader } from '../components/ui';

const packs = [
  {
    title: 'Guidelines',
    icon: '✎',
    tone: 'var(--accent)',
    body: 'Service templates and triage guidance — the standard ways work enters the studio.',
    links: [
      { href: '/templates', label: 'Service templates' },
      { href: '/intake', label: 'Intake + triage' },
    ],
  },
  {
    title: 'Briefs',
    icon: '✉',
    tone: 'var(--info)',
    body: 'Client briefs and their conversion into governed projects.',
    links: [
      { href: '/intake', label: 'Brief inbox' },
      { href: '/projects', label: 'Projects' },
    ],
  },
  {
    title: 'QA packs',
    icon: '✓',
    tone: 'var(--success)',
    body: 'Proofing workflows, version QA checklists, and approval gates before anything reaches a client.',
    links: [
      { href: '/projects', label: 'Project boards' },
      { href: '/reports', label: 'SLA + portfolio reports' },
    ],
  },
  {
    title: 'Handover packs',
    icon: '→',
    tone: 'var(--flare)',
    body: 'Delivery handover, commercial records, and the audit trail behind them.',
    links: [
      { href: '/commercial', label: 'Commercial records' },
      { href: '/audit', label: 'Audit explorer' },
    ],
  },
];

/** B-05: knowledge library — landing page for guideline/brief/QA/handover packs. */
export default async function LibraryPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  return (
    <main>
      <PageHeader
        eyebrow="Govern"
        title="Knowledge library"
        subtitle="The studio's operating knowledge — guidelines, briefs, QA and handover packs."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {packs.map((p) => (
          <Card
            key={p.title}
            style={{
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderTop: `3px solid ${p.tone}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                aria-hidden
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-sm)',
                  background: `${p.tone}1f`,
                  color: p.tone,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                }}
              >
                {p.icon}
              </span>
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17 }}>{p.title}</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.5 }}>{p.body}</p>
            <ul style={{ listStyle: 'none', margin: 'auto 0 0', padding: 0, fontSize: 13, display: 'grid', gap: 4 }}>
              {p.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} style={{ color: 'var(--accent)' }}>
                    {l.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  );
}
