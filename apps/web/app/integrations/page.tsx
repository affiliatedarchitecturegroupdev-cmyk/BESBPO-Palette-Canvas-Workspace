import { currentEmail, integrations } from '@/lib/api';

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
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Integrations</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        outbound webhook subscriptions; delivery is fire-and-forget with an HMAC-SHA256 signature
        (<code>x-palette-signature</code>). Durable retries + DLQ arrive with the worker queue (P6-11).
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Name</th><th>Event</th><th>Target</th><th>State</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          {list.map((i) => (
            <tr key={i.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{i.name}</td>
              <td><code style={{ fontSize: 12 }}>{i.event}</code></td>
              <td style={{ color: 'var(--ink-dim)', wordBreak: 'break-all' }}>{i.target_url}</td>
              <td style={{ color: i.active ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {i.active ? 'active' : 'paused'}
              </td>
              <td style={{ color: 'var(--ink-faint)' }}>{i.created_at.slice(0, 10)}</td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '20px 0', color: 'var(--ink-faint)' }}>No integrations yet.</td></tr>
          )}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 20 }}>
        Create or toggle subscriptions via <code>POST /integrations</code> and <code>PATCH /integrations/:id</code>
        (integrations.write capability).
      </p>
    </main>
  );
}
