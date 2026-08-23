import Link from 'next/link';
import { currentEmail, projects } from '@/lib/api';

export default async function ProjectsPage() {
  const email = await currentEmail();
  const res = await projects(email);
  if ('error' in res) {
    return <p style={{ color: 'var(--ink-dim)' }}>Projects unavailable — check your access.</p>;
  }

  return (
    <main>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, marginTop: 0 }}>Projects</h1>
      <table style={{ width: '100%', marginTop: 20, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 12 }}>
            <th>Name</th>
            <th>Status</th>
            <th>Visibility</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {res.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 4px' }}>
                <Link href={`/projects/${p.id}`} style={{ color: 'var(--ink)' }}>
                  {p.name}
                </Link>
              </td>
              <td style={{ fontSize: 13 }}>{p.status}</td>
              <td style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{p.visibility}</td>
              <td style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{p.created_at.slice(0, 10)}</td>
              <td>
                <Link href={`/projects/${p.id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                  home
                </Link>
              </td>
            </tr>
          ))}
          {res.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 24, color: 'var(--ink-dim)', fontSize: 13 }}>
                No projects yet — convert a qualified brief from intake.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
