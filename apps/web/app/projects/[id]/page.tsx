import Link from 'next/link';
import { ProjectStatus } from '@palette-canvas/shared';
import { currentEmail, projectHome, templates } from '@/lib/api';
import { API_URL } from '@/lib/config';
import ProjectActions from './ProjectActions';

export default async function ProjectHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await currentEmail();
  const res = await projectHome(email, id);
  if ('error' in res || !res || !email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Project unavailable — check your access.</p>;
  }
  const tplRes = await templates(email);
  const tpl = Array.isArray(tplRes) ? tplRes.find((t) => t.id === res.project.template_id) : undefined;
  const phases = tpl?.definition.phases ?? [];
  const currentIdx = phases.indexOf(res.project.status);

  return (
    <main>
      <Link href="/projects" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
        ← projects
      </Link>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: '4px 0' }}>
        {res.project.name}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
        status: <strong>{res.project.status}</strong> · {tpl?.name ?? res.project.template_id}
      </p>

      <ol style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: '12px 0 24px' }}>
        {phases.map((p, i) => (
          <li
            key={p}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--line)',
              fontSize: 12,
              background: i === currentIdx ? 'var(--accent)' : i < currentIdx ? 'var(--line)' : 'var(--paper)',
              color: i === currentIdx ? 'var(--paper)' : 'var(--ink-dim)',
            }}
          >
            {p}
          </li>
        ))}
      </ol>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <section style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Milestones</h2>
          <ul style={{ fontSize: 13, color: 'var(--ink-dim)', paddingLeft: 18 }}>
            {res.milestones.map((m) => (
              <li key={m.id} style={{ marginTop: 6 }}>
                <strong style={{ color: 'var(--ink)' }}>{m.name}</strong>
                {' — '}
                {m.target_date ?? 'no date'} · {m.status}
              </li>
            ))}
            {res.milestones.length === 0 && <li>No milestones yet.</li>}
          </ul>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}>Charter (from brief)</h2>
          {res.brief ? (
            <dl style={{ fontSize: 13 }}>
              {Object.entries(res.brief.fields).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 6 }}>
                  <dt style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{k}</dt>
                  <dd style={{ margin: 0 }}>{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>No linked brief.</p>
          )}
        </section>

        <section>
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Roles</h2>
            <ul style={{ fontSize: 13, color: 'var(--ink-dim)', paddingLeft: 18 }}>
              {res.roles.map((r) => (
                <li key={`${r.person_id}-${r.role}`} style={{ marginTop: 6 }}>
                  {r.name} — {r.role}
                </li>
              ))}
              {res.roles.length === 0 && <li>No roles assigned.</li>}
            </ul>
          </div>
          <ProjectActions
            apiUrl={API_URL}
            email={email}
            projectId={id}
            statusOptions={Object.values(ProjectStatus)}
          />
        </section>
      </div>
    </main>
  );
}
