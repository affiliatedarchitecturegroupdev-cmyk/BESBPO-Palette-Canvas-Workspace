import { accountHealth, currentEmail } from '@/lib/api';

/** B-06: account health — agency engagement roll-up dashboard. */
export default async function AccountHealthPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const rows = await accountHealth(email);
  if ('error' in rows) {
    return <p style={{ color: 'var(--ink-dim)' }}>Account health is visible to reporting roles.</p>;
  }

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Account health</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        agency engagement — delivery volume, approval responsiveness, last activity
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Agency</th><th>Projects</th><th>Tasks done</th><th>Open approvals</th>
            <th>Avg decision (h)</th><th>Last activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.agency_id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '8px 8px 8px 0' }}>{r.agency_name}</td>
              <td>{r.projects}</td>
              <td>{r.tasks_completed}/{r.tasks_total}</td>
              <td>{r.open_approvals}</td>
              <td>{r.avg_decision_hours ?? '—'}</td>
              <td style={{ color: 'var(--ink-faint)' }}>
                {r.last_activity ? new Date(r.last_activity).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
