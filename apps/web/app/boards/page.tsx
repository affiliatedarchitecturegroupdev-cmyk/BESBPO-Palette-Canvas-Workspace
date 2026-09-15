import Link from 'next/link';
import { boards, currentEmail } from '@/lib/api';
import { Badge, DataTable, EmptyState, PageHeader } from '../components/ui';

/**
 * V2 board index (§9). Boards are the structured counterpart to the legacy
 * project task view — the same service, seen as groups, typed columns, and views.
 */
export default async function BoardsPage() {
  const email = await currentEmail();
  const res = await boards(email);
  if ('error' in res) {
    return (
      <main>
        <PageHeader eyebrow="Delivery" title="Boards" subtitle="Structured delivery boards." />
        <EmptyState
          title="Boards unavailable"
          body="Your roles do not include board access, or the API is unreachable."
        />
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Delivery"
        title="Boards"
        subtitle="Structured delivery boards: groups, typed columns, and views over the same work."
      />
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (b) => (
              <Link href={`/boards/${b.id}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>
                {b.name}
              </Link>
            ),
          },
          {
            key: 'kind',
            header: 'Kind',
            render: (b) => (
              <Badge status={b.is_template ? 'active' : 'draft'}>
                {b.is_template ? 'template' : 'board'}
              </Badge>
            ),
          },
          {
            key: 'scope',
            header: 'Scope',
            render: (b) => (
              <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>
                {b.engagement_id ? 'engagement' : 'division'}
              </span>
            ),
          },
          {
            key: 'link',
            header: '',
            render: (b) => (
              <Link href={`/boards/${b.id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                open →
              </Link>
            ),
          },
        ]}
        rows={res}
        empty={
          <EmptyState
            title="No boards yet"
            body="Boards appear here once a template is instantiated for an engagement."
          />
        }
      />
    </main>
  );
}