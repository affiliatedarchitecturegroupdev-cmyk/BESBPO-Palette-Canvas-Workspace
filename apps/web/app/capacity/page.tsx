import { capacity, currentEmail, skillCoverage } from '@/lib/api';

/** P6-01: capacity planning — per-person load vs threshold + skill coverage. */
export default async function CapacityPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const [people, skills] = await Promise.all([capacity(email), skillCoverage(email)]);
  if ('error' in people || 'error' in skills) {
    return (
      <p style={{ color: 'var(--ink-dim)' }}>
        Capacity planning is visible to leadership, production and finance roles.
      </p>
    );
  }
  const over = people.filter((p) => p.over_threshold).length;

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Capacity</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        weekly capacity vs allocated work, and skill coverage
      </p>
      {over > 0 && (
        <p style={{ marginTop: 16, padding: '10px 14px', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 13 }}>
          {over} {over === 1 ? 'person is' : 'people are'} over their capacity threshold.
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Person</th><th>Weekly h</th><th>Allocated h</th><th>Utilisation</th><th>Threshold</th><th>Skills</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.person_id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{p.name}</td>
              <td>{Number(p.weekly_hours).toFixed(0)}</td>
              <td>{Number(p.allocated_hours).toFixed(1)}</td>
              <td style={{ color: p.over_threshold ? 'var(--accent)' : 'inherit', fontWeight: p.over_threshold ? 600 : 400 }}>
                {p.utilisation_pct}%
              </td>
              <td style={{ color: 'var(--ink-faint)' }}>{p.threshold_pct}%</td>
              <td style={{ color: 'var(--ink-dim)' }}>
                {p.skills.length ? p.skills.map((s) => `${s.name} ${s.level}`).join(' · ') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 40 }}>Skill coverage</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Skill</th><th>Holders</th><th>Avg level</th><th>Open demand h</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((s) => (
            <tr key={s.skill} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{s.skill}</td>
              <td>{s.holders}</td>
              <td>{s.avg_level.toFixed(1)}</td>
              <td style={{ color: s.demand_hours > 0 && s.holders === 0 ? 'var(--accent)' : 'inherit' }}>
                {Number(s.demand_hours).toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
