import { currentEmail, agencies, brands } from '@/lib/api';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';

export default async function DirectoryPage() {
  const email = await currentEmail();
  const [agencyRes, brandRes] = await Promise.all([agencies(email), brands(email)]);
  if ('error' in agencyRes || 'error' in brandRes) {
    return <p style={{ color: 'var(--ink-dim)' }}>Directory unavailable — check your access.</p>;
  }

  return (
    <main>
      <PageHeader
        eyebrow="Connect"
        title="Directory"
        subtitle="Agencies, client accounts, and brands — scoped to your role bindings."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17, marginBottom: 12 }}>
            Agencies
          </h2>
          {agencyRes.length === 0 ? (
            <EmptyState title="No agencies" body="Agencies you can view will appear here." />
          ) : (
            <ul style={{ fontSize: 13.5, color: 'var(--ink-dim)', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
              {agencyRes.map((a) => (
                <li
                  key={a.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-base)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <strong style={{ color: 'var(--ink)', flex: 1 }}>{a.name}</strong>
                  <Badge status={a.health}>{a.health}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, margin: 0, fontSize: 17, marginBottom: 12 }}>
            Brands
          </h2>
          {brandRes.length === 0 ? (
            <EmptyState title="No brands" body="Brands under your agencies will appear here." />
          ) : (
            <ul style={{ fontSize: 13.5, color: 'var(--ink-dim)', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
              {brandRes.map((b) => (
                <li
                  key={b.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-base)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <strong style={{ color: 'var(--ink)' }}>{b.name}</strong>
                  <span style={{ color: 'var(--ink-faint)' }}>
                    {' · '}
                    {agencyRes.find((a) => a.id === b.agency_id)?.name ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
