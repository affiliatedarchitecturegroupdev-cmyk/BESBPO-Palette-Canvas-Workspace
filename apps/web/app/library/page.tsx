import Link from 'next/link';
import { currentEmail } from '@/lib/api';

const packs = [
  {
    title: 'Guidelines',
    body: 'Service templates and triage guidance — the standard ways work enters the studio.',
    links: [
      { href: '/templates', label: 'Service templates' },
      { href: '/intake', label: 'Intake + triage' },
    ],
  },
  {
    title: 'Briefs',
    body: 'Client briefs and their conversion into governed projects.',
    links: [
      { href: '/intake', label: 'Brief inbox' },
      { href: '/projects', label: 'Projects' },
    ],
  },
  {
    title: 'QA packs',
    body: 'Proofing workflows, version QA checklists, and approval gates before anything reaches a client.',
    links: [
      { href: '/projects', label: 'Project boards' },
      { href: '/reports', label: 'SLA + portfolio reports' },
    ],
  },
  {
    title: 'Handover packs',
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
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Knowledge library</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        the studio's operating knowledge — guidelines, briefs, QA and handover packs
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 24 }}>
        {packs.map((p) => (
          <section key={p.title} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 16 }}>
            <h2 style={{ fontSize: 15, margin: 0 }}>{p.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{p.body}</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
              {p.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
