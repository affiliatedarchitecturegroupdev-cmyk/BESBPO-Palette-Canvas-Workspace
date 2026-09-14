import Link from 'next/link';
import { currentEmail, projects } from '@/lib/api';
import { Badge, DataTable, EmptyState, PageHeader } from '../components/ui';

export default async function ProjectsPage() {
  const email = await currentEmail();
  const res = await projects(email);
  if ('error' in res) {
    return <p style={{ color: 'var(--ink-dim)' }}>Projects unavailable — check your access.</p>;
  }

  return (
    <main>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        subtitle="Every service order flowing through the production floor, from kickoff to handover."
        actions={
          <Link
            href="/intake/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--sans)',
              fontWeight: 600,
              fontSize: 13.5,
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            New from brief
          </Link>
        }
      />
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (p) => (
              <Link href={`/projects/${p.id}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>
                {p.name}
              </Link>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (p) => <Badge status={p.status}>{p.status}</Badge>,
          },
          {
            key: 'visibility',
            header: 'Visibility',
            render: (p) => <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>{p.visibility}</span>,
          },
          {
            key: 'created',
            header: 'Created',
            render: (p) => <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>{p.created_at.slice(0, 10)}</span>,
          },
          {
            key: 'link',
            header: '',
            render: (p) => (
              <Link href={`/projects/${p.id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                open →
              </Link>
            ),
          },
        ]}
        rows={res}
        empty={<EmptyState title="No projects yet" body="Convert a qualified brief from the intake inbox to start one." />}
      />
    </main>
  );
}
