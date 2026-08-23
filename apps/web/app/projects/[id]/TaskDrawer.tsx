'use client';
import { useEffect, useState } from 'react';
import type { Comment, Person, Task, TaskDetail } from '@/lib/api';

/** Task detail: checklist, dependencies, comments (communication rule) and time log. */
export default function TaskDrawer({
  apiUrl,
  email,
  task,
  canWrite,
  people,
  onClose,
  onChange,
}: {
  apiUrl: string;
  email: string;
  task: Task;
  canWrite: boolean;
  people: Person[];
  onClose: () => void;
  onChange: () => void;
}) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [thread, setThread] = useState<Comment[]>([]);
  const [newItem, setNewItem] = useState('');
  const [message, setMessage] = useState('');
  const [hours, setHours] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const headers = { 'x-user-email': email };
    void fetch(`${apiUrl}/tasks/${task.id}`, { headers, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TaskDetail | null) => setDetail(d));
    void fetch(`${apiUrl}/comments/task/${task.id}`, { headers, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((c: Comment[]) => setThread(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function call(path: string, method: string, body: object, refreshComments = false) {
    setError('');
    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      setError(json.message ?? `HTTP ${res.status}`);
      return;
    }
    if (refreshComments) {
      const c = await fetch(`${apiUrl}/comments/task/${task.id}`, {
        headers: { 'x-user-email': email },
        cache: 'no-store',
      }).then((r) => (r.ok ? r.json() : []));
      setThread(c as Comment[]);
    }
    onChange();
  }

  // Dependency endpoints return task titles, not person ids
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        background: 'var(--paper)',
        borderLeft: '1px solid var(--line)',
        padding: 20,
        overflowY: 'auto',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.06)',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>{task.title}</h3>
        <button onClick={onClose} aria-label="Close task" style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer' }}>
          ✕
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
        {task.status} · {task.priority}
        {task.estimate_hours ? ` · ${task.estimate_hours}h est` : ''}
        {task.sla_target ? ` · SLA ${task.sla_target}` : ''}
      </p>
      {error && <p style={{ fontSize: 12, color: '#8b2e2e' }}>{error}</p>}

      {detail && (
        <section style={{ fontSize: 12 }}>
          <h4 style={{ margin: '16px 0 6px', fontSize: 11, textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Checklist</h4>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 4 }}>
            {detail.checklist.map((c) => (
              <li key={c.id}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={c.done}
                    disabled={!canWrite}
                    onChange={() => void call(`/tasks/${task.id}/checklist/${c.id}/toggle`, 'POST', {})}
                  />
                  <span style={{ textDecoration: c.done ? 'line-through' : 'none', color: 'var(--ink)' }}>{c.label}</span>
                </label>
              </li>
            ))}
          </ul>
          {canWrite && (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="add item"
                aria-label="New checklist item"
                style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}
              />
              <button
                onClick={() => {
                  if (!newItem.trim()) return;
                  void call(`/tasks/${task.id}/checklist`, 'POST', { label: newItem });
                  setNewItem('');
                }}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                add
              </button>
            </div>
          )}

          {(detail.dependencies.blocks.length > 0 || detail.dependencies.blocked_by.length > 0) && (
            <>
              <h4 style={{ margin: '16px 0 6px', fontSize: 11, textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Dependencies</h4>
              {detail.dependencies.blocks.length > 0 && (
                <p style={{ margin: 0 }}>waits on: {detail.dependencies.blocks.join(', ')}</p>
              )}
              {detail.dependencies.blocked_by.length > 0 && (
                <p style={{ margin: 0 }}>blocking: {detail.dependencies.blocked_by.join(', ')}</p>
              )}
            </>
          )}

          <h4 style={{ margin: '16px 0 6px', fontSize: 11, textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Time</h4>
          {canWrite && (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="hours, e.g. 1.5"
                aria-label="Hours to log"
                style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}
              />
              <button
                onClick={() => {
                  const h = Number(hours);
                  if (!h || h <= 0) return;
                  void call(`/workload/tasks/${task.id}/time`, 'POST', { hours: h });
                  setHours('');
                }}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                log time
              </button>
            </div>
          )}
        </section>
      )}

      <section style={{ marginTop: 20, fontSize: 12 }}>
        <h4 style={{ margin: '0 0 6px', fontSize: 11, textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Comments</h4>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {thread.map((c) => (
            <li key={c.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
              <span style={{ color: c.resolved ? 'var(--ink-faint)' : 'var(--ink)' }}>
                {c.body}
                {c.resolved && ' ✓ resolved'}
              </span>
            </li>
          ))}
          {thread.length === 0 && <li>No comments yet.</li>}
        </ul>
        {canWrite && (
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="comment…"
              aria-label="New comment"
              style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}
            />
            <button
              onClick={() => {
                if (!message.trim()) return;
                void call('/comments', 'POST', { targetType: 'task', targetId: task.id, body: message }, true);
                setMessage('');
              }}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              send
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}
