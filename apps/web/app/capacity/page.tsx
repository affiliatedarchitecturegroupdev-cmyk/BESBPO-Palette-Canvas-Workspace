import { capacity, currentEmail, skillCoverage } from '@/lib/api';
import { Card, PageHeader, ProgressBar, StatCard } from '../components/ui';

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
  const avgUtil = people.length
    ? Math.round(people.reduce((s, p) => s + p.utilisation_pct, 0) / people.length)
    : 0;

  return (
    <main>
      <PageHeader
        eyebrow="Capacity & delivery"
        title="Capacity"
        subtitle="Weekly capacity vs allocated work, plus skill coverage across the studio."
      />

      {over > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--warning)',
            background: 'var(--warning-soft)',
            color: 'var(--warning)',
            fontSize: 13,
          }}
        >
          ⚠ {over} {over === 1 ? 'person is' : 'people are'} over their capacity threshold.
        </div>
      )}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="Team" value={people.length} detail="on the bench" />
        <StatCard label="Avg utilisation" value={`${avgUtil}%`} detail="across team" trend={avgUtil > 85 ? 'warn' : 'flat'} />
        <StatCard label="Over threshold" value={over} detail={over ? 'needs rebalance' : 'all clear'} trend={over > 0 ? 'warn' : 'up'} />
      </section>

      <Card style={{ padding: 20, marginBottom: 24 }}>
        <div className="pc-table-head pc-head-capacity"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,150px) 80px 100px 90px 90px 1fr',
            gap: 12,
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            padding: '0 4px 8px',
          }}
        >
          <span>Person</span>
          <span style={{ textAlign: 'right' }}>Weekly</span>
          <span style={{ textAlign: 'right' }}>Allocated</span>
          <span style={{ textAlign: 'right' }}>Utilisation</span>
          <span style={{ textAlign: 'right' }}>Threshold</span>
          <span>Load</span>
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          {people.map((p) => {
            const warn = p.over_threshold;
            return (
              <div
                key={p.person_id}
                className="pc-table-row pc-row-capacity"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,150px) 80px 100px 90px 90px 1fr',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 4px',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 13.5 }}>{p.name}</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-dim)' }}>{Number(p.weekly_hours).toFixed(0)}h</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink)' }}>{Number(p.allocated_hours).toFixed(1)}h</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: warn ? 'var(--danger)' : 'var(--ink)', fontWeight: warn ? 700 : 400 }}>
                  {p.utilisation_pct}%
                </span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-faint)' }}>{p.threshold_pct}%</span>
                <span>
                  <ProgressBar value={p.utilisation_pct} max={p.threshold_pct} tone={warn ? 'var(--danger)' : 'var(--accent)'} />
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 18, margin: '0 0 12px' }}>Skill coverage</h2>
      <Card style={{ padding: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 110px 130px',
            gap: 12,
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            padding: '0 4px 8px',
          }}
          className="pc-table-head pc-head-skills"
        >
          <span>Skill</span>
          <span style={{ textAlign: 'right' }}>Holders</span>
          <span style={{ textAlign: 'right' }}>Avg level</span>
          <span style={{ textAlign: 'right' }}>Open demand h</span>
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          {skills.map((s) => {
            const gap = s.demand_hours > 0 && s.holders === 0;
            return (
              <div
                key={s.skill}
                className="pc-table-row pc-row-skills"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 90px 110px 130px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 4px',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 13.5 }}>{s.skill}</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-dim)' }}>{s.holders}</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-dim)' }}>{s.avg_level.toFixed(1)}</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: gap ? 'var(--danger)' : 'var(--ink)', fontWeight: gap ? 700 : 400 }}>
                  {Number(s.demand_hours).toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
