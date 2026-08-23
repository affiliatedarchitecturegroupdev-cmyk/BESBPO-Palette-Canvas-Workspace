'use client';

import { useEffect, useState } from 'react';

interface LiveEvent {
  event: string;
  at: string;
  payload: { message?: string; kind?: string };
}

/**
 * P6-09: live updates over the authenticated SSE channel. Appends incoming
 * notifications to the inbox without a refresh. Dev auth passes the email as
 * a query param because EventSource cannot set headers.
 */
export default function LiveFeed({ apiUrl, email }: { apiUrl: string; email: string }) {
  const [live, setLive] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const src = new EventSource(`${apiUrl}/events/stream?email=${encodeURIComponent(email)}`);
    src.onopen = () => setConnected(true);
    src.onerror = () => setConnected(false);
    src.onmessage = (msg) => {
      try {
        const e = JSON.parse(msg.data) as LiveEvent;
        if (e.event === 'ping') return;
        setLive((prev) => [e, ...prev].slice(0, 20));
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => src.close();
  }, [apiUrl, email]);

  return (
    <section aria-label="Live updates" style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 16, margin: 0 }}>
        Live
        <span
          style={{
            marginLeft: 10,
            fontSize: 11,
            color: connected ? 'var(--accent)' : 'var(--ink-faint)',
          }}
        >
          {connected ? '● connected' : '○ reconnecting'}
        </span>
      </h2>
      {live.length > 0 && (
        <ul style={{ marginTop: 10, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {live.map((e, i) => (
            <li
              key={`${e.at}-${i}`}
              style={{ border: '1px dashed var(--line)', padding: '8px 12px', fontSize: 13, color: 'var(--ink-dim)' }}
            >
              <span style={{ color: 'var(--accent)', marginRight: 8 }}>{e.event}</span>
              {e.payload.message ?? ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
