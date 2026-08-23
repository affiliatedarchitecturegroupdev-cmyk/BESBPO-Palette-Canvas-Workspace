import Link from 'next/link';
import { Capability, ProjectStatus, can } from '@palette-canvas/shared';
import { board, calendar, currentEmail, deliverables, me, projectHome, templates } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import ProjectActions from './ProjectActions';
import BoardView from './BoardView';

export default async function ProjectHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await currentEmail();
  const res = await projectHome(email, id);
  if ('error' in res || !res || !email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Project unavailable — check your access.</p>;
  }
  const [tplRes, boardRes, calRes, dlRes, meRes] = await Promise.all([
    templates(email),
    board(email, id),
    calendar(email, id),
    deliverables(email, id),
    me(email),
  ]);
  const tpl = Array.isArray(tplRes) ? tplRes.find((t) => t.id === res.project.template_id) : undefined;
  const phases = tpl?.definition.phases ?? [];
  const currentIdx = phases.indexOf(res.project.status);
  const roles = 'roles' in meRes ? meRes.roles : [];
  const canWrite = can(roles as Parameters<typeof can>[0], Capability.TasksWrite);
  const tasks = 'tasks' in boardRes ? boardRes.tasks : [];
  const cal = Array.isArray(calRes) ? calRes : [];
  const dl = Array.isArray(dlRes) ? dlRes : [];

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
            apiUrl={BROWSER_API}
            email={email}
            projectId={id}
            statusOptions={Object.values(ProjectStatus)}
          />
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20, marginTop: 16 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 16 }}>Deliverables</h2>
            <ul style={{ fontSize: 13, color: 'var(--ink-dim)', paddingLeft: 18 }}>
              {dl.map((d) => (
                <li key={d.id} style={{ marginTop: 6 }}>
                  <Link href={`/projects/${id}/deliverables/${d.id}`} style={{ color: 'var(--ink)' }}>
                    <strong>{d.name}</strong>
                  </Link>
                  {' — '}
                  {d.status}
                  {d.due_date ? ` · due ${d.due_date}` : ''}
                </li>
              ))}
              {dl.length === 0 && <li>No deliverables yet.</li>}
            </ul>
          </div>
        </section>
      </div>

      <BoardView
        apiUrl={BROWSER_API}
        email={email}
        projectId={id}
        initialTasks={tasks}
        calendarTasks={cal}
        canWrite={canWrite}
      />
    </main>
  );
}
