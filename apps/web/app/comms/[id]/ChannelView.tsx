'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Person, V2Message } from '@/lib/api';

/**
 * Channel conversation (§11.2). Threads are one level deep by contract — the
 * API rejects a reply whose parent belongs to another channel and never nests
 * a reply under a reply, so the renderer only ever draws two levels.
 *
 * `canWrite` only decides what is offered here. `channels.write` is enforced on
 * every call by the server; a role without it (quality_reviewer, for example)
 * gets a read-only conversation rather than a compose box that 403s.
 */
export default function ChannelView({
  apiUrl,
  email,
  channelId,
  visibility,
  canWrite,
  people,
  roots,
  replies,
}: {
  apiUrl: string;
  email: string;
  channelId: string;
  visibility: 'internal' | 'external';
  canWrite: boolean;
  people: Person[];
  roots: V2Message[];
  replies: Record<string, V2Message[]>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;

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

  async function post(parentMessageId: string | null) {
    if (!draft.trim()) return;
    const created = await send(`/comms/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: draft, parentMessageId, mentions }),
    });
    if (created) {
      setDraft('');
      setMentions([]);
      setReplyTo(null);
    }
  }

  async function convert() {
    if (!window.confirm('Convert this channel to external? The client will see everything posted here.')) return;
    const done = await send(`/comms/channels/${channelId}/convert-external`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (done) {
      setReason('');
      setNotice('Channel converted to external. The reason is recorded in the audit log.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {!canWrite && (
        <p
          style={{
            margin: 0,
            padding: '10px 14px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--brand-base)',
            color: 'var(--ink-dim)',
            fontSize: 12.5,
          }}
        >
          Your roles give you read access to channels but not the ability to post.
        </p>
      )}

      {canWrite && visibility === 'internal' && (
        <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 16 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 15 }}>
            Convert to a client channel
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '6px 0 12px' }}>
            Visibility is fixed when a channel is created. Making this conversation
            client-facing is an explicit, audited action, and it is one-way.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', flex: '1 1 280px' }}>
              reason (recorded in the audit log)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="why this needs to be client-facing"
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
              onClick={convert}
              disabled={busy || reason.trim().length < 4}
              style={{
                padding: '8px 14px',
                background: 'var(--flare)',
                color: '#fff',
                border: 0,
                borderRadius: 'var(--radius-sm)',
                fontSize: 12.5,
                cursor: busy || reason.trim().length < 4 ? 'default' : 'pointer',
                opacity: busy || reason.trim().length < 4 ? 0.6 : 1,
              }}
            >
              convert to external
            </button>
          </div>
        </div>
      )}

      {roots.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No messages yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {roots.map((m) => (
            <li
              key={m.id}
              style={{
                border: '1px solid var(--line)',
                background: 'var(--paper-raise)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{nameOf(m.created_by)}</strong>
                <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                  {new Date(m.created_at).toLocaleString()}
                </span>
                {m.mentions.length > 0 && (
                  <span style={{ fontSize: 11.5, color: 'var(--accent)' }}>
                    @{m.mentions.map(nameOf).join(', @')}
                  </span>
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-dim)', whiteSpace: 'pre-wrap' }}>
                {m.body}
              </p>

              {(replies[m.id] ?? []).length > 0 && (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    borderLeft: '2px solid var(--line)',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  {(replies[m.id] ?? []).map((r) => (
                    <li key={r.id} style={{ paddingLeft: 12 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 12.5, color: 'var(--ink)' }}>{nameOf(r.created_by)}</strong>
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-dim)', whiteSpace: 'pre-wrap' }}>
                        {r.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {canWrite && (
                <button
                  onClick={() => setReplyTo(replyTo === m.id ? null : m.id)}
                  style={{
                    marginTop: 10,
                    padding: '4px 10px',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-faint)',
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  {replyTo === m.id ? 'cancel' : 'reply in thread'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <div style={{ border: '1px solid var(--line)', background: 'var(--paper-raise)', padding: 16 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0, fontSize: 15 }}>
            {replyTo ? 'Reply in thread' : 'Post a message'}
          </h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={replyTo ? 'write a reply' : 'write a message'}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '8px 10px',
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              fontFamily: 'var(--sans)',
              fontSize: 13,
            }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', flex: '1 1 240px' }}>
              mention (raises a notification)
              <select
                multiple
                value={mentions}
                onChange={(e) => setMentions(Array.from(e.target.selectedOptions).map((o) => o.value))}
                style={{
                  width: '100%',
                  marginTop: 4,
                  minHeight: 68,
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  fontSize: 12,
                }}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.email}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => post(replyTo)}
              disabled={busy || !draft.trim()}
              style={{
                padding: '8px 14px',
                background: 'var(--accent)',
                color: 'var(--paper)',
                border: 0,
                borderRadius: 'var(--radius-sm)',
                fontSize: 12.5,
                cursor: busy || !draft.trim() ? 'default' : 'pointer',
                opacity: busy || !draft.trim() ? 0.6 : 1,
              }}
            >
              {replyTo ? 'post reply' : 'post message'}
            </button>
          </div>
        </div>
      )}

      {notice && <p style={{ color: 'var(--success)', fontSize: 12.5, margin: 0 }}>{notice}</p>}
      {error && (
        <p style={{ color: 'var(--accent)', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>{error}</p>
      )}
    </div>
  );
}