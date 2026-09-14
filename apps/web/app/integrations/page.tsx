import { currentEmail, integrations } from '@/lib/api';
import { Badge, Card, DataTable, EmptyState, PageHeader } from '../components/ui';

/** P6-04: integrations hub — outbound webhook subscriptions. */
export default async function IntegrationsPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const list = await integrations(email);
  if ('error' in list) {
    return (
      <p style={{ color: 'var(--ink-dim)' }}>
        Integrations are visible to leadership, production and finance roles.
      </p>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Connect"
        title="Integrations"
        subtitle="Outbound webhook subscriptions. Delivery is fire-and-forget with an HMAC-SHA256 signature (x-palette-signature)."
      />
      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (i) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{i.name}</span> },
          { key: 'event', header: 'Event', render: (i) => <code style={{ fontSize: 12 }}>{i.event}</code> },
          { key: 'target', header: 'Target', render: (i) => <span style={{ wordBreak: 'break-all', fontSize: 12.5 }}>{i.target_url}</span> },
          {
            key: 'state',
            header: 'State',
            render: (i) => (i.active ? <Badge status="done">active</Badge> : <Badge status="draft">paused</Badge>),
          },
          { key: 'created', header: 'Created', render: (i) => <span style={{ color: 'var(--ink-faint)' }}>{i.created_at.slice(0, 10)}</span> },
        ]}
        rows={list}
        empty={<EmptyState title="No integrations yet" body="Outbound webhook subscriptions to Slack, email and custom endpoints will appear here." />}
      />
      <Card style={{ padding: 14, marginTop: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
          Create or toggle subscriptions via <code>POST /integrations</code> and <code>PATCH /integrations/:id</code>{' '}
          (integrations.write capability).
        </p>
      </Card>
    </main>
  );
}
