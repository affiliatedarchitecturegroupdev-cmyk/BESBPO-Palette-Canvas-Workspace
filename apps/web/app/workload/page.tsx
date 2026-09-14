import { currentEmail, workload } from '@/lib/api';
import { Card, PageHeader, StatCard, ProgressBar } from '../components/ui';

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
  const people = res.length;
  const maxEst = Math.max(1, ...res.map((r) => Number(r.estimated_hours)));

  return (
    <main>
      <PageHeader
        eyebrow="Capacity"
        title="Workload"
        subtitle="Open assignment load across the organisation — estimated vs logged effort."
      />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="People" value={people} detail="with open work" />
        <StatCard label="Estimated" value={`${totalEst.toFixed(0)}h`} detail="open pipeline" />
        <StatCard label="Logged" value={`${totalLog.toFixed(0)}h`} detail="against pipeline" />
        <StatCard
          label="Burn"
          value={`${totalEst > 0 ? Math.round((totalLog / totalEst) * 100) : 0}%`}
          detail="effort consumed"
          trend={totalEst > 0 && totalLog / totalEst > 0.9 ? 'warn' : 'flat'}
        />
      </section>

      <Card style={{ padding: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,176px) 96px 110px 110px 1fr',
            gap: 12,
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            padding: '0 4px 8px',
          }}
          className="pc-table-head"
        >
          <span>Person</span>
          <span style={{ textAlign: 'right' }}>Open tasks</span>
          <span style={{ textAlign: 'right' }}>Estimated h</span>
          <span style={{ textAlign: 'right' }}>Logged h</span>
          <span>Load</span>
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          {res.map((r) => {
            const pct = Math.round((Number(r.estimated_hours) / maxEst) * 100);
            const warn = Number(r.estimated_hours) > 0 && Number(r.logged_hours) / Number(r.estimated_hours) > 0.9;
            const tone = warn ? 'var(--warning)' : 'var(--accent)';
            return (
              <div
                key={r.person_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,176px) 96px 110px 110px 1fr',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 4px',
                  borderTop: '1px solid var(--line)',
                }}
                className="pc-table-row"
              >
                <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 13.5 }}>{r.name}</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-dim)' }}>{r.open_tasks}</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink)' }}>
                  {Number(r.estimated_hours).toFixed(1)}
                </span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-dim)' }}>
                  {Number(r.logged_hours).toFixed(1)}
                </span>
                <span>
                  <ProgressBar value={pct} max={100} tone={tone} />
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
