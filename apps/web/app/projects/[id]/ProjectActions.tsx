'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Person } from '@/lib/api';

/** Milestone + status + role assignment actions (ProjectsManage-gated server-side). */
export default function ProjectActions({
  apiUrl,
  email,
  projectId,
  statusOptions,
}: {
  apiUrl: string;
  email: string;
  projectId: string;
  statusOptions: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [roleAction, setRoleAction] = useState({ person: '', role: 'account_manager' });
  const [status, setStatus] = useState('');

  useEffect(() => {
    void fetch(`${apiUrl}/identity/users`)
      .then((r) => r.json())
      .then((rows: Person[]) => setPeople(rows));
  }, [apiUrl]);

  async function post(path: string, body: object) {
    setError('');
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-email': email },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      setError(text || `HTTP ${res.status}`);
      return;
    }
    setName('');
    router.refresh();
  }

  return (
    <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20, marginTop: 16 }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 16 }}>Actions</h2>
      <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 10 }}>
        milestone name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: 6, marginTop: 4, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </label>
      <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 8 }}>
        target date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '100%', padding: 6, marginTop: 4, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </label>
      <button
        onClick={() => post(`projects/${projectId}/milestones`, { name, targetDate: date || undefined })}
        style={{ marginTop: 8, padding: '6px 12px', background: 'var(--paper)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink)' }}
      >
        add milestone
      </button>

      <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 16 }}>
        status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ width: '100%', padding: 6, marginTop: 4, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          <option value="">—</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() => status && post(`projects/${projectId}/status`, { status })}
        style={{ marginTop: 8, padding: '6px 12px', background: 'var(--accent)', color: 'var(--paper)', border: 0, fontSize: 12 }}
      >
        move status
      </button>

      <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 16 }}>
        person
        <select
          value={roleAction.person}
          onChange={(e) => setRoleAction({ ...roleAction, person: e.target.value })}
          style={{ width: '100%', padding: 6, marginTop: 4, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          <option value="">—</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 8 }}>
        role
        <input
          value={roleAction.role}
          onChange={(e) => setRoleAction({ ...roleAction, role: e.target.value })}
          style={{ width: '100%', padding: 6, marginTop: 4, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </label>
      <button
        onClick={() =>
          roleAction.person && post(`projects/${projectId}/roles`, { personId: roleAction.person, role: roleAction.role })
        }
        style={{ marginTop: 8, padding: '6px 12px', background: 'var(--paper)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink)' }}
      >
        assign role
      </button>

      {error && <p style={{ color: 'var(--accent)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{error}</p>}
    </div>
  );
}
