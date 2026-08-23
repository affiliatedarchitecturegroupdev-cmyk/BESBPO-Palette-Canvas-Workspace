import { budgetVsEffort, currentEmail, invoiceReady, projects, rateCards } from '@/lib/api';

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

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Commercial</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 4 }}>
        rate cards, budget vs effort, and invoice-ready milestones
      </p>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 18, marginTop: 32 }}>Rate cards</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Card</th><th>Currency</th><th>Entries</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{c.name}</td>
              <td>{c.currency}</td>
              <td style={{ color: 'var(--ink-dim)' }}>
                {c.entries.map((e) => `${e.role}${e.skill ? `/${e.skill}` : ''} $${Number(e.hourly_rate)}`).join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 18, marginTop: 32 }}>Budget vs effort</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
            <th>Project</th><th>PO</th><th>Budget</th><th>Approved est.</th><th>Logged h</th><th>Logged value</th><th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((b) => {
            const variance = (b.budget_amount ?? b.approved_amount) - b.logged_value;
            return (
              <tr key={b.project_id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{b.name}</td>
                <td style={{ color: 'var(--ink-dim)' }}>{b.po_number ?? '—'}</td>
                <td>{money(b.budget_amount)}</td>
                <td>{money(b.approved_amount)}</td>
                <td>{b.logged_hours.toFixed(1)}</td>
                <td>{money(b.logged_value)}</td>
                <td style={{ color: variance < 0 ? 'var(--accent)' : 'inherit' }}>{money(variance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 18, marginTop: 32 }}>Invoice-ready milestones</h2>
      {milestones.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 12 }}>No milestones flagged invoice-ready.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
              <th>Milestone</th><th>Project</th><th>PO</th><th>Amount</th><th>Target</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 0', color: 'var(--ink)' }}>{m.name}</td>
                <td style={{ color: 'var(--ink-dim)' }}>{m.project_name}</td>
                <td style={{ color: 'var(--ink-dim)' }}>{m.po_number ?? '—'}</td>
                <td>{m.invoice_amount === null ? '—' : money(Number(m.invoice_amount))}</td>
                <td style={{ color: 'var(--ink-faint)' }}>{m.target_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
