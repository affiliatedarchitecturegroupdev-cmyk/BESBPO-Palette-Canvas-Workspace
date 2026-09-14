import Link from 'next/link';
import { currentEmail, inbox, templates } from '@/lib/api';
import { Badge, DataTable, EmptyState, PageHeader } from '../components/ui';

export default async function IntakePage() {
  const email = await currentEmail();
  const res = await inbox(email);
  const tplRes = await templates(email);
  const tpls = Array.isArray(tplRes) ? tplRes : [];

  if ('error' in res) {
    return (
      <main>
        <PageHeader eyebrow="Intake" title="Intake inbox" />
        <p style={{ color: 'var(--danger)' }}>
          {res.error === 'not signed in' ? 'Select a user to view intake.' : `API error: ${res.error}`}
        </p>
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Intake"
        title="Intake inbox"
        subtitle="Every brief awaiting booking. Qualified briefs convert into projects."
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
            + New brief
          </Link>
        }
      />
      <DataTable
        columns={[
          {
            key: 'title',
            header: 'Title',
            render: (b) => (
              <div>
                <Link href={`/intake/${b.id}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>
                  {b.title}
                </Link>
                {b.duplicate_of && (
                  <span style={{ color: 'var(--flare)', fontSize: 11, marginLeft: 8 }}>duplicate flagged</span>
                )}
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (b) => <Badge status={b.status}>{b.status}</Badge>,
          },
          {
            key: 'template',
            header: 'Template',
            render: (b) => (
              <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>
                {tpls.find((t) => t.id === b.template_id)?.name ?? '—'}
              </span>
            ),
          },
          {
            key: 'channel',
            header: 'Channel',
            render: (b) => <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>{b.source_channel}</span>,
          },
          {
            key: 'submitted',
            header: 'Submitted',
            render: (b) => <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>{b.created_at.slice(0, 10)}</span>,
          },
          {
            key: 'link',
            header: '',
            render: (b) => (
              <Link href={`/intake/${b.id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                open →
              </Link>
            ),
          },
        ]}
        rows={res}
        empty={<EmptyState title="Inbox is empty" body="New briefs from email, Slack and forms will queue here for triage." />}
      />
    </main>
  );
}
