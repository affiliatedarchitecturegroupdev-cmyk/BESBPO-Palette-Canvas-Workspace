import { currentEmail, workload } from '@/lib/api';

/** Workload basics: open assignments, estimated and logged hours per person. */
export default async function WorkloadPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const res = await workload(email);
  if ('error' in res) {
    return (
      <p style={{ color: 'var(--ink-dim)' }}>
        Workload basics are visible to leadership and finance roles.
      </p>
    );
  }
  const totalEst = res.reduce((s, r) => s + Number(r.estimated_hours), 0);
  const totalLog = res.reduce((s, r) => s + Number(r.logged_hours), 0);

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Workload</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        open assignment load across the organisation
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Person</th>
            <th>Open tasks</th>
            <th>Estimated h</th>
            <th>Logged h</th>
          </tr>
        </thead>
        <tbody>
          {res.map((r) => (
            <tr key={r.person_id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{r.name}</td>
              <td>{r.open_tasks}</td>
              <td>{Number(r.estimated_hours).toFixed(1)}</td>
              <td>{Number(r.logged_hours).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--ink-faint)', fontWeight: 600 }}>
            <td style={{ padding: '10px 0' }}>Total</td>
            <td></td>
            <td>{totalEst.toFixed(1)}</td>
            <td>{totalLog.toFixed(1)}</td>
          </tr>
        </tfoot>
      </table>
    </main>
  );
}
