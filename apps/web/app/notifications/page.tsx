import { currentEmail, notifications } from '@/lib/api';
import { BROWSER_API } from '@/lib/config';
import MarkAllRead from './MarkAllRead';
import LiveFeed from './LiveFeed';
import { EmptyState, PageHeader } from '../components/ui';

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
      <PageHeader
        eyebrow="Connect"
        title="Notifications"
        subtitle={`${res.unread} unread · latest mentions, assignments and status changes`}
        actions={unreadIds.length > 0 ? <MarkAllRead apiUrl={BROWSER_API} email={email} unreadIds={unreadIds} /> : undefined}
      />
      {res.items.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Mentions, assignments and status changes will land in this inbox." />
      ) : (
        <ul style={{ marginTop: 4, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {res.items.map((n) => (
            <li
              key={n.id}
              className="pc-fade-up"
              style={{
                border: '1px solid var(--line)',
                background: n.read_at ? 'var(--brand-base)' : 'var(--brand-raise)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                borderLeft: n.read_at ? '3px solid transparent' : '3px solid var(--accent)',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: n.read_at ? 'var(--ink-faint)' : 'var(--accent)',
                  minWidth: 110,
                  fontFamily: 'var(--sans)',
                  fontWeight: 600,
                }}
              >
                {n.kind.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{n.message}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {n.target_type}
              </span>
            </li>
          ))}
        </ul>
      )}
      <LiveFeed apiUrl={BROWSER_API} email={email} />
    </main>
  );
}
