'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberRow, InviteRow } from '@/lib/api';

const ROLES = [
  'platform_owner',
  'operations_director',
  'account_manager',
  'production_lead',
  'creative_contributor',
  'quality_reviewer',
  'agency_admin',
  'agency_contributor',
  'client_approver',
  'third_party_vendor',
  'finance_user',
  'guest',
];

/**
 * Invite + member-revocation actions. The server enforces `invites.manage` on
 * every call; this component only decides what to render.
 */
export default function MemberActions({
  apiUrl,
  email,
  orgId,
  members,
  pendingInvites,
}: {
  apiUrl: string;
  email: string;
  orgId: string;
  members: MemberRow[];
  pendingInvites: InviteRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', role: 'creative_contributor' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastToken, setLastToken] = useState('');

  async function send(path: string, init: RequestInit): Promise<unknown | null> {
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
        return null;
      }
      router.refresh();
      return await res.json();
    } catch {
      setError('api unreachable');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    const created = (await send('/invites', {
      method: 'POST',
      body: JSON.stringify({
        email: form.email,
        role: form.role,
        scopeType: 'organisation',
        scopeId: orgId,
      }),
    })) as { token?: string } | null;
    if (created?.token) {
      // The token is shown once because there is no mail provider yet (ADR-0002
      // D1) — with no delivery, this is the only way an admin can hand it over.
      setLastToken(created.token);
      setNotice(`Invite created for ${form.email}. Share the token below.`);
      setForm({ email: '', role: form.role });
    }
  }

  async function revokeInvite(id: string) {
    await send(`/invites/${id}/revoke`, { method: 'POST' });
  }

  async function revokeRoles(personId: string, name: string) {
    if (!window.confirm(`Remove all roles for ${name}? They will lose workspace access.`)) return;
    await send(`/directory/members/${personId}/roles`, { method: 'DELETE' });
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 20 }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 16 }}>Invite a member</h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '6px 0 12px' }}>
          The invite creates the person and their role binding on acceptance.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ fontSize: 12, color: 'var(--ink-dim)', flex: '1 1 220px' }}>
            email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
            role
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={{
                width: '100%',
                padding: '7px 9px',
                marginTop: 4,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => form.email && invite()}
            disabled={busy || !form.email}
            style={{
              padding: '8px 14px',
              background: 'var(--accent)',
              color: 'var(--paper)',
              border: 0,
              borderRadius: 'var(--radius-sm)',
              fontSize: 12.5,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy || !form.email ? 0.6 : 1,
            }}
          >
            send invite
          </button>
        </div>
        {notice && <p style={{ color: 'var(--success)', fontSize: 12.5, marginTop: 12 }}>{notice}</p>}
        {lastToken && (
          <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 6, wordBreak: 'break-all' }}>
            token: <code style={{ color: 'var(--ink)' }}>{lastToken}</code>
            <br />
            accept at <code style={{ color: 'var(--ink)' }}>/signup</code> with this token.
          </p>
        )}
        {error && <p style={{ color: 'var(--accent)', fontSize: 12, marginTop: 10, whiteSpace: 'pre-wrap' }}>{error}</p>}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: '0 0 10px', fontSize: 16 }}>
          Pending invites
        </h2>
        {pendingInvites.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No pending invites.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {pendingInvites.map((i) => (
              <li
                key={i.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-base)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ flex: '1 1 200px' }}>
                  <strong style={{ color: 'var(--ink)', fontSize: 13.5 }}>{i.email}</strong>
                  <span style={{ display: 'block', color: 'var(--ink-faint)', fontSize: 11.5 }}>
                    {i.role.replace(/_/g, ' ')} · expires {new Date(i.expires_at).toLocaleDateString()}
                  </span>
                </span>
                <button
                  onClick={() => revokeInvite(i.id)}
                  disabled={busy}
                  style={{
                    padding: '5px 10px',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-dim)',
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  revoke invite
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: '0 0 10px', fontSize: 16 }}>Members</h2>
        {members.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No members yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {members.map((m) => (
              <li
                key={m.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-base)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ flex: '1 1 200px' }}>
                  <strong style={{ color: 'var(--ink)', fontSize: 13.5 }}>{m.name}</strong>
                  <span style={{ display: 'block', color: 'var(--ink-faint)', fontSize: 11.5 }}>{m.email}</span>
                </span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: '2 1 240px' }}>
                  {m.roles.length === 0 ? (
                    <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>no roles</span>
                  ) : (
                    m.roles.map((r) => (
                      <span
                        key={`${r.role}:${r.scope_type}:${r.scope_id}`}
                        title={`${r.scope_type}: ${r.scope_id}`}
                        style={{
                          fontSize: 11.5,
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: '1px solid var(--line)',
                          color: 'var(--ink-dim)',
                        }}
                      >
                        {r.role.replace(/_/g, ' ')}
                      </span>
                    ))
                  )}
                </span>
                <button
                  onClick={() => revokeRoles(m.id, m.name)}
                  disabled={busy}
                  style={{
                    padding: '5px 10px',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-dim)',
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  revoke roles
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}