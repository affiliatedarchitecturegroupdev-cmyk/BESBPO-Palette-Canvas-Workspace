'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Person, Task } from '@/lib/api';
import TaskDrawer from './TaskDrawer';

/**
 * Production workspace: board / list / calendar over one task data model.
 * Board columns come from the statuses actually present plus a default set
 * (template-specific columns land when template authoring arrives).
 */
const DEFAULT_COLUMNS = ['backlog', 'in_progress', 'internal_review', 'done'];

export default function BoardView({
  apiUrl,
  email,
  projectId,
  initialTasks,
  calendarTasks,
  canWrite,
}: {
  apiUrl: string;
  email: string;
  projectId: string;
  initialTasks: Task[];
  calendarTasks: Array<Pick<Task, 'id' | 'title' | 'due_date' | 'status' | 'assignee_id' | 'priority'>>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<'board' | 'list' | 'calendar'>('board');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [open, setOpen] = useState<Task | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch(`${apiUrl}/identity/users`)
      .then((r) => r.json())
      .then((rows: Person[]) => setPeople(rows));
  }, [apiUrl]);

  const refresh = useCallback(async () => {
    const res = await fetch(`${apiUrl}/tasks/project/${projectId}`, {
      headers: { 'x-user-email': email },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as { tasks: Task[] };
      setTasks(json.tasks);
      setOpen((prev) => (prev ? json.tasks.find((t) => t.id === prev.id) ?? null : null));
    }
  }, [apiUrl, email, projectId]);

  async function move(taskId: string, status: string) {
    setError('');
    const res = await fetch(`${apiUrl}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { message?: string };
      setError(json.message ?? `HTTP ${res.status}`);
      return;
    }
    await refresh();
    router.refresh();
  }

  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? 'unassigned';
  const columns = [...new Set([...DEFAULT_COLUMNS, ...tasks.map((t) => t.status)])];

  const card = (t: Task) => (
    <li
      key={t.id}
      onClick={() => setOpen(t)}
      style={{
        border: '1px solid var(--line)',
        background: 'var(--paper)',
        padding: '10px 12px',
        cursor: 'pointer',
        listStyle: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{t.title}</strong>
        <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{t.priority}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>
        {nameOf(t.assignee_id)}
        {t.due_date ? ` · due ${t.due_date}` : ''}
        {t.estimate_hours ? ` · ${t.estimate_hours}h est` : ''}
      </div>
      {canWrite && (
        <select
          aria-label={`Status for ${t.title}`}
          value={t.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void move(t.id, e.target.value)}
          style={{ marginTop: 6, fontSize: 11, width: '100%' }}
        >
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
    </li>
  );

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 16 }}>Work</h2>
        <nav aria-label="Work view" style={{ display: 'flex', gap: 4 }}>
          {(['board', 'list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontSize: 11,
                padding: '3px 10px',
                border: '1px solid var(--line)',
                background: view === v ? 'var(--accent)' : 'var(--paper)',
                color: view === v ? 'var(--paper)' : 'var(--ink-dim)',
                cursor: 'pointer',
              }}
            >
              {v}
            </button>
          ))}
        </nav>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#8b2e2e', marginTop: 8 }}>
          {error}
        </p>
      )}

      {view === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 12, marginTop: 12 }}>
          {columns.map((col) => (
            <div key={col} style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 10 }}>
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, color: 'var(--ink-faint)' }}>
                {col} ({tasks.filter((t) => t.status === col).length})
              </h3>
              <ul style={{ display: 'grid', gap: 8, margin: '10px 0 0', padding: 0 }}>
                {tasks.filter((t) => t.status === col).map(card)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {view === 'list' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 11 }}>
              <th>Title</th><th>Status</th><th>Assignee</th><th>Due</th><th>Priority</th><th>Est h</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} onClick={() => setOpen(t)} style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                <td style={{ padding: '8px 0' }}>{t.title}</td>
                <td>{t.status}</td>
                <td>{nameOf(t.assignee_id)}</td>
                <td>{t.due_date ?? '—'}</td>
                <td>{t.priority}</td>
                <td>{t.estimate_hours ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'calendar' && (
        <ul style={{ marginTop: 12, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {calendarTasks.length === 0 && <li style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No dated tasks.</li>}
          {calendarTasks.map((t) => (
            <li key={t.id} style={{ fontSize: 13, display: 'flex', gap: 16, borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
              <span style={{ color: 'var(--accent)', minWidth: 90 }}>{t.due_date}</span>
              <span>{t.title}</span>
              <span style={{ color: 'var(--ink-faint)' }}>{t.status}</span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <TaskDrawer
          apiUrl={apiUrl}
          email={email}
          task={open}
          canWrite={canWrite}
          people={people}
          onClose={() => setOpen(null)}
          onChange={() => void refresh()}
        />
      )}
    </section>
  );
}
