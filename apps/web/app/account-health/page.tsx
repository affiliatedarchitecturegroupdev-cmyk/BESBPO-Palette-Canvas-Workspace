import { accountHealth, currentEmail } from '@/lib/api';
import { DataTable, EmptyState, PageHeader, StatCard } from '../components/ui';

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

  const totalProjects = rows.reduce((s, r) => s + r.projects, 0);
  const openApprovals = rows.reduce((s, r) => s + r.open_approvals, 0);

  return (
    <main>
      <PageHeader
        eyebrow="Govern"
        title="Account health"
        subtitle="Agency engagement — delivery volume, approval responsiveness, and last activity."
      />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="Agencies" value={rows.length} detail="tracked" />
        <StatCard label="Projects" value={totalProjects} detail="across accounts" />
        <StatCard
          label="Open approvals"
          value={openApprovals}
          detail={openApprovals > 0 ? 'awaiting decisions' : 'all clear'}
          trend={openApprovals > 0 ? 'warn' : 'up'}
        />
      </section>

      <DataTable
        columns={[
          { key: 'agency', header: 'Agency', render: (r) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{r.agency_name}</span> },
          { key: 'projects', header: 'Projects', render: (r) => r.projects },
          {
            key: 'tasks',
            header: 'Tasks done',
            render: (r) => (
              <span style={{ color: r.tasks_total > 0 && r.tasks_completed / r.tasks_total > 0.7 ? 'var(--success)' : 'var(--ink-dim)' }}>
                {r.tasks_completed}/{r.tasks_total}
              </span>
            ),
          },
          {
            key: 'approvals',
            header: 'Open approvals',
            render: (r) => <span style={{ color: r.open_approvals > 0 ? 'var(--warning)' : 'var(--ink-faint)' }}>{r.open_approvals}</span>,
          },
          { key: 'decision', header: 'Avg decision (h)', render: (r) => r.avg_decision_hours ?? '—' },
          {
            key: 'activity',
            header: 'Last activity',
            render: (r) => (
              <span style={{ color: 'var(--ink-faint)' }}>{r.last_activity ? new Date(r.last_activity).toLocaleDateString() : '—'}</span>
            ),
          },
        ]}
        rows={rows}
        empty={<EmptyState title="No account data" body="Agency engagement metrics will appear here once production is rolling." />}
      />
    </main>
  );
}
