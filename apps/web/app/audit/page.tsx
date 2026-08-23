import { auditSearch, currentEmail } from '@/lib/api';

const inputStyle = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  color: 'var(--ink)',
  fontSize: 13,
  padding: '6px 10px',
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
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Audit explorer</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        every high-risk action, filterable — {rows.length} events
      </p>

      <form method="get" style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <input name="q" placeholder="search text" defaultValue={filters.q} style={inputStyle} aria-label="Search text" />
        <input name="action" placeholder="action (e.g. estimate.approved)" defaultValue={filters.action} style={inputStyle} aria-label="Action" />
        <input name="targetType" placeholder="target type" defaultValue={filters.targetType} style={inputStyle} aria-label="Target type" />
        <input name="from" type="date" defaultValue={filters.from} style={inputStyle} aria-label="From date" />
        <input name="to" type="date" defaultValue={filters.to} style={inputStyle} aria-label="To date" />
        <button type="submit" style={{ ...inputStyle, cursor: 'pointer' }}>Filter</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '8px 0', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                {new Date(r.at).toLocaleString()}
              </td>
              <td style={{ color: 'var(--ink-dim)' }}>{r.actor.slice(0, 8)}</td>
              <td style={{ color: 'var(--ink)' }}>{r.action}</td>
              <td style={{ color: 'var(--ink-dim)' }}>{r.target_type}:{r.target_id.slice(0, 8)}</td>
              <td style={{ color: 'var(--ink-faint)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {JSON.stringify(r.metadata)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
