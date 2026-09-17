'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2Meeting } from '@/lib/api';

/**
 * Meeting list plus scheduling (§11.4). Joining records attendance on the
 * caller; nothing here infers who attended.
 *
 * A meeting with no `engagement_id` is internal, and the server will refuse it
 * to a client even if the id is known — the schedule form therefore has no
 * engagement field. Letting a client name an engagement would be an attempt to
 * create a meeting it cannot read back, which `scheduleMeeting` rejects anyway.
 */
export default function MeetingActions({
  apiUrl,
  email,
  meetings,
  canWrite,
}: {
  apiUrl: string;
  email: string;
  meetings: V2Meeting[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', startsAt: '', roomRef: '' });

  async function send(path: string, init: RequestInit): Promise<boolean> {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', 'x-user-email': email, ...(init.headers ?? {}) },
      });
      if (!res.ok) {
        setError((await res.text()) || `HTTP ${res.status}`);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('api unreachable');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    const done = await send('/comms/meetings', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        startsAt: new Date(form.startsAt).toISOString(),
        roomRef: form.roomRef,
      }),
    });
    if (done) {
      setForm({ title: '', startsAt: '', roomRef: '' });
      setNotice('Meeting scheduled.');
    }
  }

  async function join(id: string, title: string) {
    const done = await send(`/comms/meetings/${id}/join`, { method: 'POST' });
    if (done) setNotice(`Attendance recorded for “${title}”.`);
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {canWrite && (
        <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 16 }}>Schedule a meeting</h2>
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '6px 0 12px' }}>
            A meeting needs a room reference or an external link; without one it is
            a placeholder, not a meeting.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', flex: '1 1 220px' }}>
              title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '7px 9px',
                  marginTop: 4,
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                }}
              />
            </label>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', flex: '1 1 200px' }}>
              starts at
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                style={{
                  width: '100%',
                  padding: '7px 9px',
                  marginTop: 4,
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                }}
              />
            </label>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', flex: '1 1 180px' }}>
              room reference
              <input
                value={form.roomRef}
                onChange={(e) => setForm({ ...form, roomRef: e.target.value })}
                placeholder="room-nimbus"
                style={{
                  width: '100%',
                  padding: '7px 9px',
                  marginTop: 4,
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                }}
              />
            </label>
            <button
              onClick={schedule}
              disabled={busy || !form.title || !form.startsAt || !form.roomRef}
              style={{
                padding: '8px 14px',
                background: 'var(--accent)',
                color: 'var(--paper)',
                border: 0,
                borderRadius: 'var(--radius-sm)',
                fontSize: 12.5,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy || !form.title || !form.startsAt || !form.roomRef ? 0.6 : 1,
              }}
            >
              schedule
            </button>
          </div>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {meetings.map((m) => (
          <li
            key={m.id}
            style={{
              border: '1px solid var(--line)',
              background: 'var(--paper-raise)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ flex: '1 1 260px' }}>
              <strong style={{ color: 'var(--ink)', fontSize: 13.5 }}>{m.title}</strong>
              <span style={{ display: 'block', color: 'var(--ink-faint)', fontSize: 11.5 }}>
                {new Date(m.starts_at).toLocaleString()} · {m.duration_mins} min ·{' '}
                {m.engagement_id ? 'engagement' : 'internal'} ·{' '}
                {m.room_ref ? `room ${m.room_ref}` : m.external_url}
              </span>
            </span>
            {canWrite && (
              <button
                onClick={() => join(m.id, m.title)}
                disabled={busy}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink-dim)',
                  fontSize: 11.5,
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                record my attendance
              </button>
            )}
          </li>
        ))}
      </ul>

      {notice && <p style={{ color: 'var(--success)', fontSize: 12.5, margin: 0 }}>{notice}</p>}
      {error && <p style={{ color: 'var(--accent)', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>{error}</p>}
    </div>
  );
}