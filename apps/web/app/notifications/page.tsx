import { currentEmail, notifications } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import MarkAllRead from './MarkAllRead';
import LiveFeed from './LiveFeed';

/** Consolidated notification inbox: mentions, assignments, status changes. */
export default async function NotificationsPage() {
  const email = await currentEmail();
  if (!email) {
    return <p style={{ color: 'var(--ink-dim)' }}>Sign in as a workspace user.</p>;
  }
  const res = await notifications(email);
  if ('error' in res) {
    return <p style={{ color: 'var(--ink-dim)' }}>Inbox unavailable.</p>;
  }
  const unreadIds = res.items.filter((n) => !n.read_at).map((n) => n.id);

  return (
    <main>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, margin: 0 }}>Notifications</h1>
        <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
          {res.unread} unread
        </span>
        {unreadIds.length > 0 && (
          <MarkAllRead apiUrl={BROWSER_API} email={email} unreadIds={unreadIds} />
        )}
      </div>
      <ul style={{ marginTop: 20, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
        {res.items.map((n) => (
          <li
            key={n.id}
            style={{
              border: '1px solid var(--line)',
              background: n.read_at ? 'var(--paper)' : 'var(--paper-raise)',
              padding: '10px 14px',
              display: 'flex',
              gap: 12,
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: n.read_at ? 'var(--ink-faint)' : 'var(--accent)',
                minWidth: 120,
              }}
            >
              {n.kind.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>{n.message}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 'auto' }}>
              {n.target_type}
            </span>
          </li>
        ))}
        {res.items.length === 0 && (
          <li style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Nothing here yet.</li>
        )}
      </ul>
      <LiveFeed apiUrl={BROWSER_API} email={email} />
    </main>
  );
}
