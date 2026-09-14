import { auditSearch, currentEmail } from '@/lib/api';
import { Card, DataTable, PageHeader } from '../components/ui';

const inputStyle = {
  background: 'var(--brand-base)',
  border: '1px solid var(--line)',
  color: 'var(--ink)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
} as const;

/** B-01: audit explorer — searchable org audit trail (filters via GET form). */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const sp = await searchParams;
  const filters = {
    action: sp.action ?? '',
    targetType: sp.targetType ?? '',
    q: sp.q ?? '',
    from: sp.from ?? '',
    to: sp.to ?? '',
  };
  const rows = await auditSearch(email, filters);
  if ('error' in rows) {
    return (
      <p style={{ color: 'var(--ink-dim)' }}>
        The audit trail is visible to operations and platform roles.
      </p>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Govern"
        title="Audit explorer"
        subtitle={`Every high-risk action, filterable — ${rows.length} events.`}
      />

      <Card style={{ padding: 16, marginBottom: 20 }}>
        <form method="get" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input name="q" placeholder="search text" defaultValue={filters.q} style={inputStyle} aria-label="Search text" />
          <input name="action" placeholder="action (e.g. estimate.approved)" defaultValue={filters.action} style={inputStyle} aria-label="Action" />
          <input name="targetType" placeholder="target type" defaultValue={filters.targetType} style={inputStyle} aria-label="Target type" />
          <input name="from" type="date" defaultValue={filters.from} style={inputStyle} aria-label="From date" />
          <input name="to" type="date" defaultValue={filters.to} style={inputStyle} aria-label="To date" />
          <button
            type="submit"
            style={{
              ...inputStyle,
              cursor: 'pointer',
              background: 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--sans)',
              fontWeight: 600,
            }}
          >
            Filter
          </button>
          {(filters.q || filters.action || filters.targetType || filters.from || filters.to) && (
            <a href="/audit" style={{ alignSelf: 'center', fontSize: 12.5, color: 'var(--accent)' }}>
              Clear
            </a>
          )}
        </form>
      </Card>

      <div style={{ overflowX: 'auto' }}>
        <DataTable
          columns={[
            {
              key: 'when',
              header: 'When',
              render: (r) => (
                <span style={{ color: 'var(--ink-faint)', whiteSpace: 'nowrap', fontSize: 12.5 }}>
                  {new Date(r.at).toLocaleString()}
                </span>
              ),
            },
            { key: 'actor', header: 'Actor', render: (r) => <code style={{ fontSize: 12 }}>{r.actor.slice(0, 8)}</code> },
            { key: 'action', header: 'Action', render: (r) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{r.action}</span> },
            {
              key: 'target',
              header: 'Target',
              render: (r) => <span style={{ color: 'var(--ink-dim)', fontSize: 12.5 }}>{r.target_type}:{r.target_id.slice(0, 8)}</span>,
            },
            {
              key: 'detail',
              header: 'Detail',
              render: (r) => (
                <span style={{ color: 'var(--ink-faint)', fontSize: 12.5, display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320, overflow: 'hidden' }}>
                  {JSON.stringify(r.metadata)}
                </span>
              ),
            },
          ]}
          rows={rows}
          empty={<p style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', margin: 0 }}>No events match these filters.</p>}
        />
      </div>
    </main>
  );
}
