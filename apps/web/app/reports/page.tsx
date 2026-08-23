import { currentEmail, portfolio, projectEffort, slaReport, utilisation } from '@/lib/api';

/** P6-02 + P6-03: utilisation, project effort variance, portfolio roll-up, SLA breaches. */
export default async function ReportsPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const [util, effort, port, sla] = await Promise.all([
    utilisation(email), projectEffort(email), portfolio(email), slaReport(email),
  ]);
  if ('error' in util || 'error' in effort || 'error' in port || 'error' in sla) {
    return (
      <p style={{ color: 'var(--ink-dim)' }}>
        Reports are visible to leadership, production and finance roles.
      </p>
    );
  }
  const breached = sla.filter((s) => s.breached).length;

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Reports</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        utilisation, effort variance, portfolio and SLA health
      </p>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 32 }}>Utilisation</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Person</th><th>Logged h</th><th>Weekly h</th><th>Utilisation</th>
          </tr>
        </thead>
        <tbody>
          {util.map((u) => (
            <tr key={u.person_id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{u.name}</td>
              <td>{Number(u.logged_hours).toFixed(1)}</td>
              <td>{Number(u.weekly_hours).toFixed(0)}</td>
              <td>{u.utilisation_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 40 }}>Effort by project</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Project</th><th>Status</th><th>Estimated h</th><th>Logged h</th><th>Variance h</th>
          </tr>
        </thead>
        <tbody>
          {effort.map((e) => (
            <tr key={e.project_id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{e.title}</td>
              <td style={{ color: 'var(--ink-faint)' }}>{e.status}</td>
              <td>{Number(e.estimated_hours).toFixed(1)}</td>
              <td>{Number(e.logged_hours).toFixed(1)}</td>
              <td style={{ color: e.variance_hours > 0 ? 'var(--accent)' : 'inherit' }}>
                {e.variance_hours > 0 ? '+' : ''}{e.variance_hours.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 40 }}>Portfolio</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Status</th><th>Projects</th><th>Open tasks</th><th>Estimated h</th>
          </tr>
        </thead>
        <tbody>
          {port.map((p) => (
            <tr key={p.status} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0' }}>{p.status}</td>
              <td>{p.projects}</td>
              <td>{p.open_tasks}</td>
              <td>{Number(p.estimated_hours).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 40 }}>
        SLA {breached > 0 && <span style={{ color: 'var(--accent)', fontSize: 13 }}>({breached} breached)</span>}
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Project</th><th>Task</th><th>SLA</th><th>Due</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sla.map((s) => (
            <tr key={s.task_id} style={{ borderTop: '1px solid var(--line)', color: s.breached ? 'var(--accent)' : 'inherit' }}>
              <td style={{ padding: '10px 0' }}>{s.title}</td>
              <td>{s.task_title}</td>
              <td>{s.sla_target}</td>
              <td>{s.due_date ?? '—'}</td>
              <td>{s.breached ? 'breached' : s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
