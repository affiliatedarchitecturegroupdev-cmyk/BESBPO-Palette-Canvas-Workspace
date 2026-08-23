import { currentEmail, agencies, brands } from '@/lib/api';

export default async function DirectoryPage() {
  const email = await currentEmail();
  const [agencyRes, brandRes] = await Promise.all([agencies(email), brands(email)]);
  if ('error' in agencyRes || 'error' in brandRes) {
    return <p style={{ color: 'var(--ink-dim)' }}>Directory unavailable — check your access.</p>;
  }

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 0 }}>Directory</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
        Agencies, client accounts, and brands — scoped to your role bindings.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 }}>
        <section style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Agencies</h2>
          <ul style={{ fontSize: 13, color: 'var(--ink-dim)', paddingLeft: 18 }}>
            {agencyRes.map((a) => (
              <li key={a.id} style={{ marginTop: 6 }}>
                <strong style={{ color: 'var(--ink)' }}>{a.name}</strong>
                {' · '}
                {a.confidentiality_tier} · health {a.health}
              </li>
            ))}
          </ul>
        </section>
        <section style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Brands</h2>
          <ul style={{ fontSize: 13, color: 'var(--ink-dim)', paddingLeft: 18 }}>
            {brandRes.map((b) => (
              <li key={b.id} style={{ marginTop: 6 }}>
                <strong style={{ color: 'var(--ink)' }}>{b.name}</strong>
                {' · '}
                {agencyRes.find((a) => a.id === b.agency_id)?.name ?? '—'}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
