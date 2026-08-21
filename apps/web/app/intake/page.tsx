import Link from 'next/link';
import { currentEmail, inbox, templates } from '@/lib/api';

export default async function IntakePage() {
  const email = await currentEmail();
  const res = await inbox(email);
  const tplRes = await templates(email);
  const tpls = Array.isArray(tplRes) ? tplRes : [];

  return (
    <main>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Intake inbox</h1>
        <Link href="/intake/new" style={{ color: 'var(--accent)', fontSize: 13 }}>
          New brief →
        </Link>
      </div>
      {'error' in res ? (
        <p style={{ color: 'var(--accent)' }}>{res.error === 'not signed in' ? 'Select a user to view intake.' : `API error: ${res.error}`}</p>
      ) : (
        <table style={{ width: '100%', marginTop: 24, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 12 }}>
              <th style={{ padding: '8px 4px' }}>Title</th>
              <th style={{ padding: '8px 4px' }}>Status</th>
              <th style={{ padding: '8px 4px' }}>Template</th>
              <th style={{ padding: '8px 4px' }}>Channel</th>
              <th style={{ padding: '8px 4px' }}>Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {res.map((b) => (
              <tr key={b.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 4px' }}>
                  <Link href={`/intake/${b.id}`} style={{ color: 'var(--ink)' }}>
                    {b.title}
                  </Link>
                  {b.duplicate_of && (
                    <span style={{ color: 'var(--accent)', fontSize: 11, marginLeft: 8 }}>
                      duplicate flagged
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 4px', fontSize: 13 }}>{b.status}</td>
                <td style={{ padding: '10px 4px', fontSize: 13, color: 'var(--ink-dim)' }}>
                  {tpls.find((t) => t.id === b.template_id)?.name ?? '—'}
                </td>
                <td style={{ padding: '10px 4px', fontSize: 13, color: 'var(--ink-dim)' }}>
                  {b.source_channel}
                </td>
                <td style={{ padding: '10px 4px', fontSize: 13, color: 'var(--ink-dim)' }}>
                  {b.created_at.slice(0, 10)}
                </td>
                <td style={{ padding: '10px 4px' }}>
                  {b.status === 'qualified' && (
                    <Link href={`/intake/${b.id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                      open
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {res.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, color: 'var(--ink-dim)', fontSize: 13 }}>
                  Inbox is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}
