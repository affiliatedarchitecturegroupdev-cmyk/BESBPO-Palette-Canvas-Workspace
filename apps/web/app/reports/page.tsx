import { currentEmail, portfolio, projectEffort, slaReport, utilisation } from '@/lib/api';
import { Badge, DataTable, EmptyState, PageHeader, ProgressBar, StatCard } from '../components/ui';

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
  const totalUtilAvg = util.length
    ? Math.round(util.reduce((s, u) => s + u.utilisation_pct, 0) / util.length)
    : 0;

  return (
    <main>
      <PageHeader
        eyebrow="Capacity & delivery"
        title="Reports"
        subtitle="Utilisation, effort variance, portfolio roll-up, and SLA health across the studio."
      />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="Avg utilisation" value={`${totalUtilAvg}%`} detail="across team" trend={totalUtilAvg > 85 ? 'warn' : 'flat'} />
        <StatCard label="Projects tracked" value={port.reduce((s, p) => s + p.projects, 0)} detail="in portfolio" />
        <StatCard
          label="SLA breaches"
          value={breached}
          detail={breached > 0 ? 'needs attention' : 'all green'}
          trend={breached > 0 ? 'warn' : 'up'}
        />
      </section>

      <ReportSection title="Utilisation">
        {util.length === 0 ? (
          <EmptyState title="No utilisation data" />
        ) : (
          <DataTable
            columns={[
              { key: 'person', header: 'Person', render: (u) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{u.name}</span> },
              { key: 'logged', header: 'Logged h', render: (u) => Number(u.logged_hours).toFixed(1) },
              { key: 'weekly', header: 'Weekly h', render: (u) => Number(u.weekly_hours).toFixed(0) },
              {
                key: 'util',
                header: 'Utilisation',
                render: (u) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                    <span style={{ flex: 1 }}><ProgressBar value={u.utilisation_pct} max={100} tone={u.utilisation_pct > 85 ? 'var(--warning)' : 'var(--accent)'} /></span>
                    <span style={{ fontSize: 12.5, minWidth: 34, textAlign: 'right' }}>{u.utilisation_pct}%</span>
                  </span>
                ),
              },
            ]}
            rows={util}
          />
        )}
      </ReportSection>

      <ReportSection title="Effort by project">
        <DataTable
          columns={[
            { key: 'project', header: 'Project', render: (e) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{e.title}</span> },
            { key: 'status', header: 'Status', render: (e) => <Badge status={e.status}>{e.status}</Badge> },
            { key: 'est', header: 'Estimated h', render: (e) => Number(e.estimated_hours).toFixed(1) },
            { key: 'logged', header: 'Logged h', render: (e) => Number(e.logged_hours).toFixed(1) },
            {
              key: 'variance',
              header: 'Variance h',
              render: (e) => (
                <span style={{ color: e.variance_hours > 0 ? 'var(--warning)' : 'var(--ink-dim)', fontWeight: e.variance_hours > 0 ? 700 : 400 }}>
                  {e.variance_hours > 0 ? '+' : ''}{e.variance_hours.toFixed(1)}
                </span>
              ),
            },
          ]}
          rows={effort}
          empty={<EmptyState title="No effort data" />}
        />
      </ReportSection>

      <ReportSection title="Portfolio">
        <DataTable
          columns={[
            { key: 'status', header: 'Status', render: (p) => <Badge status={p.status}>{p.status}</Badge> },
            { key: 'projects', header: 'Projects', render: (p) => p.projects },
            { key: 'open', header: 'Open tasks', render: (p) => p.open_tasks },
            { key: 'est', header: 'Estimated h', render: (p) => Number(p.estimated_hours).toFixed(1) },
          ]}
          rows={port}
          empty={<EmptyState title="No portfolio data" />}
        />
      </ReportSection>

      <ReportSection title={breached > 0 ? `SLA — ${breached} breached` : 'SLA'}>
        <DataTable
          columns={[
            { key: 'project', header: 'Project', render: (s) => s.title },
            { key: 'task', header: 'Task', render: (s) => s.task_title },
            { key: 'sla', header: 'SLA', render: (s) => s.sla_target },
            { key: 'due', header: 'Due', render: (s) => s.due_date ?? '—' },
            {
              key: 'status',
              header: 'Status',
              render: (s) => (s.breached ? <Badge status="overdue">breached</Badge> : <Badge status={s.status}>{s.status}</Badge>),
            },
          ]}
          rows={sla}
          empty={<EmptyState title="No SLA rows" />}
        />
      </ReportSection>
    </main>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: '28px 0' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 18, margin: '0 0 12px' }}>{title}</h2>
      {children}
    </section>
  );
}
