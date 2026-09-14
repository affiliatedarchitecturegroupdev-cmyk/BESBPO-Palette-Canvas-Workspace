import { budgetVsEffort, currentEmail, invoiceReady, projects, rateCards } from '@/lib/api';
import { DataTable, EmptyState, PageHeader, StatCard } from '../components/ui';

const money = (n: number | null) => (n === null ? '—' : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

/** P6-07: commercial controls — rate cards, budget vs effort, invoice-ready milestones. */
export default async function CommercialPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const [cards, milestones, projectList] = await Promise.all([
    rateCards(email),
    invoiceReady(email),
    projects(email),
  ]);
  if ('error' in cards || 'error' in milestones) {
    return (
      <p style={{ color: 'var(--ink-dim)' }}>
        Commercial controls are visible to finance, account and operations roles.
      </p>
    );
  }
  const budgets = 'error' in projectList
    ? []
    : (await Promise.all(projectList.map((p) => budgetVsEffort(email, p.id))))
        .filter((b): b is Exclude<typeof b, { error: string }> => !('error' in b));

  const overBudget = budgets.filter((b) => (b.budget_amount ?? b.approved_amount) - b.logged_value < 0).length;

  return (
    <main>
      <PageHeader
        eyebrow="Capacity & delivery"
        title="Commercial"
        subtitle="Rate cards, budget vs effort, and invoice-ready milestones."
      />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="Rate cards" value={cards.length} detail="currency terms" />
        <StatCard label="Milestones" value={milestones.length} detail="invoice-ready" />
        <StatCard
          label="Over budget"
          value={overBudget}
          detail={overBudget > 0 ? 'needs attention' : 'all within'}
          trend={overBudget > 0 ? 'warn' : 'up'}
        />
      </section>

      <ReportSection title="Rate cards">
        <DataTable
          columns={[
            { key: 'card', header: 'Card', render: (c) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.name}</span> },
            { key: 'currency', header: 'Currency', render: (c) => <span style={{ color: 'var(--ink-dim)' }}>{c.currency}</span> },
            {
              key: 'entries',
              header: 'Entries',
              render: (c) => (
                <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
                  {c.entries.map((e) => `${e.role}${e.skill ? `/${e.skill}` : ''} $${Number(e.hourly_rate)}`).join(' · ')}
                </span>
              ),
            },
          ]}
          rows={cards}
          empty={<EmptyState title="No rate cards" />}
        />
      </ReportSection>

      <ReportSection title="Budget vs effort">
        <DataTable
          columns={[
            { key: 'project', header: 'Project', render: (b) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{b.name}</span> },
            { key: 'po', header: 'PO', render: (b) => b.po_number ?? '—' },
            { key: 'budget', header: 'Budget', render: (b) => money(b.budget_amount) },
            { key: 'approved', header: 'Approved est.', render: (b) => money(b.approved_amount) },
            { key: 'logged', header: 'Logged h', render: (b) => b.logged_hours.toFixed(1) },
            { key: 'value', header: 'Logged value', render: (b) => money(b.logged_value) },
            {
              key: 'variance',
              header: 'Variance',
              render: (b) => {
                const variance = (b.budget_amount ?? b.approved_amount) - b.logged_value;
                return (
                  <span style={{ color: variance < 0 ? 'var(--danger)' : 'var(--ink-dim)', fontWeight: variance < 0 ? 700 : 400 }}>
                    {money(variance)}
                  </span>
                );
              },
            },
          ]}
          rows={budgets}
          empty={<EmptyState title="No budget data" />}
        />
      </ReportSection>

      <ReportSection title="Invoice-ready milestones">
        <DataTable
          columns={[
            { key: 'milestone', header: 'Milestone', render: (m) => <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{m.name}</span> },
            { key: 'project', header: 'Project', render: (m) => m.project_name },
            { key: 'po', header: 'PO', render: (m) => m.po_number ?? '—' },
            { key: 'amount', header: 'Amount', render: (m) => (m.invoice_amount === null ? '—' : money(Number(m.invoice_amount))) },
            { key: 'target', header: 'Target', render: (m) => m.target_date ?? '—' },
          ]}
          rows={milestones}
          empty={<EmptyState title="No invoice-ready milestones" body="Milestones flag here as soon as delivery gates clear." />}
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
